/**
 * IceSculpture - High-quality decorative ice sculptures
 * Larger scale with more geometric detail and crystal-like appearance
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class IceSculpture extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} type - 'penguin' | 'fish' | 'heart' | 'star'
     * @param {number} rotation - Y-axis rotation in radians
     */
    constructor(THREE, type = 'penguin', rotation = 0) {
        super(THREE);
        this.type = type;
        this.rotation = rotation;
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = `ice_sculpture_${this.type}`;
        group.position.set(x, y, z);
        group.rotation.y = this.rotation;
        
        // Premium ice material - crystal-like with frosted edges
        const iceMat = new THREE.MeshStandardMaterial({
            color: 0xC5E8F7,
            roughness: 0.05,
            metalness: 0.2,
            transparent: true,
            opacity: 0.88,
            envMapIntensity: 1.5,
        });
        this.materials.push(iceMat);
        
        // Frosted ice for details
        const frostedMat = new THREE.MeshStandardMaterial({
            color: 0xE8F4F8,
            roughness: 0.4,
            metalness: 0.05,
            transparent: true,
            opacity: 0.95,
        });
        this.materials.push(frostedMat);
        
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Large ice pedestal with carved details
        const pedestalGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.5, 12);
        const pedestal = new THREE.Mesh(pedestalGeo, frostedMat);
        pedestal.position.y = 0.25;
        pedestal.castShadow = true;
        pedestal.receiveShadow = true;
        this.addMesh(pedestal, group);
        
        // Pedestal rim detail
        const rimGeo = new THREE.TorusGeometry(1.3, 0.08, 8, 24);
        const rim = new THREE.Mesh(rimGeo, iceMat);
        rim.position.y = 0.5;
        rim.rotation.x = Math.PI / 2;
        this.addMesh(rim, group);
        
        // Create sculpture based on type
        switch (this.type) {
            case 'fish':
                this.createFish(group, iceMat, frostedMat);
                break;
            case 'heart':
                this.createHeart(group, iceMat, frostedMat);
                break;
            case 'star':
                this.createStar(group, iceMat, frostedMat);
                break;
            case 'penguin':
            default:
                this.createPenguin(group, iceMat, frostedMat);
                break;
        }
        
        // Snow pile at base
        const snowBaseGeo = new THREE.TorusGeometry(1.35, 0.25, 8, 24);
        const snowBase = new THREE.Mesh(snowBaseGeo, snowMat);
        snowBase.position.y = 0.05;
        snowBase.rotation.x = Math.PI / 2;
        snowBase.scale.y = 0.6;
        this.addMesh(snowBase, group);
        
        // Snow dusting on top
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const snowDustGeo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6);
            const snowDust = new THREE.Mesh(snowDustGeo, snowMat);
            snowDust.position.set(
                Math.cos(angle) * 1.1,
                0.08,
                Math.sin(angle) * 1.1
            );
            snowDust.scale.y = 0.4;
            this.addMesh(snowDust, group);
        }
        
        return this;
    }
    
    createPenguin(group, iceMat, frostedMat) {
        const THREE = this.THREE;
        const scale = 2.2; // Much larger
        
        // Body - main torso
        const bodyGeo = new THREE.SphereGeometry(0.5 * scale, 24, 20);
        const body = new THREE.Mesh(bodyGeo, iceMat);
        body.position.y = 0.5 + 0.8 * scale;
        body.scale.set(1, 1.3, 0.85);
        body.castShadow = true;
        this.addMesh(body, group);
        
        // Belly highlight (frosted)
        const bellyGeo = new THREE.SphereGeometry(0.35 * scale, 16, 14);
        const belly = new THREE.Mesh(bellyGeo, frostedMat);
        belly.position.set(0, 0.5 + 0.75 * scale, 0.2 * scale);
        belly.scale.set(0.9, 1.2, 0.5);
        this.addMesh(belly, group);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.38 * scale, 20, 16);
        const head = new THREE.Mesh(headGeo, iceMat);
        head.position.y = 0.5 + 1.6 * scale;
        head.castShadow = true;
        this.addMesh(head, group);
        
        // Beak - more detailed
        const beakGeo = new THREE.ConeGeometry(0.1 * scale, 0.25 * scale, 6);
        const beak = new THREE.Mesh(beakGeo, frostedMat);
        beak.position.set(0, 0.5 + 1.5 * scale, 0.35 * scale);
        beak.rotation.x = Math.PI / 2;
        this.addMesh(beak, group);
        
        // Eyes (carved indentations simulated with darker spheres)
        [-1, 1].forEach(side => {
            const eyeGeo = new THREE.SphereGeometry(0.06 * scale, 10, 10);
            const eye = new THREE.Mesh(eyeGeo, frostedMat);
            eye.position.set(side * 0.15 * scale, 0.5 + 1.65 * scale, 0.3 * scale);
            this.addMesh(eye, group);
        });
        
        // Wings - more detailed with feather ridges
        [-1, 1].forEach(side => {
            // Main wing
            const wingGeo = new THREE.SphereGeometry(0.18 * scale, 12, 12);
            const wing = new THREE.Mesh(wingGeo, iceMat);
            wing.position.set(side * 0.5 * scale, 0.5 + 0.9 * scale, 0);
            wing.scale.set(0.5, 1.4, 0.7);
            wing.rotation.z = side * 0.3;
            this.addMesh(wing, group);
            
            // Wing tip
            const tipGeo = new THREE.ConeGeometry(0.08 * scale, 0.3 * scale, 6);
            const tip = new THREE.Mesh(tipGeo, iceMat);
            tip.position.set(side * 0.55 * scale, 0.5 + 0.5 * scale, 0);
            tip.rotation.z = side * Math.PI / 2;
            this.addMesh(tip, group);
        });
        
        // Feet - more detailed
        [-0.18, 0.18].forEach(xOff => {
            // Main foot
            const footGeo = new THREE.SphereGeometry(0.15 * scale, 10, 8);
            const foot = new THREE.Mesh(footGeo, frostedMat);
            foot.position.set(xOff * scale, 0.55, 0.2 * scale);
            foot.scale.set(1, 0.35, 1.6);
            this.addMesh(foot, group);
            
            // Toes
            for (let t = -1; t <= 1; t++) {
                const toeGeo = new THREE.SphereGeometry(0.04 * scale, 6, 6);
                const toe = new THREE.Mesh(toeGeo, frostedMat);
                toe.position.set(xOff * scale + t * 0.08 * scale, 0.52, 0.4 * scale);
                toe.scale.set(1, 0.5, 1.5);
                this.addMesh(toe, group);
            }
        });
        
        // Tail
        const tailGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
        const tail = new THREE.Mesh(tailGeo, iceMat);
        tail.position.set(0, 0.5 + 0.4 * scale, -0.35 * scale);
        tail.scale.set(0.8, 0.6, 1);
        this.addMesh(tail, group);
    }
    
    createFish(group, iceMat, frostedMat) {
        const THREE = this.THREE;
        const scale = 2.2;
        
        // Create fish container and rotate it to face forward (along Z axis)
        const fishGroup = new THREE.Group();
        fishGroup.rotation.y = Math.PI / 2; // Rotate 90 degrees to face forward
        group.add(fishGroup);
        
        // Body - main fish shape
        const bodyGeo = new THREE.SphereGeometry(0.5 * scale, 24, 20);
        const body = new THREE.Mesh(bodyGeo, iceMat);
        body.position.y = 0.5 + 1.0 * scale;
        body.scale.set(2.0, 0.9, 0.65);
        body.castShadow = true;
        fishGroup.add(body);
        this.meshes.push(body);
        
        // Belly stripe
        const stripeGeo = new THREE.SphereGeometry(0.35 * scale, 16, 12);
        const stripe = new THREE.Mesh(stripeGeo, frostedMat);
        stripe.position.set(0.1 * scale, 0.5 + 0.9 * scale, 0);
        stripe.scale.set(1.8, 0.5, 0.4);
        fishGroup.add(stripe);
        this.meshes.push(stripe);
        
        // Tail fin - more elaborate
        const tailMainGeo = new THREE.ConeGeometry(0.35 * scale, 0.6 * scale, 6);
        const tailMain = new THREE.Mesh(tailMainGeo, iceMat);
        tailMain.position.set(-0.85 * scale, 0.5 + 1.0 * scale, 0);
        tailMain.rotation.z = Math.PI / 2;
        tailMain.scale.set(1.2, 1.8, 0.5);
        fishGroup.add(tailMain);
        this.meshes.push(tailMain);
        
        // Upper tail lobe
        const tailUpGeo = new THREE.ConeGeometry(0.18 * scale, 0.45 * scale, 5);
        const tailUp = new THREE.Mesh(tailUpGeo, iceMat);
        tailUp.position.set(-1.1 * scale, 0.5 + 1.25 * scale, 0);
        tailUp.rotation.z = Math.PI / 4;
        fishGroup.add(tailUp);
        this.meshes.push(tailUp);
        
        // Lower tail lobe
        const tailDownGeo = new THREE.ConeGeometry(0.18 * scale, 0.45 * scale, 5);
        const tailDown = new THREE.Mesh(tailDownGeo, iceMat);
        tailDown.position.set(-1.1 * scale, 0.5 + 0.75 * scale, 0);
        tailDown.rotation.z = -Math.PI / 4;
        fishGroup.add(tailDown);
        this.meshes.push(tailDown);
        
        // Dorsal fin - large and detailed
        const dorsalGeo = new THREE.ConeGeometry(0.22 * scale, 0.55 * scale, 5);
        const dorsal = new THREE.Mesh(dorsalGeo, iceMat);
        dorsal.position.set(0.15 * scale, 0.5 + 1.6 * scale, 0);
        dorsal.scale.z = 0.3;
        fishGroup.add(dorsal);
        this.meshes.push(dorsal);
        
        // Dorsal fin support ridges
        for (let i = 0; i < 3; i++) {
            const ridgeGeo = new THREE.BoxGeometry(0.02 * scale, 0.4 * scale, 0.05 * scale);
            const ridge = new THREE.Mesh(ridgeGeo, frostedMat);
            ridge.position.set((0.05 + i * 0.08) * scale, 0.5 + 1.45 * scale, 0);
            ridge.rotation.z = -0.2;
            fishGroup.add(ridge);
            this.meshes.push(ridge);
        }
        
        // Side fins (pectoral)
        [-1, 1].forEach(side => {
            const sideFinGeo = new THREE.ConeGeometry(0.15 * scale, 0.35 * scale, 5);
            const sideFin = new THREE.Mesh(sideFinGeo, iceMat);
            sideFin.position.set(0.3 * scale, 0.5 + 0.75 * scale, side * 0.3 * scale);
            sideFin.rotation.x = side * 0.7;
            sideFin.rotation.z = 0.5;
            sideFin.scale.z = 0.4;
            fishGroup.add(sideFin);
            this.meshes.push(sideFin);
        });
        
        // Ventral fin
        const ventralGeo = new THREE.ConeGeometry(0.1 * scale, 0.25 * scale, 4);
        const ventral = new THREE.Mesh(ventralGeo, iceMat);
        ventral.position.set(-0.1 * scale, 0.5 + 0.55 * scale, 0);
        ventral.rotation.z = Math.PI;
        fishGroup.add(ventral);
        this.meshes.push(ventral);
        
        // Head shape
        const headGeo = new THREE.SphereGeometry(0.3 * scale, 16, 14);
        const head = new THREE.Mesh(headGeo, iceMat);
        head.position.set(0.75 * scale, 0.5 + 1.0 * scale, 0);
        head.scale.set(1.4, 0.9, 0.7);
        fishGroup.add(head);
        this.meshes.push(head);
        
        // Eyes - larger and more detailed
        [-1, 1].forEach(side => {
            const eyeGeo = new THREE.SphereGeometry(0.1 * scale, 12, 12);
            const eye = new THREE.Mesh(eyeGeo, frostedMat);
            eye.position.set(0.85 * scale, 0.5 + 1.1 * scale, side * 0.22 * scale);
            fishGroup.add(eye);
            this.meshes.push(eye);
            
            // Pupil
            const pupilGeo = new THREE.SphereGeometry(0.04 * scale, 8, 8);
            const pupil = new THREE.Mesh(pupilGeo, iceMat);
            pupil.position.set(0.92 * scale, 0.5 + 1.12 * scale, side * 0.25 * scale);
            fishGroup.add(pupil);
            this.meshes.push(pupil);
        });
        
        // Mouth
        const mouthGeo = new THREE.TorusGeometry(0.08 * scale, 0.02 * scale, 6, 12, Math.PI);
        const mouth = new THREE.Mesh(mouthGeo, frostedMat);
        mouth.position.set(1.05 * scale, 0.5 + 0.95 * scale, 0);
        mouth.rotation.y = Math.PI / 2;
        mouth.rotation.z = Math.PI;
        fishGroup.add(mouth);
        this.meshes.push(mouth);
        
        // Scale details (subtle ridges)
        for (let i = 0; i < 5; i++) {
            const scaleGeo = new THREE.TorusGeometry(0.3 * scale - i * 0.04 * scale, 0.015 * scale, 4, 16, Math.PI);
            const scaleMesh = new THREE.Mesh(scaleGeo, frostedMat);
            scaleMesh.position.set(-0.1 * scale - i * 0.12 * scale, 0.5 + 1.0 * scale, 0);
            scaleMesh.rotation.y = Math.PI / 2;
            fishGroup.add(scaleMesh);
            this.meshes.push(scaleMesh);
        }
    }
    
    createHeart(group, iceMat, frostedMat) {
        const THREE = this.THREE;
        const scale = 2.0;
        
        // Main heart lobes - larger spheres
        const leftGeo = new THREE.SphereGeometry(0.45 * scale, 24, 20);
        const left = new THREE.Mesh(leftGeo, iceMat);
        left.position.set(-0.28 * scale, 0.5 + 1.35 * scale, 0);
        left.castShadow = true;
        this.addMesh(left, group);
        
        const rightGeo = new THREE.SphereGeometry(0.45 * scale, 24, 20);
        const right = new THREE.Mesh(rightGeo, iceMat);
        right.position.set(0.28 * scale, 0.5 + 1.35 * scale, 0);
        right.castShadow = true;
        this.addMesh(right, group);
        
        // Heart body connector
        const connectorGeo = new THREE.SphereGeometry(0.35 * scale, 16, 14);
        const connector = new THREE.Mesh(connectorGeo, iceMat);
        connector.position.set(0, 0.5 + 1.2 * scale, 0);
        connector.scale.set(1.3, 0.8, 0.9);
        this.addMesh(connector, group);
        
        // Bottom point - elongated cone
        const pointGeo = new THREE.ConeGeometry(0.5 * scale, 0.85 * scale, 8);
        const point = new THREE.Mesh(pointGeo, iceMat);
        point.position.set(0, 0.5 + 0.55 * scale, 0);
        point.rotation.z = Math.PI;
        this.addMesh(point, group);
        
        // Inner heart glow effect (frosted inner layer)
        const innerLeftGeo = new THREE.SphereGeometry(0.3 * scale, 16, 14);
        const innerLeft = new THREE.Mesh(innerLeftGeo, frostedMat);
        innerLeft.position.set(-0.2 * scale, 0.5 + 1.35 * scale, 0);
        this.addMesh(innerLeft, group);
        
        const innerRightGeo = new THREE.SphereGeometry(0.3 * scale, 16, 14);
        const innerRight = new THREE.Mesh(innerRightGeo, frostedMat);
        innerRight.position.set(0.2 * scale, 0.5 + 1.35 * scale, 0);
        this.addMesh(innerRight, group);
        
        // Fill center gap
        const fillGeo = new THREE.BoxGeometry(0.55 * scale, 0.4 * scale, 0.45 * scale);
        const fill = new THREE.Mesh(fillGeo, iceMat);
        fill.position.set(0, 0.5 + 1.15 * scale, 0);
        this.addMesh(fill, group);
        
        // Decorative carved lines
        for (let i = 0; i < 3; i++) {
            const lineGeo = new THREE.TorusGeometry(0.15 * scale + i * 0.12 * scale, 0.015 * scale, 4, 24, Math.PI);
            const line = new THREE.Mesh(lineGeo, frostedMat);
            line.position.set(0, 0.5 + 1.0 * scale - i * 0.15 * scale, 0.35 * scale);
            line.rotation.x = 0.3;
            this.addMesh(line, group);
        }
        
        // Small decorative spheres at top
        [-1, 1].forEach(side => {
            const decoGeo = new THREE.SphereGeometry(0.08 * scale, 10, 10);
            const deco = new THREE.Mesh(decoGeo, frostedMat);
            deco.position.set(side * 0.28 * scale, 0.5 + 1.75 * scale, 0);
            this.addMesh(deco, group);
        });
    }
    
    createStar(group, iceMat, frostedMat) {
        const THREE = this.THREE;
        const scale = 2.0;
        const starCenterY = 0.5 + 1.5 * scale; // Star center height
        
        // 5-pointed star - VERTICAL orientation (points radiate in XY plane)
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.PI / 2; // Start from top (flipped)
            
            // Main point - radiating outward in XY plane
            const pointGeo = new THREE.ConeGeometry(0.18 * scale, 0.9 * scale, 8);
            const point = new THREE.Mesh(pointGeo, iceMat);
            point.position.set(
                Math.cos(angle) * 0.45 * scale,
                starCenterY + Math.sin(angle) * 0.45 * scale,
                0
            );
            // Point the cone TIP outward from center (rotate so tip faces away)
            point.rotation.z = angle - Math.PI / 2;
            point.castShadow = true;
            this.addMesh(point, group);
            
            // Ridge detail on each point
            const ridgeGeo = new THREE.BoxGeometry(0.03 * scale, 0.7 * scale, 0.06 * scale);
            const ridge = new THREE.Mesh(ridgeGeo, frostedMat);
            ridge.position.set(
                Math.cos(angle) * 0.4 * scale,
                starCenterY + Math.sin(angle) * 0.4 * scale,
                0
            );
            ridge.rotation.z = angle - Math.PI / 2;
            this.addMesh(ridge, group);
        }
        
        // Inner star points (between main points) - smaller inward points
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.PI / 2 + Math.PI / 5;
            const pointGeo = new THREE.ConeGeometry(0.1 * scale, 0.35 * scale, 6);
            const point = new THREE.Mesh(pointGeo, frostedMat);
            point.position.set(
                Math.cos(angle) * 0.2 * scale,
                starCenterY + Math.sin(angle) * 0.2 * scale,
                0
            );
            point.rotation.z = angle - Math.PI / 2;
            this.addMesh(point, group);
        }
        
        // Center body - faceted crystal
        const centerGeo = new THREE.IcosahedronGeometry(0.3 * scale, 1);
        const center = new THREE.Mesh(centerGeo, iceMat);
        center.position.y = starCenterY;
        center.scale.z = 0.6; // Flatten slightly in Z for vertical star look
        this.addMesh(center, group);
        
        // Center highlight sphere
        const highlightGeo = new THREE.SphereGeometry(0.18 * scale, 16, 14);
        const highlight = new THREE.Mesh(highlightGeo, frostedMat);
        highlight.position.y = starCenterY;
        this.addMesh(highlight, group);
        
        // Stand/pillar connecting pedestal to star
        const standGeo = new THREE.CylinderGeometry(0.1 * scale, 0.16 * scale, 0.8 * scale, 8);
        const stand = new THREE.Mesh(standGeo, iceMat);
        stand.position.y = 0.5 + 0.65 * scale;
        this.addMesh(stand, group);
        
        // Stand rings
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(0.14 * scale, 0.02 * scale, 6, 16);
            const ring = new THREE.Mesh(ringGeo, frostedMat);
            ring.position.y = 0.5 + 0.4 * scale + i * 0.25 * scale;
            ring.rotation.x = Math.PI / 2;
            this.addMesh(ring, group);
        }
        
        // Decorative base crystals around pedestal
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const crystalGeo = new THREE.ConeGeometry(0.06 * scale, 0.3 * scale, 5);
            const crystal = new THREE.Mesh(crystalGeo, iceMat);
            crystal.position.set(
                Math.cos(angle) * 0.95 * scale,
                0.5 + 0.15 * scale,
                Math.sin(angle) * 0.95 * scale
            );
            this.addMesh(crystal, group);
        }
        
        // Add sparkle accents at star tips (front and back)
        [-0.15, 0.15].forEach(zOff => {
            const sparkleGeo = new THREE.OctahedronGeometry(0.08 * scale, 0);
            const sparkle = new THREE.Mesh(sparkleGeo, frostedMat);
            sparkle.position.set(0, starCenterY + 0.5 * scale, zOff * scale); // Top point
            sparkle.rotation.y = Math.PI / 4;
            this.addMesh(sparkle, group);
        });
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 1.5; // Larger collision for bigger sculptures
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 4.5,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        const typeEmojis = {
            penguin: '🐧',
            fish: '🐟',
            heart: '❤️',
            star: '⭐'
        };
        
        return {
            type: 'interact',
            x: this.group.position.x,
            z: this.group.position.z,
            radius: 3,
            message: `${typeEmojis[this.type] || '🧊'} A magnificent ice sculpture!`
        };
    }
}

export default IceSculpture;
