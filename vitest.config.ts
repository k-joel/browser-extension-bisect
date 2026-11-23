import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [vue(), WxtVitest()],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'happy-dom',
    restoreMocks: true,
    clearMocks: true,
  },
});
