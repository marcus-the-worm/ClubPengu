/**
 * StreetSign - Simple street sign on a post
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class StreetSign extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} type - 'stop' | 'yield' | 'arrow' | 'info'
     */
    constructor(THREE, type = 'arrow') {
        super(THREE);
        this.type = type;
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = `street_sign_${this.type}`;
        group.position.set(x, y, z);
        
        const postMat = this.matManager.get(PropColors.metalMedium, { roughness: 0.6, metalness: 0.4 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Post
        const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 1.1;
        post.castShadow = true;
        this.addMesh(post, group);
        
        // Base plate
        const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.06, 8);
        const base = new THREE.Mesh(baseGeo, postMat);
        base.position.y = 0.03;
        this.addMesh(base, group);
        
        // Create sign based on type
        switch (this.type) {
            case 'stop':
                this.createStopSign(group);
                break;
            case 'yield':
                this.createYieldSign(group);
                break;
            case 'info':
                this.createInfoSign(group);
                break;
            case 'arrow':
            default:
                this.createArrowSign(group);
                break;
        }
        
        // Snow on top of sign
        const snowGeo = new THREE.SphereGeometry(0.15, 6, 4);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 2.35;
        snow.scale.set(1.5, 0.4, 1);
        this.addMesh(snow, group);
        
        return this;
    }
    
    createStopSign(group) {
        const THREE = this.THREE;
        const signMat = this.matManager.get('#CC0000', { roughness: 0.4 });
        const borderMat = this.matManager.get('#FFFFFF', { roughness: 0.5 });
        
        // Octagon shape using cylinder with 8 sides
        const signGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 8);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.y = 2.0;
        sign.rotation.x = Math.PI / 2;
        sign.rotation.y = Math.PI / 8;
        sign.castShadow = true;
        this.addMesh(sign, group);
        
        // White border
        const borderGeo = new THREE.TorusGeometry(0.32, 0.025, 4, 8);
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.set(0, 2.0, 0.025);
        border.rotation.y = Math.PI / 8;
        this.addMesh(border, group);
    }
    
    createYieldSign(group) {
        const THREE = this.THREE;
        const signMat = this.matManager.get('#FFCC00', { roughness: 0.4 });
        const borderMat = this.matManager.get('#000000', { roughness: 0.5 });
        
        // Triangle shape
        const shape = new THREE.Shape();
        shape.moveTo(0, 0.35);
        shape.lineTo(-0.3, -0.2);
        shape.lineTo(0.3, -0.2);
        shape.closePath();
        
        const extrudeSettings = { depth: 0.04, bevelEnabled: false };
        const signGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 1.85, -0.02);
        sign.castShadow = true;
        this.addMesh(sign, group);
        
        // Border edge
        const edgeGeo = new THREE.EdgesGeometry(signGeo);
        const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x000000 }));
        edges.position.copy(sign.position);
        this.addMesh(edges, group);
    }
    
    createArrowSign(group) {
        const THREE = this.THREE;
        const signMat = this.matManager.get('#228B22', { roughness: 0.4 });
        const whiteMat = this.matManager.get('#FFFFFF', { roughness: 0.5 });
        
        // Rectangle sign
        const signGeo = new THREE.BoxGeometry(0.6, 0.25, 0.03);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.y = 2.0;
        sign.castShadow = true;
        this.addMesh(sign, group);
        
        // Arrow shape
        const arrowGeo = new THREE.ConeGeometry(0.06, 0.15, 3);
        const arrow = new THREE.Mesh(arrowGeo, whiteMat);
        arrow.position.set(0.18, 2.0, 0.02);
        arrow.rotation.z = -Math.PI / 2;
        this.addMesh(arrow, group);
        
        // Arrow tail
        const tailGeo = new THREE.BoxGeometry(0.2, 0.04, 0.02);
        const tail = new THREE.Mesh(tailGeo, whiteMat);
        tail.position.set(-0.02, 2.0, 0.02);
        this.addMesh(tail, group);
    }
    
    createInfoSign(group) {
        const THREE = this.THREE;
        const signMat = this.matManager.get('#1E90FF', { roughness: 0.4 });
        const whiteMat = this.matManager.get('#FFFFFF', { roughness: 0.5 });
        
        // Square sign with rounded appearance
        const signGeo = new THREE.BoxGeometry(0.45, 0.45, 0.03);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.y = 2.0;
        sign.castShadow = true;
        this.addMesh(sign, group);
        
        // "i" dot
        const dotGeo = new THREE.SphereGeometry(0.04, 8, 6);
        const dot = new THREE.Mesh(dotGeo, whiteMat);
        dot.position.set(0, 2.12, 0.02);
        this.addMesh(dot, group);
        
        // "i" body
        const bodyGeo = new THREE.BoxGeometry(0.06, 0.18, 0.02);
        const body = new THREE.Mesh(bodyGeo, whiteMat);
        body.position.set(0, 1.93, 0.02);
        this.addMesh(body, group);
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.2;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 2.4,
        };
    }
}

export default StreetSign;


