/**
 * SlotPayoutBoard - A board showing cosmetic gacha drop rates and rarities
 * Displays near the casino exit to inform players of gacha mechanics
 * HORIZONTAL LAYOUT - wider board for better readability
 * SIZE: +75% from original (multiple increases)
 */

export function createSlotPayoutBoard(THREE, position = { x: 0, y: 0, z: 0 }, rotation = 0) {
    const group = new THREE.Group();
    
    // Board dimensions - HORIZONTAL, +25% bigger from last
    const boardWidth = 21.6;   // +25% from 17.3
    const boardHeight = 9.0;   // +25% from 7.2
    const boardDepth = 0.45;   // +25%
    
    // Create wooden frame
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Main board backing
    const backingGeo = new THREE.BoxGeometry(boardWidth + 0.75, boardHeight + 0.75, boardDepth);
    const backing = new THREE.Mesh(backingGeo, frameMaterial);
    backing.position.z = -boardDepth / 2;
    // Skip shadows on Apple/Mobile for performance
    const skipShadows = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
    if (!skipShadows) {
        backing.castShadow = true;
        backing.receiveShadow = true;
    }
    group.add(backing);
    
    // Create canvas for the payout info - +25%
    const canvas = document.createElement('canvas');
    canvas.width = 1536;   // +25% from 1228
    canvas.height = 630;   // +25% from 504
    const ctx = canvas.getContext('2d');
    
    // Draw the payout board
    drawPayoutBoard(ctx, canvas.width, canvas.height);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Board surface with canvas texture
    const surfaceMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.3,
        metalness: 0
    });
    
    const surfaceGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
    const surface = new THREE.Mesh(surfaceGeo, surfaceMaterial);
    surface.position.z = 0.01;
    group.add(surface);
    
    // Gold corner decorations - +25%
    const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8
    });
    
    const cornerSize = 0.72; // +25% from 0.58
    const cornerGeo = new THREE.BoxGeometry(cornerSize, cornerSize, 0.18);
    
    const corners = [
        { x: -boardWidth/2 + cornerSize/2, y: boardHeight/2 - cornerSize/2 },
        { x: boardWidth/2 - cornerSize/2, y: boardHeight/2 - cornerSize/2 },
        { x: -boardWidth/2 + cornerSize/2, y: -boardHeight/2 + cornerSize/2 },
        { x: boardWidth/2 - cornerSize/2, y: -boardHeight/2 + cornerSize/2 }
    ];
    
    corners.forEach(pos => {
        const corner = new THREE.Mesh(cornerGeo, goldMaterial);
        corner.position.set(pos.x, pos.y, 0.05);
        group.add(corner);
    });
    
    // Add point light to illuminate the board - skip on Apple/Mobile for performance
    const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
    if (!needsOptimization) {
        const boardLight = new THREE.PointLight(0xffffcc, 1.2, 18);
        boardLight.position.set(0, 0, 5);
        group.add(boardLight);
    }
    
    // Position and rotate the group
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = rotation;
    
    // Store banner data on surface mesh for zoom overlay
    surface.userData.isBanner = true;
    surface.userData.bannerData = {
        type: 'canvas',
        title: 'Gacha Drop Rates',
        description: 'Cosmetic gacha drop rates and rarities',
        canvas: canvas,
        renderFn: (ctx, w, h) => {
            drawPayoutBoard(ctx, w, h);
        }
    };
    
    return {
        group,
        canvas,
        ctx,
        texture,
        update: () => {
            drawPayoutBoard(ctx, canvas.width, canvas.height);
            texture.needsUpdate = true;
        }
    };
}

function drawPayoutBoard(ctx, W, H) {
    // Background gradient - horizontal
    const bgGrad = ctx.createLinearGradient(0, 0, W, 0);
    bgGrad.addColorStop(0, '#1a0a2e');
    bgGrad.addColorStop(0.5, '#2d1b4e');
    bgGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    // Decorative border - thicker
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.strokeRect(15, 15, W - 30, H - 30);
    
    // Inner border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 5;
    ctx.strokeRect(30, 30, W - 60, H - 60);
    
    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 62px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 22;
    ctx.fillText('✨ COSMETIC GACHA ✨', W/2, 90);
    ctx.shadowBlur = 0;
    
    // Subtitle
    ctx.fillStyle = '#a78bfa';
    ctx.font = '30px "Segoe UI", Arial';
    ctx.fillText('Roll for exclusive penguin cosmetics! • 25 🪨 Pebbles per roll • Duplicates = Gold!', W/2, 135);
    
    // Rarity tiers - arranged horizontally (7 tiers)
    // Values from whitepaper: dupeGold converted to pebbles (1 gold = 1 pebble approximation, or use SOL values)
    // Using pebble values based on whitepaper dupeGold values
    const rarities = [
        { emoji: '✨', name: 'Divine', rate: '0.02%', color: '#FFFFFF', dupPebbles: '50,000', dupSol: '50.00', bgAlpha: 0.25 },
        { emoji: '🔴', name: 'Mythic', rate: '0.18%', color: '#EF4444', dupPebbles: '10,000', dupSol: '10.00', bgAlpha: 0.2 },
        { emoji: '🟡', name: 'Legendary', rate: '0.8%', color: '#F59E0B', dupPebbles: '2,500', dupSol: '2.50', bgAlpha: 0.15 },
        { emoji: '🟣', name: 'Epic', rate: '4%', color: '#A855F7', dupPebbles: '500', dupSol: '0.50', bgAlpha: 0.12 },
        { emoji: '🔵', name: 'Rare', rate: '15%', color: '#3B82F6', dupPebbles: '150', dupSol: '0.15', bgAlpha: 0.1 },
        { emoji: '🟢', name: 'Uncommon', rate: '30%', color: '#22C55E', dupPebbles: '50', dupSol: '0.05', bgAlpha: 0.08 },
        { emoji: '⚪', name: 'Common', rate: '50%', color: '#9CA3AF', dupPebbles: '25', dupSol: '0.025', bgAlpha: 0.05 }
    ];
    
    // Calculate column positions
    const startX = 90;
    const columnWidth = (W - 180) / 7;
    const startY = 195;
    
    rarities.forEach((r, idx) => {
        const x = startX + columnWidth * idx + columnWidth / 2;
        
        // Column background with rarity color
        ctx.fillStyle = `rgba(${hexToRgb(r.color)}, ${r.bgAlpha})`;
        ctx.fillRect(startX + columnWidth * idx, startY - 30, columnWidth - 6, 390);
        
        // Rarity name at top
        ctx.textAlign = 'center';
        ctx.fillStyle = r.color;
        ctx.font = 'bold 24px "Segoe UI", Arial';
        ctx.shadowColor = r.color;
        ctx.shadowBlur = idx < 3 ? 12 : 0;
        ctx.fillText(r.name, x, startY);
        ctx.shadowBlur = 0;
        
        // Emoji - BIG
        ctx.font = '78px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(r.emoji, x, startY + 90);
        
        // Drop Rate Label
        ctx.font = '20px "Segoe UI", Arial';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('Drop Rate', x, startY + 130);
        
        // Drop Rate Value
        ctx.font = 'bold 36px "Segoe UI", Arial';
        ctx.fillStyle = r.color;
        ctx.shadowColor = idx < 2 ? r.color : 'transparent';
        ctx.shadowBlur = idx < 2 ? 15 : 0;
        ctx.fillText(r.rate, x, startY + 175);
        ctx.shadowBlur = 0;
        
        // Divider
        ctx.strokeStyle = '#4a3a6e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX + columnWidth * idx + 15, startY + 200);
        ctx.lineTo(startX + columnWidth * (idx + 1) - 21, startY + 200);
        ctx.stroke();
        
        // Duplicate Value Label (Pebbles)
        ctx.font = '16px "Segoe UI", Arial';
        ctx.fillStyle = '#a78bfa';
        ctx.fillText('Dupe Value', x, startY + 230);
        
        // Duplicate Pebbles Value
        ctx.font = 'bold 24px "Segoe UI", Arial';
        ctx.fillStyle = '#87CEEB';
        ctx.fillText(`${r.dupPebbles} 🪨`, x, startY + 260);
        
        // Duplicate SOL Value (smaller, below)
        ctx.font = 'bold 18px "Segoe UI", Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${r.dupSol} SOL`, x, startY + 285);
        
        // Special tags for rare items
        if (idx === 0) {
            ctx.font = 'bold 16px "Segoe UI", Arial';
            ctx.fillStyle = '#F472B6';
            ctx.fillText('1st Ed + Holo!', x, startY + 310);
        } else if (idx < 3) {
            ctx.font = 'bold 16px "Segoe UI", Arial';
            ctx.fillStyle = '#60A5FA';
            ctx.fillText('Holo Chance!', x, startY + 310);
        }
    });
    
    // Pity System callout at bottom - ensure it fits
    ctx.fillStyle = '#ffd700';
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 32px "Segoe UI", Arial'; // Slightly smaller font to prevent cutoff
    ctx.textAlign = 'center';
    // Split text into two lines to prevent cutoff
    const pityText1 = '🎁 PITY SYSTEM ACTIVE! • Guaranteed drops after bad luck';
    const pityText2 = 'Holographic & First Edition variants!';
    ctx.fillText(pityText1, W/2, H - 60);
    ctx.fillText(pityText2, W/2, H - 25);
    ctx.shadowBlur = 0;
}

// Helper to convert hex color to rgb for rgba
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '255, 255, 255';
}

export default createSlotPayoutBoard;
