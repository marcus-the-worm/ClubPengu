/**
 * InboxService - Player inbox/notification management
 * Handles challenge notifications and system messages
 */

// Message expiry times
const MESSAGE_EXPIRY = {
    challenge: 5 * 60 * 1000,        // 5 minutes for challenges
    challenge_response: 60 * 60 * 1000, // 1 hour for responses
    system: 24 * 60 * 60 * 1000,     // 24 hours for system messages
    default: 24 * 60 * 60 * 1000
};

class InboxService {
    constructor() {
        // In-memory inbox storage
        // Key: playerId, Value: Array of messages
        this.inboxes = new Map();
        
        // Secondary index by wallet for persistent users
        this.walletInboxes = new Map(); // walletAddress -> playerId
    }

    /**
     * Get or create inbox for a player
     */
    getInbox(playerId) {
        if (!this.inboxes.has(playerId)) {
            this.inboxes.set(playerId, []);
        }
        return this.inboxes.get(playerId);
    }

    /**
     * Associate a wallet with a player ID (for persistent users)
     */
    associateWallet(walletAddress, playerId) {
        if (walletAddress) {
            // If there's an existing inbox for this wallet, migrate messages
            const oldPlayerId = this.walletInboxes.get(walletAddress);
            if (oldPlayerId && oldPlayerId !== playerId && this.inboxes.has(oldPlayerId)) {
                const oldMessages = this.inboxes.get(oldPlayerId);
                const newInbox = this.getInbox(playerId);
                newInbox.push(...oldMessages);
                this.inboxes.delete(oldPlayerId);
            }
            this.walletInboxes.set(walletAddress, playerId);
        }
    }

    /**
     * Add a generic message to inbox
     */
    addMessage(playerId, walletAddress, type, title, message, data = {}) {
        const inbox = this.getInbox(playerId);
        const expiry = MESSAGE_EXPIRY[type] || MESSAGE_EXPIRY.default;

        const msg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type,
            title,
            message,
            data,
            read: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + expiry
        };

        inbox.push(msg);
        
        // Associate wallet if provided
        if (walletAddress) {
            this.associateWallet(walletAddress, playerId);
        }

        return msg;
    }

    /**
     * Add a challenge notification
     */
    addChallengeMessage(targetId, targetWallet, challengeId, challengerName, gameType, wagerAmount) {
        const gameNames = {
            'cardJitsu': 'Card Jitsu',
            'ticTacToe': 'Tic Tac Toe',
            'connect4': 'Connect 4',
            'pong': 'Pong'
        };

        const gameName = gameNames[gameType] || gameType;
        const wagerText = wagerAmount > 0 ? ` for ${wagerAmount} coins` : ' (friendly match)';

        return this.addMessage(
            targetId,
            targetWallet,
            'challenge',
            `⚔️ Challenge from ${challengerName}`,
            `${challengerName} challenges you to ${gameName}${wagerText}!`,
            { 
                challengeId, 
                challengerName, 
                gameType, 
                wagerAmount,
                canAccept: true,
                canDecline: true
            }
        );
    }

    /**
     * Get all messages for a player
     */
    getMessages(playerId) {
        const inbox = this.getInbox(playerId);
        const now = Date.now();
        
        // Filter out expired messages and return
        return inbox.filter(msg => msg.expiresAt > now);
    }

    /**
     * Get unread count
     */
    getUnreadCount(playerId) {
        const messages = this.getMessages(playerId);
        return messages.filter(msg => !msg.read).length;
    }

    /**
     * Mark message as read
     */
    markRead(playerId, messageId) {
        const inbox = this.getInbox(playerId);
        const msg = inbox.find(m => m.id === messageId);
        if (msg) {
            msg.read = true;
        }
    }

    /**
     * Delete a message
     */
    deleteMessage(playerId, messageId) {
        const inbox = this.getInbox(playerId);
        const index = inbox.findIndex(m => m.id === messageId);
        if (index !== -1) {
            inbox.splice(index, 1);
        }
    }

    /**
     * Delete all messages for a challenge ID
     */
    deleteByChallengeId(playerId, challengeId) {
        const inbox = this.getInbox(playerId);
        const index = inbox.findIndex(m => m.data?.challengeId === challengeId);
        if (index !== -1) {
            inbox.splice(index, 1);
        }
    }

    /**
     * Clean up expired messages
     */
    cleanupExpired() {
        const now = Date.now();
        let totalCleaned = 0;

        for (const [playerId, inbox] of this.inboxes) {
            const before = inbox.length;
            this.inboxes.set(
                playerId,
                inbox.filter(msg => msg.expiresAt > now)
            );
            totalCleaned += before - this.inboxes.get(playerId).length;
            
            // Remove empty inboxes
            if (this.inboxes.get(playerId).length === 0) {
                this.inboxes.delete(playerId);
            }
        }

        if (totalCleaned > 0) {
            console.log(`📬 Cleaned ${totalCleaned} expired inbox messages`);
        }
    }

    /**
     * Clear inbox for a player (on disconnect/logout)
     */
    clearInbox(playerId) {
        this.inboxes.delete(playerId);
    }
}

export default InboxService;
