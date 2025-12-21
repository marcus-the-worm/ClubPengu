/**
 * IglooContext Unit Tests
 * Tests client-side igloo state management
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock MultiplayerContext
const mockSend = vi.fn();
let messageCallback = null;

vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: mockSend,
        onMessage: (callback) => {
            messageCallback = callback;
            return () => { messageCallback = null; };
        },
        isAuthenticated: true,
        walletAddress: 'TestWallet123'
    })
}));

// Mock config
vi.mock('../config/solana.js', () => ({
    IGLOO_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12,
        RESERVED_IGLOOS: {
            'igloo3': { owner: 'SKNY', ownerName: 'SKNY GANG' },
            'igloo8': { owner: 'REGEN', ownerName: 'REGEN' }
        },
        RENTABLE_IGLOOS: ['igloo1', 'igloo2', 'igloo4', 'igloo5', 'igloo6', 'igloo7', 'igloo9', 'igloo10']
    }
}));

import { IglooProvider, useIgloo } from '../igloo/IglooContext.jsx';

// ==================== HELPER ====================
const wrapper = ({ children }) => <IglooProvider>{children}</IglooProvider>;

// Helper to simulate server message
const simulateServerMessage = (msg) => {
    if (messageCallback) {
        messageCallback(msg);
    }
};

// ==================== TESTS ====================
describe('IglooContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        messageCallback = null;
    });
    
    describe('initialization', () => {
        it('should request igloo list on mount', () => {
            renderHook(() => useIgloo(), { wrapper });
            
            expect(mockSend).toHaveBeenCalledWith({ type: 'igloo_list' });
        });
        
        it('should request user rentals when authenticated', () => {
            renderHook(() => useIgloo(), { wrapper });
            
            expect(mockSend).toHaveBeenCalledWith({ type: 'igloo_my_rentals' });
        });
    });
    
    describe('igloos state', () => {
        it('should update igloos when server responds', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            // Simulate server response
            act(() => {
                simulateServerMessage({
                    type: 'igloo_list',
                    igloos: [
                        { iglooId: 'igloo1', isRented: false },
                        { iglooId: 'igloo2', isRented: true, ownerUsername: 'TestOwner' }
                    ]
                });
            });
            
            await waitFor(() => {
                expect(result.current.igloos).toHaveLength(2);
            });
            expect(result.current.igloos[0].iglooId).toBe('igloo1');
        });
        
        it('should update myRentals when server responds', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_my_rentals',
                    igloos: [
                        { iglooId: 'igloo5', ownerWallet: 'TestWallet123' }
                    ]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            expect(result.current.myRentals[0].iglooId).toBe('igloo5');
        });
    });
    
    describe('getIgloo', () => {
        it('should return igloo by id', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_list',
                    igloos: [
                        { iglooId: 'igloo1', isRented: false },
                        { iglooId: 'igloo2', isRented: true }
                    ]
                });
            });
            
            await waitFor(() => {
                expect(result.current.igloos).toHaveLength(2);
            });
            
            const igloo = result.current.getIgloo('igloo2');
            
            expect(igloo).toBeDefined();
            expect(igloo.iglooId).toBe('igloo2');
            expect(igloo.isRented).toBe(true);
        });
        
        it('should return undefined for non-existent igloo', () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            const igloo = result.current.getIgloo('igloo99');
            
            expect(igloo).toBeUndefined();
        });
    });
    
    describe('isOwner', () => {
        it('should return true when user owns igloo', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_my_rentals',
                    igloos: [{ iglooId: 'igloo5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            expect(result.current.isOwner('igloo5')).toBe(true);
        });
        
        it('should return false when user does not own igloo', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_my_rentals',
                    igloos: [{ iglooId: 'igloo5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            expect(result.current.isOwner('igloo1')).toBe(false);
        });
    });
    
    describe('openRentalModal', () => {
        it('should set selected igloo and request can_rent', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_list',
                    igloos: [{ iglooId: 'igloo1', isRented: false }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.igloos).toHaveLength(1);
            });
            
            act(() => {
                result.current.openRentalModal('igloo1');
            });
            
            expect(result.current.showRentalModal).toBe(true);
            expect(mockSend).toHaveBeenCalledWith({ type: 'igloo_can_rent', iglooId: 'igloo1' });
        });
    });
    
    describe('openSettingsPanel', () => {
        it('should set selected igloo and request owner_info', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_my_rentals',
                    igloos: [{ iglooId: 'igloo5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            act(() => {
                result.current.openSettingsPanel('igloo5');
            });
            
            expect(result.current.showSettingsPanel).toBe(true);
            expect(mockSend).toHaveBeenCalledWith({ type: 'igloo_owner_info', iglooId: 'igloo5' });
        });
    });
    
    describe('updateSettings', () => {
        it('should send settings update to server', () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                result.current.updateSettings('igloo5', {
                    accessType: 'public',
                    banner: { title: 'My Igloo' }
                });
            });
            
            expect(mockSend).toHaveBeenCalledWith({
                type: 'igloo_update_settings',
                iglooId: 'igloo5',
                settings: {
                    accessType: 'public',
                    banner: { title: 'My Igloo' }
                }
            });
        });
    });
    
    describe('getBannerInfo', () => {
        it('should return banner info for igloo', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_list',
                    igloos: [{
                        iglooId: 'igloo1',
                        isRented: true,
                        ownerUsername: 'CoolOwner',
                        accessType: 'public',
                        banner: { title: 'Cool Igloo', ticker: '$COOL' },
                        hasEntryFee: false,
                        hasTokenGate: false
                    }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.igloos).toHaveLength(1);
            });
            
            const bannerInfo = result.current.getBannerInfo('igloo1');
            
            expect(bannerInfo).toBeDefined();
            expect(bannerInfo.title).toBe('Cool Igloo');
            expect(bannerInfo.ticker).toBe('$COOL');
            expect(bannerInfo.ownerUsername).toBe('CoolOwner');
            expect(bannerInfo.accessType).toBe('public');
        });
        
        it('should return null for non-existent igloo', () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            const bannerInfo = result.current.getBannerInfo('igloo99');
            
            expect(bannerInfo).toBeNull();
        });
    });
    
    describe('entry check flow', () => {
        it('should show entry modal when entry is blocked', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_can_enter',
                    iglooId: 'igloo7',
                    igloo: { iglooId: 'igloo7', ownerUsername: 'SomeOwner' },
                    canEnter: false,
                    reason: 'ENTRY_FEE_REQUIRED',
                    requiresPayment: true,
                    paymentAmount: 500,
                    isOwner: false
                });
            });
            
            await waitFor(() => {
                expect(result.current.showEntryModal).toBe(true);
            });
            expect(result.current.entryCheckResult.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.current.entryCheckResult.paymentAmount).toBe(500);
        });
        
        it('should not show modal when entry is allowed', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            act(() => {
                simulateServerMessage({
                    type: 'igloo_can_enter',
                    iglooId: 'igloo1',
                    igloo: { iglooId: 'igloo1' },
                    canEnter: true,
                    isOwner: false
                });
            });
            
            // Wait a tick for any potential state updates
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(result.current.showEntryModal).toBe(false);
        });
    });
    
    describe('config', () => {
        it('should expose igloo config', () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            expect(result.current.config).toBeDefined();
            expect(result.current.config.DAILY_RENT_CPW3).toBe(10000);
            expect(result.current.config.MINIMUM_BALANCE_CPW3).toBe(70000);
            expect(result.current.config.GRACE_PERIOD_HOURS).toBe(12);
        });
    });
});
