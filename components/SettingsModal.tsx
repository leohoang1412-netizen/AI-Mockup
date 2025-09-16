import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import Button from './Button';

const SettingsModal: React.FC = () => {
    const { 
        isSettingsOpen, 
        setIsSettingsOpen, 
        saveConfiguration,
        geminiApiKey,
        falAiApiKey,
    } = useAppContext();

    const [tempGeminiKey, setTempGeminiKey] = useState('');
    const [tempFalAiKey, setTempFalAiKey] = useState('');

    useEffect(() => {
        if (isSettingsOpen) {
            setTempGeminiKey(geminiApiKey);
            setTempFalAiKey(falAiApiKey);
        }
    }, [isSettingsOpen, geminiApiKey, falAiApiKey]);

    if (!isSettingsOpen) return null;
    
    const handleSave = () => {
        saveConfiguration({
            gemini: tempGeminiKey,
            falai: tempFalAiKey,
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center animate-fade-in p-4"
            onClick={() => setIsSettingsOpen(false)}
        >
            <div 
                className="glass-card rounded-2xl shadow-2xl w-full max-w-lg text-white"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-8">
                    <h2 className="text-2xl font-semibold mb-6 text-white text-center">Configuration</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Gemini API Key</label>
                            <input 
                                type="password"
                                value={tempGeminiKey}
                                onChange={(e) => setTempGeminiKey(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter your Gemini API Key"
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-400 mb-2">
                                fal.ai API Key <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline text-xs ml-2">(Get Key)</a>
                            </label>
                            <input 
                                type="password"
                                value={tempFalAiKey}
                                onChange={(e) => setTempFalAiKey(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter your fal.ai API Key (e.g., key_id:key_secret)"
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-black/20 border-t border-white/10 p-4 flex justify-end gap-4">
                    <Button onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} primary>Save Configuration</Button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
