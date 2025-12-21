/**
 * Igloo WebSocket Message Handlers
 * Handle all igloo-related operations: rental, entry, settings
 */

import iglooService from '../services/IglooService.js';
import x402Service from '../services/X402Service.js';

/**
 * Handle igloo-related messages
 * @param {string} playerId - Player ID
 * @param {Object} player - Player state object
 * @param {Object} message - The message
 * @param {Function} sendToPlayer - Send message to specific player
 * @returns {Object|null} - Response or null if message not handled
 */
export async function handleIglooMessage(playerId, player, message, sendToPlayer) {
    switch (message.type) {
        // ==================== GET ALL IGLOOS INFO ====================
        case 'igloo_list': {
            try {
                const igloos = await iglooService.getAllIgloos();
                sendToPlayer(playerId, {
                    type: 'igloo_list',
                    igloos
                });
            } catch (error) {
                console.error('🏠 Error in igloo_list:', error);
                sendToPlayer(playerId, {
                    type: 'igloo_error',
                    error: 'SERVER_ERROR',
                    message: 'Failed to fetch igloo list'
                });
            }
            return true;
        }
        
        // ==================== GET SINGLE IGLOO INFO ====================
        case 'igloo_info': {
            try {
                const { iglooId } = message;
                const igloo = await iglooService.getIgloo(iglooId);
                
                if (!igloo) {
                    sendToPlayer(playerId, {
                        type: 'igloo_error',
                        error: 'IGLOO_NOT_FOUND',
                        message: 'Igloo not found'
                    });
                    return true;
                }
                
                sendToPlayer(playerId, {
                    type: 'igloo_info',
                    igloo
                });
            } catch (error) {
                console.error('🏠 Error in igloo_info:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN RENT ====================
        case 'igloo_can_rent': {
            try {
                const { iglooId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_can_rent',
                        canRent: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'Please connect your wallet to rent'
                    });
                    return true;
                }
                
                const result = await iglooService.canRent(player.walletAddress, iglooId);
                sendToPlayer(playerId, {
                    type: 'igloo_can_rent',
                    iglooId,
                    ...result
                });
            } catch (error) {
                console.error('🏠 Error in igloo_can_rent:', error);
            }
            return true;
        }
        
        // ==================== RENT AN IGLOO ====================
        case 'igloo_rent': {
            try {
                const { iglooId, paymentPayload } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_rent_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                if (!paymentPayload) {
                    sendToPlayer(playerId, {
                        type: 'igloo_rent_result',
                        success: false,
                        error: 'MISSING_PAYMENT',
                        message: 'Payment authorization required'
                    });
                    return true;
                }
                
                const result = await iglooService.startRental(
                    player.walletAddress,
                    iglooId,
                    paymentPayload
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_rent_result',
                    ...result
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_rent:', error);
                sendToPlayer(playerId, {
                    type: 'igloo_rent_result',
                    success: false,
                    error: 'SERVER_ERROR'
                });
            }
            return true;
        }
        
        // ==================== PAY DAILY RENT ====================
        case 'igloo_pay_rent': {
            try {
                const { iglooId, paymentPayload } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_pay_rent_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.payRent(
                    player.walletAddress,
                    iglooId,
                    paymentPayload
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_pay_rent_result',
                    ...result
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_pay_rent:', error);
            }
            return true;
        }
        
        // ==================== CHECK IF CAN ENTER ====================
        case 'igloo_can_enter': {
            try {
                const { iglooId, tokenBalance } = message;
                const walletAddress = player.walletAddress || null;
                
                const result = await iglooService.canEnter(
                    walletAddress,
                    iglooId,
                    tokenBalance || 0
                );
                
                // Include igloo info for UI
                const igloo = await iglooService.getIgloo(iglooId);
                
                sendToPlayer(playerId, {
                    type: 'igloo_can_enter',
                    iglooId,
                    igloo,
                    ...result
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_can_enter:', error);
            }
            return true;
        }
        
        // ==================== PAY ENTRY FEE ====================
        case 'igloo_pay_entry': {
            try {
                const { iglooId, paymentPayload } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_pay_entry_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.payEntryFee(
                    player.walletAddress,
                    iglooId,
                    paymentPayload
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_pay_entry_result',
                    ...result
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_pay_entry:', error);
            }
            return true;
        }
        
        // ==================== GET OWNER SETTINGS ====================
        case 'igloo_owner_info': {
            try {
                const { iglooId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_owner_info',
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.getIglooForOwner(
                    iglooId,
                    player.walletAddress
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_owner_info',
                    iglooId,
                    ...(result.error ? { error: result.error } : { igloo: result })
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_owner_info:', error);
            }
            return true;
        }
        
        // ==================== UPDATE SETTINGS ====================
        case 'igloo_update_settings': {
            try {
                const { iglooId, settings } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_settings_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.updateSettings(
                    player.walletAddress,
                    iglooId,
                    settings
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_settings_result',
                    ...result
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_update_settings:', error);
            }
            return true;
        }
        
        // ==================== GET USER'S IGLOOS ====================
        case 'igloo_my_rentals': {
            try {
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_my_rentals',
                        igloos: [],
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const igloos = await iglooService.getUserIgloos(player.walletAddress);
                
                sendToPlayer(playerId, {
                    type: 'igloo_my_rentals',
                    igloos
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_my_rentals:', error);
            }
            return true;
        }
        
        // ==================== LEAVE/VACATE IGLOO ====================
        case 'igloo_leave': {
            try {
                const { iglooId } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'igloo_leave_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED'
                    });
                    return true;
                }
                
                const result = await iglooService.leaveIgloo(
                    player.walletAddress,
                    iglooId
                );
                
                sendToPlayer(playerId, {
                    type: 'igloo_leave_result',
                    ...result
                });
                
            } catch (error) {
                console.error('🏠 Error in igloo_leave:', error);
            }
            return true;
        }
        
        // ==================== RECORD IGLOO VISIT ====================
        case 'igloo_visit': {
            try {
                const { iglooId } = message;
                const walletAddress = player.walletAddress || `guest_${playerId}`;
                
                await iglooService.recordVisit(walletAddress, iglooId);
                // No response needed - silent tracking
                
            } catch (error) {
                console.error('🏠 Error in igloo_visit:', error);
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}

