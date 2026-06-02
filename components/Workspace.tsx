
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Layer, SelectionRect, ToolMode, Language, WorkspaceViewMode } from '../types';
import { t } from '../utils/i18n';
import OverviewLayerCard from './OverviewLayerCard';
import OverviewLayerExpanded from './OverviewLayerExpanded';
interface WorkspaceProps {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string | null;
  viewMode: WorkspaceViewMode;
  mode: ToolMode;
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
  onLayerMove: (id: string, x: number, y: number) => void;
  onSelectLayer: (id: string) => void;
  lang: Language;
}

/** 与左侧图层面板一致：列表自上而下 = 画布从顶到底 */
function layersForPanelOrder(layers: Layer[]): Layer[] {
  return [...layers].sort((a, b) => b.zIndex - a.zIndex);
}

const Workspace: React.FC<WorkspaceProps> = React.memo(({
  width,
  height,
  layers,
  activeLayerId,
  viewMode,
  mode,
  selection,
  onSelectionChange,
  onLayerMove,
  onSelectLayer,
  lang,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const overviewScrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [movingLayerId, setMovingLayerId] = useState<string | null>(null);

  const panelOrderedLayers = useMemo(() => layersForPanelOrder(layers), [layers]);
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const layerCardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerLayerCardRef = useCallback((layerId: string, el: HTMLElement | null) => {
    if (el) layerCardRefs.current.set(layerId, el);
    else layerCardRefs.current.delete(layerId);
  }, []);

  useEffect(() => {
    if (viewMode !== 'overview') {
      setExpandedLayerId(null);
    }
  }, [viewMode]);

  const scrollOverviewLayerIntoView = useCallback((layerId: string, behavior: ScrollBehavior = 'smooth') => {
    const container = overviewScrollRef.current;
    if (!container) return;
    const el =
      layerCardRefs.current.get(layerId) ??
      container.querySelector<HTMLElement>(`[data-layer-id="${layerId}"]`);
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const targetTop =
      container.scrollTop +
      (elRect.top - containerRect.top) -
      containerRect.height / 2 +
      elRect.height / 2;
    container.scrollTo({ top: Math.max(0, targetTop), behavior });
  }, []);

  useEffect(() => {
    if (viewMode !== 'overview') return;
    const scrollTargetId = expandedLayerId ?? activeLayerId;
    if (!scrollTargetId) return;
    scrollOverviewLayerIntoView(scrollTargetId);
  }, [activeLayerId, expandedLayerId, viewMode, panelOrderedLayers.length, scrollOverviewLayerIntoView]);

  useEffect(() => {
    if (viewMode !== 'canvas') return;

    const resetAncestorScroll = (start: HTMLElement | null) => {
      let el: HTMLElement | null = start;
      while (el) {
        if (el.scrollTop !== 0) el.scrollTop = 0;
        if (el.scrollLeft !== 0) el.scrollLeft = 0;
        el = el.parentElement;
      }
    };

    const recalcCanvasScale = () => {
      const container = canvasContainerRef.current;
      if (!container || width <= 0 || height <= 0) return;
      const padding = 40;
      const availWidth = container.clientWidth - padding;
      const availHeight = container.clientHeight - padding;
      if (availWidth <= 0 || availHeight <= 0) return;
      const scaleW = availWidth / width;
      const scaleH = availHeight / height;
      setScale(Math.min(scaleW, scaleH, 1));
    };

    requestAnimationFrame(() => {
      resetAncestorScroll(canvasContainerRef.current);
      recalcCanvasScale();
      requestAnimationFrame(recalcCanvasScale);
    });
  }, [viewMode, width, height]);

  const expandedLayer = expandedLayerId
    ? layers.find((l) => l.id === expandedLayerId)
    : undefined;

  useEffect(() => {
    if (viewMode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawOrder = [...layers].sort((a, b) => a.zIndex - b.zIndex);
    drawOrder.forEach((layer) => {
      if (layer.visible) {
        ctx.globalAlpha = layer.opacity;
        ctx.drawImage(layer.canvas, layer.x, layer.y);

        if (mode === ToolMode.MOVE && layer.id === activeLayerId) {
          ctx.save();
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2 / scale;
          ctx.strokeRect(layer.x, layer.y, layer.canvas.width, layer.canvas.height);
          ctx.restore();
        }
      }
    });

    ctx.globalAlpha = 1.0;
  }, [layers, width, height, activeLayerId, mode, scale, viewMode]);

  useEffect(() => {
    if (viewMode !== 'canvas') return;
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (width > 0 && height > 0) {
        const padding = 40;
        const availWidth = container.clientWidth - padding;
        const availHeight = container.clientHeight - padding;
        if (availWidth <= 0 || availHeight <= 0) return;
        const scaleW = availWidth / width;
        const scaleH = availHeight / height;
        setScale(Math.min(scaleW, scaleH, 1));
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    return () => resizeObserver.disconnect();
  }, [width, height, viewMode]);

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) * (width / rect.width);
    const y = (clientY - rect.top) * (height / rect.height);
    return { x, y };
  };

  const handleInputStart = (clientX: number, clientY: number) => {
    if (viewMode !== 'canvas') return;
    const pos = getCanvasCoordinates(clientX, clientY);

    if (mode === ToolMode.SELECT) {
      setIsDragging(true);
      setStartPos(pos);
      onSelectionChange({
        x: Math.max(0, Math.min(pos.x, width)),
        y: Math.max(0, Math.min(pos.y, height)),
        width: 0,
        height: 0,
      });
    } else if (mode === ToolMode.MOVE && activeLayerId) {
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer) {
        setIsDragging(true);
        setMovingLayerId(activeLayerId);
        setDragOffset({
          x: pos.x - activeLayer.x,
          y: pos.y - activeLayer.y,
        });
      }
    }
  };

  const handleInputMove = (clientX: number, clientY: number) => {
    if (viewMode !== 'canvas' || !isDragging) return;
    const currentPos = getCanvasCoordinates(clientX, clientY);

    if (mode === ToolMode.SELECT) {
      const cx = Math.max(0, Math.min(currentPos.x, width));
      const cy = Math.max(0, Math.min(currentPos.y, height));
      const sx = Math.max(0, Math.min(startPos.x, width));
      const sy = Math.max(0, Math.min(startPos.y, height));
      onSelectionChange({
        x: Math.min(sx, cx),
        y: Math.min(sy, cy),
        width: Math.abs(cx - sx),
        height: Math.abs(cy - sy),
      });
    } else if (mode === ToolMode.MOVE && movingLayerId) {
      onLayerMove(movingLayerId, currentPos.x - dragOffset.x, currentPos.y - dragOffset.y);
    }
  };

  const handleInputEnd = () => {
    setIsDragging(false);
    setMovingLayerId(null);
  };

  const emptyPlaceholder = (
    <div className="flex flex-1 items-center justify-center text-slate-500 p-8">
      <div className="text-center max-w-md p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
        <i className="fa-solid fa-wand-magic-sparkles text-5xl mb-6 text-blue-500/50"></i>
        <p className="text-lg font-light text-slate-300">{t(lang, 'workspacePlaceholder')}</p>
      </div>
    </div>
  );

  const noCanvas = width === 0 || height === 0;
  const isWorkspaceEmpty = layers.length === 0 && noCanvas;

  if (isWorkspaceEmpty) {
    return (
      <div className="flex-1 min-h-0 h-full relative flex flex-col bg-slate-950">
        {emptyPlaceholder}
      </div>
    );
  }

  if (viewMode === 'overview') {
    return (
      <>
      <div
        ref={overviewScrollRef}
        className="flex-1 min-h-0 h-full relative overflow-y-auto overflow-x-hidden overscroll-y-contain bg-slate-950 custom-scrollbar select-none"
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-950/90 border-b border-slate-800 backdrop-blur-sm">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              {t(lang, 'overviewModeLabel')}
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {t(lang, 'overviewOrderHint')} · {t(lang, 'overviewInspectHint')}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {panelOrderedLayers.length} {t(lang, 'overviewLayersCount')}
          </span>
        </div>

        <div className="p-4 md:p-6 pb-28">
          <div className="flex flex-col items-center gap-6 max-w-3xl mx-auto">
            {panelOrderedLayers.map((layer, index) => (
              <OverviewLayerCard
                key={layer.id}
                ref={(el) => registerLayerCardRef(layer.id, el)}
                layer={layer}
                index={index}
                isActive={activeLayerId === layer.id}
                isSpotlight={expandedLayerId === layer.id}
                lang={lang}
                onSelect={() => onSelectLayer(layer.id)}
                onExpand={() => {
                  onSelectLayer(layer.id);
                  setExpandedLayerId(layer.id);
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {expandedLayer && (
        <OverviewLayerExpanded
          layer={expandedLayer}
          lang={lang}
          orderedLayerIds={panelOrderedLayers.map((l) => l.id)}
          currentIndex={panelOrderedLayers.findIndex((l) => l.id === expandedLayerId)}
          onNavigate={(id) => {
            setExpandedLayerId(id);
            onSelectLayer(id);
          }}
          onClose={() => setExpandedLayerId(null)}
        />
      )}
      </>
    );
  }

  if (noCanvas) {
    return (
      <div className="flex-1 min-h-0 h-full relative flex flex-col bg-slate-950">
        {emptyPlaceholder}
      </div>
    );
  }

  return (
    <div
      ref={canvasContainerRef}
      className="flex-1 min-h-0 h-full relative overflow-hidden flex items-center justify-center bg-slate-950 p-4 select-none touch-none"
      onMouseUp={handleInputEnd}
      onMouseLeave={handleInputEnd}
      onTouchEnd={handleInputEnd}
      onTouchCancel={handleInputEnd}
      style={{ touchAction: 'none' }}
    >
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
          touchAction: 'none',
        }}
        className={`checkerboard-bg relative transition-transform duration-200 ease-out shrink-0
            ${mode === ToolMode.SELECT ? 'cursor-crosshair' : ''}
            ${mode === ToolMode.MOVE ? 'cursor-move' : ''}
        `}
        onMouseDown={(e) => handleInputStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleInputMove(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          handleInputStart(touch.clientX, touch.clientY);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          handleInputMove(touch.clientX, touch.clientY);
        }}
      >
        <canvas ref={canvasRef} width={width} height={height} className="block w-full h-full" />

        {selection && selection.width > 0 && selection.height > 0 && (
          <div
            className="absolute border-2 border-dashed border-white pointer-events-none"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 0 9999px rgba(0,0,0,0.5)',
            }}
          >
            <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
              {Math.round(selection.width)} x {Math.round(selection.height)}
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-xs text-slate-400 backdrop-blur-sm pointer-events-none z-10">
        {width} x {height}px | {Math.round(scale * 100)}%
        {mode === ToolMode.SELECT && (
          <span className="text-emerald-400 ml-2 font-semibold">{t(lang, 'selectionMode')}</span>
        )}
        {mode === ToolMode.MOVE && (
          <span className="text-blue-400 ml-2 font-semibold">{t(lang, 'toolMove')}</span>
        )}
      </div>
    </div>
  );
});

export default Workspace;
