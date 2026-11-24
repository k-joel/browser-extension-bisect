import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import { createChromePort } from '@/utils/bisect/chrome-port';
import { DEFAULT_BISECT_CONFIG, readBisectConfig, updateBisectConfig } from '@/utils/bisect/config';
import type { ManagementPort } from '@/utils/bisect/domain';
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
