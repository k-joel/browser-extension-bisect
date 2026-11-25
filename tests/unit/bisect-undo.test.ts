import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { BisectLog, ManagementPort, SessionView, TargetState } from '@/utils/bisect/domain';
import { undoEligibilityOf } from '@/utils/bisect/engine';
import { readBisectLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { replayLog } from '@/utils/bisect/replay';
import {
  applyTrial,
  confirmManualState,
  getSession,
  resetSession,
  resetSessionQueue,
  resyncSession,
  retryTrial,
  type SessionDependencies,
  startSession,
  submitVerdict,
  undoLastVerdict,
} from '@/utils/bisect/session';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha' };
const BRAVO = { id: 'bbbb', name: 'Bravo' };
const CHARLIE = { id: 'cccc', name: 'Charlie' };
const DELTA = { id: 'dddd', name: 'Delta' };
const ECHO = { id: 'eeee', name: 'Echo' };

const FIVE = [ALPHA, BRAVO, CHARLIE, DELTA, ECHO];
const FIVE_IDS = FIVE.map((entry) => entry.id);

interface Harness {
  port: ManagementPort;
  surface: FakeManagement;
  dependencies: SessionDependencies;
  reloads: number[];
}

function harness(installs: { id: string; name: string; enabled?: boolean }[], automated: boolean): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      ...installs.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name, enabled: entry.enabled ?? true })),
      SELF,
    ],
  });
  const reloads: number[] = [];
  const port = automated
    ? createChromePort({ management: surface })
    : createFirefoxPort({ management: surface, debounceMs: 5 });
  return {
    port,
    surface,
    reloads,
    dependencies: {
      port,
      tabs: {
        reload: async (tabId: number) => {
          reloads.push(tabId);
        },
        waitForComplete: async () => true,
      },
      now: () => 1_000,
      newSessionId: () => 'session-undo',
    },
  };
}

async function userToggles(surface: FakeManagement, states: Record<string, boolean>): Promise<void> {
  for (const [id, enabled] of Object.entries(states)) await surface.setEnabled(id, enabled);
}

async function log(): Promise<BisectLog | null> {
  return readBisectLog();
}

async function eventTypes(): Promise<string[]> {
  return (await log())?.events.map((event) => event.type) ?? [];
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

async function enabledStates(surface: FakeManagement, ids: string[]): Promise<Record<string, boolean>> {
  const all = await surface.getAll();
  return Object.fromEntries(ids.map((id) => [id, all.find((entry) => entry.id === id)?.enabled ?? false]));
}

/** The target the log recorded for a round, which is what an undo has to put back. */
async function recordedTarget(round: number): Promise<TargetState> {
  const started = (await log())?.events.filter((event) => event.type === 'trial-started').at(-1);
  expect(started?.type).toBe('trial-started');
  const payload = (started as { payload: { round: number; enabledIds: string[]; disabledIds: string[] } }).payload;
  expect(payload.round).toBe(round);
  return {
    enabled: payload.enabledIds,
    disabled: payload.disabledIds,
    allOutsideSuspectsEnabled: true,
  };
}

/** Five candidates stopped on trial 2 with its verdict answered (`persists`). */
async function afterTrialTwoVerdict(): Promise<Harness> {
  const h = harness(FIVE, true);
  await startSession(h.dependencies, {
    candidateIds: FIVE_IDS,
    baselineMode: 'auto',
    testTab: null,
  });
  await submitVerdict(h.dependencies, { verdict: 'gone' });
  await applyTrial(h.dependencies);
  await submitVerdict(h.dependencies, { verdict: 'persists' });
  await applyTrial(h.dependencies);
  await submitVerdict(h.dependencies, { verdict: 'persists' });
  return h;
}

describe('undo eligibility', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('is eligible only for the most recent answered trial', async () => {
    await afterTrialTwoVerdict();

    const current = await view();
    expect(current?.currentTrial?.round).toBe(2);
    expect(undoEligibilityOf(current as SessionView)).toEqual({ eligible: true, reason: null });
  });

  it('is refused while a newer trial is still unanswered', async () => {
    const h = await afterTrialTwoVerdict();
    await applyTrial(h.dependencies);

    const current = await view();
    const eligibility = undoEligibilityOf(current as SessionView);

    expect(eligibility.eligible).toBe(false);
    expect(eligibility.reason).toMatch(/No verdict has been recorded yet/);
  });

  it('is refused for the baseline check', async () => {
    const h = harness([ALPHA, BRAVO], true);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });

    expect(undoEligibilityOf((await view()) as SessionView).eligible).toBe(false);
  });

  it('is refused once the search completed', async () => {
    const h = harness([ALPHA, BRAVO], true);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    await applyTrial(h.dependencies);
    const completed = await submitVerdict(h.dependencies, { verdict: 'gone' });

    expect(completed.status).toBe('completed');
    expect(undoEligibilityOf(completed).eligible).toBe(false);
    await expect(undoLastVerdict(h.dependencies)).rejects.toThrow(/no verdict to undo/);
  });

  it('is refused while the session is paused', async () => {
    const h = await afterTrialTwoVerdict();
    await userToggles(h.surface, { cccc: true });
    await expect(applyTrial(h.dependencies)).rejects.toThrow();

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(undoEligibilityOf(paused as SessionView).eligible).toBe(false);
    await expect(undoLastVerdict(h.dependencies)).rejects.toThrow(/paused/);
  });

  it('is refused once the session was restored', async () => {
    const h = await afterTrialTwoVerdict();
    const restored = await resetSession(h.dependencies, { restore: true });

    expect(restored.status).toBe('restored');
    expect(undoEligibilityOf(restored).eligible).toBe(false);
    await expect(undoLastVerdict(h.dependencies)).rejects.toThrow(/no verdict to undo/);
  });
});

describe('undoing the last verdict', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('reopens the round and keeps the browser on the previous batch', async () => {
    const h = await afterTrialTwoVerdict();
    const target = await recordedTarget(2);
    const before = await enabledStates(h.surface, FIVE_IDS);
    h.surface.setEnabledCalls.length = 0;

    const reopened = await undoLastVerdict(h.dependencies);

    expect(reopened.status).toBe('awaiting-verdict');
    expect(reopened.currentTrial?.round).toBe(2);
    expect(reopened.currentTrial?.verdict).toBeNull();
    expect(reopened.currentTrial?.enabledIds).toEqual(target.enabled);
    expect(reopened.currentTrial?.disabledIds).toEqual(target.disabled);
    expect(await enabledStates(h.surface, FIVE_IDS)).toEqual(before);
    expect(h.surface.setEnabledCalls).toEqual([]);
  });

  it('restores the suspect pool and the cleared set the trial started from', async () => {
    const h = await afterTrialTwoVerdict();
    const answered = await view();
    const suspectsBeforeTrialTwo = answered?.trials[0] ? FIVE_IDS : [];

    const reopened = await undoLastVerdict(h.dependencies);

    expect(reopened.suspects).not.toEqual(answered?.suspects);
    expect(reopened.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(suspectsBeforeTrialTwo).toHaveLength(5);
    expect(reopened.cleared).toEqual(['dddd', 'eeee']);
    expect(reopened.suspects.length + reopened.cleared.length).toBe(FIVE_IDS.length);
  });

  it('appends verdict-undone and nothing else to the log', async () => {
    const h = await afterTrialTwoVerdict();
    const before = await eventTypes();

    await undoLastVerdict(h.dependencies);

    const after = await eventTypes();
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.slice(before.length)).toEqual(['verdict-undone']);
    expect((await log())?.events.at(-1)?.payload).toEqual({ round: 2 });
  });

  it('reopens the round after a retry', async () => {
    const h = await afterTrialTwoVerdict();
    await applyTrial(h.dependencies);
    await retryTrial(h.dependencies, {});
    await submitVerdict(h.dependencies, { verdict: 'persists' });

    const reopened = await undoLastVerdict(h.dependencies);

    expect(reopened.status).toBe('awaiting-verdict');
    expect(reopened.currentTrial?.round).toBe(3);
    expect(reopened.currentTrial?.verdict).toBeNull();
    expect((await log())?.events.map((event) => event.type)).toContain('verdict-undone');
  });

  it('keeps the log append-only and replayable after an undo', async () => {
    const h = await afterTrialTwoVerdict();
    const before = (await log())?.events.length ?? 0;

    await undoLastVerdict(h.dependencies);
    const after = await log();
    const result = replayLog(after as BisectLog);

    expect(after?.events).toHaveLength(before + 1);
    expect(result.validationError).toBeNull();
    expect(result.trials.map((trial) => trial.round)).toEqual([1]);
    expect(result.culpritId).toBeNull();
  });

  it('refuses to undo when the browser state has drifted, and pauses instead', async () => {
    const h = await afterTrialTwoVerdict();
    await userToggles(h.surface, { cccc: true });

    await expect(undoLastVerdict(h.dependencies)).rejects.toThrow(/does not match this batch yet/);

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(paused?.pause?.drift?.pendingManualToggles).toEqual(['cccc']);
    expect(await eventTypes()).not.toContain('verdict-undone');
  });

  it('keeps working after the drift is re-synced', async () => {
    const h = await afterTrialTwoVerdict();
    await userToggles(h.surface, { cccc: true });
    await expect(undoLastVerdict(h.dependencies)).rejects.toThrow();
    await resyncSession(h.dependencies);

    const reopened = await undoLastVerdict(h.dependencies);

    expect(reopened.status).toBe('awaiting-verdict');
    expect(reopened.currentTrial?.verdict).toBeNull();
  });

  it('refuses a second undo once the round is reopened', async () => {
    const h = await afterTrialTwoVerdict();
    await undoLastVerdict(h.dependencies);

    await expect(undoLastVerdict(h.dependencies)).rejects.toThrow(/No verdict has been recorded yet/);
    expect((await log())?.events.filter((event) => event.type === 'verdict-undone')).toHaveLength(1);
  });

  it('re-parks an assisted round on its manual batch instead of reopening the question', async () => {
    const h = harness([ALPHA, BRAVO, CHARLIE, DELTA], false);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb', 'cccc', 'dddd'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(h.surface, { aaaa: false, bbbb: false, cccc: false, dddd: false });
    await confirmManualState(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'gone' });

    const trialOne = await applyTrial(h.dependencies);
    expect(trialOne.manualBatch).toEqual({ enableIds: ['aaaa', 'bbbb'], disableIds: ['cccc', 'dddd'] });
    await userToggles(h.surface, { aaaa: true, bbbb: true });
    await confirmManualState(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'gone' });

    const trialTwo = await applyTrial(h.dependencies);
    expect(trialTwo.manualBatch).toEqual({ enableIds: ['aaaa', 'bbbb', 'cccc'], disableIds: ['dddd'] });
    await userToggles(h.surface, { cccc: true });
    await confirmManualState(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'persists' });

    const reopened = await undoLastVerdict(h.dependencies);

    expect(reopened.currentTrial?.round).toBe(2);
    expect(reopened.currentTrial?.verdict).toBeNull();
    expect(reopened.status).toBe('awaiting-manual-toggle');
    expect(reopened.manualBatch).toEqual(trialTwo.manualBatch);
  });
});

describe('a restored session still reports its terminal outcome from the log', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('keeps the culprit in the log after the restore moves the status to restored', async () => {
    const h = harness([ALPHA, BRAVO], true);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    await applyTrial(h.dependencies);
    const completed = await submitVerdict(h.dependencies, { verdict: 'gone' });
    expect(completed.status).toBe('completed');

    const restored = await resetSession(h.dependencies, { restore: true });

    expect(restored.status).toBe('restored');
    const events = (await log())?.events ?? [];
    const terminal = events.filter((event) => event.type === 'session-completed');
    expect(terminal).toHaveLength(1);
    expect(terminal[0]?.payload).toEqual({ culpritId: completed.culpritId });
    expect(events.at(-1)?.type).toBe('session-reset');
  });
});
