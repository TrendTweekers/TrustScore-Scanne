import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

export default defineConfig({
  root: join(process.cwd(), 'frontend'),
  plugins: [react()],
  build: {
    outDir: join(process.cwd(), 'dist'),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  resolve: {
    alias: {
      '@shopify/app-bridge-react': '@shopify/app-bridge-react',
    }
  }
});
