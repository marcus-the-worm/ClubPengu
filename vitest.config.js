/**
 * Vitest Configuration for Client Tests
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        // Test environment
        environment: 'jsdom',
        
        // Test file patterns
        include: ['src/__tests__/**/*.test.{js,jsx}'],
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: ['src/wallet/**/*.js', 'src/igloo/**/*.{js,jsx}', 'src/components/Igloo*.jsx', 'src/systems/IglooOccupancySystem.js'],
            exclude: ['node_modules', 'src/__tests__'],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70
            }
        },
        
        // Global setup
        globals: true,
        
        // Mock reset between tests
        mockReset: true,
        clearMocks: true,
        
        // Setup files
        setupFiles: ['./src/__tests__/setup.js'],
        
        // Timeout for tests
        testTimeout: 10000,
        
        // Reporter
        reporters: ['verbose']
    }
});

