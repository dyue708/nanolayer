import OSS from 'ali-oss';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

// 延迟初始化 OSS 客户端
let client: OSS | null = null;

export function getOSSClient(): OSS {
  if (!client) {
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
    const region = process.env.OSS_REGION;
    const bucket = process.env.OSS_BUCKET;

    if (!accessKeyId || !accessKeySecret || !region || !bucket) {
      throw new Error('OSS configuration is missing. Please set OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_REGION, and OSS_BUCKET in .env file');
    }

    client = new OSS({
      accessKeyId,
      accessKeySecret,
      region,
      bucket
    });
  }
  return client;
}

export interface UploadResult {
  imageUrl: string;
  thumbnailUrl: string;
}

/**
 * 从 URL 下载图片
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 从 base64 获取 Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * 生成缩略图
 */
async function generateThumbnail(imageBuffer: Buffer, maxSize: number = 200): Promise<Buffer> {
  return await sharp(imageBuffer)
    .resize(maxSize, maxSize, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .png()
    .toBuffer();
}

/**
 * 上传图片到 OSS
 */
export async function uploadImage(
  imageData: string | Buffer,
  userId?: string | number
): Promise<UploadResult> {
  // 获取图片 Buffer
  let imageBuffer: Buffer;
  if (typeof imageData === 'string') {
    if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      imageBuffer = await downloadImage(imageData);
    } else {
      imageBuffer = base64ToBuffer(imageData);
    }
  } else {
    imageBuffer = imageData;
  }

  // 生成文件名
  const timestamp = Date.now();
  const uuid = uuidv4();
  const userPrefix = userId ? `${userId}/` : '';
  const imageFileName = `images/${userPrefix}${timestamp}-${uuid}.png`;
  const thumbnailFileName = `images/${userPrefix}${timestamp}-${uuid}-thumb.png`;

  // 生成缩略图
  const thumbnailBuffer = await generateThumbnail(imageBuffer);

  // 获取 OSS 客户端
  const ossClient = getOSSClient();

  // 上传原图
  const imageResult = await ossClient.put(imageFileName, imageBuffer, {
    contentType: 'image/png'
  });

  // 上传缩略图
  const thumbnailResult = await ossClient.put(thumbnailFileName, thumbnailBuffer, {
    contentType: 'image/png'
  });

  return {
    imageUrl: imageResult.url,
    thumbnailUrl: thumbnailResult.url
  };
}

