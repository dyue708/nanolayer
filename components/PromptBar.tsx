
import React, { useState, useEffect, useRef } from 'react';
import { Layer, ToolMode, Language, SelectionRect } from '../types';
import { t } from '../utils/i18n';

interface PromptBarProps {
  onGenerate: (prompt: string) => void;
  isProcessing: boolean;
  mode: ToolMode;
  activeLayerId: string | null;
  selection: SelectionRect | null;
  
  // Reference Layer Props
  referenceLayerIds: string[];
  onToggleReference: (id: string) => void;
  availableRefLayers: Layer[]; // Keep available for potential picker logic
  allLayers: Layer[]; // Needed to find reference layer objects
  
  lang: Language;
  
  // Reuse Prompt
  externalPrompt?: string;
  onOpenGallery: () => void;
}

const PromptBar: React.FC<PromptBarProps> = ({
  onGenerate,
  isProcessing,
  mode,
  activeLayerId,
  selection,
  referenceLayerIds,
  onToggleReference,
  allLayers,
  lang,
  externalPrompt,
  onOpenGallery
}) => {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external prompt when it changes (e.g. reused from history)
  useEffect(() => {
      if (externalPrompt) {
          setPrompt(externalPrompt);
      }
  }, [externalPrompt]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        // Limit max height to ~160px (approx 7-8 lines)
        textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [prompt]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt);
    setPrompt('');
    // Reset height manually after send
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  // Get selected reference layer objects
  const selectedRefLayers = allLayers.filter(l => referenceLayerIds.includes(l.id));

  return (
    <div className="absolute bottom-20 md:bottom-6 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl px-4 z-20 pointer-events-none transition-all duration-300">
        <div className="pointer-events-auto max-w-2xl mx-auto">
        
        {/* Reference Layer Stack (Visual Indicator) */}
        {selectedRefLayers.length > 0 && (
             <div className="flex items-center gap-2 mb-2 bg-slate-900/90 backdrop-blur border border-slate-700/50 p-2 rounded-lg w-fit max-w-full overflow-x-auto shadow-lg animate-fade-in-up">
                 <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0 px-1">{t(lang, 'refLayerTitle')}</span>
                 <div className="flex gap-1 shrink-0">
                     {selectedRefLayers.map(layer => (
                         <div key={layer.id} className="relative group w-8 h-8 rounded border border-indigo-500/50 overflow-hidden shrink-0">
                             <img src={layer.thumbnail || layer.canvas.toDataURL()} className="w-full h-full object-cover" alt={layer.name} />
                             <button 
                                onClick={() => onToggleReference(layer.id)}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                 <i className="fa-solid fa-xmark text-white text-xs"></i>
                             </button>
                         </div>
                     ))}
                 </div>
                 <div className="w-px h-4 bg-slate-700 mx-1"></div>
                 <div className="text-[10px] text-indigo-300 font-mono">{selectedRefLayers.length}</div>
             </div>
        )}

        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2 rounded-2xl shadow-2xl shadow-black/50 flex items-end gap-2 relative">
            {/* Mode Icon */}
            <div className={`w-8 h-8 mb-0.5 rounded-full flex items-center justify-center shrink-0 ${mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE ? 'bg-blue-600' : 'bg-purple-600'}`}>
                <i className={`fa-solid ${mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE ? 'fa-wand-magic-sparkles' : 'fa-magnifying-glass'} text-white text-xs`}></i>
            </div>
            
            {/* Gallery Button */}
            <button 
                onClick={onOpenGallery}
                className="w-8 h-8 mb-0.5 rounded-full flex items-center justify-center shrink-0 bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white transition-all border border-slate-600 hover:border-blue-500"
                title={t(lang, 'browseGallery')}
            >
                <i className="fa-solid fa-book-open text-xs"></i>
            </button>
            
            {/* Input Wrapper */}
            <div className="flex-1 flex items-start gap-2 bg-slate-800/50 rounded-xl px-3 py-2 border border-transparent focus-within:border-slate-600 focus-within:bg-slate-800 transition-all min-h-[44px]">
                <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                        selection 
                            ? t(lang, 'promptPlaceholderSelection') 
                            : mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE
                                ? (activeLayerId 
                                    ? (selectedRefLayers.length > 0 ? t(lang, 'promptPlaceholderRef') : t(lang, 'promptPlaceholderLayer'))
                                    : t(lang, 'promptPlaceholderGenerate')
                                )
                                : t(lang, 'promptPlaceholderDefault')
                    }
                    rows={1}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 min-w-[50px] resize-none overflow-y-auto custom-scrollbar leading-relaxed"
                    disabled={isProcessing}
                    style={{ height: '24px' }} // Initial height
                />
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={isProcessing || !prompt.trim()}
                className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition-all mb-0.5
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
    </div>
  );
};

export default PromptBar;
