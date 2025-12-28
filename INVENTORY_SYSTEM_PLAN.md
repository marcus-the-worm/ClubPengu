# Inventory System Implementation Plan

## ✅ IMPLEMENTATION COMPLETE

**Status**: All core features implemented and tested.

## Overview

Transform the current auto-burn duplicate system into a CS:GO-style inventory where users keep ALL items and manually choose to burn for gold.

---

## Core Philosophy

> "Every item is unique. Every item has value. Users choose their own destiny."

- **Flawless Holo Wizard Hat #3** is NOT the same as **Worn Standard Wizard Hat #847**
- Users should be able to collect, hoard, trade (future), and speculate
- Burning is a USER CHOICE, not automatic
- Inventory limits create scarcity and gold sinks (upgrades)

---

## Database Changes

### 1. User Model Updates (`server/db/models/User.js`)

```javascript
// Add to userSchema
inventorySlots: { type: Number, default: 150 },     // Base inventory size
inventoryUpgrades: { type: Number, default: 0 },    // Number of upgrades purchased
maxInventorySlots: { type: Number, default: 150 },  // Computed: 150 + (upgrades * 50)

// Add method to check inventory space
userSchema.methods.hasInventorySpace = async function() {
    const OwnedCosmetic = mongoose.model('OwnedCosmetic');
    const count = await OwnedCosmetic.countDocuments({ 
        ownerId: this.walletAddress, 
        convertedToGold: false 
    });
    return count < this.maxInventorySlots;
};

// Add method to get inventory count
userSchema.methods.getInventoryCount = async function() {
    const OwnedCosmetic = mongoose.model('OwnedCosmetic');
    return await OwnedCosmetic.countDocuments({ 
        ownerId: this.walletAddress, 
        convertedToGold: false 
    });
};
```

### 2. OwnedCosmetic Model Updates (`server/db/models/OwnedCosmetic.js`)

Already has most fields! Just needs:

```javascript
// Add index for inventory queries
ownedCosmeticSchema.index({ ownerId: 1, convertedToGold: 1, templateId: 1 });

// Add static method to get full inventory with template data
ownedCosmeticSchema.statics.getFullInventory = async function(walletAddress, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    
    const items = await this.find({ 
        ownerId: walletAddress, 
        convertedToGold: false 
    })
    .sort({ mintedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
    
    // Fetch template data
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    const templateIds = [...new Set(items.map(i => i.templateId))];
    const templates = await CosmeticTemplate.find({ templateId: { $in: templateIds } }).lean();
    const templateMap = new Map(templates.map(t => [t.templateId, t]));
    
    // Merge template data into items
    return items.map(item => ({
        ...item,
        template: templateMap.get(item.templateId) || null
    }));
};

// Add static method to burn item for gold
ownedCosmeticSchema.statics.burnForGold = async function(instanceId, walletAddress) {
    const item = await this.findOne({ instanceId, ownerId: walletAddress, convertedToGold: false });
    if (!item) return { success: false, error: 'ITEM_NOT_FOUND' };
    
    const CosmeticTemplate = mongoose.model('CosmeticTemplate');
    const template = await CosmeticTemplate.findOne({ templateId: item.templateId });
    if (!template) return { success: false, error: 'TEMPLATE_NOT_FOUND' };
    
    // Calculate gold value based on rarity, quality, holo, first edition
    let goldValue = template.duplicateGoldBase;
    
    // Quality multipliers
    const qualityMultipliers = {
        worn: 0.75,
        standard: 1.0,
        pristine: 1.25,
        flawless: 1.5
    };
    goldValue *= qualityMultipliers[item.quality] || 1.0;
    
    // Holographic bonus (+50%)
    if (item.isHolographic) goldValue *= 1.5;
    
    // First Edition bonus (+100%)
    if (item.isFirstEdition) goldValue *= 2.0;
    
    // Low serial bonus (top 100 = +25%)
    if (item.serialNumber <= 100) goldValue *= 1.25;
    
    goldValue = Math.floor(goldValue);
    
    // Mark as converted
    item.convertedToGold = true;
    item.convertedAt = new Date();
    await item.save();
    
    return { 
        success: true, 
        goldAwarded: goldValue,
        item: {
            name: template.name,
            rarity: template.rarity,
            quality: item.quality,
            isHolographic: item.isHolographic,
            isFirstEdition: item.isFirstEdition,
            serialNumber: item.serialNumber
        }
    };
};
```

---

## GachaService Changes

### Remove Auto-Burn Logic

**Current (`_checkDuplicate`):**
```javascript
async _checkDuplicate(walletAddress, templateId) {
    const existing = await OwnedCosmetic.findOne({
        ownerId: walletAddress,
        templateId,
        convertedToGold: false
    });
    return !!existing;
}
```

**New (remove entirely or repurpose for unlock check):**
```javascript
// For unlock checking only - does NOT affect minting
async _hasUnlockedTemplate(walletAddress, templateId) {
    const existing = await OwnedCosmetic.findOne({
        ownerId: walletAddress,
        templateId,
        convertedToGold: false
    });
    return !!existing;
}
```

### Update `roll()` Method

**Current flow:**
1. Roll rarity, quality, holo
2. Select template
3. Check if duplicate → if yes, award gold and return
4. Mint cosmetic

**New flow:**
1. Check inventory space → if full, reject roll
2. Roll rarity, quality, holo
3. Select template
4. ALWAYS mint cosmetic (no auto-burn)
5. Return item details

```javascript
async roll(walletAddress, playerId = null) {
    // Check inventory space FIRST
    const user = await User.findOne({ walletAddress });
    if (!user) return { success: false, error: 'USER_NOT_FOUND' };
    
    const inventoryCount = await user.getInventoryCount();
    if (inventoryCount >= user.maxInventorySlots) {
        return { 
            success: false, 
            error: 'INVENTORY_FULL',
            message: `Inventory full (${inventoryCount}/${user.maxInventorySlots}). Burn items or upgrade slots!`
        };
    }
    
    // Deduct pebbles
    const deductResult = await this._deductPebbles(walletAddress, ROLL_PRICE_PEBBLES);
    if (!deductResult.success) return deductResult;
    
    // Roll rarity, quality, holo
    const rarity = this._rollRarityWithPity(walletAddress);
    const quality = this._rollQuality();
    const isHolographic = this._rollHolo(rarity);
    
    // Select template
    const template = await this._selectTemplate(rarity);
    if (!template) {
        await this._refundPebbles(walletAddress, ROLL_PRICE_PEBBLES);
        return { success: false, error: 'NO_TEMPLATE_FOUND' };
    }
    
    // Check if this is a NEW unlock (first of this type)
    const isNewUnlock = !(await this._hasUnlockedTemplate(walletAddress, template.templateId));
    
    // ALWAYS mint the cosmetic (no auto-burn)
    const mintResult = await this._mintCosmetic(walletAddress, template, quality, isHolographic);
    if (!mintResult.success) {
        await this._logFailedRoll(walletAddress, template.templateId, 'MINT_FAILED');
        return { success: false, error: 'MINT_FAILED' };
    }
    
    // Update user stats
    await this._updateUserStats(walletAddress, template.rarity, quality, isHolographic);
    
    // Log the roll
    await this._logRoll(walletAddress, template.templateId, mintResult.instanceId, quality, isHolographic);
    
    // Announce rare+ drops
    if (['legendary', 'mythic', 'divine'].includes(template.rarity)) {
        this._announceRoll(walletAddress, template, quality, isHolographic, mintResult.isFirstEdition);
    }
    
    return {
        success: true,
        isNewUnlock,  // TRUE if this is the first of this type (now unlocked for equip)
        isDuplicate: !isNewUnlock,  // For UI display
        templateId: template.templateId,
        name: template.name,
        category: template.category,
        rarity: template.rarity,
        quality,
        isHolographic,
        instanceId: mintResult.instanceId,
        serialNumber: mintResult.serialNumber,
        isFirstEdition: mintResult.isFirstEdition,
        assetKey: template.assetKey,
        newPebbleBalance: deductResult.newBalance,
        // NO goldAwarded - user keeps the item!
    };
}
```

---

## New Endpoints (server/index.js)

### Get Inventory
```javascript
case 'inventory_get': {
    if (!player.isAuthenticated) break;
    
    const { page = 1, limit = 50, filter } = message;
    
    const items = await OwnedCosmetic.getFullInventory(player.walletAddress, page, limit);
    const user = await User.findOne({ walletAddress: player.walletAddress });
    const totalCount = await user.getInventoryCount();
    
    sendToPlayer(playerId, {
        type: 'inventory_data',
        items,
        totalCount,
        maxSlots: user.maxInventorySlots,
        page,
        hasMore: totalCount > page * limit
    });
    break;
}
```

### Burn Item for Gold
```javascript
case 'inventory_burn': {
    if (!player.isAuthenticated) break;
    
    const { instanceId } = message;
    if (!instanceId) {
        sendToPlayer(playerId, { type: 'inventory_error', error: 'MISSING_INSTANCE_ID' });
        break;
    }
    
    const result = await OwnedCosmetic.burnForGold(instanceId, player.walletAddress);
    
    if (result.success) {
        // Award gold
        await userService.addCoins(player.walletAddress, result.goldAwarded, 'cosmetic_burn');
        const user = await userService.getUser(player.walletAddress);
        
        sendToPlayer(playerId, {
            type: 'inventory_burned',
            goldAwarded: result.goldAwarded,
            newCoins: user.coins,
            burnedItem: result.item
        });
        
        // Log transaction
        await Transaction.record({
            type: 'cosmetic_burn',
            toWallet: player.walletAddress,
            amount: result.goldAwarded,
            currency: 'coins',
            relatedData: { instanceId, ...result.item },
            reason: `Burned ${result.item.name} (${result.item.quality}${result.item.isHolographic ? ' Holo' : ''})`
        });
    } else {
        sendToPlayer(playerId, { type: 'inventory_error', error: result.error });
    }
    break;
}
```

### Upgrade Inventory Slots
```javascript
case 'inventory_upgrade': {
    if (!player.isAuthenticated) break;
    
    const UPGRADE_COST = 5000; // Gold per upgrade
    const SLOTS_PER_UPGRADE = 50;
    const MAX_UPGRADES = 10; // Max 150 + (10 * 50) = 650 slots
    
    const user = await User.findOne({ walletAddress: player.walletAddress });
    
    if (user.inventoryUpgrades >= MAX_UPGRADES) {
        sendToPlayer(playerId, { type: 'inventory_error', error: 'MAX_UPGRADES_REACHED' });
        break;
    }
    
    if (user.coins < UPGRADE_COST) {
        sendToPlayer(playerId, { type: 'inventory_error', error: 'INSUFFICIENT_GOLD' });
        break;
    }
    
    // Deduct gold
    await userService.deductCoins(player.walletAddress, UPGRADE_COST, 'inventory_upgrade');
    
    // Add slots
    user.inventoryUpgrades += 1;
    user.maxInventorySlots = 150 + (user.inventoryUpgrades * SLOTS_PER_UPGRADE);
    await user.save();
    
    sendToPlayer(playerId, {
        type: 'inventory_upgraded',
        newMaxSlots: user.maxInventorySlots,
        upgradeLevel: user.inventoryUpgrades,
        goldSpent: UPGRADE_COST
    });
    break;
}
```

---

## Frontend: Inventory UI Component

### `src/components/InventoryModal.jsx`

A new modal to view and manage inventory:

**Features:**
- Grid view of all owned cosmetics
- Filter by category, rarity, quality
- Sort by date, rarity, serial number
- Item detail panel showing:
  - Name, rarity, category
  - Quality with color indicator
  - Holographic badge
  - First Edition badge
  - Serial number
  - Minted date
  - Gold value if burned
- Burn button with confirmation
- Inventory count / max slots
- Upgrade slots button

**UI Mock:**
```
┌─────────────────────────────────────────────────────────┐
│ 🎒 INVENTORY                              [147/150] 📦  │
├─────────────────────────────────────────────────────────┤
│ [All] [Hats] [Eyes] [Mouths] [Body] [Mounts] [Skins]   │
│ Sort: [Newest ▼]  Quality: [All ▼]  Rarity: [All ▼]    │
├─────────────────────────────────────────────────────────┤
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│ │ 🎩 │ │ 👀 │ │ 🎩 │ │ 👕 │ │ 🎩 │ │ 👄 │ │ 🐴 │      │
│ │HOLO│ │#3  │ │    │ │ FE │ │    │ │    │ │    │      │
│ │ ✨ │ │ 🔵 │ │ 🟣 │ │ 🟡 │ │ ⚪ │ │ 🟢 │ │ 🔴 │      │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘      │
│ ... (more items)                                        │
├─────────────────────────────────────────────────────────┤
│ SELECTED: Wizard Hat #47                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🎩 Wizard Hat                                       │ │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│ │ Rarity: 🟣 EPIC                                     │ │
│ │ Quality: ⭐ PRISTINE (+25% value)                   │ │
│ │ Serial: #47                                         │ │
│ │ Minted: Dec 27, 2024                                │ │
│ │                                                     │ │
│ │ 💰 Burn Value: 625 Gold                             │ │
│ │ [🔥 BURN FOR GOLD]                                  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [📦 Upgrade Slots (+50) - 5,000 Gold]                   │
└─────────────────────────────────────────────────────────┘
```

---

## Economy Impact

### Gold Sinks Created:
1. **Inventory Upgrades**: 5,000 gold per +50 slots (up to 10 upgrades = 50,000 gold total)
2. **Future: Quality Rerolls**: Pay gold to reroll item quality
3. **Future: Holo Blessing**: Pay gold for chance to make item holographic
4. **Future: Trade Fees**: Small gold fee on trades

### Value Preservation:
- Items retain value instead of being auto-burned
- Users can speculate on future market prices
- First Editions, low serials, and Flawless Holos become truly rare
- Duplicate hoarding = supply scarcity = higher prices

### Market Dynamics (Future):
- Users list items for SOL/Pebbles
- Platform takes 5% fee
- Price discovery happens naturally
- Rare combinations command premiums

---

## Migration Plan

### For Existing Users:
1. All currently owned cosmetics stay as-is
2. New `maxInventorySlots` defaults to 150
3. Existing users with >150 items? Grace period or auto-upgrade

### Rollout:
1. **Phase 1**: Update GachaService (no auto-burn)
2. **Phase 2**: Add inventory endpoints
3. **Phase 3**: Build Inventory UI
4. **Phase 4**: Add upgrade system
5. **Phase 5**: Future - Trading marketplace

---

## Summary

| Feature | Before | After |
|---------|--------|-------|
| Duplicate handling | Auto-burn for gold | Keep in inventory |
| Inventory visibility | Hidden | Full UI with filters |
| Item value factors | Ignored | Quality, Holo, FE, Serial displayed |
| Burning | Automatic | Manual user choice |
| Inventory limits | None | 150 base, upgradeable to 650 |
| Gold sinks | None from inventory | Upgrades, future rerolls |
| Trading prep | Not possible | Items are persistent, tradeable |

This creates a TRUE CS:GO-style economy where every item matters!

---

## ✅ Implementation Status (Completed Dec 27, 2024)

### Files Modified:

| File | Changes |
|------|---------|
| `server/db/models/User.js` | Added `inventorySlots`, `maxInventorySlots`, `inventoryUpgrades`. Added methods: `getInventoryCount()`, `hasInventorySpace()`, `getRemainingSlots()`, `upgradeInventory()`, `getInventoryUpgradeInfo()` |
| `server/db/models/OwnedCosmetic.js` | Added `getFullInventory()`, `burnForGold()`, `getUserOwnedTemplateIds()`, `countUserDuplicates()`, `getInventoryStats()`. Added compound indexes for inventory queries. |
| `server/db/models/Transaction.js` | Added `cosmetic_burn` and `inventory_upgrade` transaction types |
| `server/services/GachaService.js` | Removed `_processDuplicate()` (no auto-burn). Added inventory space check before rolling. Added `_calculateBurnValue()`. Updated `roll()` to always mint items. |
| `server/index.js` | Added WebSocket handlers: `inventory_get`, `inventory_stats`, `inventory_burn`, `inventory_upgrade`, `inventory_bulk_burn` |
| `src/multiplayer/MultiplayerContext.jsx` | Added callbacks: `onInventoryData`, `onInventoryStats`, `onInventoryBurned`, `onInventoryBulkBurned`, `onInventoryUpgraded`, `onInventoryError` |
| `src/components/InventoryModal.jsx` | **NEW** - Full inventory UI with grid view, filters, sorting, bulk selection, burn confirmation, slot upgrades |
| `src/components/GameHUD.jsx` | Added inventory button (📦) for both portrait and landscape modes |

### Features Implemented:
- ✅ No auto-burn - users keep ALL gacha items
- ✅ Inventory space check before rolling
- ✅ 150 base slots, upgradeable to 650 (50 slots per upgrade, 5000 gold each)
- ✅ Manual burn for gold (individual or bulk)
- ✅ Burn value formula: `base × quality × holo(3x) × FE(2x) × serial_bonus`
- ✅ Full inventory UI with grid, filters, sorting
- ✅ Item detail panel with serial#, quality, badges
- ✅ Bulk burn mode (select multiple items)
- ✅ Pagination support
- ✅ Mobile-friendly (portrait mode button)

### Gold Value Formula:
```
Base Gold × Quality Multiplier × Holographic × First Edition × Serial Bonus

Quality: worn(0.7x), standard(1x), pristine(1.8x), flawless(4x)
Holographic: 3x
First Edition: 2x
Serial ≤10: 2x, Serial ≤100: 1.5x
```

### Example Burn Values:
| Item | Base | Quality | Holo | FE | Serial | Total |
|------|------|---------|------|----|--------|-------|
| Common Hat | 25 | standard(1x) | no | no | #500 | **25** |
| Epic Sword | 500 | flawless(4x) | yes | no | #50 | **9,000** |
| Divine Crown | 50,000 | pristine(1.8x) | yes | yes | #1 | **1,080,000** |

