import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(__dirname, '../../packages/shared/src');
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  envDir: repoRoot,
  resolve: {
    alias: { '@shared': sharedSrc },
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('html2canvas') || id.includes('purify')) {
            return 'vendor-html2canvas';
          }
          if (id.includes('jspdf')) return 'vendor-jspdf';
          if (id.includes('canvas-confetti')) return 'vendor-confetti';
          if (id.includes('papaparse')) return 'vendor-papaparse';
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
});
