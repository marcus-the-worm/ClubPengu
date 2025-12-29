/**
 * TipNotification - Shows incoming tip notifications
 * Appears when another player sends you USDC via x402
 */

import React, { useState, useEffect } from 'react';

const TipNotification = ({ tip, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        // Animate in
        setTimeout(() => setIsVisible(true), 50);
        
        // Auto dismiss after 5 seconds
        const timeout = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 5000);
        
        return () => clearTimeout(timeout);
    }, [onClose]);
    
    if (!tip) return null;
    
    return (
        <div style={{
            ...styles.container,
            transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
            opacity: isVisible ? 1 : 0
        }}>
            <div style={styles.icon}>💸</div>
            <div style={styles.content}>
                <div style={styles.title}>
                    Tip Received!
                </div>
                <div style={styles.amount}>
                    ${tip.amountUsdc?.toFixed(2)} USDC
                </div>
                <div style={styles.from}>
                    from {tip.from?.username || 'A penguin'}
                </div>
                {tip.message && (
                    <div style={styles.message}>
                        "{tip.message}"
                    </div>
                )}
            </div>
            <button style={styles.closeBtn} onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }}>✕</button>
        </div>
    );
};

const styles = {
    container: {
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(0, 212, 170, 0.5)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        transition: 'all 0.3s ease-out',
        minWidth: '280px',
    },
    icon: {
        fontSize: '28px',
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: '12px',
        color: '#00d4aa',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '4px',
    },
    amount: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: '2px',
    },
    from: {
        fontSize: '13px',
        color: '#888',
    },
    message: {
        fontSize: '13px',
        color: '#aaa',
        fontStyle: 'italic',
        marginTop: '6px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        paddingTop: '6px',
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#666',
        fontSize: '16px',
        cursor: 'pointer',
        padding: '0',
    }
};

export default TipNotification;



