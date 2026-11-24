import { createApp } from 'vue';
import { installTestDriverGlobal } from '@/utils/bisect/test-driver';
import { TEST_MODE_ENABLED } from '@/utils/test-mode';
import App from './App.vue';
import './style.css';

if (TEST_MODE_ENABLED) installTestDriverGlobal(globalThis as unknown as Record<string, unknown>);

createApp(App).mount('#app');
