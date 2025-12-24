import express from 'express';
import { generateImage, editImage } from '../services/falService.js';
import { uploadImage } from '../services/ossService.js';
import { dbService } from '../services/dbService.js';
import { costService } from '../services/costService.js';
import sharp from 'sharp';

const router = express.Router();

interface GenerateRequest {
  prompt: string;
  model: 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro';
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
        model,
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
    const imageData = falResult.imageBase64 || falResult.imageUrl!;
    
    // 获取图片尺寸
    const dimensions = await getImageDimensions(imageData);

    // 上传到 OSS
    const uploadResult = await uploadImage(imageData, userId ? parseInt(userId) : undefined);

    // 计算成本
    const cost = costService.calculateCost(actualModel);

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

    res.json({
      imageUrl: uploadResult.imageUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      requestId: falResult.requestId,
      imageId,
      width: dimensions.width,
      height: dimensions.height,
      cost
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
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

    res.json({
      images: result.images,
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
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const image = await dbService.getImageById(id);

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    res.json(image);
  } catch (error: any) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch image' });
  }
});

export default router;

