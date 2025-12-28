/**
 * GachaRoll Model - Audit log for all gacha rolls
 * Records every roll for analytics, provably fair verification, and refund tracking
 */

import mongoose from 'mongoose';

const gachaRollSchema = new mongoose.Schema({
    // ========== IDENTITY ==========
    rollId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    ownerId: { 
        type: String, 
        required: true, 
        index: true  // Wallet address
    },
    collection: { 
        type: String, 
        default: 'OG Collection' 
    },
    
    // ========== PAYMENT ==========
    pebblesPaid: { 
        type: Number, 
        required: true, 
        default: 25 
    },
    
    // ========== RESULT ==========
    templateId: String,  // May be null on early failures
    instanceId: String,  // null if duplicate converted or failed
    rarity: {
        type: String,
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine']
    },
    quality: {
        type: String,
        enum: ['worn', 'standard', 'pristine', 'flawless']
    },
    isHolographic: Boolean,
    isFirstEdition: Boolean,
    serialNumber: Number,
    
    // ========== DUPLICATE HANDLING ==========
    isDuplicate: { 
        type: Boolean, 
        default: false 
    },
    goldAwarded: { 
        type: Number, 
        default: 0 
    },
    
    // ========== PITY TRACKING ==========
    pityCountAtRoll: {
        rollsSinceRare: Number,
        rollsSinceEpic: Number,
        rollsSinceLegendary: Number
    },
    triggeredPity: {
        type: String,
        enum: ['none', 'rare_soft', 'rare_hard', 'epic_soft', 'epic_hard', 'legendary_soft', 'legendary_hard'],
        default: 'none'
    },
    
    // ========== STATUS TRACKING ==========
    status: { 
        type: String, 
        enum: ['success', 'failed', 'refunded'],
        default: 'success',
        index: true
    },
    errorMessage: String,
    requiresRefund: { 
        type: Boolean, 
        default: false, 
        index: true 
    },
    refundedAt: Date,
    refundedBy: String,  // Admin who processed refund
    refundPebbles: Number,  // Pebbles refunded
    
    // ========== PROVABLY FAIR (Optional for future) ==========
    serverSeed: String,
    serverSeedHash: String,
    clientSeed: String,
    nonce: Number,
    
    // ========== TIMESTAMP ==========
    timestamp: { 
        type: Date, 
        default: Date.now, 
        index: true 
    }
    
}, { timestamps: true });

// ==================== INDEXES ====================
gachaRollSchema.index({ ownerId: 1, timestamp: -1 });
gachaRollSchema.index({ requiresRefund: 1, status: 1 });  // Admin dashboard for failed rolls
gachaRollSchema.index({ rarity: 1, timestamp: -1 });  // Rare drop queries
gachaRollSchema.index({ isFirstEdition: 1 });
gachaRollSchema.index({ collection: 1, timestamp: -1 });

// ==================== STATICS ====================

/**
 * Generate unique roll ID
 */
gachaRollSchema.statics.generateRollId = function() {
    return `roll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get roll history for a user
 * @param {string} ownerId - Wallet address
 * @param {number} limit - Max results
 */
gachaRollSchema.statics.getUserHistory = function(ownerId, limit = 50) {
    return this.find({ ownerId })
        .sort({ timestamp: -1 })
        .limit(limit);
};

/**
 * Get recent rare+ drops server-wide (for announcements)
 * @param {number} limit - Max results
 */
gachaRollSchema.statics.getRecentRareDrops = function(limit = 10) {
    return this.find({ 
        rarity: { $in: ['rare', 'epic', 'legendary', 'mythic', 'divine'] },
        status: 'success'
    })
    .sort({ timestamp: -1 })
    .limit(limit);
};

/**
 * Get all rolls requiring refund (admin dashboard)
 */
gachaRollSchema.statics.getPendingRefunds = function() {
    return this.find({ 
        requiresRefund: true, 
        status: 'failed' 
    }).sort({ timestamp: -1 });
};

/**
 * Mark roll as refunded
 * @param {string} rollId - Roll ID
 * @param {string} adminId - Admin who processed
 * @param {number} pebbles - Pebbles refunded
 */
gachaRollSchema.statics.markRefunded = function(rollId, adminId, pebbles) {
    return this.findOneAndUpdate(
        { rollId },
        { 
            status: 'refunded',
            requiresRefund: false,
            refundedAt: new Date(),
            refundedBy: adminId,
            refundPebbles: pebbles
        },
        { new: true }
    );
};

/**
 * Get statistics for a user
 * @param {string} ownerId - Wallet address
 */
gachaRollSchema.statics.getUserStats = async function(ownerId) {
    const stats = await this.aggregate([
        { $match: { ownerId, status: 'success' } },
        { $group: {
            _id: null,
            totalRolls: { $sum: 1 },
            totalPebblesSpent: { $sum: '$pebblesPaid' },
            totalGoldFromDupes: { $sum: '$goldAwarded' },
            divineCount: { $sum: { $cond: [{ $eq: ['$rarity', 'divine'] }, 1, 0] } },
            mythicCount: { $sum: { $cond: [{ $eq: ['$rarity', 'mythic'] }, 1, 0] } },
            legendaryCount: { $sum: { $cond: [{ $eq: ['$rarity', 'legendary'] }, 1, 0] } },
            epicCount: { $sum: { $cond: [{ $eq: ['$rarity', 'epic'] }, 1, 0] } },
            rareCount: { $sum: { $cond: [{ $eq: ['$rarity', 'rare'] }, 1, 0] } },
            holoCount: { $sum: { $cond: ['$isHolographic', 1, 0] } },
            firstEditionCount: { $sum: { $cond: ['$isFirstEdition', 1, 0] } }
        }}
    ]);
    
    return stats[0] || {
        totalRolls: 0,
        totalPebblesSpent: 0,
        totalGoldFromDupes: 0,
        divineCount: 0,
        mythicCount: 0,
        legendaryCount: 0,
        epicCount: 0,
        rareCount: 0,
        holoCount: 0,
        firstEditionCount: 0
    };
};

const GachaRoll = mongoose.model('GachaRoll', gachaRollSchema);

export default GachaRoll;

