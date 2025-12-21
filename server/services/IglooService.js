/**
 * IglooService - Business logic for igloo rental, ownership, and access control
 * Server-authoritative for all igloo operations
 */

import Igloo from '../db/models/Igloo.js';
import User from '../db/models/User.js';
import x402Service from './X402Service.js';

// ==================== CONFIGURATION ====================
const DAILY_RENT_CPW3 = parseInt(process.env.DAILY_RENT_CPW3 || '10000');
const MINIMUM_BALANCE_CPW3 = parseInt(process.env.MINIMUM_BALANCE_CPW3 || '70000'); // 7 days
const GRACE_PERIOD_HOURS = parseInt(process.env.GRACE_PERIOD_HOURS || '12');

// Permanent igloos (not rentable)
const RESERVED_IGLOOS = {
    'igloo3': { ownerWallet: process.env.SKNY_GANG_WALLET, ownerName: 'SKNY GANG' },
    'igloo8': { ownerWallet: process.env.REGEN_WALLET, ownerName: 'REGEN' }
};

// Igloo positions
const IGLOO_POSITIONS = {
    'igloo1': { x: -75, z: -70, row: 'north' },
    'igloo2': { x: -50, z: -73, row: 'north' },
    'igloo3': { x: -25, z: -70, row: 'north' },
    'igloo4': { x: 25, z: -70, row: 'north' },
    'igloo5': { x: 50, z: -73, row: 'north' },
    'igloo6': { x: 75, z: -70, row: 'north' },
    'igloo7': { x: -70, z: -20, row: 'south' },
    'igloo8': { x: -40, z: -23, row: 'south' },
    'igloo9': { x: 40, z: -23, row: 'south' },
    'igloo10': { x: 70, z: -20, row: 'south' }
};

class IglooService {
    constructor() {
        this.dailyRent = DAILY_RENT_CPW3;
        this.minimumBalance = MINIMUM_BALANCE_CPW3;
        this.gracePeriodHours = GRACE_PERIOD_HOURS;
    }
    
    /**
     * Initialize all igloos in database (run once on server startup)
     */
    async initializeIgloos() {
        console.log('🏠 Initializing igloo database...');
        
        for (const [iglooId, position] of Object.entries(IGLOO_POSITIONS)) {
            const existing = await Igloo.findOne({ iglooId });
            
            if (!existing) {
                const isPermanent = iglooId in RESERVED_IGLOOS;
                const permanentData = RESERVED_IGLOOS[iglooId];
                
                const newIgloo = new Igloo({
                    iglooId,
                    position,
                    isPermanent,
                    permanentOwnerName: permanentData?.ownerName || null,
                    ownerWallet: permanentData?.ownerWallet || null,
                    isRented: isPermanent,
                    accessType: isPermanent ? 'public' : 'private'
                });
                
                await newIgloo.save();
                console.log(`  Created ${iglooId} (${isPermanent ? 'permanent: ' + permanentData?.ownerName : 'rentable'})`);
            }
        }
        
        console.log('🏠 Igloo initialization complete');
    }
    
    /**
     * Get all igloos (public info)
     */
    async getAllIgloos() {
        const igloos = await Igloo.find({});
        return igloos.map(igloo => igloo.getPublicInfo());
    }
    
    /**
     * Get single igloo info
     */
    async getIgloo(iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) return null;
        return igloo.getPublicInfo();
    }
    
    /**
     * Get igloo info for owner (includes settings)
     */
    async getIglooForOwner(iglooId, walletAddress) {
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) return { error: 'IGLOO_NOT_FOUND' };
        
        if (igloo.ownerWallet !== walletAddress) {
            return { error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        return igloo.getOwnerInfo();
    }
    
    /**
     * Check if user can rent an igloo
     * @param {string} walletAddress - User's wallet
     * @param {string} iglooId - Target igloo
     */
    async canRent(walletAddress, iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { canRent: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.isPermanent) {
            return { canRent: false, error: 'PERMANENTLY_OWNED', message: `Owned by ${igloo.permanentOwnerName}` };
        }
        
        if (igloo.isRented) {
            return { 
                canRent: false, 
                error: 'ALREADY_RENTED', 
                message: `Rented by ${igloo.ownerUsername}`,
                currentOwner: igloo.ownerUsername
            };
        }
        
        // Check balance eligibility
        const balanceCheck = await x402Service.checkRentEligibility(walletAddress, this.minimumBalance);
        
        if (!balanceCheck.hasBalance) {
            return { 
                canRent: false, 
                error: 'INSUFFICIENT_BALANCE',
                message: `Minimum balance of ${this.minimumBalance} CPw3 required (7 days rent)`,
                required: this.minimumBalance,
                current: balanceCheck.currentBalance
            };
        }
        
        return { 
            canRent: true, 
            dailyRent: this.dailyRent,
            minimumBalance: this.minimumBalance
        };
    }
    
    /**
     * Start rental process - verify payment and assign igloo
     * @param {string} walletAddress - Renter's wallet
     * @param {string} iglooId - Target igloo
     * @param {string} paymentPayload - x402 payment authorization
     */
    async startRental(walletAddress, iglooId, paymentPayload) {
        // Verify rental eligibility
        const eligibility = await this.canRent(walletAddress, iglooId);
        if (!eligibility.canRent) {
            return { success: false, ...eligibility };
        }
        
        // Verify payment payload
        const verification = await x402Service.verifyPayload(paymentPayload, {
            amount: this.dailyRent,
            recipient: process.env.RENT_WALLET_ADDRESS
        });
        
        if (!verification.valid) {
            return { success: false, error: verification.error, message: verification.message };
        }
        
        // Settle the first day's rent payment
        const settlement = await x402Service.settlePayment(paymentPayload);
        
        if (!settlement.success) {
            return { success: false, error: settlement.error, message: settlement.message };
        }
        
        // Get user info
        const user = await User.findOne({ walletAddress });
        const username = user?.username || `Penguin${walletAddress.slice(0, 6)}`;
        
        // Assign igloo to renter
        const igloo = await Igloo.findOne({ iglooId });
        igloo.startRental(walletAddress, username);
        await igloo.save();
        
        console.log(`🏠 ${username} rented ${iglooId}, tx: ${settlement.transactionHash}`);
        
        return {
            success: true,
            iglooId,
            transactionHash: settlement.transactionHash,
            rentDueDate: igloo.rentDueDate,
            message: 'Welcome to your new igloo!'
        };
    }
    
    /**
     * Process rent payment (called daily by user)
     */
    async payRent(walletAddress, iglooId, paymentPayload) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        // Verify payment
        const verification = await x402Service.verifyPayload(paymentPayload, {
            amount: this.dailyRent,
            recipient: process.env.RENT_WALLET_ADDRESS
        });
        
        if (!verification.valid) {
            return { success: false, error: verification.error, message: verification.message };
        }
        
        // Settle payment
        const settlement = await x402Service.settlePayment(paymentPayload);
        
        if (!settlement.success) {
            return { success: false, error: settlement.error, message: settlement.message };
        }
        
        // Update igloo
        igloo.payRent(this.dailyRent);
        await igloo.save();
        
        console.log(`🏠 Rent paid for ${iglooId} by ${igloo.ownerUsername}`);
        
        return {
            success: true,
            transactionHash: settlement.transactionHash,
            newDueDate: igloo.rentDueDate
        };
    }
    
    /**
     * Check if user can enter an igloo
     */
    async canEnter(walletAddress, iglooId, tokenBalance = 0) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { canEnter: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        return igloo.canEnter(walletAddress, { tokenBalance });
    }
    
    /**
     * Process entry fee payment
     */
    async payEntryFee(walletAddress, iglooId, paymentPayload) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (!igloo.entryFee.enabled || igloo.entryFee.amount <= 0) {
            return { success: false, error: 'NO_ENTRY_FEE', message: 'This igloo has no entry fee' };
        }
        
        // Verify payment
        const verification = await x402Service.verifyPayload(paymentPayload, {
            amount: igloo.entryFee.amount,
            recipient: igloo.ownerWallet // Entry fees go to igloo owner
        });
        
        if (!verification.valid) {
            return { success: false, error: verification.error, message: verification.message };
        }
        
        // Settle payment
        const settlement = await x402Service.settlePayment(paymentPayload);
        
        if (!settlement.success) {
            return { success: false, error: settlement.error, message: settlement.message };
        }
        
        // Record payment
        igloo.recordEntryFeePayment(walletAddress, igloo.entryFee.amount, settlement.transactionHash);
        await igloo.save();
        
        return { success: true, transactionHash: settlement.transactionHash };
    }
    
    /**
     * Update igloo settings (owner only)
     */
    async updateSettings(walletAddress, iglooId, settings) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        // Track if entry fee settings changed (requires reset)
        const entryFeeChanged = settings.entryFee && (
            settings.entryFee.enabled !== igloo.entryFee.enabled ||
            settings.entryFee.amount !== igloo.entryFee.amount
        );
        
        // Track if token gate settings changed (requires reset)
        const tokenGateChanged = settings.tokenGate && (
            settings.tokenGate.enabled !== igloo.tokenGate.enabled ||
            settings.tokenGate.tokenAddress !== igloo.tokenGate.tokenAddress ||
            settings.tokenGate.minimumBalance !== igloo.tokenGate.minimumBalance
        );
        
        // Update access type
        if (settings.accessType) {
            igloo.accessType = settings.accessType;
        }
        
        // Update token gate
        if (settings.tokenGate) {
            igloo.tokenGate = { ...igloo.tokenGate, ...settings.tokenGate };
        }
        
        // Update entry fee
        if (settings.entryFee) {
            igloo.entryFee = { ...igloo.entryFee, ...settings.entryFee };
        }
        
        // Update banner
        if (settings.banner) {
            igloo.banner = { ...igloo.banner, ...settings.banner };
        }
        
        // Reset entry fees if requirements changed
        if (entryFeeChanged || tokenGateChanged) {
            igloo.resetEntryFees();
        }
        
        await igloo.save();
        
        return { 
            success: true, 
            igloo: igloo.getOwnerInfo(),
            entryFeesReset: entryFeeChanged || tokenGateChanged
        };
    }
    
    /**
     * Record a visit to an igloo
     */
    async recordVisit(walletAddress, iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) return;
        
        igloo.recordVisit(walletAddress);
        await igloo.save();
    }
    
    /**
     * Check and process overdue rentals (called by scheduler)
     */
    async processOverdueRentals() {
        const now = new Date();
        const gracePeriodEnd = new Date(now.getTime() - (this.gracePeriodHours * 60 * 60 * 1000));
        
        // Find rentals that are past grace period
        const overdueIgloos = await Igloo.find({
            isRented: true,
            isPermanent: false,
            rentDueDate: { $lt: gracePeriodEnd }
        });
        
        const evictions = [];
        
        for (const igloo of overdueIgloos) {
            console.log(`🏠 Evicting ${igloo.ownerUsername} from ${igloo.iglooId} - rent overdue`);
            igloo.evict();
            await igloo.save();
            evictions.push({ iglooId: igloo.iglooId, previousOwner: igloo.ownerUsername });
        }
        
        // Mark igloos entering grace period
        const newlyOverdue = await Igloo.find({
            isRented: true,
            isPermanent: false,
            rentDueDate: { $lt: now, $gte: gracePeriodEnd },
            rentStatus: 'current'
        });
        
        for (const igloo of newlyOverdue) {
            igloo.rentStatus = 'grace_period';
            await igloo.save();
            console.log(`🏠 ${igloo.iglooId} entered grace period - rent due`);
        }
        
        return { evictions, gracePeriodCount: newlyOverdue.length };
    }
    
    /**
     * Get rent status for a user's igloos
     */
    async getUserIgloos(walletAddress) {
        const igloos = await Igloo.find({ ownerWallet: walletAddress });
        return igloos.map(igloo => igloo.getOwnerInfo());
    }
    
    /**
     * Voluntarily leave an igloo
     */
    async leaveIgloo(walletAddress, iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER' };
        }
        
        if (igloo.isPermanent) {
            return { success: false, error: 'PERMANENT_OWNER', message: 'Cannot leave permanent igloo' };
        }
        
        igloo.evict();
        await igloo.save();
        
        return { success: true, message: 'You have left the igloo' };
    }
}

// Export singleton instance
const iglooService = new IglooService();
export default iglooService;

