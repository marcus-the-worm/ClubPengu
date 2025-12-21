/**
 * IglooEntryModal - Modal shown when trying to enter an igloo
 * Displays entry requirements and handles entry fee payments
 */

import React, { useState } from 'react';
import X402Service from '../wallet/X402Service.js';

const IglooEntryModal = ({ 
    isOpen, 
    onClose, 
    iglooData,
    entryCheck, // Result from canEnter() - { canEnter, reason, ... }
    walletAddress,
    onEntrySuccess
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const x402 = X402Service.getInstance();
    
    const handlePayEntryFee = async () => {
        if (!walletAddress) {
            setError('Please connect your wallet');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Create entry fee payment
            const paymentResult = await x402.createEntryFeePayment(
                iglooData.iglooId,
                entryCheck.paymentAmount,
                iglooData.ownerWallet
            );
            
            if (!paymentResult.success) {
                setError(paymentResult.message || 'Failed to create payment');
                setIsLoading(false);
                return;
            }
            
            // Send to server
            const response = await fetch('/api/igloo/pay-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    iglooId: iglooData.iglooId,
                    paymentPayload: paymentResult.payload
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (!result.success) {
                setError(result.message || 'Payment failed');
                setIsLoading(false);
                return;
            }
            
            // Success - can now enter
            if (onEntrySuccess) {
                onEntrySuccess();
            }
            onClose();
            
        } catch (err) {
            console.error('Entry fee error:', err);
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;
    
    const { reason, message, tokenRequired, paymentAmount, requiresPayment } = entryCheck || {};
    
    // Determine display based on denial reason
    const getReasonDisplay = () => {
        switch (reason) {
            case 'IGLOO_LOCKED':
                return {
                    icon: '🔒',
                    title: 'Igloo Locked',
                    description: 'This igloo is private. Only the owner can enter.',
                    color: 'red'
                };
            case 'TOKEN_REQUIRED':
                return {
                    icon: '🪙',
                    title: 'Token Required',
                    description: `You need to hold ${tokenRequired?.minimum || 1} ${tokenRequired?.symbol || 'tokens'} to enter.`,
                    color: 'purple'
                };
            case 'ENTRY_FEE_REQUIRED':
                return {
                    icon: '💰',
                    title: 'Entry Fee Required',
                    description: `One-time entry fee: ${paymentAmount?.toLocaleString() || 0} CPw3`,
                    color: 'yellow',
                    canPay: true
                };
            default:
                return {
                    icon: '❌',
                    title: 'Cannot Enter',
                    description: message || 'You cannot enter this igloo.',
                    color: 'red'
                };
        }
    };
    
    const display = getReasonDisplay();
    const colorClasses = {
        red: 'from-red-600/20 to-red-900/20 border-red-500/30',
        purple: 'from-purple-600/20 to-purple-900/20 border-purple-500/30',
        yellow: 'from-yellow-600/20 to-yellow-900/20 border-yellow-500/30'
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className={`relative z-10 w-full max-w-sm mx-4 bg-gradient-to-b ${colorClasses[display.color]} rounded-2xl shadow-2xl border overflow-hidden`}>
                {/* Header */}
                <div className="px-6 py-4 text-center border-b border-white/10">
                    <div className="text-4xl mb-2">{display.icon}</div>
                    <h2 className="text-xl font-bold text-white">{display.title}</h2>
                </div>
                
                {/* Content */}
                <div className="p-6 text-center space-y-4">
                    <p className="text-slate-300">{display.description}</p>
                    
                    {/* Owner Info */}
                    {iglooData?.ownerUsername && (
                        <div className="text-sm text-slate-400">
                            Owner: <span className="text-white font-medium">{iglooData.ownerUsername}</span>
                        </div>
                    )}
                    
                    {/* Token Requirement Details */}
                    {reason === 'TOKEN_REQUIRED' && tokenRequired && (
                        <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
                            <div className="text-slate-400">Token Address:</div>
                            <div className="text-purple-400 font-mono text-xs break-all">
                                {tokenRequired.address}
                            </div>
                        </div>
                    )}
                    
                    {/* Entry Fee Payment */}
                    {display.canPay && (
                        <>
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-2 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            
                            <button
                                onClick={handlePayEntryFee}
                                disabled={isLoading || !walletAddress}
                                className={`w-full py-3 rounded-lg font-bold transition-all ${
                                    isLoading || !walletAddress
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400'
                                }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : !walletAddress ? (
                                    'Connect Wallet to Pay'
                                ) : (
                                    `💰 Pay ${paymentAmount?.toLocaleString() || 0} CPw3`
                                )}
                            </button>
                            
                            <p className="text-xs text-slate-500">
                                One-time payment - you won't be charged again for this igloo.
                            </p>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        {display.canPay ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IglooEntryModal;

