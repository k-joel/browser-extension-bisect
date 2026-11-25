import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import { createChromePort } from '@/utils/bisect/chrome-port';
import { DEFAULT_BISECT_CONFIG, readBisectConfig, updateBisectConfig } from '@/utils/bisect/config';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

function registerPort(port: ManagementPort): void {
  registerBackgroundHandlers({ managementPort: port });
}

function defaultPort(): ManagementPort {
  return createChromePort({
    management: createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha', version: '1.2.3' }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: false }),
        makeExtensionInfo({ id: 'theme-id', name: 'Midnight', type: 'theme' }),
        SELF,
      ],
    }),
  });
}

describe('bisect messaging protocol', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('round-trips getCapabilities', async () => {
    registerPort(defaultPort());

    const capability = await messenger.sendMessage('getCapabilities');

    expect(capability).toEqual({
      browserName: 'chrome',
      canAutoToggle: true,
      selfInstallType: 'normal',
      sideSurface: 'side-panel',
    });
  });

  it('round-trips listCandidates with eligible and ineligible lists', async () => {
    registerPort(defaultPort());

    const lists = await messenger.sendMessage('listCandidates');

    expect(lists.eligible.map((candidate) => candidate.name)).toEqual(['Alpha']);
    expect(lists.ineligible.map((entry) => [entry.name, entry.reason])).toEqual([
      ['Bravo', 'disabled-at-start'],
      ['Browser Extension Bisect', 'self'],
      ['Midnight', 'theme-or-app'],
    ]);
  });

  it('round-trips getConfig returning the fallback', async () => {
    registerPort(defaultPort());

    await expect(messenger.sendMessage('getConfig')).resolves.toEqual(DEFAULT_BISECT_CONFIG);
  });

  it('round-trips updateConfig and persists through storage', async () => {
    registerPort(defaultPort());

    const updated = await messenger.sendMessage('updateConfig', { excludedExtensionIds: ['aaaa'] });

    expect(updated).toEqual({ schemaVersion: 1, excludedExtensionIds: ['aaaa'], testTab: null });
    await expect(readBisectConfig()).resolves.toEqual(updated);
  });

  it('keeps a user-excluded extension eligible on the next listing', async () => {
    registerPort(defaultPort());

    await messenger.sendMessage('updateConfig', { excludedExtensionIds: ['aaaa'] });
    const lists = await messenger.sendMessage('listCandidates');
    const config = await messenger.sendMessage('getConfig');

    expect(lists.eligible.map((candidate) => candidate.id)).toEqual(['aaaa']);
    expect(lists.ineligible).not.toContainEqual(expect.objectContaining({ id: 'aaaa' }));
    expect(config.excludedExtensionIds).toEqual(['aaaa']);
  });

  it('serializes concurrent config updates without losing a field', async () => {
    registerPort(defaultPort());

    await Promise.all([
      messenger.sendMessage('updateConfig', { excludedExtensionIds: ['aaaa'] }),
      messenger.sendMessage('updateConfig', { testTab: { tabId: 3, url: null } }),
    ]);

    const config = await readBisectConfig();
    expect(config.excludedExtensionIds).toEqual(['aaaa']);
    expect(config.testTab).toEqual({ tabId: 3, url: null });
  });

  it('keeps the config writer inside the background', async () => {
    registerPort(defaultPort());

    await updateBisectConfig({ excludedExtensionIds: ['seed'] });
    const config = await messenger.sendMessage('getConfig');

    expect(config.excludedExtensionIds).toEqual(['seed']);
  });
});

describe('background startup', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('deletes legacy scaffold keys when the handlers are registered', async () => {
    await fakeBrowser.storage.local.set({
      enabled: false,
      interactionCount: 5,
      settings: { batchSize: 2, enabledExtensions: [] },
    });

    registerPort(defaultPort());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const stored = await fakeBrowser.storage.local.get(null);
    expect(stored).not.toHaveProperty('enabled');
    expect(stored).not.toHaveProperty('interactionCount');
    expect(stored).not.toHaveProperty('settings');
  });
});

describe('session messaging protocol', () => {
  const reloads: number[] = [];

  function registerSessionHandlers(port: ManagementPort = defaultPort()): void {
    registerBackgroundHandlers({
      managementPort: port,
      tabs: {
        reload: async (tabId: number) => {
          reloads.push(tabId);
        },
        waitForComplete: async () => true,
      },
    });
  }

  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    reloads.length = 0;
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('returns null from getSession before any session exists', async () => {
    registerSessionHandlers();

    await expect(messenger.sendMessage('getSession')).resolves.toBeNull();
  });

  it('returns null from getLog before any session exists', async () => {
    registerSessionHandlers();

    await expect(messenger.sendMessage('getLog')).resolves.toBeNull();
  });

  it('round-trips getLog with exactly the persisted log', async () => {
    registerSessionHandlers();
    await messenger.sendMessage('startSession', {
      candidateIds: ['aaaa'],
      baselineMode: 'auto',
      testTab: { tabId: 12, url: null },
    });

    const log = await messenger.sendMessage('getLog');

    await expect(readBisectLog()).resolves.toEqual(log);
    expect(log?.sessionId).toEqual(expect.any(String));
    expect(log?.events.map((event) => event.type)).toEqual(['session-started', 'trial-started', 'trial-applied']);
  });

  it('getLog observes a verdict appended after it, so the copy is never stale', async () => {
    registerSessionHandlers();
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });
    const before = await messenger.sendMessage('getLog');

    await messenger.sendMessage('submitVerdict', { verdict: 'gone' });
    const after = await messenger.sendMessage('getLog');

    expect(before?.events.at(-1)?.type).toBe('trial-applied');
    expect(after?.events.length).toBe((before?.events.length ?? 0) + 2);
  });

  it('starts a session and returns the derived view over the wire', async () => {
    registerSessionHandlers();

    const view = await messenger.sendMessage('startSession', {
      candidateIds: ['aaaa'],
      baselineMode: 'auto',
      testTab: { tabId: 12, url: null },
    });

    expect(view.status).toBe('awaiting-verdict');
    expect(view.candidateOrder.map((candidate) => candidate.id)).toEqual(['aaaa']);
    expect(view.currentTrial?.round).toBe(0);
    expect(reloads).toEqual([12]);
  });

  it('round-trips getSession after startSession so a reloaded panel rehydrates', async () => {
    registerSessionHandlers();
    await messenger.sendMessage('startSession', {
      candidateIds: ['aaaa'],
      baselineMode: 'auto',
      testTab: null,
    });

    const rehydrated = await messenger.sendMessage('getSession');

    expect(rehydrated?.status).toBe('awaiting-verdict');
    expect(rehydrated?.originalEnabledIds).toEqual(['aaaa']);
  });

  it('returns the restore outcome alongside a host-issue verdict', async () => {
    registerSessionHandlers();
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });

    const result = await messenger.sendMessage('submitVerdict', { verdict: 'persists' });

    expect(result.session.status).toBe('aborted');
    expect(result.session.abortReason).toBe('host-issue');
    expect(result.restore).toEqual({ restored: true, errors: [], manualIds: [], declined: false });
  });

  it('returns a null restore outcome when the verdict appends no session-reset', async () => {
    registerSessionHandlers();
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });

    const result = await messenger.sendMessage('submitVerdict', { verdict: 'gone' });

    expect(result.session.status).toBe('completed');
    expect(result.restore).toBeNull();
  });

  it('round-trips resetSession and reports a declined restore as a null outcome', async () => {
    registerSessionHandlers();
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });

    const declined = await messenger.sendMessage('resetSession', { restore: false });

    expect(declined.session.status).toBe('restored');
    expect(declined.restore).toBeNull();
  });

  it('reports restore errors through the resetSession envelope', async () => {
    const port: ManagementPort = {
      ...defaultPort(),
      restore: async () => ({
        restoredIds: [],
        manualIds: [],
        errors: [{ extensionId: 'aaaa', code: 'manual-recovery-required', message: 'greylisted' }],
        complete: false,
      }),
    };
    registerSessionHandlers(port);
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });

    const result = await messenger.sendMessage('resetSession', { restore: true });

    expect(result.restore).toEqual({
      restored: false,
      errors: [{ extensionId: 'aaaa', code: 'manual-recovery-required', message: 'greylisted' }],
      manualIds: [],
      declined: false,
    });
    expect(result.session.status).toBe('restored');
  });

  it('binds a test tab from an explicit tab id and persists it', async () => {
    await fakeBrowser.windows.create({ focused: true });
    await fakeBrowser.tabs.create({ url: 'https://example.test/', active: true });
    registerSessionHandlers();

    const config = await messenger.sendMessage('bindTestTab', { tabId: 1 });

    expect(config.testTab).toEqual({ tabId: 1, url: 'https://example.test/' });
  });

  it('round-trips applyTrial and reloadTestTab', async () => {
    await fakeBrowser.windows.create({ focused: true });
    const tab = await fakeBrowser.tabs.create({ url: 'https://example.test/', active: true });
    registerSessionHandlers();
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });
    await messenger.sendMessage('bindTestTab', { tabId: tab.id });

    const applied = await messenger.sendMessage('applyTrial');
    const reloaded = await messenger.sendMessage('reloadTestTab');

    expect(applied.status).toBe('awaiting-verdict');
    expect(reloaded).toEqual({ ok: true });
    expect(reloads).toEqual([tab.id]);
  });

  it('round-trips acceptRestore as an explicit acceptance of the remaining differences', async () => {
    const port: ManagementPort = {
      ...defaultPort(),
      restore: async () => ({
        restoredIds: ['bbbb'],
        manualIds: ['aaaa'],
        errors: [],
        complete: false,
      }),
    };
    registerPort(port);
    await messenger.sendMessage('startSession', { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });

    const accepted = await messenger.sendMessage('acceptRestore');

    expect(accepted.status).toBe('restored');
    const log = await readBisectLog();
    expect(log?.events.at(-1)?.payload).toMatchObject({
      restored: false,
      manualIds: ['aaaa'],
      accepted: true,
    });
  });

  it('rejects a verdict when no session exists without leaving the panel stuck', async () => {
    registerSessionHandlers();

    await expect(messenger.sendMessage('submitVerdict', { verdict: 'gone' })).rejects.toThrow(/No active session/);
  });
});
