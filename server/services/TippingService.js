/**
 * TippingService - P2P USDC tipping via x402 protocol
 * This uses the actual x402 facilitator for USDC transfers
 */

import x402Service from './X402Service.js';
import User from '../db/models/User.js';

// ==================== CONFIGURATION ====================
const MIN_TIP_USDC = parseInt(process.env.MIN_TIP_USDC || '100000'); // 0.1 USDC (6 decimals)
const MAX_TIP_USDC = parseInt(process.env.MAX_TIP_USDC || '100000000'); // 100 USDC

// Tip history storage (in production, use MongoDB)
const tipHistory = new Map();

class TippingService {
    constructor() {
        this.minTip = MIN_TIP_USDC;
        this.maxTip = MAX_TIP_USDC;
    }
    
    /**
     * Get user info for tipping display
     */
    async getUserInfo(walletAddress) {
        const user = await User.findOne({ walletAddress });
        return {
            walletAddress,
            username: user?.username || `Penguin${walletAddress.slice(0, 6)}`,
            avatar: user?.avatar || 'default'
        };
    }
    
    /**
     * Validate tip amount
     */
    validateTipAmount(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return { valid: false, error: 'INVALID_AMOUNT', message: 'Invalid tip amount' };
        }
        
        if (amount < this.minTip) {
            return { 
                valid: false, 
                error: 'TIP_TOO_SMALL', 
                message: `Minimum tip is ${(this.minTip / 1000000).toFixed(2)} USDC`,
                minimum: this.minTip
            };
        }
        
        if (amount > this.maxTip) {
            return { 
                valid: false, 
                error: 'TIP_TOO_LARGE', 
                message: `Maximum tip is ${(this.maxTip / 1000000).toFixed(2)} USDC`,
                maximum: this.maxTip
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Verify tip payment payload
     */
    async verifyTip(senderWallet, recipientWallet, amount, paymentPayload) {
        // Validate amount
        const amountValidation = this.validateTipAmount(amount);
        if (!amountValidation.valid) {
            return { success: false, ...amountValidation };
        }
        
        // Verify payment using x402 service
        const verification = await x402Service.verifyPayload(paymentPayload, {
            amount,
            recipient: recipientWallet
        });
        
        if (!verification.valid) {
            return { success: false, error: verification.error, message: verification.message };
        }
        
        return { success: true, verification };
    }
    
    /**
     * Process tip payment via x402
     * This settles the USDC transfer through the x402 facilitator
     */
    async processTip(senderWallet, recipientWallet, amount, paymentPayload, message = '') {
        // Verify the tip first
        const verifyResult = await this.verifyTip(senderWallet, recipientWallet, amount, paymentPayload);
        if (!verifyResult.success) {
            return verifyResult;
        }
        
        // Settle via x402 facilitator
        const settlement = await x402Service.settlePayment(paymentPayload);
        
        if (!settlement.success) {
            return { success: false, error: settlement.error, message: settlement.message };
        }
        
        // Record the tip
        const tipRecord = {
            id: `tip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            sender: senderWallet,
            recipient: recipientWallet,
            amount,
            amountUsdc: amount / 1000000, // Convert to human-readable
            message,
            transactionHash: settlement.transactionHash,
            timestamp: new Date().toISOString()
        };
        
        // Store tip history
        this._recordTip(tipRecord);
        
        console.log(`💸 Tip processed: ${(amount / 1000000).toFixed(2)} USDC from ${senderWallet.slice(0, 8)}... to ${recipientWallet.slice(0, 8)}...`);
        
        return {
            success: true,
            tipId: tipRecord.id,
            transactionHash: settlement.transactionHash,
            amountUsdc: tipRecord.amountUsdc
        };
    }
    
    /**
     * Get recent tips sent by a user
     */
    getTipsSent(walletAddress, limit = 10) {
        const key = `sent_${walletAddress}`;
        const tips = tipHistory.get(key) || [];
        return tips.slice(0, limit);
    }
    
    /**
     * Get recent tips received by a user
     */
    getTipsReceived(walletAddress, limit = 10) {
        const key = `received_${walletAddress}`;
        const tips = tipHistory.get(key) || [];
        return tips.slice(0, limit);
    }
    
    /**
     * Record tip in history
     */
    _recordTip(tipRecord) {
        // Record for sender
        const senderKey = `sent_${tipRecord.sender}`;
        const senderTips = tipHistory.get(senderKey) || [];
        senderTips.unshift(tipRecord);
        if (senderTips.length > 50) senderTips.pop();
        tipHistory.set(senderKey, senderTips);
        
        // Record for recipient
        const recipientKey = `received_${tipRecord.recipient}`;
        const recipientTips = tipHistory.get(recipientKey) || [];
        recipientTips.unshift(tipRecord);
        if (recipientTips.length > 50) recipientTips.pop();
        tipHistory.set(recipientKey, recipientTips);
    }
}

// Export singleton instance
const tippingService = new TippingService();
export default tippingService;


