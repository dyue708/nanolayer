
/** 图层面板内拖拽排序时 dataTransfer 的 MIME 类型（区别于系统文件拖入） */
export const LAYER_DRAG_MIME = 'application/x-nanolayer-layer-id';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  canvas: HTMLCanvasElement; // Stores the actual image data
  thumbnail?: string; // Base64 cached preview
  zIndex: number;
  x: number;
  y: number;
  cost?: number;
  prompt?: string;
}

export enum ToolMode {
  SELECT = 'SELECT',
  EDIT = 'EDIT',
  ANALYZE = 'ANALYZE',
  MOVE = 'MOVE',
}

export interface AnalysisResult {
  text: string;
  timestamp: number;
}

export interface PsdData {
  width: number;
  height: number;
  layers: Layer[];
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ImageGenerationModel =
  | 'fal-ai/nano-banana'
  | 'fal-ai/nano-banana-pro'
  | 'fal-ai/gpt-image-1.5'
  | 'fal-ai/nano-banana-2'
  | 'fal-ai/gpt-image-2'
  | 'fal-ai/bytedance/seedream/v5/lite';

/**
 * AI 调用源：
 * - 'fal'    → 通过 fal.ai 平台调用（支持所有模型）
 * - 'vertex' → 通过 Google Vertex AI 直接调用（仅支持 nano-banana 系列）
 */
export type AISource = 'fal' | 'vertex';

/** 前端默认 AI 调用源 */
export const DEFAULT_AI_SOURCE: AISource = 'vertex';

const AI_SOURCE_STORAGE_KEY = 'nano_ai_source';

/** 读取本地保存的 AI 源；无效或未设置时返回默认 Vertex */
export function readStoredAiSource(): AISource {
  if (typeof localStorage === 'undefined') return DEFAULT_AI_SOURCE;
  const stored = localStorage.getItem(AI_SOURCE_STORAGE_KEY);
  return stored === 'fal' || stored === 'vertex' ? stored : DEFAULT_AI_SOURCE;
}

export function persistAiSource(source: AISource): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AI_SOURCE_STORAGE_KEY, source);
  }
}

/** 支持通过 Vertex AI 调用的模型列表 */
export const VERTEX_SUPPORTED_MODELS: ImageGenerationModel[] = [
  'fal-ai/nano-banana',
  'fal-ai/nano-banana-pro',
  'fal-ai/nano-banana-2',
];

export type Language = 'en' | 'zh';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '3:1' | '1:3';
export type ImageResolution = '0.5K' | '1K' | '2K' | '4K';
