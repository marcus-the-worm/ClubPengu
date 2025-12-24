<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VOXEL BATTLESHIP REMASTERED</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;600&display=swap');

        body { margin: 0; overflow: hidden; background-color: #0f172a; font-family: 'Rajdhani', sans-serif; user-select: none; }
        
        /* Canvas Layer */
        #game-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
        
        /* UI Layer */
        #ui-layer {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            display: flex; flex-direction: column; justify-content: space-between;
            z-index: 10;
        }

        /* Holographic Panels */
        .panel {
            background: rgba(16, 26, 48, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(64, 224, 255, 0.2);
            box-shadow: 0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(64, 224, 255, 0.05);
            padding: 20px;
            color: #ecf0f1;
            pointer-events: auto;
            transition: all 0.3s ease;
        }

        /* Top Header */
        .header {
            display: flex; justify-content: space-between; align-items: flex-start;
            padding: 20px 40px;
            background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%);
            pointer-events: none;
        }

        .game-title h1 {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            margin: 0;
            background: linear-gradient(45deg, #00f260, #0575e6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 30px rgba(5, 117, 230, 0.4);
            letter-spacing: 4px;
        }
        .game-title span {
            font-size: 0.9rem; letter-spacing: 6px; color: #4aa; text-transform: uppercase;
            margin-left: 5px;
        }

        /* Turn Indicator */
        .turn-display {
            text-align: right;
        }
        #turn-badge {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.2rem;
            padding: 8px 24px;
            border-radius: 2px;
            background: rgba(0,0,0,0.6);
            border: 1px solid #fff;
            box-shadow: 0 0 15px rgba(255,255,255,0.2);
            display: inline-block;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .status-setup { border-color: #f1c40f !important; color: #f1c40f; text-shadow: 0 0 10px #f1c40f; }
        .status-player { border-color: #2ecc71 !important; color: #2ecc71; text-shadow: 0 0 10px #2ecc71; transform: scale(1.1); }
        .status-enemy { border-color: #e74c3c !important; color: #e74c3c; text-shadow: 0 0 10px #e74c3c; transform: scale(1.1); }

        /* Bottom Controls */
        .controls-wrapper {
            padding: 30px;
            display: flex; justify-content: center; align-items: center;
            position: relative;
        }

        .battle-log {
            position: absolute; bottom: 30px; left: 30px;
            width: 300px; height: 150px;
            overflow: hidden;
            display: flex; flex-direction: column-reverse;
            font-size: 0.9rem;
            border-left: 4px solid rgba(255,255,255,0.1);
        }
        .log-entry { margin-top: 5px; opacity: 0; animation: fadeIn 0.3s forwards; text-shadow: 1px 1px 2px black; }
        .log-hit { color: #ff6b6b; }
        .log-miss { color: #74c0fc; }
        .log-sunk { color: #ffa502; font-weight: bold; }
        @keyframes fadeIn { to { opacity: 1; } }

        /* Buttons */
        button {
            background: rgba(64, 224, 255, 0.1);
            border: 1px solid rgba(64, 224, 255, 0.4);
            color: #fff;
            font-family: 'Rajdhani', sans-serif;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            padding: 15px 40px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.2s;
            clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
        }
        button:hover {
            background: rgba(64, 224, 255, 0.3);
            box-shadow: 0 0 20px rgba(64, 224, 255, 0.4);
            transform: translateY(-2px);
        }
        .btn-start {
            background: rgba(46, 204, 113, 0.2); border-color: #2ecc71;
        }
        .btn-start:hover { background: rgba(46, 204, 113, 0.4); box-shadow: 0 0 20px rgba(46, 204, 113, 0.4); }

        #setup-ui { display: flex; gap: 20px; pointer-events: auto; }
        #combat-ui { display: none; text-align: center; pointer-events: none; }
        .radar-text { color: rgba(255,255,255,0.5); font-style: italic; letter-spacing: 1px; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

        /* End Screen Modal */
        #modal {
            position: absolute; inset: 0; z-index: 100;
            background: rgba(0,0,0,0.9);
            display: none; flex-direction: column; justify-content: center; align-items: center;
            opacity: 0; transition: opacity 0.5s;
        }
        #modal.active { opacity: 1; }
        .modal-card {
            text-align: center;
            border: 2px solid #fff;
            padding: 60px;
            background: rgba(20, 20, 20, 0.8);
            box-shadow: 0 0 50px rgba(0,0,0,1);
            transform: scale(0.9); transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        #modal.active .modal-card { transform: scale(1); }
        .result-title { font-family: 'Orbitron'; font-size: 5rem; margin: 0; line-height: 1; text-transform: uppercase; }
        .result-desc { font-size: 1.5rem; color: #bbb; margin-bottom: 40px; }
        .win-text { color: #2ecc71; text-shadow: 0 0 30px #2ecc71; }
        .lose-text { color: #e74c3c; text-shadow: 0 0 30px #e74c3c; }

    </style>
</head>
<body>

    <div id="game-container"></div>

    <div id="ui-layer">
        <div class="header">
            <div class="game-title">
                <h1>VOXEL BATTLESHIP</h1>
                <span>TACTICAL WARFARE</span>
            </div>
            <div class="turn-display">
                <div id="turn-badge" class="status-setup">FLEET DEPLOYMENT</div>
            </div>
        </div>

        <div class="battle-log panel" id="battle-log">
            <!-- Logs go here -->
            <div class="log-entry">System Online...</div>
        </div>

        <div class="controls-wrapper">
            <div id="setup-ui">
                <button onclick="game.randomizeFleet()">Scramble Fleet</button>
                <button class="btn-start" onclick="game.startBattle()">Engage Hostiles</button>
            </div>
            <div id="combat-ui">
                <div class="radar-text">Awaiting Orders... Select Coordinates on Enemy Grid</div>
            </div>
        </div>
    </div>

    <div id="modal">
        <div class="modal-card">
            <h1 class="result-title" id="end-title">VICTORY</h1>
            <p class="result-desc" id="end-desc">Enemy fleet neutralized.</p>
            <button onclick="location.reload()">Return to Base</button>
        </div>
    </div>

    <!-- Shaders -->
    <script type="x-shader/x-vertex" id="waterVertex">
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        uniform float uTime;
        
        // Simplex Noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec3 pos = position;
            // Choppier water
            float noise = snoise(vec2(pos.x * 0.08 + uTime * 0.4, pos.y * 0.08 + uTime * 0.3));
            float noise2 = snoise(vec2(pos.x * 0.2 - uTime * 0.2, pos.y * 0.2 + uTime * 0.1));
            
            // Increased wave height slightly
            pos.z += (noise * 1.8 + noise2 * 0.6); 
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vViewPosition = -mvPosition.xyz;
            vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * mvPosition;
        }
    </script>

    <script type="x-shader/x-fragment" id="waterFragment">
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
            // Flat shading for low poly look
            vec3 fdx = dFdx(vViewPosition);
            vec3 fdy = dFdy(vViewPosition);
            vec3 normal = normalize(cross(fdx, fdy));

            float diffuse = max(dot(normal, sunDirection), 0.0);
            
            // Mix water colors based on height (approx via diffuse)
            vec3 waterCol = mix(color1, color2, diffuse * 0.8);
            
            vec3 viewDir = normalize(vViewPosition);
            vec3 reflectDir = reflect(-sunDirection, normal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 50.0);
            
            // Simple foam/rim approximation
            float rim = 1.0 - max(dot(viewDir, normal), 0.0);
            rim = pow(rim, 3.0);

            vec3 finalColor = waterCol * (0.4 + 0.6 * diffuse);
            finalColor += sunColor * spec * 0.8;
            finalColor += vec3(0.8, 0.9, 1.0) * rim * 0.3;

            gl_FragColor = vec4(finalColor, 0.92);
        }
    </script>

    <script>
        /**
         * ENGINE CONFIGURATION
         */
        const CONFIG = {
            gridSize: 10,
            cellSize: 2,
            boardElevation: 3.5, // Lift board higher to avoid wave clipping
            ships: [
                { name: "Carrier", size: 5, color: 0x34495e, accent: 0xe67e22 },
                { name: "Battleship", size: 4, color: 0x2c3e50, accent: 0xc0392b },
                { name: "Cruiser", size: 3, color: 0x7f8c8d, accent: 0x27ae60 },
                { name: "Submarine", size: 3, color: 0x2c2c2c, accent: 0xf1c40f },
                { name: "Destroyer", size: 2, color: 0x95a5a6, accent: 0x2980b9 }
            ],
            colors: {
                waterDeep: new THREE.Color(0x0a3d62),
                waterShallow: new THREE.Color(0x3c6382),
                grid: 0xffffff,
                hit: 0xe74c3c,
                miss: 0xecf0f1,
                markerHit: 0xff3333,
                markerMiss: 0xaaaaaa
            },
            offsets: {
                player: -15,
                enemy: 15
            }
        };

        // --- PARTICLE & EFFECTS SYSTEM ---
        class FXSystem {
            constructor(scene) {
                this.scene = scene;
                this.particles = [];
                
                // Pre-create geometries
                this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
                this.sphereGeo = new THREE.SphereGeometry(1, 8, 8);
                this.ringGeo = new THREE.RingGeometry(0.5, 1, 32);
            }

            createExplosion(pos, color, count = 15) {
                const mat = new THREE.MeshBasicMaterial({ color: color });
                
                // Debris
                for(let i=0; i<count; i++) {
                    const mesh = new THREE.Mesh(this.cubeGeo, mat);
                    const size = 0.2 + Math.random() * 0.3;
                    mesh.scale.set(size, size, size);
                    mesh.position.copy(pos);
                    
                    const vel = new THREE.Vector3(
                        (Math.random()-0.5) * 1.5,
                        (Math.random() * 2) + 0.5,
                        (Math.random()-0.5) * 1.5
                    );

                    this.scene.add(mesh);
                    this.particles.push({ mesh, vel, life: 1.0, type: 'debris' });
                }

                // Shockwave
                const ringMat = new THREE.MeshBasicMaterial({ 
                    color: color, transparent: true, opacity: 0.8, side: THREE.DoubleSide 
                });
                const ring = new THREE.Mesh(this.ringGeo, ringMat);
                ring.position.copy(pos);
                ring.position.y += 0.1;
                ring.rotation.x = -Math.PI / 2;
                ring.scale.set(0.1, 0.1, 0.1);
                this.scene.add(ring);
                this.particles.push({ mesh: ring, life: 1.0, type: 'ring' });

                // Flash Light
                const light = new THREE.PointLight(color, 2, 10);
                light.position.copy(pos);
                light.position.y += 2;
                this.scene.add(light);
                this.particles.push({ mesh: light, life: 0.2, type: 'flash' });
            }

            createSplash(pos) {
                this.createExplosion(pos, 0xffffff, 8);
            }

            createProjectile(start, end, onComplete) {
                const mesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.3, 0.6),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00 })
                );
                this.scene.add(mesh);

                // Arc higher because board is higher
                const controlPoint = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 20, 0));
                
                const animObj = { t: 0 };
                new TWEEN.Tween(animObj)
                    .to({ t: 1 }, 800) // 800ms travel time
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(() => {
                        // Quadratic Bezier
                        const t = animObj.t;
                        const pos = new THREE.Vector3();
                        // (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                        pos.x = (1-t)*(1-t)*start.x + 2*(1-t)*t*controlPoint.x + t*t*end.x;
                        pos.y = (1-t)*(1-t)*start.y + 2*(1-t)*t*controlPoint.y + t*t*end.y;
                        pos.z = (1-t)*(1-t)*start.z + 2*(1-t)*t*controlPoint.z + t*t*end.z;
                        
                        mesh.position.copy(pos);
                        mesh.lookAt(end); // Point towards target roughly
                        
                        // Trail particle
                        if(Math.random() > 0.7) {
                            this.emitTrail(pos);
                        }
                    })
                    .onComplete(() => {
                        this.scene.remove(mesh);
                        if(onComplete) onComplete();
                    })
                    .start();
            }

            emitTrail(pos) {
                const mesh = new THREE.Mesh(this.cubeGeo, new THREE.MeshBasicMaterial({color: 0x555555, transparent: true}));
                mesh.position.copy(pos);
                mesh.scale.set(0.2, 0.2, 0.2);
                this.scene.add(mesh);
                this.particles.push({ mesh, vel: new THREE.Vector3(0,0,0), life: 0.5, type: 'smoke' });
            }

            update() {
                for(let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.life -= 0.02;

                    if (p.type === 'debris') {
                        p.vel.y -= 0.05; // Gravity
                        p.mesh.position.add(p.vel);
                        p.mesh.rotation.x += p.vel.z;
                        p.mesh.scale.setScalar(p.life * 0.5);
                    } else if (p.type === 'ring') {
                        const s = 1.0 + (1.0 - p.life) * 4;
                        p.mesh.scale.set(s, s, s);
                        p.mesh.material.opacity = p.life;
                    } else if (p.type === 'smoke') {
                        p.mesh.position.y += 0.02;
                        p.mesh.scale.setScalar(0.2 + (0.5 - p.life));
                        p.mesh.material.opacity = p.life;
                    }

                    if(p.life <= 0) {
                        this.scene.remove(p.mesh);
                        this.particles.splice(i, 1);
                    }
                }
            }
        }

        // --- SHIP GENERATOR (VOXEL STYLE) ---
        class ShipFactory {
            static getMaterials(baseColor, accentColor) {
                return {
                    hull: new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.3, metalness: 0.6, flatShading: true }),
                    deck: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, flatShading: true }),
                    accent: new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, emissive: accentColor, emissiveIntensity: 0.2, flatShading: true }),
                    dark: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, flatShading: true })
                };
            }

            static addVoxel(group, geo, mat, x, y, z, sx=1, sy=1, sz=1) {
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, y, z);
                mesh.scale.set(sx, sy, sz);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                group.add(mesh);
                return mesh;
            }

            static build(template) {
                const group = new THREE.Group();
                const mats = this.getMaterials(template.color, template.accent);
                const box = new THREE.BoxGeometry(1,1,1);
                
                // Procedural Seed (simple randomness)
                const seed = Math.random();

                // Common Hull Building
                const length = template.size * 2; // Real world units (size * cellSize)
                const width = 1.6;
                const centerOffset = (template.size * 2) / 2 - 1;

                switch(template.name) {
                    case "Carrier": // Flat top, island
                        // Main Hull
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 0.5, 0, length, 1.2, width);
                        // Flight Deck
                        this.addVoxel(group, box, mats.deck, length/2 - 1, 1.15, 0, length, 0.1, width * 1.2);
                        // Island (Tower)
                        this.addVoxel(group, box, mats.hull, length - 3, 1.8, -0.6, 1.5, 1.2, 0.6);
                        // Antenna
                        this.addVoxel(group, box, mats.accent, length - 2.8, 2.5, -0.6, 0.1, 1.5, 0.1);
                        // Runway markings
                        this.addVoxel(group, box, mats.accent, length/2 - 1, 1.21, 0, length * 0.8, 0.01, 0.2);
                        break;

                    case "Battleship": // Big Guns
                        // Main Hull
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 0.6, 0, length, 1.2, width);
                        // Deck tiers
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 1.2, 0, length * 0.6, 0.6, width * 0.8);
                        // Main Bridge
                        this.addVoxel(group, box, mats.hull, length/2, 1.8, 0, 1.5, 1.0, 1.0);
                        this.addVoxel(group, box, mats.dark, length/2 + 0.5, 2.0, 0, 0.5, 0.2, 0.8); // Windows
                        // Turrets (Fore and Aft)
                        [1.5, length - 2.5].forEach(x => {
                             const tBase = this.addVoxel(group, box, mats.hull, x, 1.4, 0, 1.2, 0.5, 1.0);
                             const barrel = this.addVoxel(group, box, mats.dark, x + 0.5, 1.4, 0, 1.5, 0.15, 0.2);
                        });
                        break;

                    case "Cruiser": // Sleek, antenna
                        // Main Hull
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 0.5, 0, length, 1.0, width * 0.8);
                        // Superstructure
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 1.2, 0, 2.5, 0.8, 0.8);
                        // Radar Dish
                        const dish = this.addVoxel(group, box, mats.accent, length/2 - 1, 2.2, 0, 0.1, 0.6, 0.6);
                        dish.rotation.z = 0.5;
                        // Small turrets
                        this.addVoxel(group, box, mats.dark, 1.0, 1.0, 0, 0.8, 0.3, 0.3);
                        break;

                    case "Submarine": // Low profile
                        // Hull (Cigar shape approximation)
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 0.4, 0, length, 0.8, 1.0);
                        // Conning tower
                        this.addVoxel(group, box, mats.hull, length/2 - 0.5, 1.0, 0, 1.2, 0.8, 0.6);
                        // Periscope
                        this.addVoxel(group, box, mats.accent, length/2 - 0.5, 1.5, 0, 0.1, 0.8, 0.1);
                        // Fins
                        this.addVoxel(group, box, mats.hull, 0.5, 0.4, 0, 0.5, 0.1, 1.5);
                        break;

                    case "Destroyer": // Fast, simple
                    default:
                        // Hull
                        this.addVoxel(group, box, mats.hull, length/2 - 1, 0.5, 0, length, 1.0, width * 0.7);
                        // Bridge at back
                        this.addVoxel(group, box, mats.hull, length - 2, 1.2, 0, 1.5, 0.6, 0.8);
                        // Smoke stack
                        this.addVoxel(group, box, mats.dark, length/2, 1.2, 0, 0.5, 0.5, 0.5);
                        break;
                }

                // Random Greebles (Details)
                const greebleCount = Math.floor(Math.random() * 3) + 1;
                for(let i=0; i<greebleCount; i++) {
                    const gx = Math.random() * (length - 2) + 1;
                    const gz = (Math.random() - 0.5) * 0.8;
                    this.addVoxel(group, box, mats.dark, gx, 1.05, gz, 0.2, 0.2, 0.2);
                }

                // Center pivot adjustment
                group.children.forEach(c => c.position.x -= centerOffset);
                return group;
            }
        }

        // --- GAME BOARD ---
        class Board {
            constructor(scene, isPlayer, offsetX, fx) {
                this.scene = scene;
                this.isPlayer = isPlayer;
                this.fx = fx;
                this.size = CONFIG.gridSize;
                this.cells = [];
                this.ships = [];
                this.root = new THREE.Group();
                this.root.position.set(offsetX, CONFIG.boardElevation, 0); // Raised Board
                this.scene.add(this.root);

                this.initGrid();
            }

            initGrid() {
                // Logic Grid
                for(let y=0; y<this.size; y++) {
                    const row = [];
                    for(let x=0; x<this.size; x++) {
                        row.push({ hasShip: false, isHit: false, ship: null });
                    }
                    this.cells.push(row);
                }

                // Visual Platform
                const fullSize = this.size * CONFIG.cellSize;
                const baseGeo = new THREE.BoxGeometry(fullSize, 0.5, fullSize);
                const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
                const base = new THREE.Mesh(baseGeo, baseMat);
                base.position.y = -0.25;
                base.receiveShadow = true;
                this.root.add(base);

                // Grid Lines
                const grid = new THREE.GridHelper(fullSize, this.size, 0x444444, 0x222222);
                grid.position.y = 0.05;
                this.root.add(grid);

                // Cursor
                const curGeo = new THREE.BoxGeometry(CONFIG.cellSize, 0.2, CONFIG.cellSize);
                const curMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.6 });
                this.cursor = new THREE.Mesh(curGeo, curMat);
                this.cursor.visible = false;
                this.root.add(this.cursor);
            }

            clear() {
                this.ships.forEach(s => this.root.remove(s.mesh));
                this.ships = [];
                for(let y=0; y<this.size; y++) {
                    for(let x=0; x<this.size; x++) {
                        this.cells[y][x].hasShip = false;
                        this.cells[y][x].ship = null;
                        this.cells[y][x].isHit = false;
                    }
                }
                this.root.children = this.root.children.filter(c => c.name !== 'marker');
            }

            placeShipRandomly() {
                this.clear();
                CONFIG.ships.forEach(template => {
                    let placed = false;
                    while(!placed) {
                        const horz = Math.random() > 0.5;
                        const x = Math.floor(Math.random() * this.size);
                        const y = Math.floor(Math.random() * this.size);
                        placed = this.tryPlace(template, x, y, horz);
                    }
                });
            }

            tryPlace(template, x, y, horz) {
                // Bounds
                if(horz && x + template.size > this.size) return false;
                if(!horz && y + template.size > this.size) return false;

                // Overlap
                for(let i=0; i<template.size; i++) {
                    const cx = horz ? x + i : x;
                    const cy = horz ? y : y + i;
                    if(this.cells[cy][cx].hasShip) return false;
                }

                // Place
                const shipObj = {
                    name: template.name,
                    hp: template.size,
                    mesh: ShipFactory.build(template)
                };

                const step = CONFIG.cellSize;
                const centerOffset = (this.size * step) / 2 - (step/2);
                const startX = (x * step) - centerOffset;
                const startZ = (y * step) - centerOffset;

                // Calculate visual center
                let mx, mz;
                if(horz) {
                    mx = startX + ((template.size-1)*step/2);
                    mz = startZ;
                    shipObj.mesh.rotation.y = 0;
                } else {
                    mx = startX;
                    mz = startZ + ((template.size-1)*step/2);
                    shipObj.mesh.rotation.y = Math.PI/2;
                }

                shipObj.mesh.position.set(mx, 0, mz);
                
                if(!this.isPlayer) {
                    shipObj.mesh.visible = false; // Hidden enemy ships
                    shipObj.mesh.position.y = -5;
                }

                this.root.add(shipObj.mesh);
                this.ships.push(shipObj);

                // Update Grid
                for(let i=0; i<template.size; i++) {
                    const cx = horz ? x + i : x;
                    const cy = horz ? y : y + i;
                    this.cells[cy][cx].hasShip = true;
                    this.cells[cy][cx].ship = shipObj;
                }

                return true;
            }

            getCellWorldPosition(x, y) {
                const step = CONFIG.cellSize;
                const offset = (this.size * step) / 2 - (step/2);
                const localX = (x * step) - offset;
                const localZ = (y * step) - offset;
                const vec = new THREE.Vector3(localX, 0.5, localZ);
                return vec.applyMatrix4(this.root.matrixWorld);
            }

            addMarker(x, y, isHit) {
                const step = CONFIG.cellSize;
                const offset = (this.size * step) / 2 - (step/2);
                const localX = (x * step) - offset;
                const localZ = (y * step) - offset;

                const col = isHit ? CONFIG.colors.markerHit : CONFIG.colors.markerMiss;
                const geo = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
                const mat = new THREE.MeshStandardMaterial({ color: col, emissive: isHit ? 0xaa0000 : 0x000000 });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(localX, 0.5, localZ);
                mesh.name = 'marker';
                
                // Pop in animation
                mesh.scale.set(0,0,0);
                new TWEEN.Tween(mesh.scale).to({x:1, y:1, z:1}, 400).easing(TWEEN.Easing.Back.Out).start();
                
                this.root.add(mesh);
            }

            sinkShip(ship) {
                // Reveal if hidden
                if(!ship.mesh.visible) {
                    ship.mesh.visible = true;
                    ship.mesh.position.y = -1;
                    new TWEEN.Tween(ship.mesh.position).to({y:0}, 500).start();
                }

                // Color darken
                ship.mesh.children.forEach(c => {
                    if(c.material) {
                        c.material = c.material.clone();
                        c.material.color.multiplyScalar(0.2);
                        c.material.emissive.setHex(0x000000);
                    }
                });

                // Sink Animation
                setTimeout(() => {
                    new TWEEN.Tween(ship.mesh.position)
                        .to({ y: -10 }, 5000)
                        .easing(TWEEN.Easing.Quadratic.In)
                        .start();
                    
                    new TWEEN.Tween(ship.mesh.rotation)
                        .to({ z: (Math.random()-0.5), x: (Math.random()-0.5) * 0.5 }, 5000)
                        .start();
                }, 1000);
            }

            checkSunk() {
                return this.ships.every(s => s.hp <= 0);
            }
        }

        // --- GAME CONTROLLER ---
        class Game {
            constructor() {
                this.state = 'SETUP'; // SETUP, PLAYER, ENEMY, OVER, BUSY
                this.initThree();
                this.fx = new FXSystem(this.scene);
                
                // Boards
                this.playerBoard = new Board(this.scene, true, CONFIG.offsets.player, this.fx);
                this.enemyBoard = new Board(this.scene, false, CONFIG.offsets.enemy, this.fx);
                
                this.raycaster = new THREE.Raycaster();
                this.mouse = new THREE.Vector2();
                this.shakeIntensity = 0;

                // AI Memory
                this.aiAvailableMoves = [];
                for(let y=0; y<CONFIG.gridSize; y++) {
                    for(let x=0; x<CONFIG.gridSize; x++) {
                        this.aiAvailableMoves.push({x, y});
                    }
                }

                // Listeners
                window.addEventListener('resize', () => this.onResize());
                window.addEventListener('mousemove', (e) => this.onMouseMove(e));
                window.addEventListener('click', () => this.onClick());

                this.randomizeFleet();
                this.log("Welcome Commander. Deploy fleet.");
                
                this.animate();
            }

            initThree() {
                this.scene = new THREE.Scene();
                this.scene.fog = new THREE.FogExp2(0x0a3d62, 0.015); // Matches waterDeep

                this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
                this.camera.position.set(CONFIG.offsets.player, 40, 40); // Start looking at player board

                this.renderer = new THREE.WebGLRenderer({ antialias: true });
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                document.getElementById('game-container').appendChild(this.renderer.domElement);

                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
                this.controls.target.set(CONFIG.offsets.player, 0, 0);

                // Lighting
                const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
                this.scene.add(ambient);

                const sun = new THREE.DirectionalLight(0xffdfba, 1.2);
                sun.position.set(50, 80, 30);
                sun.castShadow = true;
                sun.shadow.mapSize.width = 2048;
                sun.shadow.mapSize.height = 2048;
                sun.shadow.camera.left = -50;
                sun.shadow.camera.right = 50;
                sun.shadow.camera.top = 50;
                sun.shadow.camera.bottom = -50;
                this.scene.add(sun);

                // Water
                this.createWater(sun);
            }

            createWater(sun) {
                const geo = new THREE.PlaneGeometry(300, 300, 100, 100);
                this.waterUniforms = {
                    uTime: { value: 0 },
                    color1: { value: CONFIG.colors.waterDeep },
                    color2: { value: CONFIG.colors.waterShallow },
                    sunColor: { value: sun.color },
                    sunDirection: { value: sun.position.clone().normalize() }
                };

                const mat = new THREE.ShaderMaterial({
                    uniforms: this.waterUniforms,
                    vertexShader: document.getElementById('waterVertex').textContent,
                    fragmentShader: document.getElementById('waterFragment').textContent,
                    transparent: true,
                    wireframe: false
                });

                const mesh = new THREE.Mesh(geo, mat);
                mesh.rotation.x = -Math.PI / 2;
                // Water stays at 0, boards are raised
                this.scene.add(mesh);
            }

            randomizeFleet() {
                if(this.state !== 'SETUP') return;
                this.playerBoard.placeShipRandomly();
                this.enemyBoard.placeShipRandomly();
            }

            startBattle() {
                if(this.state !== 'SETUP') return;
                
                document.getElementById('setup-ui').style.display = 'none';
                document.getElementById('combat-ui').style.display = 'block';
                
                this.startPlayerTurn();
            }

            log(msg, type = '') {
                const box = document.getElementById('battle-log');
                const div = document.createElement('div');
                div.className = `log-entry log-${type}`;
                div.innerText = `> ${msg}`;
                box.prepend(div); // Add to top (column-reverse handles visual)
                if(box.children.length > 8) box.removeChild(box.lastChild);
            }

            // --- TURN LOGIC & CAMERA ---

            moveCameraTo(targetOffset, zoom = 30) {
                const currentPos = this.camera.position.clone();
                const currentTarget = this.controls.target.clone();
                
                // Ideal position: Offset X, Height 30, Z 30
                const targetPos = new THREE.Vector3(targetOffset, 30, 30);
                const targetLook = new THREE.Vector3(targetOffset, 0, 0);

                new TWEEN.Tween(this.camera.position)
                    .to(targetPos, 1500)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();
                
                new TWEEN.Tween(this.controls.target)
                    .to(targetLook, 1500)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();
            }

            startPlayerTurn() {
                this.state = 'PLAYER';
                this.updateBadge('PLAYER TURN', 'status-player');
                // Move camera to look at ENEMY board
                this.moveCameraTo(CONFIG.offsets.enemy);
                this.log("Tactical View: Target Enemy Grid.");
            }

            startEnemyTurn() {
                this.state = 'ENEMY';
                this.updateBadge('ENEMY TURN', 'status-enemy');
                // Move camera to look at PLAYER board
                this.moveCameraTo(CONFIG.offsets.player);
                this.log("WARNING: Enemy targeting systems active.");

                // Artificial AI Delay
                setTimeout(() => this.processEnemyMove(), 2500);
            }

            processEnemyMove() {
                if(this.state === 'OVER') return;

                // Pick random available move
                const idx = Math.floor(Math.random() * this.aiAvailableMoves.length);
                const move = this.aiAvailableMoves[idx];
                this.aiAvailableMoves.splice(idx, 1); // Remove from pool

                // Determine start point (approximate enemy center)
                const startPos = new THREE.Vector3(CONFIG.offsets.enemy, 5 + CONFIG.boardElevation, 0);
                const targetPos = this.playerBoard.getCellWorldPosition(move.x, move.y);

                // Fire Projectile
                this.fx.createProjectile(startPos, targetPos, () => {
                    const res = this.resolveHit(this.playerBoard, move.x, move.y);
                    
                    if(res === 'sunk' && this.playerBoard.checkSunk()) {
                        this.endGame(false);
                    } else {
                        setTimeout(() => this.startPlayerTurn(), 1000);
                    }
                });
            }

            // --- INTERACTION ---

            onMouseMove(e) {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

                // Hover logic for Player Turn
                if(this.state === 'PLAYER') {
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    
                    // We only care if we hit the base platform or grid.
                    // Project ray to plane at BOARD ELEVATION
                    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CONFIG.boardElevation);
                    const target = new THREE.Vector3();
                    this.raycaster.ray.intersectPlane(plane, target);

                    if(target) {
                        // Convert to local grid coords
                        const localX = target.x - CONFIG.offsets.enemy;
                        const localZ = target.z;
                        
                        const step = CONFIG.cellSize;
                        const gridHalf = (CONFIG.gridSize * step) / 2;
                        
                        const gx = Math.floor((localX + gridHalf) / step);
                        const gy = Math.floor((localZ + gridHalf) / step);

                        if(gx >= 0 && gx < CONFIG.gridSize && gy >= 0 && gy < CONFIG.gridSize) {
                            // Snap visual cursor
                            const wx = (gx * step) - gridHalf + (step/2) + CONFIG.offsets.enemy;
                            const wz = (gy * step) - gridHalf + (step/2);
                            this.enemyBoard.cursor.position.set(wx - CONFIG.offsets.enemy, 0.2, wz);
                            this.enemyBoard.cursor.visible = true;
                            this.hoveredCell = { x: gx, y: gy };
                            document.body.style.cursor = 'crosshair';
                            return;
                        }
                    }
                }
                
                this.enemyBoard.cursor.visible = false;
                this.hoveredCell = null;
                document.body.style.cursor = 'default';
            }

            onClick() {
                if(this.state !== 'PLAYER' || !this.hoveredCell) return;
                
                const { x, y } = this.hoveredCell;
                const cell = this.enemyBoard.cells[y][x];
                
                if(cell.isHit) {
                    this.log("Coordinates already targeted.", "miss");
                    return;
                }

                this.state = 'BUSY'; // Prevent clicks while animating

                // Projectile Start (Player side approx)
                const startPos = new THREE.Vector3(CONFIG.offsets.player, 5 + CONFIG.boardElevation, 0);
                const targetPos = this.enemyBoard.getCellWorldPosition(x, y);

                this.fx.createProjectile(startPos, targetPos, () => {
                    const res = this.resolveHit(this.enemyBoard, x, y);
                    
                    if(res === 'sunk' && this.enemyBoard.checkSunk()) {
                        this.endGame(true);
                    } else {
                        setTimeout(() => this.startEnemyTurn(), 1000);
                    }
                });
            }

            resolveHit(board, x, y) {
                const cell = board.cells[y][x];
                cell.isHit = true;
                
                const worldPos = board.getCellWorldPosition(x, y);

                if(cell.hasShip) {
                    this.log(`${board.isPlayer ? "OUR" : "ENEMY"} UNIT HIT AT ${String.fromCharCode(65+x)}${y+1}`, "hit");
                    this.fx.createExplosion(worldPos, CONFIG.colors.hit);
                    board.addMarker(x, y, true);
                    this.shakeScreen(0.5);
                    
                    cell.ship.hp--;
                    if(cell.ship.hp <= 0) {
                        this.log(`*** ${cell.ship.name.toUpperCase()} DESTROYED ***`, "sunk");
                        board.sinkShip(cell.ship);
                        return 'sunk';
                    }
                    return 'hit';
                } else {
                    this.log(`Miss at ${String.fromCharCode(65+x)}${y+1}`, "miss");
                    this.fx.createSplash(worldPos);
                    board.addMarker(x, y, false);
                    return 'miss';
                }
            }

            shakeScreen(intensity) {
                this.shakeIntensity = intensity;
            }

            updateBadge(text, cls) {
                const badge = document.getElementById('turn-badge');
                badge.className = '';
                badge.classList.add(cls);
                badge.innerText = text;
            }

            endGame(victory) {
                this.state = 'OVER';
                const modal = document.getElementById('modal');
                const title = document.getElementById('end-title');
                const desc = document.getElementById('end-desc');
                
                modal.style.display = 'flex';
                // force reflow
                modal.offsetHeight;
                modal.classList.add('active');

                if(victory) {
                    title.innerText = "VICTORY";
                    title.className = "result-title win-text";
                    desc.innerText = "Enemy fleet neutralized. Sector secure.";
                    this.fx.createExplosion(new THREE.Vector3(CONFIG.offsets.enemy, 5, 0), 0x00ff00, 50);
                } else {
                    title.innerText = "DEFEAT";
                    title.className = "result-title lose-text";
                    desc.innerText = "Command, we have lost the fleet.";
                }
            }

            onResize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }

            animate() {
                requestAnimationFrame(() => this.animate());
                
                const time = performance.now() * 0.001;
                
                TWEEN.update();
                this.controls.update();
                this.fx.update();

                // Water Uniforms
                if(this.waterUniforms) this.waterUniforms.uTime.value = time;

                // Ship Floating (subtle bob)
                [this.playerBoard, this.enemyBoard].forEach(b => {
                    b.ships.forEach((s, i) => {
                        // Float if alive and visible
                        if(s.mesh.visible && s.hp > 0) {
                            s.mesh.position.y = Math.sin(time * 1.5 + i) * 0.05;
                            s.mesh.rotation.z = Math.sin(time + i) * 0.01;
                        }
                    });
                });

                // Screen Shake
                if(this.shakeIntensity > 0) {
                    const rx = (Math.random() - 0.5) * this.shakeIntensity;
                    const ry = (Math.random() - 0.5) * this.shakeIntensity;
                    this.camera.position.add(new THREE.Vector3(rx, ry, 0));
                    this.shakeIntensity -= 0.02;
                    if(this.shakeIntensity < 0) this.shakeIntensity = 0;
                }

                this.renderer.render(this.scene, this.camera);
            }
        }

        const game = new Game();
    </script>
</body>
</html>