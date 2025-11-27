import React, { useEffect, useRef, useState } from 'react';
import { Layer, SelectionRect, ToolMode } from '../types';

interface WorkspaceProps {
  width: number;
  height: number;
  layers: Layer[];
  mode: ToolMode;
  selection: SelectionRect | null;
  onSelectionChange: (rect: SelectionRect | null) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ width, height, layers, mode, selection, onSelectionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

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
        ctx.drawImage(layer.canvas, 0, 0, width, height);
      }
    });

    // Reset global alpha
    ctx.globalAlpha = 1.0;

  }, [layers, width, height]);

  useEffect(() => {
      const handleResize = () => {
          if (containerRef.current && width > 0 && height > 0) {
              const padding = 40;
              const availWidth = containerRef.current.clientWidth - padding;
              const availHeight = containerRef.current.clientHeight - padding;
              const scaleW = availWidth / width;
              const scaleH = availHeight / height;
              setScale(Math.min(scaleW, scaleH, 1)); // Max scale 1 to prevent pixelation upscaling for now
          }
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  // Mouse Event Handlers for Selection
  const getCanvasCoordinates = (e: React.MouseEvent) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (width / rect.width);
      const y = (e.clientY - rect.top) * (height / rect.height);
      return { 
          x: Math.max(0, Math.min(x, width)), 
          y: Math.max(0, Math.min(y, height)) 
      };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (mode !== ToolMode.SELECT) return;
      setIsDragging(true);
      const pos = getCanvasCoordinates(e);
      setStartPos(pos);
      // Initialize selection with 0 size
      onSelectionChange({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || mode !== ToolMode.SELECT) return;
      const currentPos = getCanvasCoordinates(e);
      
      const newX = Math.min(startPos.x, currentPos.x);
      const newY = Math.min(startPos.y, currentPos.y);
      const newW = Math.abs(currentPos.x - startPos.x);
      const newH = Math.abs(currentPos.y - startPos.y);

      onSelectionChange({ x: newX, y: newY, width: newW, height: newH });
  };

  const handleMouseUp = () => {
      if (isDragging) {
          setIsDragging(false);
      }
  };

  if (width === 0 || height === 0) {
      return (
          <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-500">
              <div className="text-center">
                  <i className="fa-solid fa-image text-4xl mb-4 opacity-50"></i>
                  <p>Import a PSD or Image to start</p>
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
        className={`checkerboard-bg relative transition-transform duration-200 ease-out ${mode === ToolMode.SELECT ? 'cursor-crosshair' : ''}`}
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
       
       <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-xs text-slate-400 backdrop-blur-sm">
           {width} x {height}px | {Math.round(scale * 100)}% 
           {mode === ToolMode.SELECT && <span className="text-emerald-400 ml-2 font-semibold">SELECTION MODE</span>}
       </div>
    </div>
  );
};

export default Workspace;