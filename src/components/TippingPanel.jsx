/**
 * TippingPanel - P2P USDC tipping interface
 * Uses x402 protocol for instant USDC transfers between players
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import X402Service from '../wallet/X402Service';
import { USDC_TOKEN_ADDRESS } from '../config/solana';

// Preset tip amounts in USDC (display value)
const PRESET_AMOUNTS = [
    { label: '$0.10', value: 100000 },   // 0.1 USDC
    { label: '$0.50', value: 500000 },   // 0.5 USDC  
    { label: '$1.00', value: 1000000 },  // 1 USDC
    { label: '$5.00', value: 5000000 },  // 5 USDC
];

const TippingPanel = ({ targetPlayer, onClose }) => {
    const { send, isAuthenticated } = useMultiplayer();
    const [amount, setAmount] = useState(100000); // Default 0.1 USDC
    const [customAmount, setCustomAmount] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState('idle'); // idle, resolving, signing, sending, success, error
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [recipientWallet, setRecipientWallet] = useState(null);
    
    // Request recipient wallet on mount
    useEffect(() => {
        if (targetPlayer?.id) {
            setStatus('resolving');
            send({
                type: 'tip_get_player_info',
                targetPlayerId: targetPlayer.id
            });
        }
    }, [targetPlayer?.id, send]);
    
    // Handle preset amount selection
    const handlePresetClick = (value) => {
        setAmount(value);
        setCustomAmount('');
    };
    
    // Handle custom amount input
    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        setCustomAmount(value);
        
        // Convert to USDC base units (6 decimals)
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && parsed > 0) {
            setAmount(Math.round(parsed * 1000000));
        }
    };
    
    // Send tip
    const handleSendTip = useCallback(async () => {
        if (!isAuthenticated) {
            setError('You must be connected to send tips');
            return;
        }
        
        if (!recipientWallet) {
            setError('Recipient is not authenticated');
            return;
        }
        
        if (amount < 100000) { // Min 0.1 USDC
            setError('Minimum tip is $0.10 USDC');
            return;
        }
        
        setStatus('signing');
        setError(null);
        
        try {
            // Create x402 payment payload
            const x402 = X402Service.getInstance();
            const payloadResult = await x402.createPaymentPayload({
                amount,
                token: USDC_TOKEN_ADDRESS,
                recipient: recipientWallet,
                memo: `tip:${targetPlayer.name || 'player'}`,
                validityMinutes: 5
            });
            
            if (!payloadResult.success) {
                setError(payloadResult.message || 'Failed to create payment');
                setStatus('error');
                return;
            }
            
            setStatus('sending');
            
            // Send to server
            send({
                type: 'tip_send',
                recipientPlayerId: targetPlayer.id,
                recipientWallet,
                amount,
                paymentPayload: payloadResult.payload,
                tipMessage: message
            });
            
        } catch (err) {
            console.error('Tip error:', err);
            setError(err.message || 'Failed to send tip');
            setStatus('error');
        }
    }, [isAuthenticated, recipientWallet, targetPlayer, amount, message, send]);
    
    // Listen for server messages
    useEffect(() => {
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Player info response (wallet resolution)
                if (data.type === 'tip_player_info') {
                    if (data.error) {
                        setError(data.message || 'Player not authenticated');
                        setStatus('error');
                    } else if (data.user?.walletAddress) {
                        setRecipientWallet(data.user.walletAddress);
                        setStatus('idle');
                    } else {
                        setError('Player is not authenticated');
                        setStatus('error');
                    }
                }
                
                // Tip result
                if (data.type === 'tip_result') {
                    if (data.success) {
                        setSuccess(`Sent $${(data.amountUsdc).toFixed(2)} USDC!`);
                        setStatus('success');
                        // Auto close after success
                        setTimeout(() => {
                            onClose?.();
                        }, 2000);
                    } else {
                        setError(data.message || data.error || 'Failed to send tip');
                        setStatus('error');
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [onClose]);
    
    // Format amount for display
    const formatUsdc = (microUsdc) => {
        return (microUsdc / 1000000).toFixed(2);
    };
    
    // Abbreviate wallet address
    const abbreviateWallet = (wallet) => {
        if (!wallet) return '';
        return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
    };
    
    if (!targetPlayer) return null;
    
    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.panel} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.title}>
                        💸 Send Tip via x402
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>✕</button>
                </div>
                
                {/* Recipient Info */}
                <div style={styles.recipient}>
                    <div style={styles.recipientName}>
                        {targetPlayer.name || 'Player'}
                    </div>
                    <div style={styles.recipientWallet}>
                        {abbreviateWallet(targetPlayer.walletAddress)}
                    </div>
                </div>
                
                {/* Amount Selection */}
                <div style={styles.section}>
                    <div style={styles.sectionLabel}>Amount (USDC)</div>
                    <div style={styles.presets}>
                        {PRESET_AMOUNTS.map(preset => (
                            <button
                                key={preset.value}
                                style={{
                                    ...styles.presetBtn,
                                    ...(amount === preset.value ? styles.presetBtnActive : {})
                                }}
                                onClick={() => handlePresetClick(preset.value)}
                                disabled={status === 'signing' || status === 'sending'}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    
                    <div style={styles.customRow}>
                        <span style={styles.dollarSign}>$</span>
                        <input
                            type="number"
                            placeholder="Custom"
                            value={customAmount}
                            onChange={handleCustomAmountChange}
                            style={styles.customInput}
                            min="0.10"
                            step="0.10"
                            disabled={status === 'signing' || status === 'sending'}
                        />
                        <span style={styles.usdcLabel}>USDC</span>
                    </div>
                </div>
                
                {/* Message (optional) */}
                <div style={styles.section}>
                    <div style={styles.sectionLabel}>Message (optional)</div>
                    <input
                        type="text"
                        placeholder="Great play! 🎉"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        style={styles.messageInput}
                        maxLength={100}
                        disabled={status === 'signing' || status === 'sending'}
                    />
                </div>
                
                {/* Status Messages */}
                {error && (
                    <div style={styles.error}>
                        ❌ {error}
                    </div>
                )}
                
                {success && (
                    <div style={styles.success}>
                        ✅ {success}
                    </div>
                )}
                
                {/* Send Button */}
                <button
                    style={{
                        ...styles.sendBtn,
                        ...(status !== 'idle' && status !== 'error' ? styles.sendBtnDisabled : {}),
                        ...(!recipientWallet && status !== 'resolving' ? styles.sendBtnDisabled : {})
                    }}
                    onClick={handleSendTip}
                    disabled={status !== 'idle' && status !== 'error' || !isAuthenticated || !recipientWallet}
                >
                    {status === 'resolving' && '⏳ Loading...'}
                    {status === 'signing' && '✍️ Sign with Wallet...'}
                    {status === 'sending' && '📤 Sending...'}
                    {status === 'success' && '✅ Sent!'}
                    {status === 'error' && '↻ Try Again'}
                    {status === 'idle' && recipientWallet && `💸 Send $${formatUsdc(amount)} USDC`}
                    {status === 'idle' && !recipientWallet && '❌ Not Authenticated'}
                </button>
                
                {/* x402 Badge */}
                <div style={styles.badge}>
                    Powered by x402 Protocol
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)'
    },
    panel: {
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 212, 170, 0.3)',
        padding: '24px',
        minWidth: '360px',
        maxWidth: '420px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    title: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#00d4aa',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#888',
        fontSize: '20px',
        cursor: 'pointer',
        padding: '4px 8px',
    },
    recipient: {
        background: 'rgba(0, 212, 170, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        textAlign: 'center',
        marginBottom: '20px',
    },
    recipientName: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '4px',
    },
    recipientWallet: {
        fontSize: '12px',
        color: '#888',
        fontFamily: 'monospace',
    },
    section: {
        marginBottom: '16px',
    },
    sectionLabel: {
        fontSize: '12px',
        color: '#888',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    presets: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        marginBottom: '12px',
    },
    presetBtn: {
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '10px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
    },
    presetBtnActive: {
        background: 'rgba(0, 212, 170, 0.3)',
        borderColor: '#00d4aa',
        color: '#00d4aa',
    },
    customRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    dollarSign: {
        color: '#888',
        fontSize: '16px',
    },
    customInput: {
        flex: 1,
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#fff',
        fontSize: '14px',
    },
    usdcLabel: {
        color: '#00d4aa',
        fontSize: '12px',
        fontWeight: 'bold',
    },
    messageInput: {
        width: '100%',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#fff',
        fontSize: '14px',
        boxSizing: 'border-box',
    },
    error: {
        background: 'rgba(255, 82, 82, 0.2)',
        border: '1px solid rgba(255, 82, 82, 0.4)',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#ff5252',
        fontSize: '13px',
        marginBottom: '12px',
    },
    success: {
        background: 'rgba(0, 212, 170, 0.2)',
        border: '1px solid rgba(0, 212, 170, 0.4)',
        borderRadius: '8px',
        padding: '10px 12px',
        color: '#00d4aa',
        fontSize: '13px',
        marginBottom: '12px',
    },
    sendBtn: {
        width: '100%',
        background: 'linear-gradient(90deg, #00d4aa 0%, #00a896 100%)',
        border: 'none',
        borderRadius: '10px',
        padding: '14px',
        color: '#000',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
        marginTop: '8px',
    },
    sendBtnDisabled: {
        background: 'rgba(255, 255, 255, 0.2)',
        color: '#888',
        cursor: 'not-allowed',
    },
    badge: {
        textAlign: 'center',
        marginTop: '16px',
        fontSize: '11px',
        color: '#666',
        letterSpacing: '1px',
    }
};

export default TippingPanel;

