
import React from 'react';
import { Layer, Language } from '../types';
import { t } from '../utils/i18n';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerId: string | null;
  referenceLayerIds: string[]; // NEW: multiple IDs
  onSelectLayer: (id: string) => void;
  onToggleReference: (id: string) => void; // NEW: toggle handler
  onToggleVisibility: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  onDeleteLayer: (id: string) => void;
  onAddLayer: () => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
  lang: Language;
  onClose?: () => void;
}

const LayerManager: React.FC<LayerManagerProps> = React.memo(({
  layers,
  activeLayerId,
  referenceLayerIds,
  onSelectLayer,
  onToggleReference,
  onToggleVisibility,
  onOpacityChange,
  onDeleteLayer,
  onAddLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  lang,
  onClose
}) => {
  // Render layers in reverse order for the list (Top layer at top of list)
  const displayLayers = [...layers].reverse();

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-full md:w-64 shrink-0 shadow-2xl z-20">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850 md:bg-transparent min-h-[56px] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
            {onClose && (
                <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                    <i className="fa-solid fa-chevron-down"></i>
                </button>
            )}
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{t(lang, 'layers')}</h3>
        </div>
        <button 
            onClick={onAddLayer}
            className="text-slate-400 hover:text-white hover:bg-slate-700 px-2 py-1 rounded transition-colors text-xs flex items-center gap-1"
            title={t(lang, 'importImage')}
        >
            <i className="fa-solid fa-plus"></i> {t(lang, 'add')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar pb-24 md:pb-2 bg-slate-900/50">
        {displayLayers.map((layer, index) => {
           // In displayLayers, index 0 is the TOP layer.
           const isTop = index === 0;
           const isBottom = index === displayLayers.length - 1;
           const isRef = referenceLayerIds.includes(layer.id);
           const isActive = activeLayerId === layer.id;

           return (
            <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex items-center p-2 rounded-lg cursor-pointer transition-all border ${
                isActive
                    ? 'bg-blue-900/40 border-blue-500/80 ring-1 ring-blue-500/30 shadow-lg'
                    : 'bg-slate-800 border-transparent hover:bg-slate-700 border-slate-700/50'
                }`}
            >
                {/* Visibility Toggle (Left) */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                    }}
                    className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 mr-1 shrink-0 ${
                        layer.visible ? 'text-slate-300' : 'text-slate-600'
                    }`}
                    title="Toggle Visibility"
                >
                    <i className={`fa-solid ${layer.visible ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                </button>
                
                {/* Thumbnail Preview */}
                <div className={`w-10 h-10 rounded border overflow-hidden relative shrink-0 transition-colors bg-slate-900 ${
                    isActive ? 'border-blue-400' : 'border-slate-600'
                }`}>
                    <div className="absolute inset-0 checkerboard-bg opacity-50"></div>
                    <img 
                        src={layer.thumbnail || layer.canvas.toDataURL()} 
                        alt="thumb" 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                    {isRef && (
                        <div className="absolute inset-0 ring-2 ring-inset ring-indigo-500 bg-indigo-500/20 pointer-events-none flex items-center justify-center">
                            <i className="fa-solid fa-link text-indigo-200 text-[10px] drop-shadow-md"></i>
                        </div>
                    )}
                </div>

                {/* Layer Name & Opacity */}
                <div className="ml-3 flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate transition-colors ${isActive ? 'text-blue-100' : 'text-slate-300'}`}>
                        {layer.name}
                    </p>
                    <div className="flex items-center mt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[9px] text-slate-500 mr-1 opacity-70">Op:</span>
                        <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-12 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400 hover:accent-blue-400"
                        />
                    </div>
                </div>
                
                {/* Right Side Actions Divider */}
                <div className={`w-px h-8 mx-2 ${isActive ? 'bg-blue-500/20' : 'bg-slate-700'}`}></div>

                {/* Right Side Action Buttons */}
                <div className="flex items-center gap-1">
                    
                    {/* Reference Toggle (Moved to Right) - Hidden for active layer */}
                    {!isActive && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleReference(layer.id);
                            }}
                            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                isRef 
                                    ? 'text-indigo-300 bg-indigo-500/20 ring-1 ring-indigo-500/50' 
                                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-600'
                            }`}
                            title={t(lang, 'toggleRef')}
                        >
                            <i className={`fa-solid fa-image text-[10px] ${isRef ? 'animate-pulse' : ''}`}></i>
                        </button>
                    )}

                    {/* Move Up/Down */}
                    <div className="flex flex-col space-y-0.5">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveLayerUp(layer.id);
                            }}
                            disabled={isTop}
                            className={`w-4 h-3 flex items-center justify-center text-[8px] rounded hover:bg-slate-600 ${isTop ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400'}`}
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
                            className={`w-4 h-3 flex items-center justify-center text-[8px] rounded hover:bg-slate-600 ${isBottom ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400'}`}
                            title={t(lang, 'moveDown')}
                        >
                            <i className="fa-solid fa-chevron-down"></i>
                        </button>
                    </div>

                    {/* Delete */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer(layer.id);
                        }}
                        className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded transition-colors"
                        title="Delete Layer"
                    >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                </div>
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
