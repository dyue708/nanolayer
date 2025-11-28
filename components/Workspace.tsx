
import React, { useEffect, useRef, useState } from 'react';
import { Layer, SelectionRect, ToolMode, Language } from '../types';
import { t } from '../utils/i18n';

interface WorkspaceProps {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string | null;
  mode: ToolMode;
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
  onLayerMove: (id: string, x: number, y: number) => void;
  lang: Language;
}

const Workspace: React.FC<WorkspaceProps> = ({ 
  width, 
  height, 
  layers, 
  activeLayerId,
  mode, 
  selection, 
  onSelectionChange, 
  onLayerMove,
  lang 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // For Move Tool
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [movingLayerId, setMovingLayerId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layers in order (bottom to top)
    layers.forEach((layer) => {
      if (layer.visible) {
        ctx.globalAlpha = layer.opacity;
        // Draw layer at its specific coordinates
        ctx.drawImage(layer.canvas, layer.x, layer.y);
        
        // Highlight active layer border in Move mode
        if (mode === ToolMode.MOVE && layer.id === activeLayerId) {
             ctx.save();
             ctx.strokeStyle = '#3b82f6'; // blue-500
             ctx.lineWidth = 2 / scale; // Keep line width constant
             ctx.strokeRect(layer.x, layer.y, layer.canvas.width, layer.canvas.height);
             ctx.restore();
        }
      }
    });

    // Reset global alpha
    ctx.globalAlpha = 1.0;

  }, [layers, width, height, activeLayerId, mode, scale]);

  // Use ResizeObserver to handle container size changes (e.g. sidebar toggle)
  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleResize = () => {
          if (width > 0 && height > 0) {
              const padding = 40;
              const availWidth = container.clientWidth - padding;
              const availHeight = container.clientHeight - padding;
              const scaleW = availWidth / width;
              const scaleH = availHeight / height;
              setScale(Math.min(scaleW, scaleH, 1)); // Max scale 1 to prevent pixelation
          }
      };

      const resizeObserver = new ResizeObserver(() => {
          handleResize();
      });

      resizeObserver.observe(container);
      handleResize(); // Initial calculation

      return () => {
          resizeObserver.disconnect();
      };
  }, [width, height]);

  // Mouse Event Handlers
  const getCanvasCoordinates = (e: React.MouseEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (width / rect.width);
      const y = (e.clientY - rect.top) * (height / rect.height);
      return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      const pos = getCanvasCoordinates(e);

      if (mode === ToolMode.SELECT) {
          setIsDragging(true);
          setStartPos(pos);
          onSelectionChange({ 
              x: Math.max(0, Math.min(pos.x, width)), 
              y: Math.max(0, Math.min(pos.y, height)), 
              width: 0, 
              height: 0 
          });
      } else if (mode === ToolMode.MOVE && activeLayerId) {
          const activeLayer = layers.find(l => l.id === activeLayerId);
          if (activeLayer) {
              setIsDragging(true);
              setMovingLayerId(activeLayerId);
              setDragOffset({
                  x: pos.x - activeLayer.x,
                  y: pos.y - activeLayer.y
              });
          }
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const currentPos = getCanvasCoordinates(e);

      if (mode === ToolMode.SELECT) {
          // Clamp values to canvas bounds
          const cx = Math.max(0, Math.min(currentPos.x, width));
          const cy = Math.max(0, Math.min(currentPos.y, height));
          const sx = Math.max(0, Math.min(startPos.x, width));
          const sy = Math.max(0, Math.min(startPos.y, height));

          const newX = Math.min(sx, cx);
          const newY = Math.min(sy, cy);
          const newW = Math.abs(cx - sx);
          const newH = Math.abs(cy - sy);

          onSelectionChange({ x: newX, y: newY, width: newW, height: newH });
      } else if (mode === ToolMode.MOVE && movingLayerId) {
          const newX = currentPos.x - dragOffset.x;
          const newY = currentPos.y - dragOffset.y;
          onLayerMove(movingLayerId, newX, newY);
      }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      setMovingLayerId(null);
  };

  if (width === 0 || height === 0) {
      return (
          <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-500">
              <div className="text-center">
                  <i className="fa-solid fa-image text-4xl mb-4 opacity-50"></i>
                  <p>{t(lang, 'workspacePlaceholder')}</p>
              </div>
          </div>
      )
  }

  return (
    <div 
        ref={containerRef} 
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-950 p-4 select-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
       {/* Canvas Wrapper with Scale */}
       <div 
        style={{ 
            width: width, 
            height: height, 
            transform: `scale(${scale})`,
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)'
        }} 
        className={`checkerboard-bg relative transition-transform duration-200 ease-out shrink-0
            ${mode === ToolMode.SELECT ? 'cursor-crosshair' : ''}
            ${mode === ToolMode.MOVE ? 'cursor-move' : ''}
        `}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
       >
         <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="block w-full h-full"
         />
         
         {/* Selection Overlay */}
         {selection && selection.width > 0 && selection.height > 0 && (
             <div 
                className="absolute border-2 border-dashed border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{
                    left: selection.x,
                    top: selection.y,
                    width: selection.width,
                    height: selection.height,
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 0 9999px rgba(0,0,0,0.5)' // Darken area outside selection
                }}
             >
                 <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow">
                     {Math.round(selection.width)} x {Math.round(selection.height)}
                 </div>
             </div>
         )}
       </div>
       
       <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-xs text-slate-400 backdrop-blur-sm pointer-events-none">
           {width} x {height}px | {Math.round(scale * 100)}% 
           {mode === ToolMode.SELECT && <span className="text-emerald-400 ml-2 font-semibold">{t(lang, 'selectionMode')}</span>}
           {mode === ToolMode.MOVE && <span className="text-blue-400 ml-2 font-semibold">{t(lang, 'toolMove')}</span>}
       </div>
    </div>
  );
};

export default Workspace;
