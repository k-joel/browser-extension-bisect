import { createChromePort } from '@/utils/bisect/chrome-port';
import { deleteLegacyStorageKeys, readBisectConfig, updateBisectConfig } from '@/utils/bisect/config';
import type { BisectConfig, ManagementPort, RestoreResult, TestTabBinding } from '@/utils/bisect/domain';
import { readBisectLog, reduceLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { replayLog } from '@/utils/bisect/replay';
import {
  acceptRestore,
  applyTrial,
  assistedSessionIsWaiting,
  bindTestTab,
  confirmManualState,
  createManualStateWatcher,
  createSnapshotWatcher,
  declineEscalation,
  getLog,
  publishManualState,
  readSessionView,
  reconcileStartup,
  recordEscalationResult,
  recordExternalBaseline,
  recordSnapshotPause,
  reloadTestTab,
  resetSession,
  restartSession,
  resumeSession,
  resyncSession,
  retryTrial,
  type SessionDependencies,
  SessionError,
  startNewSession,
  startSession,
  submitVerdict,
  TEST_TAB_SETTLE_TIMEOUT_MS,
  type TestTabSurface,
  undoLastVerdict,
  verifyManualState,
  verifyRestore,
} from '@/utils/bisect/session';
import { raiseStartupSignal } from '@/utils/bisect/startup';
import { withTestDriverOverlay } from '@/utils/bisect/test-driver';
import type { AddonManagerResult, SessionMutationResult } from '@/utils/messaging';
import { messenger } from '@/utils/messaging';
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

/**
 * Assisted mode's live progress. Nothing in the panel can see `management.onEnabled`, so
 * without a background watcher the counter and the checklist only move when the user
 * presses Verify — which is exactly what SPEC §Management port forbids: the events must
 * debounce a re-verify and the panel must update from its result (user story 30).
 *
 * The watcher is installed and removed from the log rather than from a module-level flag,
 * so it follows the session: `refresh()` runs after every command that could have changed
 * the status, and the same `refresh()` on startup re-installs it for a worker that was
 * terminated mid-session. What it publishes is a *derived* comparison — the expected map
 * from the log's own trial, the actual one from `management.getAll()` — so the stored
 * report is a cache the panel converges on, never a second source of truth: a panel that
 * misses the write still gets the same answer from `getDrift`, and the background stays
 * the only writer.
 */
export interface ManualStatePublisher {
  refresh(): Promise<void>;
  stop(): void;
}

export function createManualStatePublisher(sessionDependencies: () => SessionDependencies): ManualStatePublisher {
  let stop: (() => void) | null = null;

  const teardown = (): void => {
    stop?.();
    stop = null;
  };

  const refresh = async (): Promise<void> => {
    try {
      const view = await readSessionView(sessionDependencies());
      if (!assistedSessionIsWaiting(view)) {
        teardown();
        return;
      }
      if (stop !== null) return;
      stop = createManualStateWatcher({
        dependencies: sessionDependencies(),
        onDrift: (drift, context) => {
          void publishManualState(sessionDependencies(), drift, context).catch(() => undefined);
        },
      });
    } catch {
      // A read failure leaves the watcher as it was; the next command retries.
    }
  };

  return { refresh, stop: teardown };
}

export interface BackgroundDependencies {
  managementPort?: ManagementPort;
  tabs?: TestTabSurface;
}

export function registerBackgroundHandlers(dependencies: BackgroundDependencies = {}): void {
  const port = dependencies.managementPort ?? createManagementPort();
  const tabs = dependencies.tabs ?? createTestTabSurface();
  const sessionDependencies = (): SessionDependencies => ({ port, tabs });

  /**
   * The watcher has to follow whatever status a command left behind, and every mutating
   * command changes it, so the refresh is attached once here instead of at each handler.
   */
  const manualState = createManualStatePublisher(sessionDependencies);
  const tracked = <Result>(command: () => Promise<Result>): Promise<Result> =>
    command().finally(() => void manualState.refresh());

  messenger.onMessage('getCapabilities', () => port.getCapabilities());
  messenger.onMessage('listCandidates', () => port.listCandidates());
  messenger.onMessage('getConfig', () => readBisectConfig());
  messenger.onMessage('updateConfig', ({ data }) => updateBisectConfig(data));

  messenger.onMessage('getSession', () => readSessionView(sessionDependencies()));
  messenger.onMessage('getStartupReconciliation', () => reconcileStartup(sessionDependencies()));
  messenger.onMessage(
    'resumeSession',
    (): Promise<SessionMutationResult> =>
      tracked(async () => ({ session: await resumeSession(sessionDependencies()), restore: null })),
  );
  messenger.onMessage('getLog', () => getLog());
  messenger.onMessage('replayLog', ({ data }) => replayLog(data.log));
  messenger.onMessage('startSession', ({ data }) => tracked(() => startSession(sessionDependencies(), data)));
  messenger.onMessage('applyTrial', () => tracked(() => applyTrial(sessionDependencies())));
  messenger.onMessage(
    'submitVerdict',
    ({ data }): Promise<SessionMutationResult> =>
      tracked(async () => {
        const session = await submitVerdict(sessionDependencies(), data);
        return { session, restore: await readRestoreOutcome() };
      }),
  );
  messenger.onMessage(
    'retryTrial',
    ({ data }): Promise<SessionMutationResult> =>
      tracked(async () => ({ session: await retryTrial(sessionDependencies(), data ?? {}), restore: null })),
  );
  messenger.onMessage(
    'resetSession',
    ({ data }): Promise<SessionMutationResult> =>
      tracked(async () => {
        const session = await resetSession(sessionDependencies(), data);
        return { session, restore: data.restore ? await readRestoreOutcome() : null };
      }),
  );
  messenger.onMessage(
    'resyncSession',
    (): Promise<SessionMutationResult> =>
      tracked(async () => ({ session: await resyncSession(sessionDependencies()), restore: null })),
  );
  messenger.onMessage(
    'undoLastVerdict',
    (): Promise<SessionMutationResult> =>
      tracked(async () => ({ session: await undoLastVerdict(sessionDependencies()), restore: null })),
  );
  messenger.onMessage('bindTestTab', async ({ data }): Promise<BisectConfig> => {
    const binding = await resolveTestTab(data?.tabId);
    return bindTestTab(sessionDependencies(), binding);
  });
  messenger.onMessage('reloadTestTab', () => reloadTestTab(sessionDependencies()));

  messenger.onMessage('getDrift', () => verifyManualState(sessionDependencies()));
  messenger.onMessage(
    'recordEscalationResult',
    ({ data }): Promise<SessionMutationResult> =>
      tracked(async () => {
        const session = await recordEscalationResult(sessionDependencies(), data);
        return { session, restore: await readRestoreOutcome() };
      }),
  );
  messenger.onMessage(
    'declineEscalation',
    (): Promise<SessionMutationResult> =>
      tracked(async () => ({
        session: await declineEscalation(sessionDependencies()),
        restore: await readRestoreOutcome(),
      })),
  );
  messenger.onMessage(
    'restartSession',
    (): Promise<SessionMutationResult> =>
      tracked(async () => ({
        session: await restartSession(sessionDependencies()),
        restore: await readRestoreOutcome(),
      })),
  );
  messenger.onMessage('startNewSession', () => tracked(() => startNewSession(sessionDependencies())));
  messenger.onMessage('confirmManualState', () => tracked(() => confirmManualState(sessionDependencies())));
  messenger.onMessage('recordExternalBaseline', () => tracked(() => recordExternalBaseline(sessionDependencies())));
  messenger.onMessage(
    'verifyRestore',
    (): Promise<RestoreResult> => tracked(() => verifyRestore(sessionDependencies())),
  );
  messenger.onMessage('acceptRestore', () => tracked(() => acceptRestore(sessionDependencies())));
  messenger.onMessage('openAddonManager', () => openAddonManager());

  void deleteLegacyStorageKeys();
  void manualState.refresh();
}

/**
 * A candidate that is removed or re-versioned under a live session must pause it, and no
 * panel command may be needed for that to happen: the user installs or updates extensions
 * from the browser's own UI, so the background has to react on its own. The watcher only
 * reports the pausing changes, and `recordSnapshotPause` re-reads the log through the
 * serialized queue, so it cannot race a command already in flight.
 */
function watchForSnapshotChanges(tabs: TestTabSurface): void {
  const dependencies = { port: createManagementPort(), tabs };
  createSnapshotWatcher({
    dependencies,
    onChange: (changes) => {
      void recordSnapshotPause(dependencies, changes).catch(() => undefined);
    },
  });
}

/**
 * `runtime.onStartup` fires only for a real browser start, never for a service-worker
 * revival, which is exactly the distinction the Resume/Restore offer needs: a worker that
 * woke up to answer a message must not interrupt the user. Reconciliation itself is
 * derived on demand, so this only records that a start happened.
 */
async function recordBrowserStart(): Promise<void> {
  const log = await readBisectLog();
  const view = reduceLog(log);
  const needsAttention = view !== null && view.status !== 'restored' && view.originalEnabledIds.length > 0;
  if (!needsAttention) return;
  await raiseStartupSignal({ sessionId: log?.sessionId ?? null, eventCount: log?.events.length ?? 0 });
}

function watchForBrowserStart(): void {
  browser.runtime.onStartup.addListener(() => {
    void recordBrowserStart().catch(() => undefined);
  });
}

/**
 * The popup is gone, so Chrome's toolbar action has to open the panel itself. Firefox has no
 * `sidePanel` API and opens its generated `sidebar_action` from the sidebar menu instead.
 */
function openPanelOnActionClick(): void {
  if (import.meta.env.FIREFOX) return;
  void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => undefined);
}

export default defineBackground(() => {
  attachTestModeErrorLogging();
  registerBackgroundHandlers();
  openPanelOnActionClick();
  watchForSnapshotChanges(createTestTabSurface());
  watchForBrowserStart();
  console.info('[EXT_BG_READY]');
});
