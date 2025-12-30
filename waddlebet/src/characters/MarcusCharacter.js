/**
 * MarcusCharacter - The special Marcus character model
 * Built with separate animatable parts for emotes/animations
 * 
 * Key features:
 * - Peanut/potato shaped head
 * - Big googly eyes ON TOP - BLACK from front, whites only from back
 * - Mouth on face below eyes
 * - Almost NO neck - head sits directly on shoulders
 * - Fat round belly
 * - Thin stick arms and legs (separate for animation)
 */

// Marcus-specific color palette
export const MARCUS_PALETTE = {
    // Skin tones (peanut/tan colors)
    skin: '#C4A574',        // Main beige/tan
    skinLight: '#D4B584',   // Highlights
    skinDark: '#A48554',    // Shadows/creases
    skinDeep: '#8B7355',    // Deep shadows
    
    // Eyes - black from front, white from back
    eyeWhite: '#FFFFFF',
    eyeBlack: '#0A0A0A',
    
    // Mouth
    mouthDark: '#5C4033',
    mouthInner: '#3D2817',
};

// Y offset to lift Marcus model (applied to all parts)
const Y_OFFSET = 18;

/**
 * Generate Marcus's peanut-shaped head with googly eyes
 */
export const generateMarcusHead = () => {
    const voxelMap = new Map();
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const headBaseY = 0;
    
    // Head shape
    for (let y = 0; y <= 12; y++) {
        const actualY = y + headBaseY;
        let radiusX, radiusZ;
        
        if (y <= 3) {
            const t = y / 3;
            radiusX = 2.5 + t * 2;
            radiusZ = 2 + t * 1.5;
        } else if (y <= 7) {
            const t = (y - 3) / 4;
            radiusX = 4.5 - Math.sin(t * Math.PI) * 0.6;
            radiusZ = 3.5 - Math.sin(t * Math.PI) * 0.5;
        } else {
            const t = (y - 7) / 5;
            radiusX = 3.9 + Math.sin(t * Math.PI) * 1.5;
            radiusZ = 3.2 + Math.sin(t * Math.PI) * 1.2;
        }
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const distX = x / radiusX;
                const distZ = z / radiusZ;
                
                if (distX * distX + distZ * distZ <= 1) {
                    let color = MARCUS_PALETTE.skin;
                    if (z > radiusZ * 0.5) color = MARCUS_PALETTE.skinLight;
                    if (Math.abs(x) > radiusX * 0.75) color = MARCUS_PALETTE.skinDark;
                    addVoxel(x, actualY, z, color);
                }
            }
        }
    }
    
    // Mouth - on face below eyes
    const mouthY = headBaseY + 6;
    for (let x = -2; x <= 2; x++) {
        addVoxel(x, mouthY, 4, MARCUS_PALETTE.mouthDark);
    }
    addVoxel(-2, mouthY, 3, MARCUS_PALETTE.mouthDark);
    addVoxel(2, mouthY, 3, MARCUS_PALETTE.mouthDark);
    addVoxel(-3, mouthY + 1, 3, MARCUS_PALETTE.mouthDark);
    addVoxel(3, mouthY + 1, 3, MARCUS_PALETTE.mouthDark);
    
    // Googly eyes on top - BLACK from front
    const eyeY = headBaseY + 12;
    const eyeSpacing = 3;
    const eyeRadius = 2.8;
    
    // Left eye
    for (let ex = -eyeRadius; ex <= eyeRadius; ex++) {
        for (let ey = -eyeRadius; ey <= eyeRadius; ey++) {
            for (let ez = -eyeRadius; ez <= eyeRadius; ez++) {
                if (ex * ex + ey * ey + ez * ez <= eyeRadius * eyeRadius) {
                    const eyeX = -eyeSpacing + ex;
                    const eyeYPos = eyeY + ey + eyeRadius;
                    const eyeZ = ez;
                    let color = ez >= -0.5 ? MARCUS_PALETTE.eyeBlack : MARCUS_PALETTE.eyeWhite;
                    addVoxel(eyeX, eyeYPos, eyeZ, color);
                }
            }
        }
    }
    
    // Right eye
    for (let ex = -eyeRadius; ex <= eyeRadius; ex++) {
        for (let ey = -eyeRadius; ey <= eyeRadius; ey++) {
            for (let ez = -eyeRadius; ez <= eyeRadius; ez++) {
                if (ex * ex + ey * ey + ez * ez <= eyeRadius * eyeRadius) {
                    const eyeX = eyeSpacing + ex;
                    const eyeYPos = eyeY + ey + eyeRadius;
                    const eyeZ = ez;
                    let color = ez >= -0.5 ? MARCUS_PALETTE.eyeBlack : MARCUS_PALETTE.eyeWhite;
                    addVoxel(eyeX, eyeYPos, eyeZ, color);
                }
            }
        }
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Generate Marcus's body (belly + tiny neck)
 */
export const generateMarcusBody = () => {
    const voxelMap = new Map();
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Tiny neck stub
    for (let y = -2; y <= -1; y++) {
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                if (x * x + z * z <= 5) {
                    addVoxel(x, y, z, MARCUS_PALETTE.skinDark);
                }
            }
        }
    }
    
    // Fat round belly
    const bellyBaseY = -12;
    const bellyHeight = 9;
    const bellyRadiusX = 4.5;
    const bellyRadiusZ = 4;
    
    for (let y = 0; y <= bellyHeight; y++) {
        const actualY = y + bellyBaseY;
        const t = y / bellyHeight;
        const sphereT = Math.sin(t * Math.PI);
        const radiusX = bellyRadiusX * sphereT + 0.5;
        const radiusZ = bellyRadiusZ * sphereT + 0.5;
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const distX = radiusX > 0.5 ? x / radiusX : 0;
                const distZ = radiusZ > 0.5 ? z / radiusZ : 0;
                
                if (distX * distX + distZ * distZ <= 1) {
                    let color = MARCUS_PALETTE.skin;
                    if (z > radiusZ * 0.4) color = MARCUS_PALETTE.skinLight;
                    if (Math.abs(x) > radiusX * 0.7) color = MARCUS_PALETTE.skinDark;
                    addVoxel(x, actualY, z, color);
                }
            }
        }
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Generate Marcus's arm - positioned at shoulder
 * isLeft: true = left arm (positive X), false = right arm (negative X)
 */
export const generateMarcusArm = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    const shoulderX = side * 5; // Shoulder position on X axis
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const shoulderY = -3;
    
    // Shoulder joint at body edge
    addVoxel(shoulderX, shoulderY, 0, MARCUS_PALETTE.skin);
    addVoxel(shoulderX + side, shoulderY, 0, MARCUS_PALETTE.skinDark);
    
    // Upper arm going down and slightly out
    for (let i = 0; i < 6; i++) {
        addVoxel(shoulderX + side * (1 + i * 0.3), shoulderY - 1 - i, 0, MARCUS_PALETTE.skin);
    }
    
    // Elbow
    const elbowX = shoulderX + side * 3;
    const elbowY = shoulderY - 7;
    addVoxel(elbowX, elbowY, 0, MARCUS_PALETTE.skinDark);
    
    // Forearm
    for (let i = 0; i < 5; i++) {
        addVoxel(elbowX + side * (i * 0.2), elbowY - 1 - i, i * 0.3, MARCUS_PALETTE.skin);
    }
    
    // Hand
    const handX = elbowX + side * 1;
    const handY = elbowY - 6;
    const handZ = 1.5;
    addVoxel(handX, handY, handZ, MARCUS_PALETTE.skinLight);
    
    // Fingers
    for (let f = 0; f < 3; f++) {
        const fingerLength = 3 + (f === 1 ? 1 : 0);
        for (let i = 0; i < fingerLength; i++) {
            addVoxel(handX + side * (f * 0.3 - 0.3), handY - 1 - i, handZ + i * 0.15, MARCUS_PALETTE.skinLight);
        }
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Generate Marcus's leg - positioned at hip
 * isLeft: true = left leg (positive X), false = right leg (negative X)
 */
export const generateMarcusLeg = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    const hipX = side * 2; // Hip position on X axis
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const hipY = -13;
    
    // Hip joint
    addVoxel(hipX, hipY, 0, MARCUS_PALETTE.skinDark);
    
    // Upper leg going down
    for (let i = 0; i < 5; i++) {
        addVoxel(hipX, hipY - 1 - i, 0, MARCUS_PALETTE.skin);
    }
    
    // Knee
    const kneeY = hipY - 6;
    addVoxel(hipX, kneeY, 1, MARCUS_PALETTE.skinDark);
    
    // Lower leg
    for (let i = 0; i < 5; i++) {
        addVoxel(hipX, kneeY - 1 - i, 1 + i * 0.1, MARCUS_PALETTE.skin);
    }
    
    // Foot
    const footY = kneeY - 6;
    for (let z = 0; z <= 3; z++) {
        addVoxel(hipX, footY, 1 + z, MARCUS_PALETTE.skinDark);
    }
    addVoxel(hipX - 1, footY, 2, MARCUS_PALETTE.skinDark);
    addVoxel(hipX + 1, footY, 2, MARCUS_PALETTE.skinDark);
    
    return Array.from(voxelMap.values());
};

/**
 * Get pivot points for each part (for animation)
 * These are where the parts rotate around
 */
export const getMarcusPivots = () => ({
    head: { x: 0, y: 6 + Y_OFFSET, z: 0 },
    body: { x: 0, y: -6 + Y_OFFSET, z: 0 },
    armLeft: { x: 5, y: -3 + Y_OFFSET, z: 0 },   // Shoulder position
    armRight: { x: -5, y: -3 + Y_OFFSET, z: 0 }, // Shoulder position
    legLeft: { x: 2, y: -13 + Y_OFFSET, z: 0 },  // Hip position
    legRight: { x: -2, y: -13 + Y_OFFSET, z: 0 }, // Hip position
});

/**
 * Generate complete Marcus (all parts merged - for simple rendering)
 */
export const generateMarcusComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateMarcusHead());
    addVoxels(generateMarcusBody());
    addVoxels(generateMarcusArm(true));
    addVoxels(generateMarcusArm(false));
    addVoxels(generateMarcusLeg(true));
    addVoxels(generateMarcusLeg(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const MarcusGenerators = {
    head: generateMarcusHead,
    body: generateMarcusBody,
    armLeft: () => generateMarcusArm(true),
    armRight: () => generateMarcusArm(false),
    legLeft: () => generateMarcusLeg(true),
    legRight: () => generateMarcusLeg(false),
    complete: generateMarcusComplete,
    pivots: getMarcusPivots,
};

export default MarcusGenerators;
