
import React, { useMemo, useRef } from 'react';
import { PROMPT_EXAMPLES, PromptExample } from '../utils/promptExamples';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface PromptGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (example: PromptExample) => void;
  lang: Language;
}

const PromptGallery: React.FC<PromptGalleryProps> = ({ isOpen, onClose, onSelect, lang }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Group examples by category
  const groupedExamples = useMemo(() => {
    const groups: Record<string, PromptExample[]> = {};
    PROMPT_EXAMPLES.forEach(example => {
      const cat = lang === 'zh' ? example.categoryZh : example.category;
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(example);
    });
    return groups;
  }, [lang]);

  const categories = Object.keys(groupedExamples);

  const scrollToCategory = (categoryName: string) => {
      const element = document.getElementById(`cat-${categoryName}`);
      if (element && scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
              top: element.offsetTop - 80, // Adjust for sticky header
              behavior: 'smooth'
          });
      }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-850 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i> {t(lang, 'promptGalleryTitle')}
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

        {/* Category Navigation Bar */}
        <div className="bg-slate-900/95 border-b border-slate-700 overflow-x-auto whitespace-nowrap p-3 custom-scrollbar shrink-0 backdrop-blur-sm z-10 shadow-md">
            <div className="flex gap-2">
                 {categories.map(cat => (
                     <button
                        key={cat}
                        onClick={() => scrollToCategory(cat)}
                        className="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 hover:border-slate-500 transition-all shadow-sm"
                     >
                         {cat}
                     </button>
                 ))}
            </div>
        </div>

        {/* Grid Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 bg-slate-950/50 custom-scrollbar scroll-smooth">
          <div className="space-y-10">
            {categories.map(category => (
                <div key={category} id={`cat-${category}`} className="scroll-mt-20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 pb-2 border-b border-slate-800">
                        <i className="fa-solid fa-layer-group text-blue-500"></i>
                        {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {groupedExamples[category].map((example: PromptExample) => (
                        <div 
                            key={example.id} 
                            className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all group flex flex-col"
                        >
                            {/* Image Aspect Ratio Container */}
                            <div className="aspect-[4/5] w-full relative bg-slate-900 overflow-hidden group-hover:brightness-110 transition-all">
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
                                
                                {/* Badge for Image Requirement */}
                                {example.requiresImage && (
                                    <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-[10px] text-white px-2 py-1 rounded-full border border-slate-700 flex items-center gap-1 shadow-sm">
                                        <i className="fa-regular fa-image text-blue-400"></i> {t(lang, 'requiresImage')}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-bold text-slate-200 text-sm mb-1 line-clamp-1" title={lang === 'zh' && example.titleZh ? example.titleZh : example.title}>
                                    {lang === 'zh' && example.titleZh ? example.titleZh : example.title}
                                </h3>
                                <p className="text-xs text-slate-400 line-clamp-2 mb-4 flex-1">
                                    {lang === 'zh' && example.descriptionZh ? example.descriptionZh : example.description}
                                </p>
                                
                                <button 
                                    onClick={() => onSelect(example)}
                                    className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg ${example.requiresImage ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'} text-white`}
                                >
                                    <i className="fa-solid fa-wand-magic-sparkles"></i> {t(lang, 'tryStyle')}
                                </button>
                            </div>
                        </div>
                        ))}
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
