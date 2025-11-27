import { Layer } from '../types';
import { readPsd, writePsd, Psd } from 'ag-psd'; // Assuming ag-psd is installed in the environment

/**
 * Converts a File object (PSD) to our internal Layer structure.
 * Uses ag-psd to parse the file.
 */
export const parsePsdFile = async (file: File): Promise<{ width: number; height: number; layers: Layer[] }> => {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const psd: Psd = readPsd(arrayBuffer);
    
    const layers: Layer[] = [];
    const canvasWidth = psd.width;
    const canvasHeight = psd.height;

    // Helper to process psd layers
    const processLayers = (psdLayers: any[], parentX = 0, parentY = 0) => {
        // Reverse to match z-index (ag-psd usually lists top to bottom, but we might want to manage indices manually)
        // For simplicity, we just flatten the structure or take top-level
        psdLayers.forEach((layer, index) => {
            if (layer.canvas) {
                // It's a raster layer
                const layerCanvas = layer.canvas as HTMLCanvasElement;
                
                // Create a full-size canvas for this layer to simplify compositing
                // In a real app, you'd want to keep original bounds to save memory, 
                // but for this editor, full-size layers are easier to manage with Gemini.
                const fullCanvas = document.createElement('canvas');
                fullCanvas.width = canvasWidth;
                fullCanvas.height = canvasHeight;
                const ctx = fullCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(layerCanvas, layer.left || 0, layer.top || 0);
                }

                layers.push({
                    id: `layer-${Math.random().toString(36).substr(2, 9)}`,
                    name: layer.name || `Layer ${index + 1}`,
                    visible: !layer.hidden,
                    opacity: layer.opacity != null ? layer.opacity : 1,
                    canvas: fullCanvas,
                    zIndex: index
                });
            } else if (layer.children) {
                // Recursively process groups (flattening for this simplified demo)
                processLayers(layer.children, (layer.left || 0), (layer.top || 0));
            }
        });
    }

    if (psd.children) {
        processLayers(psd.children);
    } else if (psd.canvas) {
         // Single layer or flat image
         const fullCanvas = document.createElement('canvas');
         fullCanvas.width = canvasWidth;
         fullCanvas.height = canvasHeight;
         const ctx = fullCanvas.getContext('2d');
         if (ctx) ctx.drawImage(psd.canvas as HTMLCanvasElement, 0, 0);
         
         layers.push({
            id: 'background',
            name: 'Background',
            visible: true,
            opacity: 1,
            canvas: fullCanvas,
            zIndex: 0
         });
    }

    return { width: canvasWidth, height: canvasHeight, layers: layers.reverse() }; // Reverse so bottom layer is first in array
  } catch (e) {
    console.error("Failed to parse PSD", e);
    throw new Error("Invalid PSD file or parse error.");
  }
};

/**
 * Converts a standard image file (PNG/JPG) to a single layer.
 */
export const parseImageFile = async (file: File): Promise<{ width: number; height: number; layers: Layer[] }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);

            resolve({
                width: img.width,
                height: img.height,
                layers: [{
                    id: `layer-${Date.now()}`,
                    name: file.name,
                    visible: true,
                    opacity: 1,
                    canvas: canvas,
                    zIndex: 0
                }]
            });
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Exports current layers to a PSD file
 */
export const exportToPsd = (layers: Layer[], width: number, height: number) => {
    // Convert internal layers (bottom-to-top) to ag-psd structure (top-to-bottom)
    const psdChildren = [...layers].reverse().map(layer => ({
        name: layer.name,
        hidden: !layer.visible,
        opacity: layer.opacity,
        // ag-psd can read directly from canvas element
        canvas: layer.canvas,
        left: 0,
        top: 0
    }));

    const psd: Psd = {
        width,
        height,
        children: psdChildren
    };

    const buffer = writePsd(psd);
    
    // Create download link
    const blob = new Blob([buffer], { type: 'application/x-photoshop' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nanolayer_export.psd';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const canvasToBase64 = (canvas: HTMLCanvasElement): string => {
    return canvas.toDataURL('image/png');
}

export const base64ToCanvas = async (base64: string, width: number, height: number): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height); 
            resolve(canvas);
        };
        img.src = base64;
    });
}