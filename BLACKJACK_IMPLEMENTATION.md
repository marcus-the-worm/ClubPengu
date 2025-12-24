# 🃏 Blackjack Implementation Plan

> **Goal**: Add Blackjack as a **premium 3D casino experience** with PvE (vs dealer) and P2P (vs players) modes, featuring photorealistic rendering, cinematic animations, and full wager integration.

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Visual Quality Targets](#visual-quality-targets)
3. [Game Rules](#game-rules)
4. [Architecture Overview](#architecture-overview)
5. [3D Scene Design](#3d-scene-design)
6. [PvE Mode - Casino Tables](#pve-mode---casino-tables)
7. [P2P Mode - Player Challenges](#p2p-mode---player-challenges)
8. [Animation System](#animation-system)
9. [Server Implementation](#server-implementation)
10. [Database Schema](#database-schema)
11. [Integration Points](#integration-points)
12. [Implementation Phases](#implementation-phases)
13. [Testing Plan](#testing-plan)

---

## Executive Summary

### Why Blackjack?
- **Universal Appeal**: Everyone knows how to play
- **Casino Room Fit**: Perfect for existing casino_game_room
- **Quick Rounds**: 30-60 seconds = high engagement
- **Wager Native**: Natural fit for coin + token wagering
- **Dual Mode**: PvE for practice/solo, P2P for competitive wagering

### Scope
| Mode | Wager Type | Location | Opponent |
|------|------------|----------|----------|
| PvE | Coins only | Casino room tables | AI Dealer |
| P2P | Coins + Tokens | Anywhere (challenge) | Other players |

### Success Metrics
- [ ] PvE games per day
- [ ] P2P challenges with token wagers
- [ ] Average session length in casino room
- [ ] Return player rate

---

## Visual Quality Targets

### 🎯 Quality Bar: **Premium Casino Experience**

This isn't just a minigame - it's a **flagship feature** that showcases the platform's quality.

### Rendering Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREE.js WebGL2 Renderer                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  PBR Shaders │  │  HDR Envmap  │  │   Shadows    │           │
│  │  (Standard)  │  │  (Lighting)  │  │  (PCF Soft)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   SSAO       │  │    Bloom     │  │    FXAA      │           │
│  │ (Depth)      │  │  (Glow FX)   │  │ (Anti-alias) │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
│              Post-Processing via EffectComposer                  │
└─────────────────────────────────────────────────────────────────┘
```

### Material Quality

| Element | Material Type | Details |
|---------|--------------|---------|
| **Cards** | PBR + Normal Map | Embossed texture, slight gloss, worn edges |
| **Table Felt** | Velvet shader | Subsurface scattering, soft shadows |
| **Wood Trim** | PBR Wood | Grain texture, lacquer reflection |
| **Chips** | Metallic PBR | Gold/silver/bronze with edge wear |
| **Glass** | Transmission | Whiskey glasses, ice cubes (ambient) |

### Lighting Setup

```javascript
// Premium casino lighting rig
const lights = {
    // Main overhead - warm casino glow
    keyLight: new THREE.SpotLight(0xfff4e6, 2.5, 50, Math.PI / 4, 0.5, 2),
    
    // Rim lights - dramatic edge definition  
    rimLeft: new THREE.SpotLight(0xff9966, 1.0, 30, Math.PI / 6),
    rimRight: new THREE.SpotLight(0x66ccff, 1.0, 30, Math.PI / 6),
    
    // Fill - soft ambient
    fillLight: new THREE.HemisphereLight(0xfff4e6, 0x080820, 0.4),
    
    // Table spotlight - focus on action
    tableSpot: new THREE.SpotLight(0xffffff, 1.5, 20, Math.PI / 8, 0.8, 1),
    
    // Accent - neon casino vibe
    accentNeon: new THREE.RectAreaLight(0xff00ff, 0.3, 10, 2)
};
```

### Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      CASINO ENVIRONMENT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Background:                                                    │
│   - HDR environment map (blurred casino interior)                │
│   - Bokeh depth-of-field on background                          │
│   - Animated light particles (dust motes in spotlight)           │
│                                                                  │
│   Atmosphere:                                                    │
│   - Volumetric light rays from overhead                         │
│   - Subtle fog/haze for depth                                   │
│   - Reflections on polished surfaces                            │
│                                                                  │
│   Ambient Details:                                               │
│   - Other tables visible in background (blurred)                │
│   - Slot machine lights flickering                              │
│   - Distant chatter audio ambience                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Card Rendering (4K Procedural)

```javascript
// High-res procedural card texture generation
class CardTextureGenerator {
    constructor() {
        this.resolution = 2048; // 2K per card (4K would be 4096)
        this.cache = new Map();
    }
    
    generate(suit, rank) {
        const canvas = document.createElement('canvas');
        canvas.width = this.resolution;
        canvas.height = Math.floor(this.resolution * 1.4); // Standard card ratio
        const ctx = canvas.getContext('2d');
        
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Base card with subtle paper texture
        this._drawCardBase(ctx);
        
        // Suit symbols with proper typography
        this._drawSuitPattern(ctx, suit, rank);
        
        // Emboss effect for raised printing look
        this._applyEmbossEffect(ctx);
        
        // Subtle vignette for realism
        this._applyVignette(ctx);
        
        // Generate normal map for 3D depth
        const normalMap = this._generateNormalMap(canvas);
        
        return {
            diffuse: new THREE.CanvasTexture(canvas),
            normal: normalMap,
            roughness: 0.3,
            metalness: 0.0
        };
    }
    
    _drawCardBase(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        
        // Subtle off-white with paper grain noise
        const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        gradient.addColorStop(0, '#fefefe');
        gradient.addColorStop(1, '#f5f5f0');
        
        // Rounded corners
        const radius = w * 0.04;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, radius);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Paper texture overlay
        this._addNoiseTexture(ctx, 0.02);
    }
    
    _addNoiseTexture(ctx, intensity) {
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * intensity * 255;
            data[i] += noise;     // R
            data[i+1] += noise;   // G
            data[i+2] += noise;   // B
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
}
```

### Chip Stack Rendering

```javascript
// Realistic casino chips with metallic materials
class ChipRenderer {
    createChipGeometry() {
        // Lathe geometry for authentic chip profile
        const points = [
            new THREE.Vector2(0, 0.05),      // Top center
            new THREE.Vector2(0.48, 0.05),   // Top edge
            new THREE.Vector2(0.5, 0.03),    // Outer rim top
            new THREE.Vector2(0.5, -0.03),   // Outer rim bottom  
            new THREE.Vector2(0.48, -0.05),  // Bottom edge
            new THREE.Vector2(0, -0.05),     // Bottom center
        ];
        
        return new THREE.LatheGeometry(points, 64);
    }
    
    createChipMaterial(value) {
        const colors = {
            1: { base: 0xffffff, accent: 0x1a1a1a },    // White - $1
            5: { base: 0xff0000, accent: 0xffffff },    // Red - $5
            25: { base: 0x00aa00, accent: 0xffffff },   // Green - $25
            100: { base: 0x000000, accent: 0xffd700 },  // Black/Gold - $100
            500: { base: 0x800080, accent: 0xffd700 },  // Purple/Gold - $500
            1000: { base: 0xffa500, accent: 0x000000 }, // Orange - $1000
        };
        
        const color = colors[value] || colors[1];
        
        return new THREE.MeshStandardMaterial({
            color: color.base,
            metalness: 0.3,
            roughness: 0.4,
            envMapIntensity: 1.2,
            // Custom shader for edge striping would go here
        });
    }
    
    createChipStack(values, position) {
        const group = new THREE.Group();
        let height = 0;
        
        for (const value of values) {
            const chip = new THREE.Mesh(
                this.createChipGeometry(),
                this.createChipMaterial(value)
            );
            chip.position.y = height;
            chip.castShadow = true;
            chip.receiveShadow = true;
            
            // Slight random rotation for realism
            chip.rotation.y = Math.random() * Math.PI * 2;
            chip.position.x += (Math.random() - 0.5) * 0.02;
            chip.position.z += (Math.random() - 0.5) * 0.02;
            
            group.add(chip);
            height += 0.06; // Chip thickness
        }
        
        group.position.copy(position);
        return group;
    }
}
```

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **FPS** | 60fps stable | Use LOD for complex scenes |
| **Draw Calls** | < 100 | Instance chips, batch cards |
| **Texture Memory** | < 256MB | Compress, use mipmaps |
| **Load Time** | < 3s | Lazy load environment |
| **Mobile** | 30fps min | Reduce post-processing |

### Quality Presets

```javascript
const QUALITY_PRESETS = {
    ultra: {
        shadowMapSize: 4096,
        antialias: true,
        pixelRatio: window.devicePixelRatio,
        postProcessing: ['ssao', 'bloom', 'fxaa', 'dof'],
        cardResolution: 2048,
        envMapResolution: 1024,
        particleCount: 500
    },
    high: {
        shadowMapSize: 2048,
        antialias: true,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        postProcessing: ['bloom', 'fxaa'],
        cardResolution: 1024,
        envMapResolution: 512,
        particleCount: 200
    },
    medium: {
        shadowMapSize: 1024,
        antialias: true,
        pixelRatio: 1,
        postProcessing: ['fxaa'],
        cardResolution: 512,
        envMapResolution: 256,
        particleCount: 50
    },
    low: {
        shadowMapSize: 512,
        antialias: false,
        pixelRatio: 1,
        postProcessing: [],
        cardResolution: 256,
        envMapResolution: 128,
        particleCount: 0
    }
};
```

---

## Game Rules

### Standard Blackjack Rules (Vegas Style)

#### Card Values
| Card | Value |
|------|-------|
| 2-10 | Face value |
| J, Q, K | 10 |
| Ace | 1 or 11 (player's advantage) |

#### Winning Conditions
- **Blackjack**: Ace + 10-value card (21 on first 2 cards) - pays 3:2 in PvE
- **Beat Dealer**: Higher hand than dealer without busting
- **Dealer Busts**: Dealer exceeds 21, player wins
- **Push**: Tie - bet returned

#### Player Actions
| Action | Description | When Available |
|--------|-------------|----------------|
| **Hit** | Take another card | Anytime (if not busted/standing) |
| **Stand** | Keep current hand | Anytime |
| **Double Down** | Double bet, take exactly 1 card | First 2 cards only |
| **Split** | Split pairs into 2 hands | First 2 cards are same value |
| **Insurance** | Side bet when dealer shows Ace | Dealer's upcard is Ace |

#### House Rules (PvE)
- Dealer stands on soft 17
- Blackjack pays 3:2
- Insurance pays 2:1
- Double down on any 2 cards
- Split up to 3 times (4 hands max)
- No re-splitting Aces
- 6-deck shoe, reshuffled at 75% penetration

### P2P Rules Variant
In P2P mode, both players play against a shared virtual dealer:
1. Both players place their bets
2. Both receive 2 cards
3. Players take turns making decisions (Hit/Stand/Double/Split)
4. Virtual dealer plays out (stands on 17)
5. **Winner**: Player with better result vs dealer
6. **Tie**: Both beat dealer by same margin = push (bets returned)
7. **Both Lose**: Both bust or lose to dealer = push (bets returned)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT SIDE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  BlackjackPvE    │    │  BlackjackP2P    │                   │
│  │  (Casino Tables) │    │  (Challenge)     │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌──────────────────────┐                              │
│           │  BlackjackGame.jsx   │  ← Shared game UI component  │
│           │  (Cards, Actions,    │                              │
│           │   Animations)        │                              │
│           └──────────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER SIDE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ BlackjackService │    │   MatchService   │                   │
│  │ (PvE - Casino)   │    │ (P2P - Extended) │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────┬───────────┘                              │
│                       ▼                                          │
│           ┌──────────────────────┐                              │
│           │  BlackjackEngine.js  │  ← Shared game logic         │
│           │  (Deck, Rules,       │                              │
│           │   Win Calculation)   │                              │
│           └──────────────────────┘                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PvE Mode - Casino Tables

### Casino Room Integration

The casino room already exists. We'll add interactive blackjack tables.

#### Table Tiers
| Table | Min Bet | Max Bet | Location |
|-------|---------|---------|----------|
| Bronze | 10 coins | 100 coins | Left side |
| Silver | 50 coins | 500 coins | Center |
| Gold | 100 coins | 1000 coins | Right side |
| VIP | 500 coins | 5000 coins | Back room (unlock at level?) |

#### Interaction Flow
```
Player walks to table → Press E / Click
        │
        ▼
┌─────────────────────┐
│  Blackjack Table UI │
│  - Current balance  │
│  - Bet selector     │
│  - Deal button      │
└─────────┬───────────┘
          │
          ▼ [Place Bet]
┌─────────────────────┐
│  Game In Progress   │
│  - Dealer cards     │
│  - Player cards     │
│  - Action buttons   │
└─────────┬───────────┘
          │
          ▼ [Game Complete]
┌─────────────────────┐
│  Results Screen     │
│  - Win/Lose/Push    │
│  - Payout amount    │
│  - Play Again?      │
└─────────────────────┘
```

#### Server Messages (PvE)
```javascript
// Client → Server
{ type: 'blackjack_bet', tableId: 'bronze', amount: 50 }
{ type: 'blackjack_action', gameId: 'xxx', action: 'hit' }
{ type: 'blackjack_action', gameId: 'xxx', action: 'stand' }
{ type: 'blackjack_action', gameId: 'xxx', action: 'double' }
{ type: 'blackjack_action', gameId: 'xxx', action: 'split' }

// Server → Client
{ type: 'blackjack_start', gameId: 'xxx', playerCards: [...], dealerUpcard: {...}, canDouble: true, canSplit: false }
{ type: 'blackjack_card', gameId: 'xxx', card: {...}, handValue: 15, isBusted: false }
{ type: 'blackjack_result', gameId: 'xxx', dealerCards: [...], dealerValue: 18, result: 'win', payout: 100 }
```

---

## P2P Mode - Player Challenges

### Challenge Flow Integration

Uses existing `ChallengeService` and `MatchService` with Blackjack game type.

#### P2P Game Flow
```
Player 1 challenges Player 2 to Blackjack
        │
        ▼ [Both accept, wagers deposited]
┌─────────────────────────────────────┐
│         BETTING PHASE               │
│  Both players see bet confirmation  │
│  (Wager already locked via escrow)  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         DEAL PHASE                  │
│  - Both players receive 2 cards     │
│  - Virtual dealer gets 2 cards      │
│  - Dealer's hole card hidden        │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      PLAYER 1 TURN                  │
│  - Hit / Stand / Double / Split     │
│  - Player 2 watches                 │
│  - 30 second timeout                │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      PLAYER 2 TURN                  │
│  - Hit / Stand / Double / Split     │
│  - Player 1 watches                 │
│  - 30 second timeout                │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      DEALER PLAYS                   │
│  - Reveal hole card                 │
│  - Hit until 17+                    │
│  - Both players watch               │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      SETTLEMENT                     │
│  - Compare results                  │
│  - Winner takes pot                 │
│  - Token wager settled              │
└─────────────────────────────────────┘
```

#### Win Determination (P2P)
```javascript
// Result matrix
const determineWinner = (p1Result, p2Result) => {
    // p1Result/p2Result = { busted: bool, value: number, blackjack: bool }
    
    // Both bust = push
    if (p1Result.busted && p2Result.busted) return 'draw';
    
    // One busts, other doesn't
    if (p1Result.busted && !p2Result.busted) return 'player2';
    if (!p1Result.busted && p2Result.busted) return 'player1';
    
    // Both have blackjack = push
    if (p1Result.blackjack && p2Result.blackjack) return 'draw';
    
    // One has blackjack
    if (p1Result.blackjack) return 'player1';
    if (p2Result.blackjack) return 'player2';
    
    // Compare values (higher wins, must not bust)
    if (p1Result.value > p2Result.value) return 'player1';
    if (p2Result.value > p1Result.value) return 'player2';
    
    // Same value = push
    return 'draw';
};
```

---

## 3D Scene Design

### Casino Table Model

```
                         OVERHEAD VIEW
    ┌─────────────────────────────────────────────────┐
    │                                                  │
    │              DEALER POSITION                     │
    │                  🐧                              │
    │            ┌───────────┐                        │
    │            │  SHOE     │                        │
    │            └───────────┘                        │
    │     ┌─────────────────────────────────┐        │
    │     │      DEALER CARDS AREA          │        │
    │     │         🃏 🃏 🃏                 │        │
    │     └─────────────────────────────────┘        │
    │                                                  │
    │  ═══════════════════════════════════════════    │
    │              GREEN FELT SURFACE                 │
    │  ═══════════════════════════════════════════    │
    │                                                  │
    │     ┌─────────────────────────────────┐        │
    │     │      PLAYER CARDS AREA          │        │
    │     │           🃏 🃏                  │        │
    │     └─────────────────────────────────┘        │
    │                                                  │
    │    ┌──────┐                    ┌──────┐        │
    │    │CHIPS │        🐧          │CHIPS │        │
    │    └──────┘     PLAYER         └──────┘        │
    │                                                  │
    └─────────────────────────────────────────────────┘
```

### Scene Hierarchy

```javascript
// Scene graph structure
const sceneGraph = {
    root: {
        environment: {
            hdriBackground: 'casino_interior_4k.hdr',
            fog: { color: 0x1a0a1a, near: 20, far: 100 },
            ambientParticles: 'dust_motes'
        },
        
        lights: {
            mainSpot: { type: 'spot', position: [0, 15, 0], target: 'table' },
            rimLeft: { type: 'spot', position: [-10, 8, 5] },
            rimRight: { type: 'spot', position: [10, 8, 5] },
            neonAccent: { type: 'rectArea', position: [0, 10, -15] }
        },
        
        table: {
            base: 'blackjack_table.glb',      // Main table geometry
            felt: 'procedural_velvet',         // Shader material
            woodTrim: 'pbr_mahogany',          // PBR wood
            chipRail: 'metal_brass',           // Brass rail
            
            positions: {
                dealerCards: { x: 0, y: 0.76, z: -1.5 },
                playerCards: { x: 0, y: 0.76, z: 1.5 },
                shoe: { x: 2.5, y: 0.8, z: -1.5 },
                discardTray: { x: -2.5, y: 0.78, z: -1.5 },
                chipStack: { x: -1.5, y: 0.76, z: 2 },
                betCircle: { x: 0, y: 0.76, z: 0.5 }
            }
        },
        
        characters: {
            dealer: {
                model: 'penguin_dealer',
                position: [0, 0, -3],
                outfit: 'dealer_vest_bowtie',
                animations: ['idle', 'deal', 'flip', 'celebrate', 'condolence']
            },
            player: {
                model: 'player_penguin',
                position: [0, 0, 4],
                animations: ['idle', 'win_react', 'lose_react', 'thinking']
            }
        },
        
        props: {
            whiskyGlass: { position: [2, 0.76, 3], material: 'glass_transmission' },
            ashtray: { position: [-2, 0.76, 3] },
            cardShoe: { position: [2.5, 0.76, -1.5], capacity: 312 } // 6 decks
        }
    }
};
```

### Table Felt Shader (Velvet/Cloth)

```glsl
// Custom velvet shader for realistic felt
// Fragment shader
uniform vec3 uColor;
uniform float uRoughness;
uniform sampler2D uNoiseTexture;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;

void main() {
    // Fresnel-like rim for velvet look
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(fresnel, 3.0);
    
    // Subtle noise for fabric texture
    float noise = texture2D(uNoiseTexture, vUv * 50.0).r;
    
    // Darken at grazing angles (velvet characteristic)
    vec3 baseColor = uColor * (0.7 + noise * 0.3);
    vec3 rimColor = uColor * 1.3;
    
    vec3 finalColor = mix(baseColor, rimColor, fresnel * 0.5);
    
    // Subtle sparkle for that premium felt look
    float sparkle = step(0.98, noise) * fresnel * 0.3;
    finalColor += vec3(sparkle);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
```

### Camera Positions

```javascript
const CAMERA_POSITIONS = {
    // Default player view
    player: {
        position: new THREE.Vector3(0, 6, 8),
        lookAt: new THREE.Vector3(0, 0.5, 0),
        fov: 45
    },
    
    // Dramatic card reveal angle
    cardReveal: {
        position: new THREE.Vector3(0, 3, 2),
        lookAt: new THREE.Vector3(0, 0.76, -0.5),
        fov: 35
    },
    
    // Close-up on dealer
    dealerFocus: {
        position: new THREE.Vector3(0, 4, -1),
        lookAt: new THREE.Vector3(0, 1, -2.5),
        fov: 40
    },
    
    // Victory celebration - pull back wide
    celebration: {
        position: new THREE.Vector3(0, 10, 12),
        lookAt: new THREE.Vector3(0, 0, 0),
        fov: 55
    },
    
    // Cinematic orbit (for idle/attract mode)
    orbit: {
        radius: 12,
        height: 6,
        speed: 0.1, // radians per second
        lookAt: new THREE.Vector3(0, 0.5, 0)
    }
};
```

---

## Animation System

### Card Animations (Cinematic Quality)

```javascript
class CardAnimationController {
    constructor(scene, audioManager) {
        this.scene = scene;
        this.audio = audioManager;
        this.timeline = gsap.timeline();
    }
    
    /**
     * Deal card from shoe to position with cinematic flair
     */
    async dealCard(card, targetPosition, options = {}) {
        const {
            faceUp = true,
            delay = 0,
            dealerHand = false
        } = options;
        
        // Start position (in shoe)
        const shoePos = this.scene.getShoePosition();
        card.position.copy(shoePos);
        card.rotation.set(-Math.PI / 2, 0, Math.PI); // Face down in shoe
        
        // Calculate arc path
        const midPoint = new THREE.Vector3(
            (shoePos.x + targetPosition.x) / 2,
            shoePos.y + 2, // Arc height
            (shoePos.z + targetPosition.z) / 2
        );
        
        // Create bezier path
        const curve = new THREE.QuadraticBezierCurve3(
            shoePos,
            midPoint,
            targetPosition
        );
        
        // Animate along path
        const timeline = gsap.timeline();
        
        // Card slides out of shoe
        timeline.to(card.position, {
            x: shoePos.x - 0.5,
            duration: 0.15,
            ease: "power2.out",
            onStart: () => this.audio.play('card_slide')
        });
        
        // Arc through air
        timeline.to(card, {
            duration: 0.4,
            ease: "power2.inOut",
            onUpdate: function() {
                const t = this.progress();
                const point = curve.getPoint(t);
                card.position.copy(point);
                
                // Rotate during flight
                card.rotation.z = Math.PI * (1 - t);
                if (faceUp) {
                    card.rotation.x = -Math.PI / 2 + (Math.PI / 2 * t);
                }
            }
        });
        
        // Land with subtle bounce
        timeline.to(card.position, {
            y: targetPosition.y + 0.02,
            duration: 0.08,
            ease: "power2.out",
            onStart: () => this.audio.play('card_place')
        });
        
        timeline.to(card.position, {
            y: targetPosition.y,
            duration: 0.05,
            ease: "bounce.out"
        });
        
        return timeline;
    }
    
    /**
     * Dramatic hole card reveal
     */
    async revealHoleCard(card) {
        // Camera zoom to card
        await this.scene.animateCameraTo('cardReveal', 0.5);
        
        const timeline = gsap.timeline();
        
        // Slight lift
        timeline.to(card.position, {
            y: card.position.y + 0.3,
            duration: 0.2,
            ease: "power2.out"
        });
        
        // Flip with rotation
        timeline.to(card.rotation, {
            x: 0,
            duration: 0.4,
            ease: "back.out(1.5)",
            onStart: () => this.audio.play('card_flip')
        }, "-=0.1");
        
        // Land back down
        timeline.to(card.position, {
            y: card.position.y,
            duration: 0.15,
            ease: "power2.in"
        });
        
        // Camera back to player view
        timeline.add(() => this.scene.animateCameraTo('player', 0.8), "+=0.3");
        
        return timeline;
    }
    
    /**
     * Chip bet animation
     */
    async animateBet(chipStack, betCircle, amount) {
        const chips = this.createChipsForAmount(amount);
        const timeline = gsap.timeline();
        
        for (let i = 0; i < chips.length; i++) {
            const chip = chips[i];
            const startPos = chipStack.position.clone();
            startPos.y += i * 0.06;
            
            const endPos = betCircle.position.clone();
            endPos.y += i * 0.06;
            
            chip.position.copy(startPos);
            this.scene.add(chip);
            
            timeline.to(chip.position, {
                x: endPos.x,
                y: endPos.y + 1,
                z: endPos.z,
                duration: 0.25,
                ease: "power2.out",
                onStart: () => this.audio.play('chip_slide', { volume: 0.5 + i * 0.1 })
            }, i * 0.08);
            
            timeline.to(chip.position, {
                y: endPos.y,
                duration: 0.15,
                ease: "bounce.out",
                onComplete: () => this.audio.play('chip_stack')
            }, `>-0.05`);
            
            // Slight wobble on landing
            timeline.to(chip.rotation, {
                x: (Math.random() - 0.5) * 0.1,
                z: (Math.random() - 0.5) * 0.1,
                duration: 0.1
            }, "<");
        }
        
        return { timeline, chips };
    }
    
    /**
     * Win celebration with chips flying to player
     */
    async celebrateWin(betChips, winAmount, isBlackjack = false) {
        const timeline = gsap.timeline();
        
        // Flash the table
        timeline.to(this.scene.tableLight, {
            intensity: 3,
            duration: 0.1,
            yoyo: true,
            repeat: 3
        });
        
        if (isBlackjack) {
            // Special blackjack celebration
            this.audio.play('blackjack_fanfare');
            this.spawnConfetti();
            
            // Text popup
            this.showFloatingText('BLACKJACK!', {
                color: 0xffd700,
                size: 2,
                duration: 2
            });
        } else {
            this.audio.play('win_chime');
        }
        
        // Create win chips
        const winChips = this.createChipsForAmount(winAmount);
        const dealerChipPos = new THREE.Vector3(-2, 0.76, -2);
        
        // Chips fly from dealer to player
        for (let i = 0; i < winChips.length; i++) {
            const chip = winChips[i];
            chip.position.copy(dealerChipPos);
            chip.position.y += i * 0.06;
            this.scene.add(chip);
            
            const targetPos = this.scene.playerChipStack.position.clone();
            targetPos.y += i * 0.06;
            
            timeline.to(chip.position, {
                x: targetPos.x,
                y: targetPos.y + 2,
                z: targetPos.z,
                duration: 0.4,
                ease: "power2.out"
            }, 0.3 + i * 0.05);
            
            timeline.to(chip.position, {
                y: targetPos.y,
                duration: 0.2,
                ease: "bounce.out",
                onComplete: () => this.audio.play('chip_stack')
            });
        }
        
        // Dealer reaction
        timeline.add(() => {
            this.scene.dealerPenguin.playAnimation('condolence');
        }, 0.2);
        
        // Player reaction
        timeline.add(() => {
            this.scene.playerPenguin.playAnimation('win_react');
        }, 0.5);
        
        return timeline;
    }
    
    /**
     * Particle effects
     */
    spawnConfetti() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];
        
        const confettiColors = [
            new THREE.Color(0xff0000),
            new THREE.Color(0x00ff00),
            new THREE.Color(0x0000ff),
            new THREE.Color(0xffff00),
            new THREE.Color(0xff00ff),
            new THREE.Color(0xffd700)
        ];
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = 10 + Math.random() * 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
            
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.1,
                y: -0.1 - Math.random() * 0.1,
                z: (Math.random() - 0.5) * 0.1,
                rotSpeed: Math.random() * 0.2
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 1
        });
        
        const confetti = new THREE.Points(geometry, material);
        this.scene.add(confetti);
        
        // Animate falling
        const animate = () => {
            const positions = confetti.geometry.attributes.position.array;
            let allFallen = true;
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += velocities[i].x;
                positions[i * 3 + 1] += velocities[i].y;
                positions[i * 3 + 2] += velocities[i].z;
                
                velocities[i].y -= 0.002; // Gravity
                
                if (positions[i * 3 + 1] > -2) allFallen = false;
            }
            
            confetti.geometry.attributes.position.needsUpdate = true;
            
            if (!allFallen) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(confetti);
                geometry.dispose();
                material.dispose();
            }
        };
        
        animate();
    }
}
```

### Audio Design

```javascript
const AUDIO_MANIFEST = {
    // Card sounds
    card_slide: { src: 'sfx/card_slide.mp3', volume: 0.6 },
    card_flip: { src: 'sfx/card_flip.mp3', volume: 0.7 },
    card_place: { src: 'sfx/card_place.mp3', volume: 0.5 },
    
    // Chip sounds
    chip_slide: { src: 'sfx/chip_slide.mp3', volume: 0.5 },
    chip_stack: { src: 'sfx/chip_stack.mp3', volume: 0.6 },
    chips_collect: { src: 'sfx/chips_collect.mp3', volume: 0.7 },
    
    // Result sounds
    win_chime: { src: 'sfx/win_chime.mp3', volume: 0.8 },
    blackjack_fanfare: { src: 'sfx/blackjack_fanfare.mp3', volume: 0.9 },
    lose_sound: { src: 'sfx/lose_whomp.mp3', volume: 0.6 },
    push_sound: { src: 'sfx/push_ding.mp3', volume: 0.5 },
    
    // Ambience
    casino_ambience: { src: 'sfx/casino_ambience.mp3', volume: 0.2, loop: true },
    
    // Dealer voice (optional)
    dealer_blackjack: { src: 'voice/blackjack.mp3', volume: 0.8 },
    dealer_bust: { src: 'voice/bust.mp3', volume: 0.8 },
    dealer_hit_stand: { src: 'voice/hit_or_stand.mp3', volume: 0.7 }
};
```

---

## UI/UX Design

### Mobile-First Layout (Portrait)

```
┌─────────────────────────────┐
│      DEALER AREA            │
│  ┌───┐ ┌───┐                │
│  │ ? │ │ 7♠│     Value: ?   │
│  └───┘ └───┘                │
├─────────────────────────────┤
│      GAME INFO              │
│  Pot: 100 coins + 50 $CPw3  │
│  Your turn (25s)            │
├─────────────────────────────┤
│      OPPONENT (P2P only)    │
│  ┌───┐ ┌───┐ ┌───┐          │
│  │ K♥│ │ 5♦│ │ 3♣│  = 18    │
│  └───┘ └───┘ └───┘  STAND   │
├─────────────────────────────┤
│      YOUR HAND              │
│  ┌───┐ ┌───┐                │
│  │ A♠│ │ 6♥│      = 17      │
│  └───┘ └───┘    (soft)      │
├─────────────────────────────┤
│      ACTIONS                │
│  ┌─────────┐ ┌─────────┐    │
│  │   HIT   │ │  STAND  │    │
│  └─────────┘ └─────────┘    │
│  ┌─────────┐ ┌─────────┐    │
│  │ DOUBLE  │ │  SPLIT  │    │
│  └─────────┘ └─────────┘    │
└─────────────────────────────┘
```

### Card Component
```jsx
// Reusable card with flip animation
<PlayingCard 
    suit="hearts" 
    rank="A" 
    faceDown={false}
    size="md" // sm, md, lg
    animate={true}
/>
```

### Card Assets
- Use CSS/SVG for cards (no image dependencies)
- Suits: ♠ ♥ ♦ ♣ (Unicode)
- Colors: Black (♠♣) Red (♥♦)
- Back design: Club Pengu themed pattern

---

## Server Implementation

### BlackjackEngine.js (Shared Logic)

```javascript
// server/services/BlackjackEngine.js

class BlackjackEngine {
    constructor() {
        this.deck = [];
        this.initializeDeck();
    }
    
    initializeDeck(numDecks = 6) {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        
        this.deck = [];
        for (let d = 0; d < numDecks; d++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    this.deck.push({ suit, rank, value: this.getCardValue(rank) });
                }
            }
        }
        this.shuffle();
    }
    
    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    drawCard() {
        if (this.deck.length < 52) { // Reshuffle at ~75% penetration
            this.initializeDeck();
        }
        return this.deck.pop();
    }
    
    getCardValue(rank) {
        if (['J', 'Q', 'K'].includes(rank)) return 10;
        if (rank === 'A') return 11; // Handled as 1 or 11 in hand calculation
        return parseInt(rank);
    }
    
    calculateHandValue(cards) {
        let value = 0;
        let aces = 0;
        
        for (const card of cards) {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else {
                value += this.getCardValue(card.rank);
            }
        }
        
        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return {
            value,
            soft: aces > 0 && value <= 21, // Has an ace counted as 11
            busted: value > 21,
            blackjack: cards.length === 2 && value === 21
        };
    }
    
    canSplit(cards) {
        return cards.length === 2 && 
               this.getCardValue(cards[0].rank) === this.getCardValue(cards[1].rank);
    }
    
    canDouble(cards) {
        return cards.length === 2;
    }
    
    dealerShouldHit(cards) {
        const hand = this.calculateHandValue(cards);
        // Dealer stands on soft 17
        return hand.value < 17;
    }
}
```

### BlackjackService.js (PvE)

```javascript
// server/services/BlackjackService.js

class BlackjackService {
    constructor(userService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        this.activeGames = new Map(); // playerId -> game state
        this.engine = new BlackjackEngine();
        
        // Table configurations
        this.tables = {
            bronze: { minBet: 10, maxBet: 100 },
            silver: { minBet: 50, maxBet: 500 },
            gold: { minBet: 100, maxBet: 1000 },
            vip: { minBet: 500, maxBet: 5000 }
        };
    }
    
    async placeBet(playerId, tableId, amount) {
        const table = this.tables[tableId];
        if (!table) return { error: 'INVALID_TABLE' };
        
        if (amount < table.minBet || amount > table.maxBet) {
            return { error: 'INVALID_BET', minBet: table.minBet, maxBet: table.maxBet };
        }
        
        // Check and deduct coins
        const user = await this.userService.getUser(playerId);
        if (!user || user.coins < amount) {
            return { error: 'INSUFFICIENT_FUNDS' };
        }
        
        await this.userService.adjustCoins(playerId, -amount, 'blackjack_bet');
        
        // Deal cards
        const playerCards = [this.engine.drawCard(), this.engine.drawCard()];
        const dealerCards = [this.engine.drawCard(), this.engine.drawCard()];
        
        const gameId = `bj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const gameState = {
            gameId,
            playerId,
            tableId,
            betAmount: amount,
            playerHands: [{ cards: playerCards, bet: amount, standing: false, doubled: false }],
            currentHandIndex: 0,
            dealerCards,
            phase: 'player_turn',
            createdAt: Date.now()
        };
        
        this.activeGames.set(playerId, gameState);
        
        const playerHand = this.engine.calculateHandValue(playerCards);
        
        // Check for natural blackjack
        if (playerHand.blackjack) {
            return this._settleGame(gameState);
        }
        
        return {
            success: true,
            gameId,
            playerCards,
            dealerUpcard: dealerCards[0], // Only show first card
            handValue: playerHand,
            canDouble: this.engine.canDouble(playerCards),
            canSplit: this.engine.canSplit(playerCards)
        };
    }
    
    async playerAction(playerId, action) {
        const game = this.activeGames.get(playerId);
        if (!game) return { error: 'NO_ACTIVE_GAME' };
        
        const currentHand = game.playerHands[game.currentHandIndex];
        
        switch (action) {
            case 'hit':
                return this._handleHit(game, currentHand);
            case 'stand':
                return this._handleStand(game);
            case 'double':
                return this._handleDouble(game, currentHand);
            case 'split':
                return this._handleSplit(game, currentHand);
            default:
                return { error: 'INVALID_ACTION' };
        }
    }
    
    _handleHit(game, hand) {
        const card = this.engine.drawCard();
        hand.cards.push(card);
        
        const handValue = this.engine.calculateHandValue(hand.cards);
        
        if (handValue.busted) {
            return this._advanceToNextHand(game);
        }
        
        return {
            success: true,
            card,
            handValue,
            canDouble: false, // Can't double after hitting
            canSplit: false
        };
    }
    
    _handleStand(game) {
        game.playerHands[game.currentHandIndex].standing = true;
        return this._advanceToNextHand(game);
    }
    
    async _handleDouble(game, hand) {
        if (!this.engine.canDouble(hand.cards)) {
            return { error: 'CANNOT_DOUBLE' };
        }
        
        // Deduct additional bet
        const user = await this.userService.getUser(game.playerId);
        if (!user || user.coins < hand.bet) {
            return { error: 'INSUFFICIENT_FUNDS' };
        }
        
        await this.userService.adjustCoins(game.playerId, -hand.bet, 'blackjack_double');
        hand.bet *= 2;
        hand.doubled = true;
        
        // Take exactly one card then stand
        const card = this.engine.drawCard();
        hand.cards.push(card);
        hand.standing = true;
        
        return this._advanceToNextHand(game);
    }
    
    async _handleSplit(game, hand) {
        if (!this.engine.canSplit(hand.cards)) {
            return { error: 'CANNOT_SPLIT' };
        }
        
        if (game.playerHands.length >= 4) {
            return { error: 'MAX_SPLITS_REACHED' };
        }
        
        // Deduct bet for new hand
        const user = await this.userService.getUser(game.playerId);
        if (!user || user.coins < hand.bet) {
            return { error: 'INSUFFICIENT_FUNDS' };
        }
        
        await this.userService.adjustCoins(game.playerId, -hand.bet, 'blackjack_split');
        
        // Split the hand
        const secondCard = hand.cards.pop();
        const newHand = { cards: [secondCard], bet: hand.bet, standing: false, doubled: false };
        
        // Deal one card to each hand
        hand.cards.push(this.engine.drawCard());
        newHand.cards.push(this.engine.drawCard());
        
        game.playerHands.push(newHand);
        
        return {
            success: true,
            hands: game.playerHands.map(h => ({
                cards: h.cards,
                value: this.engine.calculateHandValue(h.cards),
                bet: h.bet
            })),
            currentHandIndex: game.currentHandIndex
        };
    }
    
    _advanceToNextHand(game) {
        game.currentHandIndex++;
        
        // Check if more hands to play
        if (game.currentHandIndex < game.playerHands.length) {
            const nextHand = game.playerHands[game.currentHandIndex];
            const handValue = this.engine.calculateHandValue(nextHand.cards);
            
            return {
                success: true,
                nextHand: true,
                currentHandIndex: game.currentHandIndex,
                cards: nextHand.cards,
                handValue,
                canDouble: this.engine.canDouble(nextHand.cards),
                canSplit: this.engine.canSplit(nextHand.cards)
            };
        }
        
        // All hands complete - dealer's turn
        return this._settleGame(game);
    }
    
    async _settleGame(game) {
        // Dealer plays
        while (this.engine.dealerShouldHit(game.dealerCards)) {
            game.dealerCards.push(this.engine.drawCard());
        }
        
        const dealerHand = this.engine.calculateHandValue(game.dealerCards);
        
        // Calculate results for each hand
        let totalPayout = 0;
        const handResults = [];
        
        for (const hand of game.playerHands) {
            const playerHand = this.engine.calculateHandValue(hand.cards);
            let result, payout;
            
            if (playerHand.busted) {
                result = 'lose';
                payout = 0;
            } else if (dealerHand.busted) {
                result = 'win';
                payout = playerHand.blackjack ? hand.bet * 2.5 : hand.bet * 2;
            } else if (playerHand.blackjack && !dealerHand.blackjack) {
                result = 'blackjack';
                payout = hand.bet * 2.5; // 3:2 payout
            } else if (playerHand.value > dealerHand.value) {
                result = 'win';
                payout = hand.bet * 2;
            } else if (playerHand.value < dealerHand.value) {
                result = 'lose';
                payout = 0;
            } else {
                result = 'push';
                payout = hand.bet; // Return bet
            }
            
            totalPayout += payout;
            handResults.push({ cards: hand.cards, value: playerHand.value, bet: hand.bet, result, payout });
        }
        
        // Pay out winnings
        if (totalPayout > 0) {
            await this.userService.adjustCoins(game.playerId, totalPayout, 'blackjack_payout');
        }
        
        // Clean up
        this.activeGames.delete(game.playerId);
        
        return {
            success: true,
            gameComplete: true,
            dealerCards: game.dealerCards,
            dealerValue: dealerHand.value,
            dealerBusted: dealerHand.busted,
            handResults,
            totalPayout,
            netResult: totalPayout - game.playerHands.reduce((sum, h) => sum + h.bet, 0)
        };
    }
}
```

### MatchService Extension (P2P)

Add to existing `MatchService.js`:

```javascript
// In MatchService.js - add blackjack handling

_initializeBlackjackState() {
    const engine = new BlackjackEngine();
    
    return {
        deck: engine.deck,
        dealerCards: [engine.drawCard(), engine.drawCard()],
        player1: {
            cards: [engine.drawCard(), engine.drawCard()],
            standing: false,
            busted: false
        },
        player2: {
            cards: [engine.drawCard(), engine.drawCard()],
            standing: false,
            busted: false
        },
        currentTurn: 'player1',
        phase: 'playing' // playing, dealer, complete
    };
}

_handleBlackjackMove(match, playerId, moveData) {
    const { action } = moveData;
    const isPlayer1 = playerId === match.player1.id;
    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const player = match.state[playerKey];
    
    if (player.standing || player.busted) {
        return { error: 'HAND_COMPLETE' };
    }
    
    const engine = new BlackjackEngine();
    engine.deck = match.state.deck;
    
    switch (action) {
        case 'hit':
            const card = engine.drawCard();
            player.cards.push(card);
            match.state.deck = engine.deck;
            
            const handValue = engine.calculateHandValue(player.cards);
            if (handValue.busted) {
                player.busted = true;
                player.standing = true;
            }
            break;
            
        case 'stand':
            player.standing = true;
            break;
            
        // TODO: Add double/split for P2P
    }
    
    // Check if both players are done
    if (match.state.player1.standing && match.state.player2.standing) {
        return this._resolveBlackjackMatch(match, engine);
    }
    
    // Advance turn
    match.state.currentTurn = match.state.currentTurn === 'player1' ? 'player2' : 'player1';
    
    return {
        success: true,
        state: match.state,
        gameComplete: false
    };
}

_resolveBlackjackMatch(match, engine) {
    // Dealer plays out
    while (engine.dealerShouldHit(match.state.dealerCards)) {
        match.state.dealerCards.push(engine.drawCard());
    }
    
    const dealerHand = engine.calculateHandValue(match.state.dealerCards);
    const p1Hand = engine.calculateHandValue(match.state.player1.cards);
    const p2Hand = engine.calculateHandValue(match.state.player2.cards);
    
    // Determine results vs dealer
    const p1Result = this._getBlackjackResult(p1Hand, dealerHand);
    const p2Result = this._getBlackjackResult(p2Hand, dealerHand);
    
    // Compare players
    let winnerId = null;
    if (p1Result > p2Result) winnerId = match.player1.id;
    else if (p2Result > p1Result) winnerId = match.player2.id;
    // else draw
    
    match.state.phase = 'complete';
    match.winnerId = winnerId;
    match.status = winnerId ? 'complete' : 'draw';
    match.endedAt = new Date();
    
    return {
        success: true,
        state: match.state,
        gameComplete: true,
        winnerId,
        isDraw: !winnerId,
        dealerCards: match.state.dealerCards,
        dealerValue: dealerHand.value
    };
}

_getBlackjackResult(playerHand, dealerHand) {
    // Returns score: -1 (lose), 0 (push), 1 (win), 2 (blackjack win)
    if (playerHand.busted) return -1;
    if (dealerHand.busted) return playerHand.blackjack ? 2 : 1;
    if (playerHand.blackjack && !dealerHand.blackjack) return 2;
    if (!playerHand.blackjack && dealerHand.blackjack) return -1;
    if (playerHand.value > dealerHand.value) return 1;
    if (playerHand.value < dealerHand.value) return -1;
    return 0; // Push
}
```

---

## Database Schema

### Update Match Model

```javascript
// In server/db/models/Match.js - update gameType enum

gameType: {
    type: String,
    required: true,
    enum: ['cardJitsu', 'connect4', 'ticTacToe', 'pong', 'monopoly', 'uno', 'blackjack'],
    index: true
}
```

### Update Challenge Model

```javascript
// In server/db/models/Challenge.js - update gameType enum

gameType: {
    type: String,
    required: true,
    enum: ['cardJitsu', 'connect4', 'ticTacToe', 'pong', 'monopoly', 'uno', 'blackjack']
}
```

### BlackjackGame Model (PvE History - Optional)

```javascript
// server/db/models/BlackjackGame.js

const blackjackGameSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true, index: true },
    walletAddress: { type: String, required: true, index: true },
    tableId: { type: String, required: true },
    betAmount: { type: Number, required: true },
    totalPayout: { type: Number, required: true },
    netResult: { type: Number, required: true }, // Win/loss amount
    hands: [{
        cards: [{ suit: String, rank: String }],
        result: { type: String, enum: ['win', 'lose', 'push', 'blackjack'] },
        payout: Number
    }],
    dealerCards: [{ suit: String, rank: String }],
    dealerValue: Number,
    duration: Number // Seconds
}, { timestamps: true });

blackjackGameSchema.index({ walletAddress: 1, createdAt: -1 });
```

---

## Integration Points

### 1. Challenge System
- Add 'blackjack' to game type enum in `ChallengeService.js`
- Update `ChallengeContext.jsx` to handle blackjack challenges

### 2. Stats Tracking
- Add blackjack wins/losses to User model
- Update `StatsService.js` for blackjack stats
- Update `StatsModal.jsx` to show blackjack stats

### 3. Casino Room
- Add clickable table objects in `VoxelWorld.jsx`
- Create `BlackjackTableInteraction` component

### 4. Token Wagering (P2P only)
- Fully supported via existing `WagerSettlementService`
- Same flow as other P2P games

---

## Implementation Phases

### Phase 1: Core Engine & Foundation (Days 1-2)
- [ ] Create `BlackjackEngine.js` with core game logic
- [ ] Unit tests for engine (deck, hand calculation, dealer AI)
- [ ] Verify all edge cases (soft 17, splits, etc.)
- [ ] Set up THREE.js scene boilerplate
- [ ] Implement quality presets system
- [ ] Create asset loading pipeline

### Phase 2: 3D Scene & Rendering (Days 3-5)
- [ ] Build casino table geometry (or import GLB)
- [ ] Implement PBR materials (felt, wood, metal)
- [ ] Set up lighting rig (spots, rim, ambient)
- [ ] Create procedural card texture generator (2K res)
- [ ] Implement card mesh with front/back materials
- [ ] Build chip geometry and materials
- [ ] Add post-processing pipeline (bloom, FXAA)
- [ ] Implement quality auto-detection

### Phase 3: Animation System (Days 6-7)
- [ ] Card dealing animation (arc path, rotation)
- [ ] Card flip animation (hole card reveal)
- [ ] Chip stacking/betting animations
- [ ] Win celebration (chips fly, confetti)
- [ ] Camera transitions (smooth GSAP)
- [ ] Dealer penguin animations (idle, deal, react)
- [ ] Audio integration (card sounds, chips, fanfares)

### Phase 4: PvE Mode - Casino Tables (Days 8-9)
- [ ] Create `BlackjackService.js` for PvE games
- [ ] Add WebSocket handlers in `server/index.js`
- [ ] Create `BlackjackPvE.jsx` wrapper component
- [ ] Implement bet selection UI (chip picker)
- [ ] Add table tier system (Bronze/Silver/Gold/VIP)
- [ ] Connect to casino room interactions
- [ ] Test full PvE flow with coins

### Phase 5: P2P Mode - Challenges (Days 10-11)
- [ ] Extend `MatchService.js` for blackjack
- [ ] Add blackjack to Challenge/Match enums
- [ ] Create `BlackjackP2P.jsx` wrapper component
- [ ] Implement P2P turn system
- [ ] Integrate with existing challenge flow
- [ ] Test with token wagering
- [ ] Verify settlement flow works

### Phase 6: Polish & Optimization (Days 12-13)
- [ ] Mobile portrait mode optimization
- [ ] Touch controls for mobile
- [ ] Performance profiling & optimization
- [ ] LOD system for lower-end devices
- [ ] Add dealer penguin in dealer vest/bowtie
- [ ] Ambient casino environment (background blur, particles)
- [ ] Sound mix balancing

### Phase 7: Testing & Launch (Days 14-15)
- [ ] Full E2E testing (PvE + P2P)
- [ ] Load testing PvE tables
- [ ] Cross-browser testing
- [ ] Mobile device testing (iOS/Android)
- [ ] Token wager settlement verification
- [ ] Update changelogs
- [ ] Deploy to production

### Stretch Goals (Post-Launch)
- [ ] Tournament mode
- [ ] Leaderboards (biggest wins)
- [ ] Side bets (insurance, perfect pairs)
- [ ] Multiple hand positions (3 hands)
- [ ] VR support (WebXR)

---

## Testing Plan

### Unit Tests
```javascript
// __tests__/BlackjackEngine.test.js

describe('BlackjackEngine', () => {
    describe('calculateHandValue', () => {
        it('should calculate simple hand correctly');
        it('should handle soft hands (ace as 11)');
        it('should convert ace to 1 when needed');
        it('should detect blackjack');
        it('should detect bust');
    });
    
    describe('dealerShouldHit', () => {
        it('should hit on 16');
        it('should stand on 17');
        it('should stand on soft 17');
    });
    
    describe('canSplit', () => {
        it('should allow split on pairs');
        it('should allow split on 10-value cards');
        it('should not allow split on non-pairs');
    });
});
```

### Integration Tests
```javascript
// __tests__/BlackjackService.test.js

describe('BlackjackService', () => {
    describe('PvE flow', () => {
        it('should deduct bet on game start');
        it('should handle hit action');
        it('should handle stand action');
        it('should handle double down');
        it('should handle split');
        it('should pay out correctly on win');
        it('should pay 3:2 on blackjack');
        it('should return bet on push');
    });
});
```

### E2E Tests
- [ ] PvE: Complete game at each table tier
- [ ] PvE: Blackjack payout verification
- [ ] PvE: Split and double down
- [ ] P2P: Challenge flow with coin wager
- [ ] P2P: Challenge flow with token wager
- [ ] P2P: Timeout handling
- [ ] Mobile: Portrait mode playability

---

## Open Questions

1. **Insurance**: Include insurance betting? (Adds complexity)
2. **Surrender**: Allow late surrender? (House edge consideration)
3. **Leaderboards**: Track biggest wins? Daily/weekly boards?
4. **Tournaments**: Future tournament mode?
5. **Table Limits**: Should VIP table require level/achievement unlock?

---

## Appendix A: Post-Processing Setup

```javascript
// Premium post-processing pipeline
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

function setupPostProcessing(renderer, scene, camera, quality) {
    const composer = new EffectComposer(renderer);
    
    // Base render
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    if (quality.postProcessing.includes('ssao')) {
        // Screen Space Ambient Occlusion
        const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
        ssaoPass.kernelRadius = 16;
        ssaoPass.minDistance = 0.005;
        ssaoPass.maxDistance = 0.1;
        composer.addPass(ssaoPass);
    }
    
    if (quality.postProcessing.includes('bloom')) {
        // Bloom for neon/chip glow
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        composer.addPass(bloomPass);
    }
    
    if (quality.postProcessing.includes('dof')) {
        // Depth of field for cinematic focus
        const bokehPass = new BokehPass(scene, camera, {
            focus: 5.0,
            aperture: 0.002,
            maxblur: 0.01,
            width: window.innerWidth,
            height: window.innerHeight
        });
        composer.addPass(bokehPass);
    }
    
    if (quality.postProcessing.includes('fxaa') || quality.postProcessing.includes('smaa')) {
        // Anti-aliasing (SMAA is better quality)
        const smaaPass = new SMAAPass(
            window.innerWidth * renderer.getPixelRatio(),
            window.innerHeight * renderer.getPixelRatio()
        );
        composer.addPass(smaaPass);
    }
    
    return composer;
}
```

## Appendix B: HDR Environment Loading

```javascript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

async function loadCasinoEnvironment(scene, renderer) {
    const loader = new RGBELoader();
    
    // Load HDR environment map
    const hdri = await loader.loadAsync('assets/env/casino_interior_4k.hdr');
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    
    // Set as scene background (with blur for depth)
    scene.background = hdri;
    scene.environment = hdri; // For PBR reflections
    
    // Optional: Create blurred version for background
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromEquirectangular(hdri).texture;
    
    scene.environment = envMap;
    
    hdri.dispose();
    pmremGenerator.dispose();
    
    return envMap;
}
```

## Appendix C: Dealer Penguin Outfit

```javascript
// Dealer penguin customization
const DEALER_APPEARANCE = {
    color: '#1a1a2e',           // Dark navy body
    bellyColor: '#ffffff',       // White belly
    beakColor: '#ff9500',        // Orange beak
    
    // Special dealer outfit
    outfit: {
        vest: {
            color: '#8b0000',    // Deep red vest
            buttons: '#ffd700',  // Gold buttons
            pattern: 'pinstripe'
        },
        bowtie: {
            color: '#000000',    // Black bowtie
            style: 'classic'
        },
        armBands: {
            color: '#ffd700',    // Gold armbands
            position: 'upper'
        },
        visor: {
            enabled: true,
            color: '#1a1a1a',
            text: 'DEALER'
        }
    },
    
    // Dealer-specific animations
    animations: {
        idle: {
            type: 'breathing',
            speed: 0.5
        },
        deal: {
            type: 'arm_motion',
            duration: 0.4
        },
        flip: {
            type: 'wrist_flip',
            duration: 0.3
        },
        celebrate: {
            type: 'clap',
            duration: 1.0
        },
        condolence: {
            type: 'shrug',
            duration: 0.8
        }
    }
};
```

## Appendix D: Mobile Touch Controls

```javascript
// Touch-optimized controls for mobile
class BlackjackTouchController {
    constructor(container, game) {
        this.container = container;
        this.game = game;
        this.touchStartY = 0;
        
        this.setupGestures();
    }
    
    setupGestures() {
        // Swipe up = Hit
        // Swipe down = Stand
        // Swipe left = Split (if available)
        // Swipe right = Double (if available)
        // Tap = Select/Confirm
        
        let startX, startY, startTime;
        
        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        });
        
        this.container.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const duration = Date.now() - startTime;
            
            // Quick tap = select
            if (Math.abs(deltaX) < 30 && Math.abs(deltaY) < 30 && duration < 200) {
                this.game.handleTap(endX, endY);
                return;
            }
            
            // Swipe detection
            const minSwipe = 50;
            
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                // Vertical swipe
                if (deltaY < -minSwipe) {
                    this.game.handleAction('hit');
                    this.showGestureIndicator('↑ HIT');
                } else if (deltaY > minSwipe) {
                    this.game.handleAction('stand');
                    this.showGestureIndicator('↓ STAND');
                }
            } else {
                // Horizontal swipe
                if (deltaX < -minSwipe && this.game.canSplit()) {
                    this.game.handleAction('split');
                    this.showGestureIndicator('← SPLIT');
                } else if (deltaX > minSwipe && this.game.canDouble()) {
                    this.game.handleAction('double');
                    this.showGestureIndicator('→ DOUBLE');
                }
            }
        });
    }
    
    showGestureIndicator(text) {
        const indicator = document.createElement('div');
        indicator.className = 'gesture-indicator';
        indicator.textContent = text;
        this.container.appendChild(indicator);
        
        gsap.fromTo(indicator, 
            { opacity: 1, scale: 1.5 },
            { opacity: 0, scale: 2, duration: 0.5, onComplete: () => indicator.remove() }
        );
    }
}
```

## Appendix E: UI Overlay (React)

```jsx
// Betting UI overlay on top of 3D scene
const BlackjackUI = ({ gameState, onAction, balance }) => {
    const [selectedBet, setSelectedBet] = useState(10);
    
    const chipValues = [1, 5, 25, 100, 500];
    
    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Top bar - balance and info */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-auto">
                <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-lg">
                    <span className="text-yellow-400 font-bold">💰 {balance.toLocaleString()}</span>
                </div>
                
                {gameState.phase === 'playing' && (
                    <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-lg">
                        <span className="text-white">
                            {gameState.isPlayerTurn ? '🎯 Your Turn' : '⏳ Dealer...'}
                        </span>
                    </div>
                )}
            </div>
            
            {/* Betting phase - chip selector */}
            {gameState.phase === 'betting' && (
                <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4 pointer-events-auto">
                    {/* Chip selector */}
                    <div className="flex gap-2">
                        {chipValues.map(value => (
                            <button
                                key={value}
                                onClick={() => setSelectedBet(prev => prev + value)}
                                disabled={balance < value}
                                className={`
                                    w-16 h-16 rounded-full font-bold text-sm
                                    transform hover:scale-110 transition-transform
                                    ${value === 1 ? 'bg-white text-black' : ''}
                                    ${value === 5 ? 'bg-red-600 text-white' : ''}
                                    ${value === 25 ? 'bg-green-600 text-white' : ''}
                                    ${value === 100 ? 'bg-gray-900 text-yellow-400 border-2 border-yellow-400' : ''}
                                    ${value === 500 ? 'bg-purple-600 text-yellow-400' : ''}
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    shadow-lg
                                `}
                            >
                                ${value}
                            </button>
                        ))}
                    </div>
                    
                    {/* Bet display and actions */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedBet(0)}
                            className="px-4 py-2 bg-red-600 rounded-lg text-white"
                        >
                            Clear
                        </button>
                        
                        <div className="bg-black/80 px-6 py-3 rounded-lg min-w-[120px] text-center">
                            <span className="text-yellow-400 text-2xl font-bold">
                                ${selectedBet}
                            </span>
                        </div>
                        
                        <button
                            onClick={() => onAction('deal', selectedBet)}
                            disabled={selectedBet === 0}
                            className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg text-white font-bold disabled:opacity-50"
                        >
                            DEAL
                        </button>
                    </div>
                </div>
            )}
            
            {/* Playing phase - action buttons */}
            {gameState.phase === 'playing' && gameState.isPlayerTurn && (
                <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 pointer-events-auto">
                    <ActionButton onClick={() => onAction('hit')} color="blue">
                        HIT
                    </ActionButton>
                    <ActionButton onClick={() => onAction('stand')} color="red">
                        STAND
                    </ActionButton>
                    {gameState.canDouble && (
                        <ActionButton onClick={() => onAction('double')} color="yellow">
                            DOUBLE
                        </ActionButton>
                    )}
                    {gameState.canSplit && (
                        <ActionButton onClick={() => onAction('split')} color="purple">
                            SPLIT
                        </ActionButton>
                    )}
                </div>
            )}
            
            {/* Hand value display */}
            {gameState.phase !== 'betting' && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2">
                    <div className="bg-black/80 backdrop-blur px-4 py-2 rounded-full">
                        <span className="text-white text-xl font-bold">
                            {gameState.playerValue}
                            {gameState.isSoft && <span className="text-gray-400 text-sm ml-1">(soft)</span>}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActionButton = ({ onClick, color, children }) => {
    const colors = {
        blue: 'from-blue-600 to-blue-800 hover:from-blue-500',
        red: 'from-red-600 to-red-800 hover:from-red-500',
        yellow: 'from-yellow-500 to-yellow-700 hover:from-yellow-400',
        purple: 'from-purple-600 to-purple-800 hover:from-purple-500'
    };
    
    return (
        <button
            onClick={onClick}
            className={`
                px-6 py-4 rounded-xl font-bold text-white text-lg
                bg-gradient-to-b ${colors[color]}
                shadow-lg transform active:scale-95 transition-transform
                min-w-[100px]
            `}
        >
            {children}
        </button>
    );
};
```

---

## Asset Checklist

### 3D Models (GLB/GLTF)
- [ ] `blackjack_table.glb` - Casino table with chip rail
- [ ] `card_shoe.glb` - 6-deck card shoe
- [ ] `discard_tray.glb` - Card discard tray
- [ ] `penguin_dealer.glb` - Dealer penguin with outfit bones

### Textures
- [ ] `felt_diffuse.jpg` - Green felt (2K)
- [ ] `felt_normal.jpg` - Felt bump map
- [ ] `wood_diffuse.jpg` - Mahogany wood (2K)
- [ ] `wood_normal.jpg` - Wood grain normal
- [ ] `wood_roughness.jpg` - Wood roughness map
- [ ] `chip_normal.jpg` - Chip edge detail

### Environment
- [ ] `casino_interior_4k.hdr` - HDR environment map

### Audio
- [ ] `card_slide.mp3` - Card from shoe
- [ ] `card_flip.mp3` - Card flip
- [ ] `card_place.mp3` - Card on table
- [ ] `chip_slide.mp3` - Chip movement
- [ ] `chip_stack.mp3` - Chip landing
- [ ] `win_chime.mp3` - Win sound
- [ ] `blackjack_fanfare.mp3` - Blackjack celebration
- [ ] `casino_ambience.mp3` - Background loop

---

*Document created: December 2024*
*Last updated: December 2024*
*Quality Target: AAA Casino Experience*

