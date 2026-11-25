import { describe, expect, it } from 'vitest';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { TargetState } from '@/utils/bisect/domain';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

/**
 * Trial 1 of the documented `N = 24` trace, shrunk to four candidates. `aaaa` and
 * `bbbb` are the enabled half, `cccc` the disabled tail, and `dddd` is already
 * cleared: it is not in the partition but must stay enabled.
 */
const CLEARED = 'dddd';

function target(overrides: Partial<TargetState> = {}): TargetState {
  return {
    enabled: ['aaaa', 'bbbb'],
    disabled: ['cccc'],
    allOutsideSuspectsEnabled: true,
    outsideTrialIds: [CLEARED],
    ...overrides,
  };
}

interface Drift {
  aaaa?: boolean;
  bbbb?: boolean;
  cccc?: boolean;
  dddd?: boolean;
}

function installs(drift: Drift = {}) {
  return [
    { id: 'aaaa', enabled: drift.aaaa ?? true },
    { id: 'bbbb', enabled: drift.bbbb ?? true },
    { id: 'cccc', enabled: drift.cccc ?? false },
    { id: CLEARED, enabled: drift.dddd ?? true },
  ].map((entry) => makeExtensionInfo({ id: entry.id, name: entry.id.toUpperCase(), enabled: entry.enabled }));
}

function chromePort(drift: Drift = {}) {
  const surface = createFakeManagement({ self: SELF, extensions: [...installs(drift), SELF] });
  return { surface, port: createChromePort({ management: surface }) };
}

function firefoxPort(drift: Drift = {}) {
  const surface = createFakeManagement({ self: SELF, extensions: [...installs(drift), SELF] });
  return { surface, port: createFirefoxPort({ management: surface, debounceMs: 5 }) };
}

const ADAPTERS = [
  { name: 'chrome', create: chromePort, assisted: false },
  { name: 'firefox', create: firefoxPort, assisted: true },
] as const;

/**
 * The automated adapter asked for every change in the target, so a mismatch inside the
 * trial is always a toggle still to come. The assisted adapter asked only for the
 * residual diff it handed the user, so an in-trial mismatch it never requested is
 * unexpected rather than pending. Both report the same shape and the same categories.
 */
function inTrialCategory(assisted: boolean): 'pendingManualToggles' | 'unexpectedToggles' {
  return assisted ? 'unexpectedToggles' : 'pendingManualToggles';
}

describe.each(ADAPTERS)('$name drift categories', ({ create, assisted }) => {
  it('reports every category as empty when the target matches', async () => {
    const { port } = create();

    const report = await port.verifyState(target());

    expect(report.inSync).toBe(true);
    expect(report.pendingManualToggles).toEqual([]);
    expect(report.unexpectedToggles).toEqual([]);
    expect(report.missingIds).toEqual([]);
    expect(report.expected).toEqual({ aaaa: true, bbbb: true, cccc: false, [CLEARED]: true });
    expect(report.actual).toEqual({ aaaa: true, bbbb: true, cccc: false, [CLEARED]: true });
  });

  it('reports a candidate that missed its target state in an in-trial category', async () => {
    const { port } = create({ cccc: true });

    const report = await port.verifyState(target());

    expect(report.inSync).toBe(false);
    expect(report[inTrialCategory(assisted)]).toEqual(['cccc']);
    expect(report.missingIds).toEqual([]);
    expect(report.actual).toEqual({ aaaa: true, bbbb: true, cccc: true, [CLEARED]: true });
  });

  it('reports a toggle on a cleared candidate as unexpected', async () => {
    const { port } = create({ dddd: false });

    const report = await port.verifyState(target());

    expect(report.inSync).toBe(false);
    expect(report.unexpectedToggles).toEqual([CLEARED]);
    expect(report.pendingManualToggles).toEqual([]);
    expect(report.actual[CLEARED]).toBe(false);
  });

  it('reports a disappeared candidate as missing, without inventing a toggle', async () => {
    const { surface, port } = create();
    surface.removeExtension('cccc');

    const report = await port.verifyState(target());

    expect(report.inSync).toBe(false);
    expect(report.missingIds).toEqual(['cccc']);
    expect(report.pendingManualToggles).toEqual([]);
    expect(report.unexpectedToggles).toEqual([]);
    expect(report.actual).not.toHaveProperty('cccc');
  });

  it('reports an in-trial mismatch, an unexpected toggle, and a missing candidate together', async () => {
    const { surface, port } = create({ cccc: true, dddd: false });
    surface.removeExtension('aaaa');

    const report = await port.verifyState(target());

    expect(report).toMatchObject({ missingIds: ['aaaa'], inSync: false });
    expect(report.unexpectedToggles).toContain(CLEARED);
    expect(report[inTrialCategory(assisted)]).toContain('cccc');
  });

  it('ignores a candidate the trial never claimed a state for', async () => {
    const { port } = create({ dddd: false });

    const report = await port.verifyState(target({ outsideTrialIds: [] }));

    expect(report.expected).toEqual({ aaaa: true, bbbb: true, cccc: false });
    expect(report.inSync).toBe(true);
  });

  it('keeps the reported map scoped to the trial and the cleared candidates', async () => {
    const { port } = create();

    const report = await port.verifyState(target());

    expect(Object.keys(report.expected).sort()).toEqual(['aaaa', 'bbbb', 'cccc', CLEARED]);
    expect(Object.keys(report.actual).sort()).toEqual(['aaaa', 'bbbb', 'cccc', CLEARED]);
  });
});

describe('firefox assisted drift after a requested batch', () => {
  it('reports the batch it asked for as pending until the user applies it', async () => {
    const { port } = firefoxPort({ aaaa: false, bbbb: false, cccc: true });

    await port.applyTargetState(target());
    const report = await port.verifyState(target());

    expect(report.pendingManualToggles.sort()).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(report.unexpectedToggles).toEqual([]);
  });

  it('stops reporting a pending toggle once the user applied it', async () => {
    const { surface, port } = firefoxPort({ aaaa: false, bbbb: false, cccc: true });
    await port.applyTargetState(target());

    await surface.setEnabled('aaaa', true);
    const report = await port.verifyState(target());

    expect(report.pendingManualToggles.sort()).toEqual(['bbbb', 'cccc']);
  });
});
