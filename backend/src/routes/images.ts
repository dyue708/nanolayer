import express from 'express';
import { generateImage, editImage } from '../services/falService.js';
import { uploadImage } from '../services/ossService.js';
import { dbService } from '../services/dbService.js';
import { costService } from '../services/costService.js';
import sharp from 'sharp';

const router = express.Router();

interface GenerateRequest {
  prompt: string;
  model: 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro' | 'fal-ai/gpt-image-1.5';
  imageBase64?: string;
  selection?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  referenceImages?: string[];
  systemInstruction?: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  resolution?: '1K' | '2K' | '4K';
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
router.post('/generate', async (req, res) => {
  try {
    const body: GenerateRequest = req.body;
    const { prompt, model, imageBase64, selection, referenceImages, systemInstruction, aspectRatio, resolution, userId } = body;

    if (!prompt || !model) {
      return res.status(400).json({ error: 'prompt and model are required' });
    }

    let falResult;
    let actualModel = model;

    if (imageBase64) {
      // 编辑模式
      actualModel = `${model}/edit` as any;
      falResult = await editImage({
        prompt,
        imageBase64,
        model: model as 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro' | 'fal-ai/gpt-image-1.5',
        selection,
        referenceImages,
        systemInstruction,
        aspectRatio,
        resolution
      });
    } else {
      // 生成模式
      falResult = await generateImage({
        prompt,
        model,
        aspectRatio,
        resolution,
        systemInstruction
      });
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
      uploadResult = await uploadImage(imageData, userId ? parseInt(userId) : undefined);
    } catch (error: any) {
      // 如果 OSS 未配置，直接使用 fal 返回的 URL
      console.warn('OSS upload failed, using fal URL:', error.message);
      const fallbackUrl = falResult.imageUrl || imageData;
      uploadResult = {
        imageUrl: fallbackUrl,
        thumbnailUrl: fallbackUrl
      };
    }

    // 计算成本（传递图片尺寸用于基于分辨率的成本计算）
    const cost = costService.calculateCost(actualModel, dimensions.width, dimensions.height);

    // 保存到数据库
    const imageId = await dbService.createImageHistory({
      user_id: userId ? parseInt(userId) : null,
      prompt,
      model: actualModel,
      image_url: uploadResult.imageUrl,
      thumbnail_url: uploadResult.thumbnailUrl,
      cost,
      metadata: {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio,
        resolution,
        requestId: falResult.requestId
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
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

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
 * GET /api/images/proxy
 * 代理图片请求，从 OSS 或其他 URL 获取图片并返回给前端
 * 注意：必须在 /:id 路由之前定义，避免路由冲突
 */
router.get('/proxy', async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    let buffer: Buffer;
    let contentType = 'image/png';

    // 检查是否是 OSS URL
    if (imageUrl.includes('oss-') && imageUrl.includes('.aliyuncs.com')) {
      // 使用 OSS SDK 获取图片（OSS 可能是私有访问）
      try {
        const { getOSSClient } = await import('../services/ossService.js');
        const ossClient = getOSSClient();
        
        // 从 URL 中提取 object name
        // URL 格式: http://bucket-name.oss-region.aliyuncs.com/path/to/file.png
        // 或: http://oss-region.aliyuncs.com/bucket-name/path/to/file.png
        const urlObj = new URL(imageUrl);
        let objectName = urlObj.pathname;
        
        // 移除开头的 /（如果有）
        if (objectName.startsWith('/')) {
          objectName = objectName.substring(1);
        }
        
        console.log('Fetching from OSS, object name:', objectName);
        
        // 使用 OSS SDK 的 get 方法获取文件
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
        // 如果 OSS SDK 失败（可能是配置问题），返回错误
        return res.status(500).json({ 
          error: `Failed to fetch image from OSS: ${ossError.message}`,
          hint: 'Please check OSS configuration in .env file'
        });
      }
    } else {
      // 非 OSS URL，直接 fetch
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}` });
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get('content-type') || 'image/png';
    }
    
    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存一年
    
    // 返回图片数据
    res.send(buffer);
  } catch (error: any) {
    console.error('Error proxying image:', error);
    res.status(500).json({ error: error.message || 'Failed to proxy image' });
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

