<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Voxel Royale Blackjack</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap');

        body { margin: 0; overflow: hidden; background-color: #1a1a1a; font-family: 'Montserrat', sans-serif; user-select: none; }
        #game-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

        /* UI Layer */
        #ui-layer {
            position: absolute; inset: 0; pointer-events: none;
            display: flex; flex-direction: column; justify-content: space-between;
        }

        /* HUD Header */
        .hud-header {
            padding: 30px; display: flex; justify-content: space-between; align-items: flex-start;
        }
        .balance-pill {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(10px);
            padding: 15px 30px;
            border-radius: 50px;
            border: 1px solid rgba(255, 215, 0, 0.3);
            color: #ffd700;
            display: flex; flex-direction: column; align-items: flex-end;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            pointer-events: auto;
        }
        .balance-label { font-size: 0.8rem; letter-spacing: 2px; text-transform: uppercase; color: #aaa; }
        .balance-amount { font-size: 2rem; font-weight: 900; }
        
        /* Game Messages */
        #message-area {
            position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%);
            text-align: center; pointer-events: none; z-index: 10;
        }
        .message-bubble {
            background: rgba(255, 255, 255, 0.95);
            color: #222;
            padding: 20px 40px;
            border-radius: 20px;
            font-weight: 900;
            font-size: 2rem;
            box-shadow: 0 20px 50px rgba(0,0,0,0.4);
            opacity: 0; transform: translateY(20px) scale(0.9);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .message-bubble.visible { opacity: 1; transform: translateY(0) scale(1); }

        /* Controls Footer */
        .hud-footer {
            padding: 40px; display: flex; justify-content: center; gap: 20px;
            background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
            pointer-events: auto;
        }

        .btn {
            background: white; color: #222; border: none;
            padding: 15px 40px; border-radius: 12px;
            font-family: 'Montserrat', sans-serif;
            font-weight: 900; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px;
            cursor: pointer;
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            transition: transform 0.1s, background 0.2s, opacity 0.2s;
            opacity: 0.5; pointer-events: none; transform: translateY(100px);
        }
        .btn.active { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(0,0,0,0.4); }
        .btn:active { transform: translateY(1px); }

        .btn-hit { background: #2ed573; color: white; }
        .btn-stand { background: #ff4757; color: white; }
        .btn-double { background: #ffa502; color: white; }
        .btn-deal { background: #fff; color: #222; width: 200px; font-size: 1.5rem; }

        /* Chip Selection UI (Only visible during betting) */
        #chip-selector {
            position: absolute; bottom: 140px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 15px; opacity: 0; transition: opacity 0.3s; pointer-events: none;
        }
        #chip-selector.visible { opacity: 1; pointer-events: auto; }
        .chip-btn {
            width: 60px; height: 60px; border-radius: 50%;
            border: 4px dashed rgba(255,255,255,0.2);
            background: rgba(0,0,0,0.5);
            color: white; font-weight: bold; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            transition: 0.2s;
        }
        .chip-btn:hover { transform: scale(1.1); background: rgba(0,0,0,0.8); border-color: white; }

        #bet-display {
            position: absolute; bottom: 220px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.7); color: white; padding: 10px 20px; border-radius: 20px;
            font-weight: bold; opacity: 0; transition: opacity 0.3s;
        }
        #bet-display.visible { opacity: 1; }

    </style>
</head>
<body>

<div id="game-container"></div>

<div id="ui-layer">
    <div class="hud-header">
        <div style="color:rgba(255,255,255,0.3); font-weight:900; font-size:1.5rem;">VOXEL ROYALE</div>
        <div class="balance-pill">
            <span class="balance-label">Bankroll</span>
            <span class="balance-amount">$<span id="ui-balance">1000</span></span>
        </div>
    </div>

    <div id="message-area">
        <div class="message-bubble" id="main-message">BLACKJACK</div>
    </div>

    <div id="bet-display">Current Bet: $<span id="ui-current-bet">0</span></div>

    <div id="chip-selector">
        <div class="chip-btn" onclick="game.addBet(10)">10</div>
        <div class="chip-btn" onclick="game.addBet(50)">50</div>
        <div class="chip-btn" onclick="game.addBet(100)">100</div>
        <div class="chip-btn" onclick="game.addBet(500)">500</div>
        <div class="chip-btn" style="border-color: #ff4757; color:#ff4757" onclick="game.clearBet()">X</div>
    </div>

    <div class="hud-footer">
        <button class="btn btn-hit" id="btn-hit" onclick="game.hit()">Hit</button>
        <button class="btn btn-stand" id="btn-stand" onclick="game.stand()">Stand</button>
        <button class="btn btn-double" id="btn-double" onclick="game.double()">Double</button>
        <button class="btn btn-deal" id="btn-deal" onclick="game.deal()">DEAL</button>
    </div>
</div>

<script>
/** * VOXEL ROYALE BLACKJACK ENGINE */

// --- UTILITIES ---
const MathUtils = {
    randFloat: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),
    delay: (ms) => new Promise(res => setTimeout(res, ms))
};

// --- ASSET FACTORY ---
class AssetFactory {
    constructor() {
        this.textures = {};
    }

    createCardTexture(suit, value) {
        const id = `${suit}_${value}`;
        if (this.textures[id]) return this.textures[id];

        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 768;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        const color = (suit === '♥' || suit === '♦') ? '#e74c3c' : '#2c3e50';
        ctx.fillStyle = color;
        ctx.font = 'bold 100px Montserrat';
        ctx.textAlign = 'center';
        ctx.fillText(value, 70, 110);
        ctx.font = '80px Montserrat';
        ctx.fillText(suit, 70, 200);

        ctx.font = '240px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (['K','Q','J'].includes(value)) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 10;
            ctx.strokeRect(120, 150, 272, 468);
            ctx.fillText(value, 256, 384);
        } else {
            ctx.fillText(suit, 256, 384);
        }
        
        ctx.save();
        ctx.translate(512-70, 768-110);
        ctx.rotate(Math.PI);
        ctx.fillStyle = color;
        ctx.font = 'bold 100px Montserrat';
        ctx.fillText(value, 0, 0);
        ctx.font = '80px Montserrat';
        ctx.fillText(suit, 0, -90);
        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        tex.anisotropy = 16;
        this.textures[id] = tex;
        return tex;
    }

    createBackTexture() {
        if(this.textures['back']) return this.textures['back'];
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 768;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#c0392b';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        for(let i=0; i<20; i++) {
            for(let j=0; j<30; j++) {
                ctx.beginPath();
                ctx.arc(25 + i*25, 25 + j*25, 8, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("VOXEL", 256, 350);
        ctx.fillText("ROYALE", 256, 410);

        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        this.textures['back'] = tex;
        return tex;
    }

    createChipTexture(value) {
        const id = `chip_${value}`;
        if(this.textures[id]) return this.textures[id];
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const colors = { 10: '#fff', 50: '#e74c3c', 100: '#2c3e50', 500: '#f1c40f' };
        const baseColor = colors[value] || '#fff';

        ctx.fillStyle = baseColor;
        ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#fff';
        for(let i=0; i<8; i++) {
            ctx.save();
            ctx.translate(128, 128);
            ctx.rotate(i * (Math.PI/4));
            ctx.fillRect(100, -15, 28, 30);
            ctx.restore();
        }

        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI*2); 
        ctx.strokeStyle = 'white'; ctx.lineWidth = 5; ctx.stroke();
        ctx.fillStyle = baseColor; ctx.fill();

        ctx.fillStyle = (value === 500 || value === 10) ? '#222' : '#fff';
        ctx.font = 'bold 80px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value, 128, 128);

        const tex = new THREE.CanvasTexture(canvas);
        this.textures[id] = tex;
        return tex;
    }

    createFeltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#216c46'; 
        ctx.fillRect(0,0,1024,1024);
        
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.1;
        for(let i=0; i<50000; i++) {
            ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
        }
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(512, -200, 600, 0, Math.PI);
        ctx.stroke();

        ctx.font = 'bold 40px Montserrat';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText("BLACKJACK PAYS 3 TO 2", 512, 300);
        ctx.font = 'bold 30px Montserrat';
        ctx.fillText("DEALER MUST STAND ON 17 AND DRAW TO 16", 512, 350);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 16;
        tex.encoding = THREE.sRGBEncoding;
        return tex;
    }

    roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

// --- VOXEL BUILDER ---
class VoxelBuilder {
    constructor(scene) {
        this.scene = scene;
        // FIX: Removed vertexColors: true which was causing the black texture issue
        this.material = new THREE.MeshStandardMaterial({ 
            roughness: 0.8, 
            metalness: 0.1 
        });
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    }

    buildGroup(voxels, scale=1) {
        const group = new THREE.Group();
        voxels.forEach(v => {
            const mesh = new THREE.Mesh(this.cubeGeo, this.material.clone());
            mesh.material.color.setHex(v.color);
            mesh.position.set(v.x, v.y, v.z);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
        });
        group.scale.set(scale, scale, scale);
        return group;
    }
}

// --- DEALER CLASS (PENGRU ROYAL) ---
class Dealer {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.group.position.set(0, 0.4, -22); 
        this.buildPenguin();
        
        this.state = 'idle';
        this.lookTarget = new THREE.Vector3(0,0,0);
        this.clock = new THREE.Clock();
        this.emoting = false;
    }

    buildPenguin() {
        const builder = new VoxelBuilder(this.scene);
        
        const BLUE = 0x3498db;    
        const WHITE = 0xecf0f1;   
        const ORANGE = 0xf39c12;  
        const BLACK = 0x111111;   
        const GOLD = 0xffd700;    
        const RED = 0xe74c3c;

        // --- BODY ---
        const bodyVoxels = [];
        for(let x=-4; x<=4; x++) {
            for(let y=0; y<8; y++) {
                for(let z=-3; z<=3; z++) {
                    if(Math.abs(x)+Math.abs(z) > 6) continue;
                    let color = BLUE;
                    if(z > 1 && x >= -3 && x <= 3 && y < 6) color = WHITE; 
                    bodyVoxels.push({x, y, z, color});
                }
            }
        }
        
        // Scarf
        for(let x=-4; x<=4; x++) {
            for(let z=-3; z<=3; z++) {
                if(Math.abs(x)+Math.abs(z) > 6) continue;
                if(Math.abs(x)===2 || Math.abs(z)===2) {} // Just a simple loop
            }
        }
        // Gold Chain
        for(let x=-3; x<=3; x++) {
            if(Math.abs(x) === 3) continue;
            bodyVoxels.push({x, y: 6, z: 3.2, color: GOLD});
        }
        // Pendant
        bodyVoxels.push({x: 0, y: 4, z: 3.5, color: GOLD});
        bodyVoxels.push({x: -1, y: 5, z: 3.4, color: GOLD});
        bodyVoxels.push({x: 1, y: 5, z: 3.4, color: GOLD});

        this.body = builder.buildGroup(bodyVoxels, 0.6);
        this.group.add(this.body);

        // --- HEAD ---
        const headVoxels = [];
        for(let x=-3; x<=3; x++) {
            for(let y=0; y<5; y++) {
                for(let z=-3; z<=3; z++) {
                    if(Math.abs(x)+Math.abs(z) > 5) continue;
                    let color = BLUE;
                    if(z > 1 && y < 3) color = WHITE;
                    headVoxels.push({x, y, z, color});
                }
            }
        }
        // Beak
        headVoxels.push({x:0, y:1, z:3.5, color: ORANGE});
        headVoxels.push({x:0, y:1, z:4, color: ORANGE});
        headVoxels.push({x:-1, y:1, z:3.5, color: ORANGE});
        headVoxels.push({x:1, y:1, z:3.5, color: ORANGE});
        
        // Eyes
        const eyeColor = BLACK;
        headVoxels.push({x:-1.5, y:2, z:3.1, color: eyeColor});
        headVoxels.push({x:-2.5, y:2, z:3.1, color: eyeColor});
        headVoxels.push({x:-1.5, y:3, z:3.1, color: eyeColor});
        headVoxels.push({x:-2.5, y:3, z:3.1, color: eyeColor});

        headVoxels.push({x:1.5, y:2, z:3.1, color: eyeColor});
        headVoxels.push({x:2.5, y:2, z:3.1, color: eyeColor});
        headVoxels.push({x:1.5, y:3, z:3.1, color: eyeColor});
        headVoxels.push({x:2.5, y:3, z:3.1, color: eyeColor});

        this.head = builder.buildGroup(headVoxels, 0.6);
        this.head.position.set(0, 5, 0); 
        this.group.add(this.head);

        // --- HALO ---
        const haloVoxels = [];
        for(let x=-3; x<=3; x++) {
            for(let z=-3; z<=3; z++) {
                if(x*x + z*z > 4 && x*x + z*z < 12) {
                     haloVoxels.push({x, y:0, z, color: GOLD});
                }
            }
        }
        this.halo = builder.buildGroup(haloVoxels, 0.4); 
        this.halo.position.set(0, 9, 0); 
        this.group.add(this.halo);

        // --- WINGS ---
        const wingVoxels = [];
        for(let x=0; x<1; x++) for(let y=-2; y<3; y++) for(let z=-1; z<2; z++) {
             wingVoxels.push({x,y,z,color:BLUE});
        }
        this.leftWing = builder.buildGroup(wingVoxels, 0.6);
        this.leftWing.position.set(3, 3, 0);
        this.group.add(this.leftWing);

        this.rightWing = builder.buildGroup(wingVoxels, 0.6);
        this.rightWing.position.set(-3, 3, 0);
        this.group.add(this.rightWing);

        // --- FEET ---
        const footVoxels = [];
        for(let x=-1; x<=1; x++) for(let z=-2; z<=1; z++) footVoxels.push({x,y:0,z,color:ORANGE});
        this.leftFoot = builder.buildGroup(footVoxels, 0.6);
        this.leftFoot.position.set(1.5, 0, 1.5);
        this.group.add(this.leftFoot);

        this.rightFoot = builder.buildGroup(footVoxels, 0.6);
        this.rightFoot.position.set(-1.5, 0, 1.5);
        this.group.add(this.rightFoot);
    }

    update(dt) {
        const time = this.clock.getElapsedTime();
        if(!this.emoting) {
            this.group.scale.y = 1 + Math.sin(time * 3) * 0.02;
            this.halo.position.y = 9 + Math.sin(time * 2) * 0.2;
            this.halo.rotation.y += dt;
            const lookPos = this.lookTarget.clone();
            lookPos.y = this.head.position.y;
            const dummy = new THREE.Object3D();
            dummy.position.copy(this.group.position);
            dummy.position.y += 5;
            dummy.lookAt(lookPos);
            this.head.quaternion.slerp(dummy.quaternion, 0.1);
        }
    }

    lookAt(x, y, z) {
        this.lookTarget.set(x, y, z);
    }

    emote(type) {
        this.emoting = true;
        const reset = () => {
             this.emoting = false;
             new TWEEN.Tween(this.group.position).to({y: 0}, 300).start();
             new TWEEN.Tween(this.group.rotation).to({y: 0, x:0, z:0}, 300).start();
             new TWEEN.Tween(this.head.rotation).to({x: 0, y:0, z:0}, 300).start();
        };

        if(type === 'win') { 
            new TWEEN.Tween(this.group.position).to({y: 2}, 150).yoyo(true).repeat(3).start();
            new TWEEN.Tween(this.group.rotation).to({y: Math.PI * 2}, 600)
                .easing(TWEEN.Easing.Cubic.Out).onComplete(reset).start();
            new TWEEN.Tween(this.leftWing.rotation).to({z: -2.5}, 200).yoyo(true).repeat(3).start();
            new TWEEN.Tween(this.rightWing.rotation).to({z: 2.5}, 200).yoyo(true).repeat(3).start();
        } else if (type === 'lose') { 
            new TWEEN.Tween(this.group.position).to({y: -1}, 200).easing(TWEEN.Easing.Quadratic.Out).start();
            new TWEEN.Tween(this.head.rotation).to({x: 0.8}, 500).easing(TWEEN.Easing.Elastic.Out)
                .onComplete(() => setTimeout(reset, 1000)).start();
            new TWEEN.Tween(this.leftWing.rotation).to({z: 0}, 400).start();
            new TWEEN.Tween(this.rightWing.rotation).to({z: 0}, 400).start();
        } else if (type === 'deal') {
            new TWEEN.Tween(this.rightWing.rotation).to({x: -1.5, z: 1.0}, 150)
                .yoyo(true).repeat(1).onComplete(() => this.emoting = false).start();
            new TWEEN.Tween(this.group.rotation).to({y: -0.2}, 150).yoyo(true).repeat(1).start();
        }
    }
}

// --- ENGINE ---
class Engine {
    constructor() {
        this.container = document.getElementById('game-container');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.015);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 22, 35);
        this.camera.lookAt(0, -2, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.assets = new AssetFactory();
        this.dealer = new Dealer(this.scene);
        this.objects = []; 

        this.setupLights();
        this.createEnvironment();

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', e => this.onMouseMove(e));
        window.addEventListener('click', e => this.onClick(e));

        this.animate();
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6); // Increased ambient slightly
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); // Brighter sun
        dirLight.position.set(5, 25, 20); // Moved light forward
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        this.scene.add(dirLight);

        // Fixed Rim Light Target
        const rim = new THREE.SpotLight(0x4444ff, 3.0); // Brighter rim
        rim.position.set(-20, 15, -10);
        
        // Create a target object for the spotlight to point at the dealer
        const rimTarget = new THREE.Object3D();
        rimTarget.position.set(0, 5, -22);
        this.scene.add(rimTarget);
        rim.target = rimTarget;
        
        this.scene.add(rim);
    }

    createEnvironment() {
        const geo = new THREE.PlaneGeometry(60, 40);
        const mat = new THREE.MeshStandardMaterial({ 
            map: this.assets.createFeltTexture(),
            roughness: 0.9,
            metalness: 0.1
        });
        const table = new THREE.Mesh(geo, mat);
        table.rotation.x = -Math.PI / 2;
        table.receiveShadow = true;
        this.scene.add(table);
        
        const woodGeo = new THREE.BoxGeometry(62, 2, 42);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.4 });
        const rim = new THREE.Mesh(woodGeo, woodMat);
        rim.position.y = -1.01;
        rim.receiveShadow = true;
        this.scene.add(rim);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onMouseMove(e) {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.05;
        this.dealer.lookAt(this.mouse.x * 10, 0, 10);
    }

    onClick() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects);
        if(intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData.onClick) obj.userData.onClick();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        TWEEN.update();
        const dt = this.dealer.clock.getDelta();
        this.dealer.update(dt);
        this.renderer.render(this.scene, this.camera);
    }

    spawnCard(cardData, startPos, endPos, delay=0) {
        const tex = this.assets.createCardTexture(cardData.suit, cardData.value);
        const backTex = this.assets.createBackTexture();
        const geo = new THREE.BoxGeometry(3.5, 5, 0.05);
        const mat = [
            new THREE.MeshStandardMaterial({color:0xffffff}),
            new THREE.MeshStandardMaterial({color:0xffffff}),
            new THREE.MeshStandardMaterial({color:0xffffff}),
            new THREE.MeshStandardMaterial({color:0xffffff}),
            new THREE.MeshStandardMaterial({map: tex}), 
            new THREE.MeshStandardMaterial({map: backTex})
        ];

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(startPos);
        
        mesh.rotation.x = -Math.PI/2; 
        mesh.rotation.z = Math.PI; 

        this.scene.add(mesh);

        const targetRotX = -Math.PI/2; 
        const targetRotZ = (Math.random() - 0.5) * 0.2; 
        const targetRotY = (cardData.hidden) ? Math.PI : 0; 

        new TWEEN.Tween(mesh.position)
            .to(endPos, 600)
            .easing(TWEEN.Easing.Cubic.Out)
            .delay(delay)
            .start();

        new TWEEN.Tween(mesh.rotation)
            .to({x: targetRotX, y: targetRotY, z: targetRotZ}, 600)
            .easing(TWEEN.Easing.Cubic.Out)
            .delay(delay)
            .onStart(() => this.dealer.emote('deal'))
            .start();

        return mesh;
    }

    spawnChip(value, pos) {
        const tex = this.assets.createChipTexture(value);
        const geo = new THREE.CylinderGeometry(1.5, 1.5, 0.4, 32);
        const mat = new THREE.MeshStandardMaterial({ 
            map: tex, 
            roughness: 0.5, 
            metalness: 0.1,
            color: 0xeeeeee 
        });
        
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xdddddd }), 
            new THREE.MeshStandardMaterial({ map: tex }), 
            new THREE.MeshStandardMaterial({ map: tex }) 
        ];

        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(pos.x, pos.y + 10, pos.z); 
        mesh.rotation.y = Math.random() * Math.PI;

        this.scene.add(mesh);

        new TWEEN.Tween(mesh.position)
            .to(pos, 400)
            .easing(TWEEN.Easing.Bounce.Out)
            .start();
        
        return mesh;
    }
}

// --- GAME LOGIC ---
class BlackjackGame {
    constructor() {
        this.engine = new Engine();
        
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.balance = 1000;
        this.currentBet = 0;
        this.gameState = 'BETTING'; 
        this.chipsOnTable = [];
        this.cardsOnTable = [];

        this.ui = {
            balance: document.getElementById('ui-balance'),
            bet: document.getElementById('ui-current-bet'),
            msg: document.getElementById('main-message'),
            chipSelector: document.getElementById('chip-selector'),
            betDisplay: document.getElementById('bet-display'),
            btns: {
                hit: document.getElementById('btn-hit'),
                stand: document.getElementById('btn-stand'),
                double: document.getElementById('btn-double'),
                deal: document.getElementById('btn-deal')
            }
        };

        this.updateUI();
        this.toggleButtons(false);
        this.ui.chipSelector.classList.add('visible');
        this.ui.betDisplay.classList.add('visible');
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        this.deck = [];
        for(let s of suits) {
            for(let v of values) {
                this.deck.push({suit: s, value: v, hidden: false});
            }
        }
        for(let i=this.deck.length-1; i>0; i--) {
            const j = Math.floor(Math.random()*(i+1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    addBet(amount) {
        if(this.balance >= amount) {
            this.balance -= amount;
            this.currentBet += amount;
            
            const x = MathUtils.randFloat(-2, 2);
            const z = MathUtils.randFloat(8, 10);
            const y = 0.2 + this.chipsOnTable.length * 0.45;
            const chip = this.engine.spawnChip(amount, {x, y, z});
            this.chipsOnTable.push(chip);
            
            this.updateUI();
            
            if(this.currentBet > 0) {
                this.ui.btns.deal.classList.add('active');
            }
        }
    }

    clearBet() {
        if(this.gameState !== 'BETTING') return;
        this.balance += this.currentBet;
        this.currentBet = 0;
        this.chipsOnTable.forEach(c => this.engine.scene.remove(c));
        this.chipsOnTable = [];
        this.updateUI();
        this.ui.btns.deal.classList.remove('active');
    }

    async deal() {
        if(this.currentBet === 0) return;
        
        this.gameState = 'PLAYING';
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.cardsOnTable.forEach(c => this.engine.scene.remove(c));
        this.cardsOnTable = [];

        this.ui.chipSelector.classList.remove('visible');
        this.ui.betDisplay.classList.remove('visible');
        this.ui.btns.deal.classList.remove('active');
        this.showMessage("");

        await this.dealCard('player', 0);
        await this.dealCard('dealer', 1, false); 
        await this.dealCard('player', 2);
        await this.dealCard('dealer', 3, true); 

        const pScore = this.calculateScore(this.playerHand);
        if(pScore === 21) {
            await MathUtils.delay(500);
            this.stand(); 
        } else {
            this.toggleButtons(true);
        }
    }

    async dealCard(who, index, hidden=false) {
        const card = this.deck.pop();
        card.hidden = hidden;
        if(who === 'player') this.playerHand.push(card);
        else this.dealerHand.push(card);

        const startPos = {x: 0, y: 5, z: -25}; 
        let endPos;

        if(who === 'player') {
            const offset = (this.playerHand.length - 1) * 2;
            endPos = {x: -2 + offset, y: 0.1 + index*0.02, z: 12};
        } else {
            const offset = (this.dealerHand.length - 1) * 2;
            endPos = {x: -2 + offset, y: 0.1 + index*0.02, z: -2};
        }

        const mesh = this.engine.spawnCard(card, startPos, endPos);
        mesh.userData.cardInfo = card;
        this.cardsOnTable.push(mesh); 
        
        if(hidden) this.holeCardMesh = mesh;

        await MathUtils.delay(400);
    }

    hit() {
        this.dealCard('player', this.playerHand.length + this.dealerHand.length);
        const score = this.calculateScore(this.playerHand);
        if(score > 21) {
            this.toggleButtons(false);
            this.endRound('BUST');
        }
    }

    async stand() {
        this.toggleButtons(false);
        this.gameState = 'DEALER_TURN';
        
        const holeCardData = this.dealerHand[1];
        holeCardData.hidden = false;
        new TWEEN.Tween(this.holeCardMesh.rotation).to({y: 0}, 400).start();
        
        await MathUtils.delay(800);

        while(this.calculateScore(this.dealerHand) < 17) {
            await this.dealCard('dealer', 10);
            await MathUtils.delay(800);
        }

        this.resolve();
    }

    double() {
        if(this.balance >= this.currentBet) {
            this.balance -= this.currentBet;
            
            const x = MathUtils.randFloat(-2, 2);
            const z = MathUtils.randFloat(8, 10);
            const chip = this.engine.spawnChip(this.currentBet, {x, y: 2, z});
            this.chipsOnTable.push(chip);
            
            this.currentBet *= 2;
            this.updateUI();
            
            this.hit(); 
            if(this.calculateScore(this.playerHand) <= 21) {
                this.stand();
            }
        }
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        hand.forEach(c => {
            if(['J','Q','K'].includes(c.value)) score += 10;
            else if(c.value === 'A') { score += 11; aces++; }
            else score += parseInt(c.value);
        });
        while(score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }

    resolve() {
        const pScore = this.calculateScore(this.playerHand);
        const dScore = this.calculateScore(this.dealerHand);

        if (pScore > 21) this.endRound('BUST');
        else if (dScore > 21) this.endRound('WIN');
        else if (pScore > dScore) this.endRound('WIN');
        else if (pScore < dScore) this.endRound('LOSE');
        else this.endRound('PUSH');
    }

    endRound(result) {
        this.gameState = 'END';
        
        if(result === 'WIN') {
            this.showMessage("YOU WIN!");
            this.balance += this.currentBet * 2;
            if(this.calculateScore(this.playerHand) === 21 && this.playerHand.length === 2) {
                this.showMessage("BLACKJACK!");
                this.balance += this.currentBet * 0.5; 
            }
            this.engine.dealer.emote('lose'); 
            
            this.chipsOnTable.forEach(c => {
                 new TWEEN.Tween(c.position).to({z: 30, y: 10}, 600).easing(TWEEN.Easing.Back.In).start();
            });
        } else if (result === 'LOSE' || result === 'BUST') {
            this.showMessage(result === 'BUST' ? "BUST!" : "DEALER WINS");
            this.engine.dealer.emote('win'); 
            
            this.chipsOnTable.forEach(c => {
                 new TWEEN.Tween(c.position).to({z: -25, y: 5}, 600).easing(TWEEN.Easing.Back.In).start();
            });
        } else {
            this.showMessage("PUSH");
            this.balance += this.currentBet;
        }

        this.currentBet = 0;
        this.updateUI();
        
        setTimeout(() => {
            this.resetRound();
        }, 3000);
    }

    resetRound() {
        this.gameState = 'BETTING';
        this.showMessage("");
        
        this.cardsOnTable.forEach(c => {
            new TWEEN.Tween(c.position).to({z: -30, y: 5}, 500).start();
        });
        this.chipsOnTable.forEach(c => this.engine.scene.remove(c));
        this.chipsOnTable = [];
        
        this.ui.chipSelector.classList.add('visible');
        this.ui.betDisplay.classList.add('visible');
    }

    updateUI() {
        this.ui.balance.innerText = this.balance;
        this.ui.bet.innerText = this.currentBet;
    }

    toggleButtons(active) {
        const list = ['hit', 'stand', 'double'];
        list.forEach(id => {
            if(active) this.ui.btns[id].classList.add('active');
            else this.ui.btns[id].classList.remove('active');
        });
        
        if(active && this.balance < this.currentBet) {
             this.ui.btns.double.classList.remove('active');
        }
    }

    showMessage(text) {
        const el = document.getElementById('main-message');
        if(text === "") {
            el.classList.remove('visible');
        } else {
            el.innerText = text;
            el.classList.add('visible');
        }
    }
}

// Start Game
const game = new BlackjackGame();

</script>
</body>
</html>