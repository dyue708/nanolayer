
import React from 'react';
import { Layer, Language } from '../types';
import { t } from '../utils/i18n';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerId: string | null;
  referenceLayerIds: string[];
  onSelectLayer: (id: string) => void;
  onToggleReference: (id: string) => void;
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
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 w-full md:w-72 shrink-0 shadow-2xl z-20">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850 md:bg-transparent min-h-[56px] pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3">
            {onClose && (
                <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
                    <i className="fa-solid fa-chevron-down"></i>
                </button>
            )}
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t(lang, 'layers')}</h3>
        </div>
        <button 
            onClick={onAddLayer}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-md transition-all text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
            title={t(lang, 'importImage')}
        >
            <i className="fa-solid fa-plus text-[10px]"></i> {t(lang, 'add')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar pb-24 md:pb-6 bg-slate-950/30">
        {displayLayers.map((layer, index) => {
           const isTop = index === 0;
           const isBottom = index === displayLayers.length - 1;
           const isRef = referenceLayerIds.includes(layer.id);
           const isActive = activeLayerId === layer.id;

           return (
            <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`group flex items-center p-2.5 rounded-xl cursor-pointer transition-all border-2 ${
                isActive
                    ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'bg-slate-800/60 border-transparent hover:bg-slate-800 border-slate-700/30'
                }`}
            >
                {/* Visibility Toggle */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(layer.id);
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 mr-2 shrink-0 transition-colors ${
                        layer.visible ? 'text-blue-400 bg-blue-500/5' : 'text-slate-600 bg-slate-900/40'
                    }`}
                    title="Toggle Visibility"
                >
                    <i className={`fa-solid ${layer.visible ? 'fa-eye' : 'fa-eye-slash'} text-xs`}></i>
                </button>
                
                {/* Thumbnail Preview */}
                <div className={`w-12 h-12 rounded-lg border-2 overflow-hidden relative shrink-0 transition-all bg-slate-900 shadow-sm ${
                    isActive ? 'border-blue-400 scale-105' : 'border-slate-700'
                }`}>
                    <div className="absolute inset-0 checkerboard-bg opacity-30"></div>
                    <img 
                        src={layer.thumbnail || layer.canvas.toDataURL()} 
                        alt="thumb" 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                    {isRef && (
                        <div className="absolute inset-0 ring-2 ring-inset ring-indigo-500 bg-indigo-500/30 pointer-events-none flex items-center justify-center">
                            <i className="fa-solid fa-link text-indigo-100 text-[10px] drop-shadow-md"></i>
                        </div>
                    )}
                </div>

                {/* Layer Name & Opacity */}
                <div className="ml-3 flex-1 min-w-0">
                    <p className={`text-xs font-black truncate transition-colors uppercase tracking-tight ${isActive ? 'text-blue-100' : 'text-slate-300'}`}>
                        {layer.name}
                    </p>
                    <div className="flex items-center mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={layer.opacity}
                        onChange={(e) => onOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                        />
                    </div>
                </div>
                
                {/* Divider */}
                <div className={`w-px h-10 mx-3 ${isActive ? 'bg-blue-500/30' : 'bg-slate-700/50'}`}></div>

                {/* Right Side Actions Group */}
                <div className="flex items-center gap-1.5">
                    
                    {/* Reference Toggle - Only visible if not the main active layer */}
                    {!isActive && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleReference(layer.id);
                            }}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                                isRef 
                                    ? 'text-indigo-200 bg-indigo-600 border border-indigo-400/50 shadow-lg shadow-indigo-900/40' 
                                    : 'text-slate-500 hover:text-indigo-300 hover:bg-slate-700 border border-transparent'
                            }`}
                            title={t(lang, 'toggleRef')}
                        >
                            <i className={`fa-solid fa-image text-xs ${isRef ? 'animate-pulse' : ''}`}></i>
                        </button>
                    )}

                    {/* Move Up/Down Mini Buttons */}
                    <div className="flex flex-col space-y-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onMoveLayerUp(layer.id);
                            }}
                            disabled={isTop}
                            className={`w-6 h-4 flex items-center justify-center text-[10px] rounded hover:bg-slate-700 border border-slate-700/30 ${isTop ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400'}`}
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
                            className={`w-6 h-4 flex items-center justify-center text-[10px] rounded hover:bg-slate-700 border border-slate-700/30 ${isBottom ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400'}`}
                            title={t(lang, 'moveDown')}
                        >
                            <i className="fa-solid fa-chevron-down"></i>
                        </button>
                    </div>

                    {/* Delete Action */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLayer(layer.id);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-100 hover:bg-red-500/80 rounded-lg transition-all border border-transparent hover:border-red-400/50"
                        title="Delete Layer"
                    >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </div>
           );
        })}
        
        {layers.length === 0 && (
            <div className="text-center mt-12 text-slate-500 text-sm px-6 py-10 rounded-2xl border-2 border-dashed border-slate-800">
                <i className="fa-regular fa-clone text-4xl mb-4 opacity-20 block"></i>
                <p className="font-medium">{t(lang, 'noLayers')}</p>
                <button onClick={onAddLayer} className="mt-4 text-blue-400 hover:text-blue-300 text-xs font-bold border-b border-blue-400/30 pb-0.5">{t(lang, 'importImage')}</button>
            </div>
        )}
      </div>
    </div>
  );
});

export default LayerManager;
