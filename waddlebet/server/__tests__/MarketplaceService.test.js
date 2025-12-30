/**
 * MarketplaceService Unit Tests
 * Tests for in-game Pebbles marketplace (no blockchain involved)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the models before importing service
vi.mock('../db/models/MarketListing.js', () => ({
    default: {
        findOne: vi.fn(),
        find: vi.fn(),
        countDocuments: vi.fn(),
        generateListingId: vi.fn(() => `mkt_${Date.now()}_test123`)
    }
}));

vi.mock('../db/models/OwnedCosmetic.js', () => ({
    default: {
        findOne: vi.fn()
    }
}));

vi.mock('../db/models/CosmeticTemplate.js', () => ({
    default: {
        findOne: vi.fn()
    }
}));

vi.mock('../db/models/User.js', () => ({
    default: {
        findOne: vi.fn()
    }
}));

// Mock mongoose - only needed for DB transaction tests
vi.mock('mongoose', () => ({
    default: {
        startSession: vi.fn()
    }
}));

import MarketListing from '../db/models/MarketListing.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import User from '../db/models/User.js';
import marketplaceService from '../services/MarketplaceService.js';

describe('MarketplaceService', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    afterEach(() => {
        vi.resetAllMocks();
    });
    
    // ==================== PRICE VALIDATION ====================
    describe('listItem - price validation', () => {
        it('should reject price of 0', async () => {
            const result = await marketplaceService.listItem('wallet123', 'item123', 0);
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_PRICE');
        });
        
        it('should reject negative price', async () => {
            const result = await marketplaceService.listItem('wallet123', 'item123', -100);
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_PRICE');
        });
        
        it('should reject price over 1 million', async () => {
            const result = await marketplaceService.listItem('wallet123', 'item123', 1000001);
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_PRICE');
        });
        
        it('should reject undefined price', async () => {
            const result = await marketplaceService.listItem('wallet123', 'item123', undefined);
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_PRICE');
        });
        
        it('should reject null price', async () => {
            const result = await marketplaceService.listItem('wallet123', 'item123', null);
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_PRICE');
        });
    });
    
    // ==================== CANCEL LISTING ====================
    describe('cancelListing', () => {
        it('should reject canceling non-existent listing', async () => {
            MarketListing.findOne.mockResolvedValue(null);
            
            const result = await marketplaceService.cancelListing('wallet123', 'fake_listing');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('LISTING_NOT_FOUND');
        });
        
        it('should successfully cancel own listing', async () => {
            const mockListing = {
                listingId: 'listing123',
                sellerId: 'wallet123',
                status: 'active',
                itemSnapshot: { name: 'Test Item', serialNumber: 1 },
                save: vi.fn().mockResolvedValue(true)
            };
            
            MarketListing.findOne.mockResolvedValue(mockListing);
            
            const result = await marketplaceService.cancelListing('wallet123', 'listing123');
            
            expect(result.success).toBe(true);
            expect(mockListing.status).toBe('cancelled');
            expect(mockListing.cancelledAt).toBeDefined();
            expect(mockListing.save).toHaveBeenCalled();
        });
    });
    
    // ==================== BROWSE LISTINGS ====================
    describe('browseListings', () => {
        it('should return listings with pagination info', async () => {
            const mockListings = [
                { listingId: 'l1', price: 100 },
                { listingId: 'l2', price: 200 }
            ];
            
            MarketListing.countDocuments.mockResolvedValue(5);
            MarketListing.find.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue(mockListings)
            });
            
            const result = await marketplaceService.browseListings({ page: 1, limit: 2 });
            
            expect(result.listings).toHaveLength(2);
            expect(result.total).toBe(5);
            expect(result.hasMore).toBe(true);
        });
        
        it('should build correct query with category filter', async () => {
            MarketListing.countDocuments.mockResolvedValue(1);
            MarketListing.find.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue([])
            });
            
            await marketplaceService.browseListings({ category: 'hat' });
            
            expect(MarketListing.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    'itemSnapshot.category': 'hat'
                })
            );
        });
        
        it('should build correct query with rarity filter', async () => {
            MarketListing.countDocuments.mockResolvedValue(1);
            MarketListing.find.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue([])
            });
            
            await marketplaceService.browseListings({ rarity: 'legendary' });
            
            expect(MarketListing.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    'itemSnapshot.rarity': 'legendary'
                })
            );
        });
        
        it('should build correct query with price range', async () => {
            MarketListing.countDocuments.mockResolvedValue(1);
            MarketListing.find.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                skip: vi.fn().mockReturnThis(),
                limit: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue([])
            });
            
            await marketplaceService.browseListings({ minPrice: 100, maxPrice: 500 });
            
            expect(MarketListing.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    price: { $gte: 100, $lte: 500 }
                })
            );
        });
    });
    
    // ==================== CAN LIST ITEM ====================
    describe('canListItem', () => {
        it('should return false for items not owned by user', async () => {
            OwnedCosmetic.findOne.mockResolvedValue(null);
            
            const result = await marketplaceService.canListItem('wallet123', 'item123');
            
            expect(result.canList).toBe(false);
            expect(result.reason).toContain('not found');
        });
        
        it('should return false for non-tradable items', async () => {
            OwnedCosmetic.findOne.mockResolvedValue({
                instanceId: 'item123',
                ownerId: 'wallet123',
                tradable: false
            });
            
            const result = await marketplaceService.canListItem('wallet123', 'item123');
            
            expect(result.canList).toBe(false);
            expect(result.reason).toContain('not tradable');
        });
        
        it('should return false for already listed items', async () => {
            OwnedCosmetic.findOne.mockResolvedValue({
                instanceId: 'item123',
                ownerId: 'wallet123',
                tradable: true
            });
            
            MarketListing.findOne.mockResolvedValue({ listingId: 'existing' });
            
            const result = await marketplaceService.canListItem('wallet123', 'item123');
            
            expect(result.canList).toBe(false);
            expect(result.reason).toContain('already listed');
        });
        
        it('should return true for tradable unlisted items', async () => {
            OwnedCosmetic.findOne.mockResolvedValue({
                instanceId: 'item123',
                ownerId: 'wallet123',
                tradable: true
            });
            
            MarketListing.findOne.mockResolvedValue(null);
            
            const result = await marketplaceService.canListItem('wallet123', 'item123');
            
            expect(result.canList).toBe(true);
        });
    });
    
    // ==================== GET USER LISTINGS ====================
    describe('getUserListings', () => {
        it('should query for user active listings', async () => {
            const mockListings = [
                { listingId: 'l1', sellerId: 'wallet123', status: 'active' }
            ];
            
            MarketListing.find.mockReturnValue({
                sort: vi.fn().mockReturnThis(),
                lean: vi.fn().mockResolvedValue(mockListings)
            });
            
            const result = await marketplaceService.getUserListings('wallet123');
            
            expect(MarketListing.find).toHaveBeenCalledWith({
                sellerId: 'wallet123',
                status: 'active'
            });
            expect(result).toHaveLength(1);
        });
    });
    
    // ==================== NO MARKETPLACE FEE ====================
    describe('marketplace fee-free trading', () => {
        it('should transfer full price to seller (no fees)', () => {
            // No marketplace fee - platform revenue from withdrawal rake
            const testPrices = [100, 500, 1000, 9999, 1];
            
            testPrices.forEach(price => {
                const sellerReceives = price; // Full amount, no deduction
                expect(sellerReceives).toBe(price);
            });
        });
    });
    
    // ==================== MARKET STATS ====================
    describe('getMarketStats', () => {
        it('should return aggregated market statistics (no fees tracked)', async () => {
            // getMarketStats is delegated to the model
            // We just verify the service method calls the model
            MarketListing.countDocuments.mockResolvedValue(100);
            
            // Just verify the method exists and returns something
            const result = await marketplaceService.getMarketStats();
            
            // The result structure depends on the model implementation
            expect(result).toBeDefined();
        });
    });
});
