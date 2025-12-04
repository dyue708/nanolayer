
import React, { useState } from 'react';
import { Layer, ToolMode, Language, SelectionRect } from '../types';
import { t } from '../utils/i18n';

interface PromptBarProps {
  onGenerate: (prompt: string) => void;
  isProcessing: boolean;
  mode: ToolMode;
  activeLayerId: string | null;
  selection: SelectionRect | null;
  
  // Reference Layer Props
  referenceLayerId: string | null;
  onSelectRefLayer: (id: string | null) => void;
  availableRefLayers: Layer[];
  currentRefLayer: Layer | undefined;
  
  lang: Language;
}

const PromptBar: React.FC<PromptBarProps> = ({
  onGenerate,
  isProcessing,
  mode,
  activeLayerId,
  selection,
  referenceLayerId,
  onSelectRefLayer,
  availableRefLayers,
  currentRefLayer,
  lang
}) => {
  const [prompt, setPrompt] = useState('');
  const [showRefLayerPicker, setShowRefLayerPicker] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt);
    setPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        {/* Reference Layer Picker Popover */}
        {showRefLayerPicker && (
            <div className="absolute bottom-full mb-2 left-4 right-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-60">
                    <div className="p-2 border-b border-slate-800 flex justify-between items-center bg-slate-850">
                        <span className="text-xs font-bold text-slate-400 uppercase">{t(lang, 'refLayerTitle')}</span>
                        <button onClick={() => setShowRefLayerPicker(false)} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {availableRefLayers.length === 0 ? (
                        <div className="text-center p-4 text-xs text-slate-500">{t(lang, 'noRefLayers')}</div>
                    ) : (
                        availableRefLayers.map(layer => (
                            <button
                                key={layer.id}
                                onClick={() => {
                                    onSelectRefLayer(layer.id === referenceLayerId ? null : layer.id);
                                    setShowRefLayerPicker(false);
                                }}
                                className={`w-full flex items-center p-2 rounded-lg transition-colors ${referenceLayerId === layer.id ? 'bg-indigo-600/20 ring-1 ring-indigo-500' : 'hover:bg-slate-800'}`}
                            >
                                <div className="w-8 h-8 rounded overflow-hidden border border-slate-600 bg-slate-900 shrink-0">
                                        <img src={layer.thumbnail || layer.canvas.toDataURL()} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className="ml-3 text-xs text-slate-200 truncate">{layer.name}</span>
                                {referenceLayerId === layer.id && <i className="fa-solid fa-check ml-auto text-indigo-400 text-xs"></i>}
                            </button>
                        ))
                    )}
                    </div>
            </div>
        )}

        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2 rounded-2xl shadow-2xl shadow-black/50 flex items-center gap-2 relative">
            {/* Mode Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE ? 'bg-blue-600' : 'bg-purple-600'}`}>
                <i className={`fa-solid ${mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE ? 'fa-wand-magic-sparkles' : 'fa-magnifying-glass'} text-white text-xs`}></i>
            </div>
            
            {/* Reference Picker Button */}
            <button 
                onClick={() => setShowRefLayerPicker(!showRefLayerPicker)}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${referenceLayerId ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                title={t(lang, 'refLayerTitle')}
            >
                <i className="fa-regular fa-image"></i>
            </button>
            
            {/* Input Wrapper */}
            <div className="flex-1 flex items-center gap-2 bg-slate-800/50 rounded-lg px-2 h-9 border border-transparent focus-within:border-slate-600 focus-within:bg-slate-800 transition-all">
                {/* Reference Pill */}
                {currentRefLayer && (
                    <div className="flex items-center gap-1 bg-indigo-900/50 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0 max-w-[100px]">
                        <img src={currentRefLayer.thumbnail || currentRefLayer.canvas.toDataURL()} className="w-3 h-3 rounded-sm object-cover" alt="" />
                        <span className="truncate">{currentRefLayer.name}</span>
                        <button onClick={() => onSelectRefLayer(null)} className="hover:text-white ml-1"><i className="fa-solid fa-xmark"></i></button>
                    </div>
                )}
                
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        selection 
                            ? t(lang, 'promptPlaceholderSelection') 
                            : mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE
                                ? (activeLayerId 
                                    ? (referenceLayerId ? t(lang, 'promptPlaceholderRef') : t(lang, 'promptPlaceholderLayer'))
                                    : t(lang, 'promptPlaceholderGenerate')
                                )
                                : t(lang, 'promptPlaceholderDefault')
                    }
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 h-full min-w-[50px]"
                    disabled={isProcessing}
                />
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={isProcessing || !prompt.trim()}
                className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition-all
                    ${isProcessing || !prompt.trim()
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : (mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20')
                    }`}
            >
                {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : t(lang, 'generate')}
            </button>
        </div>
    </div>
  );
};

export default PromptBar;
