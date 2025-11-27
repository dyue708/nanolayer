import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

/**
 * Edits an image using the Gemini 2.5 Flash Image ("Nano Banana") model.
 * @param imageBase64 Base64 encoded string of the image (PNG/JPEG).
 * @param prompt Text instruction for the edit.
 * @param systemInstruction Optional system instruction to guide the style/behavior.
 * @param referenceImageBase64 Optional second image to use as context/style reference.
 * @returns Promise resolving to the edited image as a Base64 string.
 */
export const editImageWithGemini = async (
  imageBase64: string,
  prompt: string,
  systemInstruction?: string,
  referenceImageBase64?: string
): Promise<string> => {
  try {
    // Strip header if present to get raw base64
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const parts: any[] = [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/png', // Assuming PNG for internal canvas exports
        },
      }
    ];

    // If a reference image is provided, add it to the parts
    if (referenceImageBase64) {
       const cleanRef = referenceImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
       parts.push({
           inlineData: {
               data: cleanRef,
               mimeType: 'image/png'
           }
       });
    }

    // Add the text prompt
    parts.push({
      text: referenceImageBase64 
        ? `${prompt} (Use the second image as a style reference)` 
        : prompt,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano Banana
      contents: {
        parts: parts,
      },
      config: systemInstruction ? {
        systemInstruction: systemInstruction
      } : undefined
    });

    // Extract image from response
    // Nano Banana response structure usually has the image in the parts
    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts) throw new Error("No content generated");

    for (const part of responseParts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    throw error;
  }
};

/**
 * Analyzes an image using the Gemini 3 Pro Preview model.
 * @param imageBase64 Base64 encoded string of the image.
 * @param prompt Specific question or "Describe this image" default.
 * @returns Promise resolving to the text description.
 */
export const analyzeImageWithGemini = async (
  imageBase64: string,
  prompt: string = "Describe this image in detail, focusing on visual elements, style, and composition."
): Promise<string> => {
  try {
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