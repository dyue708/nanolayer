
import React, { useState, useCallback, useRef, useEffect } from 'react';
import LayerManager from './components/LayerManager';
import Workspace from './components/Workspace';
import WorkspaceViewSwitcher from './components/WorkspaceViewSwitcher';
import AnalysisPanel from './components/AnalysisPanel';
import ConfigPanel from './components/ConfigPanel';
import PromptBar from './components/PromptBar';
import HistoryPanel from './components/HistoryPanel';
import {
  Layer,
  ToolMode,
  AnalysisResult,
  SelectionRect,
  ImageGenerationModel,
  AISource,
  Language,
  VERTEX_SUPPORTED_MODELS,
  readStoredAiSource,
  persistAiSource,
  LAYER_DRAG_MIME,
  WorkspaceViewMode,
} from './types';
import { aspectRatioFromDimensions } from './utils/aspectRatio';
import { parsePsdFile, parseImageFile, canvasToBase64, base64ToCanvas, base64ToCanvasNatural, exportToPsd, generateThumbnail, buildPaddedEditSource, mapSelectionToPaddedImagePercent } from './utils/psdHelper';
import {
  generateImage,
  analyzeImage,
  ImageHistoryItem,
  clearFeishuAccessToken,
  getStoredAppSessionToken,
} from './services/apiService';
import { t } from './utils/i18n';
type MobilePanel = 'none' | 'layers' | 'config' | 'tools';

const USAGE_GUIDE_URL = 'https://xingye.feishu.cn/wiki/J9ykw7jwGirdZckYhjicIC3jnCd';

function isPsdFile(f: File): boolean {
  const n = f.name.toLowerCase();
  return (
    n.endsWith('.psd') ||
    f.type === 'image/vnd.adobe.photoshop' ||
    f.type === 'application/x-photoshop'
  );
}

function isRasterImageFile(f: File): boolean {
  if (isPsdFile(f)) return false;
  return (
    f.type.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp)$/i.test(f.name)
  );
}

function isImportableLayerFile(f: File): boolean {
  return isPsdFile(f) || isRasterImageFile(f);
}

const App: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });
  
  const [mode, setMode] = useState<ToolMode>(ToolMode.EDIT);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceViewMode>('canvas');
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showConfigPanel, setShowConfigPanel] = useState(true);
  const [systemInstruction, setSystemInstruction] = useState('');
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModel>('fal-ai/nano-banana');
  const [aiSource, setAiSource] = useState<AISource>(readStoredAiSource);

  const handleAiSourceChange = useCallback((source: AISource) => {
    setAiSource(source);
    persistAiSource(source);
    if (source === 'vertex') {
      setSelectedModel((current) =>
        VERTEX_SUPPORTED_MODELS.includes(current) ? current : 'fal-ai/nano-banana'
      );
    }
  }, []);
  
  const [referenceLayerIds, setReferenceLayerIds] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [reusedPrompt, setReusedPrompt] = useState<string | undefined>(undefined);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('none');
  const [fileDropHover, setFileDropHover] = useState(false);

  /** 编辑模式下发给模型的画布尺寸（≥当前图层像素；默认随选中图层重置） */
  const [editOutputWidth, setEditOutputWidth] = useState(1024);
  const [editOutputHeight, setEditOutputHeight] = useState(1024);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addLayerInputRef = useRef<HTMLInputElement>(null);
  const canvasDimsRef = useRef(canvasDims);
  useEffect(() => {
    canvasDimsRef.current = canvasDims;
  }, [canvasDims]);

  const addLayersFromFiles = useCallback(
    async (files: File[], opts?: { manageProcessing?: boolean }) => {
    const manage = opts?.manageProcessing !== false;
    const imageFiles = files.filter((f) => isRasterImageFile(f));
    if (imageFiles.length === 0) return;

    const entries: { file: File; img: HTMLImageElement; url: string }[] = [];
    try {
      if (manage) setIsProcessing(true);
      for (const file of imageFiles) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error(`Failed to load: ${file.name}`));
        });
        entries.push({ file, img, url });
      }

      const start = canvasDimsRef.current;
      let finalW = start.width;
      let finalH = start.height;
      for (const { img } of entries) {
        finalW = Math.max(finalW, img.width);
        finalH = Math.max(finalH, img.height);
      }
      canvasDimsRef.current = { width: finalW, height: finalH };
      setCanvasDims({ width: finalW, height: finalH });

      const appendLayers: Layer[] = entries.map(({ file, img }) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
        return {
          id: `layer-${crypto.randomUUID()}`,
          name: file.name || 'Imported Image',
          visible: true,
          opacity: 1,
          canvas,
          thumbnail: generateThumbnail(canvas),
          zIndex: 0,
          x: (finalW - img.width) / 2,
          y: (finalH - img.height) / 2,
        };
      });

      const topId = appendLayers[appendLayers.length - 1].id;
      setLayers((prev) => {
        const zBase =
          prev.reduce((m, l) => Math.max(m, l.zIndex), -1) + 1;
        const withZ = appendLayers.map((l, i) => ({ ...l, zIndex: zBase + i }));
        return [...prev, ...withZ];
      });
      setActiveLayerId(topId);
      setSelection(null);
    } catch (err) {
      alert(
        'Error adding layer: ' +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      for (const { url } of entries) {
        URL.revokeObjectURL(url);
      }
      if (manage) setIsProcessing(false);
    }
  }, []);

  /** 将 PSD 文档以「整体居中叠在当前画布上」的方式追加图层，保持 PSD 内部图层相对位置；
   *  画布尺寸取 max(原, PSD)，与普通图片追加行为保持一致。 */
  const appendPsdFromFile = useCallback(async (file: File) => {
    const data = await parsePsdFile(file);
    const cur = canvasDimsRef.current;
    const newW = Math.max(cur.width, data.width);
    const newH = Math.max(cur.height, data.height);
    const offsetX = Math.floor((newW - data.width) / 2);
    const offsetY = Math.floor((newH - data.height) / 2);

    const remapped: Layer[] = data.layers.map((l) => ({
      ...l,
      id: `layer-${crypto.randomUUID()}`,
      x: l.x + offsetX,
      y: l.y + offsetY,
    }));

    canvasDimsRef.current = { width: newW, height: newH };
    setCanvasDims({ width: newW, height: newH });

    const topId = remapped[remapped.length - 1]?.id;
    setLayers((prev) => {
      const zBase = prev.reduce((m, l) => Math.max(m, l.zIndex), -1) + 1;
      const withZ = remapped.map((layer, i) => ({ ...layer, zIndex: zBase + i }));
      return [...prev, ...withZ];
    });
    if (topId) setActiveLayerId(topId);
    setSelection(null);
  }, []);

  /** 按选择顺序追加：PSD 整份追加，连续栅格图一批居中加入 */
  const appendFilesInOrder = useCallback(
    async (files: File[], opts?: { manageProcessing?: boolean }) => {
      const manage = opts?.manageProcessing !== false;
      if (manage) setIsProcessing(true);
      try {
        let i = 0;
        while (i < files.length) {
          const f = files[i];
          if (isPsdFile(f)) {
            await appendPsdFromFile(f);
            i++;
          } else if (isRasterImageFile(f)) {
            const batch: File[] = [];
            while (i < files.length && isRasterImageFile(files[i])) {
              batch.push(files[i]);
              i++;
            }
            if (batch.length > 0) {
              await addLayersFromFiles(batch, { manageProcessing: false });
            }
          } else {
            i++;
          }
        }
      } catch (err) {
        alert(
          'Error importing files: ' +
            (err instanceof Error ? err.message : String(err))
        );
      } finally {
        if (manage) setIsProcessing(false);
      }
    },
    [addLayersFromFiles, appendPsdFromFile]
  );

  const isExternalFileDrag = useCallback((e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return types.includes('Files') && !types.includes(LAYER_DRAG_MIME);
  }, []);

  const handleMainDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      setFileDropHover(true);
    },
    [isExternalFileDrag]
  );

  const handleMainDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    [isExternalFileDrag]
  );

  const handleMainDragLeave = useCallback((e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && e.currentTarget.contains(next)) return;
    setFileDropHover(false);
  }, []);

  const handleMainDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setFileDropHover(false);
      if (Array.from(e.dataTransfer.types).includes(LAYER_DRAG_MIME)) return;
      const raw = Array.from(e.dataTransfer.files);
      const list = raw.filter(isImportableLayerFile);
      if (list.length === 0) {
        if (raw.length > 0) {
          alert(t(language, 'dropFilesUnsupported'));
        }
        return;
      }
      await appendFilesInOrder(list);
    },
    [appendFilesInOrder, language]
  );

  // Restore copy-paste support for direct image import
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const pasted: File[] = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const blob = items[i].getAsFile();
                if (blob) pasted.push(blob);
            }
        }
        if (pasted.length > 0) await addLayersFromFiles(pasted);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addLayersFromFiles]);

  useEffect(() => {
      const storedLang = localStorage.getItem('nano_lang');
      if (storedLang && (storedLang === 'en' || storedLang === 'zh')) setLanguage(storedLang as Language);
  }, []);

  /** 切换选中图层时，编辑输出尺寸默认与图层像素一致 */
  useEffect(() => {
      if (!activeLayerId) return;
      const L = layers.find((l) => l.id === activeLayerId);
      if (!L) return;
      setEditOutputWidth(L.canvas.width);
      setEditOutputHeight(L.canvas.height);
  }, [activeLayerId]);

  const handleEditOutputWidthChange = useCallback(
      (w: number) => {
          const L = layers.find((l) => l.id === activeLayerId);
          if (!L) return;
          const lw = L.canvas.width;
          const clamped = Math.max(lw, Math.min(16384, Math.floor(w)));
          setEditOutputWidth(Number.isFinite(clamped) ? clamped : lw);
      },
      [activeLayerId, layers]
  );

  const handleEditOutputHeightChange = useCallback(
      (h: number) => {
          const L = layers.find((l) => l.id === activeLayerId);
          if (!L) return;
          const lh = L.canvas.height;
          const clamped = Math.max(lh, Math.min(16384, Math.floor(h)));
          setEditOutputHeight(Number.isFinite(clamped) ? clamped : lh);
      },
      [activeLayerId, layers]
  );

  const resetEditOutputToLayer = useCallback(() => {
      const L = layers.find((l) => l.id === activeLayerId);
      if (!L) return;
      setEditOutputWidth(L.canvas.width);
      setEditOutputHeight(L.canvas.height);
  }, [activeLayerId, layers]);

  const saveSettings = (newLang: Language) => {
      setLanguage(newLang);
      localStorage.setItem('nano_lang', newLang);
      setShowSettings(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files ? Array.from(event.target.files) : [];
    if (list.length === 0) return;
    try {
      setIsProcessing(true);
      const first = list[0];
      let data;
      if (isPsdFile(first)) data = await parsePsdFile(first);
      else if (isRasterImageFile(first)) data = await parseImageFile(first);
      else {
        alert('Unsupported file: ' + first.name);
        return;
      }
      const dims = { width: data.width, height: data.height };
      canvasDimsRef.current = dims;
      setCanvasDims(dims);
      setLayers(data.layers);
      if (data.layers.length > 0) setActiveLayerId(data.layers[data.layers.length - 1].id);
      setSelection(null);

      if (list.length > 1) {
        await appendFilesInOrder(list.slice(1), { manageProcessing: false });
      }
    } catch (err) {
      alert("Error loading file: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLayerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files ? Array.from(event.target.files) : [];
      if (list.length > 0) await appendFilesInOrder(list);
      if (addLayerInputRef.current) addLayerInputRef.current.value = '';
  };

  const handleLayerSelect = useCallback((id: string) => {
      setActiveLayerId(id);
      setReferenceLayerIds(prev => prev.filter(rid => rid !== id));
  }, []);

  const handleWorkspaceViewChange = useCallback(
    (view: WorkspaceViewMode) => {
      setWorkspaceView(view);
      if (view === 'overview') {
        setSelection(null);
        setMode((m) =>
          m === ToolMode.MOVE || m === ToolMode.SELECT ? ToolMode.EDIT : m
        );
      }
    },
    []
  );

  const isOverviewView = workspaceView === 'overview';
  
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

  /** 图层面板拖放排序（列表自上而下 = 画布从上到下） */
  const handleReorderLayer = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setLayers((prev) => {
      const display = [...prev].reverse();
      const fromIdx = display.findIndex((l) => l.id === draggedId);
      const toIdx = display.findIndex((l) => l.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const nextDisplay = [...display];
      const [removed] = nextDisplay.splice(fromIdx, 1);
      nextDisplay.splice(toIdx, 0, removed);
      return nextDisplay.reverse().map((l, i) => ({ ...l, zIndex: i }));
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
    let result: any = undefined;
    try {
      const activeLayer = layers.find(l => l.id === activeLayerId);

      /** 编辑：透明底填充至配置的输出尺寸后再上传（尺寸不小于图层像素） */
      let paddedEdit: ReturnType<typeof buildPaddedEditSource> | null = null;
      if (activeLayer) {
          paddedEdit = buildPaddedEditSource(activeLayer, editOutputWidth, editOutputHeight);
      }

      let selectionPercent: { x: number; y: number; width: number; height: number } | undefined = undefined;
      if (activeLayer && selection && selection.width > 5 && selection.height > 5 && paddedEdit) {
          const mapped = mapSelectionToPaddedImagePercent(
              selection,
              activeLayer,
              paddedEdit.width,
              paddedEdit.height,
              paddedEdit.offsetX,
              paddedEdit.offsetY
          );
          if (mapped) selectionPercent = mapped;
      }

      const referenceBase64s: string[] = [];
      referenceLayerIds.forEach(id => {
          const refLayer = layers.find(l => l.id === id);
          if (refLayer) referenceBase64s.push(canvasToBase64(refLayer.canvas));
      });

      const editAspectRatio =
          paddedEdit
              ? aspectRatioFromDimensions(paddedEdit.width, paddedEdit.height)
              : undefined;

      result = await generateImage({
          prompt: promptText,
          model: selectedModel,
          aiSource,
          imageBase64: paddedEdit ? paddedEdit.base64 : undefined,
          selection: selectionPercent,
          referenceImages: referenceBase64s.length > 0 ? referenceBase64s : undefined,
          systemInstruction: systemInstruction || undefined,
          aspectRatio: editAspectRatio,
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

      const rw =
        result.width && result.width > 0 ? result.width : img.naturalWidth;
      const rh =
        result.height && result.height > 0 ? result.height : img.naturalHeight;

      let resultCanvas: HTMLCanvasElement;
      if (!activeLayer) {
          resultCanvas = document.createElement('canvas');
          resultCanvas.width = rw;
          resultCanvas.height = rh;
          const ctx = resultCanvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0);
      } else if (paddedEdit) {
          resultCanvas = document.createElement('canvas');
          resultCanvas.width = paddedEdit.width;
          resultCanvas.height = paddedEdit.height;
          const ctx = resultCanvas.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0, paddedEdit.width, paddedEdit.height);
      } else {
          resultCanvas = document.createElement('canvas');
          resultCanvas.width = activeLayer!.canvas.width;
          resultCanvas.height = activeLayer!.canvas.height;
          const ctx = resultCanvas.getContext('2d');
          if (ctx)
              ctx.drawImage(
                  img,
                  0,
                  0,
                  activeLayer!.canvas.width,
                  activeLayer!.canvas.height
              );
      }

      const refDims = canvasDimsRef.current;
      let nextCanvasWidth: number;
      let nextCanvasHeight: number;
      let placeX: number;
      let placeY: number;

      if (!activeLayer) {
          nextCanvasWidth = Math.max(refDims.width, resultCanvas.width);
          nextCanvasHeight = Math.max(refDims.height, resultCanvas.height);
          placeX = (nextCanvasWidth - resultCanvas.width) / 2;
          placeY = (nextCanvasHeight - resultCanvas.height) / 2;
      } else if (paddedEdit) {
          placeX = activeLayer.x - paddedEdit.offsetX;
          placeY = activeLayer.y - paddedEdit.offsetY;
          nextCanvasWidth = Math.max(refDims.width, placeX + resultCanvas.width);
          nextCanvasHeight = Math.max(refDims.height, placeY + resultCanvas.height);
      } else {
          placeX = activeLayer.x;
          placeY = activeLayer.y;
          nextCanvasWidth = refDims.width;
          nextCanvasHeight = refDims.height;
      }

      canvasDimsRef.current = {
          width: nextCanvasWidth,
          height: nextCanvasHeight,
      };
      setCanvasDims({
          width: nextCanvasWidth,
          height: nextCanvasHeight,
      });

      const newLayerId = `layer-${crypto.randomUUID()}`;
      const newLayer: Layer = {
          id: newLayerId,
          name: activeLayer ? `${t(language, 'toolEdit')}: ${promptText.substring(0, 15)}...` : `${t(language, 'generate')}: ${promptText.substring(0, 15)}...`,
          visible: true,
          opacity: 1,
          canvas: resultCanvas,
          thumbnail: generateThumbnail(resultCanvas),
          zIndex: 0,
          x: placeX,
          y: placeY,
          cost: result.cost,
          prompt: promptText
      };

      setLayers((prev) => {
          const topZ = prev.reduce((m, l) => Math.max(m, l.zIndex), -1) + 1;
          return [...prev, { ...newLayer, zIndex: topZ }];
      });
      setActiveLayerId(newLayerId);
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

  // 模板选择：同时更新系统指令和主提示词
  const handleApplyTemplate = useCallback((templateName: string) => {
      let systemText = '';
      let promptText = '';

      switch (templateName) {
          case 'comic':
              systemText = 'Generate a 4-panel comic strip based on the subject. Ensure consistent character details.';
              promptText = systemText;
              break;
          case 'character':
              systemText = 'Create a character reference sheet with front, side, and back views.';
              promptText = systemText;
              break;
          case 'cyberpunk':
              systemText = 'Apply a Cyberpunk aesthetic: Neon lights, high contrast, futuristic elements, rain.';
              promptText = systemText;
              break;
          case 'watercolor':
              systemText = 'Apply a soft watercolor painting style with bleeding edges and pastel colors.';
              promptText = systemText;
              break;
          case 'consistent':
              systemText = 'Maintain the character\'s appearance and original art style. Do not invent new characters. Ensure actions are logical and natural. The image should be bright, detailed, and have a rich background.';
              promptText = systemText;
              break;
          default:
              break;
      }

      if (systemText) {
          setSystemInstruction(systemText);
      }
      if (promptText) {
          handleReusePrompt(promptText);
      }
  }, [handleReusePrompt]);

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

          // 统一用 ref 与最终尺寸计算画布与居中，避免 setState 后仍读到旧的 canvasDims
          const startDims = canvasDimsRef.current;
          const finalW = Math.max(startDims.width, canvasWidth);
          const finalH = Math.max(startDims.height, canvasHeight);
          canvasDimsRef.current = { width: finalW, height: finalH };
          setCanvasDims({ width: finalW, height: finalH });

          const placeX = Math.max(0, (finalW - resultCanvas.width) / 2);
          const placeY = Math.max(0, (finalH - resultCanvas.height) / 2);

          const newLayerId = `layer-${crypto.randomUUID()}`;
          const newLayer: Layer = {
              id: newLayerId,
              name: `History: ${image.prompt.substring(0, 15)}...`,
              visible: true,
              opacity: 1,
              canvas: resultCanvas,
              thumbnail: generateThumbnail(resultCanvas),
              zIndex: 0,
              x: placeX,
              y: placeY,
              cost: image.cost,
              prompt: image.prompt
          };
          
          console.log('Adding layer:', {
              id: newLayer.id,
              position: { x: placeX, y: placeY },
              size: { width: canvasWidth, height: canvasHeight },
              canvasDims: { width: finalW, height: finalH }
          });
          
          setLayers(prev => {
              const topZ = prev.reduce((m, l) => Math.max(m, l.zIndex), -1) + 1;
              const newLayers = [...prev, { ...newLayer, zIndex: topZ }];
              console.log('Total layers:', newLayers.length);
              return newLayers;
          });
          setActiveLayerId(newLayerId);
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
  }, [mode]);

  const exportImage = () => {
      if (canvasDims.width === 0) return;
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvasDims.width;
      exportCanvas.height = canvasDims.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;
      const drawOrder = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      drawOrder.forEach(layer => {
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
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect x="3.5" y="13" width="14" height="6" rx="1.6" fill="white" opacity="0.45"/>
                    <rect x="5.5" y="9" width="14" height="6" rx="1.6" fill="white" opacity="0.7"/>
                    <rect x="7.5" y="5" width="14" height="6" rx="1.6" fill="white"/>
                    <path d="M19.5 2 l0.6 1.4 L21.5 4 l-1.4 0.6 L19.5 6 l-0.6-1.4 L17.5 4 l1.4-0.6 Z" fill="white"/>
                </svg>
            </div>
            <h1 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden sm:block uppercase tracking-tight">
                {t(language, 'appTitle')} <span className="font-light opacity-50">{t(language, 'appSubtitle')}</span>
            </h1>
        </div>
        <div className="flex items-center gap-2">
             <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".psd,.png,.jpg,.jpeg,.webp" multiple className="hidden" />
             <input type="file" ref={addLayerInputRef} onChange={handleAddLayerUpload} accept=".psd,.png,.jpg,.jpeg,.webp" multiple className="hidden" />
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
             <a
                href={USAGE_GUIDE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg border border-slate-700 transition-all flex items-center gap-2 text-slate-200 no-underline"
                title={t(language, 'usageGuide')}
             >
                <i className="fa-solid fa-book text-amber-400"></i>
                <span className="hidden sm:inline">{t(language, 'usageGuide')}</span>
             </a>
             <button onClick={() => setShowSettings(true)} className="p-2 transition-all rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                <i className="fa-solid fa-gear"></i>
             </button>
        </div>
      </header>
      <div
        className="flex-1 flex overflow-hidden relative"
        onDragEnter={handleMainDragEnter}
        onDragOver={handleMainDragOver}
        onDragLeave={handleMainDragLeave}
        onDrop={handleMainDrop}
      >
        {fileDropHover && (
          <div
            className="absolute inset-0 z-[35] flex flex-col items-center justify-center gap-3 bg-slate-950/75 border-2 border-dashed border-blue-500 pointer-events-none"
            aria-hidden
          >
            <i className="fa-solid fa-cloud-arrow-up text-4xl text-blue-400" />
            <p className="text-sm font-semibold text-blue-100 px-6 text-center max-w-md">
              {t(language, 'dropFilesHint')}
            </p>
          </div>
        )}
        <div className="flex flex-col z-10 hidden md:flex">
            <div className="w-16 bg-slate-900 border-r border-slate-700 flex flex-col items-center py-6 gap-5 h-full">
                 <button
                    onClick={() => setMode(ToolMode.MOVE)}
                    disabled={isOverviewView}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${mode === ToolMode.MOVE && !isOverviewView ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`}
                    title={t(language, 'toolMove')}
                 >
                    <i className="fa-solid fa-arrows-up-down-left-right"></i>
                 </button>
                 <div className="w-8 h-px bg-slate-800"></div>
                 <button onClick={() => setMode(ToolMode.EDIT)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${mode === ToolMode.EDIT ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`} title={t(language, 'toolEdit')}>
                    <i className="fa-solid fa-wand-magic-sparkles"></i>
                 </button>
                 <button
                    onClick={() => setMode(ToolMode.SELECT)}
                    disabled={isOverviewView}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed ${mode === ToolMode.SELECT && !isOverviewView ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/40' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'}`}
                    title={t(language, 'toolSelect')}
                 >
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
                onReorderLayer={handleReorderLayer}
                lang={language}
                onClose={() => setMobilePanel('none')}
            />
        </div>
        <div className="flex-1 relative min-w-0 flex flex-col overflow-hidden">
          <Workspace
            width={canvasDims.width}
            height={canvasDims.height}
            layers={layers}
            activeLayerId={activeLayerId}
            viewMode={workspaceView}
            mode={mode}
            selection={selection}
            onSelectionChange={setSelection}
            onLayerMove={handleLayerMove}
            onSelectLayer={handleLayerSelect}
            lang={language}
          />
          <div className="absolute bottom-20 md:bottom-6 left-4 z-40 pointer-events-none">
            <WorkspaceViewSwitcher
              viewMode={workspaceView}
              onViewModeChange={handleWorkspaceViewChange}
              lang={language}
            />
          </div>
        </div>
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
                        editOutputWidth={editOutputWidth}
                        editOutputHeight={editOutputHeight}
                        onEditOutputWidthChange={handleEditOutputWidthChange}
                        onEditOutputHeightChange={handleEditOutputHeightChange}
                        onResetEditOutputToLayer={resetEditOutputToLayer}
                        selectedModel={selectedModel}
                        onSelectModel={setSelectedModel}
                        aiSource={aiSource}
                        onAiSourceChange={handleAiSourceChange}
                        systemInstruction={systemInstruction}
                        onSystemInstructionChange={setSystemInstruction}
                        onApplyTemplate={handleApplyTemplate}
                    />
                )}
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
            <PromptBar 
                onGenerate={handleGeminiAction}
                isProcessing={isProcessing}
                mode={mode}
                workspaceView={workspaceView}
                activeLayerId={activeLayerId}
                selection={selection}
                referenceLayerIds={referenceLayerIds}
                onToggleReference={handleToggleReference}
                availableRefLayers={activeLayerId ? layers.filter(l => l.id !== activeLayerId) : layers}
                allLayers={layers}
                lang={language}
                externalPrompt={reusedPrompt}
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
                      {typeof localStorage !== 'undefined' &&
                        getStoredAppSessionToken() && (
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                clearFeishuAccessToken();
                                window.location.reload();
                              }}
                              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-750"
                            >
                              {t(language, 'feishuLogout')}
                            </button>
                          </div>
                        )}
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
                <div className={`w-20 h-20 border-4 border-t-transparent rounded-full animate-spin ${
                    selectedModel.includes('gpt-image-1.5') 
                        ? 'border-green-500/20 border-t-green-500' 
                        : selectedModel.includes('pro') 
                        ? 'border-purple-500/20 border-t-purple-500' 
                        : 'border-blue-500/20 border-t-blue-500'
                }`}></div>
                <div className={`absolute inset-0 flex items-center justify-center text-2xl ${
                    selectedModel.includes('gpt-image-1.5') 
                        ? 'text-green-400' 
                        : selectedModel.includes('pro') 
                        ? 'text-purple-400' 
                        : 'text-blue-400'
                }`}>
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
