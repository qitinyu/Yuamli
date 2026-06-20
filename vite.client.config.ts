import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist/client',
    lib: {
      entry: resolve(__dirname, 'src/client/index.tsx'),
      name: 'YuamliWidget',
      formats: ['iife'],
      fileName: () => 'yuamli.js',
    },
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: 'yuamli.[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});