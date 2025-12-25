
import React, { useState, useCallback, useRef, useEffect } from 'react';
import LayerManager from './components/LayerManager';
import Workspace from './components/Workspace';
import AnalysisPanel from './components/AnalysisPanel';
import ConfigPanel from './components/ConfigPanel';
import PromptBar from './components/PromptBar';
import PromptGallery from './components/PromptGallery';
import HistoryPanel from './components/HistoryPanel';
import { Layer, ToolMode, AnalysisResult, SelectionRect, ImageGenerationModel, Language, AspectRatio, ImageResolution } from './types';
import { parsePsdFile, parseImageFile, canvasToBase64, base64ToCanvas, base64ToCanvasNatural, exportToPsd, generateThumbnail } from './utils/psdHelper';
import { generateImage, analyzeImage, ImageHistoryItem } from './services/apiService';
import { t } from './utils/i18n';
import { PromptExample } from './utils/promptExamples';

type MobilePanel = 'none' | 'layers' | 'config' | 'tools';

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  
  const [mode, setMode] = useState<ToolMode>(ToolMode.EDIT);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio | undefined>(undefined);
  const [resolution, setResolution] = useState<ImageResolution>('1K');
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModel>('fal-ai/nano-banana');
  
  const [referenceLayerIds, setReferenceLayerIds] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pendingPromptRef = useRef<PromptExample | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [reusedPrompt, setReusedPrompt] = useState<string | undefined>(undefined);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('none');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addLayerInputRef = useRef<HTMLInputElement>(null);

  // Restore copy-paste support for direct image import
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    await addLayerFromFile(blob);
                }
            }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [canvasDims, layers]);

  useEffect(() => {
      const storedLang = localStorage.getItem('nano_lang');
      if (storedLang && (storedLang === 'en' || storedLang === 'zh')) setLanguage(storedLang as Language);
  }, []);

  const saveSettings = (newLang: Language) => {
      setLanguage(newLang);
      localStorage.setItem('nano_lang', newLang);
      setShowSettings(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsProcessing(true);
      let data;
      if (file.name.toLowerCase().endsWith('.psd')) data = await parsePsdFile(file);
      else data = await parseImageFile(file);
      setCanvasDims({ width: data.width, height: data.height });
      setLayers(data.layers);
      if (data.layers.length > 0) setActiveLayerId(data.layers[data.layers.length - 1].id);
      setSelection(null);
    } catch (err) {
      alert("Error loading file: " + (err instanceof Error ? err.message : String(err)));
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
          if (ctx) ctx.drawImage(img, 0, 0);

          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: file.name || "Imported Image",
              visible: true,
              opacity: 1,
              canvas: canvas,
              thumbnail: generateThumbnail(canvas),
              zIndex: layers.length,
              x: (newWidth - img.width) / 2,
              y: (newHeight - img.height) / 2
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
      if (file) await addLayerFromFile(file);
      if (addLayerInputRef.current) addLayerInputRef.current.value = '';
  };

  const handleLayerSelect = useCallback((id: string) => {
      setActiveLayerId(id);
      setReferenceLayerIds(prev => prev.filter(rid => rid !== id));
  }, []);
  
  const handleToggleReference = useCallback((id: string) => {
      setReferenceLayerIds(prev => {
          if (prev.includes(id)) return prev.filter(rid => rid !== id);
          setActiveLayerId(currentActive => currentActive === id ? null : currentActive);
          return [...prev, id];
      });
  }, []);
  
  const handleLayerMove = useCallback((id: string, x: number, y: number) => {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, x, y } : l));
  }, []);

  const handleToggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }, []);

  const handleOpacityChange = useCallback((id: string, val: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity: val } : l));
  }, []);

  const handleDeleteLayer = useCallback((id: string) => {
      setLayers(prev => {
          const newLayers = prev.filter(l => l.id !== id);
          if (newLayers.length === 0) {
              setTimeout(() => setCanvasDims({ width: 0, height: 0 }), 0);
          }
          return newLayers;
      });
      if (activeLayerId === id) setActiveLayerId(null);
      setReferenceLayerIds(prev => prev.filter(rid => rid !== id));
  }, [activeLayerId]);

  const handleMoveLayerUp = useCallback((id: string) => {
    setLayers(prev => {
        const index = prev.findIndex(l => l.id === id);
        if (index === -1 || index === prev.length - 1) return prev;
        const newLayers = [...prev];
        [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
        return newLayers.map((l, i) => ({...l, zIndex: i}));
    });
  }, []);

  const handleMoveLayerDown = useCallback((id: string) => {
    setLayers(prev => {
        const index = prev.findIndex(l => l.id === id);
        if (index === -1 || index === 0) return prev;
        const newLayers = [...prev];
        [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
        return newLayers.map((l, i) => ({...l, zIndex: i}));
    });
  }, []);

  const handleGeminiAction = async (promptText: string) => {
    if (!promptText.trim()) return;
    
    if (mode === ToolMode.ANALYZE) {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) {
            alert("Please select a layer to analyze.");
            return;
        }
        setIsProcessing(true);
        try {
            const result = await analyzeImage({
                imageBase64: canvasToBase64(activeLayer.canvas),
                prompt: promptText
            });
            setAnalysisResults(prev => [{ text: result.description, timestamp: Date.now() }, ...prev]);
        } catch (err) {
            alert("Analysis failed: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsProcessing(false);
        }
        return;
    }

    setIsProcessing(true);
    try {
      const activeLayer = layers.find(l => l.id === activeLayerId);
      let base64Img: string | undefined = undefined;
      
      // 计算选择区域的相对百分比
      let selectionPercent: { x: number; y: number; width: number; height: number } | undefined = undefined;
      if (activeLayer && selection && selection.width > 5 && selection.height > 5) {
          const relX = Math.round(((selection.x - activeLayer.x) / activeLayer.canvas.width) * 100);
          const relY = Math.round(((selection.y - activeLayer.y) / activeLayer.canvas.height) * 100);
          const relW = Math.round((selection.width / activeLayer.canvas.width) * 100);
          const relH = Math.round((selection.height / activeLayer.canvas.height) * 100);
          selectionPercent = { x: relX, y: relY, width: relW, height: relH };
      }

      // 获取参考图片
      const referenceBase64s: string[] = [];
      referenceLayerIds.forEach(id => {
          const refLayer = layers.find(l => l.id === id);
          if (refLayer) referenceBase64s.push(canvasToBase64(refLayer.canvas));
      });

      // 调用后端 API
      let result: any;
      result = await generateImage({
          prompt: promptText,
          model: selectedModel,
          imageBase64: activeLayer ? canvasToBase64(activeLayer.canvas) : undefined,
          selection: selectionPercent,
          referenceImages: referenceBase64s.length > 0 ? referenceBase64s : undefined,
          systemInstruction: systemInstruction || undefined,
          aspectRatio: aspectRatio,
          resolution: resolution
      });
      
      console.log('API response:', result);

      // 下载图片并创建 canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
          img.onload = () => {
              console.log('Image loaded successfully:', result.imageUrl);
              resolve(null);
          };
          img.onerror = (error) => {
              console.error('Image load error:', error);
              reject(new Error(`Failed to load image. This might be a CORS issue or the image URL is not accessible.`));
          };
          
          // 优先使用 base64，如果没有则使用 URL
          if (result.imageBase64) {
              console.log('Using base64 image data');
              img.src = result.imageBase64;
          } else {
              console.log('Loading image from URL:', result.imageUrl);
              img.src = result.imageUrl;
          }
      });

      let resultCanvas: HTMLCanvasElement;
      if (aspectRatio || !activeLayer) {
          resultCanvas = document.createElement('canvas');
          resultCanvas.width = result.width;
          resultCanvas.height = result.height;
          const ctx = resultCanvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0);
      } else {
          // 确保尺寸与原图层一致
          resultCanvas = document.createElement('canvas');
          resultCanvas.width = activeLayer.canvas.width;
          resultCanvas.height = activeLayer.canvas.height;
          const ctx = resultCanvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
      }

      const placeX = activeLayer ? activeLayer.x : (canvasDims.width - resultCanvas.width) / 2;
      const placeY = activeLayer ? activeLayer.y : (canvasDims.height - resultCanvas.height) / 2;

      const newLayer: Layer = {
          id: `layer-${Date.now()}`,
          name: activeLayer ? `${t(language, 'toolEdit')}: ${promptText.substring(0, 15)}...` : `${t(language, 'generate')}: ${promptText.substring(0, 15)}...`,
          visible: true,
          opacity: 1,
          canvas: resultCanvas,
          thumbnail: generateThumbnail(resultCanvas),
          zIndex: layers.length,
          x: placeX,
          y: placeY,
          cost: result.cost,
          prompt: promptText
      };
      
      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newLayer.id);
      setSelection(null);
      if (mode === ToolMode.SELECT) setMode(ToolMode.EDIT);

    } catch (err) {
        console.error('Generation error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        alert("Operation Failed: " + errorMessage);
        // 如果图片加载失败，尝试使用备用方法
        if (errorMessage.includes('Failed to load image') && result) {
            console.warn('Image load failed, this might be a CORS issue. Please check the image URL:', result.imageUrl);
        }
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleReusePrompt = useCallback((promptToReuse: string) => {
      setReusedPrompt(promptToReuse);
      setTimeout(() => setReusedPrompt(undefined), 100);
  }, []);

  const handleSelectFromHistory = useCallback(async (image: ImageHistoryItem) => {
      try {
          setIsProcessing(true);
          
          // 同时重新使用提示词
          setReusedPrompt(image.prompt);
          setTimeout(() => setReusedPrompt(undefined), 100);
          
          // 加载图片
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
              img.onload = () => {
                  console.log('History image loaded successfully', {
                      width: img.width,
                      height: img.height,
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight
                  });
                  resolve(null);
              };
              img.onerror = (error) => {
                  console.error('History image load error:', error);
                  reject(new Error(`Failed to load image from history`));
              };
              
              // 使用代理 URL 加载图片
              console.log('Loading history image from:', image.image_url);
              img.src = image.image_url;
          });

          // 确保图片已完全加载（等待自然尺寸可用）
          if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
              // 如果图片还没完全加载，再等待一下
              await new Promise(resolve => setTimeout(resolve, 100));
              if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                  throw new Error(`Image not fully loaded: complete=${img.complete}, naturalWidth=${img.naturalWidth}, naturalHeight=${img.naturalHeight}`);
              }
          }

          // 创建 canvas - 使用图片的实际尺寸
          const resultCanvas = document.createElement('canvas');
          // 优先使用 metadata 中的尺寸，否则使用图片的自然尺寸
          const canvasWidth = image.metadata?.width || img.naturalWidth || img.width;
          const canvasHeight = image.metadata?.height || img.naturalHeight || img.height;
          
          if (canvasWidth === 0 || canvasHeight === 0) {
              throw new Error(`Invalid image dimensions: ${canvasWidth}x${canvasHeight}`);
          }
          
          resultCanvas.width = canvasWidth;
          resultCanvas.height = canvasHeight;
          
          const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
              throw new Error('Failed to get canvas context');
          }
          
          // 清除 canvas（确保干净）
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          
          // 绘制图片到 canvas - 使用图片的自然尺寸确保完整绘制
          ctx.drawImage(img, 0, 0, img.naturalWidth || canvasWidth, img.naturalHeight || canvasHeight);
          
          // 验证 canvas 是否有内容
          const imageData = ctx.getImageData(0, 0, Math.min(10, canvasWidth), Math.min(10, canvasHeight));
          const hasContent = imageData.data.some(pixel => pixel !== 0);
          
          if (!hasContent) {
              console.warn('Canvas appears to be empty after drawing image, retrying...');
              // 尝试重新绘制（不使用尺寸参数）
              ctx.clearRect(0, 0, canvasWidth, canvasHeight);
              ctx.drawImage(img, 0, 0);
          }
          
          console.log('Canvas created:', {
              canvasWidth,
              canvasHeight,
              imgNaturalSize: `${img.naturalWidth}x${img.naturalHeight}`,
              imgSize: `${img.width}x${img.height}`,
              hasContent,
              canvasToDataURL: resultCanvas.toDataURL().substring(0, 100) + '...'
          });

          // 如果画布尺寸为 0，设置为图片尺寸
          if (canvasDims.width === 0 || canvasDims.height === 0) {
              setCanvasDims({ width: canvasWidth, height: canvasHeight });
              console.log('Canvas dimensions set to image size:', { width: canvasWidth, height: canvasHeight });
          } else {
              // 如果画布已有尺寸，确保画布足够大以容纳图片
              const newWidth = Math.max(canvasDims.width, canvasWidth);
              const newHeight = Math.max(canvasDims.height, canvasHeight);
              if (newWidth > canvasDims.width || newHeight > canvasDims.height) {
                  setCanvasDims({ width: newWidth, height: newHeight });
                  console.log('Canvas dimensions expanded:', { width: newWidth, height: newHeight });
              }
          }

          // 计算位置（使用当前或新的画布尺寸）
          const currentCanvasWidth = canvasDims.width || canvasWidth;
          const currentCanvasHeight = canvasDims.height || canvasHeight;
          const placeX = Math.max(0, (currentCanvasWidth - resultCanvas.width) / 2);
          const placeY = Math.max(0, (currentCanvasHeight - resultCanvas.height) / 2);

          // 创建新图层
          const newLayer: Layer = {
              id: `layer-${Date.now()}`,
              name: `History: ${image.prompt.substring(0, 15)}...`,
              visible: true,
              opacity: 1,
              canvas: resultCanvas,
              thumbnail: generateThumbnail(resultCanvas),
              zIndex: layers.length,
              x: placeX,
              y: placeY,
              cost: image.cost,
              prompt: image.prompt
          };
          
          console.log('Adding layer:', {
              id: newLayer.id,
              position: { x: placeX, y: placeY },
              size: { width: canvasWidth, height: canvasHeight },
              canvasDims: { width: currentCanvasWidth, height: currentCanvasHeight }
          });
          
          setLayers(prev => {
              const newLayers = [...prev, newLayer];
              console.log('Total layers:', newLayers.length);
              return newLayers;
          });
          setActiveLayerId(newLayer.id);
          setSelection(null);
          if (mode === ToolMode.SELECT) setMode(ToolMode.EDIT);
          setShowHistory(false);
          
          console.log('History image loaded to canvas successfully');
      } catch (err) {
          console.error('Error loading history image:', err);
          alert("Failed to load image from history: " + (err instanceof Error ? err.message : String(err)));
      } finally {
          setIsProcessing(false);
      }
  }, [layers, canvasDims]);

  const handleSelectFromGallery = useCallback((example: PromptExample) => {
      if (example.requiresImage && layers.length === 0) {
          alert(t(language, 'uploadImageFirst'));
          pendingPromptRef.current = example;
          fileInputRef.current?.click();
          setShowGallery(false);
          return;
      }
      setSystemInstruction('');
      const textToUse = (language === 'zh' && example.promptZh) ? example.promptZh : example.prompt;
      setShowGallery(false);
      handleReusePrompt(textToUse);
  }, [layers, language, handleReusePrompt]);

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
            ctx.drawImage(layer.canvas, layer.x, layer.y);
          }
      });
      exportCanvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `nanolayer_${Date.now()}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
      }, 'image/png');
  };

  const activeLayer = activeLayerId ? layers.find(l => l.id === activeLayerId) : undefined;
  const totalCost = layers.reduce((acc, layer) => acc + (layer.cost || 0), 0);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 font-sans selection:bg-blue-500 selection:text-white overflow-hidden">
      <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 z-20 relative">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">
                <i className="fa-solid fa-layer-group"></i>
            </div>
            <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block uppercase tracking-tight">
                {t(language, 'appTitle')} <span className="font-light opacity-50">{t(language, 'appSubtitle')}</span>
            </h1>
        </div>
        <div className="flex items-center gap-2">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".psd,.png,.jpg,.jpeg,.webp" className="hidden" />
             <input type="file" ref={addLayerInputRef} onChange={handleAddLayerUpload} accept=".png,.jpg,.jpeg,.webp" className="hidden" />
             <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-2">
                <i className="fa-solid fa-folder-open text-blue-400"></i> <span className="hidden sm:inline uppercase">{t(language, 'open')}</span>
             </button>
             <div className="hidden md:flex gap-2">
                <button onClick={exportImage} disabled={layers.length === 0} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-30">
                    <i className="fa-solid fa-file-image text-emerald-400"></i> <span className="uppercase">{t(language, 'exportPng')}</span>
                </button>
                <button onClick={() => exportToPsd(layers, canvasDims.width, canvasDims.height)} disabled={layers.length === 0} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-30">
                    <i className="fa-solid fa-file-export text-indigo-400"></i> <span className="uppercase">{t(language, 'exportPsd')}</span>
                </button>
             </div>
             <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block"></div>
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800" title={t(language, 'totalCost')}>
                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t(language, 'totalCost')}</div>
                <div className="text-sm font-mono text-emerald-400 font-bold">${totalCost.toFixed(4)}</div>
             </div>
             <button onClick={() => setShowHistory(true)} className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-blue-400"></i> <span className="hidden sm:inline uppercase">{t(language, 'history') || 'History'}</span>
             </button>
             <button onClick={() => setShowSettings(true)} className="p-2 transition-all rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <i className="fa-solid fa-gear"></i>
             </button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex flex-col z-10 hidden md:flex">
            <div className="w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-6 gap-5 h-full">
                 <button onClick={() => setMode(ToolMode.MOVE)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${mode === ToolMode.MOVE ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolMove')}>
                    <i className="fa-solid fa-arrows-up-down-left-right"></i>
                 </button>
                 <div className="w-8 h-px bg-slate-800"></div>
                 <button onClick={() => setMode(ToolMode.EDIT)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${mode === ToolMode.EDIT ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolEdit')}>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                 </button>
                 <button onClick={() => setMode(ToolMode.SELECT)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${mode === ToolMode.SELECT ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolSelect')}>
                    <i className="fa-solid fa-crop-simple"></i>
                 </button>
                 <div className="w-8 h-px bg-slate-800"></div>
                 <button onClick={() => { setMode(ToolMode.ANALYZE); setShowAnalysis(true); }} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${mode === ToolMode.ANALYZE ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolAnalyze')}>
                    <i className="fa-solid fa-eye"></i>
                 </button>
            </div>
        </div>
        <div className={`${mobilePanel === 'layers' ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col' : 'hidden'} md:relative md:flex md:z-0 md:bg-transparent md:inset-auto md:w-auto`}>
             <LayerManager 
                layers={layers}
                activeLayerId={activeLayerId}
                referenceLayerIds={referenceLayerIds}
                onSelectLayer={handleLayerSelect}
                onToggleReference={handleToggleReference}
                onToggleVisibility={handleToggleVisibility}
                onOpacityChange={handleOpacityChange}
                onDeleteLayer={handleDeleteLayer}
                onAddLayer={() => addLayerInputRef.current?.click()}
                onMoveLayerUp={handleMoveLayerUp}
                onMoveLayerDown={handleMoveLayerDown}
                lang={language}
                onClose={() => setMobilePanel('none')}
            />
        </div>
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
            onOpenGallery={() => setShowGallery(true)}
        />
        <div className={`${mobilePanel === 'config' ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col' : 'hidden'} md:relative md:flex md:z-0 pointer-events-none md:pointer-events-auto md:bg-transparent md:inset-auto`}>
            <div className="pointer-events-auto h-full relative z-10 w-full md:w-auto">
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
                        activeLayer={activeLayer}
                        onReusePrompt={handleReusePrompt}
                        selectedModel={selectedModel}
                        onSelectModel={setSelectedModel}
                        systemInstruction={systemInstruction}
                        onSystemInstructionChange={setSystemInstruction}
                        onApplyTemplate={(t) => setSystemInstruction(t)}
                        onOpenGallery={() => setShowGallery(true)}
                        aspectRatio={aspectRatio}
                        onAspectRatioChange={setAspectRatio}
                        resolution={resolution}
                        onResolutionChange={setResolution}
                    />
                )}
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
            <PromptBar 
                onGenerate={handleGeminiAction}
                isProcessing={isProcessing}
                mode={mode}
                activeLayerId={activeLayerId}
                selection={selection}
                referenceLayerIds={referenceLayerIds}
                onToggleReference={handleToggleReference}
                availableRefLayers={activeLayerId ? layers.filter(l => l.id !== activeLayerId) : layers}
                allLayers={layers}
                lang={language}
                externalPrompt={reusedPrompt}
                onOpenGallery={() => setShowGallery(true)}
            />
        </div>
      </div>
      {showSettings && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                      <h2 className="font-black text-white uppercase tracking-widest text-sm">{t(language, 'settings')}</h2>
                      <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                  </div>
                  <div className="p-6 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">{t(language, 'language')}</label>
                          <div className="flex gap-2">
                              <button onClick={() => setLanguage('en')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${language === 'en' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}>ENGLISH</button>
                              <button onClick={() => setLanguage('zh')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${language === 'zh' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'}`}>中文</button>
                          </div>
                      </div>
                  </div>
                  <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
                      <button onClick={() => setShowSettings(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 uppercase tracking-widest">{t(language, 'cancel')}</button>
                      <button onClick={() => saveSettings(language)} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-600/20 uppercase tracking-widest">{t(language, 'save')}</button>
                  </div>
              </div>
          </div>
      )}
      <PromptGallery isOpen={showGallery} onClose={() => setShowGallery(false)} onSelect={handleSelectFromGallery} lang={language} />
      <HistoryPanel 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        lang={language}
        onSelectImage={handleSelectFromHistory}
        onReusePrompt={handleReusePrompt}
      />
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center">
            <div className="relative">
                <div className={`w-20 h-20 border-4 border-t-transparent rounded-full animate-spin ${selectedModel.includes('pro') ? 'border-purple-500/20 border-t-purple-500' : 'border-blue-500/20 border-t-blue-500'}`}></div>
                <div className={`absolute inset-0 flex items-center justify-center text-2xl ${selectedModel.includes('pro') ? 'text-purple-400' : 'text-blue-400'}`}>
                    <i className="fa-solid fa-wand-magic-sparkles fa-beat"></i>
                </div>
            </div>
            <p className="mt-8 font-black uppercase tracking-[0.2em] text-sm text-slate-300 animate-pulse">
                {t(language, 'thinking')}
            </p>
        </div>
      )}
    </div>
  );
};

export default App;
