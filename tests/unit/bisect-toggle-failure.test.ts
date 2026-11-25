import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { SessionView } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  getSession,
  resetSession,
  resetSessionQueue,
  retryTrial,
  type SessionDependencies,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha' };
const BRAVO = { id: 'bbbb', name: 'Bravo' };
const CHARLIE = { id: 'cccc', name: 'Charlie' };
const DELTA = { id: 'dddd', name: 'Delta' };
const ECHO = { id: 'eeee', name: 'Echo' };

const FIVE = [ALPHA, BRAVO, CHARLIE, DELTA, ECHO];

interface Harness {
  surface: FakeManagement;
  dependencies: SessionDependencies;
  /** Arms a toggle failure after the baseline succeeded. */
  arm(next: (id: string, enabled: boolean) => Error | null): void;
}

/**
 * `failOn` is a mutable predicate so a test can arm a failure late; the fake surface
 * reads it on every call, which is what keeps the baseline clean and the trial broken.
 */
function harness(options: { failOn?: (id: string, enabled: boolean) => Error | null } = {}): Harness {
  let failOn = options.failOn ?? ((): Error | null => null);
  const surface = createFakeManagement({
    self: SELF,
    extensions: [...FIVE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
    setEnabledError: (id, enabled) => failOn(id, enabled),
  });
  return {
    surface,
    dependencies: {
      port: createChromePort({ management: surface }),
      tabs: { reload: async () => undefined, waitForComplete: async () => true },
      now: () => 1_000,
      newSessionId: () => 'session-toggle-failure',
    },
    arm(next: (id: string, enabled: boolean) => Error | null) {
      failOn = next;
    },
  };
}

async function eventTypes(): Promise<string[]> {
  return (await readBisectLog())?.events.map((event) => event.type) ?? [];
}

async function states(surface: FakeManagement, ids: string[]): Promise<Record<string, boolean>> {
  const all = await surface.getAll();
  return Object.fromEntries(ids.map((id) => [id, all.find((info) => info.id === id)?.enabled ?? false]));
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

describe('a failed toggle aborts the trial', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('records the failing id and the mapped code on the applied batch', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    h.arm((id) => (id === 'aaaa' ? new Error('kCannotReEnableGreylistedError') : null));

    const aborted = await applyTrial(h.dependencies);

    expect(aborted.status).toBe('paused');
    expect(aborted.pause?.reason).toBe('toggle-failed');
    expect(aborted.currentTrial?.errors).toEqual([
      { extensionId: 'aaaa', code: 'manual-recovery-required', message: 'kCannotReEnableGreylistedError' },
    ]);
    const types = await eventTypes();
    expect(types.at(-1)).toBe('session-paused');
    expect(types.at(-2)).toBe('trial-applied');
  });

  it('puts the previous target state back instead of leaving the browser half-changed', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });

    const before = await states(h.surface, ['aaaa', 'bbbb']);
    expect(before).toEqual({ aaaa: false, bbbb: false });

    // The partition enables `aaaa` and fails on it; `bbbb` must stay where the baseline
    // left it, and the abort must not stop the rollback.
    h.arm((id) => (id === 'aaaa' ? new Error('kGestureNeededForEscalationError') : null));
    const aborted = await applyTrial(h.dependencies);

    expect(await states(h.surface, ['aaaa', 'bbbb'])).toEqual({ aaaa: false, bbbb: false });
    expect(aborted.pause?.rollback).toEqual({ restoredIds: [], errors: [] });
  });

  it('rolls back only the ids the failed batch had already moved', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb', 'cccc'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });

    // Round 1 enables `aaaa`/`bbbb` and disables `cccc`; `persists` keeps that pair, so
    // round 2 re-enables the cleared `cccc` while disabling `bbbb`. That is the shape
    // where a batch moves ids in both directions and can fail halfway.
    await applyTrial(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'persists' });
    const before = await states(h.surface, ['aaaa', 'bbbb', 'cccc']);
    expect(before).toEqual({ aaaa: true, bbbb: true, cccc: false });

    h.arm((id, enabled) => (id === 'bbbb' && !enabled ? new Error('ExtensionMayModifySettings') : null));
    const aborted = await applyTrial(h.dependencies);

    expect(aborted.status).toBe('paused');
    expect(aborted.currentTrial?.errors[0]).toMatchObject({ extensionId: 'bbbb', code: 'policy-blocked' });
    // Only the enable of `cccc` had landed, so the rollback is exactly that id and the
    // pre-trial state is back — `aaaa` is never touched because it was already on.
    expect(aborted.pause?.rollback).toEqual({ restoredIds: ['cccc'], errors: [] });
    expect(await states(h.surface, ['aaaa', 'bbbb', 'cccc'])).toEqual(before);
  });

  it('aborts the baseline too, and leaves the session answerable by restore', async () => {
    const h = harness({ failOn: (id) => (id === 'aaaa' ? new Error('kNoExtensionError') : null) });

    const started = await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });

    expect(started.status).toBe('paused');
    expect(started.currentTrial?.round).toBe(0);
    expect(started.currentTrial?.errors[0]).toMatchObject({ extensionId: 'aaaa', code: 'extension-removed' });

    const restored = await resetSession(h.dependencies, { restore: true });
    expect(restored.status).toBe('restored');
  });

  it('never retries the failed toggle silently', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    h.arm((id) => (id === 'aaaa' ? new Error('blocked by policy') : null));

    await applyTrial(h.dependencies);
    const attempted = h.surface.setEnabledCalls.filter((call) => call.id === 'aaaa' && call.enabled);

    // Exactly one enable attempt for `aaaa`: the failed one. A silent retry would show two.
    expect(attempted).toHaveLength(1);
  });

  it('leaves the abort pause without a recorded re-apply for the same round', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    h.arm((id) => (id === 'aaaa' ? new Error('blocked by policy') : null));

    await applyTrial(h.dependencies);

    const rounds = ((await readBisectLog())?.events ?? [])
      .filter((event) => event.type === 'trial-started' || event.type === 'trial-applied')
      .map((event) => [event.type, event.payload.round]);
    expect(rounds).toEqual([
      ['trial-started', 0],
      ['trial-applied', 0],
      ['trial-started', 1],
      ['trial-applied', 1],
    ]);
  });
});

describe('a failed re-apply aborts as well', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  /**
   * Round 1 has already applied `aaaa` on / `bbbb` off. Moving the user's state behind
   * the panel's back makes the retry's re-apply do real work, which is what the failure
   * predicate needs in order to fire on the retry rather than on the first apply.
   */
  async function atRetriableRound(h: Harness): Promise<void> {
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    await applyTrial(h.dependencies);
    await h.surface.setEnabled('aaaa', false);
  }

  it('aborts a retry instead of reporting the batch as applied', async () => {
    const h = harness();
    await atRetriableRound(h);
    h.arm((id, enabled) => (id === 'aaaa' && enabled ? new Error('kCannotReEnableGreylistedError') : null));

    const retried = await retryTrial(h.dependencies, { reason: 'could not reproduce' });

    expect(retried.status).toBe('paused');
    expect(retried.pause?.reason).toBe('toggle-failed');
    expect(retried.currentTrial?.errors[0]).toMatchObject({
      extensionId: 'aaaa',
      code: 'manual-recovery-required',
    });
  });

  it('reports the failing extension from the retry in the mapper vocabulary', async () => {
    const h = harness();
    await atRetriableRound(h);
    h.arm((id, enabled) => (id === 'aaaa' && enabled ? new Error('kGestureNeededForEscalationError') : null));

    const retried = await retryTrial(h.dependencies);

    expect(retried.status).toBe('paused');
    expect(retried.currentTrial?.errors[0]).toMatchObject({
      extensionId: 'aaaa',
      code: 'needs-user-gesture',
    });
  });
});

describe('restore after a greylisted failure', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  /**
   * The abort rolled `bbbb` back, so `aaaa` is the only id still off. Making its
   * re-enable fail with the greylist code is the exact path the SPEC says must never
   * be reported as a complete restore.
   */
  async function abortedAfterPolicyFailure(): Promise<Harness> {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    h.arm((id) => (id === 'aaaa' ? new Error('blocked by policy') : null));
    await applyTrial(h.dependencies);
    return h;
  }

  it('reports the greylist code per id and leaves the restore incomplete', async () => {
    const h = await abortedAfterPolicyFailure();
    h.arm((id, enabled) => (id === 'aaaa' && enabled ? new Error('kCannotReEnableGreylistedError') : null));

    await resetSession(h.dependencies, { restore: true });

    const reset = (await readBisectLog())?.events.at(-1);
    expect(reset?.type).toBe('session-reset');
    expect(reset?.payload).toMatchObject({
      restored: false,
      errors: [{ extensionId: 'aaaa', code: 'manual-recovery-required' }],
    });
    expect(await states(h.surface, ['aaaa', 'bbbb'])).toEqual({ aaaa: false, bbbb: true });
  });

  it('never upgrades a manual-recovery-required id to a complete restore', async () => {
    const h = await abortedAfterPolicyFailure();
    h.arm((id, enabled) => (id === 'aaaa' && enabled ? new Error('kCannotReEnableGreylistedError') : null));

    const view = await resetSession(h.dependencies, { restore: true });

    expect(view.status).toBe('restored');
    expect((await readBisectLog())?.events.at(-1)?.payload).toMatchObject({ restored: false });
  });
});

describe('the abort view survives rehydration', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('keeps the pause and its rollback after re-reading the log', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    h.arm((id) => (id === 'aaaa' ? new Error('blocked by policy') : null));
    await applyTrial(h.dependencies);

    const rehydrated = await view();

    expect(rehydrated?.status).toBe('paused');
    expect(rehydrated?.pause?.reason).toBe('toggle-failed');
    expect(rehydrated?.pause?.rollback).toEqual({ restoredIds: [], errors: [] });
    expect(rehydrated?.currentTrial?.errors[0]).toMatchObject({ code: 'policy-blocked' });
  });
});
