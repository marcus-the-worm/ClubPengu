/**
 * X402Service - Server-side x402 payment verification and settlement
 * Handles all interactions with the x402 facilitator
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Connection, PublicKey } from '@solana/web3.js';

// ==================== CONFIGURATION ====================
const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_NETWORK_ID = process.env.SOLANA_NETWORK || 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// Token addresses (should match client config)
const CPW3_TOKEN_ADDRESS = process.env.CPW3_TOKEN_ADDRESS;
const RENT_WALLET_ADDRESS = process.env.RENT_WALLET_ADDRESS;

// Validate required env vars on startup
if (!CPW3_TOKEN_ADDRESS) {
    console.warn('⚠️ X402Service: CPW3_TOKEN_ADDRESS not set - balance checks will fail in production');
}
if (!RENT_WALLET_ADDRESS) {
    console.warn('⚠️ X402Service: RENT_WALLET_ADDRESS not set - rent payments will fail');
}

class X402Service {
    constructor() {
        this.facilitatorUrl = X402_FACILITATOR_URL;
        this.networkId = SOLANA_NETWORK_ID;
        this.connection = null;
        this.connectionInitialized = false;
        
        // Initialize Solana connection lazily
        this._initConnection();
    }
    
    /**
     * Initialize Solana RPC connection
     */
    _initConnection() {
        try {
            this.connection = new Connection(SOLANA_RPC_URL, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            });
            this.connectionInitialized = true;
            console.log(`🔗 X402Service: Connected to Solana RPC (${SOLANA_RPC_URL.includes('mainnet') ? 'mainnet' : 'devnet'})`);
        } catch (error) {
            console.error('🔗 X402Service: Failed to initialize Solana connection:', error);
            this.connectionInitialized = false;
        }
    }
    
    /**
     * Decode and parse a payment payload
     * @param {string} encodedPayload - Base64 encoded payload from client
     * @returns {Object|null}
     */
    decodePayload(encodedPayload) {
        try {
            const decoded = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf8'));
            return decoded;
        } catch (error) {
            console.error('x402: Failed to decode payload:', error);
            return null;
        }
    }
    
    /**
     * Verify a payment payload locally (signature check)
     * This is a quick local verification before hitting the facilitator
     * 
     * @param {string} encodedPayload - Base64 encoded payload
     * @returns {Object} { valid: boolean, payload?: Object, error?: string }
     */
    async verifyPayloadLocal(encodedPayload) {
        const payload = this.decodePayload(encodedPayload);
        
        if (!payload) {
            return { valid: false, error: 'INVALID_PAYLOAD', message: 'Could not decode payload' };
        }
        
        // Check expiry
        if (Date.now() > payload.validUntil) {
            return { valid: false, error: 'PAYLOAD_EXPIRED', message: 'Payment authorization has expired' };
        }
        
        // Check network
        if (payload.network !== this.networkId) {
            return { valid: false, error: 'WRONG_NETWORK', message: 'Payment is for wrong network' };
        }
        
        // Verify signature
        try {
            const { signature, ...intentData } = payload;
            const message = JSON.stringify(intentData);
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = bs58.decode(signature);
            const publicKeyBytes = bs58.decode(payload.payer);
            
            const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
            
            if (!isValid) {
                return { valid: false, error: 'INVALID_SIGNATURE', message: 'Signature verification failed' };
            }
            
            return { valid: true, payload };
            
        } catch (error) {
            console.error('x402: Signature verification error:', error);
            return { valid: false, error: 'VERIFICATION_ERROR', message: 'Could not verify signature' };
        }
    }
    
    /**
     * Verify a payment payload with the facilitator
     * This is the authoritative verification
     * 
     * @param {string} encodedPayload - Base64 encoded payload
     * @param {Object} expectedDetails - Expected payment details to validate
     * @returns {Promise<Object>} { valid: boolean, error?: string }
     */
    async verifyPayload(encodedPayload, expectedDetails = {}) {
        // First do local verification
        const localResult = await this.verifyPayloadLocal(encodedPayload);
        if (!localResult.valid) {
            return localResult;
        }
        
        const payload = localResult.payload;
        
        // Validate expected details
        if (expectedDetails.amount && BigInt(payload.amount) < BigInt(expectedDetails.amount)) {
            return { valid: false, error: 'INSUFFICIENT_AMOUNT', message: 'Payment amount is less than required' };
        }
        
        if (expectedDetails.recipient && payload.recipient !== expectedDetails.recipient) {
            return { valid: false, error: 'WRONG_RECIPIENT', message: 'Payment is to wrong recipient' };
        }
        
        if (expectedDetails.token && payload.token !== expectedDetails.token) {
            return { valid: false, error: 'WRONG_TOKEN', message: 'Payment is with wrong token' };
        }
        
        // For production, verify with facilitator
        if (process.env.NODE_ENV === 'production') {
            try {
                const response = await fetch(`${this.facilitatorUrl}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paymentPayload: encodedPayload,
                        paymentDetails: {
                            amount: expectedDetails.amount,
                            networkId: this.networkId,
                            token: expectedDetails.token || CPW3_TOKEN_ADDRESS
                        }
                    })
                });
                
                const result = await response.json();
                
                if (!result.valid) {
                    return { valid: false, error: result.error || 'FACILITATOR_REJECTED', message: result.message };
                }
                
            } catch (error) {
                console.error('x402: Facilitator verification error:', error);
                // In production, fail closed if facilitator is unreachable
                return { valid: false, error: 'FACILITATOR_ERROR', message: 'Could not verify with payment facilitator' };
            }
        }
        
        return { valid: true, payload };
    }
    
    /**
     * Settle a payment (execute the transfer)
     * This should only be called when the condition is met (e.g., rent due, game won)
     * 
     * @param {string} encodedPayload - Base64 encoded payload
     * @returns {Promise<Object>} { success: boolean, transactionHash?: string, error?: string }
     */
    async settlePayment(encodedPayload) {
        // First verify the payload is still valid
        const verification = await this.verifyPayloadLocal(encodedPayload);
        if (!verification.valid) {
            return { success: false, error: verification.error, message: verification.message };
        }
        
        try {
            const response = await fetch(`${this.facilitatorUrl}/settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentPayload: encodedPayload })
            });
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('x402: Settlement failed:', result);
                return { 
                    success: false, 
                    error: result.error || 'SETTLEMENT_FAILED', 
                    message: result.message || 'Payment settlement failed' 
                };
            }
            
            console.log(`x402: Payment settled, tx: ${result.transaction}`);
            
            return {
                success: true,
                transactionHash: result.transaction,
                payload: verification.payload
            };
            
        } catch (error) {
            console.error('x402: Settlement error:', error);
            return { 
                success: false, 
                error: 'SETTLEMENT_ERROR', 
                message: 'Could not complete payment settlement' 
            };
        }
    }
    
    /**
     * Verify that a wallet has sufficient token balance
     * @param {string} walletAddress - Wallet to check
     * @param {string} tokenAddress - Token contract address (mint)
     * @param {number} minimumBalance - Required minimum balance (in base units)
     * @returns {Promise<Object>} { hasBalance: boolean, currentBalance: number }
     */
    async checkTokenBalance(walletAddress, tokenAddress, minimumBalance) {
        // In development without proper config, allow for testing
        if (process.env.NODE_ENV !== 'production' && !CPW3_TOKEN_ADDRESS) {
            console.log(`x402: DEV MODE - Skipping balance check for ${walletAddress.slice(0, 8)}...`);
            return { hasBalance: true, currentBalance: minimumBalance * 2, devMode: true };
        }
        
        if (!this.connectionInitialized || !this.connection) {
            console.error('x402: Solana connection not initialized');
            return { hasBalance: false, currentBalance: 0, error: 'RPC_NOT_INITIALIZED' };
        }
        
        if (!tokenAddress) {
            console.error('x402: Token address not configured');
            return { hasBalance: false, currentBalance: 0, error: 'TOKEN_NOT_CONFIGURED' };
        }
        
        try {
            const walletPubkey = new PublicKey(walletAddress);
            const mintPubkey = new PublicKey(tokenAddress);
            
            // Get all token accounts for this wallet that hold this specific token
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
                walletPubkey,
                { mint: mintPubkey }
            );
            
            // Sum up balance from all token accounts (usually just 1)
            let totalBalance = 0;
            for (const account of tokenAccounts.value) {
                const parsedInfo = account.account.data.parsed?.info;
                if (parsedInfo?.tokenAmount?.uiAmount !== undefined) {
                    // uiAmount is the human-readable amount (already adjusted for decimals)
                    totalBalance += parsedInfo.tokenAmount.amount; // Use raw amount for comparison
                }
            }
            
            const hasBalance = BigInt(totalBalance) >= BigInt(minimumBalance);
            
            console.log(`x402: Balance check for ${walletAddress.slice(0, 8)}... - ${totalBalance} / ${minimumBalance} required (${hasBalance ? '✓' : '✗'})`);
            
            return { 
                hasBalance, 
                currentBalance: Number(totalBalance),
                required: minimumBalance
            };
            
        } catch (error) {
            console.error('x402: Token balance check error:', error.message);
            
            // In dev, allow through on RPC errors
            if (process.env.NODE_ENV !== 'production') {
                console.log('x402: DEV MODE - Allowing balance check despite RPC error');
                return { hasBalance: true, currentBalance: minimumBalance * 2, devMode: true, rpcError: error.message };
            }
            
            return { hasBalance: false, currentBalance: 0, error: error.message };
        }
    }
    
    /**
     * Check if wallet has minimum CPw3 balance for renting
     * @param {string} walletAddress - Wallet to check
     * @param {number} minimumBalance - Required CPw3 balance
     * @returns {Promise<Object>}
     */
    async checkRentEligibility(walletAddress, minimumBalance) {
        return this.checkTokenBalance(walletAddress, CPW3_TOKEN_ADDRESS, minimumBalance);
    }
}

// Export singleton instance
const x402Service = new X402Service();
export default x402Service;

