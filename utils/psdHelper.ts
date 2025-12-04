
import { Layer } from '../types';
import { readPsd, writePsd, Psd } from 'ag-psd'; // Assuming ag-psd is installed in the environment

/**
 * Generates a small thumbnail (80px max dim) base64 string from a canvas.
 * This improves performance by avoiding toDataURL on large canvases during render.
 */
export const generateThumbnail = (sourceCanvas: HTMLCanvasElement): string => {
    const thumbSize = 80;
    const scale = Math.min(thumbSize / sourceCanvas.width, thumbSize / sourceCanvas.height, 1);
    const w = Math.floor(sourceCanvas.width * scale);
    const h = Math.floor(sourceCanvas.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(sourceCanvas, 0, 0, w, h);
        return canvas.toDataURL('image/png');
    }
    return '';
};

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
                
                // Keep layer canvas at its original size, do not expand to full workspace
                const layerX = (layer.left || 0) + parentX;
                const layerY = (layer.top || 0) + parentY;

                // Clone canvas to ensure we have a clean element
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = layerCanvas.width;
                finalCanvas.height = layerCanvas.height;
                const ctx = finalCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(layerCanvas, 0, 0);
                }

                layers.push({
                    id: `layer-${Math.random().toString(36).substr(2, 9)}`,
                    name: layer.name || `Layer ${index + 1}`,
                    visible: !layer.hidden,
                    opacity: layer.opacity != null ? layer.opacity : 1,
                    canvas: finalCanvas,
                    thumbnail: generateThumbnail(finalCanvas),
                    zIndex: index,
                    x: layerX,
                    y: layerY
                });
            } else if (layer.children) {
                // Recursively process groups (flattening for this simplified demo)
                processLayers(layer.children, (layer.left || 0) + parentX, (layer.top || 0) + parentY);
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
            thumbnail: generateThumbnail(fullCanvas),
            zIndex: 0,
            x: 0,
            y: 0
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
                    thumbnail: generateThumbnail(canvas),
                    zIndex: 0,
                    x: 0,
                    y: 0
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
        left: layer.x,
        top: layer.y
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

/**
 * Creates a canvas from base64 at its natural size.
 */
export const base64ToCanvasNatural = async (base64: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0); 
            resolve(canvas);
        };
        img.src = base64;
    });
}
