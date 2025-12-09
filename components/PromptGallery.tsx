
import React from 'react';
import { PROMPT_EXAMPLES, PromptExample } from '../utils/promptExamples';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface PromptGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
  lang: Language;
}

const PromptGallery: React.FC<PromptGalleryProps> = ({ isOpen, onClose, onSelect, lang }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-850">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-images text-blue-400"></i> {t(lang, 'promptGalleryTitle')}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{t(lang, 'promptGallerySubtitle')}</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {PROMPT_EXAMPLES.map((example: PromptExample) => (
              <div 
                key={example.id} 
                className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all group flex flex-col"
              >
                {/* Image Aspect Ratio Container */}
                <div className="aspect-[4/5] w-full relative bg-slate-900 overflow-hidden">
                   <div className="absolute inset-0 flex items-center justify-center text-slate-700">
                      <i className="fa-solid fa-image text-3xl"></i>
                   </div>
                   <img 
                      src={example.imageSrc} 
                      alt={example.title} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-200 text-sm mb-1">
                    {lang === 'zh' && example.titleZh ? example.titleZh : example.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 flex-1">
                    {lang === 'zh' && example.descriptionZh ? example.descriptionZh : example.description}
                  </p>
                  
                  <button 
                    onClick={() => onSelect(example.prompt)}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles"></i> {t(lang, 'useThisPrompt')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PromptGallery;
