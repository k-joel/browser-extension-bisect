import { describe, expect, it, vi } from 'vitest';
import type { EnabledStateMap, TargetState } from '@/utils/bisect/domain';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

function target(enabled: string[], disabled: string[]): TargetState {
  return { enabled, disabled, allOutsideSuspectsEnabled: true };
}

function allOff(ids: string[]): TargetState {
  return target([], ids);
}

function assisted(options: { enabled?: Record<string, boolean>; debounceMs?: number } = {}) {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: options.enabled?.aaaa ?? true }),
      makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: options.enabled?.bbbb ?? true }),
      makeExtensionInfo({ id: 'cccc', name: 'Charlie', enabled: options.enabled?.cccc ?? true }),
      SELF,
    ],
  });
  const port = createFirefoxPort({
    management: surface,
    debounceMs: options.debounceMs ?? 10,
  });
  return { surface, port };
}

function policyInstalled(options: { setEnabledError?: (id: string, enabled: boolean) => Error | null } = {}) {
  const policySelf = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect', installType: 'admin' });
  const surface = createFakeManagement({
    self: policySelf,
    extensions: [
      makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
      makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
      policySelf,
    ],
    ...(options.setEnabledError === undefined ? {} : { setEnabledError: options.setEnabledError }),
  });
  return { surface, port: createFirefoxPort({ management: surface, debounceMs: 10 }) };
}

describe('firefox assisted capability routing', () => {
  it('reports assisted mode and mutates nothing before the user acts', async () => {
    const { surface, port } = assisted();

    const capability = await port.getCapabilities();

    expect(capability).toEqual({
      browserName: 'firefox',
      canAutoToggle: false,
      selfInstallType: 'normal',
      sideSurface: 'sidebar',
    });
    expect(surface.setEnabledCalls).toEqual([]);
  });

  it('treats only an enterprise-policy install as auto-toggleable', async () => {
    const { port } = policyInstalled();

    await expect(port.getCapabilities()).resolves.toMatchObject({ canAutoToggle: true, selfInstallType: 'admin' });
  });
});

describe('firefox assisted applyTargetState', () => {
  it('returns the manual batch and mutates nothing', async () => {
    const { surface, port } = assisted();

    const result = await port.applyTargetState(allOff(['aaaa', 'bbbb', 'cccc']));

    expect(result).toEqual({ enableIds: [], disableIds: ['aaaa', 'bbbb', 'cccc'] });
    expect(surface.setEnabledCalls).toEqual([]);
    await expect(surface.getAll()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'aaaa', enabled: true })]),
    );
  });

  it('lists only the ids that still have to move', async () => {
    const { port } = assisted({ enabled: { aaaa: false, bbbb: true, cccc: false } });

    const result = await port.applyTargetState(target(['aaaa', 'cccc'], ['bbbb']));

    expect(result).toEqual({ enableIds: ['aaaa', 'cccc'], disableIds: ['bbbb'] });
  });

  it('returns an empty batch when the manual state already matches', async () => {
    const { port } = assisted({ enabled: { aaaa: false, bbbb: false, cccc: true } });

    const result = await port.applyTargetState(target(['cccc'], ['aaaa', 'bbbb']));

    expect(result).toEqual({ enableIds: [], disableIds: [] });
  });

  it('skips a candidate that disappeared instead of asking the user to toggle it', async () => {
    const { port } = assisted();

    const result = await port.applyTargetState(allOff(['aaaa', 'ghost']));

    expect(result).toEqual({ enableIds: [], disableIds: ['aaaa'] });
  });

  it('uses the automated diff when the add-on is policy-installed', async () => {
    const { surface, port } = policyInstalled();

    const result = await port.applyTargetState(allOff(['aaaa', 'bbbb']));

    expect(result).toMatchObject({ applied: ['aaaa', 'bbbb'], errors: [], ok: true });
    expect(surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: false },
      { id: 'bbbb', enabled: false },
    ]);
  });

  it('keeps the per-id error path for a policy install', async () => {
    const { port } = policyInstalled({
      setEnabledError: (id) => (id === 'aaaa' ? new Error('blocked by policy') : null),
    });

    const result = await port.applyTargetState(allOff(['aaaa', 'bbbb']));

    expect(result).toMatchObject({ applied: ['bbbb'], ok: false });
    expect((result as { errors: { extensionId: string }[] }).errors[0]).toMatchObject({ extensionId: 'aaaa' });
  });
});

describe('firefox assisted verifyState', () => {
  it('reports an in-sync manual state once the user applied the batch', async () => {
    const { port } = assisted({ enabled: { aaaa: false, bbbb: false, cccc: true } });

    const report = await port.verifyState(target(['cccc'], ['aaaa', 'bbbb']));

    expect(report.inSync).toBe(true);
    expect(report.pendingManualToggles).toEqual([]);
    expect(report.unexpectedToggles).toEqual([]);
    expect(report.expected).toEqual({ cccc: true, aaaa: false, bbbb: false });
    expect(report.actual).toEqual({ cccc: true, aaaa: false, bbbb: false });
  });

  it('reports a still-pending manual toggle as pending rather than unexpected', async () => {
    const { port } = assisted();

    await port.applyTargetState(allOff(['aaaa', 'bbbb']));
    const report = await port.verifyState(allOff(['aaaa', 'bbbb']));

    expect(report.inSync).toBe(false);
    expect(report.pendingManualToggles).toEqual(['aaaa', 'bbbb']);
    expect(report.unexpectedToggles).toEqual([]);
  });

  it('reports an unrequested mismatch as an unexpected toggle', async () => {
    const { port } = assisted();

    const report = await port.verifyState(allOff(['aaaa', 'bbbb']));

    expect(report.inSync).toBe(false);
    expect(report.pendingManualToggles).toEqual([]);
    expect(report.unexpectedToggles).toEqual(['aaaa', 'bbbb']);
  });

  it('stops reporting a toggle as pending once the user applied it', async () => {
    const { surface, port } = assisted();

    await port.applyTargetState(allOff(['aaaa', 'bbbb']));
    await surface.setEnabled('aaaa', false);

    const report = await port.verifyState(allOff(['aaaa', 'bbbb']));

    expect(report.pendingManualToggles).toEqual(['bbbb']);
    expect(report.actual).toEqual({ aaaa: false, bbbb: true });
  });

  it('reports a disappeared candidate as missing', async () => {
    const { port } = assisted();

    const report = await port.verifyState(allOff(['aaaa', 'ghost']));

    expect(report.missingIds).toEqual(['ghost']);
    expect(report.inSync).toBe(false);
  });
});

describe('firefox assisted watchEvents', () => {
  it('subscribes to onEnabled and onDisabled and reports them', async () => {
    vi.useFakeTimers();
    try {
      const { surface, port } = assisted({ debounceMs: 10 });
      const events: { type: string; extensionId: string }[] = [];
      const stop = port.watchEvents((event) => events.push(event));

      surface.emitDisabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: false }));
      surface.emitEnabled(makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: true }));
      vi.advanceTimersByTime(50);

      expect(events).toEqual([{ type: 'enabled', extensionId: 'bbbb', name: 'Bravo' }]);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('debounces a burst of management events into one re-verify signal', async () => {
    vi.useFakeTimers();
    try {
      const { surface, port } = assisted({ debounceMs: 50 });
      const events: string[] = [];
      port.watchEvents((event) => events.push(event.extensionId));

      surface.emitDisabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: false }));
      vi.advanceTimersByTime(10);
      surface.emitDisabled(makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: false }));
      vi.advanceTimersByTime(10);
      surface.emitDisabled(makeExtensionInfo({ id: 'cccc', name: 'Charlie', enabled: false }));

      expect(events).toEqual([]);
      vi.advanceTimersByTime(60);
      expect(events).toEqual(['cccc']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('unsubscribes from every management event on teardown', async () => {
    const { surface, port } = assisted({ debounceMs: 10 });
    const events: string[] = [];
    const stop = port.watchEvents((event) => events.push(event.type));

    stop();
    surface.emitDisabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha', enabled: false }));

    expect(events).toEqual([]);
  });

  it('reports install and uninstall events as well', async () => {
    vi.useFakeTimers();
    try {
      const { surface, port } = assisted({ debounceMs: 5 });
      const events: string[] = [];
      port.watchEvents((event) => events.push(event.type));

      surface.emitUninstalled('aaaa');
      vi.advanceTimersByTime(20);

      expect(events).toEqual(['uninstalled']);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('firefox assisted restore', () => {
  const ORIGINAL: EnabledStateMap = { aaaa: true, bbbb: true };

  it('returns a manual checklist for everything still off', async () => {
    const { surface, port } = assisted({ enabled: { aaaa: false, bbbb: true } });

    const result = await port.restore(ORIGINAL);

    expect(result).toMatchObject({ restoredIds: ['bbbb'], manualIds: ['aaaa'], errors: [], complete: false });
    expect(surface.setEnabledCalls).toEqual([]);
  });

  it('verifies completion once the user re-enabled everything', async () => {
    const { port } = assisted({ enabled: { aaaa: true, bbbb: true } });

    const result = await port.restore(ORIGINAL);

    expect(result).toMatchObject({ restoredIds: ['aaaa', 'bbbb'], manualIds: [], complete: true });
  });

  it('reports an incomplete restore when one candidate is still off', async () => {
    const { port } = assisted({ enabled: { aaaa: true, bbbb: false } });

    const result = await port.restore(ORIGINAL);

    expect(result.complete).toBe(false);
    expect(result.manualIds).toEqual(['bbbb']);
  });

  it('reports a disappeared candidate instead of claiming success', async () => {
    const { port } = assisted({ enabled: { aaaa: true } });

    const result = await port.restore({ aaaa: true, ghost: true });

    expect(result.complete).toBe(false);
    expect(result.manualIds).toEqual([]);
    expect(result.errors).toEqual([expect.objectContaining({ extensionId: 'ghost', code: 'extension-removed' })]);
  });

  it('uses the automated restore for a policy install', async () => {
    const { surface, port } = policyInstalled();
    await surface.setEnabled('aaaa', false);

    const result = await port.restore({ aaaa: true });

    expect(result).toMatchObject({ complete: true, restoredIds: ['aaaa'] });
    expect(surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: false },
      { id: 'aaaa', enabled: true },
    ]);
  });
});
