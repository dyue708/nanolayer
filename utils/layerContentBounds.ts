/** 图层 canvas 中非透明像素的外接矩形（用于总览裁剪透明边） */
export interface LayerContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ALPHA_THRESHOLD = 12;

export function getLayerContentBounds(canvas: HTMLCanvasElement): LayerContentBounds {
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { x: 0, y: 0, width: w, height: h };
  }

  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, width: w, height: h };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/** 将内容区域导出为紧凑预览 data URL */
export function cropLayerToDataUrl(
  canvas: HTMLCanvasElement,
  bounds: LayerContentBounds
): string {
  if (bounds.width <= 0 || bounds.height <= 0) {
    return canvas.toDataURL('image/png');
  }
  if (
    bounds.x === 0 &&
    bounds.y === 0 &&
    bounds.width === canvas.width &&
    bounds.height === canvas.height
  ) {
    return canvas.toDataURL('image/png');
  }

  const out = document.createElement('canvas');
  out.width = bounds.width;
  out.height = bounds.height;
  const ctx = out.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');
  ctx.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );
  return out.toDataURL('image/png');
}

export function computeFitScale(
  contentW: number,
  contentH: number,
  viewportW: number,
  viewportH: number
): number {
  if (contentW <= 0 || contentH <= 0 || viewportW <= 0 || viewportH <= 0) {
    return 1;
  }
  return Math.min(viewportW / contentW, viewportH / contentH, 1);
}

/** 总览卡片视口：按内容尺寸自适应，超大图缩小、过小图设下限 */
export const OVERVIEW_VIEWPORT_MAX_W = 480;
export const OVERVIEW_VIEWPORT_MAX_H = 360;
export const OVERVIEW_VIEWPORT_MIN_W = 100;
export const OVERVIEW_VIEWPORT_MIN_H = 80;

export function computeViewportSizeForBounds(
  bounds: LayerContentBounds,
  maxW: number,
  maxH: number,
  minW: number = OVERVIEW_VIEWPORT_MIN_W,
  minH: number = OVERVIEW_VIEWPORT_MIN_H
): { viewportW: number; viewportH: number } {
  const cw = Math.max(1, bounds.width);
  const ch = Math.max(1, bounds.height);

  let fit = Math.min(maxW / cw, maxH / ch, 1);
  let vw = Math.round(cw * fit);
  let vh = Math.round(ch * fit);

  if (vw < minW) {
    fit = minW / cw;
    vw = minW;
    vh = Math.max(minH, Math.round(ch * fit));
  }
  if (vh < minH) {
    const fitH = minH / ch;
    if (fitH > fit) {
      fit = fitH;
      vh = minH;
      vw = Math.min(maxW, Math.round(cw * fit));
    }
  }

  vw = Math.min(vw, maxW);
  vh = Math.min(vh, maxH);

  return { viewportW: vw, viewportH: vh };
}

export function computeOverviewViewportSize(bounds: LayerContentBounds): {
  viewportW: number;
  viewportH: number;
} {
  return computeViewportSizeForBounds(
    bounds,
    OVERVIEW_VIEWPORT_MAX_W,
    OVERVIEW_VIEWPORT_MAX_H
  );
}

/** 总览放大层：尽量占满视口 */
export function computeExpandedOverviewViewportSize(bounds: LayerContentBounds): {
  viewportW: number;
  viewportH: number;
} {
  const maxW = Math.min(
    typeof window !== 'undefined' ? window.innerWidth * 0.92 : 1200,
    1400
  );
  const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.78 : 800;
  return computeViewportSizeForBounds(bounds, maxW, maxH, 120, 100);
}

export function sanitizeDownloadFilename(name: string): string {
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim();
  return cleaned || 'layer';
}

/** 触发浏览器下载 canvas 为 PNG */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

/** 导出图层有效内容区域（与总览裁剪一致） */
export function downloadLayerContentPng(
  canvas: HTMLCanvasElement,
  bounds: LayerContentBounds,
  layerName: string
): void {
  const safeName = sanitizeDownloadFilename(layerName);
  if (bounds.width <= 0 || bounds.height <= 0) {
    downloadCanvasAsPng(canvas, safeName);
    return;
  }
  if (
    bounds.x === 0 &&
    bounds.y === 0 &&
    bounds.width === canvas.width &&
    bounds.height === canvas.height
  ) {
    downloadCanvasAsPng(canvas, safeName);
    return;
  }
  const out = document.createElement('canvas');
  out.width = bounds.width;
  out.height = bounds.height;
  const ctx = out.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height
  );
  downloadCanvasAsPng(out, safeName);
}
