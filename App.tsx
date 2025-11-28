
import React, { useState, useCallback, useRef, useEffect } from 'react';
import LayerManager from './components/LayerManager';
import Workspace from './components/Workspace';
import AnalysisPanel from './components/AnalysisPanel';
import { Layer, ToolMode, AnalysisResult, SelectionRect, ImageGenerationModel, Language } from './types';
import { parsePsdFile, parseImageFile, canvasToBase64, base64ToCanvas, exportToPsd } from './utils/psdHelper';
import { editImageWithGemini, analyzeImageWithGemini } from './services/geminiService';
import { t } from './utils/i18n';

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  
  const [mode, setMode] = useState<ToolMode>(ToolMode.EDIT);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  
  // Model Selection State
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModel>('gemini-2.5-flash-image');
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Reference Layer State
  const [referenceLayerId, setReferenceLayerId] = useState<string | null>(null);
  const [showRefSelector, setShowRefSelector] = useState(false);

  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // Settings: API Key & Language
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [language, setLanguage] = useState<Language>('en');

  // Load Settings from LocalStorage on mount
  useEffect(() => {
      const storedKey = localStorage.getItem('nano_api_key');
      const storedLang = localStorage.getItem('nano_lang');
      if (storedKey) setApiKey(storedKey);
      if (storedLang && (storedLang === 'en' || storedLang === 'zh')) setLanguage(storedLang as Language);
  }, []);

  const saveSettings = (newKey: string, newLang: Language) => {
      setApiKey(newKey);
      setLanguage(newLang);
      localStorage.setItem('nano_api_key', newKey);
      localStorage.setItem('nano_lang', newLang);
      setShowSettings(false);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addLayerInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      let data;
      if (file.name.toLowerCase().endsWith('.psd')) {
        data = await parsePsdFile(file);
      } else {
        data = await parseImageFile(file);
      }

      setCanvasDims({ width: data.width, height: data.height });
      setLayers(data.layers);
      if (data.layers.length > 0) {
        setActiveLayerId(data.layers[data.layers.length - 1].id); // Select top layer
      }
      setSelection(null);
    } catch (err) {
      alert("Error loading file. " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reusable function to add an image file as a layer (used by Upload and Paste)
  const addLayerFromFile = useCallback(async (file: File) => {
      // If project is empty, initialize it with this image
      if (canvasDims.width === 0 || canvasDims.height === 0) {
          try {
              setIsProcessing(true);
              const data = await parseImageFile(file);
              setCanvasDims({ width: data.width, height: data.height });
              setLayers(data.layers);
              if (data.layers.length > 0) setActiveLayerId(data.layers[0].id);
              setSelection(null);
          } catch (err) {
              alert("Error loading file: " + (err instanceof Error ? err.message : String(err)));
          } finally {
              setIsProcessing(false);
          }
          return;
      }

      // Existing project: Add as new layer
      try {
          setIsProcessing(true);
          
          // Load image
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.src = url;
          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
          });

          // Create new canvas with project dimensions
          const canvas = document.createElement('canvas');
          canvas.width = canvasDims.width;
          canvas.height = canvasDims.height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
             const scale = Math.min(
                 canvasDims.width / img.width, 
                 canvasDims.height / img.height
             );
             // Maintain original size if smaller, scale down if larger
             const finalScale = scale > 1 ? 1 : scale;
             
             const w = img.width * finalScale;
             const h = img.height * finalScale;
             const x = (canvasDims.width - w) / 2;
             const y = (canvasDims.height - h) / 2;

             ctx.drawImage(img, x, y, w, h);
          }
          
          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: file.name || "Pasted Image",
              visible: true,
              opacity: 1,
              canvas: canvas,
              zIndex: layers.length
          };

          setLayers(prev => [...prev, newLayer]);
          setActiveLayerId(newLayer.id);
          URL.revokeObjectURL(url);

      } catch (err) {
          alert("Error adding layer: " + (err instanceof Error ? err.message : String(err)));
      } finally {
          setIsProcessing(false);
      }
  }, [canvasDims, layers]);

  const handleAddLayerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          await addLayerFromFile(file);
      }
      if (addLayerInputRef.current) addLayerInputRef.current.value = '';
  };

  // Paste Event Listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              addLayerFromFile(file);
              break; // Only paste the first image found
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addLayerFromFile]);

  const handleLayerSelect = (id: string) => {
      setActiveLayerId(id);
      if (id === referenceLayerId) {
          setReferenceLayerId(null);
      }
  };

  const handleToggleVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleOpacityChange = (id: string, val: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: val } : l));
  };

  const handleDeleteLayer = (id: string) => {
      setLayers(prev => prev.filter(l => l.id !== id));
      if (activeLayerId === id) setActiveLayerId(null);
      if (referenceLayerId === id) setReferenceLayerId(null);
  }

  const handleGeminiAction = async () => {
    if (!activeLayerId || !prompt.trim()) return;

    if (!apiKey) {
        alert(t(language, 'apiKeyRequired'));
        setShowSettings(true);
        return;
    }

    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer) return;

    setIsProcessing(true);
    
    try {
      let base64Img: string;
      let targetX = 0;
      let targetY = 0;
      let targetW = canvasDims.width;
      let targetH = canvasDims.height;

      // Prepare Image Source: Selection Crop vs Full Image
      if (selection && selection.width > 5 && selection.height > 5) {
          // Crop Mode
          targetX = selection.x;
          targetY = selection.y;
          targetW = selection.width;
          targetH = selection.height;

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = targetW;
          cropCanvas.height = targetH;
          const ctx = cropCanvas.getContext('2d');
          
          if (ctx) {
             ctx.drawImage(
                 activeLayer.canvas, 
                 targetX, targetY, targetW, targetH, // Source
                 0, 0, targetW, targetH // Destination
             );
          }
          base64Img = canvasToBase64(cropCanvas);
      } else {
          // Full Image Mode
          base64Img = canvasToBase64(activeLayer.canvas);
      }

      if (mode === ToolMode.EDIT || mode === ToolMode.SELECT) {
          // Prepare Reference Image if selected
          let referenceBase64: string | undefined = undefined;
          if (referenceLayerId) {
              const refLayer = layers.find(l => l.id === referenceLayerId);
              if (refLayer) {
                  referenceBase64 = canvasToBase64(refLayer.canvas);
              }
          }

          // Gemini Image Edit with dynamic apiKey
          const newImageBase64 = await editImageWithGemini(
              apiKey,
              base64Img, 
              prompt, 
              selectedModel,
              systemInstruction,
              referenceBase64
          );
          
          // Determine where to draw result
          const resultCanvas = await base64ToCanvas(newImageBase64, targetW, targetH);
          
          const finalLayerCanvas = document.createElement('canvas');
          finalLayerCanvas.width = canvasDims.width;
          finalLayerCanvas.height = canvasDims.height;
          const ctx = finalLayerCanvas.getContext('2d');
          
          if (ctx) {
              ctx.drawImage(resultCanvas, targetX, targetY, targetW, targetH);
          }
          
          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: `Edit: ${prompt.substring(0, 15)}...`,
              visible: true,
              opacity: 1,
              canvas: finalLayerCanvas,
              zIndex: layers.length
          };
          
          setLayers(prev => [...prev, newLayer]);
          setActiveLayerId(newLayer.id);
          setPrompt('');
          // Clear selection after successful edit
          if (selection) setSelection(null); 
          if (mode === ToolMode.SELECT) setMode(ToolMode.EDIT);

      } else if (mode === ToolMode.ANALYZE) {
          // Gemini 3 Pro Analysis with dynamic apiKey
          setShowAnalysis(true);
          const text = await analyzeImageWithGemini(apiKey, base64Img, prompt);
          setAnalysisResults(prev => [{ text, timestamp: Date.now() }, ...prev]);
          setPrompt('');
      }

    } catch (err) {
        alert("Gemini Operation Failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
        setIsProcessing(false);
    }
  };

  const exportImage = () => {
      if (canvasDims.width === 0) return;
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasDims.width;
      exportCanvas.height = canvasDims.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      layers.forEach(layer => {
          if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(layer.canvas, 0, 0);
          }
      });

      const link = document.createElement('a');
      link.download = 'nanolayer_export.png';
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
  };

  const handleExportPsd = () => {
    if (layers.length === 0) return;
    try {
        exportToPsd(layers, canvasDims.width, canvasDims.height);
    } catch (e) {
        console.error("Export PSD Error:", e);
        alert("Failed to export PSD.");
    }
  };

  const activeLayerName = layers.find(l => l.id === activeLayerId)?.name;
  const referenceLayerName = layers.find(l => l.id === referenceLayerId)?.name;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center text-slate-900 font-bold shadow-lg shadow-orange-500/20">
                <i className="fa-solid fa-layer-group"></i>
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400">
                {t(language, 'appTitle')} <span className="font-light opacity-75">{t(language, 'appSubtitle')}</span>
            </h1>
        </div>

        <div className="flex items-center gap-2">
             {/* File Input for Open Project */}
             <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload} 
                accept=".psd,.png,.jpg,.jpeg,.webp" 
                className="hidden" 
             />
             
             {/* File Input for Add Layer */}
             <input 
                type="file" 
                ref={addLayerInputRef}
                onChange={handleAddLayerUpload} 
                accept=".png,.jpg,.jpeg,.webp" 
                className="hidden" 
             />

             <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2"
             >
                <i className="fa-solid fa-folder-open"></i> {t(language, 'open')}
             </button>
             
             <div className="h-5 w-px bg-slate-700 mx-1"></div>

             <button 
                onClick={exportImage}
                disabled={layers.length === 0}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
                <i className="fa-solid fa-file-image"></i> {t(language, 'exportPng')}
             </button>

             <button 
                onClick={handleExportPsd}
                disabled={layers.length === 0}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
                <i className="fa-solid fa-file-export"></i> {t(language, 'exportPsd')}
             </button>

             <div className="h-5 w-px bg-slate-700 mx-1"></div>
             
             <button 
                onClick={() => setShowSettings(true)}
                className={`px-2 py-1 transition-colors ${!apiKey ? 'text-orange-400 animate-pulse' : 'text-slate-400 hover:text-white'}`}
                title={t(language, 'settings')}
             >
                <i className="fa-solid fa-gear"></i>
             </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left: Toolbar / Layers */}
        <div className="flex flex-col z-10">
            {/* Mode Switcher Sidebar */}
            <div className="w-14 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 gap-4 h-full hidden md:flex">
                 <button 
                    onClick={() => setMode(ToolMode.EDIT)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        mode === ToolMode.EDIT ? 'bg-blue-600 text-white shadow-blue-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title={t(language, 'toolEdit')}
                 >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                 </button>
                 
                 <button 
                    onClick={() => setMode(ToolMode.SELECT)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        mode === ToolMode.SELECT ? 'bg-emerald-600 text-white shadow-emerald-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title={t(language, 'toolSelect')}
                 >
                    <i className="fa-solid fa-crop-simple"></i>
                 </button>

                 <div className="w-8 h-px bg-slate-700 my-1"></div>

                 <button 
                    onClick={() => {
                        setMode(ToolMode.ANALYZE);
                        setShowAnalysis(true);
                    }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        mode === ToolMode.ANALYZE ? 'bg-purple-600 text-white shadow-purple-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title={t(language, 'toolAnalyze')}
                 >
                    <i className="fa-solid fa-eye"></i>
                 </button>
            </div>
        </div>

        {/* Layers List */}
        <LayerManager 
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={handleLayerSelect}
            onToggleVisibility={handleToggleVisibility}
            onOpacityChange={handleOpacityChange}
            onDeleteLayer={handleDeleteLayer}
            onAddLayer={() => addLayerInputRef.current?.click()}
            lang={language}
        />

        {/* Center Canvas */}
        <Workspace 
            width={canvasDims.width} 
            height={canvasDims.height} 
            layers={layers} 
            mode={mode}
            selection={selection}
            onSelectionChange={setSelection}
            lang={language}
        />

        {/* Right Panel: Analysis (Conditional) */}
        {showAnalysis && (
            <AnalysisPanel 
                results={analysisResults} 
                isLoading={isProcessing && mode === ToolMode.ANALYZE} 
                onClose={() => setShowAnalysis(false)} 
                lang={language}
            />
        )}
        
        {/* Floating Prompt Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
            {/* System Instruction Popover */}
            {showSystemPrompt && (
                <div className="absolute bottom-14 left-0 w-full bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl mb-2 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t(language, 'sysInstructionTitle')}</span>
                        <button onClick={() => setShowSystemPrompt(false)} className="text-slate-400 hover:text-white">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <textarea 
                        value={systemInstruction}
                        onChange={(e) => setSystemInstruction(e.target.value)}
                        placeholder={t(language, 'sysInstructionPlaceholder')}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none resize-none h-20"
                    />
                </div>
            )}
            
            {/* Model Selector Popover */}
            {showModelSelector && (
                 <div className="absolute bottom-14 left-10 w-56 bg-slate-800 border border-slate-600 rounded-xl p-2 shadow-xl mb-2 z-30">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t(language, 'modelSelectTitle')}</span>
                        <button onClick={() => setShowModelSelector(false)} className="text-slate-400 hover:text-white">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="space-y-1">
                        <button 
                            onClick={() => {
                                setSelectedModel('gemini-2.5-flash-image');
                                setShowModelSelector(false);
                            }}
                            className={`w-full flex items-center p-2 rounded text-left ${selectedModel === 'gemini-2.5-flash-image' ? 'bg-blue-900/40 text-blue-200 border border-blue-500/30' : 'hover:bg-slate-700 text-slate-300'}`}
                        >
                            <i className="fa-solid fa-bolt text-yellow-400 w-6 text-center"></i>
                            <div>
                                <div className="text-xs font-bold">Gemini 2.5 Flash</div>
                                <div className="text-[10px] opacity-70">Fast & Efficient (Nano Banana)</div>
                            </div>
                        </button>

                        <button 
                            onClick={() => {
                                setSelectedModel('gemini-3-pro-image-preview');
                                setShowModelSelector(false);
                            }}
                            className={`w-full flex items-center p-2 rounded text-left ${selectedModel === 'gemini-3-pro-image-preview' ? 'bg-blue-900/40 text-blue-200 border border-blue-500/30' : 'hover:bg-slate-700 text-slate-300'}`}
                        >
                            <i className="fa-solid fa-gem text-purple-400 w-6 text-center"></i>
                             <div>
                                <div className="text-xs font-bold">Gemini 3.0 Pro</div>
                                <div className="text-[10px] opacity-70">High Fidelity (Pro Image)</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Reference Layer Selector Popover */}
            {showRefSelector && (
                <div className="absolute bottom-14 left-10 w-64 bg-slate-800 border border-slate-600 rounded-xl p-2 shadow-xl mb-2 z-30">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t(language, 'refLayerTitle')}</span>
                        <button onClick={() => setShowRefSelector(false)} className="text-slate-400 hover:text-white">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {layers.filter(l => l.id !== activeLayerId).map(layer => (
                            <button
                                key={layer.id}
                                onClick={() => {
                                    setReferenceLayerId(layer.id);
                                    setShowRefSelector(false);
                                }}
                                className="w-full flex items-center p-2 rounded hover:bg-slate-700 text-left"
                            >
                                <div className="w-6 h-6 bg-slate-900 mr-2 border border-slate-600 overflow-hidden">
                                     <img src={layer.canvas.toDataURL()} className="w-full h-full object-cover" alt="" />
                                </div>
                                <span className="text-sm text-slate-200 truncate">{layer.name}</span>
                            </button>
                        ))}
                        {layers.filter(l => l.id !== activeLayerId).length === 0 && (
                            <div className="text-xs text-slate-500 text-center py-2">{t(language, 'noRefLayers')}</div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-2 rounded-2xl shadow-2xl shadow-black/50 flex items-center gap-2 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${mode === ToolMode.EDIT || mode === ToolMode.SELECT ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    <i className={`fa-solid ${mode === ToolMode.EDIT || mode === ToolMode.SELECT ? 'fa-wand-magic-sparkles' : 'fa-magnifying-glass'} text-white text-xs`}></i>
                </div>
                
                {/* Tools Group */}
                {(mode === ToolMode.EDIT || mode === ToolMode.SELECT) && (
                    <div className="flex items-center gap-1 border-r border-slate-700 pr-2 mr-1">
                         {/* Model Toggle */}
                         <button 
                            onClick={() => {
                                setShowModelSelector(!showModelSelector);
                                setShowSystemPrompt(false);
                                setShowRefSelector(false);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedModel.includes('pro') ? 'bg-purple-900/50 text-purple-400 border border-purple-500/50' : 'hover:bg-slate-800 text-slate-400'}`}
                            title={t(language, 'modelSelectTitle')}
                        >
                            <span className="text-[10px] font-bold">{selectedModel === 'gemini-2.5-flash-image' ? '2.5' : '3.0'}</span>
                        </button>

                         {/* System Prompt Toggle */}
                        <button 
                            onClick={() => {
                                setShowSystemPrompt(!showSystemPrompt);
                                setShowRefSelector(false);
                                setShowModelSelector(false);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${systemInstruction.trim() ? 'bg-blue-900/50 text-blue-400 border border-blue-500/50' : 'hover:bg-slate-800 text-slate-400'}`}
                            title={t(language, 'sysInstructionTitle')}
                        >
                            <i className="fa-solid fa-sliders"></i>
                        </button>
                        
                         {/* Reference Layer Toggle */}
                         <button 
                            onClick={() => {
                                setShowRefSelector(!showRefSelector);
                                setShowSystemPrompt(false);
                                setShowModelSelector(false);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${referenceLayerId ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/50' : 'hover:bg-slate-800 text-slate-400'}`}
                            title={t(language, 'refLayerTitle')}
                        >
                            <i className="fa-solid fa-images"></i>
                        </button>
                    </div>
                )}
                
                {/* Reference Indicator Pill */}
                {referenceLayerId && (
                    <div className="flex items-center bg-indigo-900/40 text-indigo-300 text-xs px-2 py-1 rounded border border-indigo-500/30 whitespace-nowrap">
                        <i className="fa-solid fa-link mr-1.5 text-[10px]"></i>
                        <span className="max-w-[80px] truncate">{referenceLayerName}</span>
                        <button onClick={() => setReferenceLayerId(null)} className="ml-1.5 hover:text-white">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                )}

                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGeminiAction()}
                    placeholder={
                        selection 
                            ? t(language, 'promptPlaceholderSelection') 
                            : mode === ToolMode.EDIT || mode === ToolMode.SELECT 
                                ? (referenceLayerId ? t(language, 'promptPlaceholderRef') : t(language, 'promptPlaceholderLayer'))
                                : t(language, 'promptPlaceholderDefault')
                    }
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 h-9 min-w-[100px]"
                    disabled={isProcessing || !activeLayerId}
                />
                
                <button
                    onClick={handleGeminiAction}
                    disabled={isProcessing || !prompt.trim() || !activeLayerId}
                    className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition-all
                        ${isProcessing || !prompt.trim() || !activeLayerId 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : (mode === ToolMode.EDIT || mode === ToolMode.SELECT
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20')
                        }`}
                >
                    {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : t(language, 'generate')}
                </button>
            </div>
             {!activeLayerId && layers.length === 0 && (
                <div className="text-center mt-2 text-xs text-slate-500 font-medium">
                    {t(language, 'workspacePlaceholder')}
                </div>
            )}
        </div>

      </div>
      
      {/* Settings Modal */}
      {showSettings && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                      <h2 className="font-bold text-white flex items-center gap-2">
                          <i className="fa-solid fa-gear text-slate-400"></i> {t(language, 'settings')}
                      </h2>
                      <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                          <i className="fa-solid fa-xmark"></i>
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* Language Selection */}
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t(language, 'language')}</label>
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => setLanguage('en')}
                                  className={`flex-1 py-2 rounded-md text-sm border ${language === 'en' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                              >
                                  English
                              </button>
                              <button 
                                  onClick={() => setLanguage('zh')}
                                  className={`flex-1 py-2 rounded-md text-sm border ${language === 'zh' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                              >
                                  中文
                              </button>
                          </div>
                      </div>

                      {/* API Key Input */}
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t(language, 'apiKey')}</label>
                          <input 
                              type="password" 
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder={t(language, 'apiKeyPlaceholder')}
                              className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                          />
                          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                             <i className="fa-solid fa-circle-info mr-1"></i>
                             {t(language, 'apiKeyHelp')}
                          </p>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                      <button 
                          onClick={() => setShowSettings(false)}
                          className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                          {t(language, 'cancel')}
                      </button>
                      <button 
                          onClick={() => saveSettings(apiKey, language)}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
                      >
                          {t(language, 'save')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (mode === ToolMode.EDIT || mode === ToolMode.SELECT) && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="relative">
                <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${selectedModel.includes('pro') ? 'border-purple-500/30 border-t-purple-500' : 'border-blue-500/30 border-t-blue-500'}`}></div>
                <div className={`absolute inset-0 flex items-center justify-center ${selectedModel.includes('pro') ? 'text-purple-400' : 'text-blue-400'}`}>
                    <i className="fa-solid fa-wand-magic-sparkles fa-beat"></i>
                </div>
            </div>
            <p className={`mt-4 font-medium tracking-wide ${selectedModel.includes('pro') ? 'text-purple-200' : 'text-blue-200'}`}>
                {referenceLayerId ? t(language, 'loadingRef') : (selection ? t(language, 'loadingSelection') : `${t(language, 'loadingEdit')} ${selectedModel === 'gemini-3-pro-image-preview' ? 'Gemini 3 Pro' : 'Nano Banana'}...`)}
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
