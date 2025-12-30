/**
 * IglooContext Unit Tests
 * Tests client-side igloo state management
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock send function
const mockSend = vi.fn();

// Create a mock WebSocket with event listener support
const createMockWebSocket = () => {
    const listeners = {};
    return {
        addEventListener: vi.fn((type, callback) => {
            if (!listeners[type]) listeners[type] = [];
            listeners[type].push(callback);
        }),
        removeEventListener: vi.fn((type, callback) => {
            if (listeners[type]) {
                listeners[type] = listeners[type].filter(cb => cb !== callback);
            }
        }),
        dispatchEvent: (event) => {
            const type = event.type || 'message';
            if (listeners[type]) {
                listeners[type].forEach(cb => cb(event));
            }
        },
        // Helper to simulate server message
        simulateMessage: (msg) => {
            const event = { data: JSON.stringify(msg) };
            if (listeners['message']) {
                listeners['message'].forEach(cb => cb(event));
            }
        }
    };
};

let mockWs = createMockWebSocket();

// Mock MultiplayerContext
vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: mockSend,
        connected: true,
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
        RESERVED_IGLOO_IDS: ['igloo3', 'igloo8'],
        RENTABLE_IGLOOS: ['igloo1', 'igloo2', 'igloo4', 'igloo5', 'igloo6', 'igloo7', 'igloo9', 'igloo10']
    }
}));

import { IglooProvider, useIgloo } from '../igloo/IglooContext.jsx';

// ==================== HELPER ====================
const wrapper = ({ children }) => <IglooProvider>{children}</IglooProvider>;

// ==================== TESTS ====================
describe('IglooContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock WebSocket
        mockWs = createMockWebSocket();
        window.__multiplayerWs = mockWs;
    });
    
    afterEach(() => {
        delete window.__multiplayerWs;
    });
    
    describe('initialization', () => {
        it('should request igloo list on mount', async () => {
            renderHook(() => useIgloo(), { wrapper });
            
            // Wait for the useEffect to run
            await waitFor(() => {
                expect(mockSend).toHaveBeenCalledWith({ type: 'igloo_list' });
            });
        });
        
        it('should request user rentals when authenticated', async () => {
            renderHook(() => useIgloo(), { wrapper });
            
            await waitFor(() => {
                expect(mockSend).toHaveBeenCalledWith({ type: 'igloo_my_rentals' });
            });
        });
    });
    
    describe('igloos state', () => {
        it('should update igloos when server responds', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            // Wait for WebSocket to be set up
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            // Simulate server response
            act(() => {
                mockWs.simulateMessage({
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
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'igloo_my_rentals',
                    igloos: [{ iglooId: 'igloo5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            expect(result.current.isOwner('igloo1')).toBe(false);
        });
        
        it('should return true when wallet matches igloo owner in igloos list', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'igloo_list',
                    igloos: [{ iglooId: 'igloo3', ownerWallet: 'TestWallet123' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.igloos).toHaveLength(1);
            });
            
            // Should return true because walletAddress matches ownerWallet
            expect(result.current.isOwner('igloo3')).toBe(true);
        });
    });
    
    describe('openRentalModal', () => {
        it('should set selected igloo and request can_rent', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
        it('should show requirements panel when entry is blocked', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
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
                expect(result.current.showRequirementsPanel).toBe(true);
            });
            expect(result.current.entryCheckResult.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.current.entryCheckResult.paymentAmount).toBe(500);
        });
        
        it('should not show modal when entry is allowed', async () => {
            const { result } = renderHook(() => useIgloo(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'igloo_can_enter',
                    iglooId: 'igloo1',
                    igloo: { iglooId: 'igloo1' },
                    canEnter: true,
                    isOwner: false
                });
            });
            
            // Wait a tick for any potential state updates
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Should not show requirements panel when entry is allowed
            expect(result.current.showRequirementsPanel).toBe(false);
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
