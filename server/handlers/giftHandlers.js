/**
 * Gift Handlers - Handle player-to-player gifting
 * Supports: Gold, Pebbles, Items, SPL Tokens
 */

import { User, OwnedCosmetic, Transaction, MarketListing } from '../db/models/index.js';

/**
 * Handle gift-related WebSocket messages
 */
export async function handleGiftMessage(playerId, player, message, sendToPlayer, getPlayerById) {
    switch (message.type) {
        // ==================== GET RECIPIENT INFO ====================
        case 'gift_get_recipient_info': {
            try {
                const { targetPlayerId } = message;
                
                if (!targetPlayerId) {
                    sendToPlayer(playerId, {
                        type: 'gift_recipient_info',
                        error: 'MISSING_TARGET',
                        message: 'Target player ID required'
                    });
                    return true;
                }
                
                // Get target player info
                const targetPlayer = getPlayerById?.(targetPlayerId);
                
                if (!targetPlayer?.isAuthenticated || !targetPlayer?.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_recipient_info',
                        error: 'NOT_AUTHENTICATED',
                        message: 'Target player is not authenticated'
                    });
                    return true;
                }
                
                sendToPlayer(playerId, {
                    type: 'gift_recipient_info',
                    walletAddress: targetPlayer.walletAddress,
                    username: targetPlayer.name
                });
                
            } catch (error) {
                console.error('🎁 Error in gift_get_recipient_info:', error);
                sendToPlayer(playerId, {
                    type: 'gift_recipient_info',
                    error: 'SERVER_ERROR',
                    message: 'Failed to get recipient info'
                });
            }
            return true;
        }
        
        // ==================== SEND GOLD ====================
        case 'gift_send_gold': {
            try {
                const { recipientWallet, amount } = message;
                
                // Validate sender
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'You must be authenticated to send gifts'
                    });
                    return true;
                }
                
                // Can't gift yourself
                if (recipientWallet === player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'CANNOT_GIFT_SELF',
                        message: 'You cannot gift yourself'
                    });
                    return true;
                }
                
                // Validate amount
                const giftAmount = parseInt(amount);
                if (!giftAmount || giftAmount < 1) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INVALID_AMOUNT',
                        message: 'Invalid gift amount'
                    });
                    return true;
                }
                
                // Get sender
                const sender = await User.findOne({ walletAddress: player.walletAddress });
                if (!sender) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'SENDER_NOT_FOUND',
                        message: 'Sender account not found'
                    });
                    return true;
                }
                
                // Check balance
                if (sender.coins < giftAmount) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INSUFFICIENT_GOLD',
                        message: `Insufficient gold. You have ${sender.coins}`
                    });
                    return true;
                }
                
                // Get recipient
                const recipient = await User.findOne({ walletAddress: recipientWallet });
                if (!recipient) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'RECIPIENT_NOT_FOUND',
                        message: 'Recipient account not found'
                    });
                    return true;
                }
                
                // Transfer gold
                sender.coins -= giftAmount;
                recipient.coins += giftAmount;
                
                await Promise.all([
                    sender.save(),
                    recipient.save()
                ]);
                
                // Log transaction
                await Transaction.record({
                    type: 'gift_gold',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: giftAmount,
                    currency: 'coins',
                    reason: `Gift to ${recipient.username}`
                });
                
                console.log(`🎁 ${sender.username} gifted ${giftAmount} gold to ${recipient.username}`);
                
                // Update sender's coins in their UI
                sendToPlayer(playerId, {
                    type: 'coins_update',
                    coins: sender.coins,
                    isAuthenticated: true
                });
                
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: true,
                    message: `Sent ${giftAmount} gold to ${recipient.username}!`
                });
                
                // Notify recipient if online
                const recipientPlayer = Object.values(getPlayerById ? {} : {}).find?.(p => p.walletAddress === recipientWallet);
                // We don't have direct access to notify recipient here, but the coins will sync on their next action
                
            } catch (error) {
                console.error('🎁 Error in gift_send_gold:', error);
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to send gold'
                });
            }
            return true;
        }
        
        // ==================== SEND PEBBLES ====================
        case 'gift_send_pebbles': {
            try {
                const { recipientWallet, amount } = message;
                
                // Validate sender
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'You must be authenticated to send gifts'
                    });
                    return true;
                }
                
                // Can't gift yourself
                if (recipientWallet === player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'CANNOT_GIFT_SELF',
                        message: 'You cannot gift yourself'
                    });
                    return true;
                }
                
                // Validate amount
                const giftAmount = parseInt(amount);
                if (!giftAmount || giftAmount < 1) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INVALID_AMOUNT',
                        message: 'Invalid gift amount'
                    });
                    return true;
                }
                
                // Get sender
                const sender = await User.findOne({ walletAddress: player.walletAddress });
                if (!sender) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'SENDER_NOT_FOUND',
                        message: 'Sender account not found'
                    });
                    return true;
                }
                
                // Check balance
                if ((sender.pebbles || 0) < giftAmount) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'INSUFFICIENT_PEBBLES',
                        message: `Insufficient pebbles. You have ${sender.pebbles || 0}`
                    });
                    return true;
                }
                
                // Get recipient
                const recipient = await User.findOne({ walletAddress: recipientWallet });
                if (!recipient) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'RECIPIENT_NOT_FOUND',
                        message: 'Recipient account not found'
                    });
                    return true;
                }
                
                // Transfer pebbles
                sender.pebbles = (sender.pebbles || 0) - giftAmount;
                recipient.pebbles = (recipient.pebbles || 0) + giftAmount;
                
                await Promise.all([
                    sender.save(),
                    recipient.save()
                ]);
                
                // Log transaction
                await Transaction.record({
                    type: 'gift_pebbles',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: giftAmount,
                    currency: 'pebbles',
                    reason: `Gift to ${recipient.username}`
                });
                
                console.log(`🎁 ${sender.username} gifted ${giftAmount} pebbles to ${recipient.username}`);
                
                // Update sender's pebbles in their UI
                sendToPlayer(playerId, {
                    type: 'pebbles_update',
                    pebbles: sender.pebbles
                });
                
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: true,
                    message: `Sent ${giftAmount} pebbles to ${recipient.username}!`
                });
                
            } catch (error) {
                console.error('🎁 Error in gift_send_pebbles:', error);
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to send pebbles'
                });
            }
            return true;
        }
        
        // ==================== SEND ITEM ====================
        case 'gift_send_item': {
            try {
                const { recipientWallet, itemInstanceId } = message;
                
                // Validate sender
                if (!player.isAuthenticated || !player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_AUTHENTICATED',
                        message: 'You must be authenticated to send gifts'
                    });
                    return true;
                }
                
                // Can't gift yourself
                if (recipientWallet === player.walletAddress) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'CANNOT_GIFT_SELF',
                        message: 'You cannot gift yourself'
                    });
                    return true;
                }
                
                if (!itemInstanceId) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'MISSING_ITEM',
                        message: 'Item ID required'
                    });
                    return true;
                }
                
                // Get item
                const item = await OwnedCosmetic.findOne({
                    instanceId: itemInstanceId,
                    ownerId: player.walletAddress,
                    convertedToGold: false
                });
                
                if (!item) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'ITEM_NOT_FOUND',
                        message: 'Item not found or not owned by you'
                    });
                    return true;
                }
                
                // Check if tradable
                if (item.tradable === false) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'NOT_TRADABLE',
                        message: 'This item cannot be traded'
                    });
                    return true;
                }
                
                // Check if listed on marketplace
                const isListed = await MarketListing.isItemListed(itemInstanceId);
                if (isListed) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'ITEM_LISTED',
                        message: 'Cannot gift an item that is listed for sale'
                    });
                    return true;
                }
                
                // Get recipient
                const recipient = await User.findOne({ walletAddress: recipientWallet });
                if (!recipient) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: 'RECIPIENT_NOT_FOUND',
                        message: 'Recipient account not found'
                    });
                    return true;
                }
                
                // Transfer ownership using the history-tracking method
                // Args: instanceId, fromWallet, toWallet, options
                const transferResult = await OwnedCosmetic.transferOwnership(
                    itemInstanceId,
                    player.walletAddress,  // fromWallet
                    recipientWallet,       // toWallet
                    {
                        price: 0,
                        acquisitionType: 'gift'
                    }
                );
                
                if (!transferResult.success) {
                    sendToPlayer(playerId, {
                        type: 'gift_result',
                        success: false,
                        error: transferResult.error,
                        message: transferResult.message
                    });
                    return true;
                }
                
                // Log transaction
                await Transaction.record({
                    type: 'gift_item',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: 1,
                    currency: 'item',
                    relatedData: {
                        instanceId: itemInstanceId,
                        templateId: item.templateId
                    },
                    reason: `Gifted item to ${recipient.username}`
                });
                
                console.log(`🎁 ${player.name} gifted item ${item.templateId} #${item.serialNumber} to ${recipient.username}`);
                
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: true,
                    message: `Sent item to ${recipient.username}!`
                });
                
            } catch (error) {
                console.error('🎁 Error in gift_send_item:', error);
                sendToPlayer(playerId, {
                    type: 'gift_result',
                    success: false,
                    error: 'SERVER_ERROR',
                    message: 'Failed to send item'
                });
            }
            return true;
        }
        
        // ==================== SPL TOKEN TRANSFER COMPLETED (logging only) ====================
        case 'gift_spl_completed': {
            // SPL token transfers happen client-side via wallet
            // This handler just logs the completed transfer for record-keeping
            try {
                const { recipientWallet, tokenMint, amount, signature, tokenSymbol } = message;
                
                if (!player.isAuthenticated || !player.walletAddress) {
                    return true; // Silently ignore
                }
                
                // Log the transfer
                console.log(`🎁 SPL Gift: ${player.name} sent ${amount} ${tokenSymbol || 'tokens'} to ${recipientWallet?.slice(0, 8)}...`);
                console.log(`   Token: ${tokenMint?.slice(0, 8)}...`);
                console.log(`   Tx: ${signature?.slice(0, 16)}...`);
                
                // Record transaction for history
                await Transaction.record({
                    type: 'gift_spl_token',
                    fromWallet: player.walletAddress,
                    toWallet: recipientWallet,
                    amount: amount,
                    currency: 'SPL',
                    relatedData: {
                        tokenMint,
                        tokenSymbol,
                        signature
                    },
                    reason: `SPL token gift`
                });
                
            } catch (error) {
                console.error('🎁 Error logging SPL gift:', error);
            }
            return true;
        }
        
        default:
            return false; // Message not handled
    }
}

export default handleGiftMessage;

