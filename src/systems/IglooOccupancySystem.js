/**
 * IglooOccupancySystem - Handles MapleStory-style igloo occupancy banner sprites
 * Extracted from VoxelWorld.jsx for maintainability
 * 
 * Now supports dynamic igloo data with:
 * - Custom banner titles, tickers, descriptions
 * - Lock status display (private/public/token-gated/entry-fee)
 * - Owner information
 */

import { IGLOO_BANNER_STYLES, IGLOO_BANNER_CONTENT } from '../config';

/**
 * Draw the banner background, borders, and decorations
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {number} iglooIndex - Index for special styling
 * @param {number} animPhase - Animation phase (0-1) for animated banners
 * @param {Object} iglooData - Optional dynamic igloo data from server
 */
function drawBannerBackground(ctx, style, w, h, iglooIndex = 0, animPhase = 0, iglooData = null) {
    const padding = 12;
    const cornerRadius = 16;
    const isNightclub = iglooIndex === 2; // SKNY GANG nightclub
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, style.bgGradient[0]);
    gradient.addColorStop(0.5, style.bgGradient[1]);
    gradient.addColorStop(1, style.bgGradient[2]);
    
    // Draw main banner shape with rounded corners
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(w - cornerRadius, 0);
    ctx.quadraticCurveTo(w, 0, w, cornerRadius);
    ctx.lineTo(w, h - cornerRadius);
    ctx.quadraticCurveTo(w, h, w - cornerRadius, h);
    ctx.lineTo(cornerRadius, h);
    ctx.quadraticCurveTo(0, h, 0, h - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw border - animated for nightclub
    if (isNightclub) {
        // Animated neon border
        const hue = (animPhase * 360) % 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.lineWidth = 5;
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 15;
    } else {
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = 4;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw inner border accent
    if (isNightclub) {
        const hue2 = ((animPhase * 360) + 180) % 360;
        ctx.strokeStyle = `hsl(${hue2}, 100%, 60%)`;
    } else {
        ctx.strokeStyle = style.accentColor;
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cornerRadius + 6, 6);
    ctx.lineTo(w - cornerRadius - 6, 6);
    ctx.quadraticCurveTo(w - 6, 6, w - 6, cornerRadius + 6);
    ctx.lineTo(w - 6, h - cornerRadius - 6);
    ctx.quadraticCurveTo(w - 6, h - 6, w - cornerRadius - 6, h - 6);
    ctx.lineTo(cornerRadius + 6, h - 6);
    ctx.quadraticCurveTo(6, h - 6, 6, h - cornerRadius - 6);
    ctx.lineTo(6, cornerRadius + 6);
    ctx.quadraticCurveTo(6, 6, cornerRadius + 6, 6);
    ctx.closePath();
    ctx.stroke();
    
    // Draw corner decorations
    if (isNightclub) {
        // Animated disco lights for nightclub
        const drawDiscoLight = (x, y, size, offset) => {
            const lightHue = ((animPhase * 360) + offset * 90) % 360;
            ctx.fillStyle = `hsl(${lightHue}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${lightHue}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        };
        drawDiscoLight(20, 20, 14, 0);
        drawDiscoLight(w - 20, 20, 14, 1);
        drawDiscoLight(20, h - 20, 12, 2);
        drawDiscoLight(w - 20, h - 20, 12, 3);
    } else {
        // Penguin emoji decorations in corners
        const drawPenguinDecor = (x, y, size) => {
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐧', x, y);
        };
        drawPenguinDecor(20, 20, 16);
        drawPenguinDecor(w - 20, 20, 16);
        drawPenguinDecor(20, h - 20, 14);
        drawPenguinDecor(w - 20, h - 20, 14);
    }
    
    // Title area background
    ctx.fillStyle = style.titleBg;
    ctx.globalAlpha = isNightclub ? 0.5 : 0.7;
    ctx.fillRect(padding + 20, padding + 8, w - padding * 2 - 40, 32);
    ctx.globalAlpha = 1;
}

/**
 * Draw banner content (title, ticker, description, owner)
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {Object} content - Content configuration
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {Object} iglooData - Optional dynamic igloo data
 */
function drawBannerContent(ctx, style, content, w, h, iglooData = null) {
    const padding = 12;
    
    // Use dynamic data if available, otherwise fall back to static content
    const title = iglooData?.banner?.title || content.title;
    const ticker = iglooData?.banner?.ticker || content.ticker || '';
    const shill = iglooData?.banner?.shill || content.shill || '';
    const owner = iglooData?.ownerUsername || content.owner;
    
    // Draw title
    ctx.font = 'bold 20px "Comic Sans MS", cursive, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = style.textColor;
    ctx.fillText(title, w / 2, padding + 24);
    
    // Draw ticker (if not empty)
    if (ticker) {
        ctx.font = 'bold 24px "Arial Black", sans-serif';
        ctx.fillStyle = style.borderColor;
        ctx.fillText(ticker, w / 2, padding + 56);
    }
    
    // Draw shill/description text (adjust position if no ticker)
    // Split on • for line breaks
    const shillY = ticker ? padding + 80 : padding + 54;
    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = style.textColor;
    ctx.globalAlpha = 0.9;
    
    const shillLines = shill.split(' • ');
    const lineHeight = 15;
    shillLines.forEach((line, idx) => {
        ctx.fillText(line.trim(), w / 2, shillY + idx * lineHeight);
    });
    ctx.globalAlpha = 1;
    
    // Calculate Y offset based on number of shill lines
    const shillEndY = shillY + (shillLines.length - 1) * lineHeight;
    
    // Draw owner (if exists)
    if (owner) {
        ctx.font = 'italic 12px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = style.accentColor;
        ctx.globalAlpha = 0.8;
        ctx.fillText(`owned by ${owner}`, w / 2, shillEndY + 16);
        ctx.globalAlpha = 1;
    }
    
    // Draw separator line
    ctx.strokeStyle = style.borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding + 30, h - 40);
    ctx.lineTo(w - padding - 30, h - 40);
    ctx.stroke();
}

/**
 * Draw the penguin icon, count, and access status
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Object} style - Style configuration
 * @param {number} count - Occupancy count
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 * @param {Object} iglooData - Optional dynamic igloo data for access status
 */
function drawPenguinCount(ctx, style, count, w, h, iglooData = null) {
    const padding = 12;
    const penguinX = w / 2 - 25;
    const penguinY = h - 28;
    
    // Penguin body (black)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.ellipse(penguinX, penguinY, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Penguin belly (white)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(penguinX, penguinY + 2, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Penguin eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(penguinX - 3, penguinY - 5, 2, 0, Math.PI * 2);
    ctx.arc(penguinX + 3, penguinY - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Penguin beak
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.moveTo(penguinX, penguinY - 2);
    ctx.lineTo(penguinX - 4, penguinY + 2);
    ctx.lineTo(penguinX + 4, penguinY + 2);
    ctx.closePath();
    ctx.fill();
    
    // Draw count
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = count > 0 ? style.textColor : '#888888';
    ctx.textAlign = 'left';
    const countText = count > 0 ? `${count}` : '0';
    ctx.fillText(countText, penguinX + 18, penguinY + 6);
    
    // Access status indicator based on igloo data
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';
    
    if (iglooData) {
        const accessType = iglooData.accessType || 'private';
        const hasEntryFee = iglooData.hasEntryFee;
        const hasTokenGate = iglooData.hasTokenGate;
        const isRented = iglooData.isRented;
        
        // Not rented and not reserved - show "FOR RENT"
        if (!isRented && !iglooData.isReserved) {
            ctx.fillStyle = '#22c55e';
            ctx.fillText('🏷️ FOR RENT', w - padding - 15, h - 22);
        }
        // Private - locked
        else if (accessType === 'private') {
            ctx.fillStyle = '#ef4444';
            ctx.fillText('🔒 LOCKED', w - padding - 15, h - 22);
        }
        // Token gated
        else if (accessType === 'token' || (accessType === 'both' && hasTokenGate)) {
            ctx.fillStyle = '#a855f7';
            const tokenInfo = iglooData.tokenGateInfo;
            const tokenText = tokenInfo?.symbol ? `🪙 ${tokenInfo.symbol}` : '🪙 TOKEN';
            ctx.fillText(tokenText, w - padding - 15, h - 22);
        }
        // Entry fee required
        else if (accessType === 'fee' || (accessType === 'both' && hasEntryFee)) {
            ctx.fillStyle = '#eab308';
            const feeText = iglooData.entryFeeAmount ? `💰 ${iglooData.entryFeeAmount}` : '💰 FEE';
            ctx.fillText(feeText, w - padding - 15, h - 22);
        }
        // Public
        else if (accessType === 'public') {
            ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
            ctx.fillText(count > 0 ? '🔓 OPEN' : '🔓 EMPTY', w - padding - 15, h - 22);
        }
        else {
            // Default
            ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
            ctx.fillText(count > 0 ? '● OPEN' : '○ EMPTY', w - padding - 15, h - 22);
        }
    } else {
        // No igloo data - use default status
        ctx.fillStyle = count > 0 ? '#22c55e' : '#888888';
        ctx.fillText(count > 0 ? '● OPEN' : '○ EMPTY', w - padding - 15, h - 22);
    }
}

/**
 * Render the full igloo banner to a canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} count - Occupancy count
 * @param {number} iglooIndex - Index for style/content selection
 * @param {Object} iglooData - Optional dynamic igloo data from server
 */
export function renderIglooBanner(ctx, count, iglooIndex = 0, iglooData = null) {
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;
    
    // Use style from igloo data if available, otherwise use index
    const styleIndex = iglooData?.banner?.styleIndex ?? iglooIndex;
    const style = IGLOO_BANNER_STYLES[styleIndex % IGLOO_BANNER_STYLES.length];
    const content = IGLOO_BANNER_CONTENT[iglooIndex % IGLOO_BANNER_CONTENT.length];
    
    // Clear canvas
    ctx.clearRect(0, 0, w, h);
    
    // Draw all components with igloo data
    drawBannerBackground(ctx, style, w, h, iglooIndex, 0, iglooData);
    drawBannerContent(ctx, style, content, w, h, iglooData);
    drawPenguinCount(ctx, style, count, w, h, iglooData);
}

/**
 * Create a new igloo occupancy sprite
 * @param {Object} THREE - THREE.js library
 * @param {number} count - Initial occupancy count
 * @param {number} iglooIndex - Index for style/content selection
 * @param {Object} iglooData - Optional dynamic igloo data from server
 * @returns {THREE.Sprite}
 */
export function createIglooOccupancySprite(THREE, count, iglooIndex = 0, iglooData = null) {
    const canvas = document.createElement('canvas');
    const w = 280;
    const h = 180;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    renderIglooBanner(ctx, count, iglooIndex, iglooData);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        depthTest: false, 
        depthWrite: false,
        transparent: true
    });
    const sprite = new THREE.Sprite(material);
    
    // Bigger scale for the banner
    const scale = 0.025;
    sprite.scale.set(w * scale, h * scale, 1);
    sprite.position.y = 10; // Higher above igloo
    sprite.renderOrder = 998;
    sprite.visible = false; // Start hidden, show when player is close
    
    // Store index and data for updates
    sprite.userData.styleIndex = iglooIndex;
    sprite.userData.iglooIndex = iglooIndex;
    sprite.userData.iglooData = iglooData;
    
    return sprite;
}

/**
 * Update an existing igloo occupancy sprite
 * @param {Object} THREE - THREE.js library
 * @param {THREE.Sprite} sprite - The sprite to update
 * @param {number} count - New occupancy count
 * @param {Object} iglooData - Optional updated igloo data from server
 */
export function updateIglooOccupancySprite(THREE, sprite, count, iglooData = null) {
    if (!sprite || !sprite.material) return;
    
    const iglooIndex = sprite.userData.iglooIndex || 0;
    // Use new data if provided, otherwise use stored data
    const data = iglooData || sprite.userData.iglooData || null;
    
    // Store updated data
    if (iglooData) {
        sprite.userData.iglooData = iglooData;
    }
    
    const canvas = document.createElement('canvas');
    const w = 280;
    const h = 180;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    renderIglooBanner(ctx, count, iglooIndex, data);
    
    // Update sprite texture
    if (sprite.material.map) {
        sprite.material.map.dispose();
    }
    sprite.material.map = new THREE.CanvasTexture(canvas);
    sprite.material.needsUpdate = true;
    
    // Ensure scale is correct
    const scale = 0.025;
    sprite.scale.set(w * scale, h * scale, 1);
}

export default {
    createIglooOccupancySprite,
    updateIglooOccupancySprite,
    renderIglooBanner
};

