
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  canvas: HTMLCanvasElement; // Stores the actual image data
  zIndex: number;
  x: number;
  y: number;
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

export type ImageGenerationModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

export type Language = 'en' | 'zh';
