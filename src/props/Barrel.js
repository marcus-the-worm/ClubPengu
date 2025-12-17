/**
 * Barrel - Wooden barrel with metal bands
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Barrel extends BaseProp {
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
        small: { scale: 0.6, height: 0.7 },
        medium: { scale: 1.0, height: 1.0 },
        large: { scale: 1.3, height: 1.2 },
    };
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const cfg = Barrel.SIZES[this.size] || Barrel.SIZES.medium;
        const group = this.createGroup(scene);
        group.name = `barrel_${this.size}`;
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankMedium, { roughness: 0.9 });
        const darkWoodMat = this.matManager.get(PropColors.plankDark, { roughness: 0.85 });
        const metalMat = this.matManager.get('#5A4A3A', { roughness: 0.5, metalness: 0.6 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        const s = cfg.scale;
        const h = cfg.height;
        
        // Main barrel body (bulging cylinder effect)
        const bodyGeo = new THREE.CylinderGeometry(0.35 * s, 0.32 * s, h, 12);
        const body = new THREE.Mesh(bodyGeo, woodMat);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Bulge in middle
        const bulgeGeo = new THREE.CylinderGeometry(0.38 * s, 0.38 * s, h * 0.4, 12);
        const bulge = new THREE.Mesh(bulgeGeo, woodMat);
        bulge.position.y = h / 2;
        bulge.castShadow = true;
        this.addMesh(bulge, group);
        
        // Metal bands
        const bandPositions = [0.12, 0.35, 0.65, 0.88];
        bandPositions.forEach(t => {
            const bandY = h * t;
            const radius = 0.36 * s + (Math.abs(t - 0.5) < 0.25 ? 0.03 * s : 0);
            const bandGeo = new THREE.TorusGeometry(radius, 0.02 * s, 6, 16);
            const band = new THREE.Mesh(bandGeo, metalMat);
            band.position.y = bandY;
            band.rotation.x = Math.PI / 2;
            this.addMesh(band, group);
        });
        
        // Top lid
        const lidGeo = new THREE.CylinderGeometry(0.33 * s, 0.33 * s, 0.04 * s, 12);
        const lid = new THREE.Mesh(lidGeo, darkWoodMat);
        lid.position.y = h - 0.02 * s;
        this.addMesh(lid, group);
        
        // Vertical wood grain lines (subtle)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const lineGeo = new THREE.BoxGeometry(0.01 * s, h * 0.85, 0.01 * s);
            const line = new THREE.Mesh(lineGeo, darkWoodMat);
            line.position.set(
                Math.cos(angle) * 0.36 * s,
                h / 2,
                Math.sin(angle) * 0.36 * s
            );
            line.rotation.y = -angle;
            this.addMesh(line, group);
        }
        
        // Snow on top
        const snowGeo = new THREE.SphereGeometry(0.28 * s, 8, 6);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = h + 0.05 * s;
        snow.scale.set(1.2, 0.35, 1.2);
        this.addMesh(snow, group);
        
        this.collisionScale = s;
        this.collisionHeight = h;
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const s = this.collisionScale || 1;
        const r = 0.4 * s;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.collisionHeight || 1,
        };
    }
}

export default Barrel;


