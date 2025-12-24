
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

export type ImageGenerationModel = 'fal-ai/nano-banana' | 'fal-ai/nano-banana-pro';

export type Language = 'en' | 'zh';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageResolution = '1K' | '2K' | '4K';
