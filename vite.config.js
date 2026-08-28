import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  root: '.',
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Forward all /api/* requests to the Express backend on port 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
