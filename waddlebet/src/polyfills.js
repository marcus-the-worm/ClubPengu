/**
 * Browser polyfills for Node.js globals
 * Must be imported FIRST before any Solana packages
 */
import { Buffer } from 'buffer'

// Make Buffer available globally (required by @solana/spl-token)
window.Buffer = Buffer
globalThis.Buffer = Buffer



