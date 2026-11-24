import { createChromePort } from '@/utils/bisect/chrome-port';
import { deleteLegacyStorageKeys, readBisectConfig, updateBisectConfig } from '@/utils/bisect/config';
import type { ManagementPort } from '@/utils/bisect/domain';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import type { ContentStatus } from '@/utils/messaging';
import { messenger } from '@/utils/messaging';
import { applyStateUpdate, readState, recordInteraction } from '@/utils/state';
import { isTestMode } from '@/utils/test-mode';

function attachTestModeErrorLogging(): void {
  if (!isTestMode()) return;
  self.addEventListener('unhandledrejection', (event) => {
    console.error('[EXT_BG_ERR]', event.reason);
  });
  self.addEventListener('error', (event) => {
    console.error('[EXT_BG_ERR]', event.error ?? event.message);
  });
}

async function readContentStatus(tabId: number): Promise<ContentStatus> {
  try {
    const marker = await messenger.sendMessage('getContentMarker', undefined, tabId);
    return { active: marker !== null, marker };
  } catch {
    return { active: false, marker: null };
  }
}

async function resolveContentStatus(targetTabId?: number): Promise<ContentStatus> {
  if (targetTabId !== undefined) return readContentStatus(targetTabId);
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id === undefined) return { active: false, marker: null };
  return readContentStatus(activeTab.id);
}

export function createManagementPort(): ManagementPort {
  const dependencies = { management: browser.management };
  return import.meta.env.FIREFOX ? createFirefoxPort(dependencies) : createChromePort(dependencies);
}

export interface BackgroundDependencies {
  managementPort?: ManagementPort;
}

export function registerBackgroundHandlers(dependencies: BackgroundDependencies = {}): void {
  const port = dependencies.managementPort ?? createManagementPort();

  messenger.onMessage('getState', () => readState());
  messenger.onMessage('updateState', ({ data }) => applyStateUpdate(data));
  messenger.onMessage('recordInteraction', () => recordInteraction());
  messenger.onMessage('getContentStatus', ({ data }) => resolveContentStatus(data));
  messenger.onMessage('getTabId', ({ sender }) => sender.tab?.id ?? null);

  messenger.onMessage('getCapabilities', () => port.getCapabilities());
  messenger.onMessage('listCandidates', () => port.listCandidates());
  messenger.onMessage('getConfig', () => readBisectConfig());
  messenger.onMessage('updateConfig', ({ data }) => updateBisectConfig(data));

  void deleteLegacyStorageKeys();
}

export default defineBackground(() => {
  attachTestModeErrorLogging();
  registerBackgroundHandlers();
  console.info('[EXT_BG_READY]');
});
