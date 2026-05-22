/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/fish/',
  build: {
    target: 'es2022',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    passWithNoTests: true,
  },
});
