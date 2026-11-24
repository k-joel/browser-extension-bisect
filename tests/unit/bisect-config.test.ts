import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  DEFAULT_BISECT_CONFIG,
  deleteLegacyStorageKeys,
  LEGACY_STORAGE_KEYS,
  normalizeBisectConfig,
  readBisectConfig,
  updateBisectConfig,
  watchBisectConfig,
} from '@/utils/bisect/config';

describe('bisect config', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('falls back to the versioned default when nothing is stored', async () => {
    await expect(readBisectConfig()).resolves.toEqual({
      schemaVersion: 1,
      excludedExtensionIds: [],
      testTab: null,
    });
  });

  it('keeps the fallback object shareable but never hands out the shared instance', async () => {
    const first = await readBisectConfig();
    first.excludedExtensionIds.push('mutated-by-caller');

    expect(await readBisectConfig()).toEqual(DEFAULT_BISECT_CONFIG);
    expect(DEFAULT_BISECT_CONFIG.excludedExtensionIds).toEqual([]);
  });

  it('persists an update under local:bisectConfig and returns the stored shape', async () => {
    const next = await updateBisectConfig({ excludedExtensionIds: ['aaaa', 'bbbb'] });

    expect(next).toEqual({ schemaVersion: 1, excludedExtensionIds: ['aaaa', 'bbbb'], testTab: null });
    expect(await fakeBrowser.storage.local.get('bisectConfig')).toEqual({
      bisectConfig: { schemaVersion: 1, excludedExtensionIds: ['aaaa', 'bbbb'], testTab: null },
    });
    await expect(readBisectConfig()).resolves.toEqual(next);
  });

  it('preserves fields that an update does not mention', async () => {
    await updateBisectConfig({ testTab: { tabId: 7, url: null } });
    const next = await updateBisectConfig({ excludedExtensionIds: ['cccc'] });

    expect(next.testTab).toEqual({ tabId: 7, url: null });
    expect(next.excludedExtensionIds).toEqual(['cccc']);
  });

  it('ignores a schema version supplied by the caller', async () => {
    const next = await updateBisectConfig({ schemaVersion: 9 } as unknown as { excludedExtensionIds: string[] });

    expect(next.schemaVersion).toBe(1);
  });

  it('repairs a stored value that is missing required fields', async () => {
    await fakeBrowser.storage.local.set({ bisectConfig: { excludedExtensionIds: null } });

    await expect(readBisectConfig()).resolves.toEqual({
      schemaVersion: 1,
      excludedExtensionIds: [],
      testTab: null,
    });
  });

  it('drops duplicate and blank excluded ids', () => {
    expect(
      normalizeBisectConfig({ schemaVersion: 1, excludedExtensionIds: ['a', 'a', '', 'b'], testTab: null }),
    ).toEqual({ schemaVersion: 1, excludedExtensionIds: ['a', 'b'], testTab: null });
  });

  it('notifies watchers when the config changes', async () => {
    const observed: string[][] = [];
    const unwatch = watchBisectConfig((config) => observed.push(config.excludedExtensionIds));

    await updateBisectConfig({ excludedExtensionIds: ['dddd'] });
    unwatch();

    expect(observed).toEqual([['dddd']]);
  });

  it('deletes every legacy scaffold key on first start', async () => {
    await fakeBrowser.storage.local.set({
      enabled: false,
      interactionCount: 4,
      settings: { batchSize: 3, enabledExtensions: ['aaaa'] },
      bisectConfig: DEFAULT_BISECT_CONFIG,
    });

    await deleteLegacyStorageKeys();

    const stored = await fakeBrowser.storage.local.get(null);
    for (const key of LEGACY_STORAGE_KEYS) {
      expect(key.startsWith('local:')).toBe(true);
      expect(stored).not.toHaveProperty(key.slice('local:'.length));
    }
    expect(stored.bisectConfig).toEqual(DEFAULT_BISECT_CONFIG);
  });

  it('leaves no legacy keys behind when they were never written', async () => {
    await expect(deleteLegacyStorageKeys()).resolves.toBeUndefined();
    await expect(fakeBrowser.storage.local.get(null)).resolves.toEqual({});
  });
});
