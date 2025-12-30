/**
 * MarketplaceService - Open market for cosmetic trading
 * RuneScape Grand Exchange / CS:GO Market style
 * 
 * All trades are in Pebbles (in-game currency)
 * NO marketplace fee - platform revenue comes from Pebbles withdrawal rake
 * 
 * Flow: Buy Pebbles → Trade items → Withdraw Pebbles (platform takes fee on withdrawal)
 */

import MarketListing from '../db/models/MarketListing.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import CosmeticTemplate from '../db/models/CosmeticTemplate.js';
import User from '../db/models/User.js';
import mongoose from 'mongoose';

// Market configuration
const MIN_PRICE = 1;           // Minimum listing price
const MAX_PRICE = 1000000;     // Maximum listing price (1M pebbles)
const LISTING_DURATION_DAYS = 7;  // Listings expire after 7 days

class MarketplaceService {
    
    /**
     * List an item for sale on the market
     * @param {string} walletAddress - Seller's wallet
     * @param {string} itemInstanceId - OwnedCosmetic instanceId
     * @param {number} price - Price in Pebbles
     * @returns {object} - { success, listing, error }
     */
    async listItem(walletAddress, itemInstanceId, price) {
        // Validate price before starting transaction
        if (!price || price < MIN_PRICE || price > MAX_PRICE) {
            return {
                success: false,
                error: 'INVALID_PRICE',
                message: `Price must be between ${MIN_PRICE} and ${MAX_PRICE} Pebbles`
            };
        }
        
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            
            // Get the item
            const item = await OwnedCosmetic.findOne({
                instanceId: itemInstanceId,
                ownerId: walletAddress,
                convertedToGold: false
            }).session(session);
            
            if (!item) {
                throw { code: 'ITEM_NOT_FOUND', message: 'Item not found or not owned by you' };
            }
            
            // Check if tradable
            if (item.tradable === false) {
                throw { code: 'NOT_TRADABLE', message: 'This item cannot be traded (promo/achievement item)' };
            }
            
            // Check if already listed
            const existingListing = await MarketListing.findOne({
                itemInstanceId,
                status: 'active'
            }).session(session);
            
            if (existingListing) {
                throw { code: 'ALREADY_LISTED', message: 'This item is already listed for sale' };
            }
            
            // Get template for item snapshot
            const template = await CosmeticTemplate.findOne({ templateId: item.templateId });
            const category = template?.category;
            
            // Get seller and check if item is equipped
            const seller = await User.findOne({ walletAddress }).session(session);
            
            // Default values for unequipping
            const categoryDefaults = {
                hat: 'none',
                eyes: 'normal',
                mouth: 'beak',
                bodyItem: 'none',
                mount: 'none',
                skin: 'blue'
            };
            
            // If this item is currently equipped, unequip it
            let wasUnequipped = false;
            if (seller && category && seller.customization?.[category] === item.templateId) {
                seller.customization[category] = categoryDefaults[category] || 'none';
                await seller.save({ session });
                wasUnequipped = true;
                console.log(`[Market] Unequipped ${item.templateId} from ${seller.username} (listing item)`);
            }
            
            // Create listing
            const listing = new MarketListing({
                listingId: MarketListing.generateListingId(),
                itemInstanceId,
                templateId: item.templateId,
                itemSnapshot: {
                    name: template?.name || 'Unknown Item',
                    category: template?.category || 'unknown',
                    rarity: template?.rarity || 'common',
                    assetKey: template?.assetKey || item.templateId,
                    serialNumber: item.serialNumber,
                    quality: item.quality,
                    isHolographic: item.isHolographic,
                    isFirstEdition: item.isFirstEdition
                },
                sellerId: walletAddress,
                sellerUsername: seller?.username || 'Unknown',
                price: Math.floor(price),
                expiresAt: new Date(Date.now() + LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000)
            });
            
            await listing.save({ session });
            await session.commitTransaction();
            
            console.log(`[Market] Listed: ${listing.itemSnapshot.name} #${item.serialNumber} for ${price} Pebbles by ${seller?.username}`);
            
            return {
                success: true,
                listing: listing.toObject(),
                wasUnequipped,
                unequippedCategory: wasUnequipped ? category : null,
                newCustomization: wasUnequipped ? seller.customization : null
            };
            
        } catch (error) {
            await session.abortTransaction();
            console.error('[Market] List error:', error);
            return {
                success: false,
                error: error.code || 'LIST_FAILED',
                message: error.message || 'Failed to list item'
            };
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Cancel a listing (seller only)
     * @param {string} walletAddress - Seller's wallet
     * @param {string} listingId - Listing to cancel
     * @returns {object} - { success, error }
     */
    async cancelListing(walletAddress, listingId) {
        try {
            const listing = await MarketListing.findOne({
                listingId,
                sellerId: walletAddress,
                status: 'active'
            });
            
            if (!listing) {
                return { success: false, error: 'LISTING_NOT_FOUND', message: 'Listing not found or not yours' };
            }
            
            listing.status = 'cancelled';
            listing.cancelledAt = new Date();
            await listing.save();
            
            console.log(`[Market] Cancelled: ${listing.itemSnapshot.name} #${listing.itemSnapshot.serialNumber} by seller`);
            
            return { success: true };
            
        } catch (error) {
            console.error('[Market] Cancel error:', error);
            return { success: false, error: 'CANCEL_FAILED', message: 'Failed to cancel listing' };
        }
    }
    
    /**
     * Buy an item from the market
     * @param {string} buyerWallet - Buyer's wallet address
     * @param {string} listingId - Listing to purchase
     * @returns {object} - { success, item, pebblesPaid, error }
     */
    async buyItem(buyerWallet, listingId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Get listing with lock
            const listing = await MarketListing.findOne({
                listingId,
                status: 'active'
            }).session(session);
            
            if (!listing) {
                throw { code: 'LISTING_NOT_FOUND', message: 'Listing not found or already sold' };
            }
            
            // Can't buy your own item
            if (listing.sellerId === buyerWallet) {
                throw { code: 'CANNOT_BUY_OWN', message: 'You cannot buy your own listing' };
            }
            
            // Get buyer
            const buyer = await User.findOne({ walletAddress: buyerWallet }).session(session);
            if (!buyer) {
                throw { code: 'BUYER_NOT_FOUND', message: 'Buyer account not found' };
            }
            
            // Check buyer has enough pebbles
            if (buyer.pebbles < listing.price) {
                throw { 
                    code: 'INSUFFICIENT_PEBBLES', 
                    message: `Not enough Pebbles. Need ${listing.price}, have ${buyer.pebbles}` 
                };
            }
            
            // Get seller
            const seller = await User.findOne({ walletAddress: listing.sellerId }).session(session);
            if (!seller) {
                throw { code: 'SELLER_NOT_FOUND', message: 'Seller account not found' };
            }
            
            // Get the item
            const item = await OwnedCosmetic.findOne({
                instanceId: listing.itemInstanceId,
                ownerId: listing.sellerId,
                convertedToGold: false
            }).session(session);
            
            if (!item) {
                // Item was burned/converted - cancel listing
                listing.status = 'cancelled';
                listing.cancelledAt = new Date();
                await listing.save({ session });
                throw { code: 'ITEM_UNAVAILABLE', message: 'Item is no longer available' };
            }
            
            // Transfer pebbles: buyer -> seller (no fee - platform revenue from withdrawal)
            buyer.pebbles -= listing.price;
            buyer.pebbleStats.totalSpent = (buyer.pebbleStats.totalSpent || 0) + listing.price;
            
            seller.pebbles += listing.price;  // Seller gets full amount
            
            // Transfer item ownership with full history tracking
            const transferResult = await OwnedCosmetic.transferOwnership(
                listing.itemInstanceId,
                listing.sellerId,
                buyerWallet,
                {
                    price: listing.price,
                    transactionId: listing.listingId,
                    acquisitionType: 'trade'
                },
                session
            );
            
            if (!transferResult.success) {
                throw { code: transferResult.error, message: transferResult.message };
            }
            
            // Update listing
            listing.status = 'sold';
            listing.buyerId = buyerWallet;
            listing.buyerUsername = buyer.username;
            listing.soldAt = new Date();
            listing.sellerReceived = listing.price;  // Full amount, no fee
            
            // Save pebble transfers and listing
            await Promise.all([
                buyer.save({ session }),
                seller.save({ session }),
                listing.save({ session })
            ]);
            
            await session.commitTransaction();
            
            console.log(`[Market] SOLD: ${listing.itemSnapshot.name} #${listing.itemSnapshot.serialNumber}`);
            console.log(`  Buyer: ${buyer.username} paid ${listing.price} Pebbles`);
            console.log(`  Seller: ${seller.username} received ${listing.price} Pebbles`);
            
            return {
                success: true,
                item: {
                    instanceId: item.instanceId,
                    templateId: item.templateId,
                    ...listing.itemSnapshot
                },
                pebblesPaid: listing.price,
                newPebbleBalance: buyer.pebbles,
                // For seller notification
                sellerWallet: listing.sellerId,
                sellerNewPebbles: seller.pebbles
            };
            
        } catch (error) {
            await session.abortTransaction();
            console.error('[Market] Buy error:', error);
            return {
                success: false,
                error: error.code || 'BUY_FAILED',
                message: error.message || 'Failed to purchase item'
            };
        } finally {
            session.endSession();
        }
    }
    
    /**
     * Browse market listings
     */
    async browseListings(options = {}) {
        try {
            return await MarketListing.browseListings(options);
        } catch (error) {
            console.error('[Market] Browse error:', error);
            return { listings: [], total: 0, page: 1, hasMore: false };
        }
    }
    
    /**
     * Get a single listing by ID
     */
    async getListing(listingId) {
        try {
            const listing = await MarketListing.findOne({ listingId }).lean();
            return listing;
        } catch (error) {
            console.error('[Market] Get listing error:', error);
            return null;
        }
    }
    
    /**
     * Get user's active listings
     */
    async getUserListings(walletAddress) {
        try {
            return await MarketListing.getUserListings(walletAddress, 'active');
        } catch (error) {
            console.error('[Market] Get user listings error:', error);
            return [];
        }
    }
    
    /**
     * Get user's sales history
     */
    async getUserSalesHistory(walletAddress, limit = 50) {
        try {
            return await MarketListing.getUserSales(walletAddress, limit);
        } catch (error) {
            console.error('[Market] Get sales history error:', error);
            return [];
        }
    }
    
    /**
     * Get user's purchase history
     */
    async getUserPurchaseHistory(walletAddress, limit = 50) {
        try {
            return await MarketListing.getUserPurchases(walletAddress, limit);
        } catch (error) {
            console.error('[Market] Get purchase history error:', error);
            return [];
        }
    }
    
    /**
     * Get price history for an item
     */
    async getItemPriceHistory(templateId, days = 30) {
        try {
            return await MarketListing.getPriceHistory(templateId, days);
        } catch (error) {
            console.error('[Market] Get price history error:', error);
            return { sales: [], stats: {} };
        }
    }
    
    /**
     * Get market statistics
     */
    async getMarketStats() {
        try {
            return await MarketListing.getMarketStats();
        } catch (error) {
            console.error('[Market] Get stats error:', error);
            return { activeListings: 0, totalSold24h: 0, volume24h: 0 };
        }
    }
    
    /**
     * Check if user can list an item
     * @returns {object} - { canList, reason }
     */
    async canListItem(walletAddress, itemInstanceId) {
        try {
            // Get item
            const item = await OwnedCosmetic.findOne({
                instanceId: itemInstanceId,
                ownerId: walletAddress,
                convertedToGold: false
            });
            
            if (!item) {
                return { canList: false, reason: 'Item not found or not owned' };
            }
            
            if (item.tradable === false) {
                return { canList: false, reason: 'Item is not tradable' };
            }
            
            // Check if already listed
            const isListed = await MarketListing.isItemListed(itemInstanceId);
            if (isListed) {
                return { canList: false, reason: 'Item is already listed' };
            }
            
            return { canList: true };
            
        } catch (error) {
            return { canList: false, reason: 'Error checking item' };
        }
    }
    
    /**
     * Expire old listings (run periodically)
     */
    async expireOldListings() {
        try {
            const result = await MarketListing.updateMany(
                {
                    status: 'active',
                    expiresAt: { $lt: new Date() }
                },
                {
                    $set: { status: 'expired' }
                }
            );
            
            if (result.modifiedCount > 0) {
                console.log(`[Market] Expired ${result.modifiedCount} old listings`);
            }
            
            return result.modifiedCount;
        } catch (error) {
            console.error('[Market] Expire listings error:', error);
            return 0;
        }
    }
}

// Export singleton instance
export default new MarketplaceService();

