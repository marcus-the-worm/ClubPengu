/**
 * Mailbox - Classic penguin-style mailbox with snow
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Mailbox extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} style - 'classic' | 'modern'
     */
    constructor(THREE, style = 'classic') {
        super(THREE);
        this.style = style;
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = `mailbox_${this.style}`;
        group.position.set(x, y, z);
        
        const bodyMat = this.matManager.get('#1E90FF', { roughness: 0.4, metalness: 0.3 });
        const postMat = this.matManager.get(PropColors.plankDark, { roughness: 0.85 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        const flagMat = this.matManager.get('#FF4444', { roughness: 0.5 });
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.4 });
        
        if (this.style === 'modern') {
            this.createModernMailbox(group, bodyMat, postMat, snowMat, metalMat);
        } else {
            this.createClassicMailbox(group, bodyMat, postMat, snowMat, flagMat);
        }
        
        return this;
    }
    
    createClassicMailbox(group, bodyMat, postMat, snowMat, flagMat) {
        const THREE = this.THREE;
        
        // Wooden post
        const postGeo = new THREE.BoxGeometry(0.15, 1.2, 0.15);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.y = 0.6;
        post.castShadow = true;
        this.addMesh(post, group);
        
        // Mailbox body (rounded top)
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.3, 0.55);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.35;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Rounded top
        const topGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.55, 8, 1, false, 0, Math.PI);
        const top = new THREE.Mesh(topGeo, bodyMat);
        top.position.y = 1.5;
        top.rotation.z = Math.PI / 2;
        top.rotation.y = Math.PI / 2;
        top.castShadow = true;
        this.addMesh(top, group);
        
        // Mail slot
        const slotMat = this.matManager.get('#0A4A7A', { roughness: 0.6 });
        const slotGeo = new THREE.BoxGeometry(0.25, 0.04, 0.02);
        const slot = new THREE.Mesh(slotGeo, slotMat);
        slot.position.set(0, 1.4, 0.28);
        this.addMesh(slot, group);
        
        // Flag (raised position)
        const flagPoleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6);
        const flagPole = new THREE.Mesh(flagPoleGeo, flagMat);
        flagPole.position.set(0.22, 1.45, 0);
        flagPole.rotation.z = -0.3;
        this.addMesh(flagPole, group);
        
        const flagGeo = new THREE.BoxGeometry(0.02, 0.12, 0.08);
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.32, 1.55, 0);
        this.addMesh(flag, group);
        
        // Snow on top
        const snowGeo = new THREE.SphereGeometry(0.25, 8, 6);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 1.7;
        snow.scale.set(1.2, 0.4, 1.4);
        this.addMesh(snow, group);
    }
    
    createModernMailbox(group, bodyMat, postMat, snowMat, metalMat) {
        const THREE = this.THREE;
        
        // Metal post
        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 8);
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = 0.5;
        post.castShadow = true;
        this.addMesh(post, group);
        
        // Base plate
        const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.08, 8);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.04;
        this.addMesh(base, group);
        
        // Box body
        const boxMat = this.matManager.get('#2E8B57', { roughness: 0.5, metalness: 0.2 });
        const boxGeo = new THREE.BoxGeometry(0.45, 0.55, 0.35);
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.y = 1.28;
        box.castShadow = true;
        this.addMesh(box, group);
        
        // Door
        const doorMat = this.matManager.get('#1A5A3A', { roughness: 0.6 });
        const doorGeo = new THREE.BoxGeometry(0.35, 0.45, 0.02);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.28, 0.18);
        this.addMesh(door, group);
        
        // Handle
        const handleGeo = new THREE.BoxGeometry(0.1, 0.03, 0.03);
        const handle = new THREE.Mesh(handleGeo, metalMat);
        handle.position.set(0, 1.15, 0.2);
        this.addMesh(handle, group);
        
        // Snow on top
        const snowGeo = new THREE.BoxGeometry(0.5, 0.1, 0.4);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 1.6;
        this.addMesh(snow, group);
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
            height: 1.8,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            type: 'interact',
            x: this.group.position.x,
            z: this.group.position.z,
            radius: 1.5,
            message: '📬 Check Mail'
        };
    }
}

export default Mailbox;

