/**
 * SlotService - Cosmetic Gacha Slot Machines
 * 
 * Features:
 * - Rolls for cosmetic items using GachaService
 * - Uses Pebbles as currency (not gold coins)
 * - Real-time spectator updates with rarity animations
 * - Provably fair via GachaService
 */

import { ROLL_PRICE_PEBBLES, PEBBLES_PER_SOL } from './GachaService.js';

const SPIN_COST = ROLL_PRICE_PEBBLES; // 25 Pebbles per roll
const SPIN_DURATION_MS = 2500; // Slightly longer for dramatic effect

// Rarity configuration for slot display
const RARITY_SYMBOLS = {
    common:    { emoji: '⚪', color: '#9CA3AF', name: 'Common' },
    uncommon:  { emoji: '🟢', color: '#22C55E', name: 'Uncommon' },
    rare:      { emoji: '🔵', color: '#3B82F6', name: 'Rare' },
    epic:      { emoji: '🟣', color: '#A855F7', name: 'Epic' },
    legendary: { emoji: '🟡', color: '#F59E0B', name: 'Legendary' },
    mythic:    { emoji: '🔴', color: '#EF4444', name: 'Mythic' },
    divine:    { emoji: '✨', color: '#FFFFFF', name: 'Divine' }
};

// Quality modifiers for display
const QUALITY_DISPLAY = {
    worn: { prefix: '(Worn)', color: '#6B7280' },
    standard: { prefix: '', color: '#FFFFFF' },
    pristine: { prefix: '(Pristine)', color: '#60A5FA' },
    flawless: { prefix: '(Flawless)', color: '#F472B6' }
};

const MAX_CONCURRENT_SPINS_PER_PLAYER = 2;

class SlotService {
    /**
     * @param {UserService} userService - For user data
     * @param {Function} broadcastToRoom - Broadcast to players in room
     * @param {Function} sendToPlayer - Send to specific player
     * @param {GachaService} gachaService - For cosmetic roll logic (injected after init)
     */
    constructor(userService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        this.gachaService = null; // Injected later to avoid circular deps
        
        // Active spins: spinKey (playerId:machineId) -> spinData
        this.activeSpins = new Map();
        
        // Player spin counts: playerId -> count
        this.playerSpinCounts = new Map();
        
        // Slot machine states: machineKey -> { playerId, state }
        this.machineStates = new Map();
        
        console.log('🎰 SlotService initialized (Cosmetic Gacha Mode)');
        console.log(`   Roll cost: ${SPIN_COST} Pebbles`);
    }
    
    /**
     * Set the GachaService instance (called after both services are created)
     */
    setGachaService(gachaService) {
        this.gachaService = gachaService;
        console.log('🎰 GachaService linked to SlotService');
    }
    
    /**
     * Generate spin key from player and machine
     */
    getSpinKey(playerId, machineId) {
        return `${playerId}:${machineId}`;
    }
    
    /**
     * Get count of active spins for a player
     */
    getPlayerSpinCount(playerId) {
        return this.playerSpinCounts.get(playerId) || 0;
    }
    
    incrementPlayerSpinCount(playerId) {
        const current = this.getPlayerSpinCount(playerId);
        this.playerSpinCounts.set(playerId, current + 1);
    }
    
    decrementPlayerSpinCount(playerId) {
        const current = this.getPlayerSpinCount(playerId);
        if (current <= 1) {
            this.playerSpinCounts.delete(playerId);
        } else {
            this.playerSpinCounts.set(playerId, current - 1);
        }
    }
    
    getMachineKey(room, machineId) {
        return `${room}:${machineId}`;
    }
    
    /**
     * Check if a player can spin (has enough Pebbles, not at max spins)
     */
    async canSpin(playerId, walletAddress, machineId, room, isDemo = false) {
        // Check if machine is already in use
        const machineKey = this.getMachineKey(room, machineId);
        if (this.machineStates.has(machineKey)) {
            return { allowed: false, error: 'MACHINE_IN_USE', message: 'This machine is already in use' };
        }
        
        // Check if player has hit max concurrent spins
        const spinCount = this.getPlayerSpinCount(playerId);
        if (spinCount >= MAX_CONCURRENT_SPINS_PER_PLAYER) {
            return { allowed: false, error: 'MAX_SPINS_REACHED', message: `Maximum ${MAX_CONCURRENT_SPINS_PER_PLAYER} concurrent spins` };
        }
        
        // Demo mode - guests can watch but not roll for real
        if (isDemo || !walletAddress) {
            return { allowed: true, isDemo: true, message: 'Demo mode - connect wallet to roll for cosmetics!' };
        }
        
        // Check Pebble balance
        const user = await this.userService.getUser(walletAddress);
        if (!user) {
            return { allowed: false, error: 'USER_NOT_FOUND', message: 'User not found' };
        }
        
        if ((user.pebbles || 0) < SPIN_COST) {
            return { 
                allowed: false, 
                error: 'INSUFFICIENT_PEBBLES', 
                message: `You need ${SPIN_COST} Pebbles (you have ${user.pebbles || 0})`,
                pebbleBalance: user.pebbles || 0,
                required: SPIN_COST
            };
        }
        
        return { allowed: true, isDemo: false, pebbleBalance: user.pebbles };
    }
    
    /**
     * Start a slot spin for cosmetic gacha
     */
    async spin(playerId, walletAddress, room, machineId, playerName, playerPosition, guestCoins = 0, isDemo = false) {
        // Validate
        const canSpinResult = await this.canSpin(playerId, walletAddress, machineId, room, isDemo);
        if (!canSpinResult.allowed) {
            return canSpinResult;
        }
        
        const isDemoSpin = canSpinResult.isDemo;
        
        // For demo spins, show a random rarity animation but no real result
        if (isDemoSpin) {
            const demoRarity = this._getRandomDemoRarity();
            const machineKey = this.getMachineKey(room, machineId);
            const spinKey = this.getSpinKey(playerId, machineId);
            
            const spinData = {
                playerId,
                walletAddress: null,
                machineId,
                machineKey,
                spinKey,
                room,
                playerName,
                playerPosition,
                startTime: Date.now(),
                isDemo: true,
                demoRarity,
                phase: 'spinning'
            };
            
            this.activeSpins.set(spinKey, spinData);
            this.machineStates.set(machineKey, { playerId, state: 'spinning' });
            this.incrementPlayerSpinCount(playerId);
            
            // Schedule demo reveal
            this.scheduleDemoReveals(spinKey, spinData);
            
            return {
                success: true,
                machineId,
                isDemo: true,
                message: 'Demo mode - connect wallet & buy Pebbles to win real cosmetics!'
            };
        }
        
        // REAL SPIN - Use GachaService
        if (!this.gachaService) {
            return { error: 'SERVICE_NOT_READY', message: 'Gacha service not initialized' };
        }
        
        // GachaService handles Pebble deduction and roll logic
        const rollResult = await this.gachaService.roll(walletAddress, 'OG Collection', playerName, playerId);
        
        if (!rollResult.success) {
            return rollResult; // Pass through error
        }
        
        // Store spin data for animation
        const machineKey = this.getMachineKey(room, machineId);
        const spinKey = this.getSpinKey(playerId, machineId);
        
        const spinData = {
            playerId,
            walletAddress,
            machineId,
            machineKey,
            spinKey,
            room,
            playerName,
            playerPosition,
            startTime: Date.now(),
            isDemo: false,
            phase: 'spinning',
            // Gacha result data
            result: rollResult,
            rarity: rollResult.rarity,
            templateId: rollResult.templateId,
            instanceId: rollResult.instanceId,
            name: rollResult.name,
            quality: rollResult.quality,
            isHolographic: rollResult.isHolographic,
            isFirstEdition: rollResult.isFirstEdition,
            serialNumber: rollResult.serialNumber,
            isDuplicate: rollResult.isDuplicate,
            goldAwarded: rollResult.goldAwarded,
            newPebbleBalance: rollResult.newPebbleBalance
        };
        
        this.activeSpins.set(spinKey, spinData);
        this.machineStates.set(machineKey, { playerId, state: 'spinning' });
        this.incrementPlayerSpinCount(playerId);
        
        // Schedule reel reveals with rarity animation
        this.scheduleReelReveals(spinKey, spinData);
        
        // Return initial state
        return {
            success: true,
            machineId,
            newPebbleBalance: rollResult.newPebbleBalance,
            spinCost: SPIN_COST,
            isDemo: false
        };
    }
    
    /**
     * Get a random rarity for demo mode display
     */
    _getRandomDemoRarity() {
        const rand = Math.random() * 100;
        if (rand < 50) return 'common';
        if (rand < 75) return 'uncommon';
        if (rand < 90) return 'rare';
        if (rand < 97) return 'epic';
        if (rand < 99.5) return 'legendary';
        return 'mythic';
    }
    
    /**
     * Schedule demo spin reveals (just for visual effect)
     */
    scheduleDemoReveals(spinKey, spinData) {
        const revealTimes = [600, 1200, 1800];
        
        // Generate demo reels showing the target rarity
        const targetRarity = spinData.demoRarity;
        const reels = [
            this._getRandomDemoRarity(),
            this._getRandomDemoRarity(),
            targetRarity
        ];
        
        spinData.reels = reels;
        
        revealTimes.forEach((delay, reelIndex) => {
            setTimeout(() => {
                const spin = this.activeSpins.get(spinKey);
                if (!spin) return;
                
                // Broadcast reel reveal
                if (this.broadcastToRoom && spin.room) {
                    this.broadcastToRoom(spin.room, {
                        type: 'slot_reel_reveal',
                        playerId: spin.playerId,
                        machineId: spin.machineId,
                        reelIndex,
                        symbol: RARITY_SYMBOLS[reels[reelIndex]] || RARITY_SYMBOLS.common,
                        rarity: reels[reelIndex],
                        isDemo: true
                    });
                }
            }, delay);
        });
        
        // Complete demo spin
        setTimeout(() => {
            this.completeDemoSpin(spinKey);
        }, SPIN_DURATION_MS);
    }
    
    /**
     * Complete a demo spin
     */
    completeDemoSpin(spinKey) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;
        
        const { playerId, machineId, machineKey, room, playerName, demoRarity, reels } = spin;
        
        // Send demo result to player
        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'slot_result',
                machineId,
                isDemo: true,
                demoRarity,
                reels: reels.map(r => RARITY_SYMBOLS[r] || RARITY_SYMBOLS.common),
                message: 'Demo! Connect wallet & get Pebbles to win real cosmetics!',
                cta: 'BUY_PEBBLES'
            });
        }
        
        // Broadcast to room
        if (this.broadcastToRoom && room) {
            this.broadcastToRoom(room, {
                type: 'slot_complete',
                playerId,
                machineId,
                playerName,
                isDemo: true,
                demoRarity,
                reels: reels.map(r => RARITY_SYMBOLS[r] || RARITY_SYMBOLS.common)
            }, playerId);
        }
        
        // Clean up
        this.activeSpins.delete(spinKey);
        this.machineStates.delete(machineKey);
        this.decrementPlayerSpinCount(playerId);
    }
    
    /**
     * Schedule staggered reel reveals for real spins
     */
    scheduleReelReveals(spinKey, spinData) {
        const revealTimes = [600, 1200, 1800]; // Staggered reveals
        
        // Generate reel symbols leading to the result rarity
        const targetRarity = spinData.rarity;
        const reels = this._generateReelsForRarity(targetRarity);
        spinData.reels = reels;
        
        revealTimes.forEach((delay, reelIndex) => {
            setTimeout(() => {
                this.revealReel(spinKey, reelIndex);
            }, delay);
        });
        
        // Complete spin after all reveals
        setTimeout(() => {
            this.completeSpin(spinKey);
        }, SPIN_DURATION_MS);
    }
    
    /**
     * Generate reel symbols that lead to the target rarity
     * Creates anticipation by showing lower rarities first
     */
    _generateReelsForRarity(targetRarity) {
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'];
        const targetIdx = rarityOrder.indexOf(targetRarity);
        
        // Reels build up to the result
        const reel1 = rarityOrder[Math.min(targetIdx, Math.floor(Math.random() * 3))];
        const reel2 = rarityOrder[Math.min(targetIdx, Math.floor(Math.random() * Math.min(targetIdx + 1, 4)))];
        const reel3 = targetRarity; // Final reel shows actual result
        
        return [reel1, reel2, reel3];
    }
    
    /**
     * Reveal a single reel (broadcast to spectators)
     */
    revealReel(spinKey, reelIndex) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;
        
        spin.revealedReels = reelIndex + 1;
        const rarity = spin.reels[reelIndex];
        
        // Broadcast reel reveal to room
        if (this.broadcastToRoom && spin.room) {
            this.broadcastToRoom(spin.room, {
                type: 'slot_reel_reveal',
                playerId: spin.playerId,
                machineId: spin.machineId,
                reelIndex,
                symbol: RARITY_SYMBOLS[rarity] || RARITY_SYMBOLS.common,
                rarity,
                playerName: spin.playerName,
                isDemo: false
            });
        }
    }
    
    /**
     * Complete a real spin and show cosmetic result
     */
    async completeSpin(spinKey) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;
        
        const { 
            playerId, machineId, machineKey, room, playerName, playerPosition,
            result, rarity, name, quality, isHolographic, isFirstEdition,
            serialNumber, isDuplicate, goldAwarded, newPebbleBalance, reels
        } = spin;
        
        // Determine if this is a "jackpot" (legendary or better)
        const isJackpot = ['legendary', 'mythic', 'divine'].includes(rarity);
        
        // Send result to player
        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'slot_result',
                machineId,
                isDemo: false,
                // Cosmetic data
                rarity,
                name,
                quality,
                qualityDisplay: QUALITY_DISPLAY[quality] || QUALITY_DISPLAY.standard,
                isHolographic,
                isFirstEdition,
                serialNumber,
                isDuplicate,
                goldAwarded,
                // Display data
                reels: reels.map(r => RARITY_SYMBOLS[r] || RARITY_SYMBOLS.common),
                raritySymbol: RARITY_SYMBOLS[rarity] || RARITY_SYMBOLS.common,
                isJackpot,
                // Balance
                newPebbleBalance
            });
        }
        
        // Broadcast to room (spectators)
        if (this.broadcastToRoom && room) {
            this.broadcastToRoom(room, {
                type: 'slot_complete',
                playerId,
                machineId,
                playerName,
                playerPosition,
                isDemo: false,
                // Cosmetic data (public)
                rarity,
                name,
                quality,
                isHolographic,
                isFirstEdition,
                isDuplicate,
                // Display
                reels: reels.map(r => RARITY_SYMBOLS[r] || RARITY_SYMBOLS.common),
                raritySymbol: RARITY_SYMBOLS[rarity] || RARITY_SYMBOLS.common,
                isJackpot
            }, playerId);
        }
        
        // Clean up
        this.activeSpins.delete(spinKey);
        this.machineStates.delete(machineKey);
        this.decrementPlayerSpinCount(playerId);
        
        return { success: true };
    }
    
    /**
     * Get active slot spins for players joining the room
     */
    getActiveSlotSpins(room) {
        const activeSpins = [];
        
        for (const [spinKey, spin] of this.activeSpins) {
            if (spin.room === room) {
                activeSpins.push({
                    playerId: spin.playerId,
                    machineId: spin.machineId,
                    playerName: spin.playerName,
                    playerPosition: spin.playerPosition,
                    phase: spin.phase,
                    revealedReels: spin.revealedReels || 0,
                    isDemo: spin.isDemo,
                    reels: (spin.reels || []).slice(0, spin.revealedReels || 0).map(r => 
                        RARITY_SYMBOLS[r] || RARITY_SYMBOLS.common
                    )
                });
            }
        }
        
        return activeSpins;
    }
    
    /**
     * Handle player disconnect
     */
    handleDisconnect(playerId) {
        const spinsToRemove = [];
        
        for (const [spinKey, spin] of this.activeSpins) {
            if (spin.playerId === playerId) {
                spinsToRemove.push({ spinKey, spin });
            }
        }
        
        for (const { spinKey, spin } of spinsToRemove) {
            this.machineStates.delete(spin.machineKey);
            this.activeSpins.delete(spinKey);
            
            // Broadcast interruption
            if (this.broadcastToRoom && spin.room) {
                this.broadcastToRoom(spin.room, {
                    type: 'slot_interrupted',
                    playerId,
                    machineId: spin.machineId
                });
            }
        }
        
        this.playerSpinCounts.delete(playerId);
    }
    
    /**
     * Check if a machine is in use
     */
    isMachineInUse(room, machineId) {
        const machineKey = this.getMachineKey(room, machineId);
        return this.machineStates.has(machineKey);
    }
    
    /**
     * Get slot info for UI display
     */
    static getSlotInfo() {
        return {
            spinCost: SPIN_COST,
            currency: 'Pebbles',
            pebblesPerSol: PEBBLES_PER_SOL,
            mode: 'cosmetic_gacha',
            rarities: Object.entries(RARITY_SYMBOLS).map(([id, data]) => ({
                id,
                ...data
            })),
            qualities: Object.entries(QUALITY_DISPLAY).map(([id, data]) => ({
                id,
                ...data
            })),
            features: [
                'Win exclusive penguin cosmetics!',
                'Holographic & First Edition variants',
                'Collect multiple copies of items',
                'Pity system ensures rare drops'
            ]
        };
    }
}

export default SlotService;
export { SPIN_COST, RARITY_SYMBOLS, QUALITY_DISPLAY, SPIN_DURATION_MS };
