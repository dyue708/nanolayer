
import React from 'react';
import { ImageGenerationModel, Language, AspectRatio, ImageResolution, Layer } from '../types';
import { t } from '../utils/i18n';

interface ConfigPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  lang: Language;
  
  // Active Layer for Details
  activeLayer: Layer | undefined;
  onReusePrompt: (prompt: string) => void;

  // Model State
  selectedModel: ImageGenerationModel;
  onSelectModel: (model: ImageGenerationModel) => void;

  // System Prompt State
  systemInstruction: string;
  onSystemInstructionChange: (val: string) => void;
  onApplyTemplate: (template: string) => void;

  // Config State
  aspectRatio: AspectRatio | undefined;
  onAspectRatioChange: (val: AspectRatio | undefined) => void;
  resolution: ImageResolution;
  onResolutionChange: (val: ImageResolution) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = React.memo(({
  isOpen,
  onToggle,
  lang,
  activeLayer,
  onReusePrompt,
  selectedModel,
  onSelectModel,
  systemInstruction,
  onSystemInstructionChange,
  onApplyTemplate,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange
}) => {

  if (!isOpen) {
    return (
      <div className="w-10 h-full bg-slate-900 border-l border-slate-700 flex flex-col items-center py-4 shrink-0 z-20">
        <button 
          onClick={onToggle}
          className="w-8 h-8 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          title={t(lang, 'sysInstructionTitle')}
        >
          <i className="fa-solid fa-sliders"></i>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col shrink-0 transition-all duration-300 z-20 shadow-xl">
      {/* Header */}
      <div className="h-14 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-850 shrink-0">
        <h3 className="font-semibold text-slate-200 text-sm uppercase tracking-wide flex items-center gap-2">
            <i className="fa-solid fa-sliders text-blue-400"></i>
            {t(lang, 'sysInstructionTitle')}
        </h3>
        <button onClick={onToggle} className="text-slate-500 hover:text-white transition-colors">
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Layer Details / Prompt Reuse */}
        <section className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                <i className="fa-solid fa-circle-info"></i> {t(lang, 'layerDetails')}
            </label>
            {activeLayer && activeLayer.prompt ? (
                <div>
                    <div className="text-xs text-slate-400 mb-1">{t(lang, 'usedPrompt')}:</div>
                    <div className="bg-slate-900 p-2 rounded text-xs text-slate-300 italic mb-2 max-h-20 overflow-y-auto custom-scrollbar">
                        "{activeLayer.prompt}"
                    </div>
                    <button 
                        onClick={() => onReusePrompt(activeLayer.prompt!)}
                        className="w-full py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-white transition-colors flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-rotate-left"></i> {t(lang, 'reusePrompt')}
                    </button>
                    {activeLayer.cost && (
                        <div className="mt-2 text-[10px] text-slate-500 text-right">
                            Cost: ${activeLayer.cost.toFixed(4)}
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-xs text-slate-500 italic text-center py-2">
                    {t(lang, 'noPromptInfo')}
                </div>
            )}
        </section>

        <hr className="border-slate-800" />
        
        {/* Model Selector */}
        <section>
            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2">{t(lang, 'modelSelectTitle')}</label>
            <div className="space-y-2">
                <button 
                    onClick={() => onSelectModel('gemini-2.5-flash-image')}
                    className={`w-full flex items-center p-2.5 rounded-lg border transition-all text-left group ${
                        selectedModel === 'gemini-2.5-flash-image' 
                        ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/20' 
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <i className="fa-solid fa-bolt"></i>
                    </div>
                    <div>
                        <div className={`text-xs font-bold ${selectedModel === 'gemini-2.5-flash-image' ? 'text-blue-200' : 'text-slate-300'}`}>Gemini 2.5 Flash</div>
                        <div className="text-[10px] text-slate-500 group-hover:text-slate-400">Nano Banana - Fast</div>
                    </div>
                </button>

                <button 
                    onClick={() => onSelectModel('gemini-3-pro-image-preview')}
                    className={`w-full flex items-center p-2.5 rounded-lg border transition-all text-left group ${
                        selectedModel === 'gemini-3-pro-image-preview' 
                        ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500/20' 
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                >
                    <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        <i className="fa-solid fa-gem"></i>
                    </div>
                    <div>
                        <div className={`text-xs font-bold ${selectedModel === 'gemini-3-pro-image-preview' ? 'text-purple-200' : 'text-slate-300'}`}>Gemini 3.0 Pro</div>
                        <div className="text-[10px] text-slate-500 group-hover:text-slate-400">High Fidelity Image</div>
                    </div>
                </button>
            </div>
        </section>

        <hr className="border-slate-800" />

        {/* Style / System Prompt */}
        <section>
             <label className="block text-[10px] text-slate-500 uppercase font-bold mb-2 flex justify-between">
                {t(lang, 'sysInstructionTitle')}
             </label>
             
             {/* Templates */}
             <div className="flex flex-wrap gap-1.5 mb-3">
                <button onClick={() => onApplyTemplate('consistent')} className="text-[10px] bg-indigo-900/40 hover:bg-indigo-800 border border-indigo-500/30 px-2 py-1 rounded text-indigo-200 transition-colors">{t(lang, 'templateConsistent')}</button>
                <button onClick={() => onApplyTemplate('comic')} className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-300 transition-colors">{t(lang, 'templateComic')}</button>
                <button onClick={() => onApplyTemplate('character')} className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-300 transition-colors">{t(lang, 'templateCharacter')}</button>
                <button onClick={() => onApplyTemplate('cyberpunk')} className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-300 transition-colors">{t(lang, 'templateCyberpunk')}</button>
                <button onClick={() => onApplyTemplate('watercolor')} className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-1 rounded text-slate-300 transition-colors">{t(lang, 'templateWatercolor')}</button>
            </div>

             <textarea 
                value={systemInstruction}
                onChange={(e) => onSystemInstructionChange(e.target.value)}
                placeholder={t(lang, 'sysInstructionPlaceholder')}
                className="w-full bg-slate-800 border border-slate-700 rounded-md p-3 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none resize-y min-h-[80px]"
             />
        </section>

        <hr className="border-slate-800" />

        {/* Output Configuration */}
        <section>
             <label className="block text-[10px] text-slate-500 uppercase font-bold mb-3">{t(lang, 'outputConfig')}</label>
             <div className="grid grid-cols-2 gap-3">
                <div>
                    <span className="block text-[10px] text-slate-400 mb-1">{t(lang, 'aspectRatio')}</span>
                    <select 
                        value={aspectRatio || ''} 
                        onChange={(e) => onAspectRatioChange(e.target.value ? e.target.value as AspectRatio : undefined)}
                        className="w-full bg-slate-800 border border-slate-700 rounded text-xs text-white p-2 focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-750"
                    >
                        <option value="">{t(lang, 'ratioOriginal')}</option>
                        <option value="1:1">1:1 (Square)</option>
                        <option value="16:9">16:9 (Landscape)</option>
                        <option value="9:16">9:16 (Portrait)</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                    </select>
                </div>
                <div>
                    <span className="block text-[10px] text-slate-400 mb-1">{t(lang, 'resolution')}</span>
                    <select 
                        value={resolution}
                        onChange={(e) => onResolutionChange(e.target.value as ImageResolution)}
                        disabled={selectedModel !== 'gemini-3-pro-image-preview'}
                        className={`w-full bg-slate-800 border border-slate-700 rounded text-xs text-white p-2 focus:border-blue-500 outline-none ${selectedModel !== 'gemini-3-pro-image-preview' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-750'}`}
                    >
                        <option value="1K">1K (Std)</option>
                        <option value="2K">2K (Pro)</option>
                        <option value="4K">4K (Pro)</option>
                    </select>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
});

export default ConfigPanel;
