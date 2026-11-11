/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { contentValidation } from './scripts/content/vite-plugin.ts';

export default defineConfig({
  plugins: [contentValidation(), react()],
  resolve: {
    alias: {
      // The package "main" is a UMD build that expects a global Chart. Vite and Vitest
      // need the ESM build; TypeScript still reads the package's own type declarations.
      'chartjs-chart-financial': 'chartjs-chart-financial/dist/chartjs-chart-financial.esm.js',
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
