# 🎰 Cosmetic Gacha System - Implementation Plan

> **Version:** 2.0  
> **Last Updated:** December 27, 2025  
> **Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

Transform the existing slot machine system into a cosmetic gacha using **Pebbles** 🪨 - a new premium currency. Users deposit SOL once to get Pebbles, then spend Pebbles instantly on gacha rolls without per-spin wallet signatures. This provides excellent UX while generating sustainable platform revenue.

---

## 🪨 Pebbles - Premium Currency

### Why Pebbles?
> *Penguins collect pebbles to build nests - now you collect Pebbles to build your cosmetic collection!*

### Economics
| Metric | Value |
|--------|-------|
| **Exchange Rate** | 1 SOL = 1,000 Pebbles |
| **1 Pebble** | = 0.001 SOL |
| **Gacha Roll Cost** | 25 Pebbles (= 0.025 SOL) |
| **Withdrawal Fee** | 5% rake (platform revenue) |
| **Minimum Deposit** | 100 Pebbles (0.1 SOL) |
| **Minimum Withdrawal** | 100 Pebbles (0.1 SOL) |

### User Flow
```
1. User sees Pebble balance in nav (next to coins) with [+] button
2. Clicks [+] → Opens purchase modal
3. Selects amount (e.g., 1000 Pebbles for 1 SOL)
4. Signs SPL token transfer to RAKE_WALLET (same as P2P wagers!)
5. Server verifies tx → Credits Pebbles instantly

6. User rolls gacha → 25 Pebbles deducted → INSTANT (no signing!)
7. Rolls 20 more times... all instant!

8. User clicks "Withdraw" in settings
9. 750 Pebbles → 0.75 SOL - 5% rake = 0.7125 SOL
10. Server sends SOL from custodial wallet
```

### UI Location
```
┌─────────────────────────────────────────────────────┐
│  🪙 1,234 coins    🪨 500 pebbles [+]    [Wallet]  │
└─────────────────────────────────────────────────────┘
                           ↑
              Click [+] to open purchase modal
```

### Revenue Streams
| Source | Rate | Notes |
|--------|------|-------|
| **Gacha Rolls** | 100% | All pebbles spent on gacha = platform revenue |
| **Withdrawal Rake** | 5% | Discourages instant cash-out, funds buybacks |
| **Duplicate Gold** | N/A | Gold is in-game only, not withdrawable |

### Casino CTA (Call-to-Action) - When User Runs Out
```javascript
// Frontend: When gacha_error with INSUFFICIENT_PEBBLES
if (error === 'INSUFFICIENT_PEBBLES') {
    showModal({
        title: "🪨 Need More Pebbles!",
        message: `You need ${required} Pebbles to roll. You have ${balance}.`,
        buttons: [
            { text: "Buy 100 Pebbles (0.1 SOL)", action: () => buyPebbles(100) },
            { text: "Buy 500 Pebbles (0.5 SOL)", action: () => buyPebbles(500) },
            { text: "Buy 1000 Pebbles (1 SOL)", action: () => buyPebbles(1000) }
        ]
    });
}
```

### Pebble Purchase Bundles (Optional Bonuses)
| Bundle | SOL Cost | Pebbles | Bonus |
|--------|----------|---------|-------|
| Starter | 0.1 SOL | 100 | - |
| Value | 0.5 SOL | 500 | - |
| Popular | 1 SOL | 1,000 | - |
| Whale | 5 SOL | 5,250 | +5% bonus |
| Mega | 10 SOL | 10,750 | +7.5% bonus |

---

## Part 1: Review & Inconsistency Check ✅

### Issues Found & Resolutions

| Issue | Severity | Resolution |
|-------|----------|------------|
| **Gold inflation** (+54k/day net) | HIGH | Add more gold sinks: quality rerolls, crafting, gold gambling |
| **Two currency systems** | MEDIUM | Keep separate: Slots = coins (fun), Gacha = SOL (real value) |
| **PROMO_EXCLUSIVE_IDS hardcoded** | LOW | Migrate to database-driven `acquisitionType` field |
| **No existing CosmeticTemplate model** | N/A | Create new, but integrate with existing `unlockedCosmetics` |
| **SlotService uses coins, not SOL** | LOW | Create new `GachaService`, don't modify working SlotService |
| **UserService.updateUserRaw missing** | HIGH | Add new method to UserService (see Critical Missing Methods) |
| **Service init pattern** | HIGH | GachaService needs broadcastToAll as 4th param (see Part 6.1) |
| **ownsCosmetic is sync** | LOW | Keep sync - gacha adds to unlockedCosmetics for compat |

### Existing Systems to REUSE (DRY Principle)

| System | File | What to Reuse |
|--------|------|---------------|
| Weighted RNG | `SlotService.js` | `getRandomSymbol()` pattern |
| Unlock logic | `PromoCodeService.js` | `_applyUnlocks()` pattern |
| User cosmetics | `User.js` | `unlockedCosmetics`, `ownsCosmetic()` |
| Transaction logging | `Transaction.js` | Extend with gacha types |
| SOL payments | `CustodialWalletService.js` | `processPayout()` for receipts |
| Audit trail | `PromoRedemption.js` | Pattern for `GachaRoll` model |

### Existing Systems to EXTEND (Not Replace)

```javascript
// User.js - ADD these fields, don't replace existing

// ========== PEBBLES (Premium Currency) ==========
pebbles: { type: Number, default: 0 },  // Current pebble balance
pebbleStats: {
    totalDeposited: { type: Number, default: 0 },   // Lifetime pebbles bought
    totalWithdrawn: { type: Number, default: 0 },   // Lifetime pebbles cashed out
    totalSpent: { type: Number, default: 0 },       // Lifetime pebbles spent (gacha, etc.)
    totalRakePaid: { type: Number, default: 0 },    // 5% rake on withdrawals
    lastDepositAt: Date,
    lastWithdrawalAt: Date
},

// ========== GACHA STATS ==========
unlockedCosmetics: [String],     // KEEP (legacy + gacha IDs)
ownedCosmeticInstances: [String], // ADD (references to OwnedCosmetic._id)
gachaStats: {                     // ADD
    totalRolls: Number,
    totalPebblesSpent: Number,   // Changed from totalSolSpent
    rarestDrop: String
}

// Transaction.js - ADD these types to enum
type: {
    // ... existing types ...
    'gacha_roll',        // ADD
    'gacha_dupe_gold',   // ADD
    'gold_sink_reroll',  // ADD
}

// UserService.js - ADD this method (it doesn't exist!)
async updateUserRaw(walletAddress, mongoUpdate) { ... }

// services/index.js - ADD export
export { 
    default as GachaService, 
    ROLL_PRICE_PEBBLES, 
    PEBBLES_PER_SOL,
    WITHDRAWAL_RAKE_PERCENT 
} from './GachaService.js';
```

### Critical Missing Methods

#### 5.2.1 UserService.updateUserRaw

```javascript
// server/services/UserService.js - ADD THIS METHOD

/**
 * Raw MongoDB update (for complex operations like $inc, $set)
 * Used by GachaService for atomic stat updates
 * @param {string} walletAddress - User's wallet
 * @param {object} update - MongoDB update object ($inc, $set, etc.)
 */
async updateUserRaw(walletAddress, update) {
    return User.updateOne({ walletAddress }, update);
}
```

#### 5.2.2 Pebble Deposits Use EXISTING SPL Verification

✅ **No new methods needed!** Pebble deposits use the same `SolanaPaymentService.verifyTransaction()` as P2P wagers:

```javascript
// Pebble deposit uses EXISTING code:
const verifyResult = await solanaPaymentService.verifyTransaction(
    txSignature,
    walletAddress,          // Sender
    process.env.RAKE_WALLET, // Recipient (same as P2P rake!)
    WSOL_MINT,              // Wrapped SOL mint address
    amountRaw,              // Amount in lamports
    { transactionType: 'pebble_deposit' }
);
```

**Wrapped SOL Mint:** `So11111111111111111111111111111111111111112`

This is the same flow as P2P token wagers - user sends wrapped SOL, we verify the SPL transfer.

**Note:** We do NOT need `UserService.unlockCosmetic()`. Instead, GachaService follows the `PromoCodeService._applyUnlocks()` pattern which directly modifies `user.unlockedCosmetics` array and calls `user.save()`. This is the established pattern in the codebase.

---

## Part 2: Confirmed Drop Rates

### Rarity Distribution (FINAL)

| Tier | Rate | 1 in X | Color Code |
|------|------|--------|------------|
| Common | 55.00% | 1.8 | `#9CA3AF` |
| Uncommon | 28.00% | 3.6 | `#22C55E` |
| Rare | 12.00% | 8.3 | `#3B82F6` |
| Epic | 4.00% | 25 | `#A855F7` |
| Legendary | 0.80% | 125 | `#EC4899` |
| Mythic | 0.18% | 556 | `#EF4444` |
| **Divine** | **0.02%** | **5,000** | `#F59E0B` |

### Quality Distribution (FINAL)

| Quality | Rate | Value Mult |
|---------|------|------------|
| Worn | 35% | 0.7x |
| Standard | 40% | 1.0x |
| Pristine | 20% | 1.8x |
| Flawless | 5% | 4.0x |

### Holographic Rate (FINAL)

| Variant | Rate | Value Mult |
|---------|------|------------|
| Normal | 92% | 1.0x |
| Holographic | 8% | 3.0x |

### Ultra-Rare Combined Odds

| Combination | Probability | 1 in X Rolls |
|-------------|-------------|--------------|
| Flawless Holo Divine | 0.00008% | 1,250,000 |
| Flawless Divine | 0.00092% | 108,696 |
| Holo Divine | 0.0016% | 62,500 |
| Any Divine | 0.02% | 5,000 |

---

## Part 3: Revenue & Economy Projections

### Pricing

| Item | Price |
|------|-------|
| Single Roll | 0.025 SOL |
| 5x Roll | 0.12 SOL (4% discount) |
| 10x Roll | 0.22 SOL (12% discount) |
| 50x Roll | 1.0 SOL (20% discount) |

### Revenue Scenarios (Monthly)

| Scenario | Daily Rollers | Rolls/User | Monthly Revenue |
|----------|---------------|------------|-----------------|
| Bear | 50 | 3 | 112.5 SOL |
| Base | 200 | 4 | 600 SOL |
| Bull | 1,000 | 6 | 4,500 SOL |

### Gold Economy Balance (REVISED)

**Problem:** Original projection showed +54,000 gold/day inflation

**Solution:** Add gold sinks

| New Sink | Gold Cost | Purpose |
|----------|-----------|---------|
| Quality Reroll | 1,000-10,000 | Chance to upgrade quality |
| Holo Blessing | 5,000 | 5% chance to make item holo |
| Name Tag | 500 | Custom item name |
| Gold → SOL Burn | 10,000:0.001 SOL | Deflation mechanism |

**Revised Projection:**
- Daily Faucet: ~63,000 gold
- Daily Sink (with new sinks): ~45,000 gold
- Net: +18,000 gold/day (manageable)

---

## Part 4: Database Schema

### 4.1 CosmeticTemplate (NEW)

**File:** `server/db/models/CosmeticTemplate.js`

```javascript
const cosmeticTemplateSchema = new mongoose.Schema({
    // Identity
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    
    // Classification
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
    
    // Visual
    assetKey: { type: String, required: true }, // Matches frontend ID
    isAnimated: { type: Boolean, default: false },
    
    // Collection
    collection: { type: String, default: 'OG Collection' },
    
    // Economy
    canBeHolographic: { type: Boolean, default: true },
    duplicateGoldBase: { type: Number, required: true },
    
    // Lifecycle
    isActive: { type: Boolean, default: true, index: true },
    releasedAt: { type: Date, default: Date.now },
    retiredAt: Date,
    
    // Stats (denormalized)
    totalMinted: { type: Number, default: 0 },
    
}, { timestamps: true });

// Indexes
cosmeticTemplateSchema.index({ acquisitionType: 1, isActive: 1, rarity: 1 });
cosmeticTemplateSchema.index({ collection: 1, isActive: 1 });

// Statics
cosmeticTemplateSchema.statics.getGachaPool = function(collection = null) {
    const query = { acquisitionType: 'gacha', isActive: true };
    if (collection) query.collection = collection;
    return this.find(query);
};
```

### 4.2 OwnedCosmetic (NEW)

**File:** `server/db/models/OwnedCosmetic.js`

```javascript
const ownedCosmeticSchema = new mongoose.Schema({
    // Identity
    instanceId: { type: String, required: true, unique: true },
    templateId: { type: String, required: true, index: true },
    
    // Ownership
    ownerId: { type: String, required: true, index: true }, // wallet address
    
    // Instance Properties (rolled at mint)
    serialNumber: { type: Number, required: true },
    quality: {
        type: String,
        enum: ['worn', 'standard', 'pristine', 'flawless'],
        default: 'standard'
    },
    isHolographic: { type: Boolean, default: false },
    
    // FIRST EDITION: Serial numbers 1, 2, 3 of ANY template are First Edition
    // This creates true scarcity - only 3 First Editions ever exist per item
    isFirstEdition: { type: Boolean, default: false },
    
    // Provenance
    mintedAt: { type: Date, default: Date.now },
    mintedBy: { type: String, required: true }, // original owner
    acquisitionMethod: {
        type: String,
        enum: ['gacha_roll', 'promo_code', 'achievement', 'trade', 'airdrop', 'legacy'],
        default: 'gacha_roll'
    },
    rollTxSignature: String, // SOL payment tx
    
    // State
    isEquipped: { type: Boolean, default: false },
    convertedToGold: { type: Boolean, default: false },
    convertedAt: Date,
    
}, { timestamps: true });

// Compound indexes
ownedCosmeticSchema.index({ ownerId: 1, templateId: 1 });
ownedCosmeticSchema.index({ templateId: 1, serialNumber: 1 }, { unique: true });
ownedCosmeticSchema.index({ ownerId: 1, isEquipped: 1 });
ownedCosmeticSchema.index({ isFirstEdition: 1 }); // For querying all first editions

// Statics
ownedCosmeticSchema.statics.generateInstanceId = function() {
    return `cos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

ownedCosmeticSchema.statics.getNextSerial = async function(templateId) {
    // Use aggregation for actual count
    const count = await this.countDocuments({ templateId });
    return count + 1;
};

// Check if this would be a First Edition (serial 1, 2, or 3)
ownedCosmeticSchema.statics.wouldBeFirstEdition = async function(templateId) {
    const count = await this.countDocuments({ templateId });
    return count < 3; // Serial numbers 1, 2, 3 are First Edition
};
```

### 4.3 GachaRoll (Audit Log - NEW)

**File:** `server/db/models/GachaRoll.js`

```javascript
const gachaRollSchema = new mongoose.Schema({
    rollId: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true, index: true },
    collection: { type: String, default: 'OG Collection' },
    
    // Payment (Pebbles - no blockchain tx needed!)
    pebblesPaid: { type: Number, required: true, default: 25 },
    
    // Result (templateId not required - may be null on early failures)
    templateId: String,
    instanceId: String, // null if duplicate converted or failed
    rarity: String,
    quality: String,
    isHolographic: Boolean,
    
    // Duplicate handling
    isDuplicate: { type: Boolean, default: false },
    goldAwarded: { type: Number, default: 0 },
    
    // Status tracking (for failed roll recovery)
    status: { 
        type: String, 
        enum: ['success', 'failed', 'refunded'],
        default: 'success',
        index: true
    },
    errorMessage: String,
    requiresRefund: { type: Boolean, default: false, index: true },
    refundedAt: Date,
    refundTxSignature: String,
    
    // Provably Fair (optional for future)
    serverSeedHash: String,
    
    timestamp: { type: Date, default: Date.now, index: true }
    
}, { timestamps: true });

gachaRollSchema.index({ ownerId: 1, timestamp: -1 });
gachaRollSchema.index({ requiresRefund: 1, status: 1 }); // For admin dashboard to find failed rolls
gachaRollSchema.index({ rarity: 1, timestamp: -1 }); // For rare drop queries
```

### 4.4 Extend Transaction.js

**File:** `server/db/models/Transaction.js` (MODIFY)

```javascript
// ADD to type enum:
type: {
    // ... existing ...
    'gacha_roll',        // SOL spent on gacha
    'gacha_dupe_gold',   // Gold from duplicate
    'gold_sink_reroll',  // Gold spent on reroll
    'gold_sink_holo',    // Gold spent on holo blessing
}

// ADD to relatedData:
relatedData: {
    // ... existing ...
    gachaRollId: String,
    cosmeticInstanceId: String,
}
```

### 4.5 Extend User.js

**File:** `server/db/models/User.js` (MODIFY)

```javascript
// ADD fields (don't remove existing):
gachaStats: {
    totalRolls: { type: Number, default: 0 },
    totalSolSpent: { type: Number, default: 0 },
    rarestRarity: { type: String, default: null },
    divineCount: { type: Number, default: 0 },
    mythicCount: { type: Number, default: 0 },
    legendaryCount: { type: Number, default: 0 },
    epicCount: { type: Number, default: 0 },
    rareCount: { type: Number, default: 0 },
    firstRollAt: Date,
    lastRollAt: Date,
    
    // Pity counters - track consecutive rolls without hitting rarity
    // These reset when you hit that rarity or higher
    pity: {
        rollsSinceRare: { type: Number, default: 0 },      // Rolls since last Rare+
        rollsSinceEpic: { type: Number, default: 0 },      // Rolls since last Epic+
        rollsSinceLegendary: { type: Number, default: 0 }, // Rolls since last Legendary+
    }
},

// IMPORTANT: ownsCosmetic is currently SYNC - changing to async is breaking!
// Solution: Add NEW async method, keep sync for backwards compat

// KEEP existing ownsCosmetic (sync) - for legacy code
// ADD NEW method: ownsOwnedCosmetic (async) - for gacha system

userSchema.methods.ownsOwnedCosmetic = async function(cosmeticId) {
    // Quick sync checks first
    if (cosmeticId === 'none') return true;
    if (this.unlockedCosmetics.includes(cosmeticId)) return true;
    if (this.unlockedMounts.includes(cosmeticId)) return true;
    
    // Async check for gacha-owned items
    const OwnedCosmetic = mongoose.model('OwnedCosmetic');
    const owned = await OwnedCosmetic.findOne({
        ownerId: this.walletAddress,
        templateId: cosmeticId,
        convertedToGold: false
    });
    
    return !!owned;
};

// NOTE: UserService.updateProfile() calls user.ownsCosmetic() (sync)
// For Phase 1, we keep this sync - gacha unlocks also add to unlockedCosmetics
// This means gacha items are ALSO added to the legacy array for compatibility
```

---

## Part 5: Service Layer

### 5.1 GachaService (NEW)

**File:** `server/services/GachaService.js`

```javascript
/**
 * GachaService - Cosmetic gacha system
 * 
 * REUSES:
 * - Weighted RNG pattern from SlotService
 * - Unlock pattern from PromoCodeService
 * - Transaction logging from Transaction model
 * 
 * INTEGRATES WITH:
 * - CustodialWalletService for SOL verification
 * - UserService for gold/stats updates
 */

import CosmeticTemplate from '../db/models/CosmeticTemplate.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import GachaRoll from '../db/models/GachaRoll.js';
import { Transaction, User } from '../db/models/index.js';
import solanaPaymentService from './SolanaPaymentService.js';

// Rarity weights (total: 10000 for precision)
const RARITY_WEIGHTS = {
    common: 5500,      // 55.00%
    uncommon: 2800,    // 28.00%
    rare: 1200,        // 12.00%
    epic: 400,         // 4.00%
    legendary: 80,     // 0.80%
    mythic: 18,        // 0.18%
    divine: 2          // 0.02%
};
const TOTAL_RARITY_WEIGHT = 10000;

// Quality weights
const QUALITY_WEIGHTS = {
    worn: 35,
    standard: 40,
    pristine: 20,
    flawless: 5
};
const TOTAL_QUALITY_WEIGHT = 100;

// Holographic chance
const HOLO_CHANCE = 0.08; // 8%

// ========== PEBBLE PRICING ==========
// 1 SOL = 1000 Pebbles, so 25 Pebbles = 0.025 SOL
const ROLL_PRICE_PEBBLES = 25;
const PEBBLES_PER_SOL = 1000;
const WITHDRAWAL_RAKE_PERCENT = 5; // 5% rake on withdrawals
const MIN_DEPOSIT_PEBBLES = 100;   // 0.1 SOL minimum
const MIN_WITHDRAWAL_PEBBLES = 100;

// ==============================================
// PITY SYSTEM CONFIGURATION
// ==============================================
// Pity does NOT add extra items - it just shifts WHEN drops happen
// This preserves economy balance while reducing frustration
//
// How it works:
// - Track consecutive rolls without hitting certain rarities
// - At soft pity thresholds, boost odds slightly
// - At hard pity, guarantee the minimum rarity
// - Pity counters reset when you hit that rarity or higher
// ==============================================
const PITY_CONFIG = {
    rare: {
        softPity: 20,      // After 20 rolls without Rare+, odds increase
        softBoost: 0.25,   // +25% chance to get Rare+ at soft pity
        hardPity: 40,      // After 40 rolls, guarantee Rare+
    },
    epic: {
        softPity: 60,      // After 60 rolls without Epic+
        softBoost: 0.15,   // +15% chance boost
        hardPity: 100,     // Guarantee Epic+ after 100 rolls
    },
    legendary: {
        softPity: 200,     // After 200 rolls without Legendary+
        softBoost: 0.10,   // +10% chance boost
        hardPity: 400,     // Guarantee Legendary+ after 400 rolls
    }
    // NO PITY for Mythic/Divine - keeps them truly rare
};

class GachaService {
    /**
     * GachaService follows the same constructor pattern as SlotService/FishingService
     * BUT also receives broadcastToAll for server-wide announcements
     * 
     * @param {UserService} userService - For coin/unlock operations
     * @param {Function} broadcastToRoom - Broadcast to players in same room
     * @param {Function} sendToPlayer - Send to specific player
     * @param {Function} broadcastToAll - Broadcast to ALL connected players (for gacha announcements)
     */
    constructor(userService, broadcastToRoom, sendToPlayer, broadcastToAll = null) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        this.broadcastToAll = broadcastToAll; // For server-wide gacha announcements
        
        // Cache for gacha pool (refresh periodically)
        this.gachaPoolCache = null;
        this.cacheExpiry = 0;
        
        console.log('🎰 GachaService initialized');
    }
    
    // ==================== CORE ROLLING ====================
    
    /**
     * Execute a gacha roll using Pebbles (premium currency)
     * NO wallet signature required - instant roll!
     * 
     * @param {string} walletAddress - User's wallet
     * @param {string} collection - Collection to roll from
     * @param {string} username - Player's display name (for announcements)
     * @returns {Promise<object>} Roll result
     */
    async roll(walletAddress, collection = 'OG Collection', username = 'Anonymous') {
        // 1. Check and deduct Pebbles (instant, no blockchain!)
        const deductResult = await this._deductPebbles(walletAddress, ROLL_PRICE_PEBBLES);
        if (!deductResult.success) {
            return { 
                success: false, 
                error: deductResult.error,
                message: deductResult.message,
                pebbleBalance: deductResult.balance,
                required: ROLL_PRICE_PEBBLES
            };
        }
        
        // 2. Get gacha pool
        const pool = await this._getGachaPool(collection);
        if (pool.length === 0) {
            return { success: false, error: 'NO_ITEMS_IN_POOL' };
        }
        
        // 3. Get user's pity counters
        const user = await this.userService.getUser(walletAddress);
        const pity = user?.gachaStats?.pity || {
            rollsSinceRare: 0,
            rollsSinceEpic: 0,
            rollsSinceLegendary: 0
        };
        
        // 4. Roll rarity (with pity system)
        const rarity = this._rollRarityWithPity(pity);
        
        // 5. Select template from rarity tier
        const template = this._selectTemplate(pool, rarity);
        if (!template) {
            // Fallback to lower rarity if none available
            return { success: false, error: 'NO_TEMPLATE_FOR_RARITY' };
        }
        
        // 6. Roll quality
        const quality = this._rollQuality();
        
        // 7. Roll holographic
        const isHolographic = template.canBeHolographic && this._rollHolo();
        
        // 8. Check for duplicate
        const isDuplicate = await this._checkDuplicate(walletAddress, template.templateId);
        
        // 9. Process result (with error handling!)
        // CRITICAL: If this fails after payment verification, user loses SOL
        // We wrap in try-catch to ensure proper error response
        let result;
        try {
            if (isDuplicate) {
                result = await this._processDuplicate(walletAddress, template, quality, isHolographic);
            } else {
                result = await this._mintCosmetic(walletAddress, template, quality, isHolographic);
            }
        } catch (mintError) {
            console.error(`🚨 CRITICAL: Minting failed for ${walletAddress}:`, mintError.message);
            console.error(`   Template: ${template.templateId}`);
            
            // Log failed roll for manual review
            // Note: Pebbles were already deducted, need to refund
            await this._logFailedRoll(walletAddress, template, mintError.message);
            
            // Refund pebbles on failure
            await User.updateOne(
                { walletAddress },
                { $inc: { pebbles: ROLL_PRICE_PEBBLES, 'pebbleStats.totalSpent': -ROLL_PRICE_PEBBLES } }
            );
            
            return { 
                success: false, 
                error: 'MINT_FAILED',
                message: 'Roll failed. Pebbles refunded.',
                requiresManualReview: true
            };
        }
        
        // 10. Log roll (no txSignature needed - pebbles are server-side)
        await this._logRoll(walletAddress, template, result, quality, isHolographic, collection);
        
        // 11. Update user stats AND pity counters
        await this._updateUserStats(walletAddress, rarity, pity);
        
        // 12. Build response
        const rollResult = {
            success: true,
            templateId: template.templateId,
            name: template.name,
            category: template.category,
            rarity: template.rarity,
            quality,
            isHolographic,
            isDuplicate,
            goldAwarded: result.goldAwarded || 0,
            instanceId: result.instanceId || null,
            serialNumber: result.serialNumber || null,
            isFirstEdition: result.isFirstEdition || false
        };
        
        // 13. Server-wide announcement (ALL drops announced!)
        await this._announceRoll(username, rollResult);
        
        return rollResult;
    }
    
    // ==================== RNG FUNCTIONS ====================
    // (Adapted from SlotService pattern)
    
    /**
     * Roll rarity with pity system
     * Pity doesn't add items - just shifts WHEN they drop
     */
    _rollRarityWithPity(pity) {
        const { rollsSinceRare, rollsSinceEpic, rollsSinceLegendary } = pity;
        
        // Check for hard pity guarantees (highest priority first)
        if (rollsSinceLegendary >= PITY_CONFIG.legendary.hardPity) {
            console.log(`🎊 HARD PITY: Guaranteed Legendary+ after ${rollsSinceLegendary} rolls`);
            return this._rollRarityMinimum('legendary');
        }
        if (rollsSinceEpic >= PITY_CONFIG.epic.hardPity) {
            console.log(`🎊 HARD PITY: Guaranteed Epic+ after ${rollsSinceEpic} rolls`);
            return this._rollRarityMinimum('epic');
        }
        if (rollsSinceRare >= PITY_CONFIG.rare.hardPity) {
            console.log(`🎊 HARD PITY: Guaranteed Rare+ after ${rollsSinceRare} rolls`);
            return this._rollRarityMinimum('rare');
        }
        
        // Calculate soft pity boost
        let boostRare = 0, boostEpic = 0, boostLegendary = 0;
        
        if (rollsSinceLegendary >= PITY_CONFIG.legendary.softPity) {
            boostLegendary = PITY_CONFIG.legendary.softBoost;
        }
        if (rollsSinceEpic >= PITY_CONFIG.epic.softPity) {
            boostEpic = PITY_CONFIG.epic.softBoost;
        }
        if (rollsSinceRare >= PITY_CONFIG.rare.softPity) {
            boostRare = PITY_CONFIG.rare.softBoost;
        }
        
        // Apply soft pity (boost check before normal roll)
        if (boostLegendary > 0 && Math.random() < boostLegendary) {
            console.log(`✨ SOFT PITY: Legendary+ boost triggered!`);
            return this._rollRarityMinimum('legendary');
        }
        if (boostEpic > 0 && Math.random() < boostEpic) {
            console.log(`✨ SOFT PITY: Epic+ boost triggered!`);
            return this._rollRarityMinimum('epic');
        }
        if (boostRare > 0 && Math.random() < boostRare) {
            console.log(`✨ SOFT PITY: Rare+ boost triggered!`);
            return this._rollRarityMinimum('rare');
        }
        
        // Normal roll
        return this._rollRarity();
    }
    
    /**
     * Roll rarity with minimum floor (for pity)
     */
    _rollRarityMinimum(minimum) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'];
        const minIndex = rarityOrder.indexOf(minimum);
        
        // Build weights for only minimum+ rarities
        const eligibleWeights = {};
        let totalWeight = 0;
        
        for (let i = minIndex; i < rarityOrder.length; i++) {
            const rarity = rarityOrder[i];
            eligibleWeights[rarity] = RARITY_WEIGHTS[rarity];
            totalWeight += RARITY_WEIGHTS[rarity];
        }
        
        // Roll within eligible rarities
        let roll = Math.floor(Math.random() * totalWeight);
        for (const [rarity, weight] of Object.entries(eligibleWeights)) {
            roll -= weight;
            if (roll < 0) return rarity;
        }
        
        return minimum; // Fallback
    }
    
    /**
     * Standard rarity roll (no pity)
     */
    _rollRarity() {
        let roll = Math.floor(Math.random() * TOTAL_RARITY_WEIGHT);
        for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
            roll -= weight;
            if (roll < 0) return rarity;
        }
        return 'common';
    }
    
    _rollQuality() {
        let roll = Math.floor(Math.random() * TOTAL_QUALITY_WEIGHT);
        for (const [quality, weight] of Object.entries(QUALITY_WEIGHTS)) {
            roll -= weight;
            if (roll < 0) return quality;
        }
        return 'standard';
    }
    
    _rollHolo() {
        return Math.random() < HOLO_CHANCE;
    }
    
    _selectTemplate(pool, rarity) {
        const candidates = pool.filter(t => t.rarity === rarity);
        if (candidates.length === 0) {
            // Fallback: try lower rarities
            const rarityOrder = ['divine', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
            const currentIdx = rarityOrder.indexOf(rarity);
            for (let i = currentIdx + 1; i < rarityOrder.length; i++) {
                const fallback = pool.filter(t => t.rarity === rarityOrder[i]);
                if (fallback.length > 0) {
                    return fallback[Math.floor(Math.random() * fallback.length)];
                }
            }
            return null;
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
    
    // ==================== SERVER ANNOUNCEMENTS ====================
    
    /**
     * Announce roll to all online players
     * ALL drops are announced (per user request)
     */
    async _announceRoll(username, result) {
        if (!this.broadcastToAll) return;
        
        const { rarity, name, quality, isHolographic, isFirstEdition, serialNumber, isDuplicate } = result;
        
        // Build announcement message
        const rarityEmoji = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟠',
            mythic: '🔴',
            divine: '🌟'
        };
        
        const qualityTag = quality === 'flawless' ? ' ✨FLAWLESS✨' : 
                          quality === 'pristine' ? ' 💎Pristine' : '';
        const holoTag = isHolographic ? ' 🌈HOLO' : '';
        const firstEdTag = isFirstEdition ? ' 🏆FIRST EDITION' : '';
        const serialTag = serialNumber ? ` #${serialNumber}` : '';
        const dupeTag = isDuplicate ? ' (duplicate → gold)' : '';
        
        // Format based on rarity for visual impact
        let announcement;
        if (rarity === 'divine') {
            announcement = {
                type: 'gacha_announcement',
                level: 'divine',
                message: `🌟🌟🌟 ${username} pulled a DIVINE ${name}${qualityTag}${holoTag}${firstEdTag}${serialTag}! 🌟🌟🌟`,
                sound: 'divine_drop'
            };
        } else if (rarity === 'mythic') {
            announcement = {
                type: 'gacha_announcement',
                level: 'mythic',
                message: `🔴🔴 ${username} pulled a MYTHIC ${name}${qualityTag}${holoTag}${firstEdTag}${serialTag}! 🔴🔴`,
                sound: 'mythic_drop'
            };
        } else if (rarity === 'legendary') {
            announcement = {
                type: 'gacha_announcement',
                level: 'legendary',
                message: `🟠 ${username} pulled a Legendary ${name}${qualityTag}${holoTag}${firstEdTag}${serialTag}!`,
                sound: 'legendary_drop'
            };
        } else {
            // Common through Epic - simpler announcement
            announcement = {
                type: 'gacha_announcement',
                level: rarity,
                message: `${rarityEmoji[rarity]} ${username} pulled ${name}${qualityTag}${holoTag}${firstEdTag}${dupeTag}`,
                sound: null
            };
        }
        
        // Broadcast to all connected players
        this.broadcastToAll(announcement);
    }
    
    // ==================== DUPLICATE HANDLING ====================
    
    async _checkDuplicate(walletAddress, templateId) {
        const existing = await OwnedCosmetic.findOne({
            ownerId: walletAddress,
            templateId,
            convertedToGold: false
        });
        return !!existing;
    }
    
    async _processDuplicate(walletAddress, template, quality, isHolographic) {
        // Calculate gold value
        const goldValue = this._calculateGoldValue(template, quality, isHolographic);
        
        // Award gold (reuse UserService pattern)
        await this.userService.addCoins(
            walletAddress,
            goldValue,
            'gacha_dupe_gold',
            { templateId: template.templateId },
            `Duplicate ${template.name} → ${goldValue} gold`
        );
        
        return { goldAwarded: goldValue, isDuplicate: true };
    }
    
    _calculateGoldValue(template, quality, isHolographic) {
        let value = template.duplicateGoldBase;
        
        // Quality multiplier
        const qualityMult = {
            worn: 0.7,
            standard: 1.0,
            pristine: 1.8,
            flawless: 4.0
        };
        value *= qualityMult[quality] || 1.0;
        
        // Holo multiplier
        if (isHolographic) value *= 3.0;
        
        return Math.floor(value);
    }
    
    // ==================== MINTING ====================
    
    async _mintCosmetic(walletAddress, template, quality, isHolographic) {
        // ATOMIC: Get serial and first edition in ONE database operation
        // This prevents race conditions where two concurrent rolls could get same serial
        const { serialNumber, isFirstEdition } = await this._getNextSerialAtomic(template.templateId);
        
        // Create instance (no txSignature needed - pebbles are server-side)
        const instance = new OwnedCosmetic({
            instanceId: OwnedCosmetic.generateInstanceId(),
            templateId: template.templateId,
            ownerId: walletAddress,
            serialNumber,
            quality,
            isHolographic,
            isFirstEdition,
            mintedBy: walletAddress,
            acquisitionMethod: 'gacha_roll'
        });
        
        await instance.save();
        
        // NOTE: totalMinted was already incremented atomically in _getNextSerialAtomic()
        // DO NOT increment again here!
        
        // Add to user's unlocked cosmetics (for backwards compat with sync ownsCosmetic)
        // This follows the PromoCodeService._applyUnlocks() pattern (direct array push)
        const user = await this.userService.getUser(walletAddress);
        if (user) {
            const category = template.category;
            if (category === 'mount') {
                if (!user.unlockedMounts.includes(template.templateId)) {
                    user.unlockedMounts.push(template.templateId);
                    user.stats.unlocks.totalMountsOwned++;
                }
            } else {
                if (!user.unlockedCosmetics.includes(template.templateId)) {
                    user.unlockedCosmetics.push(template.templateId);
                    user.stats.unlocks.totalCosmeticsOwned++;
                }
            }
            await user.save();
        }
        
        return {
            instanceId: instance.instanceId,
            serialNumber,
            isFirstEdition
        };
    }
    
    /**
     * Atomically get next serial number using findOneAndUpdate
     * This prevents race condition where two concurrent rolls could get same serial
     * 
     * @param {string} templateId - Template to get serial for
     * @returns {Promise<{serialNumber: number, isFirstEdition: boolean}>}
     */
    async _getNextSerialAtomic(templateId) {
        // Use findOneAndUpdate with $inc for atomic counter
        // This is the ONLY safe way to handle concurrent rolls
        const result = await CosmeticTemplate.findOneAndUpdate(
            { templateId },
            { $inc: { totalMinted: 1 } },
            { new: true } // Return updated document
        );
        
        if (!result) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        const serialNumber = result.totalMinted;
        const isFirstEdition = serialNumber <= 3; // Serial 1, 2, 3 are First Edition
        
        return { serialNumber, isFirstEdition };
    }
    
    // ==================== CACHING ====================
    
    async _getGachaPool(collection) {
        const now = Date.now();
        if (this.gachaPoolCache && this.cacheExpiry > now) {
            return collection 
                ? this.gachaPoolCache.filter(t => t.collection === collection)
                : this.gachaPoolCache;
        }
        
        // Refresh cache
        this.gachaPoolCache = await CosmeticTemplate.getGachaPool();
        this.cacheExpiry = now + (5 * 60 * 1000); // 5 min cache
        
        return collection 
            ? this.gachaPoolCache.filter(t => t.collection === collection)
            : this.gachaPoolCache;
    }
    
    // ==================== PAYMENT VERIFICATION ====================
    
    /**
     * Verify SOL payment using SolanaPaymentService
     * Gacha payments go to RAKE_WALLET (same as P2P rake)
     * 
     * @param {string} txSignature - Transaction signature from player
     * @param {string} playerWallet - Player's wallet (sender)
     * @param {number} expectedAmount - Expected SOL amount
     */
    // ==================== PEBBLE OPERATIONS ====================
    
    /**
     * Deduct pebbles for a gacha roll (instant, no blockchain!)
     * @param {string} walletAddress - User's wallet
     * @param {number} amount - Pebbles to deduct
     */
    async _deductPebbles(walletAddress, amount) {
        const user = await this.userService.getUser(walletAddress);
        
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND', message: 'Please connect your wallet' };
        }
        
        if ((user.pebbles || 0) < amount) {
            return { 
                success: false, 
                error: 'INSUFFICIENT_PEBBLES',
                message: `Need ${amount} Pebbles, you have ${user.pebbles || 0}`,
                balance: user.pebbles || 0
            };
        }
        
        // Atomic deduction
        const result = await User.findOneAndUpdate(
            { walletAddress, pebbles: { $gte: amount } }, // Only if enough balance
            { 
                $inc: { 
                    pebbles: -amount,
                    'pebbleStats.totalSpent': amount
                }
            },
            { new: true }
        );
        
        if (!result) {
            // Race condition - balance changed between check and update
            return { success: false, error: 'INSUFFICIENT_PEBBLES', message: 'Please try again' };
        }
        
        return { success: true, newBalance: result.pebbles };
    }
    
    /**
     * Deposit SOL to get Pebbles
     * Uses EXISTING SPL token verification (same as P2P wagers!)
     * User sends wrapped SOL (or any SPL) to RAKE_WALLET
     * 
     * @param {string} walletAddress - User's wallet
     * @param {string} txSignature - SPL transfer transaction signature
     * @param {string} tokenAddress - Token mint (use wrapped SOL mint for SOL)
     * @param {number} amount - Amount in token units (e.g., SOL amount)
     * @param {number} decimals - Token decimals (9 for SOL)
     */
    async depositPebbles(walletAddress, txSignature, tokenAddress, amount, decimals = 9) {
        const rakeWallet = process.env.RAKE_WALLET;
        if (!rakeWallet) {
            return { success: false, error: 'NOT_CONFIGURED' };
        }
        
        // Use EXISTING SPL verification (same as P2P wagers!)
        const amountRaw = Math.floor(amount * Math.pow(10, decimals));
        
        const verifyResult = await solanaPaymentService.verifyTransaction(
            txSignature,
            walletAddress,          // Expected sender
            rakeWallet,             // Expected recipient (RAKE_WALLET)
            tokenAddress,           // Token mint (wrapped SOL for SOL deposits)
            amountRaw,              // Amount in raw units
            { 
                transactionType: 'pebble_deposit', 
                tokenSymbol: 'SOL' 
            }
        );
        
        if (!verifyResult.success) {
            return { success: false, error: verifyResult.error };
        }
        
        // Calculate pebbles (1 SOL = 1000 Pebbles)
        const pebblesToAdd = Math.floor(amount * PEBBLES_PER_SOL);
        
        if (pebblesToAdd < MIN_DEPOSIT_PEBBLES) {
            return { 
                success: false, 
                error: 'BELOW_MINIMUM',
                message: `Minimum deposit is ${MIN_DEPOSIT_PEBBLES} Pebbles (${MIN_DEPOSIT_PEBBLES / PEBBLES_PER_SOL} SOL)`
            };
        }
        
        // Credit pebbles
        const user = await User.findOneAndUpdate(
            { walletAddress },
            { 
                $inc: { 
                    pebbles: pebblesToAdd,
                    'pebbleStats.totalDeposited': pebblesToAdd
                },
                $set: { 'pebbleStats.lastDepositAt': new Date() }
            },
            { new: true, upsert: false }
        );
        
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND' };
        }
        
        // Log transaction
        await Transaction.record({
            type: 'pebble_deposit',
            toWallet: walletAddress,
            amount: pebblesToAdd,
            toBalanceAfter: user.pebbles,
            relatedData: { txSignature, tokenAddress, amount },
            reason: `Deposited ${amount} SOL → ${pebblesToAdd} Pebbles`
        });
        
        console.log(`🪨 Pebble deposit: ${walletAddress.slice(0,8)}... +${pebblesToAdd} Pebbles (${amount} SOL)`);
        
        return { 
            success: true, 
            pebblesAdded: pebblesToAdd,
            newBalance: user.pebbles,
            txSignature
        };
    }
    
    /**
     * Withdraw Pebbles to SOL (5% rake)
     * Initiates a SOL payout from custodial wallet
     * 
     * @param {string} walletAddress - User's wallet
     * @param {number} pebbleAmount - Pebbles to withdraw
     */
    async withdrawPebbles(walletAddress, pebbleAmount) {
        if (pebbleAmount < MIN_WITHDRAWAL_PEBBLES) {
            return { 
                success: false, 
                error: 'BELOW_MINIMUM',
                message: `Minimum withdrawal is ${MIN_WITHDRAWAL_PEBBLES} Pebbles`
            };
        }
        
        const user = await this.userService.getUser(walletAddress);
        if (!user || (user.pebbles || 0) < pebbleAmount) {
            return { success: false, error: 'INSUFFICIENT_PEBBLES' };
        }
        
        // Calculate SOL amount with 5% rake
        const grossSol = pebbleAmount / PEBBLES_PER_SOL;
        const rakeSol = grossSol * (WITHDRAWAL_RAKE_PERCENT / 100);
        const netSol = grossSol - rakeSol;
        const rakePebbles = Math.floor(pebbleAmount * (WITHDRAWAL_RAKE_PERCENT / 100));
        
        // Deduct pebbles atomically
        const deductResult = await User.findOneAndUpdate(
            { walletAddress, pebbles: { $gte: pebbleAmount } },
            { 
                $inc: { 
                    pebbles: -pebbleAmount,
                    'pebbleStats.totalWithdrawn': pebbleAmount,
                    'pebbleStats.totalRakePaid': rakePebbles
                },
                $set: { 'pebbleStats.lastWithdrawalAt': new Date() }
            },
            { new: true }
        );
        
        if (!deductResult) {
            return { success: false, error: 'INSUFFICIENT_PEBBLES' };
        }
        
        // Send SOL to user (using custodial wallet)
        // NOTE: This requires adding native SOL payout to CustodialWalletService
        const payoutResult = await this._sendSolPayout(walletAddress, netSol);
        
        if (!payoutResult.success) {
            // CRITICAL: Refund pebbles if payout fails!
            await User.updateOne(
                { walletAddress },
                { $inc: { pebbles: pebbleAmount, 'pebbleStats.totalWithdrawn': -pebbleAmount } }
            );
            return { success: false, error: 'PAYOUT_FAILED', message: 'Withdrawal failed, pebbles refunded' };
        }
        
        console.log(`🪨 Pebble withdrawal: ${walletAddress.slice(0,8)}... -${pebbleAmount} Pebbles → ${netSol} SOL (${rakeSol} SOL rake)`);
        
        return {
            success: true,
            pebblesWithdrawn: pebbleAmount,
            solReceived: netSol,
            rakePaid: rakeSol,
            txSignature: payoutResult.txId,
            newBalance: deductResult.pebbles
        };
    }
    
    async _sendSolPayout(walletAddress, solAmount) {
        // TODO: Implement native SOL payout via CustodialWalletService
        // For now, return placeholder
        // This needs: custodialWalletService.sendNativeSOL(walletAddress, lamports)
        console.log(`💸 Would send ${solAmount} SOL to ${walletAddress.slice(0,8)}...`);
        return { success: false, error: 'NOT_IMPLEMENTED' };
    }
    
    /**
     * Get user's pebble balance and stats
     */
    async getPebbleBalance(walletAddress) {
        const user = await this.userService.getUser(walletAddress);
        return {
            balance: user?.pebbles || 0,
            stats: user?.pebbleStats || {},
            rollCost: ROLL_PRICE_PEBBLES,
            canRoll: (user?.pebbles || 0) >= ROLL_PRICE_PEBBLES
        };
    }
    
    // ==================== LOGGING ====================
    
    async _logRoll(walletAddress, template, result, quality, isHolographic, collection) {
        const roll = new GachaRoll({
            rollId: `roll_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            ownerId: walletAddress,
            collection,
            pebblesPaid: ROLL_PRICE_PEBBLES, // Changed from solPaid
            templateId: template.templateId,
            instanceId: result.instanceId || null,
            rarity: template.rarity,
            quality,
            isHolographic,
            isDuplicate: result.isDuplicate || false,
            goldAwarded: result.goldAwarded || 0,
            status: 'success'
        });
        
        await roll.save();
    }
    
    /**
     * Log failed rolls for manual review
     * Note: With Pebbles, we auto-refund on failure, so this is just for audit
     */
    async _logFailedRoll(walletAddress, template, errorMessage) {
        try {
            const roll = new GachaRoll({
                rollId: `roll_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                ownerId: walletAddress,
                pebblesPaid: ROLL_PRICE_PEBBLES,
                templateId: template?.templateId || 'unknown',
                status: 'failed',
                errorMessage,
                requiresRefund: false // Pebbles auto-refunded
            });
            
            await roll.save();
            console.error(`📝 Failed roll logged (pebbles refunded): ${roll.rollId}`);
        } catch (logError) {
            console.error(`🚨 Could not log failed roll:`, logError.message);
        }
    }
    
    async _updateUserStats(walletAddress, rarity, currentPity) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'];
        const rarityIndex = rarityOrder.indexOf(rarity);
        
        // Calculate new pity counters
        // Reset counters for hit rarity and below
        const newPity = {
            rollsSinceRare: rarityIndex >= 2 ? 0 : currentPity.rollsSinceRare + 1,
            rollsSinceEpic: rarityIndex >= 3 ? 0 : currentPity.rollsSinceEpic + 1,
            rollsSinceLegendary: rarityIndex >= 4 ? 0 : currentPity.rollsSinceLegendary + 1
        };
        
        const update = {
            $inc: {
                'gachaStats.totalRolls': 1,
                'gachaStats.totalPebblesSpent': ROLL_PRICE_PEBBLES
            },
            $set: { 
                'gachaStats.lastRollAt': new Date(),
                'gachaStats.pity.rollsSinceRare': newPity.rollsSinceRare,
                'gachaStats.pity.rollsSinceEpic': newPity.rollsSinceEpic,
                'gachaStats.pity.rollsSinceLegendary': newPity.rollsSinceLegendary
            }
        };
        
        // Track drop counts by rarity
        if (rarity === 'divine') update.$inc['gachaStats.divineCount'] = 1;
        if (rarity === 'mythic') update.$inc['gachaStats.mythicCount'] = 1;
        if (rarity === 'legendary') update.$inc['gachaStats.legendaryCount'] = 1;
        if (rarity === 'epic') update.$inc['gachaStats.epicCount'] = 1;
        if (rarity === 'rare') update.$inc['gachaStats.rareCount'] = 1;
        
        // Update rarest drop if applicable
        const user = await this.userService.getUser(walletAddress);
        const currentRarest = user?.gachaStats?.rarestRarity;
        const currentRarestIndex = currentRarest ? rarityOrder.indexOf(currentRarest) : -1;
        
        if (rarityIndex > currentRarestIndex) {
            update.$set['gachaStats.rarestRarity'] = rarity;
        }
        
        await this.userService.updateUserRaw(walletAddress, update);
    }
    
    // ==================== QUERIES ====================
    
    async getOwnedCosmetics(walletAddress, filters = {}) {
        const query = { ownerId: walletAddress, convertedToGold: false };
        
        // Get owned cosmetic instances
        const instances = await OwnedCosmetic.find(query).sort({ mintedAt: -1 });
        
        if (instances.length === 0) return [];
        
        // Get templates for all owned cosmetics (manual join since templateId is String, not ref)
        const templateIds = [...new Set(instances.map(i => i.templateId))];
        const templates = await CosmeticTemplate.find({ templateId: { $in: templateIds } });
        const templateMap = new Map(templates.map(t => [t.templateId, t]));
        
        // Merge instance data with template data
        return instances.map(instance => {
            const template = templateMap.get(instance.templateId);
            return {
                ...instance.toObject(),
                template: template ? {
                    name: template.name,
                    category: template.category,
                    rarity: template.rarity,
                    assetKey: template.assetKey
                } : null
            };
        }).filter(i => !filters.category || i.template?.category === filters.category);
    }
    
    async getRollHistory(walletAddress, limit = 50) {
        return GachaRoll.find({ ownerId: walletAddress })
            .sort({ timestamp: -1 })
            .limit(limit);
    }
    
    // ==================== STATIC INFO ====================
    
    static getRates() {
        return {
            rarities: Object.entries(RARITY_WEIGHTS).map(([rarity, weight]) => ({
                rarity,
                rate: (weight / TOTAL_RARITY_WEIGHT * 100).toFixed(2) + '%'
            })),
            qualities: Object.entries(QUALITY_WEIGHTS).map(([quality, weight]) => ({
                quality,
                rate: weight + '%'
            })),
            holoChance: (HOLO_CHANCE * 100) + '%',
            rollPrice: ROLL_PRICE_PEBBLES + ' Pebbles',
            rollPriceSol: (ROLL_PRICE_PEBBLES / PEBBLES_PER_SOL) + ' SOL'
        };
    }
}

export default GachaService;
export { 
    RARITY_WEIGHTS, 
    QUALITY_WEIGHTS, 
    HOLO_CHANCE, 
    ROLL_PRICE_PEBBLES,
    PEBBLES_PER_SOL,
    WITHDRAWAL_RAKE_PERCENT 
};
```

---

## Part 6: Integration Points

### 6.1 Register Service in index.js

```javascript
// server/index.js - ADD to imports at top (~line 20)
import { GachaService } from './services/index.js';

// server/index.js - ADD after line 317 (after blackjackService init)
// GachaService gets broadcastToAll as 4th param for server-wide announcements
const gachaService = new GachaService(userService, broadcastToRoom, sendToPlayer, broadcastToAll);
```

**Note:** This follows the existing pattern (SlotService line 315) but adds `broadcastToAll` as 4th parameter for server-wide gacha announcements.

### 6.2 WebSocket Message Handler

```javascript
// server/index.js - ADD to handleMessage() switch (after slot_sync case ~line 3395)

case 'gacha_roll': {
    // Player wants to roll the gacha (uses Pebbles - instant, no signing!)
    const player = players.get(playerId);
    
    if (!player?.walletAddress) {
        sendToPlayer(playerId, { 
            type: 'gacha_error', 
            error: 'AUTH_REQUIRED',
            message: 'You must be logged in to use the gacha'
        });
        break;
    }
    
    const { collection } = message;
    
    // Roll using Pebbles (instant - no tx signature needed!)
    const result = await gachaService.roll(
        player.walletAddress, 
        collection || 'OG Collection',
        player.name  // For announcements
    );
    
    if (result.success) {
        // Send roll result
        sendToPlayer(playerId, {
            type: 'gacha_result',
            ...result
        });
        
        // Send updated pebble balance
        const pebbleInfo = await gachaService.getPebbleBalance(player.walletAddress);
        sendToPlayer(playerId, {
            type: 'pebble_update',
            balance: pebbleInfo.balance,
            canRoll: pebbleInfo.canRoll
        });
        
        // Update coins display (gold from duplicates)
        if (result.goldAwarded > 0) {
            const user = await userService.getUser(player.walletAddress);
            sendToPlayer(playerId, {
                type: 'coins_update',
                coins: user?.coins || 0,
                isAuthenticated: true
            });
        }
    } else {
        sendToPlayer(playerId, {
            type: 'gacha_error',
            error: result.error,
            message: result.message || 'Not enough Pebbles!',
            pebbleBalance: result.pebbleBalance,
            required: result.required
        });
    }
    break;
}

case 'gacha_get_rates': {
    // Get gacha rates for UI display
    sendToPlayer(playerId, {
        type: 'gacha_rates',
        rates: GachaService.getRates()
    });
    break;
}

case 'gacha_get_collection': {
    // Get user's owned cosmetics
    const player = players.get(playerId);
    if (!player?.walletAddress) {
        sendToPlayer(playerId, { type: 'gacha_collection', items: [] });
        break;
    }
    
    const items = await gachaService.getOwnedCosmetics(player.walletAddress);
    sendToPlayer(playerId, {
        type: 'gacha_collection',
        items
    });
    break;
}

case 'gacha_get_history': {
    // Get user's roll history
    const player = players.get(playerId);
    if (!player?.walletAddress) {
        sendToPlayer(playerId, { type: 'gacha_history', rolls: [] });
        break;
    }
    
    const rolls = await gachaService.getRollHistory(player.walletAddress, 50);
    sendToPlayer(playerId, {
        type: 'gacha_history',
        rolls
    });
    break;
}

// ==================== PEBBLE OPERATIONS ====================

case 'pebble_get_balance': {
    // Get user's pebble balance
    const player = players.get(playerId);
    if (!player?.walletAddress) {
        sendToPlayer(playerId, { type: 'pebble_balance', balance: 0, canRoll: false });
        break;
    }
    
    const pebbleInfo = await gachaService.getPebbleBalance(player.walletAddress);
    sendToPlayer(playerId, {
        type: 'pebble_balance',
        ...pebbleInfo
    });
    break;
}

case 'pebble_deposit': {
    // User deposited SOL (as SPL transfer), verify and credit pebbles
    const player = players.get(playerId);
    if (!player?.walletAddress) {
        sendToPlayer(playerId, { type: 'pebble_error', error: 'AUTH_REQUIRED' });
        break;
    }
    
    // Same pattern as P2P wager verification!
    const { txSignature, tokenAddress, amount, decimals } = message;
    if (!txSignature || !tokenAddress || !amount) {
        sendToPlayer(playerId, { type: 'pebble_error', error: 'INVALID_REQUEST' });
        break;
    }
    
    const result = await gachaService.depositPebbles(
        player.walletAddress, 
        txSignature, 
        tokenAddress,  // Wrapped SOL mint for SOL deposits
        amount,
        decimals || 9
    );
    
    if (result.success) {
        sendToPlayer(playerId, {
            type: 'pebble_deposit_success',
            pebblesAdded: result.pebblesAdded,
            newBalance: result.newBalance
        });
    } else {
        sendToPlayer(playerId, {
            type: 'pebble_error',
            error: result.error,
            message: result.message
        });
    }
    break;
}

case 'pebble_withdraw': {
    // User wants to withdraw pebbles to SOL
    const player = players.get(playerId);
    if (!player?.walletAddress) {
        sendToPlayer(playerId, { type: 'pebble_error', error: 'AUTH_REQUIRED' });
        break;
    }
    
    const { pebbleAmount } = message;
    if (!pebbleAmount || pebbleAmount < 100) {
        sendToPlayer(playerId, { 
            type: 'pebble_error', 
            error: 'BELOW_MINIMUM',
            message: 'Minimum withdrawal is 100 Pebbles'
        });
        break;
    }
    
    const result = await gachaService.withdrawPebbles(player.walletAddress, pebbleAmount);
    
    if (result.success) {
        sendToPlayer(playerId, {
            type: 'pebble_withdraw_success',
            pebblesWithdrawn: result.pebblesWithdrawn,
            solReceived: result.solReceived,
            rakePaid: result.rakePaid,
            txSignature: result.txSignature,
            newBalance: result.newBalance
        });
    } else {
        sendToPlayer(playerId, {
            type: 'pebble_error',
            error: result.error,
            message: result.message
        });
    }
    break;
}
```

**Note:** Server-wide announcements happen inside `gachaService._announceRoll()` which uses the `broadcastToAll` function passed to the service constructor.

### 6.3 Update CustomizationPanel.jsx

```javascript
// Check ownership before equipping (already calls server)
// Server will now check OwnedCosmetic in addition to unlockedCosmetics
// No frontend change needed if using existing ownership check flow
```

---

## Part 7: Data Seeding

### 7.1 Seed Script

**File:** `server/scripts/seedCosmetics.js`

```javascript
/**
 * Seed cosmetic templates from existing game assets
 * 
 * Run: node server/scripts/seedCosmetics.js
 */

import mongoose from 'mongoose';
import CosmeticTemplate from '../db/models/CosmeticTemplate.js';

// Map existing assets to templates
// IMPORTANT: assetKey must match frontend cosmetic IDs exactly

const COSMETICS = [
    // ========== SKINS (COLORS) ==========
    // Common colors (55% of pool)
    { templateId: 'skin_blue', name: 'Blue', category: 'skin', rarity: 'common', assetKey: 'blue', duplicateGoldBase: 5 },
    { templateId: 'skin_red', name: 'Red', category: 'skin', rarity: 'common', assetKey: 'red', duplicateGoldBase: 5 },
    { templateId: 'skin_green', name: 'Green', category: 'skin', rarity: 'common', assetKey: 'green', duplicateGoldBase: 5 },
    { templateId: 'skin_yellow', name: 'Yellow', category: 'skin', rarity: 'common', assetKey: 'yellow', duplicateGoldBase: 5 },
    { templateId: 'skin_pink', name: 'Pink', category: 'skin', rarity: 'uncommon', assetKey: 'pink', duplicateGoldBase: 15 },
    { templateId: 'skin_purple', name: 'Purple', category: 'skin', rarity: 'uncommon', assetKey: 'purple', duplicateGoldBase: 15 },
    { templateId: 'skin_orange', name: 'Orange', category: 'skin', rarity: 'uncommon', assetKey: 'orange', duplicateGoldBase: 15 },
    { templateId: 'skin_black', name: 'Black', category: 'skin', rarity: 'rare', assetKey: 'black', duplicateGoldBase: 50 },
    { templateId: 'skin_white', name: 'White', category: 'skin', rarity: 'rare', assetKey: 'white', duplicateGoldBase: 50 },
    { templateId: 'skin_gold', name: 'Gold', category: 'skin', rarity: 'epic', assetKey: 'gold', duplicateGoldBase: 200 },
    { templateId: 'skin_rainbow', name: 'Rainbow', category: 'skin', rarity: 'legendary', assetKey: 'rainbow', duplicateGoldBase: 1000, isAnimated: true },
    
    // ========== HATS ==========
    { templateId: 'hat_none', name: 'No Hat', category: 'hat', rarity: 'common', assetKey: 'none', acquisitionType: 'free', duplicateGoldBase: 0 },
    { templateId: 'hat_propeller', name: 'Propeller Cap', category: 'hat', rarity: 'common', assetKey: 'propeller', duplicateGoldBase: 5 },
    { templateId: 'hat_cowboy', name: 'Cowboy Hat', category: 'hat', rarity: 'uncommon', assetKey: 'cowboy', duplicateGoldBase: 15 },
    { templateId: 'hat_crown', name: 'Crown', category: 'hat', rarity: 'epic', assetKey: 'crown', duplicateGoldBase: 200 },
    { templateId: 'hat_halo', name: 'Halo', category: 'hat', rarity: 'legendary', assetKey: 'halo', duplicateGoldBase: 1000, isAnimated: true },
    
    // ========== PROMO ITEMS (Not in gacha pool) ==========
    { templateId: 'eyes_bonk', name: 'BONK Eyes', category: 'eyes', rarity: 'epic', assetKey: 'bonkEyes', acquisitionType: 'promo', duplicateGoldBase: 200 },
    { templateId: 'body_bonk', name: 'BONK Shirt', category: 'bodyItem', rarity: 'epic', assetKey: 'bonkShirt', acquisitionType: 'promo', duplicateGoldBase: 200 },
    { templateId: 'mount_pengu', name: 'PENGU Mount', category: 'mount', rarity: 'legendary', assetKey: 'penguMount', acquisitionType: 'promo', duplicateGoldBase: 1000 },
    
    // Add more as needed...
];

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('🌱 Seeding cosmetic templates...');
    
    for (const cosmetic of COSMETICS) {
        await CosmeticTemplate.findOneAndUpdate(
            { templateId: cosmetic.templateId },
            { 
                ...cosmetic,
                acquisitionType: cosmetic.acquisitionType || 'gacha',
                collection: 'OG Collection',
                isActive: true,
                canBeHolographic: cosmetic.rarity !== 'common' // Commons can't be holo
            },
            { upsert: true, new: true }
        );
        console.log(`  ✓ ${cosmetic.name} (${cosmetic.rarity})`);
    }
    
    console.log(`\n✅ Seeded ${COSMETICS.length} templates`);
    
    // Print pool summary
    const pool = await CosmeticTemplate.find({ acquisitionType: 'gacha', isActive: true });
    console.log(`\n📊 Gacha Pool Summary:`);
    const byRarity = {};
    pool.forEach(t => {
        byRarity[t.rarity] = (byRarity[t.rarity] || 0) + 1;
    });
    Object.entries(byRarity).forEach(([rarity, count]) => {
        console.log(`   ${rarity}: ${count} items`);
    });
    
    await mongoose.disconnect();
}

seed().catch(console.error);
```

---

## Part 8: Testing Checklist

### Unit Tests

| Test | File | Status |
|------|------|--------|
| Rarity distribution (10k samples) | `GachaService.test.js` | ⬜ |
| Quality distribution (10k samples) | `GachaService.test.js` | ⬜ |
| Holo distribution (10k samples) | `GachaService.test.js` | ⬜ |
| Duplicate detection | `GachaService.test.js` | ⬜ |
| Gold calculation | `GachaService.test.js` | ⬜ |
| Serial number increment | `OwnedCosmetic.test.js` | ⬜ |
| First edition check | `GachaService.test.js` | ⬜ |

### Integration Tests

| Test | Status |
|------|--------|
| Full roll flow (mock payment) | ⬜ |
| Duplicate → gold flow | ⬜ |
| Legacy cosmetic ownership | ⬜ |
| Promo items not in pool | ⬜ |

### Manual Tests

| Test | Expected Result |
|------|-----------------|
| Roll as guest | Error: AUTH_REQUIRED |
| Roll without payment | Error: INVALID_TX_SIGNATURE |
| Roll 100x, check distribution | ~55 common, ~28 uncommon, ~12 rare |
| Get duplicate | Gold awarded, no new instance |
| Equip gacha item | Works |
| Equip promo item without code | Error: NOT_OWNED |

---

## Part 9: File Creation Order

⚠️ **CRITICAL:** Follow this order exactly. Steps 1-4 are blockers that must complete before GachaService can work.

```
# PHASE A: Schema & Models (MUST complete first)
1. server/db/models/Transaction.js         # ⚠️ ADD enum types FIRST (gacha_dupe_gold, etc.)
2. server/db/models/CosmeticTemplate.js    # NEW - defines gacha pool
3. server/db/models/OwnedCosmetic.js       # NEW - user's minted items
4. server/db/models/GachaRoll.js           # NEW - audit trail
5. server/db/models/User.js                # MODIFY (add gachaStats + pity counters)
6. server/db/models/index.js               # MODIFY (export new models)

# PHASE B: Service Layer
7. server/services/UserService.js          # MODIFY (add updateUserRaw method)
8. server/services/GachaService.js         # NEW - core gacha logic
9. server/services/index.js                # MODIFY (export GachaService)

# PHASE C: Integration
10. server/index.js                        # MODIFY (init service, add WebSocket handlers)

# PHASE D: Data
11. server/scripts/seedCosmetics.js        # NEW - populate templates
12. src/assets/*.js                        # MODIFY (add Divine cosmetics)
12. src/assets/hats.js                     # MODIFY (add cosmicCrown)
13. src/assets/eyes.js                     # MODIFY (add omniscientGaze)
14. src/assets/bodyItems.js                # MODIFY (add voidMantle)
15. src/components/GachaRoll.jsx           # NEW (frontend - Phase 2)
```

---

## Part 10: Rollback Plan

| Step | Rollback Action |
|------|-----------------|
| Models deployed | Drop new collections |
| GachaService deployed | Comment out handlers |
| Seed data loaded | Delete from CosmeticTemplate |
| User schema modified | Fields are additive, no rollback needed |

---

## Approval Checklist

Before implementation, confirm:

- [x] Divine rate locked at 0.02%
- [x] Roll price at 0.025 SOL
- [x] Promo items excluded from gacha pool
- [x] Existing SlotService unchanged (separate system)
- [x] Using existing services where possible (DRY)
- [x] Gold sinks planned to prevent inflation

---

## Code Review Verification ✅

### Methods That EXIST (verified):
| Method | File | Verified |
|--------|------|----------|
| `UserService.getUser(wallet)` | UserService.js | ✅ Line 12 |
| `UserService.addCoins(wallet, amount, type, relatedData, reason)` | UserService.js | ✅ Line 98 |
| `User.unlockCosmetic(cosmeticId, category)` | User.js | ✅ Line 391 |
| `User.ownsCosmetic(cosmeticId)` (sync) | User.js | ✅ Line 372 |
| `broadcastToAll(message)` | index.js | ✅ Line 211 |
| `SlotService.getRandomSymbol()` | SlotService.js | ✅ Line 126 |

### Methods That NEED TO BE ADDED:
| Method | File | Action |
|--------|------|--------|
| `UserService.updateUserRaw(wallet, update)` | UserService.js | ADD (for atomic $inc/$set) |
| `User.ownsOwnedCosmetic(cosmeticId)` (async) | User.js | ADD (optional, Phase 2) |

**Note:** `UserService.unlockCosmetic()` is NOT needed - we follow `PromoCodeService._applyUnlocks()` pattern instead.

### Models That NEED TO BE CREATED:
| Model | File | Action |
|-------|------|--------|
| CosmeticTemplate | CosmeticTemplate.js | CREATE |
| OwnedCosmetic | OwnedCosmetic.js | CREATE |
| GachaRoll | GachaRoll.js | CREATE |

### Transaction Types To ADD (CRITICAL - Must be added FIRST!):

**⚠️ BLOCKER:** These types MUST be added to `Transaction.js` enum BEFORE deploying GachaService, otherwise `userService.addCoins()` will fail with validation error!

```javascript
// server/db/models/Transaction.js - ADD to 'type' enum (around line 20)
'pebble_deposit',     // SOL → Pebbles conversion
'pebble_withdraw',    // Pebbles → SOL conversion (with 5% rake)
'gacha_roll',         // Pebbles spent on gacha roll
'gacha_dupe_gold',    // Gold awarded for duplicate cosmetic
'gold_sink_reroll',   // Gold spent on quality reroll (Phase 2)
'gold_sink_holo'      // Gold spent on holo conversion (Phase 2)
```

### WebSocket Message Types To ADD:

**Pebble Operations:**
- `pebble_get_balance` (request) → `pebble_balance` (response)
- `pebble_deposit` (request) → `pebble_deposit_success` (response)
- `pebble_withdraw` (request) → `pebble_withdraw_success` (response)
- `pebble_update` (server push after roll)
- `pebble_error` (error response)

**Gacha Operations:**
- `gacha_roll` (request - no tx signature needed!)
- `gacha_result` (response)
- `gacha_error` (error response)
- `gacha_rates` (request/response)
- `gacha_collection` (request/response)
- `gacha_history` (request/response)
- `gacha_announcement` (server broadcast via broadcastToAll)

---

## Final Iteration Verification ✅

### Pass 2 Issues Fixed:

| Issue | Resolution |
|-------|------------|
| Service constructor pattern mismatch | Fixed: Now uses `(userService, broadcastToRoom, sendToPlayer, broadcastToAll)` |
| `_logRoll` missing quality/isHolo params | Fixed: Added as separate parameters |
| GachaRoll schema typo "oderId" | Fixed: Changed to "ownerId" |
| UserService.unlockCosmetic not needed | Removed: Using PromoCodeService pattern instead |
| Payment verification using wrong service | Fixed: Using SolanaPaymentService.verifyTransaction() |
| Missing SolanaPaymentService import | Fixed: Added import |

### Pass 3 Issues Fixed (Runtime Bugs):

| Issue | Severity | Resolution |
|-------|----------|------------|
| **Race condition in serial numbers** | CRITICAL | Replaced `_getNextSerial` + `_checkFirstEdition` with atomic `_getNextSerialAtomic` using `findOneAndUpdate($inc)` |
| **Double increment of totalMinted** | HIGH | Removed duplicate `$inc` in `_mintCosmetic` - now only done in atomic method |
| **No error handling after payment** | CRITICAL | Added try-catch around minting with `_logFailedRoll` for admin refund dashboard |
| **Missing GachaRoll failure fields** | HIGH | Added `status`, `errorMessage`, `requiresRefund`, `refundedAt`, `refundTxSignature` to schema |
| **Transaction enum validation** | CRITICAL | Added **⚠️ BLOCKER** warning - must add types to Transaction.js enum FIRST |
| **`.populate('templateId')` won't work** | HIGH | `templateId` is String not ref - rewrote `getOwnedCosmetics` with manual join |
| **Missing index for failed rolls** | MEDIUM | Added `{ requiresRefund: 1, status: 1 }` compound index |

### Pass 4: UX Redesign (Pebbles Currency)

| Issue | Severity | Resolution |
|-------|----------|------------|
| **Per-spin wallet signing = terrible UX** | CRITICAL | Redesigned to use Pebbles (deposit once, spin instant) |
| **No SOL verification for gacha** | HIGH | Pebbles are server-side, only need verify on deposit |
| **Missing deposit/withdraw flow** | HIGH | Added `depositPebbles()`, `withdrawPebbles()` methods |
| **Missing pebble WebSocket handlers** | HIGH | Added `pebble_deposit`, `pebble_withdraw`, `pebble_get_balance` |
| **5% withdrawal rake** | FEATURE | Platform revenue on cash-out |

### Pass 5: SPL Deposit Alignment

| Issue | Severity | Resolution |
|-------|----------|------------|
| **Was using native SOL verification** | HIGH | Changed to SPL token verification (same as P2P wagers) |
| **Removed verifyNativeSOLTransfer** | N/A | Not needed - using existing `verifyTransaction()` |
| **Updated depositPebbles signature** | MEDIUM | Now takes `tokenAddress`, `amount`, `decimals` like P2P |
| **UI placement for pebbles** | FEATURE | Added: Nav bar next to coins with [+] button |

### Pass 3 Verified Logic (No Issues):

| Component | Status | Notes |
|-----------|--------|-------|
| Pity counter reset logic | ✅ Correct | Higher rarity resets lower pity counters |
| `_selectTemplate` fallback | ✅ Correct | Falls back to lower rarity if none available |
| `_announceRoll` null check | ✅ Correct | Handles `broadcastToAll` being null |
| `CosmeticTemplate.getGachaPool` | ✅ Defined | Static method exists in schema |
| `_rollRarityWithPity` soft/hard logic | ✅ Correct | Hard pity guarantees, soft pity boosts |
| `_calculateGoldValue` multipliers | ✅ Correct | Quality and holo multipliers stack |

### Verified Code Patterns Match:

| Pattern | Existing Code | GachaService |
|---------|---------------|--------------|
| Service constructor | `new SlotService(userService, broadcastToRoom, sendToPlayer)` | ✅ Same + broadcastToAll |
| Payment verification | `solanaPaymentService.verifyTransaction()` | ✅ Reusing |
| Unlock cosmetics | PromoCodeService direct array push + save | ✅ Same pattern |
| Coin operations | `userService.addCoins(wallet, amount, type, data, reason)` | ✅ Reusing |
| WebSocket handlers | `case 'slot_spin': { ... break; }` | ✅ Same pattern |
| Model exports | `export { default as X } from './X.js'` | ✅ Same pattern |

### All External Dependencies Verified:

| Dependency | File | Status |
|------------|------|--------|
| `userService.getUser()` | UserService.js:12 | ✅ EXISTS |
| `userService.addCoins()` | UserService.js:98 | ✅ EXISTS |
| `solanaPaymentService.verifyTransaction()` | SolanaPaymentService.js:219 | ✅ EXISTS |
| `broadcastToAll()` | index.js:211 | ✅ EXISTS |
| `broadcastToRoom()` | index.js:192 | ✅ EXISTS |
| `sendToPlayer()` | index.js:220 | ✅ EXISTS |
| `process.env.RAKE_WALLET` | ENV_TEMPLATE.md | ✅ DOCUMENTED |

### Environment Prerequisites:

| Variable | File | Purpose |
|----------|------|---------|
| `RAKE_WALLET` | `.env` | Platform wallet for SOL gacha payments (same as P2P rake) |
| `SOLANA_RPC_URL` | `.env` | For on-chain payment verification |
| `MONGODB_URI` | `.env` | For new collections |

**Note:** Gacha payments go to the same RAKE_WALLET used for P2P wagers. No new environment variables needed.

### New Code Required:

| File | Action | Lines of Code (est.) |
|------|--------|---------------------|
| CosmeticTemplate.js | CREATE | ~60 |
| OwnedCosmetic.js | CREATE | ~70 |
| GachaRoll.js | CREATE | ~40 |
| GachaService.js | CREATE | ~400 |
| UserService.js | ADD updateUserRaw() | ~5 |
| User.js | ADD gachaStats field | ~20 |
| Transaction.js | ADD 4 types to enum | ~4 |
| services/index.js | ADD export | ~1 |
| index.js | ADD service init + handlers | ~100 |
| seedCosmetics.js | CREATE | ~200 |
| Divine cosmetics in assets | MODIFY 3 files | ~300 |
| **TOTAL** | | **~1,200 lines**

---

## Ready to Implement

**Phase 1 (Database):** ~2 hours  
**Phase 2 (GachaService):** ~3 hours  
**Phase 3 (Integration):** ~2 hours  
**Phase 4 (Seeding):** ~1 hour  
**Phase 5 (Testing):** ~2 hours  

**Total Estimated:** ~10 hours

---

## Part 11: Complete Cosmetic Inventory

### All Existing Assets (From Frontend)

Below is the complete inventory of existing cosmetics that need to be seeded.
Items marked **PROMO** will have `acquisitionType: 'promo'` and will NOT appear in gacha.

#### HATS (40 items)

| Asset Key | Name | Rarity | Animated | PROMO |
|-----------|------|--------|----------|-------|
| none | No Hat | - | No | FREE |
| topHat | Top Hat | Common | No | |
| propeller | Propeller Cap | Common | No | |
| beerHelmet | Beer Helmet | Uncommon | No | |
| mohawk | Mohawk | Common | No | |
| crown | Crown | Epic | No | |
| viking | Viking Helmet | Uncommon | No | |
| chef | Chef Hat | Common | No | |
| cowboy | Cowboy Hat | Uncommon | No | |
| sombrero | Sombrero | Uncommon | No | |
| fez | Fez | Common | No | |
| halo | Halo | Legendary | Yes (glow) | |
| headphones | Headphones | Common | No | |
| santa | Santa Hat | Rare | No | |
| flower | Flower | Common | No | |
| capRed | Red Cap | Common | No | |
| capGreen | Green Cap | Common | No | |
| capBlack | Black Cap | Common | No | |
| beanieBlue | Blue Beanie | Common | No | |
| beanieOrange | Orange Beanie | Common | No | |
| beaniePink | Pink Beanie | Common | No | |
| capBackwards | Backwards Cap | Common | No | |
| sensei | Sensei Hat | Epic | No | |
| bobRossAfro | Bob Ross Afro | Rare | No | |
| flamingCrown | Flaming Crown | Legendary | Yes (fx) | |
| iceCrown | Ice Crown | Legendary | Yes (glow) | |
| wizardHat | Wizard Hat | Epic | Yes (fx) | |
| astronautHelmet | Astronaut Helmet | Epic | Yes (glow) | |
| pirateTricorn | Pirate Tricorn | Uncommon | No | |
| angelHalo | Angel Halo | Legendary | Yes (glow) | |
| devilHorns | Devil Horns | Rare | No | |
| ninjaHeadband | Ninja Headband | Uncommon | No | |
| partyHat | Party Hat | Common | Yes (glow) | |
| graduationCap | Graduation Cap | Uncommon | No | |
| rainbowCrown | Rainbow Crown | Mythic | Yes (glow) | |
| hardHat | Hard Hat | Common | No | |
| bunnyEars | Bunny Ears | Uncommon | No | |
| catEars | Cat Ears | Uncommon | No | |
| samuraiHelmet | Samurai Helmet | Rare | No | |
| spartanHelmet | Spartan Helmet | Epic | No | |
| mushroomCap | Mushroom Cap | Rare | No | |
| ufoHat | UFO Hat | Epic | Yes (glow) | |
| phoenixFeathers | Phoenix Feathers | Mythic | Yes (fx) | |
| pumpkinHead | Pumpkin Head | Rare | Yes (glow) | |
| **bonkExclamation** | BONK !!! | Epic | Yes (glow) | **YES** |
| **mistorHair** | Mistor Hair | Epic | No | **YES** |

#### EYES (42 items)

| Asset Key | Name | Rarity | Animated | PROMO |
|-----------|------|--------|----------|-------|
| normal | Normal | - | No | FREE |
| bored | Bored | Common | No | |
| angry | Angry | Common | No | |
| laser | Laser Eyes | Rare | Yes (glow) | |
| shades | Sunglasses | Uncommon | No | |
| cute | Cute | Common | No | |
| cyclops | Cyclops | Rare | No | |
| winking | Winking | Common | No | |
| dead | Dead | Common | No | |
| hearts | Heart Eyes | Uncommon | No | |
| money | Money Eyes | Rare | Yes (glow) | |
| patch | Eye Patch | Uncommon | No | |
| glasses3D | 3D Glasses | Uncommon | No | |
| crying | Crying | Common | No | |
| monocle | Monocle | Rare | No | |
| hypno | Hypno Eyes | Uncommon | No | |
| fire | Fire Eyes | Legendary | Yes (fx) | |
| galaxy | Galaxy Eyes | Legendary | Yes (glow) | |
| rainbow | Rainbow Eyes | Mythic | Yes (glow) | |
| cyber | Cyber Eyes | Epic | Yes (glow) | |
| sleepy | Sleepy | Common | No | |
| dizzy | Dizzy | Common | No | |
| anime | Anime Eyes | Uncommon | Yes (glow) | |
| robot | Robot Eyes | Rare | Yes (glow) | |
| determined | Determined | Common | No | |
| vrGoggles | VR Goggles | Epic | Yes (glow) | |
| skiGoggles | Ski Goggles | Uncommon | No | |
| stars | Star Eyes | Rare | Yes (glow) | |
| diamond | Diamond Eyes | Legendary | Yes (fx) | |
| bloodshot | Bloodshot | Uncommon | No | |
| catEyes | Cat Eyes | Uncommon | No | |
| aviator | Aviator Glasses | Rare | No | |
| sharingan | Sharingan | Epic | Yes (glow) | |
| teary | Teary | Common | No | |
| void | Void Eyes | Epic | Yes (glow) | |
| nervous | Nervous | Common | No | |
| **lmao** | LMAO Face | Legendary | Yes (glow) | **YES** |
| **mistorEyes** | Mistor Eyes | Rare | No | **YES** |
| **bonkEyes** | BONK Eyes | Epic | No | **YES** |

#### MOUTHS (32 items)

| Asset Key | Name | Rarity | Animated | PROMO |
|-----------|------|--------|----------|-------|
| beak | Normal Beak | - | No | FREE |
| cigarette | Cigarette | Uncommon | Yes (fx) | |
| bubblegum | Bubblegum | Common | Yes (fx) | |
| mustache | Mustache | Common | No | |
| beard | Beard | Uncommon | No | |
| tongue | Tongue Out | Common | No | |
| pipe | Smoking Pipe | Uncommon | Yes (fx) | |
| smile | Smile | Common | No | |
| fangs | Fangs | Uncommon | No | |
| mask | Face Mask | Common | No | |
| lipstick | Lipstick | Common | No | |
| braces | Braces | Common | No | |
| goldGrill | Gold Grill | Rare | Yes (glow) | |
| diamondGrill | Diamond Grill | Legendary | Yes (fx) | |
| lollipop | Lollipop | Common | No | |
| rose | Rose | Uncommon | No | |
| whistle | Whistle | Common | No | |
| bubblegumPop | Bubblegum Pop | Uncommon | No | |
| fancyStache | Fancy Mustache | Rare | No | |
| goatee | Goatee | Common | No | |
| fullBeard | Full Beard | Uncommon | No | |
| buckTeeth | Buck Teeth | Common | No | |
| vampireDrool | Vampire Drool | Rare | Yes (glow) | |
| pacifier | Pacifier | Common | No | |
| straw | Drink Straw | Common | No | |
| fishBone | Fish Bone | Uncommon | No | |
| kiss | Kiss Mark | Rare | Yes (glow) | |
| fireBreath | Fire Breath | Legendary | Yes (fx) | |
| iceBreath | Ice Breath | Legendary | Yes (fx) | |
| cigar | Cigar | Rare | Yes (fx) | |
| surgicalMask | Surgical Mask | Common | No | |

#### BODY ITEMS (38 items)

| Asset Key | Name | Rarity | Animated | PROMO |
|-----------|------|--------|----------|-------|
| none | No Body | - | No | FREE |
| scarf | Scarf | Common | No | |
| bowtie | Bowtie | Common | No | |
| goldChain | Gold Chain | Epic | Yes (glow) | |
| tie | Tie | Common | No | |
| shirtWhite | White Shirt | Common | No | |
| shirtBlack | Black Shirt | Common | No | |
| overalls | Overalls | Common | No | |
| bikini | Bikini | Uncommon | No | |
| backpack | Backpack | Common | No | |
| cape | Cape | Uncommon | No | |
| lifevest | Life Vest | Common | No | |
| guitar | Guitar | Epic | No | |
| sword | Sword | Epic | Yes (glow) | |
| paintBrush | Paint Brush | Uncommon | No | |
| shield | Shield | Rare | No | |
| tutu | Tutu | Uncommon | No | |
| angelWings | Angel Wings | Legendary | Yes (glow+fx) | |
| demonWings | Demon Wings | Legendary | Yes (fx) | |
| jetpack | Jetpack | Epic | Yes (glow+fx) | |
| hoodie | Hoodie | Common | No | |
| labCoat | Lab Coat | Rare | No | |
| tuxedo | Tuxedo | Rare | No | |
| hawaiianShirt | Hawaiian Shirt | Uncommon | No | |
| leatherJacket | Leather Jacket | Rare | No | |
| superheroCape | Superhero Cape | Rare | No | |
| wizardRobe | Wizard Robe | Epic | Yes (glow) | |
| bikerVest | Biker Vest | Uncommon | No | |
| royalSash | Royal Sash | Rare | Yes (glow) | |
| samuraiArmor | Samurai Armor | Epic | No | |
| pirateCoat | Pirate Coat | Rare | No | |
| astronautSuit | Astronaut Suit | Epic | No | |
| lightningAura | Lightning Aura | Mythic | Yes (glow+fx) | |
| fireAura | Fire Aura | Mythic | Yes (glow+fx) | |
| suspenders | Suspenders | Common | No | |
| apron | Apron | Common | No | |
| barrel | Barrel | Uncommon | No | |
| **mistorShirt** | Mistor Shirt | Epic | No | **YES** |
| **bonkShirt** | BONK Shirt | Epic | No | **YES** |
| **penguShirt** | PENGU Shirt | Epic | No | **YES** |
| **joe** | Joe | Rare | No | **YES** |

#### MOUNTS (3 items)

| Asset Key | Name | Rarity | Animated | PROMO |
|-----------|------|--------|----------|-------|
| none | No Mount | - | No | FREE |
| **minecraftBoat** | Minecraft Boat | Legendary | Yes | **YES** |
| **penguMount** | PENGU Mount | Legendary | Yes | **YES** |

---

### Rarity Distribution Summary (Updated with Divine)

**ACTUAL ASSET COUNTS (from codebase grep):**
- hats.js: 42 items
- eyes.js: 39 items
- mouths.js: 31 items
- bodyItems.js: 41 items
- mounts.js: 3 items (none + 2 promo)
- **TOTAL: ~156 items** (includes 'none' defaults)

| Category | Common | Uncommon | Rare | Epic | Legendary | Mythic | Divine | PROMO |
|----------|--------|----------|------|------|-----------|--------|--------|-------|
| Hats (42) | ~17 | ~11 | ~6 | ~6 | 4 | 2 | **1** | 2 |
| Eyes (39) | ~12 | ~10 | ~7 | ~6 | 4 | 1 | **1** | 3 |
| Mouths (31) | ~13 | ~7 | ~6 | ~0 | 4 | 0 | 0 | 0 |
| Body (41) | ~11 | ~7 | ~8 | ~8 | 2 | 2 | **1** | 4 |
| Mounts (3) | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| **TOTAL** | **~54** | **~35** | **~27** | **~20** | **14** | **5** | **3** | **11** |

**Note:** Rarity assignments in seed script will need manual review per item.
Each cosmetic will be inspected and assigned rarity based on visual complexity and effects.

**Divine Items Added:**
- 🌌 **Cosmic Crown** (hat) - Galaxies orbiting a crown of deep space
- 👁️ **Omniscient Gaze** (eyes) - Reality-bending all-seeing eyes
- 🌀 **Void Mantle** (body) - Phasing cloak from between dimensions

### NEW Divine Items (To Be Added)

Below are 3 high-quality Divine items designed for the gacha launch.
These are the rarest items in the game (0.02% drop rate, 1 in 5,000 rolls).

---

#### 1. Divine Hat: Cosmic Crown 👑🌌

**Description:** A crown forged from the fabric of spacetime itself. Miniature galaxies orbit the wearer's head, with stars twinkling and nebulae swirling in an eternal cosmic dance.

**Visual Design:**
- Base: Crystalline crown structure with deep space purple (#0D0221)
- Floating orbs: 4-5 miniature galaxies orbiting at different heights
- Particle effects: Stardust trail, occasional shooting stars
- Glow: Soft purple/blue aura emanating from all elements

```javascript
// server/assets/divineCosmetics.js
export const cosmicCrown = (() => {
    const v = [];
    const crownBase = '#0D0221';      // Deep space purple
    const cosmicPurple = '#6B2D5C';   // Nebula purple
    const starWhite = '#FFFEF0';      // Star white
    const galaxyBlue = '#1E3A5F';     // Galaxy arm blue
    const nebulaGold = '#FFD700';     // Golden nebula
    
    // Crown base ring
    for(let x = -5; x <= 5; x++) {
        for(let z = -5; z <= 5; z++) {
            const d = Math.sqrt(x*x + z*z);
            if(d > 3.5 && d < 5.5) {
                v.push({x, y: 10, z, c: crownBase});
                v.push({x, y: 11, z, c: cosmicPurple, glow: true});
            }
        }
    }
    
    // Crown spires (5 points)
    const spireAngles = [0, 72, 144, 216, 288];
    spireAngles.forEach((angle, i) => {
        const rad = angle * Math.PI / 180;
        const sx = Math.round(Math.cos(rad) * 4);
        const sz = Math.round(Math.sin(rad) * 4);
        for(let h = 12; h <= 16 - (i % 2); h++) {
            v.push({x: sx, y: h, z: sz, c: i % 2 === 0 ? cosmicPurple : crownBase, glow: true});
        }
        // Star at tip
        v.push({x: sx, y: 17 - (i % 2), z: sz, c: starWhite, glow: true, fx: 'starTwinkle'});
    });
    
    // Orbiting galaxy particles (marked for animation)
    v.push({x: 0, y: 18, z: 0, c: galaxyBlue, glow: true, fx: 'orbitGalaxy', emitter: true});
    v.push({x: 3, y: 15, z: 3, c: nebulaGold, glow: true, fx: 'orbitGalaxy', emitter: true});
    v.push({x: -3, y: 14, z: -2, c: cosmicPurple, glow: true, fx: 'orbitGalaxy', emitter: true});
    
    // Stardust emitter
    v.push({x: 0, y: 17, z: 0, c: starWhite, glow: true, fx: 'stardust', emitter: true});
    
    return v;
})();
```

---

#### 2. Divine Eyes: Omniscient Gaze 👁️✨

**Description:** Eyes that have witnessed the birth and death of universes. Reality itself seems to bend and warp around them. Those who gaze upon them feel as if they're staring into infinity.

**Visual Design:**
- Outer iris: Swirling vortex of deep purple/gold
- Inner iris: Bright white-gold core that pulses
- Pupil: Void black with occasional star flickers
- Effect: Reality distortion waves emanating outward
- Trails: Afterimages follow eye movement

```javascript
export const omniscientGaze = (() => {
    const v = [];
    const voidBlack = '#000000';
    const irisGold = '#FFD700';
    const irisPurple = '#8B008B';
    const coreWhite = '#FFFFFF';
    const distortionBlue = '#00FFFF';
    
    // Left eye - multi-layered
    // Outer ring (reality distortion)
    for(let dx = -2; dx <= 0; dx++) {
        for(let dy = -2; dy <= 2; dy++) {
            const d = dx*dx + dy*dy;
            if(d > 2 && d <= 5) {
                v.push({x: -2 + dx, y: 7 + dy, z: 4.2, c: distortionBlue, glow: true, fx: 'realityWarp'});
            }
        }
    }
    // Iris ring
    v.push({x: -3, y: 7, z: 4.3, c: irisPurple, glow: true});
    v.push({x: -1, y: 7, z: 4.3, c: irisGold, glow: true});
    v.push({x: -2, y: 8, z: 4.3, c: irisGold, glow: true});
    v.push({x: -2, y: 6, z: 4.3, c: irisPurple, glow: true});
    // Core
    v.push({x: -2, y: 7, z: 4.5, c: coreWhite, glow: true, fx: 'pulsate'});
    // Void pupil
    v.push({x: -2, y: 7, z: 4.6, c: voidBlack, fx: 'voidFlicker'});
    
    // Right eye - mirror
    for(let dx = 0; dx <= 2; dx++) {
        for(let dy = -2; dy <= 2; dy++) {
            const d = dx*dx + dy*dy;
            if(d > 2 && d <= 5) {
                v.push({x: 2 + dx, y: 7 + dy, z: 4.2, c: distortionBlue, glow: true, fx: 'realityWarp'});
            }
        }
    }
    v.push({x: 1, y: 7, z: 4.3, c: irisGold, glow: true});
    v.push({x: 3, y: 7, z: 4.3, c: irisPurple, glow: true});
    v.push({x: 2, y: 8, z: 4.3, c: irisPurple, glow: true});
    v.push({x: 2, y: 6, z: 4.3, c: irisGold, glow: true});
    v.push({x: 2, y: 7, z: 4.5, c: coreWhite, glow: true, fx: 'pulsate'});
    v.push({x: 2, y: 7, z: 4.6, c: voidBlack, fx: 'voidFlicker'});
    
    // Third eye (center, smaller, more intense)
    v.push({x: 0, y: 9, z: 4.8, c: irisGold, glow: true, fx: 'thirdEyePulse', emitter: true});
    v.push({x: 0, y: 9, z: 5.0, c: voidBlack});
    
    return v;
})();
```

---

#### 3. Divine Body: Void Mantle 🌀🖤

**Description:** A cloak woven from the fabric of the void between dimensions. Parts of it constantly phase in and out of existence, revealing glimpses of other realities. The wearer appears to be dissolving into and reforming from pure darkness.

**Visual Design:**
- Base: Deep void black with purple edges
- Effect: Sections randomly phase/dissolve with particle effects
- Shoulders: Crystalline void shards
- Back: Long trailing cape that fades into particles
- Aura: Darkness aura around entire body

```javascript
export const voidMantle = (() => {
    const v = [];
    const voidBlack = '#0A0A0F';
    const voidPurple = '#2D1B4E';
    const voidEdge = '#6B3FA0';
    const crystalVoid = '#1A0A2E';
    const particleWhite = '#E8E8FF';
    
    // Base mantle covering body
    for(let y = -5; y < 4; y++) {
        const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
        const innerR = bodyRadius;
        const outerR = bodyRadius + 1.5;
        for(let x = -8; x <= 8; x++) {
            for(let z = -8; z <= 8; z++) {
                const d = Math.sqrt(x*x + z*z);
                if(d >= innerR && d <= outerR) {
                    // Phase effect: some voxels marked for random visibility
                    const phase = Math.random() < 0.15;
                    v.push({
                        x, y, z, 
                        c: d > outerR - 0.5 ? voidEdge : voidPurple, 
                        glow: d > outerR - 0.5,
                        fx: phase ? 'phaseFlicker' : null
                    });
                }
            }
        }
    }
    
    // Shoulder crystals (void shards)
    const addCrystal = (baseX, baseY, baseZ) => {
        for(let h = 0; h < 4; h++) {
            v.push({x: baseX, y: baseY + h, z: baseZ, c: crystalVoid, glow: true});
            if(h > 1) {
                v.push({x: baseX + 1, y: baseY + h, z: baseZ, c: voidPurple, glow: true});
            }
        }
        v.push({x: baseX, y: baseY + 4, z: baseZ, c: voidEdge, glow: true, fx: 'crystalPulse'});
    };
    addCrystal(-6, 3, 0);
    addCrystal(6, 3, 0);
    
    // Trailing void cape (fades into particles)
    for(let x = -6; x <= 6; x++) {
        for(let y = -8; y < 3; y++) {
            const depth = y < -2 ? -6 - Math.abs(y + 2)*0.2 : -6;
            const fadeChance = Math.abs(y + 3) / 10; // More fade at bottom
            if(Math.random() > fadeChance) {
                v.push({
                    x, y, z: depth, 
                    c: y < -4 ? voidEdge : voidPurple, 
                    glow: y < -4,
                    fx: y < -5 ? 'dissolveParticle' : null
                });
            }
        }
    }
    
    // Void particle emitters at cape bottom
    v.push({x: -3, y: -8, z: -7, c: particleWhite, glow: true, fx: 'voidParticles', emitter: true});
    v.push({x: 0, y: -9, z: -7, c: particleWhite, glow: true, fx: 'voidParticles', emitter: true});
    v.push({x: 3, y: -8, z: -7, c: particleWhite, glow: true, fx: 'voidParticles', emitter: true});
    
    // Darkness aura (invisible voxels that emit dark particles)
    v.push({x: 0, y: 0, z: 0, c: voidBlack, fx: 'darknessAura', emitter: true, invisible: true});
    
    return v;
})();
```

---

### Divine Items Summary

| Item | Name | Category | Description |
|------|------|----------|-------------|
| cosmicCrown | Cosmic Crown | hat | Galaxies orbit a crown of deep space |
| omniscientGaze | Omniscient Gaze | eyes | Reality-bending all-seeing eyes |
| voidMantle | Void Mantle | bodyItem | Phasing cloak from between dimensions |

**Total Divine Items: 3**

These items should feel truly special:
- Unique particle effects not seen on other items
- Multiple glow sources
- Complex animation requirements
- Lore-worthy descriptions

---

## Part 12: Economy Balance Review

### Final Consistency Check ✅

| Check | Status | Notes |
|-------|--------|-------|
| Divine rate = 0.02% | ✅ | Confirmed, locked |
| Roll price = 0.025 SOL | ✅ | Confirmed |
| Promo items excluded | ✅ | 11 items marked PROMO |
| Gold base values by rarity | ✅ | See table below |
| Duplicate rate curve | ✅ | Reasonable progression |
| Quality/Holo multipliers | ✅ | 0.7x-12x range healthy |
| First Edition = Serial 1-3 | ✅ | Per-item, not time-based |
| Server announcements | ✅ | ALL drops announced |
| Pity system | ✅ | Economy-safe design |
| Divine items exist | ✅ | 3 high-quality items |
| Multi-roll | ⏳ | Phase 2 |

### Gold Base Values (Updated)

| Rarity | Base Gold | Worn (0.7x) | Flawless Holo (12x) |
|--------|-----------|-------------|---------------------|
| Common | 5 | 3 | 60 |
| Uncommon | 15 | 10 | 180 |
| Rare | 50 | 35 | 600 |
| Epic | 200 | 140 | 2,400 |
| Legendary | 1,000 | 700 | 12,000 |
| Mythic | 5,000 | 3,500 | 60,000 |
| Divine | 25,000 | 17,500 | 300,000 |

### Potential Issues & Mitigations

| Issue | Severity | Status | Mitigation |
|-------|----------|--------|------------|
| No Divine items in pool | MEDIUM | ✅ RESOLVED | Added 3 Divine items |
| Mount category nearly empty | LOW | ⚠️ Phase 2 | Add 2-3 non-promo mounts later |
| Gold inflation (54k/day) | MEDIUM | 📋 Planned | Add gold sinks (quality reroll, shop) |
| Mythic items few (5 total) | LOW | ⚠️ Phase 2 | Consider adding more later |

---

## Part 13: Confirmed Design Decisions

| Decision | Status | Details |
|----------|--------|---------|
| Roll price | ✅ **0.025 SOL** | Confirmed |
| Divine rate | ✅ **0.02%** | 1 in 5,000 rolls |
| First Edition | ✅ **Serial 1-3** | First 3 of each item, NOT time-based |
| Server announcements | ✅ **ALL drops** | Every roll announced to all players |
| Pity system | ✅ **Implemented** | Soft + Hard pity, economy-safe |
| Multi-roll | ⏳ **Phase 2** | Not implementing now |
| Divine items | ✅ **3 created** | Cosmic Crown, Omniscient Gaze, Void Mantle |

### Pity System Details (Economy-Safe Design)

The pity system does NOT add extra items - it only shifts WHEN drops occur.
This preserves the overall drop rate while reducing frustration.

| Rarity | Soft Pity | Boost | Hard Pity | Notes |
|--------|-----------|-------|-----------|-------|
| Rare+ | 20 rolls | +25% | 40 rolls | Resets when Rare+ drops |
| Epic+ | 60 rolls | +15% | 100 rolls | Resets when Epic+ drops |
| Legendary+ | 200 rolls | +10% | 400 rolls | Resets when Legendary+ drops |
| Mythic/Divine | ❌ None | N/A | N/A | Keeps them truly rare |

**Why this is economy-safe:**
- Pity doesn't create items, just shifts timing
- Over millions of rolls, distribution remains identical
- No pity for Mythic/Divine preserves ultra-rare value
- Counters reset on hit, preventing exploitation

---

## Part 14: Implementation Phases (Updated)

### Phase 1: Database Layer (~2 hours)
1. Create `CosmeticTemplate` model
2. Create `OwnedCosmetic` model  
3. Create `GachaRoll` audit model
4. Extend `Transaction.js` with gacha types
5. Extend `User.js` with gachaStats + pity counters

### Phase 2: Divine Cosmetics (~2 hours)
1. Add `cosmicCrown` to hats.js
2. Add `omniscientGaze` to eyes.js
3. Add `voidMantle` to bodyItems.js
4. Test rendering and effects

### Phase 3: GachaService (~3 hours)
1. Create GachaService with pity system
2. Integrate with CustodialWalletService
3. Add server announcement broadcasting
4. Test drop rate distribution

### Phase 4: Seeding (~1 hour)
1. Create seed script with all 150+ cosmetics
2. Run seeding with correct rarity assignments
3. Verify pool distribution

### Phase 5: Integration (~2 hours)
1. Add WebSocket handlers
2. Update frontend slot machine UI
3. Add announcement toast system
4. Test full flow

### Phase 6: Testing (~2 hours)
1. Monte Carlo drop rate validation
2. Pity system verification
3. Gold economy balance check
4. Edge case testing

**Total Estimated: ~12 hours**

---

*Document complete. Ready to begin Phase 1 implementation.*

