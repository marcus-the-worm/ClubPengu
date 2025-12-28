/**
 * CosmeticTemplate Model - Master catalog of all cosmetic items
 * Defines the base properties for each cosmetic type
 */

import mongoose from 'mongoose';

const cosmeticTemplateSchema = new mongoose.Schema({
    // ========== IDENTITY ==========
    templateId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true
    },
    name: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String,
        default: ''
    },
    
    // ========== CLASSIFICATION ==========
    category: {
        type: String,
        required: true,
        enum: ['skin', 'hat', 'eyes', 'mouth', 'bodyItem', 'mount'],
        index: true
    },
    rarity: {
        type: String,
        required: true,
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'],
        index: true
    },
    acquisitionType: {
        type: String,
        required: true,
        enum: ['gacha', 'promo', 'achievement', 'event', 'airdrop', 'founder', 'free'],
        default: 'gacha',
        index: true
    },
    
    // ========== VISUAL ==========
    assetKey: { 
        type: String, 
        required: true  // Matches frontend asset ID (e.g., 'topHat', 'flamingCrown')
    },
    isAnimated: { 
        type: Boolean, 
        default: false 
    },
    hasGlow: {
        type: Boolean,
        default: false
    },
    hasFx: {
        type: Boolean,
        default: false
    },
    
    // ========== COLLECTION ==========
    collection: { 
        type: String, 
        default: 'OG Collection' 
    },
    
    // ========== ECONOMY ==========
    canBeHolographic: { 
        type: Boolean, 
        default: true 
    },
    duplicateGoldBase: { 
        type: Number, 
        required: true,
        default: 50  // Base gold for duplicate conversion
    },
    
    // ========== LIFECYCLE ==========
    isActive: { 
        type: Boolean, 
        default: true, 
        index: true 
    },
    releasedAt: { 
        type: Date, 
        default: Date.now 
    },
    retiredAt: Date,
    
    // ========== STATS (Denormalized for performance) ==========
    totalMinted: { 
        type: Number, 
        default: 0 
    },
    
}, { timestamps: true });

// ==================== INDEXES ====================
cosmeticTemplateSchema.index({ acquisitionType: 1, isActive: 1, rarity: 1 });
cosmeticTemplateSchema.index({ collection: 1, isActive: 1 });
cosmeticTemplateSchema.index({ category: 1, rarity: 1 });
cosmeticTemplateSchema.index({ assetKey: 1 }, { unique: true });

// ==================== STATICS ====================

/**
 * Get all active items available in gacha pool
 * @param {string} collection - Optional collection filter
 */
cosmeticTemplateSchema.statics.getGachaPool = function(collection = null) {
    const query = { acquisitionType: 'gacha', isActive: true };
    if (collection) query.collection = collection;
    return this.find(query);
};

/**
 * Get items by rarity for gacha selection
 * @param {string} rarity - Rarity tier
 */
cosmeticTemplateSchema.statics.getByRarity = function(rarity) {
    return this.find({ 
        acquisitionType: 'gacha', 
        isActive: true, 
        rarity 
    });
};

/**
 * Get all items in a category
 * @param {string} category - Category to filter
 */
cosmeticTemplateSchema.statics.getByCategory = function(category) {
    return this.find({ category, isActive: true });
};

/**
 * Increment total minted count atomically
 * Returns the new serial number
 * @param {string} templateId - Template ID
 */
cosmeticTemplateSchema.statics.incrementMinted = async function(templateId) {
    const result = await this.findOneAndUpdate(
        { templateId },
        { $inc: { totalMinted: 1 } },
        { new: true, select: 'totalMinted' }
    );
    return result ? result.totalMinted : null;
};

/**
 * Get rarity color code
 */
cosmeticTemplateSchema.methods.getRarityColor = function() {
    const colors = {
        common: '#9CA3AF',
        uncommon: '#22C55E',
        rare: '#3B82F6',
        epic: '#A855F7',
        legendary: '#EC4899',
        mythic: '#EF4444',
        divine: '#F59E0B'
    };
    return colors[this.rarity] || '#9CA3AF';
};

const CosmeticTemplate = mongoose.model('CosmeticTemplate', cosmeticTemplateSchema);

export default CosmeticTemplate;

