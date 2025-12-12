import { VOXEL_SIZE, PALETTE } from '../constants';

/**
 * PropsFactory - Procedural generation of environmental props
 * Creates optimized meshes for trees, igloos, lamps, benches, and decorations
 * 
 * Design: Factory pattern with static generators and instance pooling
 * All meshes use merged geometry for minimal draw calls
 */
class PropsFactory {
    // Extended color palette for props
    static COLORS = {
        // Snow variations
        snowBright: '#FFFFFF',
        snowLight: '#F0F8FF',
        snowMedium: '#E8F0F8',
        snowDark: '#C8D8E8',
        snowShadow: '#A8C0D8',
        iceBright: '#D8F0FF',
        iceBlue: '#B8D8F0',
        
        // Wood
        barkDark: '#3A2010',
        barkMedium: '#4A3020',
        barkLight: '#5A4030',
        plankLight: '#8B7355',
        plankMedium: '#7B6345',
        plankDark: '#6B5335',
        
        // Foliage (pine trees)
        pineDeep: '#0A3A1A',
        pineDark: '#1A4A2A',
        pineMedium: '#2A5A3A',
        pineLight: '#3A6A4A',
        
        // Rock
        rockDark: '#3A4A4A',
        rockMedium: '#5A6A6A',
        rockLight: '#7A8A8A',
        
        // Metal
        metalDark: '#2A3A4A',
        metalMedium: '#4A5A6A',
        metalLight: '#6A7A8A',
        
        // Warm lights
        lampGlow: '#FFE4B5',
        lampBright: '#FFF8DC',
        windowWarm: '#FFD070',
        
        // Ice/Glass
        iceTranslucent: '#D0E8F8',
        iglooWhite: '#F8FCFF',
        iglooShadow: '#D8E8F0',
    };

    constructor(THREE) {
        this.THREE = THREE;
        this.materialCache = new Map();
        this.geometryCache = new Map();
    }

    // ==================== MATERIAL CACHING ====================
    
    getMaterial(color, options = {}) {
        const key = `${color}_${JSON.stringify(options)}`;
        if (!this.materialCache.has(key)) {
            // Build material config without undefined values
            const matConfig = {
                color: new this.THREE.Color(color),
                roughness: options.roughness ?? 0.8,
                metalness: options.metalness ?? 0,
                transparent: options.transparent ?? false,
                opacity: options.opacity ?? 1,
                side: options.doubleSided ? this.THREE.DoubleSide : this.THREE.FrontSide,
            };
            
            // Only add emissive properties if emissive color is provided
            if (options.emissive) {
                matConfig.emissive = new this.THREE.Color(options.emissive);
                matConfig.emissiveIntensity = options.emissiveIntensity ?? 0.5;
            }
            
            const mat = new this.THREE.MeshStandardMaterial(matConfig);
            this.materialCache.set(key, mat);
        }
        return this.materialCache.get(key);
    }

    // ==================== PINE TREE ====================
    
    /**
     * Create a snow-covered pine tree
     * @param {string} size - 'small' | 'medium' | 'large'
     * @returns {{ mesh: THREE.Group, collision: { type: 'cylinder', radius: number, height: number } }}
     */
    createPineTree(size = 'medium') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = `pine_tree_${size}`;
        
        // Size configurations
        const sizes = {
            small:  { trunkH: 1.5, trunkR: 0.2, layers: 3, baseRadius: 1.5, layerH: 1.2, snowDepth: 0.15 },
            medium: { trunkH: 2.5, trunkR: 0.3, layers: 4, baseRadius: 2.2, layerH: 1.5, snowDepth: 0.2 },
            large:  { trunkH: 3.5, trunkR: 0.4, layers: 5, baseRadius: 3.0, layerH: 1.8, snowDepth: 0.25 },
        };
        const cfg = sizes[size] || sizes.medium;
        
        // Trunk
        const trunkGeo = new THREE.CylinderGeometry(cfg.trunkR * 0.7, cfg.trunkR, cfg.trunkH, 8);
        const trunkMat = this.getMaterial(PropsFactory.COLORS.barkMedium, { roughness: 0.95 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = cfg.trunkH / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Pine layers (cones with snow caps)
        const layerColors = [
            PropsFactory.COLORS.pineDeep,
            PropsFactory.COLORS.pineDark,
            PropsFactory.COLORS.pineMedium,
            PropsFactory.COLORS.pineLight,
            PropsFactory.COLORS.pineMedium,
        ];
        
        let currentY = cfg.trunkH * 0.6;
        
        for (let i = 0; i < cfg.layers; i++) {
            const layerRatio = 1 - (i / cfg.layers) * 0.7;
            const radius = cfg.baseRadius * layerRatio;
            const height = cfg.layerH * layerRatio;
            
            // Pine cone layer
            const coneGeo = new THREE.ConeGeometry(radius, height, 8);
            const coneMat = this.getMaterial(layerColors[i % layerColors.length], { roughness: 0.9 });
            const cone = new THREE.Mesh(coneGeo, coneMat);
            cone.position.y = currentY + height / 2;
            cone.castShadow = true;
            cone.receiveShadow = true;
            group.add(cone);
            
            // Snow cap on top of this layer
            const snowRadius = radius * 0.85;
            const snowGeo = new THREE.ConeGeometry(snowRadius, cfg.snowDepth, 8);
            const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = currentY + height - cfg.snowDepth / 2;
            snow.castShadow = true;
            group.add(snow);
            
            // Snow clumps on branches - REDUCED for performance (only on larger trees)
            if (size !== 'small' && i < 2) { // Only bottom 2 layers, skip small trees
                const clumpCount = 2; // Reduced from 3-6
                for (let j = 0; j < clumpCount; j++) {
                    const angle = (j / clumpCount) * Math.PI * 2;
                    const dist = radius * 0.6;
                    const clumpGeo = new THREE.SphereGeometry(0.18, 4, 4); // Lower poly
                    const clump = new THREE.Mesh(clumpGeo, snowMat);
                    clump.position.set(
                        Math.cos(angle) * dist,
                        currentY + height * 0.4,
                        Math.sin(angle) * dist
                    );
                    clump.scale.y = 0.5;
                    group.add(clump);
                }
            }
            
            currentY += height * 0.65;
        }
        
        // Top snow cap
        const topSnowGeo = new THREE.SphereGeometry(cfg.snowDepth * 2, 6, 6);
        const topSnow = new THREE.Mesh(topSnowGeo, this.getMaterial(PropsFactory.COLORS.snowBright));
        topSnow.position.y = currentY + cfg.snowDepth;
        topSnow.scale.set(1, 0.6, 1);
        group.add(topSnow);
        
        // Store collision data on the group
        group.userData.collision = {
            type: 'cylinder',
            radius: cfg.trunkR + 0.3,
            height: cfg.trunkH + cfg.layers * cfg.layerH * 0.65,
        };
        
        return group;
    }

    // ==================== IGLOO ====================
    
    /**
     * Create a high-quality igloo with realistic ice block pattern
     * @param {boolean} withEntrance - Include the entrance tunnel
     * @returns {THREE.Group}
     */
    createIgloo(withEntrance = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'igloo';
        
        const domeRadius = 3.2;
        const domeHeight = 2.5;
        
        // Multi-tone ice materials for realism
        const iceWhite = this.getMaterial(0xF8FCFF, { roughness: 0.3, metalness: 0.02 });
        const iceMedium = this.getMaterial(0xE8F4FA, { roughness: 0.35, metalness: 0.02 });
        const iceBlue = this.getMaterial(0xD8EAF5, { roughness: 0.4, metalness: 0.03 });
        const seamMat = this.getMaterial(0xB8D4E8, { roughness: 0.5 });
        const darkMat = this.getMaterial('#030810', { roughness: 1 });
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        const warmGlow = this.getMaterial(0xFFA500, { 
            emissive: 0xFF8C00, 
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });
        
        // Main dome - very high poly for smoothness
        const domeGeo = new THREE.SphereGeometry(domeRadius, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, iceMedium);
        dome.scale.y = domeHeight / domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        group.add(dome);
        
        // Ice block rows - realistic spiral pattern like real igloos
        const rowCount = 7;
        const blocksPerRow = [16, 15, 14, 12, 10, 8, 5]; // Decreasing as we go up
        
        for (let row = 0; row < rowCount; row++) {
            const t = (row + 0.5) / rowCount;
            const rowY = t * domeHeight * 0.95;
            const rowRadius = domeRadius * Math.sqrt(1 - Math.pow(t, 2)) * 0.998;
            
            if (rowRadius < 0.5) continue;
            
            // Horizontal seam
            const seamGeo = new THREE.TorusGeometry(rowRadius, 0.025, 4, 64);
            const seam = new THREE.Mesh(seamGeo, seamMat);
            seam.position.y = rowY;
            seam.rotation.x = Math.PI / 2;
            group.add(seam);
            
            // Vertical seams (block edges) with spiral offset
            const blockCount = blocksPerRow[row] || 8;
            const spiralOffset = row * 0.15; // Spiral effect
            
            for (let b = 0; b < blockCount; b++) {
                const blockAngle = (b / blockCount) * Math.PI * 2 + spiralOffset;
                
                // Skip blocks near entrance (front)
                if (Math.abs(Math.sin(blockAngle)) < 0.25 && Math.cos(blockAngle) > 0) continue;
                
                // Vertical seam line
                const nextRowT = (row + 1.5) / rowCount;
                const nextRowY = Math.min(nextRowT * domeHeight * 0.95, domeHeight * 0.9);
                const nextRowRadius = domeRadius * Math.sqrt(1 - Math.pow(nextRowT, 2)) * 0.998;
                
                if (nextRowRadius > 0.3) {
                    const points = [
                        new THREE.Vector3(
                            Math.cos(blockAngle) * rowRadius,
                            rowY,
                            Math.sin(blockAngle) * rowRadius
                        ),
                        new THREE.Vector3(
                            Math.cos(blockAngle + spiralOffset * 0.1) * nextRowRadius,
                            nextRowY,
                            Math.sin(blockAngle + spiralOffset * 0.1) * nextRowRadius
                        )
                    ];
                    
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ 
                        color: 0xA8C8DD, 
                        linewidth: 1 
                    }));
                    group.add(line);
                }
                
                // Subtle block highlight (every other block slightly different shade)
                if (b % 3 === 0 && row < rowCount - 1) {
                    const highlightT = t + 0.05;
                    const highlightR = domeRadius * Math.sqrt(1 - Math.pow(highlightT, 2)) * 0.99;
                    const highlightGeo = new THREE.SphereGeometry(0.15, 6, 4);
                    const highlight = new THREE.Mesh(highlightGeo, iceWhite);
                    highlight.position.set(
                        Math.cos(blockAngle + 0.1) * highlightR,
                        rowY + 0.1,
                        Math.sin(blockAngle + 0.1) * highlightR
                    );
                    highlight.scale.set(1.5, 0.8, 1);
                    group.add(highlight);
                }
            }
        }
        
        // Entrance tunnel
        if (withEntrance) {
            const tunnelW = 1.4;
            const tunnelH = 1.4;
            const tunnelD = 2.0;
            const tunnelZ = domeRadius * 0.6;
            
            // Curved tunnel using lathe for realistic arch
            const tunnelProfilePts = [];
            const archSteps = 12;
            for (let i = 0; i <= archSteps; i++) {
                const angle = (i / archSteps) * Math.PI;
                tunnelProfilePts.push(new THREE.Vector2(
                    tunnelW / 2 * Math.cos(angle),
                    tunnelH / 2 + tunnelH / 2 * Math.sin(angle)
                ));
            }
            
            // Tunnel walls as smooth curved mesh
            const wallThickness = 0.15;
            
            // Left wall
            const leftWallShape = new THREE.Shape();
            leftWallShape.moveTo(-tunnelW/2 - wallThickness, 0);
            leftWallShape.lineTo(-tunnelW/2 - wallThickness, tunnelH * 0.8);
            leftWallShape.quadraticCurveTo(-tunnelW/2 - wallThickness, tunnelH + 0.1, -tunnelW/4, tunnelH + 0.2);
            leftWallShape.lineTo(-tunnelW/2, tunnelH);
            leftWallShape.quadraticCurveTo(-tunnelW/2, tunnelH * 0.7, -tunnelW/2, 0);
            
            const wallExtrudeSettings = { depth: tunnelD, bevelEnabled: false };
            const leftWallGeo = new THREE.ExtrudeGeometry(leftWallShape, wallExtrudeSettings);
            const leftWall = new THREE.Mesh(leftWallGeo, iceMedium);
            leftWall.position.set(0, 0, tunnelZ);
            leftWall.castShadow = true;
            leftWall.receiveShadow = true;
            group.add(leftWall);
            
            // Right wall (mirror)
            const rightWallShape = new THREE.Shape();
            rightWallShape.moveTo(tunnelW/2 + wallThickness, 0);
            rightWallShape.lineTo(tunnelW/2 + wallThickness, tunnelH * 0.8);
            rightWallShape.quadraticCurveTo(tunnelW/2 + wallThickness, tunnelH + 0.1, tunnelW/4, tunnelH + 0.2);
            rightWallShape.lineTo(tunnelW/2, tunnelH);
            rightWallShape.quadraticCurveTo(tunnelW/2, tunnelH * 0.7, tunnelW/2, 0);
            
            const rightWallGeo = new THREE.ExtrudeGeometry(rightWallShape, wallExtrudeSettings);
            const rightWall = new THREE.Mesh(rightWallGeo, iceMedium);
            rightWall.position.set(0, 0, tunnelZ);
            rightWall.castShadow = true;
            rightWall.receiveShadow = true;
            group.add(rightWall);
            
            // Arched roof
            const roofShape = new THREE.Shape();
            roofShape.moveTo(-tunnelW/2 - 0.1, tunnelH);
            roofShape.quadraticCurveTo(0, tunnelH + 0.5, tunnelW/2 + 0.1, tunnelH);
            roofShape.lineTo(tunnelW/2 + 0.2, tunnelH + 0.15);
            roofShape.quadraticCurveTo(0, tunnelH + 0.7, -tunnelW/2 - 0.2, tunnelH + 0.15);
            
            const roofGeo = new THREE.ExtrudeGeometry(roofShape, wallExtrudeSettings);
            const roof = new THREE.Mesh(roofGeo, iceWhite);
            roof.position.set(0, 0, tunnelZ);
            roof.castShadow = true;
            group.add(roof);
            
            // Tunnel floor
            const floorGeo = new THREE.BoxGeometry(tunnelW + 0.3, 0.06, tunnelD + 0.3);
            const floor = new THREE.Mesh(floorGeo, this.getMaterial(0xE0E8EE, { roughness: 0.55 }));
            floor.position.set(0, 0.03, tunnelZ + tunnelD / 2);
            floor.receiveShadow = true;
            group.add(floor);
            
            // Warm glow from interior (simulates fireplace inside)
            const glowGeo = new THREE.CircleGeometry(tunnelW * 0.4, 16);
            const glow = new THREE.Mesh(glowGeo, warmGlow);
            glow.position.set(0, tunnelH * 0.5, tunnelZ - 0.1);
            group.add(glow);
            
            // Dark interior behind glow
            const interiorGeo = new THREE.CircleGeometry(tunnelW * 0.45, 16);
            const interior = new THREE.Mesh(interiorGeo, darkMat);
            interior.position.set(0, tunnelH * 0.5, tunnelZ - 0.15);
            group.add(interior);
            
            // Entrance arch frame (decorative ice blocks)
            const archBlockCount = 7;
            for (let i = 0; i < archBlockCount; i++) {
                const angle = (i / (archBlockCount - 1)) * Math.PI;
                const archRadius = tunnelW / 2 + 0.25;
                const blockGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
                const block = new THREE.Mesh(blockGeo, iceBlue);
                block.position.set(
                    Math.cos(angle) * archRadius,
                    tunnelH * 0.5 + Math.sin(angle) * archRadius,
                    tunnelZ + tunnelD + 0.08
                );
                block.rotation.z = angle - Math.PI / 2;
                group.add(block);
            }
            
            // Snow piles at entrance
            [-1, 1].forEach(side => {
                const pile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), snowMat);
                pile.position.set(side * 1.2, 0.2, tunnelZ + tunnelD + 0.5);
                pile.scale.set(1.3, 0.5, 1.1);
                pile.castShadow = true;
                group.add(pile);
            });
        }
        
        // Snow drift ring at base (natural looking)
        const driftGeo = new THREE.TorusGeometry(domeRadius + 0.4, 0.6, 12, 64);
        const drift = new THREE.Mesh(driftGeo, this.getMaterial(0xF0F5FA, { roughness: 0.6 }));
        drift.rotation.x = Math.PI / 2;
        drift.position.y = 0.15;
        drift.scale.y = 0.3;
        group.add(drift);
        
        // Random snow mounds around base
        const moundCount = 5;
        for (let i = 0; i < moundCount; i++) {
            const angle = (i / moundCount) * Math.PI * 2 + 0.5;
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0) continue;
            
            const moundGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 6);
            const mound = new THREE.Mesh(moundGeo, snowMat);
            mound.position.set(
                Math.cos(angle) * (domeRadius + 0.8),
                0.1 + Math.random() * 0.1,
                Math.sin(angle) * (domeRadius + 0.8)
            );
            mound.scale.set(1.2, 0.4, 1);
            group.add(mound);
        }
        
        // Icicles hanging from dome edge
        const icicleCount = 8;
        for (let i = 0; i < icicleCount; i++) {
            const angle = (i / icicleCount) * Math.PI * 2 + 0.4;
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.35 && Math.cos(angle) > 0) continue;
            
            const icicleLen = 0.25 + Math.random() * 0.2;
            const icicleGeo = new THREE.ConeGeometry(0.04, icicleLen, 4);
            const icicleMat = this.getMaterial(0xD0F0FF, { 
                roughness: 0.05, 
                transparent: true, 
                opacity: 0.9,
                metalness: 0.1
            });
            const icicle = new THREE.Mesh(icicleGeo, icicleMat);
            icicle.position.set(
                Math.cos(angle) * (domeRadius - 0.02),
                0.4 + Math.random() * 0.2,
                Math.sin(angle) * (domeRadius - 0.02)
            );
            icicle.rotation.x = Math.PI;
            group.add(icicle);
        }
        
        // Collision data
        group.userData.collision = {
            type: 'cylinder',
            radius: domeRadius + 0.5,
            height: domeHeight,
        };
        
        // Interactive zone at entrance
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: domeRadius + 2.2 },
            size: { x: 2.5, z: 2 },
            action: 'enter_igloo'
        };
        
        return group;
    }

    // ==================== LAMP POST ====================
    
    /**
     * Create a classic street lamp with warm glow
     * @param {boolean} isOn - Whether the lamp is lit
     * @param {boolean} castShadow - Whether the light casts shadows (performance impact)
     * @returns {{ mesh: THREE.Group, light: THREE.PointLight }}
     */
    createLampPost(isOn = true, castShadow = false) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'lamp_post';
        
        const postHeight = 5;
        const postRadius = 0.12;
        
        // Base plate - ornate Victorian style
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.25, 8);
        const metalMat = this.getMaterial(PropsFactory.COLORS.metalDark, { roughness: 0.5, metalness: 0.4 });
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.125;
        base.castShadow = true;
        group.add(base);
        
        // Base ring detail
        const baseRingGeo = new THREE.TorusGeometry(0.4, 0.04, 6, 16);
        const baseRing = new THREE.Mesh(baseRingGeo, metalMat);
        baseRing.position.y = 0.25;
        baseRing.rotation.x = Math.PI / 2;
        group.add(baseRing);
        
        // Post - tapered
        const postGeo = new THREE.CylinderGeometry(postRadius * 0.9, postRadius * 1.1, postHeight, 8);
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = postHeight / 2 + 0.25;
        post.castShadow = true;
        group.add(post);
        
        // Decorative rings on post
        [0.4, 0.7].forEach(t => {
            const ringGeo = new THREE.TorusGeometry(postRadius * 1.4, 0.025, 6, 12);
            const ring = new THREE.Mesh(ringGeo, metalMat);
            ring.position.y = postHeight * t;
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        });
        
        // Lamp arm bracket
        const bracketGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
        const bracket = new THREE.Mesh(bracketGeo, metalMat);
        bracket.position.y = postHeight + 0.2;
        group.add(bracket);
        
        // Lamp housing (lantern style)
        const housingGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.35, 6);
        const housing = new THREE.Mesh(housingGeo, metalMat);
        housing.position.y = postHeight + 0.55;
        housing.castShadow = true;
        group.add(housing);
        
        // Lamp roof (pointed)
        const roofGeo = new THREE.ConeGeometry(0.4, 0.35, 6);
        const roof = new THREE.Mesh(roofGeo, metalMat);
        roof.position.y = postHeight + 0.9;
        group.add(roof);
        
        // Roof finial
        const finialGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const finial = new THREE.Mesh(finialGeo, metalMat);
        finial.position.y = postHeight + 1.1;
        group.add(finial);
        
        // Glass globe (brighter when on)
        const globeGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const globeMat = this.getMaterial(
            isOn ? 0xFFF8E0 : PropsFactory.COLORS.iceTranslucent,
            {
                roughness: 0.1,
                transparent: true,
                opacity: isOn ? 0.95 : 0.6,
                emissive: isOn ? 0xFFE4B5 : undefined,
                emissiveIntensity: isOn ? 1.2 : 0,
            }
        );
        const globe = new THREE.Mesh(globeGeo, globeMat);
        globe.position.y = postHeight + 0.35;
        group.add(globe);
        
        // Point light with configurable shadows
        let light = null;
        if (isOn) {
            light = new THREE.PointLight(0xFFE4B5, 1.2, 12, 2);
            light.position.y = postHeight + 0.35;
            light.castShadow = castShadow;
            
            if (castShadow) {
                // Configure shadow for quality
                light.shadow.mapSize.width = 512;
                light.shadow.mapSize.height = 512;
                light.shadow.camera.near = 0.5;
                light.shadow.camera.far = 15;
                light.shadow.bias = -0.001;
            }
            group.add(light);
        }
        
        // Snow on top
        const snowCapGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight);
        const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
        snowCap.position.y = postHeight + 1.15;
        snowCap.scale.set(1.4, 0.35, 1.4);
        group.add(snowCap);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.35,
            height: postHeight + 1.2,
        };
        
        group.userData.light = light;
        group.userData.castShadow = castShadow;
        
        return group;
    }

    // ==================== BENCH ====================
    
    /**
     * Create a snow-covered park bench
     * @param {boolean} withSnow - Add snow cover
     * @returns {THREE.Group}
     */
    createBench(withSnow = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'bench';
        
        const benchWidth = 3;
        const benchDepth = 0.8;
        const seatHeight = 0.8;
        
        const woodMat = this.getMaterial(PropsFactory.COLORS.plankMedium, { roughness: 0.9 });
        const metalMat = this.getMaterial(PropsFactory.COLORS.metalDark, { roughness: 0.5, metalness: 0.4 });
        
        // Metal legs (2 on each side)
        const legPositions = [
            [-benchWidth/2 + 0.3, 0, -benchDepth/2 + 0.15],
            [-benchWidth/2 + 0.3, 0, benchDepth/2 - 0.15],
            [benchWidth/2 - 0.3, 0, -benchDepth/2 + 0.15],
            [benchWidth/2 - 0.3, 0, benchDepth/2 - 0.15],
        ];
        
        const legGeo = new THREE.CylinderGeometry(0.05, 0.06, seatHeight, 6);
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(pos[0], seatHeight / 2, pos[2]);
            leg.castShadow = true;
            group.add(leg);
        });
        
        // Seat planks (5 planks)
        const plankGeo = new THREE.BoxGeometry(benchWidth, 0.08, 0.14);
        for (let i = 0; i < 5; i++) {
            const plank = new THREE.Mesh(plankGeo, woodMat);
            plank.position.set(0, seatHeight, -benchDepth/2 + 0.1 + i * 0.16);
            plank.castShadow = true;
            plank.receiveShadow = true;
            group.add(plank);
        }
        
        // Back rest planks
        const backGeo = new THREE.BoxGeometry(benchWidth, 0.08, 0.12);
        for (let i = 0; i < 3; i++) {
            const back = new THREE.Mesh(backGeo, woodMat);
            back.position.set(0, seatHeight + 0.2 + i * 0.15, -benchDepth/2 - 0.05);
            back.rotation.x = 0.15;
            back.castShadow = true;
            group.add(back);
        }
        
        // Armrests
        const armGeo = new THREE.BoxGeometry(0.1, 0.08, benchDepth + 0.2);
        [-benchWidth/2 + 0.15, benchWidth/2 - 0.15].forEach(x => {
            const arm = new THREE.Mesh(armGeo, woodMat);
            arm.position.set(x, seatHeight + 0.25, 0);
            arm.castShadow = true;
            group.add(arm);
        });
        
        // Snow cover
        if (withSnow) {
            const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
            
            // Snow on seat
            const seatSnowGeo = new THREE.BoxGeometry(benchWidth * 0.9, 0.1, benchDepth * 0.8);
            const seatSnow = new THREE.Mesh(seatSnowGeo, snowMat);
            seatSnow.position.set(0, seatHeight + 0.08, 0.05);
            group.add(seatSnow);
            
            // Snow on back
            const backSnowGeo = new THREE.BoxGeometry(benchWidth * 0.85, 0.08, 0.2);
            const backSnow = new THREE.Mesh(backSnowGeo, snowMat);
            backSnow.position.set(0, seatHeight + 0.55, -benchDepth/2 - 0.1);
            backSnow.rotation.x = 0.15;
            group.add(backSnow);
            
            // Snow clumps on armrests
            const clumpGeo = new THREE.SphereGeometry(0.12, 6, 6);
            [-benchWidth/2 + 0.15, benchWidth/2 - 0.15].forEach(x => {
                const clump = new THREE.Mesh(clumpGeo, snowMat);
                clump.position.set(x, seatHeight + 0.35, 0.1);
                clump.scale.y = 0.5;
                group.add(clump);
            });
        }
        
        // Collision - height is the seat height (so players can stand on top)
        // The collision blocks at seat level, allowing jumping onto the bench
        group.userData.collision = {
            type: 'box',
            size: { x: benchWidth + 0.2, y: seatHeight, z: benchDepth + 0.3 },
            height: seatHeight, // Explicit height for landing detection
        };
        
        // Interaction zone (for sitting) with two snap points
        // Bench faces +Z direction (back rest at -Z), so sitting players face +Z
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: benchDepth/2 + 0.8 },
            size: { x: benchWidth + 1, z: 2 },
            action: 'sit',
            emote: 'Sit',
            seatHeight: seatHeight,
            benchDepth: benchDepth,
            // Two seat positions: left and right side of bench (centered on each half)
            // x: ±0.6 centers player on each side of the bench
            // z: 0 centers player on the seat planks
            snapPoints: [
                { x: -0.6, z: 0 },    // Left seat (centered on left half)
                { x: 0.6, z: 0 }      // Right seat (centered on right half)
            ],
            maxOccupants: 2
        };
        
        return group;
    }

    // ==================== SNOW PILE ====================
    
    /**
     * Create a decorative snow pile/drift
     * @param {string} size - 'small' | 'medium' | 'large'
     * @returns {THREE.Group}
     */
    createSnowPile(size = 'medium') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = `snow_pile_${size}`;
        
        const sizes = {
            small: { scale: 0.5, mounds: 1 },
            medium: { scale: 1.0, mounds: 2 },
            large: { scale: 1.5, mounds: 3 },
        };
        const cfg = sizes[size] || sizes.medium;
        
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.65 });
        const shadowMat = this.getMaterial(PropsFactory.COLORS.snowShadow, { roughness: 0.7 });
        
        // Main mound
        const mainGeo = new THREE.SphereGeometry(1 * cfg.scale, 12, 8);
        const main = new THREE.Mesh(mainGeo, snowMat);
        main.scale.set(1.5, 0.4, 1.2);
        main.position.y = 0.2 * cfg.scale;
        main.receiveShadow = true;
        group.add(main);
        
        // Additional mounds
        for (let i = 0; i < cfg.mounds; i++) {
            const moundGeo = new THREE.SphereGeometry(0.6 * cfg.scale, 8, 6);
            const mound = new THREE.Mesh(moundGeo, i % 2 === 0 ? snowMat : shadowMat);
            const angle = (i / cfg.mounds) * Math.PI * 2;
            mound.position.set(
                Math.cos(angle) * 0.8 * cfg.scale,
                0.15 * cfg.scale,
                Math.sin(angle) * 0.6 * cfg.scale
            );
            mound.scale.set(1.2, 0.5, 1);
            mound.receiveShadow = true;
            group.add(mound);
        }
        
        // PERFORMANCE: Sparkle points removed - too many small meshes
        
        // No collision - decorative only
        group.userData.collision = null;
        
        return group;
    }

    // ==================== SIGNPOST ====================
    
    /**
     * Create a directional signpost
     * @param {Array<{text: string, direction: number}>} signs - Array of sign configs
     * @returns {THREE.Group}
     */
    createSignpost(signs = [{ text: 'TOWN', direction: 0 }]) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'signpost';
        
        const postHeight = 3;
        
        // Post
        const postGeo = new THREE.CylinderGeometry(0.08, 0.1, postHeight, 6);
        const woodMat = this.getMaterial(PropsFactory.COLORS.plankDark, { roughness: 0.9 });
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.y = postHeight / 2;
        post.castShadow = true;
        group.add(post);
        
        // Signs
        const signMat = this.getMaterial(PropsFactory.COLORS.plankLight, { roughness: 0.85 });
        
        signs.forEach((signConfig, index) => {
            const signGroup = new THREE.Group();
            
            // Sign board (arrow shape)
            const boardWidth = 1.8;
            const boardHeight = 0.4;
            const arrowPoint = 0.3;
            
            // Create arrow shape
            const shape = new THREE.Shape();
            shape.moveTo(-boardWidth/2, -boardHeight/2);
            shape.lineTo(boardWidth/2 - arrowPoint, -boardHeight/2);
            shape.lineTo(boardWidth/2, 0);
            shape.lineTo(boardWidth/2 - arrowPoint, boardHeight/2);
            shape.lineTo(-boardWidth/2, boardHeight/2);
            shape.lineTo(-boardWidth/2, -boardHeight/2);
            
            const extrudeSettings = { depth: 0.08, bevelEnabled: false };
            const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const board = new THREE.Mesh(boardGeo, signMat);
            board.position.z = -0.04;
            board.castShadow = true;
            signGroup.add(board);
            
            // Text (using canvas texture)
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#3A2010';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(signConfig.text || 'SIGN', 110, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const textMat = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true,
                depthWrite: false
            });
            const textGeo = new THREE.PlaneGeometry(boardWidth - 0.4, boardHeight - 0.1);
            const text = new THREE.Mesh(textGeo, textMat);
            text.position.z = 0.05;
            signGroup.add(text);
            
            // Position and rotate sign
            signGroup.position.y = postHeight - 0.3 - index * 0.5;
            signGroup.rotation.y = (signConfig.direction || 0) * Math.PI / 180;
            
            group.add(signGroup);
        });
        
        // Snow cap
        const snowGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = postHeight + 0.1;
        snow.scale.set(1.5, 0.5, 1.5);
        group.add(snow);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.3,
            height: postHeight,
        };
        
        return group;
    }

    // ==================== ROCK ====================
    
    /**
     * Create a snow-dusted rock
     * @param {string} size - 'small' | 'medium' | 'large'
     * @returns {THREE.Group}
     */
    createRock(size = 'medium') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = `rock_${size}`;
        
        const sizes = {
            small: { scale: 0.5, segments: 4 },
            medium: { scale: 1.0, segments: 5 },
            large: { scale: 1.8, segments: 6 },
        };
        const cfg = sizes[size] || sizes.medium;
        
        // Irregular rock shape (deformed icosahedron)
        const rockGeo = new THREE.IcosahedronGeometry(1 * cfg.scale, cfg.segments - 3);
        const positions = rockGeo.attributes.position;
        
        // Deform vertices for organic look
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            const noise = Math.sin(x * 3) * Math.cos(z * 2) * 0.15;
            positions.setX(i, x * (1 + noise));
            positions.setY(i, y * (0.6 + Math.abs(noise)));
            positions.setZ(i, z * (1 + noise * 0.5));
        }
        rockGeo.computeVertexNormals();
        
        const rockMat = this.getMaterial(PropsFactory.COLORS.rockMedium, { roughness: 0.95 });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.y = 0.3 * cfg.scale;
        rock.rotation.y = Math.random() * Math.PI * 2;
        rock.castShadow = true;
        rock.receiveShadow = true;
        group.add(rock);
        
        // Snow on top
        const snowGeo = new THREE.SphereGeometry(0.8 * cfg.scale, 8, 6);
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.5 * cfg.scale;
        snow.scale.set(1.2, 0.3, 1.2);
        group.add(snow);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 0.9 * cfg.scale,
            height: 1 * cfg.scale,
        };
        
        return group;
    }

    // ==================== SNOWMAN ====================
    
    /**
     * Create an interactive snowman
     * @returns {THREE.Group}
     */
    createSnowman() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'snowman';
        
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        
        // Bottom ball
        const bottomGeo = new THREE.SphereGeometry(0.8, 16, 12);
        const bottom = new THREE.Mesh(bottomGeo, snowMat);
        bottom.position.y = 0.7;
        bottom.scale.y = 0.9;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        group.add(bottom);
        
        // Middle ball
        const middleGeo = new THREE.SphereGeometry(0.55, 14, 10);
        const middle = new THREE.Mesh(middleGeo, snowMat);
        middle.position.y = 1.7;
        middle.castShadow = true;
        group.add(middle);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 12, 10);
        const head = new THREE.Mesh(headGeo, snowMat);
        head.position.y = 2.4;
        head.castShadow = true;
        group.add(head);
        
        // Eyes (coal)
        const eyeMat = this.getMaterial('#1A1A1A');
        const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
        [-0.12, 0.12].forEach(x => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(x, 2.5, 0.35);
            group.add(eye);
        });
        
        // Carrot nose
        const noseGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
        const noseMat = this.getMaterial('#FF6600');
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 2.4, 0.4);
        nose.rotation.x = Math.PI / 2;
        group.add(nose);
        
        // Smile (coal pieces) - curved upward for happy face :)
        for (let i = -2; i <= 2; i++) {
            const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
            const angle = (i / 4) * 0.5 - 0.1;
            mouth.position.set(
                Math.sin(angle) * 0.25,
                2.22 + Math.abs(i) * 0.04,  // Inverted: edges UP = smile
                0.35 + Math.cos(angle) * 0.05
            );
            group.add(mouth);
        }
        
        // Buttons
        [1.5, 1.7, 1.9].forEach(y => {
            const button = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
            button.position.set(0, y, 0.52);
            group.add(button);
        });
        
        // Stick arms
        const stickMat = this.getMaterial(PropsFactory.COLORS.barkDark);
        [-1, 1].forEach(side => {
            const armGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 4);
            const arm = new THREE.Mesh(armGeo, stickMat);
            arm.position.set(side * 0.7, 1.7, 0);
            arm.rotation.z = side * 0.8;
            arm.castShadow = true;
            group.add(arm);
            
            // Twig fingers
            for (let i = 0; i < 2; i++) {
                const twig = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.01, 0.2, 3),
                    stickMat
                );
                twig.position.set(side * 1.0, 1.9 + i * 0.1, 0);
                twig.rotation.z = side * (1.2 + i * 0.3);
                group.add(twig);
            }
        });
        
        // Scarf
        const scarfMat = this.getMaterial('#CC2222', { roughness: 0.8 });
        const scarfGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 16);
        const scarf = new THREE.Mesh(scarfGeo, scarfMat);
        scarf.position.y = 2.1;
        scarf.rotation.x = Math.PI / 2;
        group.add(scarf);
        
        // Scarf tail
        const tailGeo = new THREE.BoxGeometry(0.15, 0.5, 0.06);
        const tail = new THREE.Mesh(tailGeo, scarfMat);
        tail.position.set(0.3, 1.85, 0.3);
        tail.rotation.z = 0.3;
        group.add(tail);
        
        // Top hat (optional - adds personality)
        const hatMat = this.getMaterial('#1A1A1A');
        const brimGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12);
        const brim = new THREE.Mesh(brimGeo, hatMat);
        brim.position.y = 2.75;
        group.add(brim);
        
        const crownGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.35, 12);
        const crown = new THREE.Mesh(crownGeo, hatMat);
        crown.position.y = 2.95;
        crown.castShadow = true;
        group.add(crown);
        
        // Hat band
        const bandGeo = new THREE.TorusGeometry(0.31, 0.03, 6, 16);
        const bandMat = this.getMaterial('#CC2222');
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 2.82;
        band.rotation.x = Math.PI / 2;
        group.add(band);
        
        // Collision
        group.userData.collision = {
            type: 'cylinder',
            radius: 1,
            height: 3.2,
        };
        
        // Interaction
        group.userData.interactionZone = {
            type: 'sphere',
            radius: 2,
            action: 'interact_snowman',
            message: '☃️ Hello friend!'
        };
        
        return group;
    }

    // ==================== FENCE SECTION ====================
    
    /**
     * Create a wooden fence section
     * @param {number} length - Length of fence section
     * @returns {THREE.Group}
     */
    createFence(length = 4) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'fence';
        
        const woodMat = this.getMaterial(PropsFactory.COLORS.plankMedium, { roughness: 0.9 });
        const snowMat = this.getMaterial(PropsFactory.COLORS.snowLight, { roughness: 0.6 });
        
        const postSpacing = 2;
        const postCount = Math.ceil(length / postSpacing) + 1;
        const postHeight = 1.2;
        
        // Posts
        const postGeo = new THREE.BoxGeometry(0.12, postHeight, 0.12);
        for (let i = 0; i < postCount; i++) {
            const post = new THREE.Mesh(postGeo, woodMat);
            post.position.set(i * postSpacing - length/2, postHeight/2, 0);
            post.castShadow = true;
            group.add(post);
            
            // Snow cap
            const cap = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 6, 6),
                snowMat
            );
            cap.position.set(i * postSpacing - length/2, postHeight + 0.05, 0);
            cap.scale.y = 0.4;
            group.add(cap);
        }
        
        // Horizontal rails
        const railGeo = new THREE.BoxGeometry(length, 0.08, 0.06);
        [0.4, 0.8].forEach(y => {
            const rail = new THREE.Mesh(railGeo, woodMat);
            rail.position.y = y;
            rail.castShadow = true;
            group.add(rail);
        });
        
        // Snow on top rail
        const snowRailGeo = new THREE.BoxGeometry(length, 0.04, 0.1);
        const snowRail = new THREE.Mesh(snowRailGeo, snowMat);
        snowRail.position.y = 0.85;
        group.add(snowRail);
        
        // Collision
        group.userData.collision = {
            type: 'box',
            size: { x: length, y: postHeight, z: 0.3 },
        };
        
        return group;
    }

    // ==================== IPAD/TABLET PROP ====================
    
    /**
     * Create an iPad/tablet prop for penguins playing games
     * This shows when players are in an active match
     * @param {string} screenColor - Color of the screen glow
     * @returns {THREE.Group}
     */
    createTablet(screenColor = '#00FFFF') {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'tablet';
        
        // Tablet dimensions (held horizontally)
        const width = 0.8;
        const height = 0.5;
        const depth = 0.04;
        
        // Tablet body (dark gray)
        const bodyMat = this.getMaterial('#1A1A2E', { roughness: 0.3, metalness: 0.5 });
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);
        
        // Screen bezel
        const bezelMat = this.getMaterial('#0A0A14', { roughness: 0.2 });
        const bezelGeo = new THREE.BoxGeometry(width * 0.92, height * 0.88, depth * 0.5);
        const bezel = new THREE.Mesh(bezelGeo, bezelMat);
        bezel.position.z = depth * 0.3;
        group.add(bezel);
        
        // Glowing screen
        const screenMat = this.getMaterial(screenColor, { 
            roughness: 0.1, 
            emissive: screenColor,
            emissiveIntensity: 0.6
        });
        const screenGeo = new THREE.PlaneGeometry(width * 0.86, height * 0.82);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.z = depth * 0.52;
        group.add(screen);
        
        // Screen reflection highlight
        const highlightMat = this.getMaterial('#FFFFFF', { 
            transparent: true, 
            opacity: 0.1,
            roughness: 0
        });
        const highlightGeo = new THREE.PlaneGeometry(width * 0.4, height * 0.3);
        const highlight = new THREE.Mesh(highlightGeo, highlightMat);
        highlight.position.set(-width * 0.15, height * 0.2, depth * 0.53);
        highlight.rotation.z = -0.2;
        group.add(highlight);
        
        // Game icon on screen (simple card symbol)
        const iconGeo = new THREE.PlaneGeometry(0.15, 0.2);
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚔️', 32, 32);
        const texture = new THREE.CanvasTexture(canvas);
        const iconMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const icon = new THREE.Mesh(iconGeo, iconMat);
        icon.position.z = depth * 0.54;
        group.add(icon);
        
        // Small point light for glow effect (very subtle)
        const glow = new THREE.PointLight(screenColor, 0.3, 2, 2);
        glow.position.z = depth * 0.6;
        glow.castShadow = false;
        group.add(glow);
        
        // Position for holding in front of penguin
        // The tablet should be held at chest height, tilted slightly
        group.position.set(0, 0.8, 0.6);
        group.rotation.x = -0.3; // Tilt back slightly
        
        return group;
    }
    
    /**
     * Create a match indicator effect (floating cards/emojis)
     * Shown around players who are in an active match
     * @returns {THREE.Group}
     */
    createMatchIndicator() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'match_indicator';
        
        // Floating card symbols around the player
        const symbols = ['🔥', '💧', '❄️'];
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        symbols.forEach((symbol, i) => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 64, 64);
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, 32, 32);
            
            const texture = new THREE.CanvasTexture(canvas.cloneNode(true).getContext('2d').canvas);
            // Clone context and redraw
            const cloneCanvas = document.createElement('canvas');
            cloneCanvas.width = 64;
            cloneCanvas.height = 64;
            const cloneCtx = cloneCanvas.getContext('2d');
            cloneCtx.font = '48px Arial';
            cloneCtx.textAlign = 'center';
            cloneCtx.textBaseline = 'middle';
            cloneCtx.fillText(symbol, 32, 32);
            const tex = new THREE.CanvasTexture(cloneCanvas);
            
            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
            const sprite = new THREE.Sprite(mat);
            
            const angle = (i / symbols.length) * Math.PI * 2;
            sprite.position.set(
                Math.cos(angle) * 1.2,
                2.5 + Math.sin(Date.now() * 0.001 + i) * 0.2,
                Math.sin(angle) * 1.2
            );
            sprite.scale.set(0.4, 0.4, 1);
            
            group.add(sprite);
        });
        
        return group;
    }

    // ==================== CAMPSITE PROPS ====================

    /**
     * Create a campfire with flames and logs
     * @param {boolean} isLit - Whether the fire is burning
     * @returns {{ mesh: THREE.Group, light: THREE.PointLight, particles: THREE.Points }}
     */
    createCampfire(isLit = true) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'campfire';
        
        // Stone ring
        const stoneMat = this.getMaterial(0x555555, { roughness: 0.9 });
        const stoneRingRadius = 1.2;
        const stoneCount = 10;
        
        for (let i = 0; i < stoneCount; i++) {
            const angle = (i / stoneCount) * Math.PI * 2;
            const stoneGeo = new THREE.DodecahedronGeometry(0.25, 0);
            const stone = new THREE.Mesh(stoneGeo, stoneMat);
            stone.position.set(
                Math.cos(angle) * stoneRingRadius,
                0.1,
                Math.sin(angle) * stoneRingRadius
            );
            stone.rotation.set(Math.random(), Math.random(), Math.random());
            stone.scale.set(1 + Math.random() * 0.3, 0.6 + Math.random() * 0.2, 1 + Math.random() * 0.3);
            group.add(stone);
        }
        
        // Logs in center
        const logMat = this.getMaterial(0x4A3728, { roughness: 0.95 });
        const logGeo = new THREE.CylinderGeometry(0.15, 0.18, 1.2, 8);
        
        for (let i = 0; i < 4; i++) {
            const log = new THREE.Mesh(logGeo, logMat);
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            log.position.set(
                Math.cos(angle) * 0.3,
                0.15,
                Math.sin(angle) * 0.3
            );
            log.rotation.z = Math.PI / 2;
            log.rotation.y = angle;
            group.add(log);
        }
        
        // Charred center
        const charGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 12);
        const charMat = this.getMaterial(0x1A1A1A, { roughness: 1 });
        const char = new THREE.Mesh(charGeo, charMat);
        char.position.y = 0.05;
        group.add(char);
        
        let fireLight = null;
        let particles = null;
        
        if (isLit) {
            // Fire glow light
            fireLight = new THREE.PointLight(0xFF6600, 2, 8);
            fireLight.position.y = 1;
            group.add(fireLight);
            
            // Flame sprites (using simple cones)
            const flameMat = new THREE.MeshBasicMaterial({ 
                color: 0xFF4500, 
                transparent: true, 
                opacity: 0.9 
            });
            const flameGeo = new THREE.ConeGeometry(0.3, 1.2, 8);
            
            for (let i = 0; i < 3; i++) {
                const flame = new THREE.Mesh(flameGeo, flameMat.clone());
                flame.material.color.setHex([0xFF4500, 0xFF6600, 0xFFAA00][i]);
                flame.position.set(
                    (Math.random() - 0.5) * 0.4,
                    0.5 + i * 0.15,
                    (Math.random() - 0.5) * 0.4
                );
                flame.scale.set(1 - i * 0.2, 1, 1 - i * 0.2);
                flame.userData.isFlame = true;
                flame.userData.baseY = flame.position.y;
                flame.userData.offset = Math.random() * Math.PI * 2;
                group.add(flame);
            }
            
            // Ember particles
            const particleCount = 30;
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 0.8;
                positions[i * 3 + 1] = Math.random() * 2;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
                
                const color = new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
            
            const particleGeo = new THREE.BufferGeometry();
            particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            
            const particleMat = new THREE.PointsMaterial({
                size: 0.08,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            });
            
            particles = new THREE.Points(particleGeo, particleMat);
            particles.userData.isEmbers = true;
            group.add(particles);
        }
        
        // No collision - players can walk through/near the fire
        // group.userData.collision = { type: 'cylinder', radius: 1.5, height: 1 };
        
        // Interaction zone for warming up
        group.userData.interactionZone = {
            type: 'cylinder',
            radius: 3,
            message: '🔥 Warm yourself by the fire',
            emote: 'Sit'
        };
        
        return { mesh: group, light: fireLight, particles };
    }

    /**
     * Create a log seat for sitting around campfire
     * @param {number} rotation - Rotation in radians (facing direction)
     * @returns {THREE.Group}
     */
    createLogSeat(rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'log_seat';
        
        const logWidth = 2;
        const logRadius = 0.35;
        const seatHeight = 0.5;
        
        // Main log (lying on its side)
        const logMat = this.getMaterial(0x5C4033, { roughness: 0.9 });
        const logGeo = new THREE.CylinderGeometry(logRadius, logRadius + 0.05, logWidth, 12);
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 2;
        log.position.y = logRadius;
        log.castShadow = true;
        log.receiveShadow = true;
        group.add(log);
        
        // Bark texture rings
        const barkMat = this.getMaterial(0x3D2817, { roughness: 1 });
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(logRadius + 0.02, 0.025, 6, 16);
            const ring = new THREE.Mesh(ringGeo, barkMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.set(-0.7 + i * 0.7, logRadius, 0);
            group.add(ring);
        }
        
        // End caps (tree rings visible)
        const endCapGeo = new THREE.CircleGeometry(logRadius, 12);
        const endCapMat = this.getMaterial(0x8B7355, { roughness: 0.9 });
        const leftCap = new THREE.Mesh(endCapGeo, endCapMat);
        leftCap.rotation.y = Math.PI / 2;
        leftCap.position.set(-logWidth / 2, logRadius, 0);
        group.add(leftCap);
        
        const rightCap = new THREE.Mesh(endCapGeo, endCapMat);
        rightCap.rotation.y = -Math.PI / 2;
        rightCap.position.set(logWidth / 2, logRadius, 0);
        group.add(rightCap);
        
        // Light snow dusting on top
        const snowMat = this.getMaterial(0xFFFFFF, { roughness: 0.8 });
        const snowGeo = new THREE.BoxGeometry(logWidth * 0.8, 0.05, logRadius * 0.8);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = logRadius * 2 + 0.02;
        group.add(snow);
        
        // Apply rotation to entire group
        group.rotation.y = rotation;
        
        // Collision - allows jumping onto the log
        group.userData.collision = {
            type: 'box',
            size: { x: logWidth + 0.4, y: seatHeight, z: logRadius * 2 + 0.4 },
            height: seatHeight
        };
        
        // Interaction zone for sitting (matches bench setup)
        // Players approach from the front (+Z in local space after rotation)
        group.userData.interactionZone = {
            type: 'box',
            position: { x: 0, z: 0.8 },
            size: { x: logWidth + 1, z: 2 },
            action: 'sit',
            message: '🪵 Sit on log',
            emote: 'Sit',
            seatHeight: seatHeight,
            benchDepth: logRadius * 2,
            // Two seat positions: left and right side of log
            snapPoints: [
                { x: -0.5, z: 0 },    // Left seat
                { x: 0.5, z: 0 }      // Right seat
            ],
            maxOccupants: 2,
            // Store rotation for proper facing direction when seated
            benchRotation: rotation
        };
        
        return group;
    }

    // ==================== UTILITY METHODS ====================
    
    /**
     * Dispose of all cached materials and geometries
     */
    dispose() {
        this.materialCache.forEach(mat => mat.dispose());
        this.geometryCache.forEach(geo => geo.dispose());
        this.materialCache.clear();
        this.geometryCache.clear();
    }
}

export default PropsFactory;

