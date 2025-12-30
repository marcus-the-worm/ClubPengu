/**
 * Wallet Module Index Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock window.solana for PhantomWallet
beforeEach(() => {
    global.window = {
        solana: { isPhantom: true },
        location: { href: 'http://localhost' }
    };
    global.navigator = { userAgent: 'test' };
});

describe('Wallet Module Exports', () => {
    it('should export PhantomWallet', async () => {
        const module = await import('../wallet/index.js');
        expect(module.PhantomWallet).toBeDefined();
    });
    
    it('should export X402Service', async () => {
        const module = await import('../wallet/index.js');
        expect(module.X402Service).toBeDefined();
    });
});

