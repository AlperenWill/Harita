/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      // İki ayrı sayfa: ana uygulama (/) ve mevcut 3D harita deneyimi (/3d/)
      input: {
        main: resolve(__dirname, 'index.html'),
        harita3d: resolve(__dirname, '3d/index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three')) return 'r3f';
          if (id.includes('node_modules/leaflet') || id.includes('react-leaflet')) return 'leaflet';
        },
      },
    },
  },
  test: { environment: 'node' },
});
