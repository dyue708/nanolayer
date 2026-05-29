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
    'fal-ai/nano-banana':     process.env.VERTEX_MODEL_NANO_BANANA     || 'gemini-2.5-flash-image',
    'fal-ai/nano-banana-pro': process.env.VERTEX_MODEL_NANO_BANANA_PRO || 'gemini-3-pro-image-preview',
    'fal-ai/nano-banana-2':   process.env.VERTEX_MODEL_NANO_BANANA_2   || 'gemini-3.1-flash-image-preview',
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
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:1' | '1:3';
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
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:1' | '1:3';
  resolution?: '0.5K' | '1K' | '2K' | '4K';
  /** 宽高比来自提示词解析时，在编辑 Rules 中写入输出要求 */
  aspectRatioFromPrompt?: boolean;
}

export interface VertexResult {
  imageUrl?: string;
  imageBase64?: string;
  requestId: string;
}

type VertexResolution = NonNullable<VertexGenerateParams['resolution']>;

/** Gemini 3 系列支持 imageSize；2.5 仅支持 aspectRatio（见官方 responseFormat 文档） */
function supportsVertexImageSize(vertexModel: string): boolean {
  return /gemini-3/i.test(vertexModel);
}

/** 应用内 0.5K → API 的 512（Gemini 3.1 Flash Image） */
function mapResolutionToImageSize(resolution: VertexResolution): string {
  return resolution === '0.5K' ? '512' : resolution;
}

/**
 * 按 Google 文档构建 generateContent config（P0）
 * @see https://ai.google.dev/gemini-api/docs/image-generation#aspect-ratio-and-image-size
 */
function buildVertexGenerateConfig(
  vertexModel: string,
  options?: {
    aspectRatio?: VertexGenerateParams['aspectRatio'];
    resolution?: VertexResolution;
  }
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  const image: Record<string, string> = {};
  if (options?.aspectRatio) {
    image.aspectRatio = options.aspectRatio;
  }
  if (options?.resolution && supportsVertexImageSize(vertexModel)) {
    image.imageSize = mapResolutionToImageSize(options.resolution);
  }

  if (Object.keys(image).length > 0) {
    config.responseFormat = { image };
  }

  return config;
}

/** 输入图数量上限：2.5 最多 3 张；Gemini 3 编辑场景预留 1 主图 + 参考图 */
function limitReferenceImages(referenceImages: string[] | undefined, vertexModel: string): string[] {
  if (!referenceImages?.length) return [];
  const maxRefs = /gemini-2\.5/i.test(vertexModel) ? 2 : 13;
  if (referenceImages.length > maxRefs) {
    console.warn(
      `[Vertex] referenceImages truncated ${referenceImages.length} -> ${maxRefs} (${vertexModel})`
    );
    return referenceImages.slice(0, maxRefs);
  }
  return referenceImages;
}

function buildSelectionEditPrompt(
  prompt: string,
  selection: NonNullable<VertexEditParams['selection']>
): string {
  return (
    `Modify only the specific region located at approximately (X:${selection.x}%, Y:${selection.y}%) ` +
    `with size (W:${selection.width}%, H:${selection.height}%) in Image 1 (the primary image). ` +
    `Change that specific area to: ${prompt}. ` +
    `IMPORTANT: Everything outside this selection MUST remain exactly 100% identical to Image 1.`
  );
}

/**
 * 合并为单条编辑指令（P1），对齐官方「输入图 + 任务描述」多图示例
 */
function buildOutputRequirementLines(outputAspectRatio?: VertexEditParams['aspectRatio']): string[] {
  if (!outputAspectRatio) return [];
  return [`- Output image aspect ratio must be ${outputAspectRatio}.`];
}

function buildEditTaskPrompt(
  userPrompt: string,
  referenceCount: number,
  selection?: VertexEditParams['selection'],
  outputAspectRatio?: VertexEditParams['aspectRatio'],
  appendOutputAspectRule?: boolean
): string {
  const task = selection ? buildSelectionEditPrompt(userPrompt, selection) : userPrompt;
  const outputLines =
    appendOutputAspectRule && outputAspectRatio
      ? buildOutputRequirementLines(outputAspectRatio)
      : [];

  if (referenceCount === 0) {
    const lines = ['Edit the provided image.', '', `Task: ${task}`];
    if (outputLines.length > 0) {
      lines.push('', 'Output requirements:', ...outputLines);
    }
    return lines.join('\n');
  }

  const refLines = Array.from({ length: referenceCount }, (_, i) => {
    const n = i + 2;
    return (
      `- Image ${n} (REFERENCE — guidance only): use for style, identity, lighting, materials, or details. ` +
      `Do not replace Image 1 with this content unless the task explicitly requires it.`
    );
  }).join('\n');

  return [
    'Edit the provided images according to the task below.',
    '',
    'Images (in order):',
    '- Image 1 (PRIMARY — apply all edits to this image only): the image to modify.',
    refLines,
    '',
    `Task: ${task}`,
    '',
    'Rules:',
    '- Apply all changes only to Image 1.',
    '- Use reference image(s) only as guidance unless the task explicitly asks to transfer elements from them.',
    '- Preserve everything outside any specified edit region in Image 1 unchanged.',
    ...outputLines,
  ].join('\n');
}

/** 编辑请求 parts：先 prompt，再主图，再参考图（与官方 JS 多图顺序一致） */
function buildEditContentParts(
  imageBase64: string,
  referenceImages: string[],
  editPrompt: string
): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: editPrompt },
  ];

  const { mimeType: mainMime, data: mainData } = stripDataUri(imageBase64);
  parts.push({ inlineData: { mimeType: mainMime, data: mainData } });

  for (const ref of referenceImages) {
    const { mimeType: refMime, data: refData } = stripDataUri(ref);
    parts.push({ inlineData: { mimeType: refMime, data: refData } });
  }

  return parts;
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
  const { prompt, model, aspectRatio, resolution, systemInstruction } = params;
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

  const config = buildVertexGenerateConfig(vertexModel, { aspectRatio, resolution });

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
  const {
    prompt,
    imageBase64,
    model,
    selection,
    referenceImages,
    systemInstruction,
    aspectRatio,
    resolution,
    aspectRatioFromPrompt,
  } = params;
  const client = getVertexClient();
  const vertexModel = getFalToVertexModel()[model];

  if (!vertexModel) {
    throw new Error(`模型 ${model} 不支持通过 Vertex AI 调用`);
  }

  const refs = limitReferenceImages(referenceImages, vertexModel);
  const editPrompt = buildEditTaskPrompt(
    prompt,
    refs.length,
    selection,
    aspectRatio,
    aspectRatioFromPrompt
  );

  const contents: any[] = [];

  if (systemInstruction) {
    contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
  }

  const userParts = buildEditContentParts(imageBase64, refs, editPrompt);
  contents.push({ role: 'user', parts: userParts });

  const config = buildVertexGenerateConfig(vertexModel, { aspectRatio, resolution });

  console.log('[Vertex] edit model:', vertexModel, '| refs:', refs.length, '| prompt:', editPrompt.slice(0, 80), '...');

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
