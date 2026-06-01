import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Language } from '../types';
import { t } from '../utils/i18n';
import {
  computeExpandedOverviewViewportSize,
  computeFitScale,
  cropLayerToDataUrl,
  getLayerContentBounds,
  LayerContentBounds,
} from '../utils/layerContentBounds';
import type { LayerViewportTransform } from './OverviewLayerCard';

const MIN_SCALE = 0.15;
const MAX_SCALE = 16;
const ZOOM_STEP = 1.15;

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

function buildFitTransform(
  bounds: LayerContentBounds,
  viewportW: number,
  viewportH: number
): LayerViewportTransform {
  const scale = computeFitScale(bounds.width, bounds.height, viewportW, viewportH);
  const s = scale > 0 ? scale : 1;
  const contentW = bounds.width * s;
  const contentH = bounds.height * s;
  return {
    scale: s,
    panX: (viewportW - contentW) / 2,
    panY: (viewportH - contentH) / 2,
  };
}

interface OverviewLayerExpandedProps {
  layer: Layer;
  lang: Language;
  onClose: () => void;
}

const OverviewLayerExpanded: React.FC<OverviewLayerExpandedProps> = ({ layer, lang, onClose }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wheelZoneRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<LayerViewportTransform | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 800, h: 600 });

  const bounds = useMemo(() => getLayerContentBounds(layer.canvas), [layer.canvas, layer.id]);
  const previewUrl = useMemo(
    () => cropLayerToDataUrl(layer.canvas, bounds),
    [layer.canvas, bounds]
  );

  const recalcViewport = useCallback(() => {
    setViewportSize((prev) => {
      const next = computeExpandedOverviewViewportSize(bounds);
      if (prev.w === next.viewportW && prev.h === next.viewportH) return prev;
      return { w: next.viewportW, h: next.viewportH };
    });
  }, [bounds]);

  useEffect(() => {
    recalcViewport();
    const onResize = () => recalcViewport();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recalcViewport, layer.id]);

  const baseFitTransform = useMemo(
    () => buildFitTransform(bounds, viewportSize.w, viewportSize.h),
    [bounds, viewportSize.w, viewportSize.h]
  );

  useEffect(() => {
    setTransform(buildFitTransform(bounds, viewportSize.w, viewportSize.h));
  }, [layer.id, bounds, viewportSize.w, viewportSize.h]);

  const current = transform ?? baseFitTransform;
  const baseFitScale = baseFitTransform.scale;

  const applyFit = useCallback(() => {
    setTransform(buildFitTransform(bounds, viewportSize.w, viewportSize.h));
  }, [bounds, viewportSize.w, viewportSize.h]);

  const zoomBy = useCallback(
    (factor: number) => {
      setTransform((prev) => {
        const base = prev ?? baseFitTransform;
        const cx = viewportSize.w / 2;
        const cy = viewportSize.h / 2;
        const nextScale = clampScale(base.scale * factor);
        const ratio = nextScale / base.scale;
        return {
          scale: nextScale,
          panX: cx - (cx - base.panX) * ratio,
          panY: cy - (cy - base.panY) * ratio,
        };
      });
    },
    [baseFitTransform, viewportSize.w, viewportSize.h]
  );

  const applyWheelZoom = useCallback(
    (clientX: number, clientY: number, deltaY: number) => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const factor = deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setTransform((prev) => {
        const base = prev ?? baseFitTransform;
        const nextScale = clampScale(base.scale * factor);
        const ratio = nextScale / base.scale;
        return {
          scale: nextScale,
          panX: mx - (mx - base.panX) * ratio,
          panY: my - (my - base.panY) * ratio,
        };
      });
    },
    [baseFitTransform]
  );

  useEffect(() => {
    const zone = wheelZoneRef.current;
    if (!zone) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      applyWheelZoom(e.clientX, e.clientY, e.deltaY);
    };
    zone.addEventListener('wheel', onWheel, { passive: false });
    return () => zone.removeEventListener('wheel', onWheel);
  }, [applyWheelZoom]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsPanning(true);
    panStart.current = {
      x: e.clientX,
      y: e.clientY,
      panX: current.panX,
      panY: current.panY,
    };
  };

  useEffect(() => {
    if (!isPanning) return;
    const onMove = (clientX: number, clientY: number) => {
      setTransform((prev) => {
        const base = prev ?? baseFitTransform;
        return {
          ...base,
          panX: panStart.current.panX + (clientX - panStart.current.x),
          panY: panStart.current.panY + (clientY - panStart.current.y),
        };
      });
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onUp = () => setIsPanning(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isPanning, baseFitTransform]);

  const zoomPercent = Math.round((current.scale / (baseFitScale || 1)) * 100);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={layer.name}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700/80 bg-slate-900/95 shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{layer.name}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {bounds.width}×{bounds.height} · {t(lang, 'overviewExpandedEsc')}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
            title={t(lang, 'overviewZoomOut')}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <i className="fa-solid fa-minus text-xs" />
          </button>
          <span className="text-xs font-mono text-slate-400 w-12 text-center">{zoomPercent}%</span>
          <button
            type="button"
            className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
            title={t(lang, 'overviewZoomIn')}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <i className="fa-solid fa-plus text-xs" />
          </button>
          <button
            type="button"
            className="h-8 px-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs"
            onClick={applyFit}
          >
            {t(lang, 'overviewZoomFit')}
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded bg-slate-700 hover:bg-red-600/80 text-slate-300 hover:text-white ml-1"
            title={t(lang, 'overviewExpandedClose')}
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div
          ref={wheelZoneRef}
          className="rounded-xl border border-slate-600 overflow-hidden overscroll-contain shadow-2xl"
        >
          <div
            ref={viewportRef}
            className="relative bg-slate-950 cursor-grab active:cursor-grabbing"
            style={{
              width: viewportSize.w,
              height: viewportSize.h,
              touchAction: 'none',
            }}
            onMouseDown={handlePanStart}
            title={t(lang, 'overviewPanHint')}
          >
            <div
              className="absolute left-0 top-0 origin-top-left will-change-transform"
              style={{
                width: bounds.width,
                height: bounds.height,
                transform: `translate(${current.panX}px, ${current.panY}px) scale(${current.scale})`,
                imageRendering: current.scale > 2 ? 'pixelated' : 'auto',
              }}
            >
              <img
                src={previewUrl}
                alt=""
                draggable={false}
                width={bounds.width}
                height={bounds.height}
                className="block max-w-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewLayerExpanded;
