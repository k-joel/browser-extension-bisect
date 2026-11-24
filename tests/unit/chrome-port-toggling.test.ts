import { describe, expect, it } from 'vitest';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { EnabledStateMap, TargetState } from '@/utils/bisect/domain';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

function setup(
  installs: { id: string; name: string; enabled?: boolean }[],
  options: {
    setEnabledError?: (id: string, enabled: boolean) => Error | null;
  } = {},
) {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      ...installs.map((install) =>
        makeExtensionInfo({ id: install.id, name: install.name, enabled: install.enabled ?? true }),
      ),
      SELF,
    ],
    ...(options.setEnabledError === undefined ? {} : { setEnabledError: options.setEnabledError }),
  });
  return { surface, port: createChromePort({ management: surface }) };
}

function target(enabled: string[], disabled: string[]): TargetState {
  return { enabled, disabled, allOutsideSuspectsEnabled: true };
}

describe('chrome applyTargetState', () => {
  it('disables every candidate for an all-off baseline', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha' },
      { id: 'bbbb', name: 'Bravo' },
    ]);

    const result = await port.applyTargetState(target([], ['aaaa', 'bbbb']));

    expect(result.ok).toBe(true);
    expect(result.applied.sort()).toEqual(['aaaa', 'bbbb']);
    expect(result.errors).toEqual([]);
    expect(surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: false },
      { id: 'bbbb', enabled: false },
    ]);
  });

  it('toggles only what changed', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: true },
      { id: 'bbbb', name: 'Bravo', enabled: false },
    ]);

    const result = await port.applyTargetState(target(['aaaa'], ['bbbb']));

    expect(result.applied).toEqual([]);
    expect(surface.setEnabledCalls).toEqual([]);
  });

  it('toggles exactly the diff and leaves untouched extensions alone', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: true },
      { id: 'bbbb', name: 'Bravo', enabled: true },
      { id: 'cccc', name: 'Charlie', enabled: false },
    ]);

    const result = await port.applyTargetState(target(['cccc'], ['bbbb']));

    expect([...result.applied].sort()).toEqual(['bbbb', 'cccc']);
    expect(surface.setEnabledCalls).toHaveLength(2);
    expect(surface.setEnabledCalls).toContainEqual({ id: 'bbbb', enabled: false });
    expect(surface.setEnabledCalls).toContainEqual({ id: 'cccc', enabled: true });
    expect(surface.setEnabledCalls.map((call) => call.id)).not.toContain('aaaa');
  });

  it('collects a per-id error and keeps applying the rest', async () => {
    const { surface, port } = setup(
      [
        { id: 'aaaa', name: 'Alpha' },
        { id: 'bbbb', name: 'Bravo' },
      ],
      {
        setEnabledError: (id) => (id === 'aaaa' ? new Error('ExtensionMayModifySettings failed') : null),
      },
    );

    const result = await port.applyTargetState(target([], ['aaaa', 'bbbb']));

    expect(result.ok).toBe(false);
    expect(result.applied).toEqual(['bbbb']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ extensionId: 'aaaa' });
    expect(surface.setEnabledCalls.map((call) => call.id)).toEqual(['aaaa', 'bbbb']);
  });

  it('maps an unrecognized failure to a generic mapped error and keeps the message', async () => {
    const { port } = setup([{ id: 'aaaa', name: 'Alpha' }], {
      setEnabledError: () => new Error('something unexpected'),
    });

    const result = await port.applyTargetState(target([], ['aaaa']));

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatchObject({ extensionId: 'aaaa', message: expect.stringContaining('unexpected') });
    expect(result.errors[0]?.code).toBe('unsupported-requirements');
  });

  it('is idempotent: a second identical apply performs no toggles', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha' },
      { id: 'bbbb', name: 'Bravo' },
    ]);

    await port.applyTargetState(target([], ['aaaa', 'bbbb']));
    surface.setEnabledCalls.length = 0;
    const second = await port.applyTargetState(target([], ['aaaa', 'bbbb']));

    expect(second.applied).toEqual([]);
    expect(surface.setEnabledCalls).toEqual([]);
  });
});

describe('chrome verifyState', () => {
  it('reports inSync when the actual state matches the target', async () => {
    const { port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: false },
      { id: 'bbbb', name: 'Bravo', enabled: true },
    ]);

    const report = await port.verifyState(target(['bbbb'], ['aaaa']));

    expect(report.inSync).toBe(true);
    expect(report.pendingManualToggles).toEqual([]);
    expect(report.unexpectedToggles).toEqual([]);
    expect(report.missingIds).toEqual([]);
    expect(report.expected).toEqual({ aaaa: false, bbbb: true });
    expect(report.actual).toEqual({ aaaa: false, bbbb: true });
  });

  it('reports a pending toggle when an extension did not reach the target', async () => {
    const { port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: true },
      { id: 'bbbb', name: 'Bravo', enabled: true },
    ]);

    const report = await port.verifyState(target(['bbbb'], ['aaaa']));

    expect(report.inSync).toBe(false);
    expect(report.pendingManualToggles).toEqual(['aaaa']);
    expect(report.expected).toEqual({ aaaa: false, bbbb: true });
    expect(report.actual).toEqual({ aaaa: true, bbbb: true });
  });

  it('is not thrown off by a disabled extension outside the target set', async () => {
    const { port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: false },
      { id: 'cccc', name: 'Charlie', enabled: false },
    ]);

    const report = await port.verifyState(target([], ['aaaa']));

    expect(report.inSync).toBe(true);
    expect(report.expected).toEqual({ aaaa: false });
    expect(report.actual).toEqual({ aaaa: false });
  });

  it('reports a candidate that disappeared', async () => {
    const { port } = setup([{ id: 'aaaa', name: 'Alpha', enabled: false }]);

    const report = await port.verifyState(target([], ['aaaa', 'gone-id']));

    expect(report.inSync).toBe(false);
    expect(report.missingIds).toEqual(['gone-id']);
    expect(report.actual).toEqual({ aaaa: false });
  });
});

describe('chrome restore', () => {
  const ORIGINAL: EnabledStateMap = { aaaa: true, bbbb: true };

  it('re-enables only the candidates whose original state differs', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: false },
      { id: 'bbbb', name: 'Bravo', enabled: true },
    ]);

    const result = await port.restore(ORIGINAL);

    expect(result.complete).toBe(true);
    expect(result.restoredIds).toEqual(['aaaa']);
    expect(result.errors).toEqual([]);
    expect(surface.setEnabledCalls).toEqual([{ id: 'aaaa', enabled: true }]);
  });

  it('never touches an extension that is not in the original map', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: false },
      { id: 'dddd', name: 'Delta', enabled: false },
    ]);

    await port.restore(ORIGINAL);

    expect(surface.setEnabledCalls.map((call) => call.id)).toEqual(['aaaa']);
  });

  it('does nothing when the state already matches the original', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: true },
      { id: 'bbbb', name: 'Bravo', enabled: true },
    ]);

    const result = await port.restore(ORIGINAL);

    expect(result).toEqual({ restoredIds: [], manualIds: [], errors: [], complete: true });
    expect(surface.setEnabledCalls).toEqual([]);
  });

  it('reports a failed re-enable and never claims a complete restore', async () => {
    const { port } = setup(
      [
        { id: 'aaaa', name: 'Alpha', enabled: false },
        { id: 'bbbb', name: 'Bravo', enabled: false },
      ],
      {
        setEnabledError: (id) => (id === 'aaaa' ? new Error('kCannotReEnableGreylistedError') : null),
      },
    );

    const result = await port.restore(ORIGINAL);

    expect(result.complete).toBe(false);
    expect(result.restoredIds).toEqual(['bbbb']);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ extensionId: 'aaaa' });
  });

  it('lists a disappeared candidate in manualIds rather than claiming success', async () => {
    const { port } = setup([{ id: 'aaaa', name: 'Alpha', enabled: false }]);

    const result = await port.restore({ aaaa: true, ghost: true });

    expect(result.complete).toBe(false);
    expect(result.manualIds).toContain('ghost');
    expect(result.restoredIds).toEqual(['aaaa']);
  });

  it('is idempotent after a successful restore', async () => {
    const { surface, port } = setup([
      { id: 'aaaa', name: 'Alpha', enabled: false },
      { id: 'bbbb', name: 'Bravo', enabled: false },
    ]);

    await port.restore(ORIGINAL);
    surface.setEnabledCalls.length = 0;
    const second = await port.restore(ORIGINAL);

    expect(second.complete).toBe(true);
    expect(second.restoredIds).toEqual([]);
    expect(surface.setEnabledCalls).toEqual([]);
  });
});
