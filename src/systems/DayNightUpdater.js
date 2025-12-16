/**
 * DayNightUpdater - Smooth, natural day/night cycle
 * Simplified: Uses sine wave for smooth transitions
 */

/**
 * Update day/night cycle lighting
 * @param {Object} params - All required parameters
 * @param {number} params.t - Normalized time (0-1) where 0=midnight, 0.5=noon
 * @param {THREE.DirectionalLight} params.sunLight - Sun directional light
 * @param {THREE.AmbientLight} params.ambientLight - Ambient light
 * @param {THREE.Scene} params.scene - Scene (for background color)
 * @param {Array} params.propLights - Array of prop lights to toggle
 * @param {Object} params.lightsOnRef - Ref tracking if lights are on
 */
export function updateDayNightCycle({
    t,
    sunLight,
    ambientLight,
    scene,
    propLights = [],
    lightsOnRef = { current: false }
}) {
    if (!sunLight || !ambientLight) return;
    
    // Smooth sun arc using sine wave
    // t=0 midnight, t=0.25 sunrise, t=0.5 noon, t=0.75 sunset
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle); // -1 at midnight, +1 at noon
    
    // Sun position - arc across the sky
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.max(5, sunHeight * 80 + 50);
    sunLight.position.set(sunX, sunY, 60);
    
    // Daylight factor: 0 at night, 1 at noon (smooth sine curve)
    const dayFactor = Math.max(0, sunHeight);
    const nightFactor = 1 - dayFactor;
    
    // Colors - smooth interpolation between day and night
    // Night colors brightened to reduce darkness
    const dayAmbient = { r: 0.75, g: 0.88, b: 0.94 };
    const nightAmbient = { r: 0.45, g: 0.50, b: 0.60 }; // Brighter night ambient
    const daySun = { r: 1.0, g: 0.98, b: 0.95 };
    const nightSun = { r: 0.5, g: 0.6, b: 0.85 }; // Brighter moonlight
    const daySky = { r: 0.53, g: 0.81, b: 0.92 };
    const nightSky = { r: 0.20, g: 0.25, b: 0.40 }; // Brighter night sky
    
    // Lerp colors based on dayFactor
    const lerpColor = (day, night, factor) => ({
        r: day.r * factor + night.r * (1 - factor),
        g: day.g * factor + night.g * (1 - factor),
        b: day.b * factor + night.b * (1 - factor)
    });
    
    const ambientC = lerpColor(dayAmbient, nightAmbient, dayFactor);
    const sunC = lerpColor(daySun, nightSun, dayFactor);
    const skyC = lerpColor(daySky, nightSky, dayFactor);
    
    // Apply colors
    ambientLight.color.setRGB(ambientC.r, ambientC.g, ambientC.b);
    sunLight.color.setRGB(sunC.r, sunC.g, sunC.b);
    scene.background.setRGB(skyC.r, skyC.g, skyC.b);
    
    // Intensities - brighter during day, less dim at night (always visible)
    sunLight.intensity = 0.45 + dayFactor * 0.5; // Night: 0.45, Day: 0.95
    ambientLight.intensity = 0.5 + dayFactor * 0.15; // Night: 0.5, Day: 0.65
    
    // Update fog color to match sky
    if (scene.fog) scene.fog.color.copy(scene.background);
    
    // Toggle prop lights (ON when sun is below horizon)
    const shouldLightsBeOn = nightFactor > 0.5;
    
    if (shouldLightsBeOn !== lightsOnRef.current && propLights.length > 0) {
        lightsOnRef.current = shouldLightsBeOn;
        
        propLights.forEach(light => {
            if (light && light.isLight) {
                if (light.userData.originalIntensity === undefined) {
                    light.userData.originalIntensity = light.intensity;
                }
                // Smooth transition for prop lights based on night factor
                light.intensity = shouldLightsBeOn ? light.userData.originalIntensity : 0;
            }
        });
    }
    
    return { sunIntensity: sunLight.intensity, ambientIntensity: ambientLight.intensity, isNight: shouldLightsBeOn };
}

/**
 * Calculate night factor from time (0=day, 1=night)
 * Smooth sine-based calculation
 * @param {number} t - Normalized time (0-1)
 * @returns {number} Night factor (0-1)
 */
export function calculateNightFactor(t) {
    // Sine wave: t=0 midnight (night=1), t=0.5 noon (night=0)
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    return Math.max(0, -sunHeight); // 0 during day, peaks at 1 at midnight
}

export default { updateDayNightCycle, calculateNightFactor };
