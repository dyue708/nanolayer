import { fal } from '@fal-ai/client';

// 配置 fal API key
if (process.env.FAL_KEY) {
  fal.config({
    credentials: process.env.FAL_KEY
  });
}

export interface GenerateImageParams {
  prompt: string;
  model: 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro' | 'fal-ai/gpt-image-1.5';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  resolution?: '1K' | '2K' | '4K';
  systemInstruction?: string;
}

export interface EditImageParams {
  prompt: string;
  imageBase64: string;
  model: 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro' | 'fal-ai/gpt-image-1.5';
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
}

export interface FalResult {
  imageUrl?: string;
  imageBase64?: string;
  requestId: string;
}

/**
 * 上传图片到 fal storage
 */
export async function uploadImageToFal(imageBase64: string): Promise<string> {
  try {
    // 移除 data URI 前缀
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    // 转换为 Buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 上传到 fal storage
    // fal.storage.upload 可以接受 Buffer、Blob 或 base64 字符串
    // 使用类型断言，因为 fal SDK 实际上支持 Buffer
    const url = await fal.storage.upload(buffer as any);
    
    console.log('Image uploaded to fal storage:', url);
    return url;
  } catch (error: any) {
    console.error('Error uploading to fal storage:', error);
    throw new Error(`Failed to upload image to fal storage: ${error.message}`);
  }
}

/**
 * 生成图片（text-to-image）
 */
export async function generateImage(params: GenerateImageParams): Promise<FalResult> {
  const { prompt, model, aspectRatio, resolution, systemInstruction } = params;

  const input: any = {
    prompt
  };

  if (aspectRatio) {
    input.aspect_ratio = aspectRatio;
  }

  // 只有 nano-banana-pro 支持 image_size 参数
  if (resolution && model === 'fal-ai/nano-banana-pro') {
    input.image_size = resolution;
  }

  if (systemInstruction) {
    input.system_prompt = systemInstruction;
  }

  const result = await fal.subscribe(model, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        update.logs?.map((log) => log.message).forEach(console.log);
      }
    }
  });

  // fal 返回的数据结构
  const resultData = result.data as any;
  
  return {
    imageUrl: resultData?.images?.[0]?.url || resultData?.image?.url,
    imageBase64: resultData?.images?.[0]?.file_data || resultData?.image?.file_data 
      ? `data:image/png;base64,${resultData.images?.[0]?.file_data || resultData.image?.file_data}` 
      : undefined,
    requestId: result.requestId
  };
}

/**
 * 编辑图片（image-to-image）
 */
export async function editImage(params: EditImageParams): Promise<FalResult> {
  const { prompt, imageBase64, model, selection, referenceImages, systemInstruction, aspectRatio, resolution } = params;

  // 确定使用的编辑模型
  const editModel = `${model}/edit` as 'fal-ai/nano-banana/edit' | 'fal-ai/nano-banana-pro/edit' | 'fal-ai/gpt-image-1.5/edit';

  // 处理选择区域，添加到 prompt
  let finalPrompt = prompt;
  if (selection) {
    finalPrompt = `Modify only the specific region located at approximately (X:${selection.x}%, Y:${selection.y}%) with size (W:${selection.width}%, H:${selection.height}%) in the provided image. Change that specific area to: ${prompt}. IMPORTANT: Everything outside this selection MUST remain exactly 100% identical to the original image background.`;
  }

  // 上传原图到 fal storage
  const imageUrl = await uploadImageToFal(imageBase64);

  // 处理参考图片
  const referenceUrls: string[] = [];
  if (referenceImages && referenceImages.length > 0) {
    for (const refImage of referenceImages) {
      const refUrl = await uploadImageToFal(refImage);
      referenceUrls.push(refUrl);
    }
  }

  // fal API 编辑模型期望 image_urls 参数（数组格式）
  // 主图片和参考图片都放在 image_urls 数组中
  const input: any = {
    prompt: finalPrompt,
    image_urls: [imageUrl, ...referenceUrls]  // 主图片 + 参考图片
  };

  if (aspectRatio) {
    input.aspect_ratio = aspectRatio;
  }

  // 只有 nano-banana-pro/edit 支持 image_size 参数
  if (resolution && editModel === 'fal-ai/nano-banana-pro/edit') {
    input.image_size = resolution;
  }

  if (systemInstruction) {
    input.system_prompt = systemInstruction;
  }

  console.log('Edit image input:', JSON.stringify(input, null, 2));
  console.log('Edit model:', editModel);
  
  const result = await fal.subscribe(editModel, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        update.logs?.map((log) => log.message).forEach(console.log);
      }
    }
  });

  // fal 返回的数据结构
  const resultData = result.data as any;
  
  return {
    imageUrl: resultData?.images?.[0]?.url || resultData?.image?.url,
    imageBase64: resultData?.images?.[0]?.file_data || resultData?.image?.file_data 
      ? `data:image/png;base64,${resultData.images?.[0]?.file_data || resultData.image?.file_data}` 
      : undefined,
    requestId: result.requestId
  };
}

