import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisPanelProps {
  results: AnalysisResult[];
  isLoading: boolean;
  onClose: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ results, isLoading, onClose }) => {
  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-700 flex flex-col shadow-xl absolute right-0 top-0 z-20">
      <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <i className="fa-solid fa-wand-magic-sparkles text-purple-400"></i>
            Analysis
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
         {isLoading && (
             <div className="animate-pulse space-y-3">
                 <div className="h-4 bg-slate-700 rounded w-3/4"></div>
                 <div className="h-4 bg-slate-700 rounded w-full"></div>
                 <div className="h-4 bg-slate-700 rounded w-5/6"></div>
                 <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
                     <i className="fa-solid fa-circle-notch fa-spin"></i>
                     Gemini 3 Pro is thinking...
                 </div>
             </div>
         )}

         {results.map((res, idx) => (
             <div key={idx} className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-sm text-slate-300 leading-relaxed shadow-sm">
                 <div className="mb-2 flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Gemini 3 Pro</span>
                    <span className="text-[10px] text-slate-500">{new Date(res.timestamp).toLocaleTimeString()}</span>
                 </div>
                 <p className="whitespace-pre-wrap">{res.text}</p>
             </div>
         ))}
         
         {!isLoading && results.length === 0 && (
             <div className="text-center text-slate-500 mt-10">
                 <i className="fa-solid fa-microscope text-2xl mb-2 opacity-50"></i>
                 <p>Select a layer and ask Gemini to analyze it.</p>
             </div>
         )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
