/**
 * Igloo Model - Igloo ownership, settings, and access control
 * Server-authoritative for all rental and access logic
 */

import mongoose from 'mongoose';

const iglooSchema = new mongoose.Schema({
    // ========== IDENTITY ==========
    iglooId: {
        type: String,
        required: true,
        unique: true,
        enum: ['igloo1', 'igloo2', 'igloo3', 'igloo4', 'igloo5', 'igloo6', 'igloo7', 'igloo8', 'igloo9', 'igloo10']
    },
    
    // ========== POSITION (from roomConfig) ==========
    position: {
        x: { type: Number, required: true },
        z: { type: Number, required: true },
        row: { type: String, enum: ['north', 'south'], required: true }
    },
    
    // ========== OWNERSHIP ==========
    // Rental status
    isRented: { type: Boolean, default: false },
    
    // Permanent ownership (SKNY GANG, REGEN - not rentable)
    isPermanent: { type: Boolean, default: false },
    permanentOwnerName: { type: String, default: null },
    
    // Current owner (wallet address)
    ownerWallet: { type: String, default: null },
    ownerUsername: { type: String, default: null },
    
    // Rental dates
    rentStartDate: { type: Date, default: null },
    lastRentPaidDate: { type: Date, default: null },
    rentDueDate: { type: Date, default: null },
    
    // Rent status
    rentStatus: {
        type: String,
        enum: ['current', 'overdue', 'grace_period', 'evicted', null],
        default: null
    },
    
    // ========== ACCESS CONTROL ==========
    accessType: {
        type: String,
        enum: ['private', 'public', 'token', 'fee', 'both'],
        default: 'private'
    },
    
    // Token gating settings
    tokenGate: {
        enabled: { type: Boolean, default: false },
        tokenAddress: { type: String, default: null },
        tokenSymbol: { type: String, default: null },
        minimumBalance: { type: Number, default: 1 }
    },
    
    // Entry fee settings
    entryFee: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 },  // In CPw3 tokens
        // One-time payment per user - tracked in paidEntryFees array
    },
    
    // Users who have paid entry fee (persists until settings change)
    paidEntryFees: [{
        walletAddress: { type: String, required: true },
        paidAt: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        transactionHash: { type: String, default: null }
    }],
    
    // Version tracker - when this increments, all paid entry fees are reset
    entryFeeVersion: { type: Number, default: 1 },
    
    // ========== CUSTOMIZATION ==========
    // Banner displayed above igloo in town
    banner: {
        title: { type: String, default: null, maxlength: 30 },
        ticker: { type: String, default: null, maxlength: 10 },  // e.g., "$COIN"
        shill: { type: String, default: null, maxlength: 50 },   // Description line
        styleIndex: { type: Number, default: 0 }  // Index into IGLOO_BANNER_STYLES
    },
    
    // Interior customization (furniture, etc.)
    interior: {
        theme: { type: String, default: 'default' },
        furniture: [{ type: mongoose.Schema.Types.Mixed }]
    },
    
    // ========== STATISTICS ==========
    stats: {
        totalVisits: { type: Number, default: 0 },
        uniqueVisitors: { type: Number, default: 0 },
        totalRentPaid: { type: Number, default: 0 },
        totalEntryFeesCollected: { type: Number, default: 0 },
        timesRented: { type: Number, default: 0 }
    },
    
    // Unique visitors tracking (wallet addresses)
    uniqueVisitorWallets: [{ type: String }]
    
}, {
    timestamps: true
});

// ==================== INDEXES ====================
iglooSchema.index({ iglooId: 1 }, { unique: true });
iglooSchema.index({ ownerWallet: 1 });
iglooSchema.index({ isRented: 1 });
iglooSchema.index({ rentDueDate: 1 });
iglooSchema.index({ rentStatus: 1 });

// ==================== METHODS ====================

/**
 * Check if a wallet can enter this igloo
 * @param {string} walletAddress - Visitor's wallet
 * @param {Object} options - { tokenBalance: number } for token gate check
 * @returns {Object} { canEnter: boolean, reason?: string, requiresPayment?: boolean, paymentAmount?: number }
 */
iglooSchema.methods.canEnter = function(walletAddress, options = {}) {
    // Owner can always enter
    if (walletAddress === this.ownerWallet) {
        return { canEnter: true, isOwner: true };
    }
    
    // Permanent owners can always enter their igloo
    if (this.isPermanent && walletAddress === this.permanentOwnerWallet) {
        return { canEnter: true, isOwner: true };
    }
    
    // Private = only owner
    if (this.accessType === 'private') {
        return { canEnter: false, reason: 'IGLOO_LOCKED', message: 'This igloo is private' };
    }
    
    // Public = anyone can enter
    if (this.accessType === 'public') {
        return { canEnter: true };
    }
    
    // Token gated
    if (this.accessType === 'token' || this.accessType === 'both') {
        if (this.tokenGate.enabled) {
            const balance = options.tokenBalance || 0;
            if (balance < this.tokenGate.minimumBalance) {
                return { 
                    canEnter: false, 
                    reason: 'TOKEN_REQUIRED',
                    message: `Hold ${this.tokenGate.minimumBalance} ${this.tokenGate.tokenSymbol || 'tokens'} to enter`,
                    tokenRequired: {
                        address: this.tokenGate.tokenAddress,
                        symbol: this.tokenGate.tokenSymbol,
                        minimum: this.tokenGate.minimumBalance
                    }
                };
            }
        }
    }
    
    // Entry fee
    if (this.accessType === 'fee' || this.accessType === 'both') {
        if (this.entryFee.enabled && this.entryFee.amount > 0) {
            // Check if user has already paid (for current version)
            const hasPaid = this.paidEntryFees.some(
                fee => fee.walletAddress === walletAddress
            );
            
            if (!hasPaid) {
                return {
                    canEnter: false,
                    reason: 'ENTRY_FEE_REQUIRED',
                    requiresPayment: true,
                    paymentAmount: this.entryFee.amount,
                    message: `Entry fee: ${this.entryFee.amount} CPw3`
                };
            }
        }
    }
    
    // All checks passed
    return { canEnter: true };
};

/**
 * Record entry fee payment
 */
iglooSchema.methods.recordEntryFeePayment = function(walletAddress, amount, transactionHash = null) {
    // Remove any existing payment from this wallet (shouldn't happen, but safety)
    this.paidEntryFees = this.paidEntryFees.filter(f => f.walletAddress !== walletAddress);
    
    this.paidEntryFees.push({
        walletAddress,
        amount,
        paidAt: new Date(),
        transactionHash
    });
    
    this.stats.totalEntryFeesCollected += amount;
};

/**
 * Reset all entry fees (when owner changes settings)
 */
iglooSchema.methods.resetEntryFees = function() {
    this.paidEntryFees = [];
    this.entryFeeVersion += 1;
};

/**
 * Record a visit
 */
iglooSchema.methods.recordVisit = function(walletAddress) {
    this.stats.totalVisits += 1;
    
    if (!this.uniqueVisitorWallets.includes(walletAddress)) {
        this.uniqueVisitorWallets.push(walletAddress);
        this.stats.uniqueVisitors += 1;
    }
};

/**
 * Start rental period
 */
iglooSchema.methods.startRental = function(walletAddress, username) {
    const now = new Date();
    
    this.isRented = true;
    this.ownerWallet = walletAddress;
    this.ownerUsername = username;
    this.rentStartDate = now;
    this.lastRentPaidDate = now;
    this.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    this.rentStatus = 'current';
    this.accessType = 'private'; // Default to private on new rental
    this.stats.timesRented += 1;
    
    // Clear previous entry fees
    this.resetEntryFees();
};

/**
 * Process rent payment
 */
iglooSchema.methods.payRent = function(amount) {
    const now = new Date();
    
    this.lastRentPaidDate = now;
    this.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.rentStatus = 'current';
    this.stats.totalRentPaid += amount;
};

/**
 * Evict current tenant
 */
iglooSchema.methods.evict = function() {
    this.isRented = false;
    this.ownerWallet = null;
    this.ownerUsername = null;
    this.rentStartDate = null;
    this.lastRentPaidDate = null;
    this.rentDueDate = null;
    this.rentStatus = 'evicted';
    this.accessType = 'private';
    
    // Reset customization
    this.banner = { title: null, ticker: null, shill: null, styleIndex: 0 };
    this.paidEntryFees = [];
    this.entryFeeVersion += 1;
    this.tokenGate = { enabled: false, tokenAddress: null, tokenSymbol: null, minimumBalance: 1 };
    this.entryFee = { enabled: false, amount: 0 };
};

/**
 * Get public igloo info (safe to send to any client)
 */
iglooSchema.methods.getPublicInfo = function() {
    return {
        iglooId: this.iglooId,
        position: this.position,
        isRented: this.isRented,
        isPermanent: this.isPermanent,
        ownerUsername: this.ownerUsername || this.permanentOwnerName,
        accessType: this.accessType,
        banner: this.banner,
        hasTokenGate: this.tokenGate?.enabled || false,
        hasEntryFee: this.entryFee?.enabled || false,
        entryFeeAmount: this.entryFee?.amount || 0,
        tokenGateInfo: this.tokenGate?.enabled ? {
            symbol: this.tokenGate.tokenSymbol,
            minimum: this.tokenGate.minimumBalance
        } : null,
        stats: {
            totalVisits: this.stats.totalVisits,
            uniqueVisitors: this.stats.uniqueVisitors
        }
    };
};

/**
 * Get owner-only info
 */
iglooSchema.methods.getOwnerInfo = function() {
    return {
        ...this.getPublicInfo(),
        rentStartDate: this.rentStartDate,
        lastRentPaidDate: this.lastRentPaidDate,
        rentDueDate: this.rentDueDate,
        rentStatus: this.rentStatus,
        tokenGate: this.tokenGate,
        entryFee: this.entryFee,
        paidEntryFeesCount: this.paidEntryFees.length,
        stats: this.stats
    };
};

const Igloo = mongoose.model('Igloo', iglooSchema);

export default Igloo;

