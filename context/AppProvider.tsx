import React, { useState, useEffect, useCallback } from 'react';
import { AppContext, AppContextType, AppView } from './AppContext';
import { User } from '../types';

// This is the global OTPAuth object from the script loaded in index.html
declare const OTPAuth: any;

// SECURITY WARNING: Storing the 2FA secret on the client-side is highly insecure.
// This is for demonstration purposes only and should not be used in production.
// The secret should be validated on a secure backend server.
const TWO_FACTOR_SECRET = 'NB2W45DFOFAXMZLY'; // The secret key for 'admin' user

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // API Keys
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [falAiApiKey, setFalAiApiKey] = useState('');
    const [appBackgroundColor, setAppBackgroundColor] = useState('#0D1117'); // Default
    
    // App State
    const [activeView, setActiveView] = useState<AppView>('studio');
    const [sharedDesign, setSharedDesign] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                setUser(JSON.parse(savedUser));
            }

            const savedGeminiKey = localStorage.getItem('geminiApiKey') || '';
            const savedFalAiKey = localStorage.getItem('falAiApiKey') || '';
            
            setGeminiApiKey(savedGeminiKey);
            setFalAiApiKey(savedFalAiKey);
            
            const savedBgColor = localStorage.getItem('appBackgroundColor') || '#0D1117';
            setAppBackgroundColor(savedBgColor);
            document.body.style.backgroundColor = savedBgColor;

            if (!savedUser && (!savedGeminiKey || !savedFalAiKey)) {
                setIsSettingsOpen(true);
            }
        } catch (err) {
            console.error("Failed to parse localStorage data", err);
            localStorage.clear();
        }
    }, []);

    const login = useCallback((credentials: { user: string; pass: string; token: string }) => {
        setError(null);
        // SECURITY WARNING: Hardcoded credentials. Do not use in production.
        if (credentials.user.toLowerCase() !== 'admin' || credentials.pass !== 'admin') {
            setError("Invalid username or password.");
            return;
        }

        if (typeof OTPAuth === 'undefined') {
            setError("Authentication library not loaded. Please try again.");
            return;
        }

        try {
            let totp = new OTPAuth.TOTP({
                issuer: 'AI Mockup Studio',
                label: 'admin',
                algorithm: 'SHA1',
                digits: 6,
                period: 30,
                secret: TWO_FACTOR_SECRET,
            });

            // The delta will be a number if valid, or null if invalid
            const delta = totp.validate({ token: credentials.token, window: 1 });

            if (delta === null) {
                setError("Invalid authenticator code.");
                return;
            }

            // Create a generic user object on successful login
            const userData: User = {
                name: 'Admin User',
                email: 'admin@example.com',
                picture: `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>')}`,
            };
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

        } catch(err) {
            console.error("2FA validation error:", err);
            setError("An error occurred during authentication.");
        }

    }, [setError]);

    const logout = useCallback(() => {
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    const saveConfiguration = useCallback((config: { gemini: string; falai: string; }) => {
        setGeminiApiKey(config.gemini);
        setFalAiApiKey(config.falai);
        
        localStorage.setItem('geminiApiKey', config.gemini);
        localStorage.setItem('falAiApiKey', config.falai);
        
        setIsSettingsOpen(false);
        setError(null);
    }, []);
    
    const handleSetAppBackgroundColor = useCallback((color: string) => {
        setAppBackgroundColor(color);
        localStorage.setItem('appBackgroundColor', color);
        document.body.style.backgroundColor = color;
    }, []);


    const contextValue: AppContextType = {
        user,
        login,
        logout,
        geminiApiKey,
        falAiApiKey,
        isSettingsOpen,
        setIsSettingsOpen,
        saveConfiguration,
        error,
        setError,
        appBackgroundColor,
        setAppBackgroundColor: handleSetAppBackgroundColor,
        activeView,
        setActiveView,
        sharedDesign,
        setSharedDesign,
    };

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
