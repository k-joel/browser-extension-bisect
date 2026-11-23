import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { messenger } from '@/utils/messaging';
import { applyStateUpdate, readState, recordInteraction } from '@/utils/state';
import { enabledItem, interactionCountItem, settingsItem } from '@/utils/storage';
import { installMessagingBridge } from './helpers/messaging-bridge';

describe('state helpers', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('reads fallback state when nothing is stored', async () => {
    await expect(readState()).resolves.toEqual({
      enabled: true,
      interactionCount: 0,
      settings: { batchSize: 1, enabledExtensions: [] },
    });
  });

  it('applies an enabled toggle without touching other fields', async () => {
    const next = await applyStateUpdate({ enabled: false });
    expect(next.enabled).toBe(false);
    expect(next.settings).toEqual({ batchSize: 1, enabledExtensions: [] });
    expect(await enabledItem.getValue()).toBe(false);
  });

  it('applies settings changes and persists them', async () => {
    const next = await applyStateUpdate({ batchSize: 4, enabledExtensions: ['a'] });
    expect(next.settings).toEqual({ batchSize: 4, enabledExtensions: ['a'] });
    expect(await settingsItem.getValue()).toEqual({ batchSize: 4, enabledExtensions: ['a'] });
  });

  it('records interactions incrementally', async () => {
    const first = await recordInteraction();
    const second = await recordInteraction();
    expect(first.interactionCount).toBe(1);
    expect(second.interactionCount).toBe(2);
    expect(await interactionCountItem.getValue()).toBe(2);
  });
});

describe('message protocol', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('round-trips getState through the messenger', async () => {
    messenger.onMessage('getState', () => readState());
    const state = await messenger.sendMessage('getState');
    expect(state.enabled).toBe(true);
    expect(state.interactionCount).toBe(0);
  });

  it('round-trips updateState and mutates storage', async () => {
    messenger.onMessage('updateState', ({ data }) => applyStateUpdate(data));
    const state = await messenger.sendMessage('updateState', { enabled: false, batchSize: 3 });
    expect(state.enabled).toBe(false);
    expect(state.settings.batchSize).toBe(3);
    expect(await enabledItem.getValue()).toBe(false);
  });

  it('round-trips recordInteraction and increments the counter', async () => {
    messenger.onMessage('recordInteraction', () => recordInteraction());
    const state = await messenger.sendMessage('recordInteraction');
    expect(state.interactionCount).toBe(1);
    expect(await interactionCountItem.getValue()).toBe(1);
  });
});
