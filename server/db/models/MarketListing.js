/**
 * MarketListing Model - Open market for cosmetic trading
 * RuneScape Grand Exchange / CS:GO Market style
 */

import mongoose from 'mongoose';

const marketListingSchema = new mongoose.Schema({
    // ========== IDENTITY ==========
    listingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // ========== ITEM INFO ==========
    itemInstanceId: {
        type: String,
        required: true,
        index: true  // Reference to OwnedCosmetic.instanceId
    },
    templateId: {
        type: String,
        required: true,
        index: true  // For browsing by item type
    },
    
    // Snapshot of item properties at listing time (for display)
    itemSnapshot: {
        name: String,
        category: String,
        rarity: String,
        assetKey: String,
        serialNumber: Number,
        quality: String,
        isHolographic: Boolean,
        isFirstEdition: Boolean
    },
    
    // ========== SELLER ==========
    sellerId: {
        type: String,
        required: true,
        index: true  // Wallet address
    },
    sellerUsername: String,
    
    // ========== PRICING ==========
    price: {
        type: Number,
        required: true,
        min: 1,
        index: true  // In Pebbles
    },
    
    // ========== STATUS ==========
    status: {
        type: String,
        enum: ['active', 'sold', 'cancelled', 'expired'],
        default: 'active',
        index: true
    },
    
    // ========== BUYER (when sold) ==========
    buyerId: {
        type: String,
        default: null,
        index: true
    },
    buyerUsername: String,
    
    // ========== TIMESTAMPS ==========
    listedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
        index: true
    },
    soldAt: Date,
    cancelledAt: Date,
    
    // ========== FEES ==========
    marketFee: {
        type: Number,
        default: 0  // 5% fee on sale (calculated at sale time)
    },
    sellerReceived: {
        type: Number,
        default: 0  // Amount seller actually receives after fee
    }
    
}, { timestamps: true });

// ==================== INDEXES ====================
marketListingSchema.index({ status: 1, listedAt: -1 });  // Browse active listings
marketListingSchema.index({ status: 1, templateId: 1 });  // Browse by item type
marketListingSchema.index({ status: 1, price: 1 });  // Sort by price
marketListingSchema.index({ sellerId: 1, status: 1 });  // User's listings
marketListingSchema.index({ 'itemSnapshot.rarity': 1, status: 1 });  // Browse by rarity
marketListingSchema.index({ 'itemSnapshot.category': 1, status: 1 });  // Browse by category
marketListingSchema.index({ expiresAt: 1, status: 1 });  // Expiration cleanup

// ==================== STATICS ====================

/**
 * Generate unique listing ID
 */
marketListingSchema.statics.generateListingId = function() {
    return `mkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get active listings with pagination and filters
 */
marketListingSchema.statics.browseListings = async function(options = {}) {
    const {
        page = 1,
        limit = 20,
        category = null,
        rarity = null,
        templateId = null,
        minPrice = null,
        maxPrice = null,
        sortBy = 'newest',  // 'newest', 'oldest', 'price_low', 'price_high', 'rarity'
        search = null
    } = options;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { status: 'active' };
    
    if (category) query['itemSnapshot.category'] = category;
    if (rarity) query['itemSnapshot.rarity'] = rarity;
    if (templateId) query.templateId = templateId;
    if (minPrice !== null) query.price = { ...query.price, $gte: minPrice };
    if (maxPrice !== null) query.price = { ...query.price, $lte: maxPrice };
    if (search) {
        query['itemSnapshot.name'] = { $regex: search, $options: 'i' };
    }
    
    // Build sort
    let sort = {};
    switch (sortBy) {
        case 'oldest':
            sort = { listedAt: 1 };
            break;
        case 'price_low':
            sort = { price: 1 };
            break;
        case 'price_high':
            sort = { price: -1 };
            break;
        case 'rarity':
            // Will need post-processing for rarity order
            sort = { listedAt: -1 };
            break;
        case 'newest':
        default:
            sort = { listedAt: -1 };
    }
    
    const [listings, total] = await Promise.all([
        this.find(query).sort(sort).skip(skip).limit(limit).lean(),
        this.countDocuments(query)
    ]);
    
    // Sort by rarity if requested
    if (sortBy === 'rarity') {
        const rarityOrder = { divine: 0, mythic: 1, legendary: 2, epic: 3, rare: 4, uncommon: 5, common: 6 };
        listings.sort((a, b) => 
            (rarityOrder[a.itemSnapshot?.rarity] || 99) - (rarityOrder[b.itemSnapshot?.rarity] || 99)
        );
    }
    
    return {
        listings,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: total > page * limit
    };
};

/**
 * Get user's active listings
 */
marketListingSchema.statics.getUserListings = function(walletAddress, status = 'active') {
    const query = { sellerId: walletAddress };
    if (status !== 'all') query.status = status;
    return this.find(query).sort({ listedAt: -1 }).lean();
};

/**
 * Get user's purchase history
 */
marketListingSchema.statics.getUserPurchases = function(walletAddress, limit = 50) {
    return this.find({ 
        buyerId: walletAddress, 
        status: 'sold' 
    }).sort({ soldAt: -1 }).limit(limit).lean();
};

/**
 * Get user's sales history
 */
marketListingSchema.statics.getUserSales = function(walletAddress, limit = 50) {
    return this.find({ 
        sellerId: walletAddress, 
        status: 'sold' 
    }).sort({ soldAt: -1 }).limit(limit).lean();
};

/**
 * Get price history for an item template
 */
marketListingSchema.statics.getPriceHistory = async function(templateId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const sales = await this.find({
        templateId,
        status: 'sold',
        soldAt: { $gte: since }
    }).sort({ soldAt: 1 }).select('price soldAt itemSnapshot.quality itemSnapshot.isHolographic').lean();
    
    // Calculate stats
    const prices = sales.map(s => s.price);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    return {
        sales,
        stats: {
            totalSales: sales.length,
            averagePrice: avgPrice,
            minPrice,
            maxPrice
        }
    };
};

/**
 * Check if an item is currently listed
 */
marketListingSchema.statics.isItemListed = async function(itemInstanceId) {
    const listing = await this.findOne({
        itemInstanceId,
        status: 'active'
    });
    return !!listing;
};

/**
 * Get market stats
 */
marketListingSchema.statics.getMarketStats = async function() {
    const [
        activeListings,
        totalSold24h,
        volume24h
    ] = await Promise.all([
        this.countDocuments({ status: 'active' }),
        this.countDocuments({ 
            status: 'sold', 
            soldAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        this.aggregate([
            { 
                $match: { 
                    status: 'sold', 
                    soldAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            },
            { $group: { _id: null, total: { $sum: '$price' } } }
        ])
    ]);
    
    return {
        activeListings,
        totalSold24h,
        volume24h: volume24h[0]?.total || 0
    };
};

const MarketListing = mongoose.model('MarketListing', marketListingSchema);

export default MarketListing;

