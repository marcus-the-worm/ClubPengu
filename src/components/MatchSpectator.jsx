/**
 * MatchSpectator - Displays live match scoreboard for spectators
 * Shows as a floating panel at the top of the screen
 */

import React, { useEffect } from 'react';
import { useChallenge } from '../challenge';

/**
 * Single match spectator display
 */
const MatchSpectatorBubble = ({ matchData }) => {
    if (!matchData) return null;
    
    const { players, state, wagerAmount, gameType } = matchData;
    
    if (!players || players.length < 2) return null;
    
    const player1Wins = state?.player1Wins || { fire: 0, water: 0, snow: 0 };
    const player2Wins = state?.player2Wins || { fire: 0, water: 0, snow: 0 };
    
    const renderWins = (wins) => {
        const elements = [];
        if (wins.fire > 0) elements.push(...Array(Math.min(wins.fire, 3)).fill('🔥'));
        if (wins.water > 0) elements.push(...Array(Math.min(wins.water, 3)).fill('💧'));
        if (wins.snow > 0) elements.push(...Array(Math.min(wins.snow, 3)).fill('❄️'));
        return elements.length > 0 ? elements.join(' ') : '—';
    };
    
    const totalPot = (wagerAmount || 0) * 2;
    
    return (
        <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 backdrop-blur-xl rounded-2xl border-2 border-purple-400/50 shadow-2xl px-4 py-3 min-w-[240px] animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-yellow-400 text-xs font-bold">⚔️ CARD JITSU</span>
                <span className="text-purple-300 text-xs">•</span>
                <span className="text-yellow-400 text-xs font-bold">💰 {totalPot}</span>
            </div>
            
            {/* Players and Score */}
            <div className="flex items-center justify-between gap-3">
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[0]?.name || 'Player 1'}
                    </p>
                    <p className="text-sm mt-1">{renderWins(player1Wins)}</p>
                </div>
                
                <div className="text-white/60 text-lg font-bold">VS</div>
                
                <div className="text-center flex-1">
                    <p className="text-white font-bold text-xs truncate max-w-[80px]">
                        {players[1]?.name || 'Player 2'}
                    </p>
                    <p className="text-sm mt-1">{renderWins(player2Wins)}</p>
                </div>
            </div>
            
            {/* Status */}
            <div className="text-center mt-2 pt-2 border-t border-white/10">
                <span className="text-white/50 text-[10px]">Round {state?.round || 1}</span>
                {state?.phase === 'select' && (
                    <span className="text-cyan-400 text-[10px] ml-2 animate-pulse">Selecting...</span>
                )}
                {state?.phase === 'reveal' && (
                    <span className="text-yellow-400 text-[10px] ml-2">Revealing!</span>
                )}
                {state?.status === 'complete' && (
                    <span className="text-green-400 text-[10px] ml-2">Complete!</span>
                )}
            </div>
            
            {/* Last round result */}
            {state?.lastRoundResult && (
                <div className="text-center mt-1">
                    <span className="text-xs">
                        {state.lastRoundResult.player1Card?.emoji || '❓'} vs {state.lastRoundResult.player2Card?.emoji || '❓'}
                    </span>
                </div>
            )}
        </div>
    );
};

/**
 * MatchSpectatorsContainer - Renders all active match spectator bubbles
 */
export const MatchSpectatorsContainer = () => {
    const { activeMatches, spectatingMatch, isInMatch } = useChallenge();
    
    // Don't show if we're in a match ourselves
    if (isInMatch) return null;
    
    // Combine active matches with real-time spectating data
    const matchesToRender = activeMatches
        .map(match => {
            const spectateData = spectatingMatch?.[match.matchId];
            return {
                ...match,
                state: spectateData?.state || match.state || {},
                wagerAmount: spectateData?.wagerAmount || match.wagerAmount
            };
        })
        .filter(m => m.players?.length >= 2);
    
    if (matchesToRender.length === 0) return null;
    
    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 pointer-events-none">
            {matchesToRender.map(match => (
                <MatchSpectatorBubble
                    key={match.matchId}
                    matchData={match}
                />
            ))}
        </div>
    );
};

export default MatchSpectatorBubble;
