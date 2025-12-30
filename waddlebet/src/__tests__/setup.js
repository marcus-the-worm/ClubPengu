/**
 * Test Setup - Configure testing environment
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock window.crypto for nonce generation
Object.defineProperty(globalThis, 'crypto', {
    value: {
        getRandomValues: (arr) => {
            for (let i = 0; i < arr.length; i++) {
                arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
        }
    }
});

// Mock btoa/atob for base64 encoding
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Mock TextEncoder for message signing
global.TextEncoder = class {
    encode(str) {
        return new Uint8Array([...str].map(c => c.charCodeAt(0)));
    }
};

// Console spy to catch errors
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

