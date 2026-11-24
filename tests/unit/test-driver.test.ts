import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { TargetState } from '@/utils/bisect/domain';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import {
  installTestDriverGlobal,
  readTestDriverStore,
  resetTestDriverStore,
  setTestDriverEnabled,
  TEST_DRIVER_GLOBAL,
  type TestDriverGlobal,
  withTestDriverOverlay,
} from '@/utils/bisect/test-driver';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

function target(enabled: string[], disabled: string[]): TargetState {
  return { enabled, disabled, allOutsideSuspectsEnabled: true };
}

function harness() {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
      makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
      SELF,
    ],
  });
  return { surface, overlaid: withTestDriverOverlay(surface) };
}

describe('test-mode driver store', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('starts with no overrides', async () => {
    await expect(readTestDriverStore()).resolves.toEqual({ enabledById: {} });
  });

  it('records a manual toggle and reads it back', async () => {
    await setTestDriverEnabled('aaaa', false);

    await expect(readTestDriverStore()).resolves.toEqual({ enabledById: { aaaa: false } });
  });

  it('drops every override on reset so one scenario cannot leak into the next', async () => {
    await setTestDriverEnabled('aaaa', false);
    await setTestDriverEnabled('bbbb', false);

    await resetTestDriverStore();

    await expect(readTestDriverStore()).resolves.toEqual({ enabledById: {} });
  });

  it('ignores a corrupted stored value instead of throwing', async () => {
    await fakeBrowser.storage.local.set({ bisectTestDriver: { enabledById: { aaaa: 'no' } } });

    await expect(readTestDriverStore()).resolves.toEqual({ enabledById: {} });
  });
});

describe('test-mode driver overlay', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('reports the recorded manual state through getAll', async () => {
    const { overlaid } = harness();
    await setTestDriverEnabled('aaaa', false);

    const all = await overlaid.getAll();

    expect(all.find((info) => info.id === 'aaaa')?.enabled).toBe(false);
    expect(all.find((info) => info.id === 'bbbb')?.enabled).toBe(true);
  });

  it('leaves the underlying management readable state untouched', async () => {
    const { surface, overlaid } = harness();
    await setTestDriverEnabled('aaaa', false);

    await overlaid.getAll();

    await expect(surface.getAll()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'aaaa', enabled: true })]),
    );
    expect(surface.setEnabledCalls).toEqual([]);
  });

  it('passes a browser rejection straight through, so the overlay never fakes a toggle', async () => {
    const rejection = new Error('setEnabled can only be used for themes or by addons installed by enterprise policy');
    const surface = createFakeManagement({
      self: SELF,
      extensions: [makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }), SELF],
      setEnabledError: () => rejection,
    });
    const overlaid = withTestDriverOverlay(surface);

    await expect(overlaid.setEnabled('aaaa', false)).rejects.toThrow(rejection.message);
    await expect(readTestDriverStore()).resolves.toEqual({ enabledById: {} });
  });

  it('lets the assisted adapter observe a disabled candidate', async () => {
    const { overlaid } = harness();
    const port = createFirefoxPort({ management: overlaid, debounceMs: 5 });
    await setTestDriverEnabled('aaaa', false);

    const batch = await port.applyTargetState(target([], ['aaaa', 'bbbb']));

    expect(batch).toEqual({ enableIds: [], disableIds: ['bbbb'] });
    await expect(port.verifyState(target([], ['aaaa', 'bbbb']))).resolves.toMatchObject({
      pendingManualToggles: ['bbbb'],
    });
  });
});

describe('test-mode driver page global', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('publishes setEnabled, read and reset under one name', async () => {
    const scope: Record<string, unknown> = {};
    installTestDriverGlobal(scope);

    const driver = scope[TEST_DRIVER_GLOBAL] as TestDriverGlobal;
    await driver.setEnabled('aaaa', false);

    await expect(driver.read()).resolves.toEqual({ enabledById: { aaaa: false } });
    await driver.reset();
    await expect(driver.read()).resolves.toEqual({ enabledById: {} });
  });
});
