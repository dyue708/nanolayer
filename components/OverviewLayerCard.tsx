import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Language } from '../types';
import { t } from '../utils/i18n';
import {
  computeFitScale,
  computeOverviewViewportSize,
  cropLayerToDataUrl,
  downloadLayerContentPng,
  getLayerContentBounds,
  LayerContentBounds,
} from '../utils/layerContentBounds';

export interface LayerViewportTransform {
  scale: number;
  panX: number;
  panY: number;
}

interface OverviewLayerCardProps {
  layer: Layer;
  index: number;
  isActive: boolean;
  isSpotlight?: boolean;
  lang: Language;
  onSelect: () => void;
  onExpand: () => void;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 12;
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

const OverviewLayerCard = React.forwardRef<HTMLElement, OverviewLayerCardProps>(
  function OverviewLayerCard(
    { layer, index, isActive, isSpotlight, lang, onSelect, onExpand },
    ref
  ) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const wheelZoneRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<LayerViewportTransform | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const bounds: LayerContentBounds = useMemo(
    () => getLayerContentBounds(layer.canvas),
    [layer.canvas, layer.id]
  );

  const { viewportW, viewportH } = useMemo(
    () => computeOverviewViewportSize(bounds),
    [bounds]
  );

  const previewUrl = useMemo(
    () => cropLayerToDataUrl(layer.canvas, bounds),
    [layer.canvas, bounds]
  );

  const baseFitTransform = useMemo(
    () => buildFitTransform(bounds, viewportW, viewportH),
    [bounds, viewportW, viewportH]
  );

  const baseFitScale = baseFitTransform.scale;

  useEffect(() => {
    setTransform(buildFitTransform(bounds, viewportW, viewportH));
  }, [layer.id, bounds, viewportW, viewportH]);

  const current = transform ?? baseFitTransform;

  const applyFit = useCallback(() => {
    setTransform(buildFitTransform(bounds, viewportW, viewportH));
  }, [bounds, viewportW, viewportH]);

  const zoomBy = useCallback(
    (factor: number) => {
      setTransform((prev) => {
        const base = prev ?? baseFitTransform;
        const cx = viewportW / 2;
        const cy = viewportH / 2;
        const nextScale = clampScale(base.scale * factor);
        const ratio = nextScale / base.scale;
        return {
          scale: nextScale,
          panX: cx - (cx - base.panX) * ratio,
          panY: cy - (cy - base.panY) * ratio,
        };
      });
    },
    [baseFitTransform, viewportW, viewportH]
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

  /** React onWheel 无法可靠 preventDefault；用 passive:false 原生监听避免同时滚动总览列表 */
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
  }, [applyWheelZoom, layer.id]);

  const handlePanStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
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
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onUp = () => setIsPanning(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isPanning, baseFitTransform]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    const t0 = e.touches[0];
    setIsPanning(true);
    panStart.current = {
      x: t0.clientX,
      y: t0.clientY,
      panX: current.panX,
      panY: current.panY,
    };
  };

  const zoomPercent = Math.round((current.scale / (baseFitScale || 1)) * 100);

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadLayerContentPng(layer.canvas, bounds, layer.name);
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand();
  };

  return (
    <article
      ref={ref}
      data-layer-id={layer.id}
      className={`w-full flex flex-col rounded-2xl border-2 overflow-hidden shadow-lg transition-colors scroll-mt-4 scroll-mb-4 ${
        isSpotlight
          ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-900'
          : isActive
            ? 'border-blue-500 ring-2 ring-blue-500/30 bg-slate-900'
            : 'border-slate-700 bg-slate-900/90'
      } ${!layer.visible ? 'opacity-60' : ''}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`flex flex-col gap-1 px-2 py-2 border-b border-slate-700/80 cursor-pointer min-w-0 ${
          isActive ? 'bg-blue-950/40' : 'bg-slate-800/60 hover:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono text-slate-500 shrink-0">{index + 1}</span>
          <p
            className={`text-[10px] font-bold truncate uppercase tracking-tight flex-1 ${
              isActive ? 'text-blue-200' : 'text-slate-200'
            }`}
          >
            {layer.name}
          </p>
        </div>
        <div className="flex items-center justify-center gap-0.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <span className="text-[9px] text-slate-500 font-mono mr-0.5">
            {bounds.width}×{bounds.height}
          </span>
          <button
            type="button"
            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px]"
            title={t(lang, 'overviewZoomOut')}
            onClick={() => zoomBy(1 / ZOOM_STEP)}
          >
            <i className="fa-solid fa-minus" />
          </button>
          <span className="text-[9px] font-mono text-slate-400 w-8 text-center">{zoomPercent}%</span>
          <button
            type="button"
            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px]"
            title={t(lang, 'overviewZoomIn')}
            onClick={() => zoomBy(ZOOM_STEP)}
          >
            <i className="fa-solid fa-plus" />
          </button>
          <button
            type="button"
            className="h-6 px-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 text-[9px]"
            title={t(lang, 'overviewZoomFit')}
            onClick={applyFit}
          >
            {t(lang, 'overviewZoomFit')}
          </button>
          <button
            type="button"
            className="w-6 h-6 rounded bg-slate-700 hover:bg-amber-600 text-amber-200/90 hover:text-white text-[10px]"
            title={t(lang, 'overviewExpandLayer')}
            onClick={handleExpand}
          >
            <i className="fa-solid fa-up-right-and-down-left-from-center" />
          </button>
          <button
            type="button"
            className="w-6 h-6 rounded bg-slate-700 hover:bg-emerald-600 text-emerald-300/90 hover:text-white text-[10px]"
            title={t(lang, 'overviewExportLayer')}
            onClick={handleExport}
          >
            <i className="fa-solid fa-download" />
          </button>
        </div>
      </div>

      <div
        ref={wheelZoneRef}
        className="flex justify-center bg-slate-950/50 overscroll-contain"
      >
      <div
        ref={viewportRef}
        className="relative bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing shrink-0"
        style={{ width: viewportW, height: viewportH, touchAction: 'none' }}
        onMouseDown={handlePanStart}
        onTouchStart={handleTouchStart}
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
            className="block max-w-none shadow-md ring-1 ring-slate-700/50"
          />
        </div>
      </div>
      </div>

      {!layer.visible && (
        <div className="px-2 py-0.5 text-[9px] text-slate-500 border-t border-slate-800 text-center">
          <i className="fa-solid fa-eye-slash mr-1" />
          {t(lang, 'layerHidden')}
        </div>
      )}
    </article>
  );
  }
);

export default OverviewLayerCard;
