import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Código en src/; el build se escribe en la raíz del repo, que es lo que sirve GitHub Pages.
export default defineConfig({
  root: 'src',
  base: './',
  publicDir: false,
  plugins: [react()],
  build: { outDir: '..', emptyOutDir: false, assetsDir: 'assets', chunkSizeWarningLimit: 900 },
});
