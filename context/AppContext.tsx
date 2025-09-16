import React, { createContext, useContext } from 'react';
import { User } from '../types';

export type AppView = 'studio' | 'remix' | 'redesign' | 'seedream';

export interface AppContextType {
    user: User | null;
    login: (credentials: { user: string; pass: string; token: string }) => void;
    logout: () => void;
    
    geminiApiKey: string;
    falAiApiKey: string;
    
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
    saveConfiguration: (config: { gemini: string; falai: string; }) => void;
    
    error: string | null;
    setError: (message: string | null) => void;

    appBackgroundColor: string;
    setAppBackgroundColor: (color: string) => void;

    activeView: AppView;
    setActiveView: (view: AppView) => void;

    sharedDesign: string | null;
    setSharedDesign: (design: string | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
