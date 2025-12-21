/**
 * IglooRentalModal - Modal for viewing igloo rental requirements and renting
 * Shows rental agreement, costs, and can/can't afford status
 */

import React, { useState, useEffect } from 'react';
import { IGLOO_CONFIG } from '../config/solana.js';
import X402Service from '../wallet/X402Service.js';

const IglooRentalModal = ({ 
    isOpen, 
    onClose, 
    iglooData,
    walletAddress,
    onRentSuccess
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [canAfford, setCanAfford] = useState(null);
    const [balanceInfo, setBalanceInfo] = useState(null);
    
    const x402 = X402Service.getInstance();
    
    // Check affordability when modal opens
    useEffect(() => {
        if (isOpen && walletAddress) {
            checkAffordability();
        }
    }, [isOpen, walletAddress]);
    
    const checkAffordability = async () => {
        // TODO: Actually check token balance
        // For now, we'll check this server-side during the rent flow
        setCanAfford(true);
        setBalanceInfo({
            current: 100000, // Mock
            required: IGLOO_CONFIG.MINIMUM_BALANCE_CPW3
        });
    };
    
    const handleRent = async () => {
        if (!walletAddress) {
            setError('Please connect your wallet first');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Create payment authorization
            const paymentResult = await x402.createRentPayment(
                iglooData.iglooId,
                1, // 1 day
                IGLOO_CONFIG.DAILY_RENT_CPW3
            );
            
            if (!paymentResult.success) {
                setError(paymentResult.message || 'Failed to create payment');
                setIsLoading(false);
                return;
            }
            
            // Send to server
            const response = await fetch('/api/igloo/rent', {
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
                setError(result.message || 'Rental failed');
                setIsLoading(false);
                return;
            }
            
            // Success!
            if (onRentSuccess) {
                onRentSuccess(result);
            }
            onClose();
            
        } catch (err) {
            console.error('Rental error:', err);
            setError('An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;
    
    const isPermanent = IGLOO_CONFIG.RESERVED_IGLOOS[iglooData?.iglooId];
    const isRented = iglooData?.isRented;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden">
                {/* Header */}
                <div className="relative px-6 py-4 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        🏠 {iglooData?.iglooId?.replace('igloo', 'Igloo ')}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Status Badge */}
                    {isPermanent ? (
                        <div className="bg-purple-500/20 border border-purple-500/40 rounded-lg p-4 text-center">
                            <span className="text-purple-400 font-bold">
                                👑 Permanently Owned by {isPermanent.ownerName}
                            </span>
                        </div>
                    ) : isRented ? (
                        <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-4 text-center">
                            <span className="text-amber-400 font-bold">
                                🔑 Currently Rented by {iglooData.ownerUsername}
                            </span>
                        </div>
                    ) : (
                        <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 text-center">
                            <span className="text-green-400 font-bold">
                                ✅ Available for Rent
                            </span>
                        </div>
                    )}
                    
                    {/* Rental Agreement */}
                    {!isPermanent && !isRented && (
                        <>
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/30 pb-2">
                                    📋 Rental Agreement
                                </h3>
                                
                                <div className="space-y-2 text-sm text-slate-300">
                                    <div className="flex justify-between">
                                        <span>Daily Rent:</span>
                                        <span className="text-yellow-400 font-mono">
                                            {IGLOO_CONFIG.DAILY_RENT_CPW3.toLocaleString()} CPw3
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Minimum Balance Required:</span>
                                        <span className="text-yellow-400 font-mono">
                                            {IGLOO_CONFIG.MINIMUM_BALANCE_CPW3.toLocaleString()} CPw3
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Payment Due:</span>
                                        <span className="text-white">Every 24 hours</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Grace Period:</span>
                                        <span className="text-red-400">{IGLOO_CONFIG.GRACE_PERIOD_HOURS} hours</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Requirements */}
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                                    Requirements
                                </h3>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span>
                                        Hold {IGLOO_CONFIG.MINIMUM_BALANCE_CPW3.toLocaleString()} CPw3 (7 days rent)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span>
                                        Pay first day's rent upfront
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-yellow-400">!</span>
                                        Manual daily payment required
                                    </li>
                                </ul>
                            </div>
                            
                            {/* Affordability Status */}
                            {balanceInfo && (
                                <div className={`rounded-lg p-3 text-center ${
                                    canAfford 
                                        ? 'bg-green-500/20 border border-green-500/40' 
                                        : 'bg-red-500/20 border border-red-500/40'
                                }`}>
                                    {canAfford ? (
                                        <span className="text-green-400 font-semibold">
                                            ✅ You can afford this rental
                                        </span>
                                    ) : (
                                        <span className="text-red-400 font-semibold">
                                            ❌ Insufficient balance ({balanceInfo.current.toLocaleString()} / {balanceInfo.required.toLocaleString()} CPw3)
                                        </span>
                                    )}
                                </div>
                            )}
                            
                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-center">
                                    <span className="text-red-400">{error}</span>
                                </div>
                            )}
                            
                            {/* Rent Button */}
                            <button
                                onClick={handleRent}
                                disabled={isLoading || !canAfford || !walletAddress}
                                className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                                    isLoading || !canAfford || !walletAddress
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 shadow-lg hover:shadow-cyan-500/25'
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
                                    'Connect Wallet to Rent'
                                ) : (
                                    `🔑 Rent for ${IGLOO_CONFIG.DAILY_RENT_CPW3.toLocaleString()} CPw3/day`
                                )}
                            </button>
                            
                            <p className="text-xs text-slate-500 text-center">
                                By renting, you agree to pay daily rent manually within the grace period.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IglooRentalModal;

