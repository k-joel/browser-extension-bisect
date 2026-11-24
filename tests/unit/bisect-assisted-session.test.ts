import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import {
  applyTrial,
  confirmManualState,
  recordExternalBaseline,
  resetSession,
  resetSessionQueue,
  type SessionDependencies,
  startSession,
  submitVerdict,
  verifyManualState,
  verifyRestore,
} from '@/utils/bisect/session';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

interface Install {
  id: string;
  name: string;
  enabled?: boolean;
}

interface Harness {
  port: ManagementPort;
  surface: FakeManagement;
  dependencies: SessionDependencies;
  reloads: number[];
}

function createHarness(installs: Install[]): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      ...installs.map((install) =>
        makeExtensionInfo({ id: install.id, name: install.name, enabled: install.enabled ?? true }),
      ),
      SELF,
    ],
  });
  const reloads: number[] = [];
  const dependencies: SessionDependencies = {
    port: createFirefoxPort({ management: surface, debounceMs: 5 }),
    tabs: {
      reload: async (tabId: number) => {
        reloads.push(tabId);
      },
      waitForComplete: async () => true,
    },
    now: () => 1_000,
    newSessionId: () => 'session-assisted',
  };
  return { port: dependencies.port, surface, dependencies, reloads };
}

const ALPHA = { id: 'aaaa', name: 'Alpha' };
const BRAVO = { id: 'bbbb', name: 'Bravo' };

/**
 * The user's own work in the Add-ons Manager. The fake management surface is the
 * only place a "manual" toggle can happen, because the adapter never mutates.
 */
async function userToggles(surface: FakeManagement, states: Record<string, boolean>): Promise<void> {
  for (const [id, enabled] of Object.entries(states)) {
    await surface.setEnabled(id, enabled);
  }
}

describe('assisted baseline start', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('parks the session in awaiting-manual-toggle and toggles nothing', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    const view = await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: { tabId: 5, url: null },
    });

    expect(view.status).toBe('awaiting-manual-toggle');
    expect(view.baselineMode).toBe('manual');
    expect(view.currentTrial?.manual).toBe(true);
    expect(view.currentTrial?.disabledIds).toEqual(['aaaa', 'bbbb']);
    expect(harness.surface.setEnabledCalls).toEqual([]);
    expect(harness.reloads).toEqual([]);
  });

  it('does not accept the baseline before the user applied the batch', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    const drift = await verifyManualState(harness.dependencies);
    expect(drift.inSync).toBe(false);
    expect(drift.pendingManualToggles).toEqual(['aaaa', 'bbbb']);

    await expect(confirmManualState(harness.dependencies)).rejects.toThrow(/does not match this batch yet/);
  });

  it('accepts the baseline and asks the question once every candidate is off', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    const confirmed = await confirmManualState(harness.dependencies);

    expect(confirmed.status).toBe('awaiting-verdict');
    expect(confirmed.currentTrial?.round).toBe(0);
    expect(confirmed.currentTrial?.verdict).toBeNull();
    expect(await verifyManualState(harness.dependencies)).toMatchObject({ inSync: true });
  });

  it('reports the manual state progress as a count of what is left', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    await userToggles(harness.surface, { aaaa: false });

    const drift = await verifyManualState(harness.dependencies);
    expect(drift.pendingManualToggles).toEqual(['bbbb']);
    expect(drift.actual).toEqual({ aaaa: false, bbbb: true });
  });

  it('records the manual mode on the baseline event', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);

    const view = await submitVerdict(harness.dependencies, { verdict: 'gone' });

    expect(view.status).toBe('awaiting-verdict');
    const log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual([
      'session-started',
      'trial-started',
      'trial-applied',
      'session-resumed',
      'baseline-recorded',
    ]);
    const baseline = log?.events.find((event) => event.type === 'baseline-recorded');
    expect(baseline?.payload).toEqual({ mode: 'manual', verdict: 'gone' });
  });
});

describe('assisted N = 0 and N = 1 outcomes', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('blocks N = 0 before anything is shown', async () => {
    const harness = createHarness([]);

    await expect(
      startSession(harness.dependencies, { candidateIds: [], baselineMode: 'manual', testTab: null }),
    ).rejects.toThrow(/No eligible enabled extensions/);
    await expect(readBisectLog()).resolves.toBeNull();
  });

  it('resolves N = 1 from the baseline and leaves the culprit disabled', async () => {
    const harness = createHarness([ALPHA]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false });
    await confirmManualState(harness.dependencies);

    const view = await submitVerdict(harness.dependencies, { verdict: 'gone' });

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('aaaa');
    expect(harness.surface.setEnabledCalls).toEqual([{ id: 'aaaa', enabled: false }]);
  });

  it('aborts as a host issue when the assisted baseline persists', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);

    const view = await submitVerdict(harness.dependencies, { verdict: 'persists' });

    expect(view.status).toBe('aborted');
    expect(view.abortReason).toBe('host-issue');
  });
});

describe('external baseline attestation', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('records external-clean without toggling anything and proceeds at full enabled state', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    const started = await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'external',
      testTab: null,
    });
    expect(started.status).toBe('baseline');
    expect(started.baselineMode).toBe('external');
    expect(started.currentTrial).toBeNull();
    expect(harness.surface.setEnabledCalls).toEqual([]);

    const attested = await recordExternalBaseline(harness.dependencies);

    expect(attested.status).toBe('awaiting-verdict');
    expect(attested.suspects).toEqual(['aaaa', 'bbbb']);
    const log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual(['session-started', 'baseline-recorded']);
    expect(log?.events.at(-1)?.payload).toEqual({ mode: 'external', verdict: 'gone' });
    expect(harness.surface.setEnabledCalls).toEqual([]);
    expect(harness.reloads).toEqual([]);
  });

  it('resolves N = 1 from the external attestation', async () => {
    const harness = createHarness([ALPHA]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa'],
      baselineMode: 'external',
      testTab: null,
    });

    const attested = await recordExternalBaseline(harness.dependencies);

    expect(attested.status).toBe('completed');
    expect(attested.culpritId).toBe('aaaa');
    expect(harness.surface.setEnabledCalls).toEqual([]);
  });

  it('refuses an external attestation once a trial has started', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    await expect(recordExternalBaseline(harness.dependencies)).rejects.toThrow(/Cannot record an external baseline/);
  });
});

describe('assisted restore', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('reports the original states as a manual checklist and never claims a false restore', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);
    await submitVerdict(harness.dependencies, { verdict: 'persists' });

    const reset = await resetSession(harness.dependencies, { restore: true });

    expect(reset.status).toBe('aborted');
    const log = await readBisectLog();
    const last = log?.events.at(-1);
    expect(last?.type).toBe('session-reset');
    expect(last?.payload).toMatchObject({ restored: false, manualIds: ['aaaa', 'bbbb'], errors: [] });
  });

  it('verifies restore completion once the user re-enabled the touched candidates', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);
    await submitVerdict(harness.dependencies, { verdict: 'persists' });

    const pending = await verifyRestore(harness.dependencies);
    expect(pending.complete).toBe(false);
    expect(pending.manualIds).toEqual(['aaaa', 'bbbb']);

    await userToggles(harness.surface, { aaaa: true, bbbb: true });
    const done = await verifyRestore(harness.dependencies);
    expect(done.complete).toBe(true);
    expect(done.restoredIds).toEqual(['aaaa', 'bbbb']);
  });

  it('reports a disappeared candidate as an error, not as a completed restore', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);
    await submitVerdict(harness.dependencies, { verdict: 'persists' });
    harness.surface.removeExtension('aaaa');
    harness.surface.emitUninstalled('aaaa');

    const reset = await resetSession(harness.dependencies, { restore: true });

    const log = await readBisectLog();
    const last = log?.events.at(-1);
    expect(last?.payload).toMatchObject({ restored: false });
    const errors = (last?.payload as { errors: { extensionId: string }[] } | undefined)?.errors ?? [];
    expect(errors[0]).toMatchObject({ extensionId: 'aaaa' });
    expect(reset.status).toBe('aborted');
  });
});

describe('assisted trial apply', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('asks for the next manual batch instead of applying it', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);
    await submitVerdict(harness.dependencies, { verdict: 'gone' });

    const trial = await applyTrial(harness.dependencies);

    expect(trial.status).toBe('awaiting-manual-toggle');
    expect(trial.currentTrial?.round).toBe(1);
    expect(trial.currentTrial?.manual).toBe(true);
    expect(trial.currentTrial?.enabledIds).toEqual(['aaaa']);
    expect(trial.currentTrial?.disabledIds).toEqual(['bbbb']);
    expect(harness.surface.setEnabledCalls).not.toContainEqual({ id: 'aaaa', enabled: true });
  });

  it('holds the verdict until the trial batch is verified', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await confirmManualState(harness.dependencies);
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    await applyTrial(harness.dependencies);

    await expect(submitVerdict(harness.dependencies, { verdict: 'gone' })).rejects.toThrow(/No verdict is pending/);
  });
});
