/**
 * P2P Tipping WebSocket Message Handlers
 * Uses x402 protocol for USDC transfers between players
 */

import tippingService from '../services/TippingService.js';

/**
 * Handle tipping-related messages
 * @param {string} playerId - Player ID
 * @param {Object} player - Player state object
 * @param {Object} message - The message
 * @param {Function} sendToPlayer - Send message to specific player
 * @param {Function} getPlayerById - Get player by ID
 * @param {Function} getPlayerByWallet - Get player by wallet address
 * @returns {boolean} - True if message was handled
 */
export async function handleTippingMessage(playerId, player, message, sendToPlayer, getPlayerById, getPlayerByWallet) {
    switch (message.type) {
        // ==================== GET PLAYER INFO FOR TIPPING ====================
        case 'tip_get_player_info': {
            try {
                const { targetPlayerId } = message;
                
                if (!targetPlayerId) {
                    sendToPlayer(playerId, {
                        type: 'tip_player_info',
                        error: 'MISSING_PLAYER_ID',
                        message: 'Target player ID required'
                    });
                    return true;
                }
                
                // Look up player by ID
                const targetPlayer = getPlayerById?.(targetPlayerId);
                
                if (!targetPlayer || !targetPlayer.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'tip_player_info',
                        error: 'NOT_AUTHENTICATED',
                        message: 'Target player is not authenticated'
                    });
                    return true;
                }
                
                const userInfo = await tippingService.getUserInfo(targetPlayer.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'tip_player_info',
                    user: userInfo
                });
                
            } catch (error) {
                console.error('💸 Error in tip_get_player_info:', error);
            }
            return true;
        }
        
        // ==================== SEND TIP ====================
        case 'tip_send': {
            try {
                const { recipientWallet, amount, paymentPayload, tipMessage } = message;
                
                // Must be authenticated
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'tip_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet to send tips'
                    });
                    return true;
                }
                
                // Can't tip yourself
                if (player.walletAddress === recipientWallet) {
                    sendToPlayer(playerId, {
                        type: 'tip_result',
                        success: false,
                        error: 'SELF_TIP',
                        message: 'You cannot tip yourself'
                    });
                    return true;
                }
                
                // Must have payment payload
                if (!paymentPayload) {
                    sendToPlayer(playerId, {
                        type: 'tip_result',
                        success: false,
                        error: 'MISSING_PAYMENT',
                        message: 'Payment authorization required'
                    });
                    return true;
                }
                
                // Process the tip
                const result = await tippingService.processTip(
                    player.walletAddress,
                    recipientWallet,
                    amount,
                    paymentPayload,
                    tipMessage || ''
                );
                
                // Send result to sender
                sendToPlayer(playerId, {
                    type: 'tip_result',
                    ...result
                });
                
                // If successful, notify recipient if online
                if (result.success && getPlayerByWallet) {
                    const recipientPlayer = getPlayerByWallet(recipientWallet);
                    if (recipientPlayer) {
                        const senderInfo = await tippingService.getUserInfo(player.walletAddress);
                        sendToPlayer(recipientPlayer.id, {
                            type: 'tip_received',
                            from: senderInfo,
                            amountUsdc: result.amountUsdc,
                            message: tipMessage || '',
                            tipId: result.tipId
                        });
                    }
                }
                
            } catch (error) {
                console.error('💸 Error in tip_send:', error);
                sendToPlayer(playerId, {
                    type: 'tip_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to process tip'
                });
            }
            return true;
        }
        
        // ==================== GET TIP HISTORY ====================
        case 'tip_history': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'tip_history',
                        sent: [],
                        received: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const sent = tippingService.getTipsSent(player.walletAddress);
                const received = tippingService.getTipsReceived(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'tip_history',
                    sent,
                    received
                });
                
            } catch (error) {
                console.error('💸 Error in tip_history:', error);
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}

