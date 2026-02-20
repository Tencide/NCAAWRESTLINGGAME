import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { reporter: ['text', 'json-summary'], include: ['src/engine/**/*.ts'], exclude: ['**/*.test.ts'] },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
