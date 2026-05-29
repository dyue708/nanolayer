import express, { type Request } from 'express';
import { generateImage, editImage } from '../services/falService.js';
import {
  resolveAspectRatio,
  type SupportedAspectRatio,
} from '../utils/aspectRatioFromPrompt.js';
import {
  generateImageVertex,
  editImageVertex,
  isVertexSupportedModel,
  type VertexSupportedFalModel,
} from '../services/vertexService.js';
import { uploadImage } from '../services/ossService.js';
import { dbService } from '../services/dbService.js';
import { costService } from '../services/costService.js';
import sharp from 'sharp';
import { requireFeishuTenantWhenConfigured } from '../middleware/requireFeishuTenant.js';

const router = express.Router();

/**
 * GET /api/images/proxy
 * 必须在租户校验中间件之前注册：浏览器 <img> 无法携带 Authorization。
 */
router.get('/proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;

    if (!imageUrl) {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    let buffer: Buffer;
    let contentType = 'image/png';

    if (imageUrl.includes('oss-') && imageUrl.includes('.aliyuncs.com')) {
      try {
        const { getOSSClient } = await import('../services/ossService.js');
        const ossClient = getOSSClient();

        const urlObj = new URL(imageUrl);
        let objectName = urlObj.pathname;

        if (objectName.startsWith('/')) {
          objectName = objectName.substring(1);
        }

        console.log('Fetching from OSS, object name:', objectName);

        const result = await (ossClient as any).get(objectName);
        if (result.content) {
          buffer = Buffer.isBuffer(result.content)
            ? result.content
            : Buffer.from(result.content);
        } else {
          throw new Error('No content returned from OSS');
        }
        contentType = result.res?.headers?.['content-type'] || result.res?.headers?.['Content-Type'] || 'image/png';
        console.log('OSS get successful, content type:', contentType);
      } catch (ossError: any) {
        console.error('OSS SDK failed:', ossError);
        return res.status(500).json({
          error: `Failed to fetch image from OSS: ${ossError.message}`,
          hint: 'Please check OSS configuration in .env file',
        });
      }
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}` });
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    res.send(buffer);
  } catch (error: any) {
    console.error('Error proxying image:', error);
    res.status(500).json({ error: error.message || 'Failed to proxy image' });
  }
});

router.use(requireFeishuTenantWhenConfigured);

interface GenerateRequest {
  prompt: string;
  model:
    | 'fal-ai/nano-banana'
    | 'fal-ai/nano-banana-pro'
    | 'fal-ai/gpt-image-1.5'
    | 'fal-ai/nano-banana-2'
    | 'fal-ai/gpt-image-2'
    | 'fal-ai/bytedance/seedream/v5/lite';
  /** AI 调用源：'fal'（默认）或 'vertex'（Vertex AI，仅 nano-banana 系列） */
  aiSource?: 'fal' | 'vertex';
  imageBase64?: string;
  selection?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  referenceImages?: string[];
  systemInstruction?: string;
  aspectRatio?: SupportedAspectRatio;
  resolution?: '0.5K' | '1K' | '2K' | '4K';
  userId?: string;
}

/**
 * 从 URL 或 base64 获取图片尺寸
 */
async function getImageDimensions(imageData: string): Promise<{ width: number; height: number }> {
  let buffer: Buffer;
  
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    const response = await fetch(imageData);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    const base64Data = imageData.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  }
  
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0
  };
}

/**
 * POST /api/images/generate
 * 生成或编辑图片
 */
function resolveDbUserId(req: Request, clientUserId?: string): number | null {
  if (typeof req.feishuDbUserId === 'number') {
    return req.feishuDbUserId;
  }
  if (clientUserId) {
    const parsed = parseInt(clientUserId, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function feishuDisplayName(req: Request): string | undefined {
  const u = req.feishuUser;
  if (!u) return undefined;
  const raw = (u.name || u.en_name || '').trim();
  return raw || undefined;
}

router.post('/generate', async (req, res) => {
  try {
    const body: GenerateRequest = req.body;
    const { prompt, model, aiSource, imageBase64, selection, referenceImages, systemInstruction, aspectRatio, resolution, userId } = body;
    const generatedByDisplayName = feishuDisplayName(req);
    const dbUserId = resolveDbUserId(req, userId);

    if (!prompt || !model) {
      return res.status(400).json({ error: 'prompt and model are required' });
    }

    const { aspectRatio: effectiveAspectRatio, fromPrompt: aspectRatioFromPrompt } =
      resolveAspectRatio(aspectRatio, prompt);
    if (aspectRatioFromPrompt && effectiveAspectRatio) {
      console.log('[images] aspect ratio from prompt:', effectiveAspectRatio);
    }

    // 当请求使用 vertex 源但模型不支持时，返回错误
    const useVertex = aiSource === 'vertex';
    if (useVertex && !isVertexSupportedModel(model)) {
      return res.status(400).json({
        error: `模型 ${model} 不支持 Vertex AI 调用。支持 Vertex 的模型：fal-ai/nano-banana、fal-ai/nano-banana-pro、fal-ai/nano-banana-2`
      });
    }

    let falResult: { imageUrl?: string; imageBase64?: string; requestId: string };

    // 构造用于成本计算和数据库记录的模型键
    // Vertex 源使用 vertex/<short-name> 前缀，便于区分来源和成本
    const shortName = model.replace('fal-ai/', ''); // e.g. "nano-banana"
    let actualModel = useVertex ? `vertex/${shortName}` : model;

    if (imageBase64) {
      // 编辑模式
      actualModel = useVertex ? `vertex/${shortName}/edit` : `${model}/edit` as any;

      if (useVertex) {
        falResult = await editImageVertex({
          prompt,
          imageBase64,
          model: model as VertexSupportedFalModel,
          selection,
          referenceImages,
          systemInstruction,
          aspectRatio: effectiveAspectRatio,
          resolution,
          aspectRatioFromPrompt,
        });
      } else {
        falResult = await editImage({
          prompt,
          imageBase64,
          model: model as
            | 'fal-ai/nano-banana'
            | 'fal-ai/nano-banana-pro'
            | 'fal-ai/gpt-image-1.5'
            | 'fal-ai/nano-banana-2'
            | 'fal-ai/gpt-image-2'
            | 'fal-ai/bytedance/seedream/v5/lite',
          selection,
          referenceImages,
          systemInstruction,
          aspectRatio: effectiveAspectRatio,
          resolution,
        });
      }
    } else {
      // 生成模式
      if (useVertex) {
        falResult = await generateImageVertex({
          prompt,
          model: model as VertexSupportedFalModel,
          aspectRatio: effectiveAspectRatio,
          resolution,
          systemInstruction,
        });
      } else {
        falResult = await generateImage({
          prompt,
          model,
          aspectRatio: effectiveAspectRatio,
          resolution,
          systemInstruction,
        });
      }
    }

    if (!falResult.imageUrl && !falResult.imageBase64) {
      return res.status(500).json({ error: 'Failed to generate image' });
    }

    // 获取图片数据
    // 优先使用 base64，如果没有则使用 URL
    let imageData: string | undefined = falResult.imageBase64;
    if (!imageData && falResult.imageUrl) {
      // 如果只有 URL，尝试下载并转换为 base64（用于避免 CORS 问题）
      try {
        const response = await fetch(falResult.imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        imageData = `data:image/png;base64,${base64}`;
      } catch (error) {
        console.warn('Failed to convert image URL to base64, using URL directly:', error);
        imageData = falResult.imageUrl;
      }
    }
    
    if (!imageData) {
      return res.status(500).json({ error: 'No image data available' });
    }
    
    // 获取图片尺寸
    const dimensions = await getImageDimensions(imageData);

    // 上传到 OSS（如果配置了 OSS，否则使用 fal 返回的 URL）
    let uploadResult: { imageUrl: string; thumbnailUrl: string };
    try {
      uploadResult = await uploadImage(imageData, dbUserId ?? undefined);
    } catch (error: any) {
      // 如果 OSS 未配置，直接使用 fal 返回的 URL
      console.warn('OSS upload failed, using fal URL:', error.message);
      const fallbackUrl = falResult.imageUrl || imageData;
      uploadResult = {
        imageUrl: fallbackUrl,
        thumbnailUrl: fallbackUrl
      };
    }

    // 计算成本（传递图片尺寸和逻辑分辨率，用于基于分辨率的成本计算）
    const cost = costService.calculateCost(
      actualModel,
      dimensions.width,
      dimensions.height,
      resolution
    );

    // 保存到数据库
    const imageId = await dbService.createImageHistory({
      user_id: dbUserId,
      prompt,
      model: actualModel,
      image_url: uploadResult.imageUrl,
      thumbnail_url: uploadResult.thumbnailUrl,
      cost,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: effectiveAspectRatio,
        aspectRatioFromPrompt: aspectRatioFromPrompt || undefined,
        resolution,
        requestId: falResult.requestId,
        ...(generatedByDisplayName
          ? { generatedByDisplayName }
          : {}),
      }
    });

    // 生成代理 URL（通过后端代理访问 OSS 图片）
    const proxyImageUrl = `/api/images/proxy?url=${encodeURIComponent(uploadResult.imageUrl)}`;
    const proxyThumbnailUrl = uploadResult.thumbnailUrl 
      ? `/api/images/proxy?url=${encodeURIComponent(uploadResult.thumbnailUrl)}`
      : null;
    
    const response: any = {
      imageUrl: proxyImageUrl,  // 使用代理 URL
      thumbnailUrl: proxyThumbnailUrl,  // 使用代理 URL
      requestId: falResult.requestId,
      imageId,
      width: dimensions.width,
      height: dimensions.height,
      cost
    };
    
    // 如果图片数据是 base64，也返回它（用于避免 CORS 问题）
    if (imageData && imageData.startsWith('data:image/')) {
      response.imageBase64 = imageData;
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Error generating image:', error);
    console.error('Error details:', JSON.stringify(error.body || error, null, 2));
    res.status(500).json({ 
      error: error.message || 'Failed to generate image',
      details: error.body || error.detail || null
    });
  }
});

/**
 * GET /api/images/history
 * 获取历史图片列表
 */
router.get('/history', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const onlyMine = req.query.onlyMine === '1' || req.query.onlyMine === 'true';

    let userId: number | undefined;
    if (onlyMine) {
      userId = typeof req.feishuDbUserId === 'number' ? req.feishuDbUserId : undefined;
    } else if (req.query.userId) {
      const parsed = parseInt(req.query.userId as string, 10);
      if (!Number.isNaN(parsed)) {
        userId = parsed;
      }
    }

    const result = await dbService.getImageHistory(userId, page, limit);

    // 将 OSS URL 转换为代理 URL
    const imagesWithProxy = result.images.map(img => ({
      ...img,
      image_url: `/api/images/proxy?url=${encodeURIComponent(img.image_url)}`,
      thumbnail_url: img.thumbnail_url 
        ? `/api/images/proxy?url=${encodeURIComponent(img.thumbnail_url)}`
        : null
    }));

    res.json({
      images: imagesWithProxy,
      total: result.total,
      page,
      limit
    });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch history' });
  }
});

/**
 * GET /api/images/:id
 * 获取图片详情
 * 注意：必须在 /proxy 路由之后定义
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const image = await dbService.getImageById(id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // 将 OSS URL 转换为代理 URL
    const imageWithProxy = {
      ...image,
      image_url: `/api/images/proxy?url=${encodeURIComponent(image.image_url)}`,
      thumbnail_url: image.thumbnail_url 
        ? `/api/images/proxy?url=${encodeURIComponent(image.thumbnail_url)}`
        : null
    };

    res.json(imageWithProxy);
  } catch (error: any) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch image' });
  }
});

export default router;

