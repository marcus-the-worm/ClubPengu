/**
 * TrashCan - Metal trash can with lid and snow
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class TrashCan extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withLid - Include lid on top
     */
    constructor(THREE, withLid = true) {
        super(THREE);
        this.withLid = withLid;
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'trash_can';
        group.position.set(x, y, z);
        
        const metalMat = this.matManager.get('#4A5A6A', { roughness: 0.6, metalness: 0.5 });
        const darkMat = this.matManager.get('#3A4A5A', { roughness: 0.7, metalness: 0.4 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Main body (tapered cylinder)
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.9, 12);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        body.position.y = 0.45;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Rim at top
        const rimGeo = new THREE.TorusGeometry(0.36, 0.03, 6, 16);
        const rim = new THREE.Mesh(rimGeo, darkMat);
        rim.position.y = 0.9;
        rim.rotation.x = Math.PI / 2;
        this.addMesh(rim, group);
        
        // Rim at bottom
        const bottomRimGeo = new THREE.TorusGeometry(0.31, 0.025, 6, 16);
        const bottomRim = new THREE.Mesh(bottomRimGeo, darkMat);
        bottomRim.position.y = 0.02;
        bottomRim.rotation.x = Math.PI / 2;
        this.addMesh(bottomRim, group);
        
        // Horizontal bands
        [0.25, 0.55].forEach(yPos => {
            const bandGeo = new THREE.TorusGeometry(0.33, 0.015, 6, 16);
            const band = new THREE.Mesh(bandGeo, darkMat);
            band.position.y = yPos;
            band.rotation.x = Math.PI / 2;
            this.addMesh(band, group);
        });
        
        // Handles on sides
        [-1, 1].forEach(side => {
            const handleGeo = new THREE.TorusGeometry(0.08, 0.015, 6, 8, Math.PI);
            const handle = new THREE.Mesh(handleGeo, darkMat);
            handle.position.set(side * 0.35, 0.7, 0);
            handle.rotation.y = side * Math.PI / 2;
            this.addMesh(handle, group);
        });
        
        // Lid
        if (this.withLid) {
            const lidGeo = new THREE.CylinderGeometry(0.38, 0.36, 0.08, 12);
            const lid = new THREE.Mesh(lidGeo, metalMat);
            lid.position.y = 0.96;
            lid.castShadow = true;
            this.addMesh(lid, group);
            
            // Lid handle
            const lidHandleGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8);
            const lidHandle = new THREE.Mesh(lidHandleGeo, darkMat);
            lidHandle.position.y = 1.04;
            this.addMesh(lidHandle, group);
            
            // Snow on lid
            const snowGeo = new THREE.SphereGeometry(0.25, 8, 6);
            const snow = new THREE.Mesh(snowGeo, snowMat);
            snow.position.y = 1.1;
            snow.scale.set(1.3, 0.35, 1.3);
            this.addMesh(snow, group);
        }
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.4;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 1.1,
        };
    }
}

export default TrashCan;

