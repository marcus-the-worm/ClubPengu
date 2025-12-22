import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        buffer: 'buffer/',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
      include: ['buffer', '@solana/web3.js', '@solana/spl-token'],
    },
    define: {
      'process.env': {},
      global: 'globalThis',
      // Note: VITE_SOLANA_RPC_URL is automatically exposed by Vite
    },
  }
})
