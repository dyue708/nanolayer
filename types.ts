export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0 to 1
  canvas: HTMLCanvasElement; // Stores the actual image data
  zIndex: number;
}

export enum ToolMode {
  SELECT = 'SELECT',
  EDIT = 'EDIT',
  ANALYZE = 'ANALYZE',
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