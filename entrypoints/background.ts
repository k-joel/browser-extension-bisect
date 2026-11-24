import { createChromePort } from '@/utils/bisect/chrome-port';
import { deleteLegacyStorageKeys, readBisectConfig, updateBisectConfig } from '@/utils/bisect/config';
import type { BisectConfig, ManagementPort, RestoreResult, TestTabBinding } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import {
  acceptRestore,
  applyTrial,
  bindTestTab,
  confirmManualState,
  getSession,
  recordExternalBaseline,
  reloadTestTab,
  resetSession,
  retryTrial,
  type SessionDependencies,
  SessionError,
  startSession,
  submitVerdict,
  TEST_TAB_SETTLE_TIMEOUT_MS,
  type TestTabSurface,
  verifyManualState,
  verifyRestore,
} from '@/utils/bisect/session';
import { withTestDriverOverlay } from '@/utils/bisect/test-driver';
import type { AddonManagerResult, ContentStatus, SessionMutationResult } from '@/utils/messaging';
import { messenger } from '@/utils/messaging';
import { applyStateUpdate, readState, recordInteraction } from '@/utils/state';
import { isTestMode, TEST_MODE_ENABLED } from '@/utils/test-mode';

const TAB_STATUS_POLL_INTERVAL_MS = 150;
const ADDON_MANAGER_URL = 'about:addons';

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

async function readTabCompleted(tabId: number): Promise<boolean> {
  try {
    const tab = await browser.tabs.get(tabId);
    return tab.status === 'complete';
  } catch {
    return false;
  }
}

async function waitForTabComplete(tabId: number, timeoutMs = TEST_TAB_SETTLE_TIMEOUT_MS): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await readTabCompleted(tabId)) return true;
    await new Promise((resolve) => setTimeout(resolve, TAB_STATUS_POLL_INTERVAL_MS));
  }
  return readTabCompleted(tabId);
}

export function createTestTabSurface(): TestTabSurface {
  return {
    reload: async (tabId: number) => {
      await browser.tabs.reload(tabId);
    },
    waitForComplete: (tabId: number) => waitForTabComplete(tabId),
  };
}

export function createManagementPort(): ManagementPort {
  const management = TEST_MODE_ENABLED ? withTestDriverOverlay(browser.management) : browser.management;
  const dependencies = { management };
  return import.meta.env.FIREFOX ? createFirefoxPort(dependencies) : createChromePort(dependencies);
}

/**
 * Without the `tabs` permission the browser does not expose `tab.url`, so the
 * binding records `null` and the panel falls back to "Tab #N".
 */
async function resolveTestTab(requestedTabId?: number): Promise<TestTabBinding> {
  const tab =
    requestedTabId === undefined
      ? (await browser.tabs.query({ active: true, currentWindow: true }))[0]
      : await browser.tabs.get(requestedTabId);
  if (tab?.id === undefined) {
    throw new SessionError('No tab is available to bind as the test tab.');
  }
  return { tabId: tab.id, url: typeof tab.url === 'string' ? tab.url : null };
}

async function readRestoreOutcome(): Promise<NonNullable<SessionMutationResult['restore']> | null> {
  const last = (await readBisectLog())?.events.at(-1);
  if (last?.type !== 'session-reset') return null;
  return {
    restored: last.payload.restored,
    errors: last.payload.errors,
    manualIds: last.payload.manualIds ?? [],
  };
}

/**
 * `about:addons` is a privileged page; `tabs.create` rejects when the add-on may
 * not navigate there, and the panel then shows the copyable list instead.
 */
async function openAddonManager(): Promise<AddonManagerResult> {
  try {
    await browser.tabs.create({ url: ADDON_MANAGER_URL });
    return { opened: true };
  } catch (error) {
    return { opened: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface BackgroundDependencies {
  managementPort?: ManagementPort;
  tabs?: TestTabSurface;
}

export function registerBackgroundHandlers(dependencies: BackgroundDependencies = {}): void {
  const port = dependencies.managementPort ?? createManagementPort();
  const tabs = dependencies.tabs ?? createTestTabSurface();
  const sessionDependencies = (): SessionDependencies => ({ port, tabs });

  messenger.onMessage('getState', () => readState());
  messenger.onMessage('updateState', ({ data }) => applyStateUpdate(data));
  messenger.onMessage('recordInteraction', () => recordInteraction());
  messenger.onMessage('getContentStatus', ({ data }) => resolveContentStatus(data));
  messenger.onMessage('getTabId', ({ sender }) => sender.tab?.id ?? null);

  messenger.onMessage('getCapabilities', () => port.getCapabilities());
  messenger.onMessage('listCandidates', () => port.listCandidates());
  messenger.onMessage('getConfig', () => readBisectConfig());
  messenger.onMessage('updateConfig', ({ data }) => updateBisectConfig(data));

  messenger.onMessage('getSession', () => getSession());
  messenger.onMessage('startSession', ({ data }) => startSession(sessionDependencies(), data));
  messenger.onMessage('applyTrial', () => applyTrial(sessionDependencies()));
  messenger.onMessage('submitVerdict', async ({ data }): Promise<SessionMutationResult> => {
    const session = await submitVerdict(sessionDependencies(), data);
    return { session, restore: await readRestoreOutcome() };
  });
  messenger.onMessage('retryTrial', async ({ data }): Promise<SessionMutationResult> => {
    const session = await retryTrial(sessionDependencies(), data ?? {});
    return { session, restore: null };
  });
  messenger.onMessage('resetSession', async ({ data }): Promise<SessionMutationResult> => {
    const session = await resetSession(sessionDependencies(), data);
    return { session, restore: data.restore ? await readRestoreOutcome() : null };
  });
  messenger.onMessage('bindTestTab', async ({ data }): Promise<BisectConfig> => {
    const binding = await resolveTestTab(data?.tabId);
    return bindTestTab(sessionDependencies(), binding);
  });
  messenger.onMessage('reloadTestTab', () => reloadTestTab(sessionDependencies()));

  messenger.onMessage('getDrift', () => verifyManualState(sessionDependencies()));
  messenger.onMessage('confirmManualState', () => confirmManualState(sessionDependencies()));
  messenger.onMessage('recordExternalBaseline', () => recordExternalBaseline(sessionDependencies()));
  messenger.onMessage('verifyRestore', (): Promise<RestoreResult> => verifyRestore(sessionDependencies()));
  messenger.onMessage('acceptRestore', () => acceptRestore(sessionDependencies()));
  messenger.onMessage('openAddonManager', () => openAddonManager());

  void deleteLegacyStorageKeys();
}

export default defineBackground(() => {
  attachTestModeErrorLogging();
  registerBackgroundHandlers();
  console.info('[EXT_BG_READY]');
});
