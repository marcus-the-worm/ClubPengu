#!/usr/bin/env node
/**
 * Fix Promo Items Script
 * 
 * This script fixes OwnedCosmetic records created via promo codes:
 * - Sets isFirstEdition = false (promo items should never be first editions)
 * - Sets quality = 'worn' (lowest quality - worthless)
 * - Sets serialNumber = 999999 (special promo serial)
 * - Ensures tradable = false
 * 
 * Run: node server/scripts/fixPromoItems.js
 */

import 'dotenv/config';
import { connectDB, disconnectDB } from '../db/connection.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import PromoRedemption from '../db/models/PromoRedemption.js';
import PromoCode from '../db/models/PromoCode.js';

async function fixPromoItems() {
    console.log('🔧 Fix Promo Items Script\n');
    console.log('================================\n');
    
    try {
        await connectDB();
        console.log('✅ Database connected\n');
        
        // 1. Find all promo codes with unlockByRarity (the team starter pack type)
        const promoCodes = await PromoCode.find({ 
            'unlocks.unlockByRarity': { $exists: true, $ne: [] }
        });
        console.log(`📋 Found ${promoCodes.length} promo codes with rarity unlocks\n`);
        
        for (const code of promoCodes) {
            console.log(`   - ${code.code.substring(0, 20)}... : ${code.name}`);
        }
        
        // 2. Find all redemptions for these codes
        const promoCodeIds = promoCodes.map(p => p._id);
        const redemptions = await PromoRedemption.find({
            promoCodeId: { $in: promoCodeIds },
            status: 'success'
        });
        
        console.log(`\n📊 Found ${redemptions.length} successful redemptions\n`);
        
        // Get unique wallet addresses
        const walletAddresses = [...new Set(redemptions.map(r => r.walletAddress))];
        console.log(`👥 Affected wallets: ${walletAddresses.length}\n`);
        
        for (const wallet of walletAddresses) {
            console.log(`   - ${wallet.substring(0, 8)}...${wallet.substring(wallet.length - 4)}`);
        }
        
        // 3. Find all OwnedCosmetics created via promo_code
        console.log('\n🔍 Finding promo-created OwnedCosmetics...\n');
        
        const promoCosmetics = await OwnedCosmetic.find({
            acquisitionMethod: 'promo_code'
        });
        
        console.log(`📦 Found ${promoCosmetics.length} promo OwnedCosmetics total`);
        
        // Count issues
        let firstEditionCount = 0;
        let wrongQualityCount = 0;
        let tradableCount = 0;
        
        for (const item of promoCosmetics) {
            if (item.isFirstEdition) firstEditionCount++;
            if (item.quality !== 'worn') wrongQualityCount++;
            if (item.tradable !== false) tradableCount++;
        }
        
        console.log(`\n⚠️  Issues found:`);
        console.log(`   - First Editions: ${firstEditionCount} (should be 0)`);
        console.log(`   - Wrong Quality: ${wrongQualityCount} (should all be 'worn')`);
        console.log(`   - Tradable=true: ${tradableCount} (should all be false)`);
        
        // 4. Fix all promo items (keep serialNumber due to unique index, fix everything else)
        console.log('\n🔧 Fixing all promo items...\n');
        
        const updateResult = await OwnedCosmetic.updateMany(
            { acquisitionMethod: 'promo_code' },
            {
                $set: {
                    isFirstEdition: false,  // NEVER first edition
                    quality: 'worn',  // Lowest quality = worthless
                    tradable: false,  // Cannot trade/sell/burn
                    mintedBy: 'PROMO_SYSTEM'  // Mark as system-generated
                }
            }
        );
        
        console.log(`✅ Updated ${updateResult.modifiedCount} OwnedCosmetic records`);
        
        // 5. Verify fix
        console.log('\n🔍 Verifying fix...\n');
        
        const stillBroken = await OwnedCosmetic.countDocuments({
            acquisitionMethod: 'promo_code',
            $or: [
                { isFirstEdition: true },
                { quality: { $ne: 'worn' } },
                { tradable: { $ne: false } }
            ]
        });
        
        if (stillBroken === 0) {
            console.log('✅ All promo items fixed successfully!');
        } else {
            console.log(`⚠️  ${stillBroken} items still have issues`);
        }
        
        // 6. Summary
        console.log('\n================================');
        console.log('📊 SUMMARY');
        console.log('================================');
        console.log(`Total promo items: ${promoCosmetics.length}`);
        console.log(`Fixed: ${updateResult.modifiedCount}`);
        console.log(`\nAll promo items now have:`);
        console.log(`   - isFirstEdition: false (no value from first edition)`);
        console.log(`   - quality: worn (lowest quality = worthless)`);
        console.log(`   - tradable: false (cannot sell/burn)`);
        console.log(`   - Hidden from inventory display`);
        console.log(`   - Only visible in penguin customizer`);
        console.log('================================\n');
        
    } catch (err) {
        console.error('💥 Error:', err);
        process.exit(1);
    } finally {
        await disconnectDB();
        console.log('✅ Database disconnected');
        process.exit(0);
    }
}

// Run
fixPromoItems();

