import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  BISECT_SETTINGS_DEFAULTS,
  createNextSettings,
  enabledItem,
  formatStatus,
  incrementInteractionCount,
  interactionCountItem,
  settingsItem,
} from '@/utils/storage';

describe('storage items', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('returns fallbacks for unset items', async () => {
    await expect(enabledItem.getValue()).resolves.toBe(true);
    await expect(interactionCountItem.getValue()).resolves.toBe(0);
    await expect(settingsItem.getValue()).resolves.toEqual(BISECT_SETTINGS_DEFAULTS);
  });

  it('persists values written to browser storage', async () => {
    await enabledItem.setValue(false);
    await interactionCountItem.setValue(7);
    await settingsItem.setValue({ batchSize: 5, enabledExtensions: ['a', 'b'] });

    expect(await enabledItem.getValue()).toBe(false);
    expect(await interactionCountItem.getValue()).toBe(7);
    expect(await settingsItem.getValue()).toEqual({ batchSize: 5, enabledExtensions: ['a', 'b'] });
    expect(await fakeBrowser.storage.local.get('enabled')).toEqual({ enabled: false });
  });

  it('notifies watchers when a value changes', async () => {
    const observed: boolean[] = [];
    const unwatch = enabledItem.watch((next) => observed.push(next));

    await enabledItem.setValue(false);

    unwatch();
    expect(observed).toEqual([false]);
  });
});

describe('storage helpers', () => {
  it('merges settings changes without dropping existing fields', () => {
    const next = createNextSettings({ batchSize: 2, enabledExtensions: ['x'] }, { batchSize: 8 });
    expect(next).toEqual({ batchSize: 8, enabledExtensions: ['x'] });
  });

  it('formats a deterministic status string', () => {
    expect(formatStatus(true, 3)).toBe('enabled (3 interactions)');
    expect(formatStatus(false, 0)).toBe('disabled (0 interactions)');
  });

  it('increments interaction counts defensively', () => {
    expect(incrementInteractionCount(0)).toBe(1);
    expect(incrementInteractionCount(4)).toBe(5);
    expect(incrementInteractionCount(Number.NaN)).toBe(1);
    expect(incrementInteractionCount(-2)).toBe(1);
  });
});
