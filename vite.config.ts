/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // three + R3F ayrı ve uzun süreli önbelleklenebilir bir vendor chunk'ında;
        // uygulama kodu küçük kalır, sürüm güncellemelerinde yalnızca o yeniden indirilir.
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
  test: { environment: 'node' },
});
