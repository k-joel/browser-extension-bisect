import { defineConfig } from 'wxt';

const TEST_MODE = process.env.EXT_TEST_MODE === '1';
const GECKO_ID = 'dev-test@my-browser-extension.local';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: ({ browser }) => ({
    name: 'Browser Extension Bisect',
    description: 'Binary-search faulty browser extensions across Chrome and Firefox.',
    permissions: ['storage', 'management'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: GECKO_ID,
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : { action: { default_title: 'Extension Bisect' } }),
  }),
  vite: () => ({
    define: {
      __EXT_TEST_MODE__: JSON.stringify(TEST_MODE),
    },
  }),
});
