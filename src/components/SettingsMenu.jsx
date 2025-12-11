/**
 * SettingsMenu - Game settings panel
 * Left/right handed mode and camera sensitivity
 */

import React, { useEffect, useRef } from 'react';

const SettingsMenu = ({ isOpen, onClose, settings, onSettingsChange }) => {
    const menuRef = useRef(null);
    
    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;
        
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;
    
    const handleToggle = (key) => {
        onSettingsChange({ ...settings, [key]: !settings[key] });
    };
    
    const handleSlider = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div 
                ref={menuRef}
                className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-2xl border border-white/10 shadow-2xl p-4 w-full max-w-[320px] animate-fade-in"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>⚙️</span>
                        <span>Settings</span>
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white active:text-white transition-colors w-8 h-8 flex items-center justify-center text-lg"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Settings List */}
                <div className="space-y-3">
                    {/* Left-Handed Mode */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 mr-3">
                                <h3 className="text-white font-medium text-sm">Left-Handed Mode</h3>
                                <p className="text-white/50 text-[11px] mt-0.5">
                                    Swap joystick to right side
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggle('leftHanded')}
                                className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
                                    settings.leftHanded ? 'bg-green-500' : 'bg-gray-600'
                                }`}
                            >
                                <div 
                                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                                        settings.leftHanded ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                        
                        {/* Visual preview */}
                        <div className="mt-2 flex items-center justify-center gap-3 py-2 bg-black/20 rounded-lg">
                            <div className={`flex flex-col items-center transition-opacity ${settings.leftHanded ? 'opacity-40' : 'opacity-100'}`}>
                                <div className="w-7 h-7 rounded-full border-2 border-cyan-400/60 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-cyan-400/80" />
                                </div>
                                <span className="text-[9px] text-white/50 mt-1">Move</span>
                            </div>
                            <div className="text-white/20 text-[10px]">⟷</div>
                            <div className={`flex flex-col items-center transition-opacity ${settings.leftHanded ? 'opacity-100' : 'opacity-40'}`}>
                                <div className="w-7 h-7 rounded-full border-2 border-cyan-400/60 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-cyan-400/80" />
                                </div>
                                <span className="text-[9px] text-white/50 mt-1">Move</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Camera Sensitivity */}
                    <div className="bg-black/30 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-white font-medium text-sm">Camera Sensitivity</h3>
                            <span className="text-yellow-400 text-xs font-mono bg-black/30 px-2 py-0.5 rounded">
                                {(settings.cameraSensitivity || 0.3).toFixed(1)}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.1"
                            value={settings.cameraSensitivity || 0.3}
                            onChange={(e) => handleSlider('cameraSensitivity', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                        />
                        <div className="flex justify-between text-[10px] text-white/40 mt-1">
                            <span>Slow</span>
                            <span>Fast</span>
                        </div>
                    </div>
                </div>
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 active:from-cyan-600 active:to-blue-600 text-white rounded-xl font-medium text-sm transition-all"
                >
                    Done
                </button>
            </div>
        </div>
    );
};

export default SettingsMenu;

