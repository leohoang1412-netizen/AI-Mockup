import React, { useState, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { resizeImage } from '../utils/fileUtils';
import * as geminiService from '../services/geminiService';
import Button from './Button';
import { IconUpload, IconSparkles } from '../constants';

const SeedreamStudio: React.FC = () => {
    const { falAiApiKey, setError, setActiveView, setSharedDesign } = useAppContext();

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [cleanResultImage, setCleanResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
             if (file && file.type.startsWith('image/')) {
                try {
                    const base64Image = await resizeImage(file, 2048, 2048);
                    setUploadedImage(base64Image);
                    setResultImage(null);
                    setCleanResultImage(null);
                    setError(null);
                } catch (err) {
                    setError("Couldn't process this image. Please try another file.");
                }
            } else {
                setError("Please upload a valid image file.");
            }
        }
    }, [setError]);

    const handleGenerate = async () => {
        if (!uploadedImage) return setError("Please upload a design image to start!");
        if (!falAiApiKey) return setError("Please set your fal.ai API key in the settings.");
        
        setIsLoading(true);
        setError(null);
        setResultImage(null);
        setCleanResultImage(null);

        try {
            const imageBase64 = await geminiService.cloneWithSeedreamV4(falAiApiKey, uploadedImage);
            setResultImage(imageBase64);
        } catch (err: any) {
            console.error("Seedream V4 generation failed:", err);
            setError(err.message || "Could not generate the design with Seedream V4.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleRemoveBackground = async () => {
        if (!resultImage) return setError("There is no generated image to process.");

        setIsRemovingBackground(true);
        setError(null);

        try {
            const cleanImage = await geminiService.removeBackground(resultImage);
            setCleanResultImage(cleanImage);
        } catch (err: any) {
            setError(err.message || "Background removal failed.");
        } finally {
            setIsRemovingBackground(false);
        }
    };


    const handleSendToRedesign = () => {
        const imageToSend = cleanResultImage || resultImage;
        if (imageToSend) {
            setSharedDesign(imageToSend);
            setActiveView('redesign');
        }
    };

    const handleDownload = () => {
        const imageToDownload = cleanResultImage || resultImage;
        if (!imageToDownload) return;
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = imageToDownload;
        a.download = 'seedream-v4-design.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const isGenerateDisabled = !uploadedImage || isLoading || !falAiApiKey;
    const imageToShow = cleanResultImage || resultImage;

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left side: Upload */}
                <div className="glass-card p-8 rounded-2xl">
                    <h2 className="text-2xl font-semibold text-white mb-6">1. Upload Design</h2>
                    <div 
                        className="w-full aspect-square border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-black/20 overflow-hidden shadow-inner"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {uploadedImage ? (
                            <img src={uploadedImage} alt="Uploaded design" className="w-full h-full object-contain p-4" />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                                <IconUpload />
                                <p className="mt-4 text-lg text-gray-300">Click to upload image</p>
                                <p className="text-sm mt-1">The AI will clone this design</p>
                            </div>
                        )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
                    <Button onClick={handleGenerate} primary className="w-full mt-8 text-lg py-4" disabled={isGenerateDisabled}>
                         {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <> <IconSparkles /> Generate with Seedream V4 </>
                        )}
                    </Button>
                </div>

                {/* Right side: Result */}
                <div className="glass-card p-8 rounded-2xl">
                     <h2 className="text-2xl font-semibold text-white mb-6">2. Result</h2>
                     <div className="w-full aspect-square border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-grid-pattern overflow-hidden shadow-inner">
                        {isLoading && <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400"></div>}
                        {!isLoading && imageToShow && (
                            <img src={imageToShow} alt="Generated by Seedream V4" className="w-full h-full object-contain" />
                        )}
                         {!isLoading && !imageToShow && (
                            <p className="text-gray-500">Your generated design will appear here</p>
                         )}
                     </div>
                     {resultImage && !isLoading && (
                        <div className="mt-8 flex flex-col gap-4">
                            <Button 
                                onClick={handleRemoveBackground} 
                                disabled={isRemovingBackground || !!cleanResultImage} 
                                className="w-full"
                            >
                                {isRemovingBackground ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                        <span>Removing Background...</span>
                                    </>
                                ) : (
                                    "✨ Remove Background"
                                )}
                            </Button>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button onClick={handleDownload} className="flex-1">Download</Button>
                                <Button onClick={handleSendToRedesign} primary className="flex-1">Send to Redesign Studio</Button>
                            </div>
                        </div>
                     )}
                </div>
            </div>
        </div>
    );
};

export default SeedreamStudio;
