/**
 * CharacterRegistry - OOP registry for managing character types
 * Server-authoritative: unlocks come from server, NO client-side promo codes
 */

class CharacterRegistry {
    constructor() {
        this.characters = new Map();
    }
    
    /**
     * Register a new character type
     * @param {string} id - Unique character identifier
     * @param {Object} config - Character configuration
     */
    registerCharacter(id, config) {
        this.characters.set(id, {
            id,
            name: config.name,
            description: config.description || '',
            generators: config.generators,
            palette: config.palette || {},
            customizationOptions: config.customizationOptions || {},
            isSecret: config.isSecret || false,
            previewScale: config.previewScale || 1,
        });
        
        return this;
    }
    
    /**
     * Get character by ID
     * @param {string} id - Character ID
     * @returns {Object|null}
     */
    getCharacter(id) {
        return this.characters.get(id) || null;
    }
    
    /**
     * Get all registered character IDs
     * @returns {Array<string>}
     */
    getAllCharacterIds() {
        return Array.from(this.characters.keys());
    }
    
    /**
     * Check if a character exists in the registry
     * @param {string} id - Character ID
     * @returns {boolean}
     */
    hasCharacter(id) {
        return this.characters.has(id);
    }
}

// Singleton instance
const characterRegistry = new CharacterRegistry();

export default characterRegistry;
export { CharacterRegistry };
