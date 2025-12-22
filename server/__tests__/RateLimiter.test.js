/**
 * RateLimiter Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the environment before importing
vi.stubEnv('ENABLE_RATE_LIMITING', 'true');

// Import after mocking
const { RateLimiter, RATE_LIMITS } = await import('../utils/RateLimiter.js');

describe('RateLimiter', () => {
    let rateLimiter;
    
    beforeEach(() => {
        // Create fresh instance for each test
        rateLimiter = new RateLimiter();
        rateLimiter.enabled = true; // Force enable for tests
    });
    
    afterEach(() => {
        rateLimiter.shutdown();
    });
    
    describe('check', () => {
        it('should allow requests within limit', () => {
            const result = rateLimiter.check('balance_check', 'wallet123abc');
            
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(RATE_LIMITS.balance_check.maxRequests - 1);
        });
        
        it('should track request count', () => {
            const wallet = 'walletTrackTest';
            
            // Make several requests
            rateLimiter.check('balance_check', wallet);
            rateLimiter.check('balance_check', wallet);
            const result = rateLimiter.check('balance_check', wallet);
            
            expect(result.remaining).toBe(RATE_LIMITS.balance_check.maxRequests - 3);
        });
        
        it('should block when limit exceeded', () => {
            const wallet = 'walletBlockTest';
            const limit = RATE_LIMITS.balance_check.maxRequests;
            
            // Exhaust the limit
            for (let i = 0; i < limit; i++) {
                rateLimiter.check('balance_check', wallet);
            }
            
            // Next request should be blocked
            const result = rateLimiter.check('balance_check', wallet);
            
            expect(result.allowed).toBe(false);
            expect(result.blocked).toBe(true);
            expect(result.retryAfterMs).toBeGreaterThan(0);
        });
        
        it('should track different wallets separately', () => {
            const wallet1 = 'wallet1separate';
            const wallet2 = 'wallet2separate';
            
            // Make requests for wallet1
            for (let i = 0; i < 5; i++) {
                rateLimiter.check('balance_check', wallet1);
            }
            
            // wallet2 should still have full limit
            const result = rateLimiter.check('balance_check', wallet2);
            expect(result.remaining).toBe(RATE_LIMITS.balance_check.maxRequests - 1);
        });
        
        it('should track different types separately', () => {
            const wallet = 'walletTypeTest';
            
            // Use balance_check limit
            for (let i = 0; i < 5; i++) {
                rateLimiter.check('balance_check', wallet);
            }
            
            // payment type should have separate limit
            const result = rateLimiter.check('payment', wallet);
            expect(result.remaining).toBe(RATE_LIMITS.payment.maxRequests - 1);
        });
        
        it('should allow unknown types', () => {
            const result = rateLimiter.check('unknown_type', 'wallet');
            
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(999);
        });
        
        it('should bypass when disabled', () => {
            rateLimiter.enabled = false;
            
            const result = rateLimiter.check('balance_check', 'wallet');
            
            expect(result.allowed).toBe(true);
            expect(result.disabled).toBe(true);
        });
    });
    
    describe('block', () => {
        it('should manually block an identifier', () => {
            const wallet = 'walletManualBlock';
            
            rateLimiter.block('balance_check', wallet, 60000);
            
            const result = rateLimiter.check('balance_check', wallet);
            expect(result.allowed).toBe(false);
            expect(result.blocked).toBe(true);
        });
    });
    
    describe('unblock', () => {
        it('should unblock a blocked identifier', () => {
            const wallet = 'walletUnblock';
            
            // Block then unblock
            rateLimiter.block('balance_check', wallet);
            rateLimiter.unblock('balance_check', wallet);
            
            const result = rateLimiter.check('balance_check', wallet);
            expect(result.allowed).toBe(true);
        });
    });
    
    describe('getStatus', () => {
        it('should return status for tracked identifier', () => {
            const wallet = 'walletStatusTest';
            
            rateLimiter.check('balance_check', wallet);
            rateLimiter.check('balance_check', wallet);
            
            const status = rateLimiter.getStatus('balance_check', wallet);
            
            expect(status.count).toBe(2);
            expect(status.limit).toBe(RATE_LIMITS.balance_check.maxRequests);
            expect(status.blocked).toBeFalsy(); // Can be false or null/undefined
        });
        
        it('should return default status for untracked identifier', () => {
            const status = rateLimiter.getStatus('balance_check', 'newWallet');
            
            expect(status.count).toBe(0);
            expect(status.blocked).toBe(false);
        });
        
        it('should return null for unknown type', () => {
            const status = rateLimiter.getStatus('unknown', 'wallet');
            expect(status).toBeNull();
        });
    });
    
    describe('getStats', () => {
        it('should return tracking statistics', () => {
            rateLimiter.check('balance_check', 'wallet1');
            rateLimiter.check('payment', 'wallet2');
            
            const stats = rateLimiter.getStats();
            
            expect(stats.totalTracked).toBe(2);
            expect(stats.byType.balance_check).toBe(1);
            expect(stats.byType.payment).toBe(1);
        });
    });
    
    describe('cleanup', () => {
        it('should remove stale entries', () => {
            const wallet = 'walletCleanup';
            
            // Add an entry
            rateLimiter.check('balance_check', wallet);
            expect(rateLimiter.tracking.size).toBe(1);
            
            // Manually expire the entry
            const key = rateLimiter._getKey('balance_check', wallet);
            const entry = rateLimiter.tracking.get(key);
            entry.windowStart = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
            
            // Run cleanup
            rateLimiter.cleanup();
            
            expect(rateLimiter.tracking.size).toBe(0);
        });
    });
});

