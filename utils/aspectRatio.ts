import type { AspectRatio } from '../types';

/** 编辑输出尺寸快捷比例（与后端 SupportedAspectRatio 一致） */
export const EDIT_OUTPUT_ASPECT_PRESETS: ReadonlyArray<{
  rw: number;
  rh: number;
  label: AspectRatio;
}> = [
  { rw: 1, rh: 1, label: '1:1' },
  { rw: 4, rh: 3, label: '4:3' },
  { rw: 3, rh: 4, label: '3:4' },
  { rw: 16, rh: 9, label: '16:9' },
  { rw: 9, rh: 16, label: '9:16' },
  { rw: 3, rh: 1, label: '3:1' },
  { rw: 1, rh: 3, label: '1:3' },
];

/** 由输出宽高推断标准比例（用于 API aspectRatio，容差约 1.5%） */
export function aspectRatioFromDimensions(
  width: number,
  height: number
): AspectRatio | undefined {
  if (width <= 0 || height <= 0) return undefined;
  const r = width / height;
  const tolerance = 0.015;
  for (const { label, rw, rh } of EDIT_OUTPUT_ASPECT_PRESETS) {
    const target = rw / rh;
    if (Math.abs(r - target) / target <= tolerance) return label;
  }
  return undefined;
}
