/**
 * FireHydrant - Classic red fire hydrant with snow cap
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class FireHydrant extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {number} color - Hex color for the hydrant body (default red)
     */
    constructor(THREE, color = 0xCC2222) {
        super(THREE);
        this.color = color;
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'fire_hydrant';
        group.position.set(x, y, z);
        
        const bodyMat = this.matManager.get(this.color, { roughness: 0.4, metalness: 0.3 });
        const capMat = this.matManager.get('#FFD700', { roughness: 0.3, metalness: 0.5 });
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.6 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Base
        const baseGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.12, 8);
        const base = new THREE.Mesh(baseGeo, bodyMat);
        base.position.y = 0.06;
        base.castShadow = true;
        this.addMesh(base, group);
        
        // Main body
        const bodyGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.5, 8);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.37;
        body.castShadow = true;
        this.addMesh(body, group);
        
        // Upper body (narrower)
        const upperGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.25, 8);
        const upper = new THREE.Mesh(upperGeo, bodyMat);
        upper.position.y = 0.74;
        upper.castShadow = true;
        this.addMesh(upper, group);
        
        // Top cap
        const topGeo = new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const top = new THREE.Mesh(topGeo, capMat);
        top.position.y = 0.86;
        top.castShadow = true;
        this.addMesh(top, group);
        
        // Top bolt
        const boltGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 6);
        const bolt = new THREE.Mesh(boltGeo, metalMat);
        bolt.position.y = 0.95;
        this.addMesh(bolt, group);
        
        // Side outlets (nozzles)
        [-1, 1].forEach(side => {
            // Outlet body
            const outletGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 6);
            const outlet = new THREE.Mesh(outletGeo, bodyMat);
            outlet.position.set(side * 0.22, 0.5, 0);
            outlet.rotation.z = side * Math.PI / 2;
            outlet.castShadow = true;
            this.addMesh(outlet, group);
            
            // Outlet cap
            const outCapGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.04, 6);
            const outCap = new THREE.Mesh(outCapGeo, capMat);
            outCap.position.set(side * 0.28, 0.5, 0);
            outCap.rotation.z = side * Math.PI / 2;
            this.addMesh(outCap, group);
            
            // Pentagon nut on cap
            const nutGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 5);
            const nut = new THREE.Mesh(nutGeo, metalMat);
            nut.position.set(side * 0.31, 0.5, 0);
            nut.rotation.z = side * Math.PI / 2;
            this.addMesh(nut, group);
        });
        
        // Front outlet (smaller, operating valve)
        const frontOutletGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6);
        const frontOutlet = new THREE.Mesh(frontOutletGeo, bodyMat);
        frontOutlet.position.set(0, 0.35, 0.2);
        frontOutlet.rotation.x = Math.PI / 2;
        this.addMesh(frontOutlet, group);
        
        const frontCapGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.03, 6);
        const frontCap = new THREE.Mesh(frontCapGeo, capMat);
        frontCap.position.set(0, 0.35, 0.25);
        frontCap.rotation.x = Math.PI / 2;
        this.addMesh(frontCap, group);
        
        // Decorative chains (simplified as small cylinders)
        [-1, 1].forEach(side => {
            const chainGeo = new THREE.TorusGeometry(0.05, 0.008, 4, 8, Math.PI);
            const chain = new THREE.Mesh(chainGeo, metalMat);
            chain.position.set(side * 0.15, 0.65, 0.12);
            chain.rotation.x = Math.PI / 2;
            chain.rotation.z = side * 0.3;
            this.addMesh(chain, group);
        });
        
        // Snow cap on top
        const snowGeo = new THREE.SphereGeometry(0.14, 8, 6);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 1.0;
        snow.scale.set(1.3, 0.4, 1.3);
        this.addMesh(snow, group);
        
        // Snow on side outlets
        [-1, 1].forEach(side => {
            const sideSnowGeo = new THREE.SphereGeometry(0.06, 6, 4);
            const sideSnow = new THREE.Mesh(sideSnowGeo, snowMat);
            sideSnow.position.set(side * 0.28, 0.58, 0);
            sideSnow.scale.y = 0.5;
            this.addMesh(sideSnow, group);
        });
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.3;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 1.0,
        };
    }
}

export default FireHydrant;

