import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { resizeImage, resizeImageFromBase64 } from '../utils/fileUtils';
import * as geminiService from '../services/geminiService';
import { IconUpload, IconTrash, PRESET_COLORS } from '../constants';
import Button from './Button';

type Point = { x: number; y: number };
type MaskPath = Point[];

const transparentBgStyle = {
    backgroundImage: `
        linear-gradient(45deg, #808080 25%, transparent 25%),
        linear-gradient(-45deg, #808080 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #808080 75%),
        linear-gradient(-45deg, transparent 75%, #808080 75%)
    `,
    backgroundSize: '12px 12px',
    backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
    backgroundColor: '#e0e0e0'
};

const STUDIO_BG_OPTIONS = [...PRESET_COLORS, '#FFFFFF', 'transparent'];

const BackgroundColorPicker = ({ selectedColor, onColorChange }: { selectedColor: string, onColorChange: (color: string) => void }) => (
    <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
        <span className="text-sm text-gray-400 mr-2">BG Color:</span>
        {STUDIO_BG_OPTIONS.map(color => {
            const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
            if (color === 'transparent') {
                return (
                    <button
                        key="transparent"
                        onClick={() => onColorChange('transparent')}
                        className={`w-6 h-6 rounded-full border-2 transition-transform transform hover:scale-110 ${isSelected ? 'border-blue-400 ring-2 ring-blue-400' : 'border-white/20'}`}
                        style={transparentBgStyle}
                        aria-label="Select transparent background"
                    />
                );
            }
            return (
                <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform transform hover:scale-110 ${isSelected ? 'border-blue-400 ring-2 ring-blue-400' : 'border-white/20'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select background color ${color}`}
                />
            );
        })}
    </div>
);


const RedesignStudio: React.FC = () => {
    const { geminiApiKey, setError, sharedDesign, setSharedDesign } = useAppContext();
    
    // State for images
    const [sourceImage, setSourceImage] = useState<string | null>(null); // Original, high-res
    const [displayImage, setDisplayImage] = useState<string|null>(null); // Downscaled for canvas
    const [editedImage, setEditedImage] = useState<string | null>(null); // Final, upscaled
    const [originalImageDims, setOriginalImageDims] = useState<{w: number, h: number} | null>(null);
    
    // State for UI and drawing
    const [prompt, setPrompt] = useState('');
    const [brushSize, setBrushSize] = useState(50);
    const [isDrawing, setIsDrawing] = useState(false);
    const [maskPaths, setMaskPaths] = useState<MaskPath[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#0D1117');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load shared design from context or clear images
    useEffect(() => {
        if (sharedDesign) {
            handleImageLoad(sharedDesign);
            setSharedDesign(null); // Consume the shared design
        }
    }, [sharedDesign, setSharedDesign]);
    
    // Process a new image (from upload or context)
    const handleImageLoad = useCallback(async (base64Image: string) => {
        setSourceImage(base64Image);
        setMaskPaths([]);
        setEditedImage(null);
        setPrompt('');

        // Store original dimensions
        const img = new Image();
        img.onload = () => setOriginalImageDims({ w: img.width, h: img.height });
        img.src = base64Image;
        
        // Create a smaller version for display and faster processing
        const downscaled = await resizeImageFromBase64(base64Image, 1024, 1024);
        setDisplayImage(downscaled);
    }, []);

    // Handle file upload event
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await resizeImage(file, 4500, 5400); // Resize to standard on upload
                handleImageLoad(base64);
            } catch (err) {
                setError("Could not process the uploaded file.");
            }
        }
    }, [handleImageLoad, setError]);

    const handleClearImage = () => {
        setSourceImage(null);
        setDisplayImage(null);
        setEditedImage(null);
        setMaskPaths([]);
        setPrompt('');
        setOriginalImageDims(null);
        setCanvasBackgroundColor('#0D1117'); // reset bg color
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Allows re-uploading the same file
        }
    };


    // Draw display image and user's mask paths onto the canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (displayImage) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                drawMasks(ctx);
            };
            img.src = displayImage;
        }
    }, [displayImage, maskPaths, brushSize]);

    const drawMasks = (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(255, 0, 150, 0.7)'; // Pink for visibility
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        maskPaths.forEach(path => {
            if (path.length < 1) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            ctx.lineWidth = brushSize;
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x, path[i].y);
            }
            ctx.stroke();
        });
    };

    // Mouse event handlers for drawing
    const getCanvasPoint = (e: React.MouseEvent): Point | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width * canvas.width,
            y: (e.clientY - rect.top) / rect.height * canvas.height,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!displayImage) return;
        setIsDrawing(true);
        const point = getCanvasPoint(e);
        if (point) {
            setMaskPaths(prev => [...prev, [point]]);
        }
    };
    
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing || !displayImage) return;
        const point = getCanvasPoint(e);
        if (point) {
            setMaskPaths(prev => {
                const newPaths = [...prev];
                newPaths[newPaths.length - 1].push(point);
                return newPaths;
            });
        }
    };
    
    const handleMouseUp = () => setIsDrawing(false);

    // Main generation logic
    const handleGenerate = async () => {
        if (!sourceImage || !displayImage || !originalImageDims) return setError("Please load an image first.");
        if (maskPaths.length === 0) return setError("Please draw on the image to mark an area to change.");
        if (!prompt) return setError("Please enter a prompt to describe your changes.");
        if (!geminiApiKey) return setError("Please set your Gemini API key in settings.");

        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            // Create mask image at the same resolution as the display image
            const maskCanvas = document.createElement('canvas');
            const displayImg = new Image();
            displayImg.src = displayImage;
            await new Promise(resolve => { displayImg.onload = resolve });
            maskCanvas.width = displayImg.width;
            maskCanvas.height = displayImg.height;
            const maskCtx = maskCanvas.getContext('2d');
            if (!maskCtx) throw new Error("Could not create mask context.");

            maskCtx.fillStyle = 'black';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
            
            const displayCanvas = canvasRef.current!;
            const scaleX = maskCanvas.width / displayCanvas.width;
            const scaleY = maskCanvas.height / displayCanvas.height;
            
            maskCtx.strokeStyle = 'white';
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            
            maskPaths.forEach(path => {
                if (path.length < 1) return;
                maskCtx.beginPath();
                maskCtx.moveTo(path[0].x * scaleX, path[0].y * scaleY);
                maskCtx.lineWidth = brushSize * Math.min(scaleX, scaleY);
                path.slice(1).forEach(p => maskCtx.lineTo(p.x * scaleX, p.y * scaleY));
                maskCtx.stroke();
            });
            const maskImageBase64 = maskCanvas.toDataURL('image/png');
            
            const result = await geminiService.inpaintWithPrompt(geminiApiKey, displayImage, maskImageBase64, prompt);

            // Remove the background before upscaling
            const cleanResult = await geminiService.removeBackground(result);

            // Upscale the result to the final 4500x5400 resolution
            const finalImage = await geminiService.resizeDesign(cleanResult);
            setEditedImage(finalImage);

        } catch (err: any) {
            setError(err.message || "Failed to generate redesign.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!editedImage) return;
        const link = document.createElement('a');
        link.href = editedImage;
        link.download = 'redesigned-image-4500x5400.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const canvasContainerStyle = {
        cursor: displayImage ? 'crosshair' : 'pointer',
        ...(canvasBackgroundColor === 'transparent' ? transparentBgStyle : { backgroundColor: canvasBackgroundColor })
    };

    return (
        <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Canvas and Image Input */}
                <div className="md:col-span-2 glass-card p-6 rounded-2xl">
                     <div 
                        className="w-full aspect-[45/54] border-2 border-dashed border-gray-700 rounded-xl overflow-hidden shadow-inner relative"
                        style={canvasContainerStyle}
                        onClick={() => !displayImage && fileInputRef.current?.click()}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                     >
                        {displayImage ? (
                            <canvas ref={canvasRef} width={1024} height={1229} className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500 h-full">
                                <IconUpload />
                                <p className="mt-4 text-lg text-gray-300">Upload Design</p>
                                <p className="text-sm mt-1">Or send a 4500x5400px image from the Mockup Studio</p>
                            </div>
                        )}
                         <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
                    </div>
                     {displayImage && (
                        <div className="mt-4">
                            <BackgroundColorPicker 
                                selectedColor={canvasBackgroundColor} 
                                onColorChange={setCanvasBackgroundColor} 
                            />
                             <div className="flex justify-center gap-4 mt-4">
                                <Button onClick={() => fileInputRef.current?.click()}>Change Image</Button>
                                <Button onClick={handleClearImage}>
                                    <IconTrash /> Clear Image
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Controls and Results */}
                <div className="md:col-span-1 space-y-8">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4">1. Paint over the area to change</h3>
                        <div className="flex items-center gap-4">
                            <label htmlFor="brush-size" className="text-sm text-gray-400">Brush:</label>
                            <input
                                id="brush-size"
                                type="range"
                                min="10"
                                max="150"
                                value={brushSize}
                                onChange={e => setBrushSize(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                disabled={!displayImage}
                            />
                        </div>
                         <Button onClick={() => setMaskPaths([])} disabled={!displayImage || maskPaths.length === 0} className="w-full mt-4">
                            <IconTrash /> Reset Selection
                        </Button>
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                         <h3 className="text-lg font-semibold text-white mb-4">2. Describe your change</h3>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., Change the text to 'Hello Summer' and match the font style."
                            maxLength={1000}
                            disabled={!displayImage}
                            className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                        />
                        <Button onClick={handleGenerate} primary className="w-full mt-4 text-base py-3" disabled={isLoading || !displayImage}>
                           {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                           ) : "✨ Generate"}
                        </Button>
                    </div>
                    
                    {(isLoading || editedImage) && (
                         <div className="glass-card p-6 rounded-2xl">
                             <h3 className="text-lg font-semibold text-white mb-4">3. Result</h3>
                            {isLoading && <div className="animate-pulse bg-gray-800/50 aspect-[45/54] rounded-lg" />}
                            {editedImage && (
                                <>
                                    <div className="aspect-[45/54] rounded-lg bg-grid-pattern">
                                        <img src={editedImage} alt="Redesigned result" className="w-full h-full object-contain" />
                                    </div>
                                    <Button onClick={handleDownload} className="w-full mt-4">Download Result</Button>
                                </>
                            )}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RedesignStudio;
