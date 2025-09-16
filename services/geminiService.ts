import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductDetails } from '../types';

// Helper function to fetch a URL and convert it to a base64 data URL
const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const getImagePart = (base64Image: string) => {
    return {
        inlineData: {
            mimeType: 'image/png',
            data: base64Image.split(',')[1],
        },
    };
};

const generateImage = async (apiKey: string, prompt: string, base64InputImage: string): Promise<string> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                getImagePart(base64InputImage),
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    throw new Error("API did not return an image.");
};


export const transformDesign = async (apiKey: string, base64Image: string, instructions: string): Promise<string> => {
    const prompt = `You are an expert image editing assistant. Analyze the main graphic design in the provided image. Reproduce an absolutely detailed, high resolution, watermark-free, print-quality version of ONLY the central design elements. Faithfully reproduce all details, colors and fonts. The final product MUST be printed on a solid, neutral, monochrome background (like pure white #FFFFFF) for easy background removal. IMPORTANT: Do not include any components of the original product (like a t-shirt or mug) or any background elements. Based on the user's instructions, completely transform the design in the provided image.
User Instructions: "${instructions}"`;

    return generateImage(apiKey, prompt, base64Image);
};

export const remixDesign = async (apiKey: string, baseImage: string, referenceImage: string, maskImage: string, instructions: string): Promise<string> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a professional photo editing assistant. Your task is to perform an inpainting operation.
You will receive three images and a text instruction:
1.  A 'target image' which you need to edit.
2.  A 'source image' which contains the element or style to be added.
3.  A 'mask image'. The white area on this mask indicates the exact region on the 'target image' to be modified. The black area must remain untouched.

Based on the user's instruction: "${instructions}", seamlessly blend the relevant part of the 'source image' into the white masked area of the 'target image'.

IMPORTANT:
- Maintain the original level of detail, lighting, and quality from the source images to ensure a high-fidelity, seamless result.
- The output must be ONLY the final, edited 'target image'.
- The output image must have the EXACT same dimensions as the original 'target image'.
- Do not include the source image or the mask in the final output.
- Do not add any text, watermarks, or explanations. Just return the modified image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/png', data: baseImage.split(',')[1] } },
                { inlineData: { mimeType: 'image/png', data: referenceImage.split(',')[1] } },
                { inlineData: { mimeType: 'image/png', data: maskImage.split(',')[1] } },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    throw new Error("API did not return an image.");
};

export const analyzeImageColor = async (apiKey: string, base64Image: string): Promise<string> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = "You are an expert image editing assistant. Analyze the image of a product with a graphic on it. Determine the dominant color of the product's material itself, ignoring the colors within the graphic design. Provide only the hex color code for this dominant background color. For example, if it's a black t-shirt with a white logo, you should return #000000. Your response must be only the hex code.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: [ { text: prompt }, getImagePart(base64Image) ] },
    });
    
    const color = response.text.trim();
    return /^#[0-9A-F]{6}$/i.test(color) ? color : '#F3F4F6'; // Default to light gray if invalid
};

export const cloneDesign = async (apiKey: string, base64Image: string): Promise<string> => {
    const prompt = `You are an expert image editing assistant. Analyze the main graphic design in the provided image. Recreate an absolutely detailed, high-resolution, remove watermark, print-quality version of ONLY the central design elements. Faithfully reproduce all details, colors, and fonts. The final output MUST be on a solid, neutral, single-color background (like pure white #FFFFFF) to make background removal easy. Do NOT use a transparent background. IMPORTANT: Do not include any part of the original product (like a t-shirt or mug) or any background elements.`;
    return generateImage(apiKey, prompt, base64Image);
};

export const cloneWithSeedreamV4 = async (apiKey: string, base64Image: string): Promise<string> => {
    if (!apiKey) throw new Error("Fal AI API key is not set.");
    
    const FAL_API_URL = 'https://fal.run/fal-ai/bytedance/seedream/v4/edit';

    const prompt = "Analyze the main graphic design in the provided image. Recreate an absolutely detailed, high-resolution, remove watermark, print-quality version of ONLY the central design elements. Faithfully reproduce all details, colors, and fonts. The final output MUST be on a solid, neutral, single-color background (like pure white #FFFFFF) to make background removal easy. Do NOT use a transparent background. IMPORTANT: Do not include any part of the original product (like a t-shirt or mug) or any background elements.";

    const body = {
        "prompt": prompt,
        "image_size": {
            "height": 5400,
            "width": 4500
        },
        "num_images": 1,
        "enable_safety_checker": true,
        "image_urls": [base64Image] // Send base64 data URL
    };
    
    const response = await fetch(FAL_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Seedream API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.images || result.images.length === 0 || !result.images[0].url) {
        throw new Error("Seedream API did not return an image URL.");
    }
    
    const imageUrl = result.images[0].url;

    // Fetch the generated image and convert it to base64 to maintain consistency
    return urlToBase64(imageUrl);
};

export const redesignDesign = async (apiKey: string, base64Image: string, instructions: string): Promise<string> => {
    const prompt = `You are an expert design restoration specialist. The provided image is potentially low-quality, blurry, or old. Your task is to intelligently recognize and meticulously recreate the original, high-fidelity design.
- Use your extensive knowledge to identify any logos, characters, text, or specific art styles, even if they are obscured. If you recognize a known design (e.g., a famous logo, a character from a show), recreate it with perfect accuracy.
- If the design seems generic, infer the details and recreate it in a clean, sharp, print-quality style.
- The final output MUST be on a solid, neutral, single-color background (like pure white #FFFFFF) to make background removal easy. Do NOT use a transparent background.
- IMPORTANT: Do not include any part of the original product (like a t-shirt or mug) or any background elements.
- If there are user instructions, apply them to the restored design.
User Instructions: "${instructions || 'No custom instructions provided. Focus on faithful restoration.'}"`;
    return generateImage(apiKey, prompt, base64Image);
};

export const inpaintWithPrompt = async (apiKey: string, baseImage: string, maskImage: string, instructions: string): Promise<string> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
RULE: You are a master graphic designer and style chameleon. Your ONLY task is to perform a generative inpainting operation with perfect stylistic matching.
You will receive three inputs:
1.  A 'base image' that needs modification.
2.  A 'mask image'. The white area on this mask indicates the ONLY region on the 'base image' to be modified.
3.  A text 'instruction' describing the change.

TASK:
1.  METICULOUSLY ANALYZE the 'base image' style surrounding the masked area. Match the font, text effects, colors, outlines, textures, lighting, and overall artistic style PERFECTLY. The final edit must look like it was created by the original artist.
2.  Apply the user's 'instruction' ("${instructions}") ONLY to the white area defined by the 'mask image'.
3.  The black area of the 'mask image' corresponds to the part of the 'base image' that MUST be preserved perfectly. No pixels in this area should be altered. ANY change outside the white mask is a CRITICAL FAILURE.
4.  Your output MUST be ONLY the final, edited image, with the exact same dimensions as the original 'base image'. Do not add text or explanations.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/png', data: baseImage.split(',')[1] } },
                { inlineData: { mimeType: 'image/png', data: maskImage.split(',')[1] } },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart?.inlineData) {
        return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    throw new Error("API did not return an image.");
};

export const createMockup = async (apiKey: string, base64ClonedDesign: string, productPrompt: string, productColorHex: string): Promise<string> => {
    const prompt = `Take the provided design and create a photorealistic mockup. ${productPrompt}. IMPORTANT: The main color of the product (e.g., the t-shirt fabric, the mug's ceramic) MUST be the hex color: ${productColorHex}. The design must be placed naturally on the product, conforming to its shape, texture, and lighting. The final image should look like a professional product photograph.`;
    return generateImage(apiKey, prompt, base64ClonedDesign);
};

export const generateProductDetails = async (apiKey: string, base64ClonedDesign: string): Promise<ProductDetails> => {
    if (!apiKey) throw new Error("Gemini API key is not set.");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = "Analyze the provided design. Your task is to generate marketing copy for a print-on-demand product featuring this design.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, getImagePart(base64ClonedDesign)] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "A short, catchy, and descriptive title (max 20 words)."
                    },
                    description: {
                        type: Type.STRING,
                        description: "A compelling 2-3 sentence product description that highlights the style, mood, and potential appeal of the design."
                    },
                    tags: {
                        type: Type.STRING,
                        description: "A single comma-separated string of 10-15 relevant SEO keywords or tags, before tags add #."
                    }
                },
                required: ["title", "description", "tags"]
            }
        }
    });

    const jsonString = response.text;
    return JSON.parse(jsonString) as ProductDetails;
};

/**
 * Resizes the design to a print-ready resolution of 4500x5400 pixels.
 * This implementation uses the browser's Canvas API for client-side resizing, which is fast and requires no extra API keys.
 * For different requirements, this could be swapped with a server-side resizing service.
 */
export const resizeDesign = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const targetWidth = 4500;
            const targetHeight = 5400;

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context for resizing.'));
            }

            ctx.imageSmoothingQuality = 'high';

            // Calculate dimensions to fit image within the canvas while maintaining aspect ratio
            const hRatio = targetWidth / img.width;
            const vRatio = targetHeight / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const newWidth = img.width * ratio;
            const newHeight = img.height * ratio;

            // Center the image
            const xOffset = (targetWidth - newWidth) / 2;
            const yOffset = (targetHeight - newHeight) / 2;
            
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, xOffset, yOffset, newWidth, newHeight);

            // Return the resized image as a a base64 string
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for resizing.'));
        };
        img.src = base64Image;
    });
};

// Client-side background removal using Canvas API, based on user-provided script.
// This replaces the Photoroom API integration.
export const removeBackground = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const width = canvas.width;
                const height = canvas.height;

                // --- Start of user's provided background removal logic ---
                const corners = [
                    [0, 0], [width-1, 0], [0, height-1], [width-1, height-1],
                    [Math.floor(width/4), 0], [Math.floor(3*width/4), 0],
                    [0, Math.floor(height/4)], [width-1, Math.floor(height/4)]
                ];
                
                let bgColors: {r: number; g: number; b: number}[] = [];
                corners.forEach(([x, y]) => {
                    const idx = (y * width + x) * 4;
                    bgColors.push({
                        r: data[idx],
                        g: data[idx + 1], 
                        b: data[idx + 2]
                    });
                });
                
                const avgBg = bgColors.reduce((acc, color) => ({
                    r: acc.r + color.r / bgColors.length,
                    g: acc.g + color.g / bgColors.length,
                    b: acc.b + color.b / bgColors.length
                }), {r: 0, g: 0, b: 0});
                
                const edges = new Uint8Array(width * height);
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const idx = (y * width + x) * 4;
                        const current = {r: data[idx], g: data[idx+1], b: data[idx+2]};
                        
                        let edgeStrength = 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nIdx = ((y + dy) * width + (x + dx)) * 4;
                                const neighbor = {r: data[nIdx], g: data[nIdx+1], b: data[nIdx+2]};
                                const diff = Math.abs(current.r - neighbor.r) + 
                                           Math.abs(current.g - neighbor.g) + 
                                           Math.abs(current.b - neighbor.b);
                                edgeStrength = Math.max(edgeStrength, diff);
                            }
                        }
                        edges[y * width + x] = edgeStrength > 30 ? 1 : 0;
                    }
                }
                
                for (let i = 0; i < data.length; i += 4) {
                    const pixelIdx = Math.floor(i / 4);
                    const x = pixelIdx % width;
                    const y = Math.floor(pixelIdx / width);
                    
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    const bgDistance = Math.sqrt(
                        Math.pow(r - avgBg.r, 2) + 
                        Math.pow(g - avgBg.g, 2) + 
                        Math.pow(b - avgBg.b, 2)
                    );
                    
                    const nearEdge = edges[y * width + x] === 1;
                    
                    const borderDistance = Math.min(x, y, width - x - 1, height - y - 1);
                    const nearBorder = borderDistance < Math.min(width, height) * 0.05;
                    
                    let isBackground = false;
                    
                    if (r > 240 && g > 240 && b > 240 && bgDistance < 25) {
                        isBackground = true;
                    }
                    else if (bgDistance < 35 && !nearEdge) {
                        isBackground = true;
                    }
                    else if (nearBorder && bgDistance < 50) {
                        isBackground = true;
                    }
                    else if (bgDistance < 20 && (r + g + b) / 3 > 200) {
                        isBackground = true;
                    }
                    
                    if (isBackground) {
                        data[i + 3] = 0; // Make transparent
                    } else if (bgDistance < 60) {
                        // Partial transparency for edge smoothing
                        data[i + 3] = Math.max(0, Math.min(255, (bgDistance / 60) * 255));
                    }
                }
                // --- End of user's provided logic ---

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png'));

            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => {
            reject(new Error('Failed to load image for background removal.'));
        };
        img.src = base64Image;
    });
};
