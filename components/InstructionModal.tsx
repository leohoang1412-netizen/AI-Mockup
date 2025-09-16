
import React, { useState, useEffect } from 'react';
import Button from './Button';

interface InstructionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (instructions: string) => void;
    initialInstructions: string;
}

const STYLES: { [key: string]: string } = {
    'vintage': 'Vintage',
    'watercolor': 'Watercolor',
    'minimalist': 'Minimalist',
    'graffiti': 'Graffiti',
    'neon-punk': 'Neon Punk',
    'comic-book': 'Comic Book',
    'fantasy': 'Fantasy Art',
    'line-art': 'Line Art',
};

const CREATIVITY_LEVELS = [
    { label: 'Low', description: 'Subtly refine the design in a {STYLE} style, keeping the original composition and elements largely intact.' },
    { label: 'Medium', description: 'Reinterpret the design in a {STYLE} style, taking creative liberties with colors and shapes but retaining the core subject.' },
    { label: 'High', description: 'Completely reimagine the design in a {STYLE} style. Use the original as inspiration for a new artistic creation.' },
];

const InstructionModal: React.FC<InstructionModalProps> = ({ isOpen, onClose, onSave, initialInstructions }) => {
    const [activeTab, setActiveTab] = useState('redesign');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [creativity, setCreativity] = useState(1); // 0: low, 1: medium, 2: high
    const [customInstructions, setCustomInstructions] = useState(initialInstructions);
    const charLimit = 2000;

    useEffect(() => {
        setCustomInstructions(initialInstructions);
    }, [initialInstructions, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        let finalInstructions = '';
        if (activeTab === 'redesign' && selectedStyle) {
            const styleName = STYLES[selectedStyle];
            finalInstructions = CREATIVITY_LEVELS[creativity].description.replace('{STYLE}', styleName);
        } else if (activeTab === 'custom') {
            finalInstructions = customInstructions;
        }
        onSave(finalInstructions);
        onClose();
    };

    const isRedesignSaveDisabled = activeTab === 'redesign' && !selectedStyle;

    const TabButton: React.FC<{ tabId: string, children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold transition-colors rounded-t-md ${activeTab === tabId ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white border-b-2 border-transparent'}`}
        >
            {children}
        </button>
    );

    return (
        <div
            className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center animate-fade-in p-4"
            onClick={onClose}
        >
            <div
                className="glass-card rounded-2xl shadow-2xl w-full max-w-2xl text-white transform transition-all overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 sm:p-8">
                    <h2 className="text-2xl font-bold mb-1">Redesign & Customize with AI</h2>
                    <p className="text-gray-400 mb-6">Choose a redesign style or provide your own custom instructions.</p>
                
                    <div className="border-b border-white/10">
                        <TabButton tabId="redesign">🎨 Redesign</TabButton>
                        <TabButton tabId="custom">✍️ Custom Instructions</TabButton>
                    </div>

                    <div className="pt-6">
                        {activeTab === 'redesign' && (
                            <div className="animate-fade-in">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Choose a Style</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {Object.entries(STYLES).map(([key, name]) => (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedStyle(key)}
                                                className={`p-3 text-center rounded-lg border-2 transition-all duration-200 transform hover:scale-105 ${selectedStyle === key ? 'border-blue-400 bg-blue-900/30 ring-1 ring-blue-400' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}
                                            >
                                                {name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-300 mb-3">Creativity Level</h3>
                                    <div className="flex items-center gap-4 bg-gray-800 rounded-lg p-2">
                                        <span className="text-sm text-gray-400">Low</span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="2"
                                            step="1"
                                            value={creativity}
                                            onChange={(e) => setCreativity(Number(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            aria-label="Creativity level"
                                        />
                                        <span className="text-sm text-gray-400">High</span>
                                    </div>
                                    <p className="text-center text-sm text-gray-500 mt-2">{CREATIVITY_LEVELS[creativity].label}</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'custom' && (
                            <div className="animate-fade-in">
                                <div className="relative">
                                    <textarea
                                        value={customInstructions}
                                        onChange={(e) => setCustomInstructions(e.target.value)}
                                        placeholder="e.g., Change the dog to a cat and make it wear sunglasses."
                                        maxLength={charLimit}
                                        className="w-full h-48 bg-gray-800 border border-gray-600 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                                        aria-label="Custom instructions for AI design transformation"
                                    />
                                    <div className="absolute bottom-3 right-3 text-xs text-gray-500">
                                        {customInstructions.length}/{charLimit}
                                    </div>
                                </div>
                                <div className="mt-4 text-gray-400">
                                    <p className="font-semibold mb-2 text-sm">Examples:</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                        <li>Add a retro 80s style with neon colors</li>
                                        <li>Transform it into a watercolor painting</li>
                                        <li>Change the text to "Hello World"</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="bg-black/20 border-t border-white/10 p-4 flex justify-end gap-4">
                    <Button onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} primary disabled={isRedesignSaveDisabled} title={isRedesignSaveDisabled ? "Please select a style" : "Save Instructions"}>Save Instructions</Button>
                </div>
            </div>
        </div>
    );
};

export default InstructionModal;