import React, { useState, useEffect, useRef } from 'react';
import { PRESET_COLORS } from '../constants';

interface ColorPickerProps {
    isOpen: boolean;
    onClose: () => void;
    currentColor: string;
    onColorChange: (color: string) => void;
    anchorElement: HTMLButtonElement | null;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ isOpen, onClose, currentColor, onColorChange, anchorElement }) => {
    const [customColor, setCustomColor] = useState(currentColor);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCustomColor(currentColor.toUpperCase());
    }, [currentColor]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && pickerRef.current && !pickerRef.current.contains(event.target as Node) && anchorElement && !anchorElement.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorElement]);

    if (!isOpen) return null;

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomColor(e.target.value.toUpperCase());
    };
    
    const applyCustomColor = () => {
        if (/^#[0-9A-F]{6}$/i.test(customColor)) {
            onColorChange(customColor);
        } else {
            setCustomColor(currentColor.toUpperCase()); // Revert if invalid
        }
    };

    return (
        <div ref={pickerRef} className="absolute top-12 left-0 z-50 w-60 animate-fade-in-down">
            <div className="glass-card p-4 rounded-xl shadow-2xl">
                <p className="text-sm font-semibold text-gray-300 mb-3">Choose background color:</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {PRESET_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => onColorChange(color)}
                            className={`w-full aspect-square rounded-lg border-2 transition-transform transform hover:scale-110 ${currentColor.toLowerCase() === color.toLowerCase() ? 'border-blue-400 ring-2 ring-blue-400' : 'border-white/20'}`}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-300 block mb-2">Custom:</label>
                    <input
                        type="text"
                        value={customColor}
                        onChange={handleCustomColorChange}
                        onBlur={applyCustomColor}
                        onKeyDown={(e) => { if(e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        maxLength={7}
                        placeholder="#1A2B3C"
                        className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>
                 <p className="text-xs text-gray-500 mt-2 text-center">Current: {currentColor.toUpperCase()}</p>
            </div>
        </div>
    );
};

export default ColorPicker;