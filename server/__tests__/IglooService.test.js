/**
 * IglooService Unit Tests
 * Tests rental logic, access control, and settings management
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies before importing service
vi.mock('../db/models/Igloo.js', () => ({
    default: {
        findOne: vi.fn(),
        find: vi.fn()
    }
}));

vi.mock('../db/models/User.js', () => ({
    default: {
        findOne: vi.fn()
    }
}));

vi.mock('../services/X402Service.js', () => ({
    default: {
        verifyPayload: vi.fn(),
        settlePayment: vi.fn(),
        checkRentEligibility: vi.fn()
    }
}));

// Import after mocks
import Igloo from '../db/models/Igloo.js';
import User from '../db/models/User.js';
import x402Service from '../services/X402Service.js';

// ==================== TEST DATA ====================
const mockWallet = 'TestWallet123';
const mockIglooId = 'igloo1';

const createMockIgloo = (overrides = {}) => ({
    iglooId: mockIglooId,
    isRented: false,
    isPermanent: false,
    ownerWallet: null,
    ownerUsername: null,
    accessType: 'private',
    tokenGate: { enabled: false, tokenAddress: null, minimumBalance: 1 },
    entryFee: { enabled: false, amount: 0 },
    paidEntryFees: [],
    stats: { totalVisits: 0, uniqueVisitors: 0, totalRentPaid: 0, timesRented: 0 },
    banner: { title: null, ticker: null, shill: null, styleIndex: 0 },
    
    // Methods
    canEnter: vi.fn(),
    startRental: vi.fn(),
    payRent: vi.fn(),
    evict: vi.fn(),
    recordVisit: vi.fn(),
    resetEntryFees: vi.fn(),
    recordEntryFeePayment: vi.fn(),
    getPublicInfo: vi.fn(() => ({ iglooId: mockIglooId, isRented: false })),
    getOwnerInfo: vi.fn(() => ({ iglooId: mockIglooId, ownerWallet: mockWallet })),
    save: vi.fn().mockResolvedValue(true),
    ...overrides
});

// ==================== TESTS ====================
describe('IglooService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('canRent', () => {
        it('should allow renting available igloo with sufficient balance', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            x402Service.checkRentEligibility.mockResolvedValue({ hasBalance: true, currentBalance: 100000 });
            
            // Import service (after mocks are set up)
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, mockIglooId);
            
            expect(result.canRent).toBe(true);
            expect(result.dailyRent).toBe(10000);
        });
        
        it('should reject renting already rented igloo', async () => {
            const mockIgloo = createMockIgloo({ isRented: true, ownerUsername: 'OtherUser' });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, mockIglooId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('ALREADY_RENTED');
        });
        
        it('should reject renting permanent igloo', async () => {
            const mockIgloo = createMockIgloo({ isPermanent: true, permanentOwnerName: 'SKNY GANG' });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, 'igloo3');
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('PERMANENTLY_OWNED');
        });
        
        it('should reject when insufficient balance', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            x402Service.checkRentEligibility.mockResolvedValue({ hasBalance: false, currentBalance: 5000 });
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canRent(mockWallet, mockIglooId);
            
            expect(result.canRent).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_BALANCE');
        });
    });
    
    describe('canEnter', () => {
        it('should allow owner to enter private igloo', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet,
                accessType: 'private'
            });
            mockIgloo.canEnter.mockReturnValue({ canEnter: true, isOwner: true });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(true);
            expect(result.isOwner).toBe(true);
        });
        
        it('should block non-owner from private igloo', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'private'
            });
            mockIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'IGLOO_LOCKED', 
                message: 'This igloo is private' 
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('IGLOO_LOCKED');
        });
        
        it('should allow anyone to enter public igloo', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'public'
            });
            mockIgloo.canEnter.mockReturnValue({ canEnter: true });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require entry fee when configured', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 1000 }
            });
            mockIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 1000
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId);
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.requiresPayment).toBe(true);
            expect(result.paymentAmount).toBe(1000);
        });
        
        it('should require token holding when configured', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'SomeOtherWallet',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN123', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            mockIgloo.canEnter.mockReturnValue({ 
                canEnter: false, 
                reason: 'TOKEN_REQUIRED',
                tokenRequired: { address: 'TOKEN123', symbol: '$TEST', minimum: 100 }
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.canEnter(mockWallet, mockIglooId, 50); // Only has 50 tokens
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
        });
    });
    
    describe('updateSettings', () => {
        it('should allow owner to update settings', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                accessType: 'public',
                banner: { title: 'My Cool Igloo' }
            });
            
            expect(result.success).toBe(true);
            expect(mockIgloo.save).toHaveBeenCalled();
        });
        
        it('should reject non-owner updating settings', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: 'DifferentWallet'
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                accessType: 'public'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('NOT_OWNER');
        });
        
        it('should reset entry fees when fee settings change', async () => {
            const mockIgloo = createMockIgloo({
                isRented: true,
                ownerWallet: mockWallet,
                entryFee: { enabled: false, amount: 0 }
            });
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.updateSettings(mockWallet, mockIglooId, {
                entryFee: { enabled: true, amount: 500 }
            });
            
            expect(result.success).toBe(true);
            expect(result.entryFeesReset).toBe(true);
        });
    });
    
    describe('startRental', () => {
        it('should complete rental with valid payment', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            User.findOne.mockResolvedValue({ username: 'TestUser' });
            
            x402Service.checkRentEligibility.mockResolvedValue({ hasBalance: true });
            x402Service.verifyPayload.mockResolvedValue({ valid: true, payload: {} });
            x402Service.settlePayment.mockResolvedValue({ 
                success: true, 
                transactionHash: 'tx123' 
            });
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.startRental(mockWallet, mockIglooId, 'validPayload');
            
            expect(result.success).toBe(true);
            expect(result.transactionHash).toBe('tx123');
            expect(mockIgloo.startRental).toHaveBeenCalledWith(mockWallet, 'TestUser');
            expect(mockIgloo.save).toHaveBeenCalled();
        });
        
        it('should fail rental with invalid payment', async () => {
            const mockIgloo = createMockIgloo();
            Igloo.findOne.mockResolvedValue(mockIgloo);
            
            x402Service.checkRentEligibility.mockResolvedValue({ hasBalance: true });
            x402Service.verifyPayload.mockResolvedValue({ 
                valid: false, 
                error: 'INVALID_SIGNATURE' 
            });
            
            const { default: iglooService } = await import('../services/IglooService.js');
            
            const result = await iglooService.startRental(mockWallet, mockIglooId, 'invalidPayload');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('INVALID_SIGNATURE');
            expect(mockIgloo.startRental).not.toHaveBeenCalled();
        });
    });
});

