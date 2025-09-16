import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Status, type ClonedDesign, type Mockup, type ProductDetails } from '../types';
import { PRODUCTS, IconSparkles, IconUpload, IconMagicWand, IconPalette, IconArrowRight } from '../constants';
import * as geminiService from '../services/geminiService';
import { resizeImage } from '../utils/fileUtils';
import Button from './Button';
import ProductDetailsDisplay from './ProductDetailsDisplay';
import MockupCard from './MockupCard';
import InstructionModal from './InstructionModal';
import { useAppContext } from '../context/AppContext';
import ColorPicker from './ColorPicker';
import RemixStudio from './RemixStudio';
import RedesignStudio from './RedesignStudio';
import SeedreamStudio from './SeedreamStudio';
import { AppView } from '../context/AppContext';

const ProductSelectorCard = ({ id, name, isSelected, onSelect }: { id: string, name: string, isSelected: boolean, onSelect: (id: string) => void }) => (
    <div
        onClick={() => onSelect(id)}
        className={`cursor-pointer p-3 text-center rounded-xl border transition-all duration-300 transform hover:scale-105 h-full flex items-center justify-center ${isSelected ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
    >
        <h3 className="text-md font-semibold text-white">{name}</h3>
    </div>
);


const ProfileMenu = () => {
    const { user, logout, setIsSettingsOpen } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    if (!user) return null;

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="rounded-full overflow-hidden w-10 h-10 border-2 border-gray-600 hover:border-blue-400 transition-colors">
                <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            </button>
            {isOpen && (
                 <div className="absolute top-12 right-0 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 animate-fade-in-down">
                    <div className="p-4 border-b border-gray-700 flex items-center gap-3">
                        <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer"/>
                        <div>
                            <p className="font-semibold text-white truncate">{user.name}</p>
                            <p className="text-sm text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                    <div className="p-2">
                         <button onClick={() => { setIsSettingsOpen(true); setIsOpen(false); }} className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
                           API Key Settings
                        </button>
                        <button onClick={logout} className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const StudioView = () => {
    const { geminiApiKey, setError, setActiveView, setSharedDesign } = useAppContext();
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [processedDesign, setProcessedDesign] = useState<ClonedDesign>({ status: Status.IDLE, imageUrl: null });
    const [resizedDesign, setResizedDesign] = useState<ClonedDesign>({ status: Status.IDLE, imageUrl: null });
    const [mockups, setMockups] = useState<Mockup[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [productDetails, setProductDetails] = useState<ProductDetails | null>(null);
    const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
    const [designInstructions, setDesignInstructions] = useState('');
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [designBackgroundColor, setDesignBackgroundColor] = useState<string>('#FFFFFF');
    const [processingMode, setProcessingMode] = useState<'clone' | 'redesign'>('clone');
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const processImageFile = useCallback(async (file: File) => {
        if (file && file.type.startsWith('image/')) {
            try {
                const base64Image = await resizeImage(file, 1536, 1536);
                setUploadedImage(base64Image);
                setProcessedDesign({ status: Status.IDLE, imageUrl: null });
                setResizedDesign({ status: Status.IDLE, imageUrl: null });
                setMockups([]);
                setError(null);
                setProductDetails(null);
                setDesignInstructions('');
            } catch (err) {
                setError("Couldn't process this image. Please try another file.");
            }
        } else {
            setError("Please paste or upload a valid image file.");
        }
    }, [setError]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processImageFile(file);
        }
    };
    
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const file = event.clipboardData?.files[0];
            if (file) {
                processImageFile(file);
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [processImageFile]);


    const handleProductSelect = (productId: string) => {
        setSelectedProducts(prev => {
            const isSelected = prev.includes(productId);
            if (isSelected) {
                return prev.filter(id => id !== productId);
            } else {
                 if (prev.length >= 6) {
                    setError("You can select a maximum of 6 mockups.");
                    setTimeout(() => setError(null), 3000);
                    return prev;
                }
                return [...prev, productId];
            }
        });
    };
    
    const handleGenerateClick = async () => {
        if (!uploadedImage) return setError("Please upload a design image to start!");
        if (!geminiApiKey) {
            setError("Please set your Gemini API keys in settings.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setProductDetails(null);
        setProcessedDesign({ status: Status.PENDING, imageUrl: null });
        setResizedDesign({ status: Status.IDLE, imageUrl: null });
        setMockups([]);
        
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

        try {
            let generatedImageUrl: string;
            if (processingMode === 'redesign') {
                setLoadingMessage('Redesigning with AI...');
                generatedImageUrl = await geminiService.redesignDesign(geminiApiKey, uploadedImage, designInstructions);
            } else { // 'clone' mode
                if (designInstructions) {
                    setLoadingMessage('Transforming design with AI...');
                    generatedImageUrl = await geminiService.transformDesign(geminiApiKey, uploadedImage, designInstructions);
                } else {
                    setLoadingMessage('Cloning design...');
                    generatedImageUrl = await geminiService.cloneDesign(geminiApiKey, uploadedImage);
                }
            }
            setProcessedDesign({ status: Status.SUCCESS, imageUrl: generatedImageUrl });

        } catch (err: any) {
            console.error("A critical step failed:", err);
            setError(err.message || "Could not process the design. Please try another image.");
            setProcessedDesign({ status: Status.FAILED, imageUrl: null });
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleProcessAndGenerateMockups = async () => {
        if (!processedDesign.imageUrl || !uploadedImage) return;

        setIsProcessing(true);
        setError(null);
        setResizedDesign({ status: Status.PENDING, imageUrl: null });
        if (selectedProducts.length > 0) {
            setMockups(selectedProducts.map(id => ({ id, name: PRODUCTS[id].name, status: Status.PENDING, imageUrl: null })));
        } else {
            setMockups([]);
        }

        try {
            setLoadingMessage('Removing background...');
            const cleanImageUrl = await geminiService.removeBackground(processedDesign.imageUrl);

            setLoadingMessage('Resizing for print...');
            const resizedImageUrl = await geminiService.resizeDesign(cleanImageUrl);
            setResizedDesign({ status: Status.SUCCESS, imageUrl: resizedImageUrl });

            if (selectedProducts.length > 0) {
                setLoadingMessage('Analyzing color...');
                const dominantColor = await geminiService.analyzeImageColor(geminiApiKey, uploadedImage);

                let count = 0;
                for (const productId of selectedProducts) {
                    count++;
                    setLoadingMessage(`Creating mockup ${count} of ${selectedProducts.length}...`);
                    try {
                        const mockupImageUrl = await geminiService.createMockup(geminiApiKey, resizedImageUrl, PRODUCTS[productId].prompt, dominantColor);
                        setMockups(prev => prev.map(m => m.id === productId ? { ...m, status: Status.SUCCESS, imageUrl: mockupImageUrl } : m));
                    } catch (err: any) {
                        console.error(`Failed mockup for ${productId}:`, err);
                        setError(`Failed mockup for ${PRODUCTS[productId].name}.`);
                        setMockups(prev => prev.map(m => m.id === productId ? { ...m, status: Status.FAILED } : m));
                    }
                }
            }
        } catch (err: any) {
             console.error("Processing failed:", err);
             setError(err.message || "Could not process the design.");
             setResizedDesign({ status: Status.FAILED, imageUrl: null });
             setMockups(prev => prev.map(m => m.status === Status.PENDING ? { ...m, status: Status.FAILED } : m));
        } finally {
             setIsProcessing(false);
             setLoadingMessage('');
        }
    }


    const handleGenerateDetails = async () => {
        if (!resizedDesign.imageUrl) return;
        if (!geminiApiKey) {
             setError("Please set your Gemini API key in the settings.");
             return;
        }
        setIsGeneratingDetails(true);
        setProductDetails(null);
        setError(null);

        try {
            const details = await geminiService.generateProductDetails(geminiApiKey, resizedDesign.imageUrl);
            setProductDetails(details);
        } catch (err: any) {
            setError(err.message || "Could not generate product details. Please try again.");
        } finally {
            setIsGeneratingDetails(false);
        }
    };

    const handleDownload = (imageUrl: string, name: string) => {
        const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.png`;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadAll = () => {
        mockups.filter(m => m.status === Status.SUCCESS).forEach((mockup, index) => {
            setTimeout(() => handleDownload(mockup.imageUrl!, `mockup-${mockup.name}`), index * 300);
        });
    };

    const generateButtonText = processingMode === 'clone' ? 'Clone Design' : 'Redesign Design';
    const isGenerateDisabled = !uploadedImage || isGenerating || isProcessing || !geminiApiKey;
    
    const DesignBackgroundColorPicker = ({ color, setColor }: { color: string, setColor: (c: string) => void }) => {
        const colors = ['#FFFFFF', '#0D1117', '#6B7280', '#EF4444', '#3B82F6', '#10B981'];
        return (
            <div className="flex justify-center items-center gap-3 mb-4">
                <span className="text-sm text-gray-400">BG:</span>
                {colors.map(c => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform transform hover:scale-110 ${color.toLowerCase() === c.toLowerCase() ? 'border-blue-400 ring-2 ring-blue-400' : 'border-white/20'}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                    />
                ))}
            </div>
        );
    };

    const getResultsTitle = () => {
        if (processingMode === 'redesign') return '1. AI Redesigned';
        if (designInstructions) return '1. AI Transformed Design';
        return '1. Cloned Design';
    }

    return (
        <>
            <InstructionModal
                isOpen={isInstructionModalOpen}
                onClose={() => setIsInstructionModalOpen(false)}
                onSave={setDesignInstructions}
                initialInstructions={designInstructions}
            />
            <div className="glass-card p-8 rounded-2xl mb-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-semibold text-white">1. Upload Design</h2>
                            <Button onClick={() => setIsInstructionModalOpen(true)} disabled={!uploadedImage}>
                                <IconMagicWand /> Redesign / Customize
                            </Button>
                        </div>
                        <div 
                            className="w-full aspect-square border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-black/20 overflow-hidden shadow-inner"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploadedImage ? (
                                <img src={uploadedImage} alt="Uploaded design" className="w-full h-full object-contain p-4" />
                            ) : (
                                <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
                                    <IconUpload />
                                    <p className="mt-4 text-lg text-gray-300">Click to upload or paste image</p>
                                    <p className="text-sm mt-1">(Ctrl+V)</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png, image/jpeg" className="hidden" />
                        {designInstructions && (
                            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-400/50 rounded-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-blue-300 font-semibold mb-2">Active Instructions:</p>
                                        <p className="text-sm text-gray-300 whitespace-pre-wrap">{designInstructions}</p>
                                    </div>
                                    <button onClick={() => setIsInstructionModalOpen(true)} className="text-xs text-blue-400 hover:underline mt-1 flex-shrink-0 ml-4">Edit</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                         <h2 className="text-2xl font-semibold mb-6 text-white">2. Select Products (Optional)</h2>
                         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(PRODUCTS).map(([key, data]) => (
                                <ProductSelectorCard
                                    key={key}
                                    id={key}
                                    name={data.name}
                                    isSelected={selectedProducts.includes(key)}
                                    onSelect={handleProductSelect}
                                />
                            ))}
                         </div>
                    </div>
                </div>

                <div className="my-10 border-t border-white/10"></div>
                
                <div>
                    <h2 className="text-2xl font-semibold text-white mb-6 text-center">3. Choose Processing Mode</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                        <div
                        onClick={() => setProcessingMode('clone')}
                        className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-300 h-full ${processingMode === 'clone' ? 'border-blue-400 bg-blue-900/30 ring-1 ring-blue-400' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                        >
                        <h3 className="font-bold text-lg text-white">Clone</h3>
                        <p className="text-sm text-gray-400 mt-1">Best for clear, high-quality images. Creates a direct 1:1 copy of the design.</p>
                        </div>
                        <div
                        onClick={() => setProcessingMode('redesign')}
                        className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-300 h-full ${processingMode === 'redesign' ? 'border-blue-400 bg-blue-900/30 ring-1 ring-blue-400' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                        >
                        <h3 className="font-bold text-lg text-white">Redesign ✨</h3>
                        <p className="text-sm text-gray-400 mt-1">For blurry or old images. AI will attempt to recognize, restore, and upscale the design.</p>
                        </div>
                    </div>
                </div>


                <div className="mt-12 text-center">
                     <Button onClick={handleGenerateClick} disabled={isGenerateDisabled} primary className="text-lg px-12 py-4" title={isGenerateDisabled && !isGenerating ? "Please upload an image and set API keys" : ""}>
                        {isGenerating ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                <span>{loadingMessage}</span>
                            </>
                        ) : (
                            <> <IconSparkles /> {generateButtonText} </>
                        )}
                     </Button>
                </div>
            </div>

            <div ref={resultsRef}>
                {processedDesign.status !== Status.IDLE && (
                    <div className="mb-16">
                        <h2 className="text-3xl font-bold text-white mb-8 text-center">{getResultsTitle()}</h2>
                        <div className="max-w-md mx-auto glass-card rounded-xl p-4">
                            {processedDesign.status === Status.PENDING && <div className="animate-pulse bg-gray-800/50 aspect-square rounded-lg" />}
                            {processedDesign.status === Status.SUCCESS && 
                                <div className="aspect-square rounded-lg bg-white">
                                  <img src={processedDesign.imageUrl!} alt="Processed design" className="w-full h-full object-contain" />
                                </div>
                            }
                            {processedDesign.status === Status.FAILED && <div className="aspect-square rounded-lg bg-gray-800/50 flex items-center justify-center text-red-400">Design generation failed</div>}
                        </div>
                        {processedDesign.status === Status.SUCCESS && (
                            <div className="text-center mt-6 flex justify-center flex-wrap gap-4">
                                <Button onClick={() => handleDownload(processedDesign.imageUrl!, 'generated-design')}>Download Raw Design</Button>
                                 <Button onClick={handleProcessAndGenerateMockups} primary disabled={isProcessing}>
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                            <span>{loadingMessage || 'Processing...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <IconArrowRight />
                                            {selectedProducts.length > 0 ? 'Remove BG & Generate Mockups' : 'Remove BG & Resize'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                
                {resizedDesign.status !== Status.IDLE && (
                     <div className="mb-16">
                        <h2 className="text-3xl font-bold text-white mb-8 text-center">2. Processed for Print (4500x5400)</h2>
                        {resizedDesign.status === Status.SUCCESS && (
                           <DesignBackgroundColorPicker color={designBackgroundColor} setColor={setDesignBackgroundColor} />
                        )}
                        <div className="max-w-md mx-auto glass-card rounded-xl p-4">
                            {resizedDesign.status === Status.PENDING && <div className="animate-pulse bg-gray-800/50 aspect-square rounded-lg" />}
                            {resizedDesign.status === Status.SUCCESS && 
                                <div className="aspect-square rounded-lg" style={{ backgroundColor: designBackgroundColor }}>
                                    <img src={resizedDesign.imageUrl!} alt="Resized design" className="w-full h-full object-contain" />
                                </div>
                            }
                            {resizedDesign.status === Status.FAILED && <div className="aspect-square rounded-lg bg-gray-800/50 flex items-center justify-center text-red-400">Processing failed</div>}
                        </div>
                        {resizedDesign.status === Status.SUCCESS && (
                            <div className="text-center mt-6 flex justify-center flex-wrap gap-4">
                                <Button onClick={() => handleDownload(resizedDesign.imageUrl!, 'design-4500x5400')}>Download Processed Design</Button>
                                <Button onClick={() => {
                                    if(resizedDesign.imageUrl) {
                                        setSharedDesign(resizedDesign.imageUrl);
                                        setActiveView('redesign');
                                    }
                                }}>Send to Redesign Studio</Button>
                                <Button onClick={handleGenerateDetails} disabled={isGeneratingDetails || !geminiApiKey} primary>
                                    {isGeneratingDetails ? (
                                        <>
                                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                          <span>Generating...</span>
                                        </>
                                    ) : "✨ Generate Details"}
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {productDetails && <ProductDetailsDisplay details={productDetails} />}

                {mockups.length > 0 && (
                    <div className={productDetails || resizedDesign.status !== Status.IDLE ? 'mt-16' : ''}>
                        <div className="flex flex-col sm:flex-row justify-center items-center mb-8 gap-4 sm:gap-6">
                            <h2 className="text-3xl font-bold text-white text-center">3. Your Product Mockups</h2>
                            <Button onClick={handleDownloadAll} disabled={isProcessing || mockups.every(m => m.status !== Status.SUCCESS)}>Download All</Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                            {mockups.map((mockup) => <MockupCard key={mockup.id} mockup={mockup} onDownload={handleDownload} />)}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const MainApp: React.FC = () => {
    const { appBackgroundColor, setAppBackgroundColor, activeView, setActiveView } = useAppContext();
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const colorPickerButtonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className="text-gray-200 min-h-screen p-4 pb-20">
            <div className="w-full max-w-6xl mx-auto">
                <header className="text-center my-12 relative">
                    <div className="absolute top-0 left-0">
                        <div className="relative">
                            <button
                                ref={colorPickerButtonRef}
                                onClick={() => setIsColorPickerOpen(prev => !prev)}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                title="Change background color"
                            >
                                <IconPalette />
                            </button>
                            <ColorPicker
                                isOpen={isColorPickerOpen}
                                onClose={() => setIsColorPickerOpen(false)}
                                currentColor={appBackgroundColor}
                                onColorChange={setAppBackgroundColor}
                                anchorElement={colorPickerButtonRef.current}
                            />
                        </div>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter">
                        AI Mockup <span className="gradient-text">Studio</span>
                    </h1>
                    <p className="mt-4 text-lg text-gray-400">Clone or transform designs and generate product mockups instantly.</p>
                     <div className="absolute top-0 right-0">
                        <ProfileMenu />
                    </div>
                </header>

                <div className="flex justify-center mb-8 border-b border-white/10">
                    <button 
                        onClick={() => setActiveView('studio')} 
                        className={`px-6 py-3 font-semibold transition-colors ${activeView === 'studio' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-white'}`}>
                        Mockup Studio
                    </button>
                    <button 
                        onClick={() => setActiveView('seedream')} 
                        className={`px-6 py-3 font-semibold transition-colors ${activeView === 'seedream' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-white'}`}>
                        Seedream V4
                    </button>
                    <button 
                        onClick={() => setActiveView('remix')} 
                        className={`px-6 py-3 font-semibold transition-colors ${activeView === 'remix' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-white'}`}>
                        Remix Design
                    </button>
                     <button 
                        onClick={() => setActiveView('redesign')} 
                        className={`px-6 py-3 font-semibold transition-colors ${activeView === 'redesign' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-white'}`}>
                        Redesign Studio
                    </button>
                </div>

                <main>
                    {activeView === 'studio' && <StudioView />}
                    {activeView === 'seedream' && <SeedreamStudio />}
                    {activeView === 'remix' && <RemixStudio />}
                    {activeView === 'redesign' && <RedesignStudio />}
                </main>
            </div>
            <footer className="fixed bottom-4 left-4 text-gray-600 text-sm z-50">
                &copy; 2025 HoangLeo
            </footer>
        </div>
    );
};

export default MainApp;
