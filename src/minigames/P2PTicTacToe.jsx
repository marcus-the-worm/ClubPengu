/**
 * P2PTicTacToe - Player vs Player Tic Tac Toe match
 * Real-time synchronized game with wagering
 * Mobile-optimized with landscape support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useChallenge } from '../challenge';

const P2PTicTacToe = ({ onMatchEnd }) => {
    const {
        activeMatch,
        matchState,
        playCard,
        forfeitMatch,
        clearMatch,
    } = useChallenge();
    
    const [selectedCell, setSelectedCell] = useState(null);
    const [animatingCell, setAnimatingCell] = useState(null);
    const [isLandscape, setIsLandscape] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // Detect orientation
    useEffect(() => {
        const checkLayout = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setIsLandscape(w > h);
            setIsMobile(w < 768 || h < 500);
        };
        checkLayout();
        window.addEventListener('resize', checkLayout);
        window.addEventListener('orientationchange', () => setTimeout(checkLayout, 100));
        return () => {
            window.removeEventListener('resize', checkLayout);
            window.removeEventListener('orientationchange', checkLayout);
        };
    }, []);
    
    // Handle cell click
    const handleCellClick = useCallback((index) => {
        if (!matchState || matchState.phase !== 'playing') return;
        if (!matchState.isMyTurn) return;
        if (matchState.board[index] !== null) return;
        
        setSelectedCell(index);
        setAnimatingCell(index);
        
        setTimeout(() => {
            playCard(index);
            setAnimatingCell(null);
            setSelectedCell(null);
        }, 150);
    }, [matchState, playCard]);
    
    // Handle forfeit
    const handleForfeit = () => {
        if (confirm('Are you sure you want to forfeit? You will lose your wager.')) {
            forfeitMatch();
        }
    };
    
    if (!activeMatch || !matchState) {
        return null;
    }
    
    const isPlayer1 = activeMatch.yourRole === 'player1';
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const mySymbol = isPlayer1 ? 'X' : 'O';
    const opponentSymbol = isPlayer1 ? 'O' : 'X';
    
    const isComplete = matchState.status === 'complete';
    const isDraw = matchState.winner === 'draw';
    const didWin = matchState.winner === mySymbol;
    const totalPot = activeMatch.wagerAmount * 2;
    
    const landscapeMobile = isLandscape && isMobile;
    
    // Cell sizes based on layout
    const cellSize = landscapeMobile ? 'w-14 h-14' : 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28';
    const textSize = landscapeMobile ? 'text-3xl' : 'text-4xl sm:text-5xl md:text-6xl';
    
    // Render a cell
    const renderCell = (index) => {
        const value = matchState.board[index];
        const isWinningCell = matchState.winningLine?.includes(index);
        const isClickable = matchState.isMyTurn && value === null && matchState.phase === 'playing';
        
        return (
            <button
                key={index}
                onClick={() => handleCellClick(index)}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCellClick(index);
                }}
                disabled={!isClickable}
                className={`
                    aspect-square ${cellSize}
                    flex items-center justify-center
                    ${textSize} font-bold
                    transition-all duration-200
                    select-none touch-manipulation
                    ${isWinningCell ? 'bg-green-500/30 scale-105' : 'bg-white/5'}
                    ${isClickable ? 'hover:bg-white/20 cursor-pointer active:scale-95 active:bg-white/30' : ''}
                    ${animatingCell === index ? 'scale-90' : ''}
                    ${value === 'X' ? 'text-cyan-400' : value === 'O' ? 'text-pink-400' : 'text-transparent'}
                    border border-white/20 rounded-xl
                `}
            >
                {value || (isClickable && matchState.isMyTurn ? (
                    <span className="text-white/10 text-xl">{mySymbol}</span>
                ) : '')}
            </button>
        );
    };
    
    // Landscape mobile layout
    if (landscapeMobile) {
        return (
            <div className="fixed inset-0 z-40 overflow-hidden"
                style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0d1a30 100%)' }}>
                
                {/* Compact Header */}
                <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 gap-2 z-20">
                    <button 
                        onClick={handleForfeit}
                        className="bg-red-600 active:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold"
                    >
                        FORFEIT
                    </button>
                    <span className="text-yellow-400 text-[10px] font-bold">💰 {totalPot}</span>
                    <h1 className="text-white text-xs font-bold">TIC TAC TOE</h1>
                    <span className={`text-[10px] font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
                
                {/* Main layout: opponent | board | you */}
                <div className="h-full flex items-center justify-center gap-3 px-2 pt-8 pb-2">
                    {/* Opponent */}
                    <div className={`flex flex-col items-center p-2 rounded-lg ${!matchState.isMyTurn ? 'bg-pink-500/20 border border-pink-500/50' : 'bg-black/40'}`}>
                        <span className="text-2xl font-bold text-pink-400">{opponentSymbol}</span>
                        <span className="text-white text-[10px] truncate max-w-[60px]">{opponent.name}</span>
                        {!matchState.isMyTurn && matchState.phase === 'playing' && (
                            <span className="text-pink-400 text-[8px]">Thinking...</span>
                        )}
                    </div>
                    
                    {/* Board */}
                    <div className="bg-black/40 p-2 rounded-xl">
                        <div className="grid grid-cols-3 gap-1.5">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => renderCell(index))}
                        </div>
                    </div>
                    
                    {/* You */}
                    <div className={`flex flex-col items-center p-2 rounded-lg ${matchState.isMyTurn ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-black/40'}`}>
                        <span className="text-2xl font-bold text-cyan-400">{mySymbol}</span>
                        <span className="text-white text-[10px] truncate max-w-[60px]">{myPlayer.name}</span>
                        {matchState.isMyTurn && matchState.phase === 'playing' && (
                            <span className="text-cyan-400 text-[8px]">Your turn!</span>
                        )}
                    </div>
                </div>
                
                {/* Complete overlay */}
                {isComplete && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-2">
                        <div className="bg-gray-800 rounded-xl p-4 text-center max-w-xs w-full border border-white/10">
                            <div className="text-4xl mb-2">{isDraw ? '🤝' : didWin ? '🏆' : '😢'}</div>
                            <h2 className="text-lg font-bold text-white mb-1">
                                {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                            </h2>
                            <div className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl font-bold mb-3`}>
                                {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </div>
                            <button 
                                onClick={() => { clearMatch(); onMatchEnd?.(); }}
                                className="w-full bg-cyan-500 active:bg-cyan-600 text-white py-2 rounded-lg font-bold text-sm"
                            >
                                CONTINUE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    
    // Portrait/Desktop layout
    return (
        <div className="fixed inset-0 z-40 overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0a1628 0%, #1a2a4a 50%, #0d1a30 100%)' }}>
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }} />
            </div>
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 sm:p-4 gap-2">
                <button onClick={handleForfeit} className="bg-red-600 active:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold">
                    FORFEIT
                </button>
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <span className="text-yellow-400 text-[10px] sm:text-xs font-bold">💰 {totalPot}</span>
                </div>
                <h1 className="text-white text-sm sm:text-xl font-bold flex-1 text-center">TIC TAC TOE</h1>
                <div className="bg-black/60 rounded-lg px-2 py-1 sm:px-3 sm:py-1.5">
                    <span className={`text-[10px] sm:text-xs font-bold ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                        ⏱ {matchState.turnTimeRemaining}s
                    </span>
                </div>
            </div>
            
            {/* Opponent Info */}
            <div className="absolute top-14 sm:top-20 left-1/2 -translate-x-1/2 z-10">
                <div className={`bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 border-2 transition-all ${!matchState.isMyTurn && matchState.phase === 'playing' ? 'border-pink-500 shadow-lg shadow-pink-500/30' : 'border-transparent'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-2xl sm:text-3xl font-bold text-pink-400">{opponentSymbol}</span>
                        <div className="text-left">
                            <span className="text-white font-bold text-xs sm:text-sm block truncate max-w-[100px] sm:max-w-[150px]">{opponent.name}</span>
                            <span className="text-white/50 text-[10px] sm:text-xs">
                                {!matchState.isMyTurn && matchState.phase === 'playing' ? 'Thinking...' : 'Opponent'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Board */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-4 sm:p-6 bg-black/40 rounded-2xl border border-white/10">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => (
                        <div key={index} className={cellSize}>{renderCell(index)}</div>
                    ))}
                </div>
                {matchState.phase === 'playing' && (
                    <div className="text-center mt-4">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${matchState.isMyTurn ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/10 text-white/60'}`}>
                            {matchState.isMyTurn ? `Your turn (${mySymbol})` : `${opponent.name}'s turn`}
                        </span>
                    </div>
                )}
            </div>
            
            {/* Your Info */}
            <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-10">
                <div className={`bg-black/60 rounded-xl px-4 py-2 sm:px-6 sm:py-3 border-2 transition-all ${matchState.isMyTurn && matchState.phase === 'playing' ? 'border-cyan-500 shadow-lg shadow-cyan-500/30' : 'border-transparent'}`}>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{mySymbol}</span>
                        <div className="text-left">
                            <span className="text-white font-bold text-xs sm:text-sm block truncate max-w-[100px] sm:max-w-[150px]">{myPlayer.name}</span>
                            <span className="text-white/50 text-[10px] sm:text-xs">
                                {matchState.isMyTurn && matchState.phase === 'playing' ? 'Your turn!' : 'You'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Complete overlay */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full border border-white/10 shadow-2xl">
                        <div className="text-5xl sm:text-6xl mb-4">{isDraw ? '🤝' : didWin ? '🏆' : '😢'}</div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white mb-2">
                            {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-white/60 text-sm mb-4">
                            {isDraw ? 'No one wins this round!' : didWin ? `You defeated ${opponent.name}!` : `${opponent.name} wins...`}
                        </p>
                        <div className={`${isDraw ? 'bg-gray-500/20' : didWin ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-xl p-4 mb-6 border ${isDraw ? 'border-gray-500/30' : didWin ? 'border-green-500/30' : 'border-red-500/30'}`}>
                            <p className={`${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} text-xl sm:text-2xl font-bold`}>
                                {isDraw ? 'REFUNDED' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                            </p>
                        </div>
                        <button 
                            onClick={() => { clearMatch(); onMatchEnd?.(); }}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 active:from-cyan-600 active:to-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm sm:text-base shadow-lg"
                        >
                            CONTINUE
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default P2PTicTacToe;
