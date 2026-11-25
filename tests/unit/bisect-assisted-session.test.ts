import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import {
  acceptRestore,
  applyTrial,
  confirmManualState,
  createManualStateWatcher,
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

const POLICY_SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect', installType: 'admin' });

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
  verifyCalls: number;
}

function createHarness(installs: Install[], self: ReturnType<typeof makeExtensionInfo> = SELF): Harness {
  const surface = createFakeManagement({
    self,
    extensions: [
      ...installs.map((install) =>
        makeExtensionInfo({ id: install.id, name: install.name, enabled: install.enabled ?? true }),
      ),
      self,
    ],
  });
  const reloads: number[] = [];
  const verifies = { count: 0 };
  const base = createFirefoxPort({ management: surface, debounceMs: 5 });
  const port: ManagementPort = {
    ...base,
    verifyState: (target) => {
      verifies.count += 1;
      return base.verifyState(target);
    },
  };
  const dependencies: SessionDependencies = {
    port,
    tabs: {
      reload: async (tabId: number) => {
        reloads.push(tabId);
      },
      waitForComplete: async () => true,
    },
    now: () => 1_000,
    newSessionId: () => 'session-assisted',
  };
  return {
    port,
    surface,
    dependencies,
    reloads,
    get verifyCalls() {
      return verifies.count;
    },
  };
}

/**
 * An enterprise-policy install reports `canAutoToggle`, so the adapter must use the
 * automated diff and error path instead of asking the user for a manual batch.
 */
function createPolicyHarness(installs: Install[]): Harness {
  return createHarness(installs, POLICY_SELF);
}

function createChromeHarness(installs: Install[]): Harness {
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
    port: createChromePort({ management: surface }),
    tabs: {
      reload: async (tabId: number) => {
        reloads.push(tabId);
      },
      waitForComplete: async () => true,
    },
    now: () => 1_000,
    newSessionId: () => 'session-chrome',
  };
  return {
    port: dependencies.port,
    surface,
    dependencies,
    reloads,
    get verifyCalls() {
      return 0;
    },
  };
}

const ALPHA = { id: 'aaaa', name: 'Alpha' };
const BRAVO = { id: 'bbbb', name: 'Bravo' };
const CHARLIE = { id: 'cccc', name: 'Charlie' };

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

  it('accepts the external attestation from the manual baseline screen without any toggle', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    const started = await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    expect(started.status).toBe('awaiting-manual-toggle');

    const attested = await recordExternalBaseline(harness.dependencies);

    expect(attested.status).toBe('awaiting-verdict');
    expect(attested.suspects).toEqual(['aaaa', 'bbbb']);
    expect(harness.surface.setEnabledCalls).toEqual([]);
    const log = await readBisectLog();
    expect(log?.events.at(-1)?.payload).toEqual({ mode: 'external', verdict: 'gone' });
  });

  it('refuses an external attestation once a partition trial has started', async () => {
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

/**
 * The assisted trial loop: the batch is a request to the user, and the session only
 * opens the verdict once `management.getAll()` proves the requested state.
 */
async function assistedToFirstTrial(installs: Install[] = [ALPHA, BRAVO]): Promise<Harness> {
  const harness = createHarness(installs);
  await startSession(harness.dependencies, {
    candidateIds: installs.map((install) => install.id),
    baselineMode: 'manual',
    testTab: null,
  });
  await userToggles(harness.surface, Object.fromEntries(installs.map((install) => [install.id, false])));
  await confirmManualState(harness.dependencies);
  await submitVerdict(harness.dependencies, { verdict: 'gone' });
  return harness;
}

describe('assisted trial batch', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('returns the manual batch with both directions from applyTrial', async () => {
    const harness = await assistedToFirstTrial([ALPHA, BRAVO, CHARLIE]);

    const trial = await applyTrial(harness.dependencies);

    // Three suspects: the disabled half is the single tail candidate, so the checklist
    // asks for the other two to be on.
    expect(trial.manualBatch).toEqual({ enableIds: ['aaaa', 'bbbb'], disableIds: ['cccc'] });
    expect(trial.currentTrial?.enabledIds).toEqual(['aaaa', 'bbbb']);
    expect(trial.currentTrial?.disabledIds).toEqual(['cccc']);
    expect(trial.currentTrial?.manual).toBe(true);
    expect(trial.status).toBe('awaiting-manual-toggle');
  });

  it('reports both checklists through getDrift without accepting the batch', async () => {
    const harness = await assistedToFirstTrial([ALPHA, BRAVO, CHARLIE]);
    await applyTrial(harness.dependencies);

    const drift = await verifyManualState(harness.dependencies);

    expect(drift.expected).toEqual({ aaaa: true, bbbb: true, cccc: false });
    expect(drift.inSync).toBe(false);
    expect(drift.pendingManualToggles).toEqual(['aaaa', 'bbbb']);
    expect(harness.surface.setEnabledCalls.every((call) => call.enabled === false)).toBe(true);
  });

  it('leaves the trial unschedulable until the batch is verified', async () => {
    const harness = await assistedToFirstTrial();
    await applyTrial(harness.dependencies);

    await expect(confirmManualState(harness.dependencies)).rejects.toThrow(/does not match this batch yet/);
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('trial-applied');
  });

  it('moves to awaiting-verdict only once the manual state matches', async () => {
    const harness = await assistedToFirstTrial();
    await applyTrial(harness.dependencies);

    await userToggles(harness.surface, { aaaa: true, bbbb: false });
    const confirmed = await confirmManualState(harness.dependencies);

    expect(confirmed.status).toBe('awaiting-verdict');
    expect(confirmed.currentTrial?.round).toBe(1);
    expect(confirmed.currentTrial?.verdict).toBeNull();
    expect(confirmed.manualBatch).toBeNull();
    expect(await verifyManualState(harness.dependencies)).toMatchObject({ inSync: true });
  });

  it('keeps the cleared candidates enabled across the verified transition', async () => {
    const harness = await assistedToFirstTrial([ALPHA, BRAVO, CHARLIE]);
    const trial = await applyTrial(harness.dependencies);

    await userToggles(harness.surface, { aaaa: true, bbbb: true });
    const confirmed = await confirmManualState(harness.dependencies);

    expect(trial.manualBatch?.enableIds).toEqual(['aaaa', 'bbbb']);
    expect(confirmed.status).toBe('awaiting-verdict');
    const states = await harness.surface.getAll();
    expect(states.find((entry) => entry.id === 'aaaa')?.enabled).toBe(true);
    expect(states.find((entry) => entry.id === 'bbbb')?.enabled).toBe(true);
  });

  it('shrinks the suspect pool exactly as the automated flow does', async () => {
    const assisted = await assistedToFirstTrial([ALPHA, BRAVO, CHARLIE]);
    const assistedTrial = await applyTrial(assisted.dependencies);
    await userToggles(assisted.surface, { aaaa: true, bbbb: true });
    const assistedConfirmed = await confirmManualState(assisted.dependencies);

    const automated = createChromeHarness([ALPHA, BRAVO, CHARLIE]);
    await startSession(automated.dependencies, {
      candidateIds: ['aaaa', 'bbbb', 'cccc'],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(automated.dependencies, { verdict: 'gone' });
    const automatedTrial = await applyTrial(automated.dependencies);

    expect(assistedTrial.currentTrial?.enabledIds).toEqual(automatedTrial.currentTrial?.enabledIds);
    expect(assistedTrial.currentTrial?.disabledIds).toEqual(automatedTrial.currentTrial?.disabledIds);
    expect(assistedTrial.suspects).toEqual(automatedTrial.suspects);
    expect(assistedConfirmed.suspects).toEqual(automatedTrial.suspects);
    expect(automatedTrial.manualBatch).toBeNull();
  });

  it('runs the whole assisted loop to a known culprit', async () => {
    const harness = await assistedToFirstTrial([ALPHA, BRAVO, CHARLIE]);
    let view = await applyTrial(harness.dependencies);

    for (let guard = 0; guard < 12; guard += 1) {
      if (view.status === 'completed' || view.status === 'inconclusive') break;
      expect(view.status).toBe('awaiting-manual-toggle');

      const batch = view.manualBatch;
      if (batch === null) throw new Error('The assisted trial has no manual batch');
      const next: Record<string, boolean> = {};
      for (const id of batch.enableIds) next[id] = true;
      for (const id of batch.disableIds) next[id] = false;
      await userToggles(harness.surface, next);
      view = await confirmManualState(harness.dependencies);

      const symptomPresent = (view.currentTrial?.enabledIds ?? []).includes('cccc');
      view = await submitVerdict(harness.dependencies, { verdict: symptomPresent ? 'persists' : 'gone' });
      if (view.status === 'completed' || view.status === 'inconclusive') break;
      view = await applyTrial(harness.dependencies);
    }

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('cccc');
    const states = await harness.surface.getAll();
    expect(states.find((entry) => entry.id === 'cccc')?.enabled).toBe(false);
    expect(states.find((entry) => entry.id === 'aaaa')?.enabled).toBe(true);
  });
});

describe('assisted manual state watcher', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('debounces management events into a single re-verify', async () => {
    vi.useFakeTimers();
    try {
      const harness = await assistedToFirstTrial();
      await applyTrial(harness.dependencies);
      const before = harness.verifyCalls;

      const reports: { inSync: boolean }[] = [];
      const stop = createManualStateWatcher({
        dependencies: harness.dependencies,
        debounceMs: 50,
        onDrift: (drift) => {
          reports.push({ inSync: drift.inSync });
        },
      });

      // The Add-ons Manager fires one event per toggle; the watcher must coalesce them.
      await userToggles(harness.surface, { aaaa: true });
      harness.surface.emitEnabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }));
      await userToggles(harness.surface, { bbbb: false });
      harness.surface.emitDisabled(makeExtensionInfo({ id: 'bbbb', name: 'Bravo', enabled: false }));

      expect(reports).toEqual([]);
      await vi.advanceTimersByTimeAsync(200);
      stop();

      expect(harness.verifyCalls).toBe(before + 1);
      expect(reports).toEqual([{ inSync: true }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports the still-pending state while the user is mid-batch', async () => {
    vi.useFakeTimers();
    try {
      const harness = await assistedToFirstTrial([ALPHA, BRAVO, CHARLIE]);
      await applyTrial(harness.dependencies);

      const reports: { inSync: boolean; pending: string[] }[] = [];
      const stop = createManualStateWatcher({
        dependencies: harness.dependencies,
        debounceMs: 20,
        onDrift: (drift) => {
          reports.push({ inSync: drift.inSync, pending: [...drift.pendingManualToggles] });
        },
      });

      // Only the first half of the "must be on" checklist is done.
      await userToggles(harness.surface, { aaaa: true });
      harness.surface.emitEnabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }));
      await vi.advanceTimersByTimeAsync(200);
      stop();

      expect(reports).toEqual([{ inSync: false, pending: ['bbbb'] }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stops re-verifying once the watcher is stopped', async () => {
    vi.useFakeTimers();
    try {
      const harness = await assistedToFirstTrial();
      await applyTrial(harness.dependencies);

      const stop = createManualStateWatcher({
        dependencies: harness.dependencies,
        debounceMs: 10,
        onDrift: () => undefined,
      });
      stop();
      const afterStop = harness.verifyCalls;

      harness.surface.emitEnabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }));
      await vi.advanceTimersByTimeAsync(200);

      expect(harness.verifyCalls).toBe(afterStop);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('enterprise-policy assisted routing', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('uses the automated batch instead of a manual one for an admin install', async () => {
    const harness = createPolicyHarness([ALPHA, BRAVO]);

    const started = await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    expect(started.capability.canAutoToggle).toBe(true);
    expect(started.status).toBe('awaiting-verdict');
    expect(started.currentTrial?.manual).toBe(false);
    expect(started.manualBatch).toBeNull();
    expect(harness.surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: false },
      { id: 'bbbb', enabled: false },
    ]);
  });

  it('applies partition trials through the automated diff', async () => {
    const harness = createPolicyHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    harness.surface.setEnabledCalls.length = 0;

    const trial = await applyTrial(harness.dependencies);

    expect(trial.status).toBe('awaiting-verdict');
    expect(trial.currentTrial?.manual).toBe(false);
    expect(trial.manualBatch).toBeNull();
    expect(harness.surface.setEnabledCalls).toEqual([{ id: 'aaaa', enabled: true }]);
  });

  it('surfaces the automated per-id error path for an admin install', async () => {
    const surface = createFakeManagement({
      self: POLICY_SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
        POLICY_SELF,
      ],
      setEnabledError: (id) => (id === 'aaaa' ? new Error('blocked by policy') : null),
    });
    const dependencies: SessionDependencies = {
      port: createFirefoxPort({ management: surface, debounceMs: 5 }),
      tabs: { reload: async () => undefined, waitForComplete: async () => true },
      now: () => 1_000,
      newSessionId: () => 'session-policy',
    };

    const started = await startSession(dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    // The failing toggle aborts the baseline: its mapped code is recorded on the applied
    // batch, the id that did move is put back, and the panel gets a pause to report —
    // never an auto-restore that would hide the failure.
    expect(started.status).toBe('paused');
    expect(started.pause?.reason).toBe('toggle-failed');
    const log = await readBisectLog();
    const applied = log?.events.find((event) => event.type === 'trial-applied');
    expect(applied?.payload).not.toHaveProperty('manual');
    const errors = (applied?.payload as { errors: { extensionId: string; code: string }[] } | undefined)?.errors ?? [];
    expect(errors[0]).toMatchObject({ extensionId: 'aaaa', message: 'blocked by policy', code: 'policy-blocked' });

    expect(log?.events.at(-1)?.type).toBe('session-paused');
    expect(started.pause?.rollback).toEqual({ restoredIds: ['bbbb'], errors: [] });
    expect(surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: false },
      { id: 'bbbb', enabled: false },
      { id: 'bbbb', enabled: true },
    ]);
  });

  it('aborts an automated baseline and re-enables what it had already disabled', async () => {
    const surface = createFakeManagement({
      self: POLICY_SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
        POLICY_SELF,
      ],
      setEnabledError: (id) => (id === 'aaaa' ? new Error('kCannotReEnableGreylistedError') : null),
    });
    const dependencies: SessionDependencies = {
      port: createFirefoxPort({ management: surface, debounceMs: 5 }),
      tabs: { reload: async () => undefined, waitForComplete: async () => true },
      now: () => 1_000,
      newSessionId: () => 'session-greylist',
    };

    const started = await startSession(dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'manual',
      testTab: null,
    });

    expect(started.status).toBe('paused');
    expect(started.currentTrial?.errors[0]).toMatchObject({
      extensionId: 'aaaa',
      code: 'manual-recovery-required',
    });
    // The previous state was everything enabled, so the rollback turns `bbbb` back on.
    expect(await readExtensionStates(surface, ['aaaa', 'bbbb'])).toEqual({ aaaa: true, bbbb: true });
  });
});

async function readExtensionStates(
  surface: ReturnType<typeof createFakeManagement>,
  ids: string[],
): Promise<Record<string, boolean>> {
  const all = await surface.getAll();
  return Object.fromEntries(ids.map((id) => [id, all.find((info) => info.id === id)?.enabled ?? false]));
}

describe('assisted restore pending and explicit accept', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  async function completedAssisted(installs: Install[] = [ALPHA, BRAVO]): Promise<Harness> {
    const harness = createHarness(installs);
    await startSession(harness.dependencies, {
      candidateIds: installs.map((install) => install.id),
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(harness.surface, Object.fromEntries(installs.map((install) => [install.id, false])));
    await confirmManualState(harness.dependencies);
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    return harness;
  }

  it('stays restore-pending when the browser state does not match yet', async () => {
    const harness = await completedAssisted();
    const reset = await resetSession(harness.dependencies, { restore: true });

    expect(reset.status).toBe('restored');
    const log = await readBisectLog();
    const last = log?.events.at(-1);
    expect(last?.type).toBe('session-reset');
    expect(last?.payload).toMatchObject({ restored: false, manualIds: ['aaaa', 'bbbb'] });

    const pending = await verifyRestore(harness.dependencies);
    expect(pending.complete).toBe(false);
    expect(pending.manualIds).toEqual(['aaaa', 'bbbb']);
  });

  it('records an explicit accept of the remaining differences without claiming a restore', async () => {
    const harness = await completedAssisted();
    await resetSession(harness.dependencies, { restore: true });
    await userToggles(harness.surface, { aaaa: true });

    const accepted = await acceptRestore(harness.dependencies);

    expect(accepted.status).toBe('restored');
    const log = await readBisectLog();
    const last = log?.events.at(-1);
    expect(last?.type).toBe('session-reset');
    expect(last?.payload).toMatchObject({ restored: false, manualIds: ['bbbb'], accepted: true });
  });

  it('reports the missing candidate as an error even when the user accepts', async () => {
    const harness = await completedAssisted();
    await resetSession(harness.dependencies, { restore: true });
    harness.surface.removeExtension('aaaa');
    harness.surface.emitUninstalled('aaaa');
    await userToggles(harness.surface, { bbbb: true });

    await acceptRestore(harness.dependencies);

    const log = await readBisectLog();
    const last = log?.events.at(-1);
    expect(last?.payload).toMatchObject({ restored: false, accepted: true });
    const errors = (last?.payload as { errors: { extensionId: string }[] } | undefined)?.errors ?? [];
    expect(errors[0]).toMatchObject({ extensionId: 'aaaa', code: 'extension-removed' });
  });

  it('reports a disappeared candidate as a failure rather than an accepted restore', async () => {
    const harness = await completedAssisted();
    await resetSession(harness.dependencies, { restore: true });
    harness.surface.removeExtension('aaaa');
    harness.surface.emitUninstalled('aaaa');

    const result = await verifyRestore(harness.dependencies);

    expect(result.complete).toBe(false);
    expect(result.errors[0]).toMatchObject({ extensionId: 'aaaa', code: 'extension-removed' });
  });

  it('reports completion once the state matches, without an explicit accept', async () => {
    const harness = await completedAssisted();
    await resetSession(harness.dependencies, { restore: true });

    await userToggles(harness.surface, { aaaa: true, bbbb: true });
    const done = await verifyRestore(harness.dependencies);

    expect(done.complete).toBe(true);
    expect(done.restoredIds).toEqual(['aaaa', 'bbbb']);
  });
});
