/**
 * DoginalCharacter - The Doginal dog character model
 * A cute voxel dog with floppy ears, snout, and wagging tail
 * 
 * Features:
 * - Rounded dog head with snout
 * - Floppy ears
 * - Big friendly eyes
 * - Dog body with tail
 * - Paws instead of penguin feet
 */

// Doginal color palette - Golden/tan dog colors
export const DOGINAL_PALETTE = {
    // Main fur colors
    main: '#D4A04A',         // Golden tan
    mainLight: '#E8C06A',    // Light golden
    mainDark: '#B88030',     // Dark golden/brown
    mainDeep: '#8B6020',     // Deep brown
    
    // Belly/chest (lighter)
    belly: '#F0D890',        // Cream/light tan
    
    // Nose and mouth
    nose: '#2A2020',         // Black nose
    tongue: '#E87080',       // Pink tongue
    mouthLine: '#6A4030',    // Mouth line
    
    // Eyes
    eyeWhite: '#FFFFFF',
    eyeBlack: '#1A1010',
    eyeBrown: '#4A3020',     // Brown iris
    
    // Inner ear
    earInner: '#E0A080',     // Pink-ish inner ear
};

// Y offset to position the dog properly (lower than original to not float)
const Y_OFFSET = 4;

/**
 * Generate the dog's head with snout and ears
 */
export const generateDoginalHead = () => {
    const voxelMap = new Map();
    const Z_HEAD_OFFSET = 3; // Push head forward on the body
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z) + Z_HEAD_OFFSET;
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Main head - rounded dog shape
    for (let y = 0; y <= 8; y++) {
        let radiusX, radiusZ;
        
        if (y <= 2) {
            // Bottom of head (connects to neck)
            const t = y / 2;
            radiusX = 3 + t * 1.5;
            radiusZ = 2.5 + t * 1;
        } else if (y <= 6) {
            // Main head volume
            radiusX = 4.5;
            radiusZ = 3.5;
        } else {
            // Top of head (rounds off)
            const t = (y - 6) / 2;
            radiusX = 4.5 * (1 - t * 0.4);
            radiusZ = 3.5 * (1 - t * 0.3);
        }
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const distX = x / radiusX;
                const distZ = z / radiusZ;
                
                if (distX * distX + distZ * distZ <= 1) {
                    let color = DOGINAL_PALETTE.main;
                    // Top highlights
                    if (y > 5) color = DOGINAL_PALETTE.mainLight;
                    // Side shadows
                    if (Math.abs(x) > radiusX * 0.7) color = DOGINAL_PALETTE.mainDark;
                    // Cheeks/lower face lighter
                    if (y < 4 && z > 1) color = DOGINAL_PALETTE.belly;
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
    
    // Snout - protruding forward
    for (let z = 4; z <= 8; z++) {
        const snoutProgress = (z - 4) / 4;
        const radiusX = 2.5 - snoutProgress * 1;
        const radiusY = 2 - snoutProgress * 0.8;
        const centerY = 2 - snoutProgress * 0.5;
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let y = 0; y <= Math.ceil(radiusY * 2); y++) {
                const adjustedY = y - radiusY + centerY;
                const distX = x / radiusX;
                const distY = adjustedY / radiusY;
                
                if (distX * distX + distY * distY <= 1) {
                    let color = DOGINAL_PALETTE.main;
                    // Top of snout lighter
                    if (adjustedY > 0.5) color = DOGINAL_PALETTE.mainLight;
                    // Bottom of snout (belly color)
                    if (adjustedY < -0.3) color = DOGINAL_PALETTE.belly;
                    addVoxel(x, adjustedY + 2, z, color);
                }
            }
        }
    }
    
    // Nose - black at end of snout
    addVoxel(0, 2, 8, DOGINAL_PALETTE.nose);
    addVoxel(1, 2, 8, DOGINAL_PALETTE.nose);
    addVoxel(-1, 2, 8, DOGINAL_PALETTE.nose);
    addVoxel(0, 3, 8, DOGINAL_PALETTE.nose);
    addVoxel(0, 2, 9, DOGINAL_PALETTE.nose);
    
    // Eyes - big and friendly, positioned on head
    const eyeY = 5;
    const eyeZ = 3;
    const eyeSpacing = 3;
    
    // Left eye
    addVoxel(-eyeSpacing, eyeY, eyeZ, DOGINAL_PALETTE.eyeWhite);
    addVoxel(-eyeSpacing, eyeY + 1, eyeZ, DOGINAL_PALETTE.eyeWhite);
    addVoxel(-eyeSpacing - 1, eyeY, eyeZ, DOGINAL_PALETTE.eyeWhite);
    addVoxel(-eyeSpacing, eyeY, eyeZ + 1, DOGINAL_PALETTE.eyeBlack);  // Pupil
    addVoxel(-eyeSpacing, eyeY + 1, eyeZ + 1, DOGINAL_PALETTE.eyeBrown);  // Iris
    
    // Right eye
    addVoxel(eyeSpacing, eyeY, eyeZ, DOGINAL_PALETTE.eyeWhite);
    addVoxel(eyeSpacing, eyeY + 1, eyeZ, DOGINAL_PALETTE.eyeWhite);
    addVoxel(eyeSpacing + 1, eyeY, eyeZ, DOGINAL_PALETTE.eyeWhite);
    addVoxel(eyeSpacing, eyeY, eyeZ + 1, DOGINAL_PALETTE.eyeBlack);  // Pupil
    addVoxel(eyeSpacing, eyeY + 1, eyeZ + 1, DOGINAL_PALETTE.eyeBrown);  // Iris
    
    // NOTE: Ears are now separate animated parts - see generateDoginalEar
    
    // Mouth/smile line
    for (let x = -1; x <= 1; x++) {
        addVoxel(x, 1, 6, DOGINAL_PALETTE.mouthLine);
    }
    
    // Tongue sticking out slightly
    addVoxel(0, 0, 7, DOGINAL_PALETTE.tongue);
    
    return Array.from(voxelMap.values());
};

/**
 * Generate the dog's body
 */
export const generateDoginalBody = () => {
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
    
    // Dog body - rounder than penguin
    for (let y = -8; y <= 0; y++) {
        const t = (y + 8) / 8;
        const sphereT = Math.sin(t * Math.PI);
        const radiusX = 5 * sphereT + 1;
        const radiusZ = 4 * sphereT + 1;
        
        for (let x = -Math.ceil(radiusX); x <= Math.ceil(radiusX); x++) {
            for (let z = -Math.ceil(radiusZ); z <= Math.ceil(radiusZ); z++) {
                const distX = radiusX > 0.5 ? x / radiusX : 0;
                const distZ = radiusZ > 0.5 ? z / radiusZ : 0;
                
                if (distX * distX + distZ * distZ <= 1) {
                    let color = DOGINAL_PALETTE.main;
                    // Belly (front, lower)
                    if (z > 1 && y < -2) color = DOGINAL_PALETTE.belly;
                    // Top of back darker
                    if (y > -2) color = DOGINAL_PALETTE.mainDark;
                    // Sides
                    if (Math.abs(x) > radiusX * 0.7) color = DOGINAL_PALETTE.mainDark;
                    addVoxel(x, y, z, color);
                }
            }
        }
    }
    
    // NOTE: Tail is now a separate animated part - see generateDoginalTail
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's front legs/paws
 */
export const generateDoginalArm = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const shoulderX = side * 4;
    const shoulderY = -4; // Raised by 2 from -6
    
    // Front leg - moved forward by 1 (Z+1)
    for (let i = 0; i < 8; i++) {
        const legX = shoulderX + side * (i < 3 ? i * 0.3 : 1);
        const legY = shoulderY - i;
        addVoxel(legX, legY, 3, DOGINAL_PALETTE.main);
        addVoxel(legX, legY, 4, DOGINAL_PALETTE.main);
    }
    
    // Paw - moved forward by 1 (Z+1)
    const pawY = shoulderY - 8;
    addVoxel(shoulderX + side, pawY, 4, DOGINAL_PALETTE.mainLight);
    addVoxel(shoulderX + side, pawY, 5, DOGINAL_PALETTE.mainLight);
    addVoxel(shoulderX + side, pawY, 6, DOGINAL_PALETTE.mainLight);
    // Toe beans (darker)
    addVoxel(shoulderX + side, pawY - 1, 5, DOGINAL_PALETTE.mainDark);
    addVoxel(shoulderX + side, pawY - 1, 6, DOGINAL_PALETTE.mainDark);
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's back legs
 */
export const generateDoginalLeg = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? 1 : -1;
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z);
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    const hipX = side * 3;
    const hipY = -6;
    
    // Back leg (thicker at top) - moved backwards towards tail
    for (let i = 0; i < 6; i++) {
        const legX = hipX;
        const legY = hipY - i;
        addVoxel(legX, legY, -7, DOGINAL_PALETTE.main);
        addVoxel(legX, legY, -8, DOGINAL_PALETTE.main);
        if (i < 3) {
            addVoxel(legX + side, legY, -7, DOGINAL_PALETTE.mainDark);
        }
    }
    
    // Back paw
    const pawY = hipY - 6;
    addVoxel(hipX, pawY, -7, DOGINAL_PALETTE.mainLight);
    addVoxel(hipX, pawY, -6, DOGINAL_PALETTE.mainLight);
    addVoxel(hipX, pawY, -5, DOGINAL_PALETTE.mainLight);
    // Toe beans
    addVoxel(hipX, pawY - 1, -6, DOGINAL_PALETTE.mainDark);
    addVoxel(hipX, pawY - 1, -5, DOGINAL_PALETTE.mainDark);
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's tail (separate for animation)
 */
export const generateDoginalTail = () => {
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
    
    // Tail - curving up and back
    for (let i = 0; i < 5; i++) {
        const tailX = 0;
        const tailY = -3 + i * 0.5;
        const tailZ = -4 - i;
        addVoxel(tailX, tailY, tailZ, DOGINAL_PALETTE.main);
        if (i < 3) {
            addVoxel(tailX + 1, tailY, tailZ, DOGINAL_PALETTE.mainLight);
        }
    }
    // Fluffy tail tip
    addVoxel(0, -1, -8, DOGINAL_PALETTE.mainLight);
    addVoxel(1, -1, -8, DOGINAL_PALETTE.mainLight);
    addVoxel(0, 0, -8, DOGINAL_PALETTE.mainLight);
    
    return Array.from(voxelMap.values());
};

/**
 * Generate dog's ear (separate for animation)
 */
export const generateDoginalEar = (isLeft) => {
    const voxelMap = new Map();
    const side = isLeft ? -1 : 1;
    const Z_HEAD_OFFSET = 3; // Match head forward offset
    
    const addVoxel = (x, y, z, c) => {
        const rx = Math.round(x);
        const ry = Math.round(y) + Y_OFFSET;
        const rz = Math.round(z) + Z_HEAD_OFFSET;
        const key = `${rx},${ry},${rz}`;
        if (!voxelMap.has(key)) {
            voxelMap.set(key, { x: rx, y: ry, z: rz, c });
        }
    };
    
    // Floppy ear - droops down on side
    for (let i = 0; i < 6; i++) {
        const earX = side * (5 + (i < 2 ? 0 : 1));
        const earY = 7 - i;
        const earZ = 0;
        addVoxel(earX, earY, earZ, DOGINAL_PALETTE.main);
        addVoxel(earX, earY, earZ + 1, DOGINAL_PALETTE.main);
        addVoxel(earX + side, earY, earZ, DOGINAL_PALETTE.mainDark);
        // Inner ear (visible from some angles)
        if (i > 1) {
            addVoxel(earX - side, earY, earZ, DOGINAL_PALETTE.earInner);
        }
    }
    
    return Array.from(voxelMap.values());
};

/**
 * Get pivot points for animation
 */
export const getDoginalPivots = () => ({
    tail: { x: 0, y: -3 + Y_OFFSET, z: -4 },     // Base of tail
    earLeft: { x: -5, y: 7 + Y_OFFSET, z: 3 },   // Top of left ear (with head Z offset)
    earRight: { x: 5, y: 7 + Y_OFFSET, z: 3 },   // Top of right ear
    head: { x: 0, y: 2+ Y_OFFSET, z: 2 },  // Z=4 to match head forward offset
    body: { x: 0, y: -4 + Y_OFFSET, z: 0 },
    armLeft: { x: 4, y: -4 + Y_OFFSET, z: 3 },   // Y raised to -4
    armRight: { x: -4, y: -4 + Y_OFFSET, z: 3 }, // Y raised to -4
    legLeft: { x: 3, y: -6 + Y_OFFSET, z: -5 },  // Z moved to -7
    legRight: { x: -3, y: -6 + Y_OFFSET, z: -5 },// Z moved to -7
});

/**
 * Generate complete Doginal model
 */
export const generateDoginalComplete = () => {
    const voxelMap = new Map();
    
    const addVoxels = (voxels) => {
        voxels.forEach(v => {
            const key = `${v.x},${v.y},${v.z}`;
            if (!voxelMap.has(key)) {
                voxelMap.set(key, v);
            }
        });
    };
    
    addVoxels(generateDoginalHead());
    addVoxels(generateDoginalBody());
    addVoxels(generateDoginalArm(true));
    addVoxels(generateDoginalArm(false));
    addVoxels(generateDoginalLeg(true));
    addVoxels(generateDoginalLeg(false));
    
    return Array.from(voxelMap.values());
};

// Export generators object for registry
export const DoginalGenerators = {
    head: generateDoginalHead,
    body: generateDoginalBody,
    armLeft: () => generateDoginalArm(true),
    armRight: () => generateDoginalArm(false),
    legLeft: () => generateDoginalLeg(true),
    legRight: () => generateDoginalLeg(false),
    tail: generateDoginalTail,
    earLeft: () => generateDoginalEar(true),
    earRight: () => generateDoginalEar(false),
    complete: generateDoginalComplete,
    pivots: getDoginalPivots,
};

export default DoginalGenerators;

