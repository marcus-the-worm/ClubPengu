/**
 * Igloo Handlers Integration Tests
 * Tests WebSocket message handling for igloo operations
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock services
vi.mock('../services/IglooService.js', () => ({
    default: {
        getAllIgloos: vi.fn(),
        getIgloo: vi.fn(),
        getIglooForOwner: vi.fn(),
        canRent: vi.fn(),
        canEnter: vi.fn(),
        startRental: vi.fn(),
        payRent: vi.fn(),
        payEntryFee: vi.fn(),
        updateSettings: vi.fn(),
        getUserIgloos: vi.fn(),
        leaveIgloo: vi.fn(),
        recordVisit: vi.fn()
    }
}));

vi.mock('../services/X402Service.js', () => ({
    default: {
        verifyPayload: vi.fn(),
        settlePayment: vi.fn()
    }
}));

import iglooService from '../services/IglooService.js';
import { handleIglooMessage } from '../handlers/iglooHandlers.js';

// ==================== TEST HELPERS ====================
const createMockPlayer = (overrides = {}) => ({
    isAuthenticated: true,
    walletAddress: 'TestWallet123',
    username: 'TestUser',
    ...overrides
});

const createMockSendToPlayer = () => vi.fn();

// ==================== TESTS ====================
describe('Igloo Handlers', () => {
    let sendToPlayer;
    let player;
    const playerId = 'player_123';
    
    beforeEach(() => {
        vi.clearAllMocks();
        sendToPlayer = createMockSendToPlayer();
        player = createMockPlayer();
    });
    
    describe('igloo_list', () => {
        it('should return all igloos', async () => {
            const mockIgloos = [
                { iglooId: 'igloo1', isRented: false },
                { iglooId: 'igloo2', isRented: true }
            ];
            iglooService.getAllIgloos.mockResolvedValue(mockIgloos);
            
            const handled = await handleIglooMessage(playerId, player, { type: 'igloo_list' }, sendToPlayer);
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_list',
                igloos: mockIgloos
            });
        });
        
        it('should handle errors gracefully', async () => {
            iglooService.getAllIgloos.mockRejectedValue(new Error('DB Error'));
            
            const handled = await handleIglooMessage(playerId, player, { type: 'igloo_list' }, sendToPlayer);
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_error',
                error: 'SERVER_ERROR',
                message: 'Failed to fetch igloo list'
            });
        });
    });
    
    describe('igloo_info', () => {
        it('should return single igloo info', async () => {
            const mockIgloo = { iglooId: 'igloo1', isRented: false };
            iglooService.getIgloo.mockResolvedValue(mockIgloo);
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_info', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_info',
                igloo: mockIgloo
            });
        });
        
        it('should return error for non-existent igloo', async () => {
            iglooService.getIgloo.mockResolvedValue(null);
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_info', iglooId: 'igloo99' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_error',
                error: 'IGLOO_NOT_FOUND',
                message: 'Igloo not found'
            });
        });
    });
    
    describe('igloo_can_rent', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_can_rent', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_can_rent',
                canRent: false,
                error: 'NOT_AUTHENTICATED',
                message: 'Please connect your wallet to rent'
            });
        });
        
        it('should return rent eligibility for authenticated user', async () => {
            iglooService.canRent.mockResolvedValue({ 
                canRent: true, 
                dailyRent: 10000,
                minimumBalance: 70000
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_can_rent', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.canRent).toHaveBeenCalledWith('TestWallet123', 'igloo1');
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_can_rent',
                iglooId: 'igloo1',
                canRent: true,
                dailyRent: 10000,
                minimumBalance: 70000
            });
        });
    });
    
    describe('igloo_rent', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_rent', iglooId: 'igloo1', paymentPayload: 'payload' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_rent_result',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
        });
        
        it('should require payment payload', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_rent', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_rent_result',
                success: false,
                error: 'MISSING_PAYMENT',
                message: 'Payment authorization required'
            });
        });
        
        it('should complete rental with valid payment', async () => {
            iglooService.startRental.mockResolvedValue({
                success: true,
                iglooId: 'igloo1',
                transactionHash: 'tx123',
                rentDueDate: new Date(),
                message: 'Welcome to your new igloo!'
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_rent', iglooId: 'igloo1', paymentPayload: 'validPayload' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.startRental).toHaveBeenCalledWith(
                'TestWallet123',
                'igloo1',
                'validPayload'
            );
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, expect.objectContaining({
                type: 'igloo_rent_result',
                success: true,
                transactionHash: 'tx123'
            }));
        });
    });
    
    describe('igloo_can_enter', () => {
        it('should check entry for any user (including guests)', async () => {
            const guestPlayer = createMockPlayer({ walletAddress: null });
            
            iglooService.canEnter.mockResolvedValue({ canEnter: true });
            iglooService.getIgloo.mockResolvedValue({ iglooId: 'igloo1' });
            
            const handled = await handleIglooMessage(
                playerId, guestPlayer, 
                { type: 'igloo_can_enter', iglooId: 'igloo1', tokenBalance: 0 }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.canEnter).toHaveBeenCalledWith(null, 'igloo1', 0);
        });
        
        it('should return entry check result with igloo info', async () => {
            iglooService.canEnter.mockResolvedValue({ 
                canEnter: false, 
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 500
            });
            iglooService.getIgloo.mockResolvedValue({ 
                iglooId: 'igloo1', 
                ownerUsername: 'Owner' 
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_can_enter', iglooId: 'igloo1', tokenBalance: 0 }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_can_enter',
                iglooId: 'igloo1',
                igloo: { iglooId: 'igloo1', ownerUsername: 'Owner' },
                canEnter: false,
                reason: 'ENTRY_FEE_REQUIRED',
                requiresPayment: true,
                paymentAmount: 500
            });
        });
    });
    
    describe('igloo_pay_entry', () => {
        it('should process entry fee payment', async () => {
            iglooService.payEntryFee.mockResolvedValue({
                success: true,
                transactionHash: 'tx456'
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_pay_entry', iglooId: 'igloo1', paymentPayload: 'payload' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.payEntryFee).toHaveBeenCalledWith(
                'TestWallet123',
                'igloo1',
                'payload'
            );
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_pay_entry_result',
                success: true,
                transactionHash: 'tx456'
            });
        });
    });
    
    describe('igloo_update_settings', () => {
        it('should require authentication', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_update_settings', iglooId: 'igloo1', settings: {} }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_settings_result',
                success: false,
                error: 'NOT_AUTHENTICATED'
            });
        });
        
        it('should update settings for owner', async () => {
            const newSettings = { accessType: 'public', banner: { title: 'My Igloo' } };
            iglooService.updateSettings.mockResolvedValue({
                success: true,
                igloo: { iglooId: 'igloo1', accessType: 'public' }
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_update_settings', iglooId: 'igloo1', settings: newSettings }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.updateSettings).toHaveBeenCalledWith(
                'TestWallet123',
                'igloo1',
                newSettings
            );
        });
    });
    
    describe('igloo_my_rentals', () => {
        it('should return user igloos when authenticated', async () => {
            const userIgloos = [{ iglooId: 'igloo5', ownerWallet: 'TestWallet123' }];
            iglooService.getUserIgloos.mockResolvedValue(userIgloos);
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_my_rentals' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_my_rentals',
                igloos: userIgloos
            });
        });
        
        it('should return empty for unauthenticated user', async () => {
            const unauthPlayer = createMockPlayer({ isAuthenticated: false, walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, unauthPlayer, 
                { type: 'igloo_my_rentals' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_my_rentals',
                igloos: [],
                error: 'NOT_AUTHENTICATED'
            });
        });
    });
    
    describe('igloo_leave', () => {
        it('should allow owner to leave igloo', async () => {
            iglooService.leaveIgloo.mockResolvedValue({
                success: true,
                message: 'You have left the igloo'
            });
            
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_leave', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.leaveIgloo).toHaveBeenCalledWith('TestWallet123', 'igloo1');
            expect(sendToPlayer).toHaveBeenCalledWith(playerId, {
                type: 'igloo_leave_result',
                success: true,
                message: 'You have left the igloo'
            });
        });
    });
    
    describe('igloo_visit', () => {
        it('should record visit silently', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_visit', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.recordVisit).toHaveBeenCalledWith('TestWallet123', 'igloo1');
            // Should not send response
            expect(sendToPlayer).not.toHaveBeenCalled();
        });
        
        it('should use guest id for unauthenticated users', async () => {
            const guestPlayer = createMockPlayer({ walletAddress: null });
            
            const handled = await handleIglooMessage(
                playerId, guestPlayer, 
                { type: 'igloo_visit', iglooId: 'igloo1' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(true);
            expect(iglooService.recordVisit).toHaveBeenCalledWith(`guest_${playerId}`, 'igloo1');
        });
    });
    
    describe('unhandled messages', () => {
        it('should return false for non-igloo messages', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'chat_message', content: 'Hello' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(false);
        });
        
        it('should return false for unknown igloo message types', async () => {
            const handled = await handleIglooMessage(
                playerId, player, 
                { type: 'igloo_unknown_action' }, 
                sendToPlayer
            );
            
            expect(handled).toBe(false);
        });
    });
});

