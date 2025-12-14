/**
 * WagerModal - Modal for setting wager amount when challenging
 * Mobile-friendly with proper touch handling
 */

import React, { useState, useEffect, useRef } from 'react';
import { useChallenge } from '../challenge';
import GameManager from '../engine/GameManager';

const WagerModal = () => {
    const {
        showWagerModal,
        wagerGameType,
        selectedPlayer,
        closeWagerModal,
        sendChallenge
    } = useChallenge();
    
    const [wagerAmount, setWagerAmount] = useState('');
    const [error, setError] = useState('');
    const [playerCoins, setPlayerCoins] = useState(0);
    const inputRef = useRef(null);
    const modalRef = useRef(null);
    
    // Refresh coin balance from localStorage/GameManager whenever modal opens
    useEffect(() => {
        if (showWagerModal) {
            // Always get fresh balance when modal opens
            const currentCoins = GameManager.getInstance().getCoins();
            setPlayerCoins(currentCoins);
            setWagerAmount('');
            setError('');
            // Only auto-focus on desktop
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (!isMobile && inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [showWagerModal]);
    
    // Also listen for coin changes while modal is open
    useEffect(() => {
        const gm = GameManager.getInstance();
        const unsubscribe = gm.on('coinsChanged', (data) => {
            setPlayerCoins(data.coins);
        });
        return () => unsubscribe();
    }, []);
    
    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeWagerModal();
            }
        };
        
        if (showWagerModal) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [showWagerModal, closeWagerModal]);
    
    if (!showWagerModal || !selectedPlayer) return null;
    
    const gameNames = {
        'card_jitsu': 'Card Jitsu',
        'connect4': 'Connect 4',
        'pong': 'Pong',
        'tic_tac_toe': 'Tic Tac Toe'
    };
    
    const handleWagerChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        setWagerAmount(value);
        setError('');
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const amount = parseInt(wagerAmount, 10);
        
        if (!amount || amount <= 0) {
            setError('Enter a valid wager amount');
            return;
        }
        
        if (amount > playerCoins) {
            setError(`You only have ${playerCoins} coins`);
            return;
        }
        
        sendChallenge(selectedPlayer.id, wagerGameType, amount);
    };
    
    const quickAmounts = [10, 50, 100, 250];
    
    // Handle quick amount selection
    const handleQuickAmount = (amount) => {
        setWagerAmount(String(Math.min(amount, playerCoins)));
        setError('');
    };
    
    // Stop propagation to prevent closing when clicking inside modal
    const handleModalInteraction = (e) => {
        e.stopPropagation();
    };
    
    // Only close when clicking backdrop (not modal content)
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closeWagerModal();
        }
    };
    
    return (
        <div 
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in overflow-hidden"
            onClick={handleBackdropClick}
        >
            {/* Scrollable container for mobile */}
            <div 
                className="w-full h-full flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={handleBackdropClick}
            >
                <div 
                    ref={modalRef}
                    className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 shadow-2xl p-4 sm:p-6 w-full max-w-[340px] my-4 sm:my-auto flex-shrink-0"
                    onClick={handleModalInteraction}
                    onMouseDown={handleModalInteraction}
                    data-no-camera="true"
                >
                {/* Header */}
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                        ⚔️ Challenge
                    </h3>
                    <button 
                        onClick={closeWagerModal}
                        className="text-white/50 hover:text-white active:text-white transition-colors text-lg sm:text-xl w-8 h-8 flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Challenge Info */}
                <div className="bg-black/30 rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-lg sm:text-xl">
                            🐧
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-white font-medium text-sm sm:text-base truncate">{selectedPlayer.name}</p>
                            <p className="text-white/50 text-xs sm:text-sm">{gameNames[wagerGameType] || wagerGameType}</p>
                        </div>
                    </div>
                </div>
                
                {/* Balance */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
                    <span className="text-white/60 text-xs sm:text-sm">Your Balance</span>
                    <span className="text-yellow-400 font-bold text-sm sm:text-base">💰 {playerCoins}</span>
                </div>
                
                {/* Wager Input */}
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="block text-white/70 text-xs sm:text-sm mb-1.5 sm:mb-2">
                            Wager Amount
                        </label>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={wagerAmount}
                                onChange={handleWagerChange}
                                placeholder="0"
                                className="w-full bg-black/40 border border-white/20 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-white text-base sm:text-lg font-bold placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                            <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-white/50 text-xs sm:text-sm">
                                coins
                            </span>
                        </div>
                        {error && (
                            <p className="text-red-400 text-xs sm:text-sm mt-1.5 sm:mt-2">{error}</p>
                        )}
                    </div>
                    
                    {/* Quick amounts */}
                    <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        {quickAmounts.map(amount => (
                            <button
                                key={amount}
                                type="button"
                                onClick={() => handleQuickAmount(amount)}
                                disabled={amount > playerCoins}
                                className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                                    amount > playerCoins
                                        ? 'bg-gray-700 text-white/30 cursor-not-allowed'
                                        : 'bg-white/10 text-white hover:bg-white/20 active:bg-white/30'
                                }`}
                            >
                                {amount}
                            </button>
                        ))}
                    </div>
                    
                    {/* All-in button */}
                    <button
                        type="button"
                        onClick={() => handleQuickAmount(playerCoins)}
                        className="w-full py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 active:bg-yellow-500/40 transition-colors mb-3 sm:mb-4 active:scale-[0.98]"
                    >
                        ALL IN ({playerCoins} coins)
                    </button>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={closeWagerModal}
                            className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-white text-sm sm:text-base bg-gray-600 hover:bg-gray-500 active:bg-gray-400 transition-colors active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 sm:py-3 rounded-xl font-bold text-white text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 active:from-green-600 active:to-emerald-700 transition-all active:scale-95"
                        >
                            Send Challenge
                        </button>
                    </div>
                </form>
                
                {/* Info */}
                <p className="text-white/40 text-[10px] sm:text-xs text-center mt-3 sm:mt-4">
                    Winner takes all • 5 min to respond
                </p>
            </div>
            </div>{/* Close scrollable container */}
        </div>
    );
};

export default WagerModal;
