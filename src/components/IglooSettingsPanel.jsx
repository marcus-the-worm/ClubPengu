/**
 * IglooSettingsPanel - Owner control panel for igloo settings
 * Manage access control, entry fees, token gates, and banner customization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IGLOO_BANNER_STYLES } from '../config/roomConfig.js';
import { useIgloo } from '../igloo/IglooContext.jsx';
import { payIglooRent } from '../wallet/SolanaPayment.js';
import { RENT_WALLET_ADDRESS, CPW3_TOKEN_ADDRESS, IGLOO_CONFIG } from '../config/solana.js';

// Tokens for Token Gate (community/meme tokens that make sense for holder gating)
const TOKEN_GATE_TOKENS = [
    { 
        symbol: '$CPw3', 
        name: 'Club Penguin',
        address: '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump'
    },
    { 
        symbol: 'BONK', 
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    },
    { 
        symbol: '$MARCUS', 
        name: 'Marcus',
        address: 'qsh1EJb3naDChaCS49nSNyMiTpXcCus8KcKAE17pump'
    }
];

// Tokens for Entry Fee (includes stables and SOL for payments)
const ENTRY_FEE_TOKENS = [
    { 
        symbol: '$CPw3', 
        name: 'Club Penguin',
        address: '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump'
    },
    { 
        symbol: 'BONK', 
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    },
    { 
        symbol: '$MARCUS', 
        name: 'Marcus',
        address: 'qsh1EJb3naDChaCS49nSNyMiTpXcCus8KcKAE17pump'
    },
    { 
        symbol: 'SOL', 
        name: 'Wrapped SOL',
        address: 'So11111111111111111111111111111111111111112'
    },
    { 
        symbol: 'USDC', 
        name: 'USD Coin',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    },
    { 
        symbol: 'USDT', 
        name: 'Tether',
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    }
];

/**
 * TokenQuickSelect - Renders quick-fill buttons for tokens
 */
const TokenQuickSelect = ({ tokens, onSelect, currentAddress }) => (
    <div className="flex flex-wrap gap-1 mb-2">
        {tokens.map((token) => (
            <button
                key={token.address}
                type="button"
                onClick={() => onSelect(token.address, token.symbol)}
                className={`px-2 py-1 text-[10px] rounded transition-all ${
                    currentAddress === token.address
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
                title={`${token.name}\n${token.address}`}
            >
                {token.symbol}
            </button>
        ))}
    </div>
);

const IglooSettingsPanel = ({ 
    isOpen, 
    onClose, 
    iglooData,
    onSave
}) => {
    const { updateSettings: sendSettings, payRent: sendPayRent, isLoading: contextLoading } = useIgloo();
    
    const [settings, setSettings] = useState({
        accessType: 'private',
        tokenGate: {
            enabled: false,
            tokenAddress: '',
            tokenSymbol: '',
            minimumBalance: 1
        },
        entryFee: {
            enabled: false,
            amount: 0,
            tokenAddress: '',
            tokenSymbol: ''
        },
        banner: {
            title: '',
            ticker: '',
            shill: '',
            styleIndex: 0
        }
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('access');
    const [isPayingRent, setIsPayingRent] = useState(false);
    const [rentPaymentSuccess, setRentPaymentSuccess] = useState(false);
    
    // Load existing settings - ensure all values are non-null for controlled inputs
    useEffect(() => {
        if (iglooData) {
            setSettings({
                accessType: iglooData.accessType || 'private',
                tokenGate: {
                    enabled: iglooData.tokenGate?.enabled || false,
                    tokenAddress: iglooData.tokenGate?.tokenAddress || '',
                    tokenSymbol: iglooData.tokenGate?.tokenSymbol || '',
                    minimumBalance: iglooData.tokenGate?.minimumBalance || 1
                },
                entryFee: {
                    enabled: iglooData.entryFee?.enabled || false,
                    amount: iglooData.entryFee?.amount || 0,
                    tokenAddress: iglooData.entryFee?.tokenAddress || '',
                    tokenSymbol: iglooData.entryFee?.tokenSymbol || ''
                },
                banner: {
                    title: iglooData.banner?.title || '',
                    ticker: iglooData.banner?.ticker || '',
                    shill: iglooData.banner?.shill || '',
                    styleIndex: iglooData.banner?.styleIndex || 0
                }
            });
        }
    }, [iglooData]);
    
    // Watch for context loading to change (indicates save completed)
    useEffect(() => {
        if (!contextLoading && isSaving) {
            setIsSaving(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        }
    }, [contextLoading, isSaving]);
    
    const handleSave = useCallback(() => {
        if (!iglooData?.iglooId) {
            setError('No igloo selected');
            return;
        }
        
        setIsSaving(true);
        setError(null);
        setSuccess(false);
        
        // Use WebSocket via IglooContext
        console.log('🏠 Saving igloo settings:', settings);
        sendSettings(iglooData.iglooId, settings);
        
        // Callback for parent component
        if (onSave) {
            onSave({ ...iglooData, ...settings });
        }
    }, [iglooData, settings, sendSettings, onSave]);
    
    /**
     * Handle rent payment for past due igloos
     */
    const handlePayRent = useCallback(async () => {
        if (!iglooData?.iglooId) {
            setError('No igloo selected');
            return;
        }
        
        setIsPayingRent(true);
        setError(null);
        setRentPaymentSuccess(false);
        
        try {
            console.log('💰 Starting rent payment...');
            console.log(`   Igloo: ${iglooData.iglooId}`);
            console.log(`   Amount: ${IGLOO_CONFIG.DAILY_RENT_CPW3} CPw3`);
            
            // Step 1: Send the Solana transaction
            const paymentResult = await payIglooRent(
                iglooData.iglooId,
                IGLOO_CONFIG.DAILY_RENT_CPW3,
                RENT_WALLET_ADDRESS,
                CPW3_TOKEN_ADDRESS
            );
            
            if (!paymentResult.success) {
                throw new Error(paymentResult.message || 'Payment failed');
            }
            
            console.log('✅ Rent payment transaction sent:', paymentResult.signature);
            
            // Step 2: Send to server for verification
            sendPayRent(iglooData.iglooId, paymentResult.signature);
            setRentPaymentSuccess(true);
            
        } catch (err) {
            console.error('❌ Rent payment error:', err);
            setError(err.message || 'Rent payment failed');
        } finally {
            setIsPayingRent(false);
        }
    }, [iglooData, sendPayRent]);
    
    if (!isOpen) return null;
    
    // Check if we have full igloo data (not just the ID)
    const isDataLoading = !iglooData?.accessType && !iglooData?.ownerWallet;
    
    const tabs = [
        { id: 'access', label: '🔐 Access', icon: '🔐' },
        { id: 'banner', label: '🎨 Banner', icon: '🎨' },
        { id: 'rent', label: '💰 Rent Info', icon: '💰' }
    ];
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="relative px-6 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10 shrink-0">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        ⚙️ Igloo Settings
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {iglooData?.iglooId?.replace('igloo', 'Igloo ')}
                        {isDataLoading && <span className="ml-2 animate-pulse">Loading...</span>}
                    </p>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-700 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/10'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Access Tab */}
                    {activeTab === 'access' && (
                        <div className="space-y-4">
                            {/* Access Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Access Type
                                </label>
                                <select
                                    value={settings.accessType}
                                    onChange={(e) => setSettings({...settings, accessType: e.target.value})}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="private">🔒 Private (Owner Only)</option>
                                    <option value="public">🌐 Public (Anyone)</option>
                                    <option value="token">🪙 Token Gated</option>
                                    <option value="fee">💰 Entry Fee</option>
                                    <option value="both">🪙💰 Token + Fee</option>
                                </select>
                            </div>
                            
                            {/* Token Gate Settings */}
                            {(settings.accessType === 'token' || settings.accessType === 'both') && (
                                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-purple-400">Token Gate Settings</h4>
                                    
                                    {/* Quick Token Select */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quick Select</label>
                                        <TokenQuickSelect 
                                            tokens={TOKEN_GATE_TOKENS}
                                            currentAddress={settings.tokenGate.tokenAddress}
                                            onSelect={(address, symbol) => setSettings({
                                                ...settings,
                                                tokenGate: {
                                                    ...settings.tokenGate,
                                                    tokenAddress: address,
                                                    tokenSymbol: symbol,
                                                    enabled: true
                                                }
                                            })}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Token Address</label>
                                        <input
                                            type="text"
                                            value={settings.tokenGate.tokenAddress ?? ''}
                                            onChange={(e) => setSettings({
                                                ...settings, 
                                                tokenGate: {...settings.tokenGate, tokenAddress: e.target.value.replace(/\s/g, '')}
                                            })}
                                            placeholder="Token contract address..."
                                            className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Symbol</label>
                                            <input
                                                type="text"
                                                value={settings.tokenGate.tokenSymbol ?? ''}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    tokenGate: {...settings.tokenGate, tokenSymbol: e.target.value}
                                                })}
                                                placeholder="$TOKEN"
                                                maxLength={10}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Min Balance</label>
                                            <input
                                                type="number"
                                                value={settings.tokenGate.minimumBalance ?? 1}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    tokenGate: {...settings.tokenGate, minimumBalance: parseInt(e.target.value) || 1}
                                                })}
                                                min={1}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Entry Fee Settings */}
                            {(settings.accessType === 'fee' || settings.accessType === 'both') && (
                                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-yellow-400">Entry Fee Settings</h4>
                                    
                                    {/* Quick Token Select */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quick Select</label>
                                        <TokenQuickSelect 
                                            tokens={ENTRY_FEE_TOKENS}
                                            currentAddress={settings.entryFee.tokenAddress}
                                            onSelect={(address, symbol) => setSettings({
                                                ...settings,
                                                entryFee: {
                                                    ...settings.entryFee,
                                                    tokenAddress: address,
                                                    tokenSymbol: symbol,
                                                    enabled: true
                                                }
                                            })}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Token Contract Address</label>
                                        <input
                                            type="text"
                                            value={settings.entryFee.tokenAddress ?? ''}
                                            onChange={(e) => setSettings({
                                                ...settings, 
                                                entryFee: {...settings.entryFee, tokenAddress: e.target.value.replace(/\s/g, ''), enabled: true}
                                            })}
                                            placeholder="Token contract address..."
                                            className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Token Symbol</label>
                                            <input
                                                type="text"
                                                value={settings.entryFee.tokenSymbol ?? ''}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    entryFee: {...settings.entryFee, tokenSymbol: e.target.value, enabled: true}
                                                })}
                                                placeholder="$TOKEN"
                                                maxLength={10}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Fee Amount</label>
                                            <input
                                                type="number"
                                                value={settings.entryFee.amount ?? 0}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    entryFee: {...settings.entryFee, amount: parseInt(e.target.value) || 0, enabled: true}
                                                })}
                                                min={0}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500">
                                        One-time payment per visitor (resets if you change settings)
                                    </p>
                                </div>
                            )}
                            
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-xs text-blue-400">
                                    💡 Entry fees are paid directly to your wallet via x402 protocol.
                                    Token gates check visitor balance at entry.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Banner Tab */}
                    {activeTab === 'banner' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Banner Title
                                </label>
                                <input
                                    type="text"
                                    value={settings.banner.title ?? ''}
                                    onChange={(e) => setSettings({
                                        ...settings, 
                                        banner: {...settings.banner, title: e.target.value}
                                    })}
                                    placeholder="My Cool Igloo"
                                    maxLength={30}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Ticker Symbol
                                </label>
                                <input
                                    type="text"
                                    value={settings.banner.ticker ?? ''}
                                    onChange={(e) => setSettings({
                                        ...settings, 
                                        banner: {...settings.banner, ticker: e.target.value}
                                    })}
                                    placeholder="$TOKEN"
                                    maxLength={10}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Description / Shill
                                </label>
                                <input
                                    type="text"
                                    value={settings.banner.shill ?? ''}
                                    onChange={(e) => setSettings({
                                        ...settings, 
                                        banner: {...settings.banner, shill: e.target.value}
                                    })}
                                    placeholder="Join our community!"
                                    maxLength={50}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Banner Style
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {IGLOO_BANNER_STYLES.slice(0, 8).map((style, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSettings({
                                                ...settings,
                                                banner: {...settings.banner, styleIndex: idx}
                                            })}
                                            className={`h-12 rounded-lg border-2 transition-all ${
                                                settings.banner.styleIndex === idx
                                                    ? 'border-white scale-105'
                                                    : 'border-transparent hover:border-white/50'
                                            }`}
                                            style={{
                                                background: `linear-gradient(180deg, ${style.bgGradient[0]}, ${style.bgGradient[2]})`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            {/* Preview */}
                            <div className="bg-slate-700/50 rounded-lg p-4">
                                <p className="text-xs text-slate-400 mb-2">Preview:</p>
                                <div 
                                    className="rounded-lg p-3 text-center"
                                    style={{
                                        background: `linear-gradient(180deg, ${IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.bgGradient[0] || '#333'}, ${IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.bgGradient[2] || '#111'})`
                                    }}
                                >
                                    <div className="text-lg font-bold" style={{ color: IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.textColor || '#fff' }}>
                                        {settings.banner.title || 'Your Igloo'}
                                    </div>
                                    {settings.banner.ticker && (
                                        <div className="text-sm font-mono" style={{ color: IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.accentColor || '#0ff' }}>
                                            {settings.banner.ticker}
                                        </div>
                                    )}
                                    {settings.banner.shill && (
                                        <div className="text-xs mt-1 opacity-80" style={{ color: IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.textColor || '#fff' }}>
                                            {settings.banner.shill}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Rent Info Tab */}
                    {activeTab === 'rent' && (
                        <div className="space-y-4">
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Status:</span>
                                    <span className={`font-semibold ${
                                        iglooData?.rentStatus === 'current' ? 'text-green-400' :
                                        iglooData?.rentStatus === 'grace_period' ? 'text-amber-400' :
                                        'text-red-400'
                                    }`}>
                                        {iglooData?.rentStatus === 'current' ? '✅ Rent Paid' :
                                         iglooData?.rentStatus === 'grace_period' ? '⚠️ Payment Due' :
                                         '❌ Overdue'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Next Payment Due:</span>
                                    <span className={`${iglooData?.isReserved ? 'text-purple-400' : 'text-white'}`}>
                                        {iglooData?.isReserved 
                                            ? '✨ Pre-Paid' 
                                            : iglooData?.rentDueDate 
                                            ? new Date(iglooData.rentDueDate).toLocaleString()
                                            : 'N/A'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total Rent Paid:</span>
                                    <span className="text-yellow-400 font-mono">
                                        {iglooData?.stats?.totalRentPaid?.toLocaleString() || 0} CPw3
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total Visitors:</span>
                                    <span className="text-white">
                                        {iglooData?.stats?.uniqueVisitors || 0}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Entry Fees Collected:</span>
                                    <span className="text-green-400 font-mono">
                                        {iglooData?.stats?.totalEntryFeesCollected?.toLocaleString() || 0} {iglooData?.entryFee?.tokenSymbol || 'tokens'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Rent Payment Required Warning */}
                            {(iglooData?.rentStatus === 'grace_period' || iglooData?.rentStatus === 'overdue') && (
                                <div className={`border rounded-lg p-4 ${
                                    iglooData?.rentStatus === 'overdue' 
                                        ? 'bg-red-500/20 border-red-500/40' 
                                        : 'bg-amber-500/20 border-amber-500/40'
                                }`}>
                                    <p className={`font-semibold ${
                                        iglooData?.rentStatus === 'overdue' ? 'text-red-400' : 'text-amber-400'
                                    }`}>
                                        {iglooData?.rentStatus === 'overdue' 
                                            ? '🚨 RENT OVERDUE - Eviction Imminent!' 
                                            : '⚠️ Rent Payment Required!'}
                                    </p>
                                    <p className="text-sm text-slate-300 mt-1">
                                        {iglooData?.rentStatus === 'overdue'
                                            ? 'Pay immediately to keep your igloo!'
                                            : 'Pay your daily rent to avoid eviction. You have 12 hours after due date.'}
                                    </p>
                                    
                                    {/* Rent Payment Success Message */}
                                    {rentPaymentSuccess && (
                                        <div className="mt-3 p-2 bg-green-500/20 border border-green-500/40 rounded text-green-400 text-sm">
                                            ✅ Rent payment submitted! Refreshing...
                                        </div>
                                    )}
                                    
                                    {/* Pay Rent Button */}
                                    <button
                                        onClick={handlePayRent}
                                        disabled={isPayingRent || rentPaymentSuccess}
                                        className={`mt-3 w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                                            isPayingRent || rentPaymentSuccess
                                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400'
                                        }`}
                                    >
                                        {isPayingRent 
                                            ? '⏳ Processing Payment...' 
                                            : rentPaymentSuccess 
                                                ? '✅ Payment Sent!'
                                                : `💰 Pay Rent (${IGLOO_CONFIG.DAILY_RENT_CPW3.toLocaleString()} CPw3)`}
                                    </button>
                                </div>
                            )}
                            
                            {/* Rent is current - show status */}
                            {iglooData?.rentStatus === 'current' && (
                                <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4">
                                    <p className="text-green-400 font-semibold">✅ Rent Status: Current</p>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Your rent is paid. Next payment due: {iglooData?.rentDueDate ? new Date(iglooData.rentDueDate).toLocaleString() : 'Unknown'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 shrink-0">
                    {/* Status Messages */}
                    {error && (
                        <div className="mb-3 text-center text-red-400 text-sm">
                            ❌ {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-3 text-center text-green-400 text-sm">
                            ✅ Settings saved successfully!
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 px-4 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                                isSaving
                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
                            }`}
                        >
                            {isSaving ? 'Saving...' : '💾 Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IglooSettingsPanel;


