import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { resizeImage } from '../utils/fileUtils';
import * as geminiService from '../services/geminiService';
import { IconUpload, IconArrowRight, IconTrash } from '../constants';
import Button from './Button';

type Point = { x: number; y: number };
type MaskPath = Point[];

const ImageDropzone = ({ image, setImage, title, description }: { image: string | null; setImage: (img: string | null) => void; title: string; description: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { setError } = useAppContext();

    const processFile = useCallback(async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            try {
                const base64 = await resizeImage(file, 1024, 1024);
                setImage(base64);
            } catch (err) {
                setError("Couldn't read the image file.");
            }
        } else {
            setError("Please upload a valid image file.");
        }
    }, [setImage, setError]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            processFile(e.target.files[0]);
        }
    };

    return (
        <div 
            className="w-full aspect-square border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-black/20 overflow-hidden shadow-inner relative"
            onClick={() => inputRef.current?.click()}
        >
            {image ? (
                <img src={image} alt={title} className="w-full h-full object-contain p-2" />
            ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <IconUpload />
                    <p className="mt-4 text-lg text-gray-300">{title}</p>
                    <p className="text-sm mt-1">{description}</p>
                </div>
            )}
             <input type="file" ref={inputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
        </div>
    );
};

const RemixStudio: React.FC = () => {
    const { geminiApiKey, setError } = useAppContext();
    const [baseImage, setBaseImage] = useState<string | null>(null);
    const [baseImageDims, setBaseImageDims] = useState<{w: number, h: number} | null>(null);
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [remixPrompt, setRemixPrompt] = useState('');
    const [maskPaths, setMaskPaths] = useState<MaskPath[]>([]);
    const [isDrawing, setIsDrawing] = useState(false);
    
    const [rawRemixImage, setRawRemixImage] = useState<string | null>(null);
    const [processedRemixImage, setProcessedRemixImage] = useState<string | null>(null);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (baseImage) {
            const img = new Image();
            img.onload = () => {
                setBaseImageDims({ w: img.width, h: img.height });
            };
            img.src = baseImage;
        } else {
            setBaseImageDims(null);
        }
    }, [baseImage]);

    const drawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const drawImageToCanvas = (imgSrc: string, onFinish: () => void) => {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                onFinish();
            };
            img.src = imgSrc;
        };
        
        const drawMasks = () => {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // semi-transparent red
            ctx.lineWidth = 20; // Thick line to denote an area
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            maskPaths.forEach(path => {
                if (path.length < 1) return;
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                ctx.stroke();
            });
        };

        if (baseImage) {
            drawImageToCanvas(baseImage, drawMasks);
        }

    }, [baseImage, maskPaths]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (baseImage && referenceImage) {
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = 1024;
            compositeCanvas.height = 512;
            const compositeCtx = compositeCanvas.getContext('2d')!;

            const img1 = new Image();
            img1.onload = () => {
                const hRatio = 512 / img1.width;
                const vRatio = 512 / img1.height;
                const ratio = Math.min(hRatio, vRatio);
                const newWidth = img1.width * ratio;
                const newHeight = img1.height * ratio;
                const xOffset = (512 - newWidth) / 2;
                const yOffset = (512 - newHeight) / 2;
                compositeCtx.drawImage(img1, xOffset, yOffset, newWidth, newHeight);

                const img2 = new Image();
                img2.onload = () => {
                    const hRatio2 = 512 / img2.width;
                    const vRatio2 = 512 / img2.height;
                    const ratio2 = Math.min(hRatio2, vRatio2);
                    const newWidth2 = img2.width * ratio2;
                    const newHeight2 = img2.height * ratio2;
                    const xOffset2 = 512 + (512 - newWidth2) / 2;
                    const yOffset2 = (512 - newHeight2) / 2;
                    compositeCtx.drawImage(img2, xOffset2, yOffset2, newWidth2, newHeight2);
                    
                    compositeCtx.beginPath();
                    compositeCtx.moveTo(512, 0);
                    compositeCtx.lineTo(512, 512);
                    compositeCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                    compositeCtx.lineWidth = 1;
                    compositeCtx.stroke();
                    
                    drawMasks();
                };
                img2.src = referenceImage;
            };
            img1.src = baseImage;
            
            const drawMasks = () => {
                compositeCtx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // semi-transparent red
                compositeCtx.lineWidth = 20; // Thick line
                compositeCtx.lineCap = 'round';
                compositeCtx.lineJoin = 'round';
                maskPaths.forEach(path => {
                    if (path.length < 1) return;
                    compositeCtx.beginPath();
                    compositeCtx.moveTo(path[0].x, path[0].y);
                    path.slice(1).forEach(p => compositeCtx.lineTo(p.x, p.y));
                    compositeCtx.stroke();
                });
                
                ctx.drawImage(compositeCanvas, 0, 0, canvas.width, canvas.height);
            };
        }
    }, [baseImage, referenceImage, maskPaths]);
    
    const getMousePos = (e: React.MouseEvent): Point => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
            y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height)
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const pos = getMousePos(e);
        if (pos.x > canvasRef.current!.width / 2) return; // Only draw on left
        setIsDrawing(true);
        setMaskPaths(prev => [...prev, [pos]]);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        if (pos.x > canvasRef.current!.width / 2) {
            setIsDrawing(false);
            return;
        }
        setMaskPaths(prev => {
            const newPaths = [...prev];
            newPaths[newPaths.length - 1].push(pos);
            return newPaths;
        });
    };

    const handleMouseUp = () => setIsDrawing(false);
    
    const handleGenerateRemix = async () => {
        if (!baseImage || !referenceImage) return setError("Please provide both a base and reference image.");
        if (!remixPrompt) return setError("Please provide instructions for the remix.");
        if (maskPaths.length === 0) return setError("Please draw on the left image to indicate the area to change.");
        if (!geminiApiKey) return setError("Please set your Gemini API key in the settings.");
        if (!baseImageDims) return setError("Could not determine base image dimensions.");

        setIsGenerating(true);
        setLoadingMessage('Remixing design with AI...');
        setRawRemixImage(null);
        setProcessedRemixImage(null);
        setError(null);

        try {
            const maskCanvas = document.createElement('canvas');
            maskCanvas.width = baseImageDims.w;
            maskCanvas.height = baseImageDims.h;
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) throw new Error("Could not create mask canvas.");

            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
            
            const displayCanvas = canvasRef.current!;
            const scaleX = maskCanvas.width / (displayCanvas.width / 2);
            const scaleY = maskCanvas.height / displayCanvas.height;
            
            maskCtx.strokeStyle = 'white';
            maskCtx.lineWidth = 20 * Math.max(scaleX, scaleY);
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            
            maskPaths.forEach(path => {
                if (path.length < 1) return;
                maskCtx.beginPath();
                maskCtx.moveTo(path[0].x * scaleX, path[0].y * scaleY);
                path.slice(1).forEach(p => maskCtx.lineTo(p.x * scaleX, p.y * scaleY));
                maskCtx.stroke();
            });
            const maskImageBase64 = maskCanvas.toDataURL('image/png');

            const result = await geminiService.remixDesign(geminiApiKey, baseImage, referenceImage, maskImageBase64, remixPrompt);
            setRawRemixImage(result);

        } catch(err: any) {
            setError(err.message || "Failed to generate the remix.");
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleProcessRemix = async () => {
        if (!rawRemixImage) return setError("No raw image to process.");

        setIsProcessing(true);
        setError(null);
        setProcessedRemixImage(null);

        try {
            setLoadingMessage('Removing background...');
            const cleanResult = await geminiService.removeBackground(rawRemixImage);

            setLoadingMessage('Upscaling to 4500x5400px...');
            const upscaledResult = await geminiService.resizeDesign(cleanResult);
            
            setProcessedRemixImage(upscaledResult);

        } catch(err: any) {
            setError(err.message || "Failed to process the remixed image.");
        } finally {
            setIsProcessing(false);
            setLoadingMessage('');
        }
    }
    
    const handleDownload = () => {
        const imageToDownload = processedRemixImage || rawRemixImage;
        if (!imageToDownload) return;
        const link = document.createElement('a');
        link.href = imageToDownload;
        link.download = 'remixed-design.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const imageToDisplay = processedRemixImage || rawRemixImage;

    return (
        <div className="animate-fade-in">
             <div className="glass-card p-8 rounded-2xl mb-8">
                <h2 className="text-2xl font-semibold text-white mb-6">1. Upload Your Images</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ImageDropzone image={baseImage} setImage={setBaseImage} title="Upload Base Design" description="(This is the image you want to modify)" />
                    <ImageDropzone image={referenceImage} setImage={setReferenceImage} title="Upload Reference Image" description="(Contains elements/style to use)" />
                </div>
             </div>

            {baseImage && referenceImage && (
                <div className="glass-card p-8 rounded-2xl mb-8 animate-fade-in">
                    <h2 className="text-2xl font-semibold text-white mb-2">2. Create Your Remix</h2>
                    <p className="text-gray-400 mb-6">Draw on the left image to mark the area to change, then tell the AI what to do.</p>
                    <div 
                        onMouseDown={handleMouseDown} 
                        onMouseMove={handleMouseMove} 
                        onMouseUp={handleMouseUp} 
                        onMouseLeave={handleMouseUp}
                        className="relative cursor-crosshair rounded-lg overflow-hidden border border-gray-700"
                    >
                        <canvas ref={canvasRef} width={1024} height={512} className="w-full h-auto" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-6">
                         <input
                            type="text"
                            value={remixPrompt}
                            onChange={(e) => setRemixPrompt(e.target.value)}
                            placeholder="e.g., Replace the coffee cup with the beer can"
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button onClick={handleGenerateRemix} primary className="w-full" disabled={isGenerating || isProcessing}>
                                {isGenerating ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <IconArrowRight />}
                                <span>{isGenerating ? loadingMessage : 'Generate'}</span>
                            </Button>
                            <Button onClick={() => setMaskPaths([])} title="Clear Mask" disabled={isGenerating || isProcessing}><IconTrash /></Button>
                        </div>
                    </div>
                </div>
            )}
            
            {(isGenerating || rawRemixImage) && (
                 <div className="glass-card p-8 rounded-2xl animate-fade-in">
                    <h3 className="text-3xl font-bold text-white mb-8 text-center">3. Your Remixed Design</h3>
                    <div className="max-w-md mx-auto">
                        {isGenerating && <div className="animate-pulse bg-gray-800/50 aspect-square rounded-lg" />}
                        {imageToDisplay && (
                            <div className="relative">
                                <div className="aspect-square rounded-lg bg-grid-pattern">
                                    <img src={imageToDisplay} alt="Remixed design" className="w-full h-full object-contain" />
                                </div>
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center text-white">
                                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400"></div>
                                        <p className="mt-4">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="text-center mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                            {rawRemixImage && !processedRemixImage && (
                                <Button onClick={handleProcessRemix} primary disabled={isProcessing || isGenerating}>
                                    {isProcessing ? 'Processing...' : 'Remove Background & Upscale'}
                                </Button>
                            )}
                            {imageToDisplay && <Button onClick={handleDownload} disabled={isProcessing}>Download</Button>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RemixStudio;
