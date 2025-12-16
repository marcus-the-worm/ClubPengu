/**
 * Crate - Wooden shipping crate with snow
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Crate extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} size - 'small' | 'medium' | 'large'
     */
    constructor(THREE, size = 'medium') {
        super(THREE);
        this.size = size;
        this.matManager = getMaterialManager(THREE);
    }
    
    static SIZES = {
        small: { scale: 0.6 },
        medium: { scale: 1.0 },
        large: { scale: 1.4 },
    };
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const cfg = Crate.SIZES[this.size] || Crate.SIZES.medium;
        const s = cfg.scale;
        
        const group = this.createGroup(scene);
        group.name = `crate_${this.size}`;
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankLight, { roughness: 0.9 });
        const darkWoodMat = this.matManager.get(PropColors.plankDark, { roughness: 0.85 });
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.6, metalness: 0.5 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Main box
        const boxGeo = new THREE.BoxGeometry(0.8 * s, 0.7 * s, 0.8 * s);
        const box = new THREE.Mesh(boxGeo, woodMat);
        box.position.y = 0.35 * s;
        box.castShadow = true;
        box.receiveShadow = true;
        this.addMesh(box, group);
        
        // Horizontal planks (front/back)
        const hPlankGeo = new THREE.BoxGeometry(0.82 * s, 0.1 * s, 0.05 * s);
        [-1, 1].forEach(side => {
            [0.15, 0.45].forEach(yOff => {
                const plank = new THREE.Mesh(hPlankGeo, darkWoodMat);
                plank.position.set(0, yOff * s, side * 0.41 * s);
                plank.castShadow = true;
                this.addMesh(plank, group);
            });
        });
        
        // Horizontal planks (sides)
        const sPlankGeo = new THREE.BoxGeometry(0.05 * s, 0.1 * s, 0.82 * s);
        [-1, 1].forEach(side => {
            [0.15, 0.45].forEach(yOff => {
                const plank = new THREE.Mesh(sPlankGeo, darkWoodMat);
                plank.position.set(side * 0.41 * s, yOff * s, 0);
                plank.castShadow = true;
                this.addMesh(plank, group);
            });
        });
        
        // Corner metal brackets
        const bracketGeo = new THREE.BoxGeometry(0.12 * s, 0.15 * s, 0.12 * s);
        const corners = [
            [-0.38, 0.08, -0.38],
            [0.38, 0.08, -0.38],
            [-0.38, 0.08, 0.38],
            [0.38, 0.08, 0.38],
            [-0.38, 0.6, -0.38],
            [0.38, 0.6, -0.38],
            [-0.38, 0.6, 0.38],
            [0.38, 0.6, 0.38],
        ];
        corners.forEach(pos => {
            const bracket = new THREE.Mesh(bracketGeo, metalMat);
            bracket.position.set(pos[0] * s, pos[1] * s, pos[2] * s);
            this.addMesh(bracket, group);
        });
        
        // Top planks
        const topPlankGeo = new THREE.BoxGeometry(0.78 * s, 0.04 * s, 0.15 * s);
        [-0.25, 0, 0.25].forEach(zOff => {
            const plank = new THREE.Mesh(topPlankGeo, darkWoodMat);
            plank.position.set(0, 0.72 * s, zOff * s);
            plank.castShadow = true;
            this.addMesh(plank, group);
        });
        
        // Snow on top
        const snowGeo = new THREE.BoxGeometry(0.7 * s, 0.08 * s, 0.7 * s);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 0.78 * s;
        this.addMesh(snow, group);
        
        // Extra snow clump
        const clumpGeo = new THREE.SphereGeometry(0.2 * s, 6, 4);
        const clump = new THREE.Mesh(clumpGeo, snowMat);
        clump.position.set(0.15 * s, 0.82 * s, 0.1 * s);
        clump.scale.y = 0.4;
        this.addMesh(clump, group);
        
        this.collisionScale = s;
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const s = this.collisionScale || 1;
        const r = 0.45 * s;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 0.75 * s,
        };
    }
    
    getLandingSurface() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const s = this.collisionScale || 1;
        const r = 0.4 * s;
        
        return {
            name: 'crate',
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 0.7 * s,
        };
    }
}

export default Crate;

