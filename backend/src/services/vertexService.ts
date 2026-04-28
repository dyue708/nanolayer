import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// backend 根目录（vertexService 位于 src/services/，上两级即 backend/）
const BACKEND_ROOT = path.resolve(__dirname, '../../');

// fal 模型 ID → Vertex AI 模型 ID 的映射表
// 使用函数懒加载，确保在 dotenv.config() 执行后才读取环境变量
// 可通过环境变量覆盖，未来新增 Vertex 模型只需在此扩展
function getFalToVertexModel(): Record<string, string> {
  return {
    'fal-ai/nano-banana':     process.env.VERTEX_MODEL_NANO_BANANA     || 'gemini-2.0-flash-preview-image-generation',
    'fal-ai/nano-banana-pro': process.env.VERTEX_MODEL_NANO_BANANA_PRO || 'gemini-2.0-flash-preview-image-generation',
    'fal-ai/nano-banana-2':   process.env.VERTEX_MODEL_NANO_BANANA_2   || 'gemini-2.0-flash-preview-image-generation',
  };
}

export type VertexSupportedFalModel =
  | 'fal-ai/nano-banana'
  | 'fal-ai/nano-banana-pro'
  | 'fal-ai/nano-banana-2';

/** 判断某个模型是否支持通过 Vertex AI 调用 */
export function isVertexSupportedModel(model: string): model is VertexSupportedFalModel {
  return Object.prototype.hasOwnProperty.call(getFalToVertexModel(), model);
}

let _client: GoogleGenAI | null = null;

function getVertexClient(): GoogleGenAI {
  if (_client) return _client;

  const project = process.env.VERTEX_AI_PROJECT || process.env.GCP_PROJECT;
  const location = process.env.VERTEX_AI_LOCATION || 'us-east5';

  if (!project) {
    throw new Error(
      'Vertex AI 需要配置 VERTEX_AI_PROJECT（或 GCP_PROJECT）环境变量'
    );
  }

  // 如果指定了服务账号 JSON 路径，统一转为绝对路径后注入
  // google-auth-library 需要绝对路径，相对路径以 backend/ 根目录为基准
  const rawCred = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.VERTEX_KEY_PATH;
  if (rawCred) {
    const credPath = path.isAbsolute(rawCred)
      ? rawCred
      : path.resolve(BACKEND_ROOT, rawCred);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    console.log('[Vertex] credentials:', credPath);
  }

  _client = new GoogleGenAI({
    vertexai: true,
    project,
    location,
  } as any);

  return _client;
}

export interface VertexGenerateParams {
  prompt: string;
  model: VertexSupportedFalModel;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  resolution?: '0.5K' | '1K' | '2K' | '4K';
  systemInstruction?: string;
}

export interface VertexEditParams {
  prompt: string;
  imageBase64: string;
  model: VertexSupportedFalModel;
  selection?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  referenceImages?: string[];
  systemInstruction?: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  resolution?: '0.5K' | '1K' | '2K' | '4K';
}

export interface VertexResult {
  imageUrl?: string;
  imageBase64?: string;
  requestId: string;
}

/** 从 data URI 中拆出 mimeType 和纯 base64 数据 */
function stripDataUri(base64: string): { mimeType: string; data: string } {
  const match = base64.match(/^data:(image\/[a-zA-Z+.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: 'image/png', data: base64 };
}

/** 生成一个简单的 request ID */
function makeRequestId(): string {
  return `vertex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 文生图（text-to-image）via Vertex AI
 */
export async function generateImageVertex(params: VertexGenerateParams): Promise<VertexResult> {
  const { prompt, model, aspectRatio, systemInstruction } = params;
  const client = getVertexClient();
  const vertexModel = getFalToVertexModel()[model];

  if (!vertexModel) {
    throw new Error(`模型 ${model} 不支持通过 Vertex AI 调用`);
  }

  const contents: any[] = [];
  
  // 将 system instruction 作为首轮对话传入
  if (systemInstruction) {
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
  }

  const userParts: any[] = [{ text: prompt }];
  contents.push({ role: 'user', parts: userParts });

  const config: any = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  // Gemini 图像生成支持 aspectRatio
  if (aspectRatio) {
    config.generationConfig = { ...(config.generationConfig || {}), aspectRatio };
  }

  console.log('[Vertex] generate model:', vertexModel, '| prompt:', prompt);

  const response = await (client as any).models.generateContent({
    model: vertexModel,
    contents,
    config,
  });

  const parts: any[] = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((p: any) => p.text);
    throw new Error(
      `Vertex AI 未返回图片数据。响应文本：${textPart?.text || '（无）'}`
    );
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const imageBase64 = `data:${mimeType};base64,${imagePart.inlineData.data}`;

  return { imageBase64, requestId: makeRequestId() };
}

/**
 * 图片编辑（image-to-image）via Vertex AI
 */
export async function editImageVertex(params: VertexEditParams): Promise<VertexResult> {
  const { prompt, imageBase64, model, selection, referenceImages, systemInstruction, aspectRatio } = params;
  const client = getVertexClient();
  const vertexModel = getFalToVertexModel()[model];

  if (!vertexModel) {
    throw new Error(`模型 ${model} 不支持通过 Vertex AI 调用`);
  }

  // 如果有选区，把坐标信息嵌入 prompt（与 fal 保持一致）
  let finalPrompt = prompt;
  if (selection) {
    finalPrompt =
      `Modify only the specific region located at approximately (X:${selection.x}%, Y:${selection.y}%) ` +
      `with size (W:${selection.width}%, H:${selection.height}%) in the provided image. ` +
      `Change that specific area to: ${prompt}. ` +
      `IMPORTANT: Everything outside this selection MUST remain exactly 100% identical to the original image background.`;
  }

  const contents: any[] = [];

  if (systemInstruction) {
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }

  // 构造用户消息：文本 + 原图 + 参考图（inline data）
  const userParts: any[] = [{ text: finalPrompt }];

  const { mimeType: mainMime, data: mainData } = stripDataUri(imageBase64);
  userParts.push({ inlineData: { mimeType: mainMime, data: mainData } });

  if (referenceImages?.length) {
    for (const ref of referenceImages) {
      const { mimeType: refMime, data: refData } = stripDataUri(ref);
      userParts.push({ inlineData: { mimeType: refMime, data: refData } });
    }
  }

  contents.push({ role: 'user', parts: userParts });

  const config: any = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  if (aspectRatio) {
    config.generationConfig = { ...(config.generationConfig || {}), aspectRatio };
  }

  console.log('[Vertex] edit model:', vertexModel, '| prompt:', finalPrompt.slice(0, 80), '...');

  const response = await (client as any).models.generateContent({
    model: vertexModel,
    contents,
    config,
  });

  const parts: any[] = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    const textPart = parts.find((p: any) => p.text);
    throw new Error(
      `Vertex AI 编辑未返回图片数据。响应文本：${textPart?.text || '（无）'}`
    );
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const resultBase64 = `data:${mimeType};base64,${imagePart.inlineData.data}`;

  return { imageBase64: resultBase64, requestId: makeRequestId() };
}
