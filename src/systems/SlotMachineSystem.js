/**
 * SlotMachineSystem - Cosmetic Gacha Slot Machines
 * 
 * Features:
 * - Displays cosmetic gacha rolls with rarity animations
 * - Uses Pebbles as currency (not gold coins)
 * - Spectator bubbles above machines when in use
 * - Jackpot celebrations for Legendary+ drops
 */

const SPIN_COST = 25; // Pebbles per roll
const INTERACTION_RADIUS = 3;
const BUBBLE_HEIGHT_ABOVE_MACHINE = 7;
const RESULT_DISPLAY_TIME = 4000;
const MAX_CONCURRENT_SPINS = 2;

// Rarity symbols for display
const RARITY_SYMBOLS = {
    common:    { emoji: '⚪', color: '#9CA3AF', name: 'Common', bgColor: 'rgba(156, 163, 175, 0.3)' },
    uncommon:  { emoji: '🟢', color: '#22C55E', name: 'Uncommon', bgColor: 'rgba(34, 197, 94, 0.3)' },
    rare:      { emoji: '🔵', color: '#3B82F6', name: 'Rare', bgColor: 'rgba(59, 130, 246, 0.3)' },
    epic:      { emoji: '🟣', color: '#A855F7', name: 'Epic', bgColor: 'rgba(168, 85, 247, 0.3)' },
    legendary: { emoji: '🟡', color: '#F59E0B', name: 'Legendary', bgColor: 'rgba(245, 158, 11, 0.3)' },
    mythic:    { emoji: '🔴', color: '#EF4444', name: 'Mythic', bgColor: 'rgba(239, 68, 68, 0.3)' },
    divine:    { emoji: '✨', color: '#FFFFFF', name: 'Divine', bgColor: 'rgba(255, 255, 255, 0.4)' }
};

// Spinning symbols - rarity emojis
const SYMBOLS = ['⚪', '🟢', '🔵', '🟣', '🟡', '🔴', '✨'];

// Performance settings
const UPDATE_THROTTLE_MS = 50;
const PARTICLE_COUNT = 25;
const CULL_DISTANCE = 60;

class SlotMachineSystem {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        this.slotMachines = [];
        this.machineDisplays = new Map();
        this.nearbyMachine = null;
        this.localSpinningMachines = new Set();
        
        this.lastUpdateTime = 0;
        this.playerPosition = { x: 0, z: 0 };
        this.frameCount = 0;
    }
    
    setPlayerPosition(x, z) {
        this.playerPosition.x = x;
        this.playerPosition.z = z;
    }
    
    initForCasino(roomWidth, roomDepth, scene) {
        if (scene) {
            this.scene = scene;
        }
        this.slotMachines = [];
        this.cleanup();
        
        const slotRowZ = [15, 25, 35, 45, 55, 65];
        
        slotRowZ.forEach((z, idx) => {
            this.slotMachines.push({
                id: `slot_left_${idx}`,
                x: 6,
                z: z,
                rotation: Math.PI / 2
            });
        });
        
        slotRowZ.forEach((z, idx) => {
            this.slotMachines.push({
                id: `slot_right_${idx}`,
                x: roomWidth - 6,
                z: z,
                rotation: -Math.PI / 2
            });
        });
    }
    
    checkInteraction(playerX, playerZ, playerPebbles, isAuthenticated) {
        let nearestMachine = null;
        let nearestDist = Infinity;
        
        for (const machine of this.slotMachines) {
            const dx = playerX - machine.x;
            const dz = playerZ - machine.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < INTERACTION_RADIUS && dist < nearestDist) {
                nearestDist = dist;
                nearestMachine = machine;
            }
        }
        
        this.nearbyMachine = nearestMachine;
        if (!nearestMachine) return null;
        
        const display = this.machineDisplays.get(nearestMachine.id);
        const machineInUse = display && display.state !== 'idle';
        const atMaxSpins = this.localSpinningMachines.size >= MAX_CONCURRENT_SPINS;
        
        let prompt = `Press E to Roll - ${SPIN_COST} 🪨 Pebbles`;
        let canSpin = true;
        let reason = null;
        let isDemo = false;
        
        if (machineInUse) {
            prompt = `${display.playerName || 'Someone'} is rolling...`;
            canSpin = false;
            reason = 'MACHINE_IN_USE';
        } else if (atMaxSpins) {
            prompt = `Max ${MAX_CONCURRENT_SPINS} spins at once!`;
            canSpin = false;
            reason = 'MAX_SPINS';
        } else if (!isAuthenticated) {
            prompt = '🎰 FREE DEMO! Press E';
            canSpin = true;
            isDemo = true;
        } else if ((playerPebbles || 0) < SPIN_COST) {
            prompt = `Need ${SPIN_COST}🪨 (you have ${playerPebbles || 0}🪨)`;
            canSpin = false;
            reason = 'INSUFFICIENT_PEBBLES';
        }
        
        return { machine: nearestMachine, prompt, canSpin, reason, cost: isDemo ? 0 : SPIN_COST, isDemo };
    }
    
    startSpin(machineId, playerName, isDemo = false) {
        console.log('🎰 startSpin:', machineId, 'scene:', !!this.scene, 'machines:', this.slotMachines.length);
        
        const machine = this.slotMachines.find(m => m.id === machineId);
        if (!machine) {
            console.warn('🎰 Machine not found:', machineId);
            return;
        }
        
        this.localSpinningMachines.add(machineId);
        
        let display = this.machineDisplays.get(machineId);
        if (!display) {
            console.log('🎰 Creating display for:', machineId);
            display = this.createMachineDisplay(machine);
            if (!display) {
                console.error('🎰 Failed to create display!');
                return;
            }
            this.machineDisplays.set(machineId, display);
        }
        
        if (display.timeout) {
            clearTimeout(display.timeout);
            display.timeout = null;
        }
        
        display.playerName = playerName;
        display.isDemo = isDemo;
        display.state = 'spinning';
        display.reels = [null, null, null];
        display.revealedReels = 0;
        display.cosmeticResult = null;
        display.spinStartTime = Date.now();
        display.sprite.visible = true;
        display.isJackpot = false;
        display.jackpotParticles = [];
        
        console.log('🎰 Display ready, visible:', display.sprite.visible);
        this.drawMachineDisplay(machineId);
    }
    
    handleRemoteSpinStart(machineId, playerName, isDemo = false) {
        const machine = this.slotMachines.find(m => m.id === machineId);
        if (!machine) return;
        
        let display = this.machineDisplays.get(machineId);
        if (!display) {
            display = this.createMachineDisplay(machine);
            if (!display) return;
            this.machineDisplays.set(machineId, display);
        }
        
        if (display.timeout) {
            clearTimeout(display.timeout);
            display.timeout = null;
        }
        
        display.playerName = playerName;
        display.isDemo = isDemo;
        display.state = 'spinning';
        display.reels = [null, null, null];
        display.revealedReels = 0;
        display.cosmeticResult = null;
        display.spinStartTime = Date.now();
        display.sprite.visible = true;
        display.isJackpot = false;
        display.jackpotParticles = [];
        
        this.drawMachineDisplay(machineId);
    }
    
    createMachineDisplay(machine) {
        const THREE = this.THREE;
        
        if (!this.scene) {
            console.warn('🎰 SlotMachineSystem: No scene reference');
            return null;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 420;
        canvas.height = 340; // Slightly taller for cosmetic info
        const ctx = canvas.getContext('2d');
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(7, 5.5, 1);
        sprite.renderOrder = 1000;
        sprite.visible = false;
        sprite.position.set(machine.x, BUBBLE_HEIGHT_ABOVE_MACHINE, machine.z);
        
        this.scene.add(sprite);
        
        return {
            sprite, canvas, ctx, texture, material,
            machineId: machine.id,
            machineX: machine.x,
            machineZ: machine.z,
            playerName: '',
            isDemo: false,
            state: 'idle',
            reels: [null, null, null],
            revealedReels: 0,
            cosmeticResult: null,
            spinStartTime: 0,
            isJackpot: false,
            jackpotParticles: [],
            timeout: null
        };
    }
    
    revealReel(machineId, reelIndex, symbol, rarity) {
        let display = this.machineDisplays.get(machineId);
        
        if (!display) {
            const machine = this.slotMachines.find(m => m.id === machineId);
            if (!machine) return;
            
            display = this.createMachineDisplay(machine);
            if (!display) return;
            display.state = 'spinning';
            display.sprite.visible = true;
            this.machineDisplays.set(machineId, display);
        }
        
        // Store the symbol data with rarity info
        display.reels[reelIndex] = symbol || RARITY_SYMBOLS[rarity] || RARITY_SYMBOLS.common;
        display.revealedReels = Math.max(display.revealedReels, reelIndex + 1);
        this.drawMachineDisplay(machineId);
    }
    
    completeSpin(machineId, reels, cosmeticResult, isDemo = false) {
        let display = this.machineDisplays.get(machineId);
        
        if (!display) {
            const machine = this.slotMachines.find(m => m.id === machineId);
            if (!machine) return;
            
            display = this.createMachineDisplay(machine);
            if (!display) return;
            this.machineDisplays.set(machineId, display);
        }
        
        if (display.timeout) {
            clearTimeout(display.timeout);
            display.timeout = null;
        }
        
        display.reels = reels || display.reels;
        display.revealedReels = 3;
        display.cosmeticResult = cosmeticResult;
        display.isDemo = isDemo;
        display.state = 'result';
        display.sprite.visible = true;
        
        // Jackpot for Legendary or better
        const isJackpot = cosmeticResult && 
            ['legendary', 'mythic', 'divine'].includes(cosmeticResult.rarity);
        display.isJackpot = isJackpot;
        
        if (isJackpot) {
            console.log('🎰✨ JACKPOT!', cosmeticResult.rarity, cosmeticResult.name);
            this.startJackpotCelebration(machineId);
        }
        
        this.drawMachineDisplay(machineId);
        this.localSpinningMachines.delete(machineId);
        
        // Hide after delay
        setTimeout(() => {
            if (display.state === 'result') {
                display.state = 'idle';
                display.sprite.visible = false;
                display.isJackpot = false;
                display.jackpotParticles = [];
                display.cosmeticResult = null;
            }
        }, isJackpot ? 6000 : RESULT_DISPLAY_TIME);
    }
    
    startJackpotCelebration(machineId) {
        const display = this.machineDisplays.get(machineId);
        if (!display) return;
        
        display.jackpotParticles = [];
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F1C', '#A855F7'];
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            display.jackpotParticles.push({
                x: Math.random() * display.canvas.width,
                y: -20 - Math.random() * 100,
                vx: (Math.random() - 0.5) * 3,
                vy: 2 + Math.random() * 3,
                size: 4 + Math.random() * 8,
                color: colors[i % colors.length],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                type: i % 3 === 0 ? 'star' : i % 3 === 1 ? 'gem' : 'sparkle'
            });
        }
    }
    
    handleSpinError(machineId) {
        const display = this.machineDisplays.get(machineId);
        if (display) {
            display.state = 'idle';
            display.sprite.visible = false;
        }
        this.localSpinningMachines.delete(machineId);
    }
    
    drawMachineDisplay(machineId) {
        const display = this.machineDisplays.get(machineId);
        if (!display) return;
        
        const { ctx, canvas, texture, playerName, isDemo, state, reels, revealedReels, cosmeticResult, isJackpot, jackpotParticles } = display;
        const W = canvas.width;
        const H = canvas.height;
        
        ctx.clearRect(0, 0, W, H);
        
        // Background with rarity-based color
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (isJackpot && cosmeticResult) {
            const rarityColor = RARITY_SYMBOLS[cosmeticResult.rarity]?.color || '#FFD700';
            bgGrad.addColorStop(0, `rgba(80, 40, 120, 0.98)`);
            bgGrad.addColorStop(0.5, `rgba(120, 60, 160, 0.98)`);
            bgGrad.addColorStop(1, `rgba(60, 30, 100, 0.98)`);
        } else {
            bgGrad.addColorStop(0, 'rgba(40, 20, 80, 0.98)');
            bgGrad.addColorStop(1, 'rgba(20, 10, 50, 0.98)');
        }
        ctx.fillStyle = bgGrad;
        this.roundRect(ctx, 4, 4, W - 8, H - 8, 16);
        ctx.fill();
        
        // Border
        const borderColor = isJackpot ? '#FFD700' : (isDemo ? '#22C55E' : '#A855F7');
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = isJackpot ? 30 : 15;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isJackpot ? 5 : 3;
        this.roundRect(ctx, 4, 4, W - 8, H - 8, 16);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Header
        ctx.fillStyle = borderColor;
        ctx.font = 'bold 20px "Segoe UI", Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (isJackpot) {
            ctx.fillText(`✨ ${playerName} ✨`, W / 2, 28);
        } else if (isDemo) {
            ctx.fillText(`🎁 ${playerName} [DEMO]`, W / 2, 28);
        } else {
            ctx.fillText(`🎰 ${playerName}`, W / 2, 28);
        }
        
        // Title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px "Segoe UI", Arial';
        ctx.fillText('COSMETIC GACHA', W / 2, 48);
        
        // Reel container
        const reelContainerX = 25;
        const reelContainerY = 60;
        const reelContainerW = W - 50;
        const reelContainerH = 110;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.roundRect(ctx, reelContainerX, reelContainerY, reelContainerW, reelContainerH, 12);
        ctx.fill();
        
        // Reels
        const reelW = 100;
        const reelH = 90;
        const reelGap = 20;
        const totalReelW = reelW * 3 + reelGap * 2;
        const reelStartX = (W - totalReelW) / 2;
        const reelY = reelContainerY + 10;
        
        for (let r = 0; r < 3; r++) {
            const rx = reelStartX + r * (reelW + reelGap);
            
            // Reel background
            const reelGrad = ctx.createLinearGradient(rx, reelY, rx, reelY + reelH);
            reelGrad.addColorStop(0, '#0a0520');
            reelGrad.addColorStop(0.5, '#150a35');
            reelGrad.addColorStop(1, '#0a0520');
            ctx.fillStyle = reelGrad;
            this.roundRect(ctx, rx, reelY, reelW, reelH, 10);
            ctx.fill();
            
            // Reel border with rarity color on result
            let reelBorderColor = '#3a2a5e';
            if (state === 'result' && reels[r]) {
                const rarity = Object.keys(RARITY_SYMBOLS).find(k => 
                    RARITY_SYMBOLS[k].emoji === reels[r].emoji
                );
                if (rarity) {
                    reelBorderColor = RARITY_SYMBOLS[rarity].color;
                }
            }
            ctx.strokeStyle = reelBorderColor;
            ctx.lineWidth = state === 'result' ? 3 : 2;
            this.roundRect(ctx, rx, reelY, reelW, reelH, 10);
            ctx.stroke();
            
            ctx.font = '52px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const centerX = rx + reelW / 2;
            const centerY = reelY + reelH / 2;
            
            if (r < revealedReels && reels[r]) {
                // Revealed symbol with glow
                if (isJackpot && state === 'result') {
                    ctx.shadowColor = RARITY_SYMBOLS[cosmeticResult?.rarity]?.color || '#FFD700';
                    ctx.shadowBlur = 20;
                }
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(reels[r].emoji, centerX, centerY);
                ctx.shadowBlur = 0;
            } else if (state === 'spinning') {
                // Spinning animation
                const t = this.frameCount;
                const speed = 3 - r;
                const offset = (t * speed) % SYMBOLS.length;
                
                ctx.save();
                ctx.beginPath();
                this.roundRect(ctx, rx + 2, reelY + 2, reelW - 4, reelH - 4, 8);
                ctx.clip();
                
                for (let s = -1; s <= 1; s++) {
                    const idx = Math.floor((offset + s + SYMBOLS.length * 10) % SYMBOLS.length);
                    const yPos = centerY + s * 40 + ((t * speed * 12) % 40);
                    const alpha = s === 0 ? 0.9 : 0.5;
                    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                    ctx.fillText(SYMBOLS[idx], centerX, yPos);
                }
                ctx.restore();
            }
        }
        
        // Win line
        ctx.strokeStyle = '#FF3366';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(reelStartX - 15, reelY + reelH / 2);
        ctx.lineTo(reelStartX + totalReelW + 15, reelY + reelH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Result area
        const statusY = reelContainerY + reelContainerH + 10;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (state === 'result' && cosmeticResult) {
            const rarityData = RARITY_SYMBOLS[cosmeticResult.rarity] || RARITY_SYMBOLS.common;
            
            if (isDemo) {
                // Demo mode - no real win
                ctx.fillStyle = '#22C55E';
                ctx.font = 'bold 16px "Segoe UI", Arial';
                ctx.fillText('Demo Roll Complete!', W / 2, statusY + 15);
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 14px "Segoe UI", Arial';
                ctx.fillText('🪨 Get Pebbles to win cosmetics!', W / 2, statusY + 38);
                ctx.fillStyle = '#888';
                ctx.font = '12px "Segoe UI", Arial';
                ctx.fillText('Click + button next to Pebbles', W / 2, statusY + 58);
            } else {
                // Duplicates are now kept - render all wins the same way
                // New cosmetic win!
                if (isJackpot) {
                    const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;
                    ctx.save();
                    ctx.translate(W / 2, statusY + 20);
                    ctx.scale(pulse, pulse);
                    ctx.fillStyle = rarityData.color;
                    ctx.shadowColor = rarityData.color;
                    ctx.shadowBlur = 20;
                    ctx.font = 'bold 22px "Segoe UI", Arial';
                    ctx.fillText(`${rarityData.emoji} ${rarityData.name.toUpperCase()}!`, 0, 0);
                    ctx.restore();
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = rarityData.color;
                    ctx.font = 'bold 18px "Segoe UI", Arial';
                    ctx.fillText(`${rarityData.emoji} ${rarityData.name}!`, W / 2, statusY + 15);
                }
                
                // Item name
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 14px "Segoe UI", Arial';
                const itemName = cosmeticResult.name || cosmeticResult.templateId || 'New Item';
                ctx.fillText(itemName, W / 2, statusY + (isJackpot ? 45 : 38));
                
                // Quality & attributes
                let attrY = statusY + (isJackpot ? 65 : 55);
                const attrs = [];
                if (cosmeticResult.quality && cosmeticResult.quality !== 'standard') {
                    attrs.push(cosmeticResult.qualityDisplay?.prefix || `(${cosmeticResult.quality})`);
                }
                if (cosmeticResult.isHolographic) attrs.push('✨HOLO');
                if (cosmeticResult.isFirstEdition) attrs.push('⭐1st Ed');
                
                if (attrs.length > 0) {
                    ctx.fillStyle = '#F472B6';
                    ctx.font = '12px "Segoe UI", Arial';
                    ctx.fillText(attrs.join(' • '), W / 2, attrY);
                }
            }
        } else if (state === 'spinning') {
            const dots = '.'.repeat((Math.floor(Date.now() / 200) % 4));
            ctx.fillStyle = '#A855F7';
            ctx.font = 'bold 20px "Segoe UI", Arial';
            ctx.fillText(`Rolling${dots}`, W / 2, statusY + 25);
        }
        
        // Draw jackpot particles
        if (isJackpot && jackpotParticles.length > 0) {
            for (const p of jackpotParticles) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                
                if (p.type === 'star') {
                    this.drawStar(ctx, 0, 0, p.size);
                } else if (p.type === 'gem') {
                    this.drawGem(ctx, 0, 0, p.size);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
        }
        
        texture.needsUpdate = true;
    }
    
    drawStar(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = i % 2 === 0 ? size : size / 2;
            if (i === 0) {
                ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
            } else {
                ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
            }
        }
        ctx.closePath();
        ctx.fill();
    }
    
    drawGem(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size * 0.7, y);
        ctx.lineTo(x, y + size * 0.5);
        ctx.lineTo(x - size * 0.7, y);
        ctx.closePath();
        ctx.fill();
    }
    
    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    
    update(time, delta, playerX, playerZ) {
        this.frameCount++;
        this.playerPosition.x = playerX;
        this.playerPosition.z = playerZ;
        
        // Update active displays - NO throttle for animations!
        for (const [machineId, display] of this.machineDisplays) {
            if (!display.sprite.visible) continue;
            
            // Distance culling (throttled check)
            if (time - this.lastUpdateTime >= UPDATE_THROTTLE_MS) {
                const dx = display.machineX - playerX;
                const dz = display.machineZ - playerZ;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist > CULL_DISTANCE) {
                    display.sprite.visible = false;
                    continue;
                }
            }
            
            // Update spinning animation EVERY FRAME (smooth animation)
            if (display.state === 'spinning') {
                this.drawMachineDisplay(machineId);
            }
            
            // Update jackpot particles EVERY FRAME
            if (display.isJackpot && display.jackpotParticles.length > 0) {
                for (const p of display.jackpotParticles) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.rotation += p.rotationSpeed;
                    
                    // Reset particles that fall off
                    if (p.y > display.canvas.height + 20) {
                        p.x = Math.random() * display.canvas.width;
                        p.y = -20;
                        p.vy = 2 + Math.random() * 3;
                    }
                }
                this.drawMachineDisplay(machineId);
            }
        }
        
        // Update throttle timer for distance culling
        if (time - this.lastUpdateTime >= UPDATE_THROTTLE_MS) {
            this.lastUpdateTime = time;
        }
    }
    
    cleanup() {
        for (const [, display] of this.machineDisplays) {
            if (display.sprite && display.sprite.parent) {
                display.sprite.parent.remove(display.sprite);
            }
            if (display.material) {
                display.material.dispose();
            }
            if (display.texture) {
                display.texture.dispose();
            }
        }
        this.machineDisplays.clear();
        this.localSpinningMachines.clear();
    }
    
    dispose() {
        this.cleanup();
    }
}

// Export for use in components
export { SlotMachineSystem, SPIN_COST, RARITY_SYMBOLS };
export default SlotMachineSystem;
