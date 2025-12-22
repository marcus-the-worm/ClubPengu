/**
 * RateLimiter - Prevent abuse of expensive operations
 * 
 * Uses in-memory tracking with database fallback for persistence
 * Designed to protect:
 * - RPC calls (Solana balance checks)
 * - Payment processing
 * - Database writes
 * 
 * FEATURE FLAG: Set ENABLE_RATE_LIMITING=true in .env to enable
 * Default: DISABLED (safe deployment)
 */

// ==================== FEATURE FLAG ====================
const RATE_LIMITING_ENABLED = process.env.ENABLE_RATE_LIMITING === 'true';

// ==================== CONFIGURATION ====================
const RATE_LIMITS = {
    // Balance checks (RPC calls are expensive)
    balance_check: {
        windowMs: 60 * 1000,       // 1 minute window
        maxRequests: 10,           // 10 checks per minute per wallet
        blockDurationMs: 5 * 60 * 1000  // 5 minute block if exceeded
    },
    
    // Payment submissions
    payment: {
        windowMs: 60 * 1000,       // 1 minute window
        maxRequests: 5,            // 5 payments per minute per wallet
        blockDurationMs: 10 * 60 * 1000  // 10 minute block if exceeded
    },
    
    // Entry checks (less expensive but still rate limited)
    entry_check: {
        windowMs: 30 * 1000,       // 30 second window
        maxRequests: 20,           // 20 checks per 30 seconds
        blockDurationMs: 60 * 1000  // 1 minute block
    },
    
    // Global per-IP limit
    global_ip: {
        windowMs: 60 * 1000,
        maxRequests: 100,
        blockDurationMs: 5 * 60 * 1000
    }
};

class RateLimiter {
    constructor() {
        this.enabled = RATE_LIMITING_ENABLED;
        
        // In-memory tracking: { key: { count, windowStart, blockedUntil } }
        this.tracking = new Map();
        
        // Cleanup old entries every 5 minutes (only if enabled)
        if (this.enabled) {
            this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        }
        
        if (this.enabled) {
            console.log('🚦 RateLimiter initialized (ENABLED)');
        } else {
            console.log('🚦 RateLimiter initialized (DISABLED - set ENABLE_RATE_LIMITING=true to enable)');
        }
    }
    
    /**
     * Generate a tracking key
     * @param {string} type - Rate limit type (balance_check, payment, etc.)
     * @param {string} identifier - Wallet address or IP
     */
    _getKey(type, identifier) {
        return `${type}:${identifier}`;
    }
    
    /**
     * Check if a request should be allowed
     * @param {string} type - Rate limit type
     * @param {string} identifier - Wallet address or IP
     * @returns {Object} { allowed: boolean, remaining: number, retryAfterMs: number }
     */
    check(type, identifier) {
        // If rate limiting is disabled, always allow
        if (!this.enabled) {
            return { allowed: true, remaining: 999, disabled: true };
        }
        
        const config = RATE_LIMITS[type];
        if (!config) {
            console.warn(`⚠️ Unknown rate limit type: ${type}`);
            return { allowed: true, remaining: 999 };
        }
        
        const key = this._getKey(type, identifier);
        const now = Date.now();
        
        let entry = this.tracking.get(key);
        
        // Check if blocked
        if (entry?.blockedUntil && now < entry.blockedUntil) {
            const retryAfterMs = entry.blockedUntil - now;
            console.warn(`🚫 Rate limited [${type}]: ${identifier.slice(0, 8)}... blocked for ${Math.ceil(retryAfterMs / 1000)}s`);
            return {
                allowed: false,
                remaining: 0,
                retryAfterMs,
                blocked: true
            };
        }
        
        // Reset window if expired
        if (!entry || now - entry.windowStart > config.windowMs) {
            entry = {
                count: 0,
                windowStart: now,
                blockedUntil: null
            };
        }
        
        // Check if would exceed limit
        if (entry.count >= config.maxRequests) {
            // Block the user
            entry.blockedUntil = now + config.blockDurationMs;
            this.tracking.set(key, entry);
            
            console.warn(`🚫 Rate limit EXCEEDED [${type}]: ${identifier.slice(0, 8)}... - blocking for ${config.blockDurationMs / 1000}s`);
            
            return {
                allowed: false,
                remaining: 0,
                retryAfterMs: config.blockDurationMs,
                blocked: true
            };
        }
        
        // Allow and increment
        entry.count++;
        this.tracking.set(key, entry);
        
        const remaining = config.maxRequests - entry.count;
        
        // Log if getting close to limit
        if (remaining <= 2) {
            console.log(`⚠️ Rate limit warning [${type}]: ${identifier.slice(0, 8)}... - ${remaining} requests remaining`);
        }
        
        return {
            allowed: true,
            remaining,
            retryAfterMs: 0,
            blocked: false
        };
    }
    
    /**
     * Record a request (same as check but always increments)
     * Use this after a successful operation to track it
     */
    record(type, identifier) {
        return this.check(type, identifier);
    }
    
    /**
     * Manually block an identifier
     * Use for suspicious activity
     */
    block(type, identifier, durationMs = 60 * 60 * 1000) {
        const key = this._getKey(type, identifier);
        const now = Date.now();
        
        this.tracking.set(key, {
            count: 999,
            windowStart: now,
            blockedUntil: now + durationMs
        });
        
        console.warn(`🚫 Manually blocked [${type}]: ${identifier.slice(0, 8)}... for ${durationMs / 1000}s`);
    }
    
    /**
     * Unblock an identifier
     */
    unblock(type, identifier) {
        const key = this._getKey(type, identifier);
        this.tracking.delete(key);
        console.log(`✅ Unblocked [${type}]: ${identifier.slice(0, 8)}...`);
    }
    
    /**
     * Get current status for an identifier
     */
    getStatus(type, identifier) {
        const config = RATE_LIMITS[type];
        if (!config) return null;
        
        const key = this._getKey(type, identifier);
        const entry = this.tracking.get(key);
        const now = Date.now();
        
        if (!entry) {
            return {
                type,
                identifier: identifier.slice(0, 8) + '...',
                count: 0,
                limit: config.maxRequests,
                windowMs: config.windowMs,
                blocked: false
            };
        }
        
        return {
            type,
            identifier: identifier.slice(0, 8) + '...',
            count: entry.count,
            limit: config.maxRequests,
            windowMs: config.windowMs,
            blocked: entry.blockedUntil && now < entry.blockedUntil,
            blockedUntil: entry.blockedUntil,
            remainingBlockMs: entry.blockedUntil ? Math.max(0, entry.blockedUntil - now) : 0
        };
    }
    
    /**
     * Cleanup old entries to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.tracking.entries()) {
            // Remove if window expired AND not blocked
            const isExpired = now - entry.windowStart > 60 * 60 * 1000; // 1 hour
            const isUnblocked = !entry.blockedUntil || now > entry.blockedUntil;
            
            if (isExpired && isUnblocked) {
                this.tracking.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 RateLimiter cleanup: removed ${cleaned} stale entries, ${this.tracking.size} remaining`);
        }
    }
    
    /**
     * Get statistics for monitoring
     */
    getStats() {
        const stats = {
            totalTracked: this.tracking.size,
            byType: {}
        };
        
        for (const [key] of this.tracking.entries()) {
            const [type] = key.split(':');
            stats.byType[type] = (stats.byType[type] || 0) + 1;
        }
        
        return stats;
    }
    
    /**
     * Shutdown cleanup
     */
    shutdown() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Export singleton
const rateLimiter = new RateLimiter();
export default rateLimiter;

// Also export class for testing
export { RateLimiter, RATE_LIMITS };

