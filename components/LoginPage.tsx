
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { IconCog } from '../constants';
import Button from './Button';

const LoginPage: React.FC = () => {
    const { login, setIsSettingsOpen, setError } = useAppContext();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || !token) {
            setError("Please fill in all fields.");
            return;
        }
        if (token.length !== 6 || !/^\d{6}$/.test(token)) {
            setError("Authenticator code must be 6 digits.");
            return;
        }
        login({ user: username, pass: password, token });
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-sm text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter">
                    AI Mockup <span className="gradient-text">Studio</span>
                </h1>
                <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
                    Sign in to continue to the studio.
                </p>

                <form onSubmit={handleLogin} className="mt-12 flex flex-col items-center justify-center gap-4">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        aria-label="Username"
                    />
                     <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        aria-label="Password"
                    />
                    <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="6-Digit Authenticator Code"
                        maxLength={6}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-center tracking-[0.5em]"
                        aria-label="Authenticator Code"
                    />
                    <Button type="submit" primary className="w-full mt-2 py-3 text-base">Login</Button>
                </form>

                <div className="mt-8">
                     <button onClick={() => setIsSettingsOpen(true)} className="flex items-center justify-center w-full gap-2 text-gray-500 hover:text-white transition-colors text-sm" title="API Key Settings">
                        <IconCog />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
            <footer className="fixed bottom-4 left-4 text-gray-600 text-sm">
                &copy; 2025 HoangLeo
            </footer>
        </div>
    );
};

export default LoginPage;