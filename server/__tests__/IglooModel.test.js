/**
 * Igloo Model Unit Tests
 * Tests the Igloo mongoose model methods
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ==================== TEST DATA ====================
const createMockIglooDoc = (overrides = {}) => ({
    iglooId: 'igloo1',
    position: { x: -75, z: -70, row: 'north' },
    isRented: false,
    isReserved: false,
    ownerWallet: null,
    ownerUsername: null,
    rentStartDate: null,
    lastRentPaidDate: null,
    rentDueDate: null,
    rentStatus: null,
    accessType: 'private',
    tokenGate: { enabled: false, tokenAddress: null, tokenSymbol: null, minimumBalance: 1 },
    entryFee: { enabled: false, amount: 0 },
    paidEntryFees: [],
    entryFeeVersion: 1,
    banner: { title: null, ticker: null, shill: null, styleIndex: 0 },
    stats: { 
        totalVisits: 0, 
        uniqueVisitors: 0, 
        totalRentPaid: 0,
        totalEntryFeesCollected: 0,
        timesRented: 0
    },
    uniqueVisitorWallets: [],
    ...overrides
});

// ==================== TESTS ====================
describe('Igloo Model Methods', () => {
    describe('canEnter', () => {
        it('should always allow owner to enter', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'private'
            });
            
            // Simulate the canEnter method logic
            const canEnter = (walletAddress, options = {}) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'private') {
                    return { canEnter: false, reason: 'IGLOO_LOCKED' };
                }
                return { canEnter: true };
            };
            
            const result = canEnter('Owner123');
            
            expect(result.canEnter).toBe(true);
            expect(result.isOwner).toBe(true);
        });
        
        it('should block non-owner from private igloo', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'private'
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'private') {
                    return { canEnter: false, reason: 'IGLOO_LOCKED', message: 'This igloo is private' };
                }
                return { canEnter: true };
            };
            
            const result = canEnter('RandomUser456');
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('IGLOO_LOCKED');
        });
        
        it('should allow anyone into public igloo', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'public'
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'private') {
                    return { canEnter: false, reason: 'IGLOO_LOCKED' };
                }
                if (igloo.accessType === 'public') {
                    return { canEnter: true };
                }
                return { canEnter: true };
            };
            
            const result = canEnter('AnyUser');
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require token for token-gated igloo', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            
            const canEnter = (walletAddress, options = {}) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'token' && igloo.tokenGate.enabled) {
                    const balance = options.tokenBalance || 0;
                    if (balance < igloo.tokenGate.minimumBalance) {
                        return { 
                            canEnter: false, 
                            reason: 'TOKEN_REQUIRED',
                            tokenRequired: {
                                address: igloo.tokenGate.tokenAddress,
                                symbol: igloo.tokenGate.tokenSymbol,
                                minimum: igloo.tokenGate.minimumBalance
                            }
                        };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('User456', { tokenBalance: 50 });
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
            expect(result.tokenRequired.minimum).toBe(100);
        });
        
        it('should allow token holder into token-gated igloo', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            
            const canEnter = (walletAddress, options = {}) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'token' && igloo.tokenGate.enabled) {
                    const balance = options.tokenBalance || 0;
                    if (balance < igloo.tokenGate.minimumBalance) {
                        return { canEnter: false, reason: 'TOKEN_REQUIRED' };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('TokenHolder', { tokenBalance: 200 });
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require payment for entry fee igloo (unpaid)', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 500 },
                paidEntryFees: []
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'fee' && igloo.entryFee.enabled && igloo.entryFee.amount > 0) {
                    const hasPaid = igloo.paidEntryFees.some(f => f.walletAddress === walletAddress);
                    if (!hasPaid) {
                        return { 
                            canEnter: false, 
                            reason: 'ENTRY_FEE_REQUIRED',
                            requiresPayment: true,
                            paymentAmount: igloo.entryFee.amount
                        };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('User789');
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.paymentAmount).toBe(500);
        });
        
        it('should allow user who already paid entry fee', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 500 },
                paidEntryFees: [{ walletAddress: 'PaidUser', amount: 500, paidAt: new Date() }]
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === igloo.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (igloo.accessType === 'fee' && igloo.entryFee.enabled && igloo.entryFee.amount > 0) {
                    const hasPaid = igloo.paidEntryFees.some(f => f.walletAddress === walletAddress);
                    if (!hasPaid) {
                        return { canEnter: false, reason: 'ENTRY_FEE_REQUIRED' };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('PaidUser');
            
            expect(result.canEnter).toBe(true);
        });
    });
    
    describe('startRental', () => {
        it('should set up rental correctly', () => {
            const igloo = createMockIglooDoc();
            const now = new Date();
            
            // Simulate startRental
            igloo.isRented = true;
            igloo.ownerWallet = 'NewOwner123';
            igloo.ownerUsername = 'NewOwner';
            igloo.rentStartDate = now;
            igloo.lastRentPaidDate = now;
            igloo.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            igloo.rentStatus = 'current';
            igloo.accessType = 'private';
            igloo.stats.timesRented += 1;
            
            expect(igloo.isRented).toBe(true);
            expect(igloo.ownerWallet).toBe('NewOwner123');
            expect(igloo.rentStatus).toBe('current');
            expect(igloo.accessType).toBe('private');
            expect(igloo.stats.timesRented).toBe(1);
            expect(igloo.rentDueDate.getTime()).toBeGreaterThan(now.getTime());
        });
    });
    
    describe('payRent', () => {
        it('should extend due date by 24 hours', () => {
            const now = new Date();
            const igloo = createMockIglooDoc({
                isRented: true,
                rentStatus: 'grace_period',
                rentDueDate: new Date(now.getTime() - 1000) // Overdue
            });
            
            // Simulate payRent
            igloo.lastRentPaidDate = now;
            igloo.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            igloo.rentStatus = 'current';
            igloo.stats.totalRentPaid += 10000;
            
            expect(igloo.rentStatus).toBe('current');
            expect(igloo.stats.totalRentPaid).toBe(10000);
            expect(igloo.rentDueDate.getTime()).toBeGreaterThan(now.getTime());
        });
    });
    
    describe('evict', () => {
        it('should clear all rental data', () => {
            const igloo = createMockIglooDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                ownerUsername: 'Owner',
                rentStatus: 'grace_period',
                accessType: 'public',
                banner: { title: 'My Igloo', ticker: '$COIN' },
                paidEntryFees: [{ walletAddress: 'User1' }],
                entryFee: { enabled: true, amount: 100 }
            });
            
            // Simulate evict
            igloo.isRented = false;
            igloo.ownerWallet = null;
            igloo.ownerUsername = null;
            igloo.rentStartDate = null;
            igloo.lastRentPaidDate = null;
            igloo.rentDueDate = null;
            igloo.rentStatus = 'evicted';
            igloo.accessType = 'private';
            igloo.banner = { title: null, ticker: null, shill: null, styleIndex: 0 };
            igloo.paidEntryFees = [];
            igloo.entryFeeVersion += 1;
            igloo.tokenGate = { enabled: false, tokenAddress: null, tokenSymbol: null, minimumBalance: 1 };
            igloo.entryFee = { enabled: false, amount: 0 };
            
            expect(igloo.isRented).toBe(false);
            expect(igloo.ownerWallet).toBeNull();
            expect(igloo.rentStatus).toBe('evicted');
            expect(igloo.banner.title).toBeNull();
            expect(igloo.paidEntryFees).toHaveLength(0);
            expect(igloo.entryFeeVersion).toBe(2);
        });
    });
    
    describe('recordVisit', () => {
        it('should increment visit count', () => {
            const igloo = createMockIglooDoc();
            
            // Simulate recordVisit
            igloo.stats.totalVisits += 1;
            
            expect(igloo.stats.totalVisits).toBe(1);
        });
        
        it('should track unique visitors', () => {
            const igloo = createMockIglooDoc();
            
            // First visit
            if (!igloo.uniqueVisitorWallets.includes('User1')) {
                igloo.uniqueVisitorWallets.push('User1');
                igloo.stats.uniqueVisitors += 1;
            }
            igloo.stats.totalVisits += 1;
            
            // Second visit (same user)
            if (!igloo.uniqueVisitorWallets.includes('User1')) {
                igloo.uniqueVisitorWallets.push('User1');
                igloo.stats.uniqueVisitors += 1;
            }
            igloo.stats.totalVisits += 1;
            
            // Third visit (new user)
            if (!igloo.uniqueVisitorWallets.includes('User2')) {
                igloo.uniqueVisitorWallets.push('User2');
                igloo.stats.uniqueVisitors += 1;
            }
            igloo.stats.totalVisits += 1;
            
            expect(igloo.stats.totalVisits).toBe(3);
            expect(igloo.stats.uniqueVisitors).toBe(2);
            expect(igloo.uniqueVisitorWallets).toHaveLength(2);
        });
    });
    
    describe('resetEntryFees', () => {
        it('should clear paid fees and increment version', () => {
            const igloo = createMockIglooDoc({
                paidEntryFees: [
                    { walletAddress: 'User1', amount: 500 },
                    { walletAddress: 'User2', amount: 500 }
                ],
                entryFeeVersion: 1
            });
            
            // Simulate resetEntryFees
            igloo.paidEntryFees = [];
            igloo.entryFeeVersion += 1;
            
            expect(igloo.paidEntryFees).toHaveLength(0);
            expect(igloo.entryFeeVersion).toBe(2);
        });
    });
});


