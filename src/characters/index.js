/**
 * Characters Module - Central export for character system
 * 
 * Usage:
 *   import { characterRegistry, MarcusGenerators } from './characters';
 *   
 *   // Redeem a promo code
 *   const character = characterRegistry.redeemPromoCode('MARCUS');
 *   
 *   // Check if character is unlocked
 *   if (characterRegistry.isUnlocked('marcus')) { ... }
 *   
 *   // Get character generators
 *   const generators = characterRegistry.getCharacter('marcus').generators;
 */

import characterRegistry from './CharacterRegistry';
import MarcusGenerators, { MARCUS_PALETTE } from './MarcusCharacter';

// Register all characters
characterRegistry.registerCharacter('penguin', {
    name: 'Penguin',
    description: 'The classic Club Penguin character',
    promoCode: null, // Always available
    generators: null, // Uses default penguin generators
    isSecret: false,
});

characterRegistry.registerCharacter('marcus', {
    name: 'Marcus',
    description: 'A mysterious peanut-headed creature with lanky limbs',
    promoCode: 'MARCUS',
    generators: MarcusGenerators,
    palette: MARCUS_PALETTE,
    isSecret: true,
    previewScale: 0.8, // Slightly smaller in preview due to height
    customizationOptions: {
        // Marcus doesn't use penguin customization options
        // Could add Marcus-specific options in future
        disableSkinColor: true,
        disableHats: true, // For now - could add Marcus-compatible hats later
        disableEyes: true, // Has built-in eyes
        disableMouth: true, // Has built-in mouth
        disableBodyItems: false, // Some items might work
    }
});

// Export everything
export { characterRegistry, MarcusGenerators, MARCUS_PALETTE };
export default characterRegistry;



