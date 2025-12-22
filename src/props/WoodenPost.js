/**
 * WoodenPost - Simple wooden bollard/post marker
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class WoodenPost extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {string} style - 'plain' | 'striped' | 'topped'
     */
    constructor(THREE, style = 'plain') {
        super(THREE);
        this.style = style;
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = `wooden_post_${this.style}`;
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankMedium, { roughness: 0.85 });
        const darkWoodMat = this.matManager.get(PropColors.plankDark, { roughness: 0.9 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Main post
        const postGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.y = 0.6;
        post.castShadow = true;
        post.receiveShadow = true;
        this.addMesh(post, group);
        
        if (this.style === 'striped') {
            this.addStripes(group, darkWoodMat);
        } else if (this.style === 'topped') {
            this.addTop(group, darkWoodMat);
        }
        
        // Snow cap
        const snowGeo = new THREE.SphereGeometry(0.12, 8, 6);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = 1.25;
        snow.scale.set(1.3, 0.5, 1.3);
        this.addMesh(snow, group);
        
        // Snow at base
        const baseSnowGeo = new THREE.TorusGeometry(0.15, 0.06, 6, 12);
        const baseSnow = new THREE.Mesh(baseSnowGeo, snowMat);
        baseSnow.position.y = 0.03;
        baseSnow.rotation.x = Math.PI / 2;
        this.addMesh(baseSnow, group);
        
        return this;
    }
    
    addStripes(group, stripeMat) {
        const THREE = this.THREE;
        
        // Add horizontal stripe bands
        [0.3, 0.6, 0.9].forEach(yPos => {
            const stripeGeo = new THREE.TorusGeometry(0.11, 0.02, 6, 12);
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.y = yPos;
            stripe.rotation.x = Math.PI / 2;
            this.addMesh(stripe, group);
        });
    }
    
    addTop(group, topMat) {
        const THREE = this.THREE;
        
        // Decorative ball on top
        const ballGeo = new THREE.SphereGeometry(0.1, 8, 6);
        const ball = new THREE.Mesh(ballGeo, topMat);
        ball.position.y = 1.28;
        ball.castShadow = true;
        this.addMesh(ball, group);
        
        // Collar
        const collarGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.08, 8);
        const collar = new THREE.Mesh(collarGeo, topMat);
        collar.position.y = 1.16;
        this.addMesh(collar, group);
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.15;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 1.3,
        };
    }
}

export default WoodenPost;




