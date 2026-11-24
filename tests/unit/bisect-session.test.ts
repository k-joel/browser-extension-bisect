import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  bindTestTab,
  getSession,
  reloadTestTab,
  resetSession,
  resetSessionQueue,
  retryTrial,
  type SessionDependencies,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

interface Install {
  id: string;
  name: string;
  enabled?: boolean;
}

interface Harness {
  port: ManagementPort;
  dependencies: SessionDependencies;
  surface: ReturnType<typeof createFakeManagement>;
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
    port: createChromePort({ management: surface }),
    tabs: {
      reload: async (tabId: number) => {
        reloads.push(tabId);
      },
      waitForComplete: async () => true,
    },
    now: () => 1_000,
    newSessionId: () => 'session-fixed',
  };

  return { port: dependencies.port, dependencies, surface, reloads };
}

const ALPHA = { id: 'aaaa', name: 'Alpha' };
const BRAVO = { id: 'bbbb', name: 'Bravo' };

describe('startSession consent and eligibility', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('blocks a start with no eligible candidates', async () => {
    const harness = createHarness([]);

    await expect(
      startSession(harness.dependencies, { candidateIds: [], baselineMode: 'auto', testTab: null }),
    ).rejects.toThrow(/No eligible enabled extensions/);
    await expect(readBisectLog()).resolves.toBeNull();
  });

  it('blocks a start whose requested ids are all excluded', async () => {
    const harness = createHarness([ALPHA]);

    await expect(
      startSession(harness.dependencies, { candidateIds: ['not-a-candidate'], baselineMode: 'auto', testTab: null }),
    ).rejects.toThrow(/No eligible enabled extensions/);
  });

  it('snapshots the candidate order and original states, then runs the baseline', async () => {
    const harness = createHarness([BRAVO, ALPHA]);

    const view = await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: { tabId: 5, url: null },
    });

    expect(view.status).toBe('awaiting-verdict');
    expect(view.candidateOrder.map((candidate) => candidate.id)).toEqual(['aaaa', 'bbbb']);
    expect(view.originalEnabledIds).toEqual(['aaaa', 'bbbb']);
    expect(view.testTab).toEqual({ tabId: 5, url: null });
  });

  it('disables every candidate and leaves non-candidates and non-eligible extensions untouched', async () => {
    const harness = createHarness([
      ALPHA,
      BRAVO,
      { id: 'zzzz', name: 'Zulu', enabled: false },
      { id: 'theme-id', name: 'Theme' },
    ]);

    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });

    const toggled = harness.surface.setEnabledCalls.map((call) => call.id);
    expect(toggled.sort()).toEqual(['aaaa', 'bbbb']);
    expect(toggled).not.toContain('zzzz');
    expect(toggled).not.toContain('theme-id');
    expect(toggled).not.toContain(SELF.id);
  });

  it('reloads the bound test tab after applying the baseline', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: { tabId: 12, url: null },
    });

    expect(harness.reloads).toEqual([12]);
  });

  it('appends a session-started event with the immutable snapshot', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });

    const log = await readBisectLog();
    const started = log?.events[0];
    expect(started?.type).toBe('session-started');
    expect(log?.events.filter((event) => event.type === 'session-started')).toHaveLength(1);
  });
});

describe('startSession baseline outcomes', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('keeps the session at awaiting-verdict for a clean baseline with N >= 2', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    const view = await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });

    expect(view.status).toBe('awaiting-verdict');
    expect(view.suspects).toEqual(['aaaa', 'bbbb']);
    expect(view.culpritId).toBeNull();
  });

  it('resolves N = 1 from a gone baseline and leaves the culprit disabled', async () => {
    const harness = createHarness([ALPHA]);

    const view = await startSession(harness.dependencies, {
      candidateIds: ['aaaa'],
      baselineMode: 'auto',
      testTab: null,
    });
    expect(view.status).toBe('awaiting-verdict');

    const resolved = await submitVerdict(harness.dependencies, { verdict: 'gone' });

    expect(resolved.status).toBe('completed');
    expect(resolved.culpritId).toBe('aaaa');
    expect(harness.surface.setEnabledCalls).toEqual([{ id: 'aaaa', enabled: false }]);
  });

  it('aborts as a host issue on a persisting baseline and restores every candidate', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    harness.surface.setEnabledCalls.length = 0;

    const view = await submitVerdict(harness.dependencies, { verdict: 'persists' });

    expect(view.status).toBe('aborted');
    expect(view.culpritId).toBeNull();
    expect(harness.surface.setEnabledCalls).toEqual([
      { id: 'aaaa', enabled: true },
      { id: 'bbbb', enabled: true },
    ]);
  });

  it('records the baseline verdict in the log', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(harness.dependencies, { verdict: 'gone' });

    const log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual([
      'session-started',
      'trial-started',
      'trial-applied',
      'baseline-recorded',
    ]);
  });
});

describe('session restore', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('re-enables only the touched candidates and records session-reset', async () => {
    const harness = createHarness([ALPHA, BRAVO, { id: 'zzzz', name: 'Zulu', enabled: false }]);

    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    harness.surface.setEnabledCalls.length = 0;

    const view = await resetSession(harness.dependencies, { restore: true });

    expect(view.status).toBe('restored');
    expect(harness.surface.setEnabledCalls.map((call) => call.id).sort()).toEqual(['aaaa', 'bbbb']);
    const log = await readBisectLog();
    expect(log?.events.at(-1)?.type).toBe('session-reset');
  });

  it('reports a partial restore honestly when a re-enable fails', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha' }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo' }),
        SELF,
      ],
      setEnabledError: (id, enabled) => (enabled && id === 'aaaa' ? new Error('greylisted') : null),
    });
    const dependencies: SessionDependencies = {
      port: createChromePort({ management: surface }),
      tabs: { reload: async () => undefined, waitForComplete: async () => true },
      now: () => 1_000,
      newSessionId: () => 'session-fixed',
    };

    await startSession(dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    const view = await resetSession(dependencies, { restore: true });

    expect(view.status).toBe('restored');
    const log = await readBisectLog();
    const reset = log?.events.at(-1);
    expect(reset?.type).toBe('session-reset');
    expect(reset?.payload).toMatchObject({ restored: false });
  });

  it('does not toggle anything when restore is declined', async () => {
    const harness = createHarness([ALPHA]);

    await startSession(harness.dependencies, { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });
    harness.surface.setEnabledCalls.length = 0;

    const view = await resetSession(harness.dependencies, { restore: false });

    expect(view.status).toBe('restored');
    expect(harness.surface.setEnabledCalls).toEqual([]);
  });
});

describe('session rehydration', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('returns null before any session exists', async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it('rehydrates the session view from the log without touching management', async () => {
    const first = createHarness([ALPHA, BRAVO]);
    await startSession(first.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: { tabId: 3, url: null },
    });

    const second = createHarness([ALPHA, BRAVO]);
    const view = await getSession();

    expect(view?.status).toBe('awaiting-verdict');
    expect(view?.candidateOrder.map((candidate) => candidate.id)).toEqual(['aaaa', 'bbbb']);
    expect(view?.testTab).toEqual({ tabId: 3, url: null });
    expect(second.surface.setEnabledCalls).toEqual([]);
  });

  it('survives a lost in-memory writer when the worker restarts between messages', async () => {
    const first = createHarness([ALPHA, BRAVO]);
    await startSession(first.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(first.dependencies, { verdict: 'gone' });

    const view = await getSession();

    expect(view?.status).toBe('awaiting-verdict');
    expect(view?.suspects).toEqual(['aaaa', 'bbbb']);
  });
});

describe('session serialization', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('serializes concurrent mutations so the log never loses an event', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    await startSession(harness.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });

    await Promise.all([
      applyTrial(harness.dependencies),
      applyTrial(harness.dependencies),
      submitVerdict(harness.dependencies, { verdict: 'gone' }),
    ]);

    const log = await readBisectLog();
    expect(log).not.toBeNull();
    const types = log?.events.map((event) => event.type) ?? [];
    expect(types.filter((type) => type === 'session-started')).toHaveLength(1);
    expect(types).toContain('verdict-recorded');
    expect(types.indexOf('verdict-recorded')).toBeLessThan(types.length);
  });

  it('rejects an apply when no session exists', async () => {
    const harness = createHarness([ALPHA]);

    await expect(applyTrial(harness.dependencies)).rejects.toThrow(/No active session/);
  });

  it('rejects a verdict when no verdict is pending', async () => {
    const harness = createHarness([ALPHA]);

    await expect(submitVerdict(harness.dependencies, { verdict: 'gone' })).rejects.toThrow(/No active session/);
  });
});

describe('test tab bindings', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('binds a nullable url and persists it in the config', async () => {
    const harness = createHarness([ALPHA]);

    const config = await bindTestTab(harness.dependencies, { tabId: 21, url: null });

    expect(config.testTab).toEqual({ tabId: 21, url: null });
  });

  it('reloads the bound tab through the injected surface', async () => {
    const harness = createHarness([ALPHA]);
    await bindTestTab(harness.dependencies, { tabId: 22, url: null });

    const result = await reloadTestTab(harness.dependencies);

    expect(result.ok).toBe(true);
    expect(harness.reloads).toEqual([22]);
  });

  it('reports a reload failure without claiming success', async () => {
    const harness = createHarness([ALPHA]);
    const failing: SessionDependencies = {
      ...harness.dependencies,
      tabs: {
        reload: async () => {
          throw new Error('No tab with id 99');
        },
        waitForComplete: async () => true,
      },
    };
    await bindTestTab(failing, { tabId: 99, url: null });

    const result = await reloadTestTab(failing);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('No tab with id 99');
  });

  it('reports a missing binding instead of reloading', async () => {
    const harness = createHarness([ALPHA]);

    const result = await reloadTestTab(harness.dependencies);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/No test tab/);
  });
});

describe('test tab completion waiting', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('waits for the tab to settle before accepting a verdict', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    let waitedFor: number | null = null;
    const dependencies: SessionDependencies = {
      ...harness.dependencies,
      tabs: {
        reload: async () => undefined,
        waitForComplete: async (tabId: number) => {
          waitedFor = tabId;
          return true;
        },
      },
    };

    await startSession(dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: { tabId: 4, url: null },
    });

    expect(waitedFor).toBe(4);
  });

  it('still asks the baseline question when the tab never settles', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    const dependencies: SessionDependencies = {
      ...harness.dependencies,
      tabs: { reload: async () => undefined, waitForComplete: async () => false },
    };

    const view = await startSession(dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: { tabId: 4, url: null },
    });

    expect(view.status).toBe('awaiting-verdict');
  });
});

const NUMBERS = Array.from({ length: 24 }, (_, index) => String(index + 1));

/**
 * Candidate order is captured as name-then-id, so the fixture names are
 * zero-padded to keep the snapshot in numeric order for the worked example.
 */
function numberHarness(): Harness {
  return createHarness(NUMBERS.map((id) => ({ id, name: `Fixture ${id.padStart(2, '0')}` })));
}

async function enabledStatesOf(harness: Harness, ids: string[]): Promise<Record<string, boolean>> {
  const all = await harness.surface.getAll();
  const states: Record<string, boolean> = {};
  for (const id of ids) states[id] = all.find((entry) => entry.id === id)?.enabled ?? false;
  return states;
}

type View = Awaited<ReturnType<typeof submitVerdict>>;

type Oracle = (trial: { enabledIds: string[] }) => 'persists' | 'gone';

/**
 * Drives the session the way the panel does: answer the baseline, re-apply the
 * next partition, answer it, and repeat until the session leaves
 * `awaiting-verdict`. The oracle stands in for the human verdict and is the only
 * thing that knows which candidate is faulty.
 */
async function runLoop(harness: Harness, candidateIds: string[], oracle: Oracle): Promise<View> {
  await startSession(harness.dependencies, { candidateIds, baselineMode: 'auto', testTab: null });
  let view: View = await submitVerdict(harness.dependencies, { verdict: 'gone' });

  for (let guard = 0; guard < 100; guard += 1) {
    view = await applyTrial(harness.dependencies);
    const trial = view.currentTrial;
    if (view.status !== 'awaiting-verdict' || trial === null) return view;

    view = await submitVerdict(harness.dependencies, { verdict: oracle(trial) });
    if (view.status !== 'awaiting-verdict') return view;
  }

  throw new Error('the session loop did not terminate');
}

function partitionTrials(view: View) {
  return view.trials.filter((trial) => trial.round > 0);
}

describe('partition loop in the session', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('starts the first trial only after the clean baseline is answered', async () => {
    const harness = numberHarness();
    await startSession(harness.dependencies, {
      candidateIds: NUMBERS,
      baselineMode: 'auto',
      testTab: null,
    });

    let log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual(['session-started', 'trial-started', 'trial-applied']);

    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    const applied = await applyTrial(harness.dependencies);

    log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual([
      'session-started',
      'trial-started',
      'trial-applied',
      'baseline-recorded',
      'trial-started',
      'trial-applied',
    ]);
    expect(applied.currentTrial).toMatchObject({
      round: 1,
      enabledIds: NUMBERS.slice(0, 12),
      disabledIds: NUMBERS.slice(12),
    });
  });

  it('runs the N = 24 worked example to the documented culprit', async () => {
    const harness = numberHarness();
    const view = await runLoop(harness, NUMBERS, (trial) => (trial.enabledIds.includes('8') ? 'persists' : 'gone'));

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('8');
    expect(partitionTrials(view)).toHaveLength(5);
  });

  it('records every documented batch and verdict in the log', async () => {
    const harness = numberHarness();
    await runLoop(harness, NUMBERS, (trial) => (trial.enabledIds.includes('8') ? 'persists' : 'gone'));

    const view = await getSession();
    const trials = partitionTrials(view as View);
    const disabledSets = trials.map((trial) => trial.disabledIds);

    expect(disabledSets).toEqual([
      NUMBERS.slice(12),
      NUMBERS.slice(6, 12),
      NUMBERS.slice(9, 12),
      NUMBERS.slice(8, 9),
      NUMBERS.slice(7, 8),
    ]);
    expect(trials.map((trial) => trial.verdict)).toEqual(['persists', 'gone', 'persists', 'persists', 'gone']);
  });

  it('re-enables the cleared candidates on later trials', async () => {
    const harness = numberHarness();
    await runLoop(harness, NUMBERS, (trial) => (trial.enabledIds.includes('8') ? 'persists' : 'gone'));

    const log = await readBisectLog();
    const started = (log?.events ?? []).filter((event) => event.type === 'trial-started');
    const payload = started[2]?.payload as { enabledIds: string[]; disabledIds: string[] };

    expect(payload.disabledIds).toEqual(NUMBERS.slice(6, 12));
    expect(payload.enabledIds).toEqual(expect.arrayContaining(['1', '13', '24']));
  });

  it('leaves the culprit disabled and the cleared candidates enabled at completion', async () => {
    const harness = numberHarness();
    await runLoop(harness, NUMBERS, (trial) => (trial.enabledIds.includes('8') ? 'persists' : 'gone'));

    const states = await enabledStatesOf(harness, ['8', '7', '1']);
    expect(states).toEqual({ '8': false, '7': true, '1': true });
  });

  it('needs a sixth trial for the #7 variant', async () => {
    const harness = numberHarness();
    const view = await runLoop(harness, NUMBERS, (trial) => (trial.enabledIds.includes('7') ? 'persists' : 'gone'));

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('7');
    expect(partitionTrials(view)).toHaveLength(6);
    expect(partitionTrials(view).at(-1)).toMatchObject({ disabledIds: ['7'], verdict: 'gone' });
    expect(partitionTrials(view).at(-1)?.enabledIds).not.toContain('7');
  });

  it('appends session-completed with the culprit', async () => {
    const harness = numberHarness();
    await runLoop(harness, NUMBERS, (trial) => (trial.enabledIds.includes('8') ? 'persists' : 'gone'));

    const log = await readBisectLog();
    const completed = log?.events.find((event) => event.type === 'session-completed');
    expect(completed?.payload).toEqual({ culpritId: '8' });
  });

  it('completes an N = 2 session whose culprit was disabled by the partition', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    const view = await runLoop(harness, ['aaaa', 'bbbb'], (trial) =>
      trial.enabledIds.includes('bbbb') ? 'persists' : 'gone',
    );

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('bbbb');
    expect(partitionTrials(view)).toHaveLength(1);
  });

  it('confirms an N = 2 session whose culprit was left enabled', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    const view = await runLoop(harness, ['aaaa', 'bbbb'], (trial) =>
      trial.enabledIds.includes('aaaa') ? 'persists' : 'gone',
    );

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('aaaa');
    expect(partitionTrials(view)).toHaveLength(2);
  });

  it('completes an N = 3 session in at most two partition trials', async () => {
    const harness = createHarness([ALPHA, BRAVO, { id: 'cccc', name: 'Charlie' }]);
    const view = await runLoop(harness, ['aaaa', 'bbbb', 'cccc'], (trial) =>
      trial.enabledIds.includes('bbbb') ? 'persists' : 'gone',
    );

    expect(view.status).toBe('completed');
    expect(view.culpritId).toBe('bbbb');
    expect(partitionTrials(view).length).toBeLessThanOrEqual(2);
  });

  it('reports the trial number and the estimated trials as progress', async () => {
    const harness = numberHarness();
    await startSession(harness.dependencies, { candidateIds: NUMBERS, baselineMode: 'auto', testTab: null });
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    const view = await applyTrial(harness.dependencies);

    expect(view.progress).toEqual({ trialNumber: 2, estimatedTrials: 6, suspectCount: 24 });
  });

  it('does not apply a trial once the session is completed', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await runLoop(harness, ['aaaa', 'bbbb'], (trial) => (trial.enabledIds.includes('bbbb') ? 'persists' : 'gone'));

    await expect(applyTrial(harness.dependencies)).rejects.toThrow(/Cannot apply a trial/);
  });
});

describe('retry and inconclusive outcomes', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('re-applies the same target state without recording a verdict', async () => {
    const harness = createHarness([ALPHA, BRAVO, { id: 'cccc', name: 'Charlie' }]);
    await startSession(harness.dependencies, {
      candidateIds: ['aaaa', 'bbbb', 'cccc'],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    const first = await applyTrial(harness.dependencies);

    harness.surface.setEnabledCalls.length = 0;
    const retried = await retryTrial(harness.dependencies, {});

    expect(retried.currentTrial).toMatchObject({
      round: first.currentTrial?.round,
      enabledIds: first.currentTrial?.enabledIds,
      disabledIds: first.currentTrial?.disabledIds,
      verdict: null,
    });
    expect(retried.currentTrial?.appliedAt).not.toBeNull();

    const log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual([
      'session-started',
      'trial-started',
      'trial-applied',
      'baseline-recorded',
      'trial-started',
      'trial-applied',
      'trial-retried',
      'trial-applied',
    ]);
    expect(log?.events.some((event) => event.type === 'verdict-recorded')).toBe(false);
  });

  it('keeps the suspect pool and the progress across a retry', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await startSession(harness.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    await applyTrial(harness.dependencies);

    const retried = await retryTrial(harness.dependencies, { reason: 'the page did not settle' });

    expect(retried.suspects).toEqual(['aaaa', 'bbbb']);
    expect(retried.currentTrial?.round).toBe(1);
    expect(retried.progress?.suspectCount).toBe(2);
  });

  it('rejects a retry when no trial is open', async () => {
    const harness = createHarness([ALPHA, BRAVO]);

    await expect(retryTrial(harness.dependencies, {})).rejects.toThrow(/No active session/);
  });

  it('reports a persisting final confirmation as inconclusive with the lone suspect', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    const view = await runLoop(harness, ['aaaa', 'bbbb'], () => 'persists');

    expect(view.status).toBe('inconclusive');
    expect(view.culpritId).toBeNull();
    expect(view.ambiguityIds).toEqual(['aaaa']);

    const log = await readBisectLog();
    const inconclusive = log?.events.find((event) => event.type === 'session-inconclusive');
    expect(inconclusive?.payload).toMatchObject({
      ambiguityIds: ['aaaa'],
      reason: 'final-confirmation-persists',
    });
  });

  it('leaves the ambiguous suspect disabled for the inconclusive outcome', async () => {
    const harness = createHarness([ALPHA, BRAVO]);
    await runLoop(harness, ['aaaa', 'bbbb'], () => 'persists');

    const states = await enabledStatesOf(harness, ['aaaa', 'bbbb']);
    expect(states).toEqual({ aaaa: false, bbbb: true });
  });

  it('never names a culprit when a final confirmation contradicts the search', async () => {
    const harness = numberHarness();
    const view = await runLoop(harness, NUMBERS, () => 'persists');

    expect(view.status).toBe('inconclusive');
    expect(view.culpritId).toBeNull();
    expect(view.ambiguityIds.length).toBeGreaterThan(0);
  });
});
