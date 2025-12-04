
import React from 'react';
import { Layer, Language } from '../types';
import { t } from '../utils/i18n';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
  lang: Language;
}

const LayerManager: React.FC<LayerManagerProps> = React.memo(({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisibility,
  onOpacityChange,
  onDeleteLayer,
  onAddLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  lang
}) => {
  // Render layers in reverse order for the list (Top layer at top of list)
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-64 shrink-0">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{t(lang, 'layers')}</h3>
        <button 
            onClick={onAddLayer}
            className="text-slate-400 hover:text-white hover:bg-slate-700 px-2 py-1 rounded transition-colors text-xs flex items-center gap-1"
            title={t(lang, 'importImage')}
        >
            <i className="fa-solid fa-plus"></i> {t(lang, 'add')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {displayLayers.map((layer, index) => {
           // In displayLayers, index 0 is the TOP layer.
           // In the actual layers array, this layer is at layers.length - 1 - index.
           const isTop = index === 0;
           const isBottom = index === displayLayers.length - 1;

           return (
            <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex items-center p-2 rounded-md cursor-pointer transition-all ${
                activeLayerId === layer.id
                    ? 'bg-blue-600 shadow-md ring-1 ring-blue-400'
                    : 'bg-slate-800 hover:bg-slate-750'
                }`}
            >
                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(layer.id);
                }}
                className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 ${
                    layer.visible ? 'text-slate-200' : 'text-slate-500'
                }`}
                >
                <i className={`fa-solid ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                </button>
                
                {/* Thumbnail Preview */}
                <div className="w-10 h-10 ml-2 bg-slate-700 rounded border border-slate-600 overflow-hidden relative shrink-0">
                    <div className="absolute inset-0 checkerboard-bg opacity-50"></div>
                    <img 
                        src={layer.thumbnail || layer.canvas.toDataURL()} 
                        alt="thumb" 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                </div>

                <div className="ml-3 flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${activeLayerId === layer.id ? 'text-white' : 'text-slate-300'}`}>
                        {layer.name}
                    </p>
                    <div className="flex items-center mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] text-slate-400 mr-1">Op:</span>
                        <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-16 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-400"
                        />
                    </div>
                </div>
                
                {/* Order and Delete Controls */}
                <div className="flex flex-col ml-1 space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveLayerUp(layer.id);
                        }}
                        disabled={isTop}
                        className={`w-5 h-4 flex items-center justify-center text-[10px] rounded hover:bg-slate-600 ${isTop ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
                        title={t(lang, 'moveUp')}
                    >
                        <i className="fa-solid fa-chevron-up"></i>
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveLayerDown(layer.id);
                        }}
                        disabled={isBottom}
                        className={`w-5 h-4 flex items-center justify-center text-[10px] rounded hover:bg-slate-600 ${isBottom ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300'}`}
                        title={t(lang, 'moveDown')}
                    >
                        <i className="fa-solid fa-chevron-down"></i>
                    </button>
                </div>

                <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                }}
                className="ml-1 w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
           );
        })}
        
        {layers.length === 0 && (
            <div className="text-center mt-10 text-slate-500 text-sm px-4">
                <i className="fa-regular fa-image text-2xl mb-2 opacity-30"></i>
                <p>{t(lang, 'noLayers')}</p>
                <button onClick={onAddLayer} className="mt-2 text-blue-400 hover:text-blue-300 text-xs">{t(lang, 'importImage')}</button>
            </div>
        )}
      </div>
    </div>
  );
});

export default LayerManager;
