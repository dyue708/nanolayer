import React, { useState, useCallback, useRef } from 'react';
import LayerManager from './components/LayerManager';
import Workspace from './components/Workspace';
import AnalysisPanel from './components/AnalysisPanel';
import { Layer, ToolMode, AnalysisResult, SelectionRect } from './types';
import { parsePsdFile, parseImageFile, canvasToBase64, base64ToCanvas, exportToPsd } from './utils/psdHelper';
import { editImageWithGemini, analyzeImageWithGemini } from './services/geminiService';

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
  
  // Reference Layer State
  const [referenceLayerId, setReferenceLayerId] = useState<string | null>(null);
  const [showRefSelector, setShowRefSelector] = useState(false);

  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
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

  const handleAddLayerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // If project is empty, treat as initial import
      if (canvasDims.width === 0 || canvasDims.height === 0) {
          handleFileUpload(event);
          return;
      }

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
             // Calculate scale to fit (contain) within canvas if larger, or just center if smaller?
             // Let's implement "Contain" logic to ensure it fits nicely.
             const scale = Math.min(
                 canvasDims.width / img.width, 
                 canvasDims.height / img.height
             );
             // If image is smaller than canvas, don't upscale it (optional, but usually better quality)
             const finalScale = scale > 1 ? 1 : scale;
             
             const w = img.width * finalScale;
             const h = img.height * finalScale;
             const x = (canvasDims.width - w) / 2;
             const y = (canvasDims.height - h) / 2;

             ctx.drawImage(img, x, y, w, h);
          }
          
          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: file.name,
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
          if (addLayerInputRef.current) addLayerInputRef.current.value = '';
      }
  };

  const handleLayerSelect = (id: string) => {
      setActiveLayerId(id);
      // If we select the reference layer as active, clear the reference to avoid self-reference
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

          // Gemini 2.5 Flash Image Edit
          const newImageBase64 = await editImageWithGemini(
              base64Img, 
              prompt, 
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
              // Draw result at the correct position (offset by selection if applicable)
              ctx.drawImage(resultCanvas, targetX, targetY, targetW, targetH);
          }
          
          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: `Edit: ${prompt.substring(0, 15)}... ${selection ? '(Region)' : ''}`,
              visible: true,
              opacity: 1,
              canvas: finalLayerCanvas,
              zIndex: layers.length // Top
          };
          
          setLayers(prev => [...prev, newLayer]);
          setActiveLayerId(newLayer.id);
          setPrompt('');
          // Clear selection after successful edit
          if (selection) setSelection(null); 
          if (mode === ToolMode.SELECT) setMode(ToolMode.EDIT);

      } else if (mode === ToolMode.ANALYZE) {
          // Gemini 3 Pro Analysis
          setShowAnalysis(true);
          const text = await analyzeImageWithGemini(base64Img, prompt);
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
                NanoLayer <span className="font-light opacity-75">Studio</span>
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
                title="Open new project (clears current workspace)"
             >
                <i className="fa-solid fa-folder-open"></i> Open
             </button>
             
             <div className="h-5 w-px bg-slate-700 mx-1"></div>

             <button 
                onClick={exportImage}
                disabled={layers.length === 0}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
                <i className="fa-solid fa-file-image"></i> Export PNG
             </button>

             <button 
                onClick={handleExportPsd}
                disabled={layers.length === 0}
                className="bg-slate-800 hover:bg-slate-700 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 transition-colors flex items-center gap-2 disabled:opacity-50"
             >
                <i className="fa-solid fa-file-export"></i> Export PSD
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
                    title="Generative Edit (Nano Banana)"
                 >
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                 </button>
                 
                 <button 
                    onClick={() => setMode(ToolMode.SELECT)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        mode === ToolMode.SELECT ? 'bg-emerald-600 text-white shadow-emerald-500/30 shadow-lg' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    title="Select Region"
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
                    title="Analyze (Gemini 3 Pro)"
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
        />

        {/* Center Canvas */}
        <Workspace 
            width={canvasDims.width} 
            height={canvasDims.height} 
            layers={layers} 
            mode={mode}
            selection={selection}
            onSelectionChange={setSelection}
        />

        {/* Right Panel: Analysis (Conditional) */}
        {showAnalysis && (
            <AnalysisPanel 
                results={analysisResults} 
                isLoading={isProcessing && mode === ToolMode.ANALYZE} 
                onClose={() => setShowAnalysis(false)} 
            />
        )}
        
        {/* Floating Prompt Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
            {/* System Instruction Popover */}
            {showSystemPrompt && (
                <div className="absolute bottom-14 left-0 w-full bg-slate-800 border border-slate-600 rounded-xl p-3 shadow-xl mb-2 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Instruction (Style Guide)</span>
                        <button onClick={() => setShowSystemPrompt(false)} className="text-slate-400 hover:text-white">
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    <textarea 
                        value={systemInstruction}
                        onChange={(e) => setSystemInstruction(e.target.value)}
                        placeholder="e.g., 'Use a watercolor style', 'Keep it photorealistic', 'Cyberpunk neon aesthetics'..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 outline-none resize-none h-20"
                    />
                </div>
            )}
            
            {/* Reference Layer Selector Popover */}
            {showRefSelector && (
                <div className="absolute bottom-14 left-10 w-64 bg-slate-800 border border-slate-600 rounded-xl p-2 shadow-xl mb-2 z-30">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Style Reference</span>
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
                            <div className="text-xs text-slate-500 text-center py-2">No other layers available.</div>
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
                         {/* System Prompt Toggle */}
                        <button 
                            onClick={() => {
                                setShowSystemPrompt(!showSystemPrompt);
                                setShowRefSelector(false);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${systemInstruction.trim() ? 'bg-blue-900/50 text-blue-400 border border-blue-500/50' : 'hover:bg-slate-800 text-slate-400'}`}
                            title="Set System Instructions"
                        >
                            <i className="fa-solid fa-sliders"></i>
                        </button>
                        
                         {/* Reference Layer Toggle */}
                         <button 
                            onClick={() => {
                                setShowRefSelector(!showRefSelector);
                                setShowSystemPrompt(false);
                            }}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${referenceLayerId ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/50' : 'hover:bg-slate-800 text-slate-400'}`}
                            title="Add Reference Layer"
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
                            ? "Describe how to edit the SELECTED region..." 
                            : mode === ToolMode.EDIT || mode === ToolMode.SELECT 
                                ? (referenceLayerId ? "Describe how to merge/style these images..." : "Describe how to edit this layer...") 
                                : "Ask Gemini about this image..."
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
                    {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Generate'}
                </button>
            </div>
             {!activeLayerId && layers.length === 0 && (
                <div className="text-center mt-2 text-xs text-slate-500 font-medium">
                    Import a file to start editing
                </div>
            )}
        </div>

      </div>
      
      {/* Loading Overlay */}
      {isProcessing && (mode === ToolMode.EDIT || mode === ToolMode.SELECT) && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-400">
                    <i className="fa-solid fa-wand-magic-sparkles fa-beat"></i>
                </div>
            </div>
            <p className="mt-4 text-blue-200 font-medium tracking-wide">
                {referenceLayerId ? 'Merging style from reference...' : (selection ? 'Gemini is editing the selection...' : 'Gemini 2.5 Flash is editing...')}
            </p>
        </div>
      )}
    </div>
  );
};

export default App;