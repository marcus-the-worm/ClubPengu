/**
 * Igloo Module Index Tests
 */

import { describe, it, expect } from 'vitest';

describe('Igloo Module Exports', () => {
    it('should export IglooProvider', async () => {
        const module = await import('../igloo/index.js');
        expect(module.IglooProvider).toBeDefined();
    });
    
    it('should export useIgloo', async () => {
        const module = await import('../igloo/index.js');
        expect(module.useIgloo).toBeDefined();
    });
});

