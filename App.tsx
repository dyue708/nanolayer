
import React, { useState, useCallback, useRef, useEffect } from 'react';
import LayerManager from './components/LayerManager';
import Workspace from './components/Workspace';
import AnalysisPanel from './components/AnalysisPanel';
import ConfigPanel from './components/ConfigPanel';
import { Layer, ToolMode, AnalysisResult, SelectionRect, ImageGenerationModel, Language, AspectRatio, ImageResolution } from './types';
import { parsePsdFile, parseImageFile, canvasToBase64, base64ToCanvas, base64ToCanvasNatural, exportToPsd } from './utils/psdHelper';
import { generateContentWithGemini, analyzeImageWithGemini } from './services/geminiService';
import { t } from './utils/i18n';

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  
  const [mode, setMode] = useState<ToolMode>(ToolMode.EDIT);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState('');
  
  // Settings / Config Panel State
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | undefined>(undefined);
  const [resolution, setResolution] = useState<ImageResolution>('1K');
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModel>('gemini-2.5-flash-image');
  const [referenceLayerId, setReferenceLayerId] = useState<string | null>(null);
  const [showRefLayerPicker, setShowRefLayerPicker] = useState(false);

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
      
      if (storedKey) {
          setApiKey(storedKey);
      } else {
          setShowSettings(true);
      }

      if (storedLang && (storedLang === 'en' || storedLang === 'zh')) {
          setLanguage(storedLang as Language);
      }
  }, []);

  const saveSettings = (newKey: string, newLang: Language) => {
      setApiKey(newKey);
      setLanguage(newLang);
      localStorage.setItem('nano_api_key', newKey);
      localStorage.setItem('nano_lang', newLang);
      setShowSettings(false);
  };
  
  const handleLogout = () => {
      if (window.confirm(t(language, 'confirmLogout'))) {
          localStorage.removeItem('nano_api_key');
          setApiKey('');
          window.location.reload();
      }
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

  const addLayerFromFile = useCallback(async (file: File) => {
      try {
          setIsProcessing(true);
          
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.src = url;
          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
          });

          const newWidth = Math.max(canvasDims.width, img.width);
          const newHeight = Math.max(canvasDims.height, img.height);
          
          if (newWidth > canvasDims.width || newHeight > canvasDims.height) {
              setCanvasDims({ width: newWidth, height: newHeight });
          }

          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(img, 0, 0);
          }
          
          const x = (newWidth - img.width) / 2;
          const y = (newHeight - img.height) / 2;

          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: file.name || "Image Layer",
              visible: true,
              opacity: 1,
              canvas: canvas,
              zIndex: layers.length,
              x: x,
              y: y
          };

          setLayers(prev => [...prev, newLayer]);
          setActiveLayerId(newLayer.id);
          setSelection(null);
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
              break; 
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
  
  const handleLayerMove = (id: string, x: number, y: number) => {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, x, y } : l));
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
      
      // If no layers left, reset dims
      if (layers.length <= 1) { // 1 because we filter after this
          setCanvasDims({ width: 0, height: 0 });
      }
  };

  const handleMoveLayerUp = (id: string) => {
    setLayers(prev => {
        const index = prev.findIndex(l => l.id === id);
        if (index === -1 || index === prev.length - 1) return prev;
        const newLayers = [...prev];
        [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
        return newLayers.map((l, i) => ({...l, zIndex: i}));
    });
  };

  const handleMoveLayerDown = (id: string) => {
    setLayers(prev => {
        const index = prev.findIndex(l => l.id === id);
        if (index === -1 || index === 0) return prev;
        const newLayers = [...prev];
        [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
        return newLayers.map((l, i) => ({...l, zIndex: i}));
    });
  };

  const applyTemplate = (templateName: string) => {
      let text = '';
      switch (templateName) {
          case 'comic': text = 'Generate a 4-panel comic strip based on the subject. Ensure consistent character details.'; break;
          case 'character': text = 'Create a character reference sheet with front, side, and back views.'; break;
          case 'cyberpunk': text = 'Apply a Cyberpunk aesthetic: Neon lights, high contrast, futuristic elements, rain.'; break;
          case 'watercolor': text = 'Apply a soft watercolor painting style with bleeding edges and pastel colors.'; break;
          case 'consistent': text = 'Maintain the character\'s appearance and original art style. Do not invent new characters. Ensure actions are logical and natural. The image should be bright, detailed, and have a rich background.'; break;
      }
      setSystemInstruction(text);
  };

  const handleGeminiAction = async () => {
    if (!prompt.trim()) return;

    if (!apiKey) {
        alert(t(language, 'apiKeyRequired'));
        setShowSettings(true);
        return;
    }

    setIsProcessing(true);
    
    try {
      let base64Img: string | null = null;
      let placeX = 0;
      let placeY = 0;
      let targetW = 0;
      let targetH = 0;
      let isCrop = false;
      const activeLayer = layers.find(l => l.id === activeLayerId);

      // Determine Base Image (if any)
      if (activeLayer) {
          placeX = activeLayer.x; 
          placeY = activeLayer.y; 
          targetW = activeLayer.canvas.width;
          targetH = activeLayer.canvas.height;

          if (selection && selection.width > 5 && selection.height > 5) {
              isCrop = true;
              const relativeX = selection.x - activeLayer.x;
              const relativeY = selection.y - activeLayer.y;
              targetW = selection.width;
              targetH = selection.height;
              placeX = selection.x;
              placeY = selection.y;

              const cropCanvas = document.createElement('canvas');
              cropCanvas.width = targetW;
              cropCanvas.height = targetH;
              const ctx = cropCanvas.getContext('2d');
              
              if (ctx) {
                 ctx.drawImage(
                     activeLayer.canvas, 
                     relativeX, relativeY, targetW, targetH, 
                     0, 0, targetW, targetH 
                 );
              }
              base64Img = canvasToBase64(cropCanvas);
          } else {
              base64Img = canvasToBase64(activeLayer.canvas);
          }
      }

      if (mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE) {
          let referenceBase64: string | undefined = undefined;
          if (referenceLayerId) {
              const refLayer = layers.find(l => l.id === referenceLayerId);
              if (refLayer) {
                  referenceBase64 = canvasToBase64(refLayer.canvas);
              }
          }

          // Call Generation/Edit Service
          // if base64Img is null, it treats it as Text-to-Image generation
          const newImageBase64 = await generateContentWithGemini(
              apiKey,
              base64Img, 
              prompt, 
              selectedModel,
              systemInstruction,
              referenceBase64,
              aspectRatio,
              resolution
          );
          
          let resultCanvas: HTMLCanvasElement;
          
          // Post-process the result
          if (aspectRatio || !activeLayer) {
             // If we generated from scratch OR changed aspect ratio, use natural size
             resultCanvas = await base64ToCanvasNatural(newImageBase64);
             
             // If this was a fresh generation (no layers), set canvas dims
             if (layers.length === 0) {
                 setCanvasDims({ width: resultCanvas.width, height: resultCanvas.height });
                 // placeX/Y default to 0
             } else if (isCrop) {
                 // Center result in crop area
                 const centerX = placeX + targetW / 2;
                 const centerY = placeY + targetH / 2;
                 placeX = centerX - resultCanvas.width / 2;
                 placeY = centerY - resultCanvas.height / 2;
             } else if (activeLayer) {
                 // Center result over previous layer
                 const centerX = placeX + activeLayer.canvas.width / 2;
                 const centerY = placeY + activeLayer.canvas.height / 2;
                 placeX = centerX - resultCanvas.width / 2;
                 placeY = centerY - resultCanvas.height / 2;
             } else {
                 // New layer on top of existing layers, center it
                 placeX = (canvasDims.width - resultCanvas.width) / 2;
                 placeY = (canvasDims.height - resultCanvas.height) / 2;
             }
          } else {
             // Edit mode without aspect change: stretch to fit target
             resultCanvas = await base64ToCanvas(newImageBase64, targetW, targetH);
          }
          
          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: activeLayer ? `Edit: ${prompt.substring(0, 15)}...` : `Gen: ${prompt.substring(0, 15)}...`,
              visible: true,
              opacity: 1,
              canvas: resultCanvas,
              zIndex: layers.length,
              x: placeX,
              y: placeY
          };
          
          setLayers(prev => [...prev, newLayer]);
          setActiveLayerId(newLayer.id);
          setPrompt('');
          if (selection) setSelection(null); 
          if (mode === ToolMode.SELECT) setMode(ToolMode.EDIT);

      } else if (mode === ToolMode.ANALYZE) {
          if (!base64Img) {
              alert("No image to analyze. Select a layer first.");
              setIsProcessing(false);
              return;
          }
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
      
      // Draw all layers flattened
      layers.forEach(layer => {
          if (layer.visible) {
            ctx.globalAlpha = layer.opacity;
            ctx.drawImage(layer.canvas, layer.x, layer.y);
          }
      });

      // Use Blob export which handles large files and proper headers better than DataURL
      exportCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `nanolayer_${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link); // Required for Firefox
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          } else {
             alert("Failed to create PNG file.");
          }
      }, 'image/png');
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

  const availableRefLayers = activeLayerId 
    ? layers.filter(l => l.id !== activeLayerId) 
    : layers;

  // Get current reference layer for thumbnail display
  const currentRefLayer = referenceLayerId ? layers.find(l => l.id === referenceLayerId) : null;

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
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".psd,.png,.jpg,.jpeg,.webp" className="hidden" />
             <input type="file" ref={addLayerInputRef} onChange={handleAddLayerUpload} accept=".png,.jpg,.jpeg,.webp" className="hidden" />

             <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2">
                <i className="fa-solid fa-folder-open"></i> {t(language, 'open')}
             </button>
             <div className="h-5 w-px bg-slate-700 mx-1"></div>
             <button onClick={exportImage} disabled={layers.length === 0} className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                <i className="fa-solid fa-file-image"></i> {t(language, 'exportPng')}
             </button>
             <button onClick={handleExportPsd} disabled={layers.length === 0} className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                <i className="fa-solid fa-file-export"></i> {t(language, 'exportPsd')}
             </button>

             <div className="h-5 w-px bg-slate-700 mx-1"></div>
             
             <button onClick={() => setShowSettings(true)} className={`px-2 py-1 transition-colors ${!apiKey ? 'text-orange-400 animate-pulse' : 'text-slate-400 hover:text-white'}`} title={t(language, 'settings')}>
                <i className="fa-solid fa-gear"></i>
             </button>
             {apiKey && (
                 <button onClick={handleLogout} className="px-2 py-1 text-slate-400 hover:text-red-400 transition-colors" title={t(language, 'logout')}>
                    <i className="fa-solid fa-right-from-bracket"></i>
                 </button>
             )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex flex-col z-10">
            <div className="w-14 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 gap-4 h-full hidden md:flex">
                 <button onClick={() => setMode(ToolMode.MOVE)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${mode === ToolMode.MOVE ? 'bg-blue-600 text-white shadow-blue-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolMove')}>
                    <i className="fa-solid fa-arrows-up-down-left-right"></i>
                 </button>
                 <div className="w-8 h-px bg-slate-700 my-1"></div>
                 <button onClick={() => setMode(ToolMode.EDIT)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${mode === ToolMode.EDIT ? 'bg-blue-600 text-white shadow-blue-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolEdit')}>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                 </button>
                 <button onClick={() => setMode(ToolMode.SELECT)} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${mode === ToolMode.SELECT ? 'bg-emerald-600 text-white shadow-emerald-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolSelect')}>
                    <i className="fa-solid fa-crop-simple"></i>
                 </button>
                 <div className="w-8 h-px bg-slate-700 my-1"></div>
                 <button onClick={() => { setMode(ToolMode.ANALYZE); setShowAnalysis(true); setShowConfigPanel(false); }} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${mode === ToolMode.ANALYZE ? 'bg-purple-600 text-white shadow-purple-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolAnalyze')}>
                    <i className="fa-solid fa-eye"></i>
                 </button>
            </div>
        </div>

        <LayerManager 
            layers={layers}
            activeLayerId={activeLayerId}
            onSelectLayer={handleLayerSelect}
            onToggleVisibility={handleToggleVisibility}
            onOpacityChange={handleOpacityChange}
            onDeleteLayer={handleDeleteLayer}
            onAddLayer={() => addLayerInputRef.current?.click()}
            onMoveLayerUp={handleMoveLayerUp}
            onMoveLayerDown={handleMoveLayerDown}
            lang={language}
        />

        <Workspace 
            width={canvasDims.width} 
            height={canvasDims.height} 
            layers={layers} 
            activeLayerId={activeLayerId}
            mode={mode}
            selection={selection}
            onSelectionChange={setSelection}
            onLayerMove={handleLayerMove}
            lang={language}
        />

        {/* Right Side Panel Area */}
        {showAnalysis ? (
             <AnalysisPanel 
                results={analysisResults} 
                isLoading={isProcessing && mode === ToolMode.ANALYZE} 
                onClose={() => { setShowAnalysis(false); setShowConfigPanel(true); }} 
                lang={language} 
            />
        ) : (
            <ConfigPanel 
                isOpen={showConfigPanel}
                onToggle={() => setShowConfigPanel(!showConfigPanel)}
                lang={language}
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                systemInstruction={systemInstruction}
                onSystemInstructionChange={setSystemInstruction}
                onApplyTemplate={applyTemplate}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                resolution={resolution}
                onResolutionChange={setResolution}
            />
        )}
        
        {/* Floating Prompt Bar (Bottom) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
            {/* Reference Layer Picker Popover */}
            {showRefLayerPicker && (
                <div className="absolute bottom-full mb-2 left-4 right-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-60">
                     <div className="p-2 border-b border-slate-800 flex justify-between items-center bg-slate-850">
                         <span className="text-xs font-bold text-slate-400 uppercase">{t(language, 'refLayerTitle')}</span>
                         <button onClick={() => setShowRefLayerPicker(false)} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                     </div>
                     <div className="overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {availableRefLayers.length === 0 ? (
                            <div className="text-center p-4 text-xs text-slate-500">{t(language, 'noRefLayers')}</div>
                        ) : (
                            availableRefLayers.map(layer => (
                                <button
                                    key={layer.id}
                                    onClick={() => {
                                        setReferenceLayerId(layer.id === referenceLayerId ? null : layer.id);
                                        setShowRefLayerPicker(false);
                                    }}
                                    className={`w-full flex items-center p-2 rounded-lg transition-colors ${referenceLayerId === layer.id ? 'bg-indigo-600/20 ring-1 ring-indigo-500' : 'hover:bg-slate-800'}`}
                                >
                                    <div className="w-8 h-8 rounded overflow-hidden border border-slate-600 bg-slate-900 shrink-0">
                                         <img src={layer.canvas.toDataURL()} className="w-full h-full object-cover" alt="" />
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
                    title={t(language, 'refLayerTitle')}
                >
                    <i className="fa-regular fa-image"></i>
                </button>
                
                {/* Input Wrapper */}
                <div className="flex-1 flex items-center gap-2 bg-slate-800/50 rounded-lg px-2 h-9 border border-transparent focus-within:border-slate-600 focus-within:bg-slate-800 transition-all">
                    {/* Reference Pill */}
                    {currentRefLayer && (
                        <div className="flex items-center gap-1 bg-indigo-900/50 text-indigo-200 text-[10px] px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0 max-w-[100px]">
                            <img src={currentRefLayer.canvas.toDataURL()} className="w-3 h-3 rounded-sm object-cover" alt="" />
                            <span className="truncate">{currentRefLayer.name}</span>
                            <button onClick={() => setReferenceLayerId(null)} className="hover:text-white ml-1"><i className="fa-solid fa-xmark"></i></button>
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
                                : mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE
                                    ? (activeLayerId 
                                        ? (referenceLayerId ? t(language, 'promptPlaceholderRef') : t(language, 'promptPlaceholderLayer'))
                                        : t(language, 'promptPlaceholderGenerate')
                                    )
                                    : t(language, 'promptPlaceholderDefault')
                        }
                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-400 h-full min-w-[50px]"
                        disabled={isProcessing}
                    />
                </div>
                
                <button
                    onClick={handleGeminiAction}
                    disabled={isProcessing || !prompt.trim()}
                    className={`h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-wide transition-all
                        ${isProcessing || !prompt.trim()
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : (mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20' 
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20')
                        }`}
                >
                    {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : t(language, 'generate')}
                </button>
            </div>
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
                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t(language, 'language')}</label>
                          <div className="flex gap-2">
                              <button onClick={() => setLanguage('en')} className={`flex-1 py-2 rounded-md text-sm border ${language === 'en' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>English</button>
                              <button onClick={() => setLanguage('zh')} className={`flex-1 py-2 rounded-md text-sm border ${language === 'zh' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>中文</button>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{t(language, 'apiKey')}</label>
                          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={t(language, 'apiKeyPlaceholder')} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                           <div className="mt-2 text-xs text-slate-500">
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                                    {t(language, 'getKeyLinkText')} <i className="fa-solid fa-up-right-from-square text-[10px]"></i>
                                </a>
                           </div>
                          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed"><i className="fa-solid fa-circle-info mr-1"></i>{t(language, 'apiKeyHelp')}</p>
                      </div>
                  </div>

                  <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                      <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors">{t(language, 'cancel')}</button>
                      <button onClick={() => saveSettings(apiKey, language)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all">{t(language, 'save')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (mode === ToolMode.EDIT || mode === ToolMode.SELECT || mode === ToolMode.MOVE) && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="relative">
                <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin ${selectedModel.includes('pro') ? 'border-purple-500/30 border-t-purple-500' : 'border-blue-500/30 border-t-blue-500'}`}></div>
                <div className={`absolute inset-0 flex items-center justify-center ${selectedModel.includes('pro') ? 'text-purple-400' : 'text-blue-400'}`}>
                    <i className="fa-solid fa-wand-magic-sparkles fa-beat"></i>
                </div>
            </div>
            <p className={`mt-4 font-medium tracking-wide ${selectedModel.includes('pro') ? 'text-purple-200' : 'text-blue-200'}`}>
                {activeLayerId 
                    ? (referenceLayerId ? t(language, 'loadingRef') : (selection ? t(language, 'loadingSelection') : `${t(language, 'loadingEdit')} ${selectedModel === 'gemini-3-pro-image-preview' ? 'Gemini 3 Pro' : 'Nano Banana'}...`))
                    : `${t(language, 'loadingGen')} ${selectedModel === 'gemini-3-pro-image-preview' ? 'Gemini 3 Pro' : 'Nano Banana'}...`
                }
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
