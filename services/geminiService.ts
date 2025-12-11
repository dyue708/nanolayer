
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAiClient = (customKey?: string) => {
    if (!customKey) {
        throw new Error("API Key is missing. Please configure it in Settings.");
    }
    return new GoogleGenAI({ apiKey: customKey });
};

/**
 * Generates content (Edit or Create) using the specified Gemini model.
 * @param apiKey Optional custom API key.
 * @param imageBase64 Optional Base64 encoded string of the image to edit. If null, generates new image.
 * @param prompt Text instruction.
 * @param model The model to use ('gemini-2.5-flash-image' or 'gemini-3-pro-image-preview').
 * @param systemInstruction Optional system instruction to guide the style/behavior.
 * @param referenceImageBase64s Optional array of images to use as context/style reference.
 * @param aspectRatio Optional aspect ratio for the output.
 * @param resolution Optional resolution string (e.g., '1K', '2K') - mostly for Pro model.
 * @returns Promise resolving to the generated/edited image as a Base64 string.
 */
export const generateContentWithGemini = async (
  apiKey: string | undefined,
  imageBase64: string | null | undefined,
  prompt: string,
  model: string,
  systemInstruction?: string,
  referenceImageBase64s?: string[],
  aspectRatio?: string,
  resolution?: string
): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    
    const parts: any[] = [];

    // 1. If we have an input image, add it (Editing Mode)
    if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        parts.push({
            inlineData: {
                data: cleanBase64,
                mimeType: 'image/png', // Assuming PNG for internal canvas exports
            },
        });
    }

    // 2. If reference images are provided, add them to the parts
    if (referenceImageBase64s && referenceImageBase64s.length > 0) {
       referenceImageBase64s.forEach(ref => {
           const cleanRef = ref.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
           parts.push({
               inlineData: {
                   data: cleanRef,
                   mimeType: 'image/png'
               }
           });
       });
    }

    // 3. Add the text prompt
    let finalPrompt = prompt;
    if (referenceImageBase64s && referenceImageBase64s.length > 0) {
        finalPrompt = `${prompt} (Use the provided ${referenceImageBase64s.length} reference image(s) as style/content context)`;
    }
    
    parts.push({ text: finalPrompt });

    const config: any = {};
    if (systemInstruction) {
        config.systemInstruction = systemInstruction;
    }
    
    // Add Image Config if ratio or resolution is specified
    if (aspectRatio || (resolution && model === 'gemini-3-pro-image-preview')) {
        config.imageConfig = {};
        if (aspectRatio) config.imageConfig.aspectRatio = aspectRatio;
        if (resolution && model === 'gemini-3-pro-image-preview') config.imageConfig.imageSize = resolution;
    }

    const response = await ai.models.generateContent({
      model: model, 
      contents: {
        parts: parts,
      },
      config: Object.keys(config).length > 0 ? config : undefined
    });

    // Extract image from response
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts) throw new Error("No content generated");

    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image using the Gemini 3 Pro Preview model.
 * @param apiKey Optional custom API key.
 * @param imageBase64 Base64 encoded string of the image.
 * @param prompt Specific question or "Describe this image" default.
 * @returns Promise resolving to the text description.
 */
export const analyzeImageWithGemini = async (
  apiKey: string | undefined,
  imageBase64: string,
  prompt: string = "Describe this image in detail, focusing on visual elements, style, and composition."
): Promise<string> => {
  try {
    const ai = getAiClient(apiKey);
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Required for advanced analysis
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: 'image/png',
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw error;
  }
};
