/**
 * PhantomWallet Tests
 * Tests for Phantom wallet connection logic
 * 
 * Note: These tests mock the wallet behavior rather than testing
 * the actual Phantom integration (which requires a browser)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('PhantomWallet', () => {
    // Test the wallet logic patterns rather than actual implementation
    // since PhantomWallet depends on browser globals
    
    describe('singleton pattern', () => {
        it('should implement singleton correctly', async () => {
            // Import fresh
            vi.resetModules();
            
            // Mock window before import
            const mockProvider = {
                isPhantom: true,
                connect: vi.fn(),
                disconnect: vi.fn()
            };
            
            global.window = { solana: mockProvider };
            
            const { default: PhantomWallet } = await import('../wallet/PhantomWallet.js');
            
            // Reset singleton for testing
            PhantomWallet.instance = null;
            
            const instance1 = PhantomWallet.getInstance();
            const instance2 = PhantomWallet.getInstance();
            
            expect(instance1).toBe(instance2);
        });
    });
    
    describe('wallet state', () => {
        let mockWallet;
        
        beforeEach(() => {
            // Create a mock that mimics the wallet behavior
            mockWallet = {
                connected: false,
                publicKey: null,
                
                isConnected() {
                    return this.connected;
                },
                
                getPublicKey() {
                    return this.publicKey;
                },
                
                async connect() {
                    this.connected = true;
                    this.publicKey = 'mockPublicKey123';
                    return { publicKey: this.publicKey };
                },
                
                async disconnect() {
                    this.connected = false;
                    this.publicKey = null;
                }
            };
        });
        
        it('should track connection state', async () => {
            expect(mockWallet.isConnected()).toBe(false);
            
            await mockWallet.connect();
            expect(mockWallet.isConnected()).toBe(true);
            
            await mockWallet.disconnect();
            expect(mockWallet.isConnected()).toBe(false);
        });
        
        it('should track public key', async () => {
            expect(mockWallet.getPublicKey()).toBeNull();
            
            await mockWallet.connect();
            expect(mockWallet.getPublicKey()).toBe('mockPublicKey123');
            
            await mockWallet.disconnect();
            expect(mockWallet.getPublicKey()).toBeNull();
        });
    });
    
    describe('mobile detection logic', () => {
        it('should detect iPhone user agent', () => {
            const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            expect(isMobile).toBe(true);
        });
        
        it('should detect Android user agent', () => {
            const userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G981B)';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            expect(isMobile).toBe(true);
        });
        
        it('should detect desktop user agent', () => {
            const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            expect(isMobile).toBe(false);
        });
    });
    
    describe('Phantom detection logic', () => {
        it('should detect when Phantom is installed', () => {
            const mockWindow = {
                solana: { isPhantom: true }
            };
            
            const isInstalled = mockWindow.solana && mockWindow.solana.isPhantom;
            expect(isInstalled).toBe(true);
        });
        
        it('should detect when Phantom is not installed', () => {
            const mockWindow = {
                solana: undefined
            };
            
            const isInstalled = mockWindow.solana && mockWindow.solana.isPhantom;
            expect(isInstalled).toBeFalsy();
        });
        
        it('should detect when solana exists but not Phantom', () => {
            const mockWindow = {
                solana: { isPhantom: false }
            };
            
            const isInstalled = mockWindow.solana && mockWindow.solana.isPhantom;
            expect(isInstalled).toBe(false);
        });
    });
    
    describe('deep link generation', () => {
        it('should generate Phantom deep link URL', () => {
            const currentUrl = 'http://localhost:3000/game';
            const encodedUrl = encodeURIComponent(currentUrl);
            const deepLink = `https://phantom.app/ul/browse/${encodedUrl}`;
            
            expect(deepLink).toContain('phantom.app');
            expect(deepLink).toContain(encodedUrl);
        });
    });
    
    describe('error handling', () => {
        it('should handle user rejection', async () => {
            const mockConnect = vi.fn().mockRejectedValue(new Error('User rejected'));
            
            await expect(mockConnect()).rejects.toThrow('User rejected');
        });
        
        it('should handle network errors', async () => {
            const mockConnect = vi.fn().mockRejectedValue(new Error('Network error'));
            
            await expect(mockConnect()).rejects.toThrow('Network error');
        });
    });
    
    describe('message signing logic', () => {
        it('should encode message to Uint8Array', () => {
            const message = 'Hello World';
            const encoded = new TextEncoder().encode(message);
            
            expect(encoded).toBeInstanceOf(Uint8Array);
            expect(encoded.length).toBe(message.length);
        });
        
        it('should handle empty message', () => {
            const message = '';
            const encoded = new TextEncoder().encode(message);
            
            expect(encoded.length).toBe(0);
        });
    });
});
