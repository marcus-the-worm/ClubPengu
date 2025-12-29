/**
 * PromoRedemption Model - Audit trail for all promo code usage
 * AUDIT CRITICAL - Never delete, only add
 */

import mongoose from 'mongoose';

const promoRedemptionSchema = new mongoose.Schema({
    // ========== WHO REDEEMED ==========
    walletAddress: {
        type: String,
        required: true,
        index: true
    },
    username: String,  // Username at time of redemption (for historical reference)
    
    // ========== WHAT CODE ==========
    promoCodeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PromoCode',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        uppercase: true
    },  // Store actual code for historical reference (even if code is deleted)
    codeName: String,  // Name of code at time of redemption
    
    // ========== WHAT WAS UNLOCKED ==========
    unlockedItems: {
        mounts: [String],
        cosmetics: [String],
        characters: [String],
        coins: {
            type: Number,
            default: 0
        }
    },
    
    // ========== CONTEXT ==========
    ipAddress: String,
    sessionId: String,
    playerId: String,  // WebSocket player ID at time of redemption
    
    // ========== STATUS ==========
    status: {
        type: String,
        enum: ['success', 'already_redeemed', 'expired', 'invalid', 'max_reached'],
        default: 'success',
        index: true
    },
    
    // ========== TRANSACTION REFERENCE ==========
    // If coins were awarded, link to the transaction
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }

}, {
    timestamps: true  // createdAt = redemption time
});

// ==================== INDEXES ====================
promoRedemptionSchema.index({ walletAddress: 1, promoCodeId: 1 });  // Check if already redeemed
promoRedemptionSchema.index({ walletAddress: 1, code: 1 });  // Alternative lookup
promoRedemptionSchema.index({ createdAt: -1 });  // Recent redemptions

// ==================== STATICS ====================

/**
 * Check if a wallet has already redeemed a specific code
 */
promoRedemptionSchema.statics.hasRedeemed = async function(walletAddress, promoCodeId) {
    const existing = await this.findOne({
        walletAddress,
        promoCodeId,
        status: 'success'
    });
    return !!existing;
};

/**
 * Check if a wallet has redeemed by code string
 */
promoRedemptionSchema.statics.hasRedeemedCode = async function(walletAddress, code) {
    const existing = await this.findOne({
        walletAddress,
        code: code.toUpperCase(),
        status: 'success'
    });
    return !!existing;
};

/**
 * Get redemption history for a wallet
 */
promoRedemptionSchema.statics.getHistoryForWallet = function(walletAddress, limit = 50) {
    return this.find({ walletAddress, status: 'success' })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Get all redemptions for a promo code (admin)
 */
promoRedemptionSchema.statics.getRedemptionsForCode = function(promoCodeId, limit = 100) {
    return this.find({ promoCodeId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Record a redemption attempt
 */
promoRedemptionSchema.statics.recordRedemption = async function(data) {
    const redemption = new this({
        walletAddress: data.walletAddress,
        username: data.username,
        promoCodeId: data.promoCodeId,
        code: data.code.toUpperCase(),
        codeName: data.codeName,
        unlockedItems: data.unlockedItems || {},
        ipAddress: data.ipAddress,
        sessionId: data.sessionId,
        playerId: data.playerId,
        status: data.status || 'success',
        transactionId: data.transactionId
    });
    
    return redemption.save();
};

/**
 * Get codes redeemed by a wallet (just the code strings)
 */
promoRedemptionSchema.statics.getRedeemedCodesList = async function(walletAddress) {
    const redemptions = await this.find({ 
        walletAddress, 
        status: 'success' 
    }).select('code codeName createdAt');
    
    return redemptions.map(r => ({
        code: r.code,
        name: r.codeName,
        redeemedAt: r.createdAt
    }));
};

const PromoRedemption = mongoose.model('PromoRedemption', promoRedemptionSchema);

export default PromoRedemption;




