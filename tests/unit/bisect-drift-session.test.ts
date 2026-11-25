import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { DriftReport, ManagementPort, SessionView } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import {
  applyTrial,
  confirmManualState,
  getSession,
  resetSessionQueue,
  resyncSession,
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
      newSessionId: () => 'session-drift',
    },
  };
}

async function userToggles(surface: FakeManagement, states: Record<string, boolean>): Promise<void> {
  for (const [id, enabled] of Object.entries(states)) await surface.setEnabled(id, enabled);
}

async function eventTypes(): Promise<string[]> {
  return (await readBisectLog())?.events.map((event) => event.type) ?? [];
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

/**
 * Five candidates answered `persists` once, stopped on trial 2. Trial 1 disabled the
 * tail pair (`dddd`, `eeee`); `persists` clears the enabled trio and trial 2 enables
 * those again beside `aaaa`/`bbbb` while disabling `cccc` alone. That makes
 * `dddd`/`eeee` genuinely *outside* the current trial, which is the category an
 * "unexpected toggle" needs; `cccc` is inside it and is a pending toggle.
 */
async function atSecondTrial(): Promise<Harness> {
  const h = harness(FIVE, true);
  await startSession(h.dependencies, {
    candidateIds: FIVE.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: null,
  });
  await submitVerdict(h.dependencies, { verdict: 'gone' });
  await applyTrial(h.dependencies);
  await submitVerdict(h.dependencies, { verdict: 'persists' });
  await applyTrial(h.dependencies);
  return h;
}

describe('drift pauses before applying a trial', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('pauses with the drift report and refuses to apply the next partition', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false });

    await expect(applyTrial(h.dependencies)).rejects.toThrow(/does not match this batch yet/);

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(paused?.pause?.reason).toBe('drift');
    expect(paused?.pause?.drift?.unexpectedToggles).toEqual(['dddd']);
    expect(await eventTypes()).toEqual([
      'session-started',
      'trial-started',
      'trial-applied',
      'baseline-recorded',
      'trial-started',
      'trial-applied',
      'verdict-recorded',
      'trial-started',
      'trial-applied',
      'session-paused',
    ]);
  });

  it('records the expected and actual maps on the pause event', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false });

    await expect(applyTrial(h.dependencies)).rejects.toThrow();

    const paused = (await readBisectLog())?.events.at(-1);
    expect(paused?.type).toBe('session-paused');
    const drift = ((paused?.payload ?? {}) as { drift: DriftReport }).drift;
    expect(drift.expected).toEqual({
      dddd: true,
      eeee: true,
      aaaa: true,
      bbbb: true,
      cccc: false,
    });
    expect(drift.actual).toMatchObject({ dddd: false, aaaa: true, cccc: false });
    expect(drift.inSync).toBe(false);
  });

  it('reports an in-trial mismatch in the pending category while the automated rail waits', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { cccc: true });

    await expect(applyTrial(h.dependencies)).rejects.toThrow();

    const paused = await view();
    expect(paused?.pause?.drift?.pendingManualToggles).toEqual(['cccc']);
    expect(paused?.pause?.drift?.unexpectedToggles).toEqual([]);
  });

  it('applies the next trial unchanged while the state is consistent', async () => {
    const h = await atSecondTrial();

    const next = await applyTrial(h.dependencies);

    expect(next.status).toBe('awaiting-verdict');
    expect(next.currentTrial?.round).toBe(3);
    expect(await eventTypes()).not.toContain('session-paused');
  });

  it('keeps the append-only log intact across the pause', async () => {
    const h = await atSecondTrial();
    const before = await eventTypes();
    await userToggles(h.surface, { dddd: false });

    await expect(applyTrial(h.dependencies)).rejects.toThrow();

    const after = await eventTypes();
    expect(after.slice(0, before.length)).toEqual(before);
    expect(after.length).toBe(before.length + 1);
  });
});

describe('drift pauses before accepting a verdict', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('refuses the verdict and pauses instead of answering a stale batch', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false });

    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow(/does not match/);

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(paused?.currentTrial?.verdict).toBeNull();
    expect(paused?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(await eventTypes()).not.toContain('verdict-undone');
    expect((await readBisectLog())?.events.filter((event) => event.type === 'verdict-recorded')).toHaveLength(1);
  });

  it('accepts the verdict when the state still matches', async () => {
    const h = await atSecondTrial();

    const answered = await submitVerdict(h.dependencies, { verdict: 'persists' });

    expect(answered.status).toBe('awaiting-verdict');
    expect(answered.currentTrial?.verdict).toBe('persists');
    expect(await eventTypes()).not.toContain('session-paused');
  });

  it('pauses before the baseline verdict as well', async () => {
    const h = harness([ALPHA, BRAVO], true);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    await userToggles(h.surface, { aaaa: true });

    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow(/does not match/);

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(await eventTypes()).not.toContain('baseline-recorded');
  });
});

describe('re-sync after a pause', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('re-applies the expected state, resumes, and clears the pause', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false });
    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow();
    h.surface.setEnabledCalls.length = 0;

    const resumed = await resyncSession(h.dependencies);

    expect(resumed.status).toBe('awaiting-verdict');
    expect(resumed.pause).toBeNull();
    expect(h.surface.setEnabledCalls).toEqual([{ id: 'dddd', enabled: true }]);
    const last = (await readBisectLog())?.events.at(-1);
    expect(last?.type).toBe('session-resumed');
    expect(last?.payload).toEqual({ reason: 're-synced' });
  });

  it('lets the verdict through once the state is back', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false });
    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow();
    await resyncSession(h.dependencies);

    const answered = await submitVerdict(h.dependencies, { verdict: 'persists' });

    expect(answered.currentTrial?.verdict).toBe('persists');
    expect(await eventTypes()).toContain('session-resumed');
  });

  it('refuses a re-sync while the session is not paused', async () => {
    const h = await atSecondTrial();

    await expect(resyncSession(h.dependencies)).rejects.toThrow(/Cannot re-sync while the session is awaiting-verdict/);
  });

  it('re-parks an assisted pause in awaiting-manual-toggle so the user can match again', async () => {
    const h = harness([ALPHA, BRAVO, CHARLIE], false);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb', 'cccc'],
      baselineMode: 'manual',
      testTab: null,
    });
    await userToggles(h.surface, { aaaa: false, bbbb: false, cccc: false });
    await confirmManualState(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    await applyTrial(h.dependencies);
    await userToggles(h.surface, { aaaa: true, bbbb: true });
    await confirmManualState(h.dependencies);
    // The user re-enabled the candidate trial 2 needs off, then pressed a verdict.
    await userToggles(h.surface, { cccc: true });

    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow(/does not match/);
    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(paused?.pause?.drift?.inSync).toBe(false);
    expect(paused?.pause?.drift?.actual).toEqual({ aaaa: true, bbbb: true, cccc: true });
    expect(paused?.pause?.drift?.expected).toEqual({ aaaa: true, bbbb: true, cccc: false });

    const resumed = await resyncSession(h.dependencies);

    expect(resumed.status).toBe('awaiting-manual-toggle');
    expect(resumed.pause).toBeNull();
    expect(resumed.manualBatch).toEqual({ enableIds: ['aaaa', 'bbbb'], disableIds: ['cccc'] });
  });
});

describe('paused session rehydrates after a panel close', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('reports the paused screen and its drift from the log alone', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false, cccc: true });

    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow();

    // A reopened panel has no in-memory state: everything below comes from the log.
    const rehydrated = await view();

    expect(rehydrated?.status).toBe('paused');
    expect(rehydrated?.pause?.reason).toBe('drift');
    expect(rehydrated?.pause?.drift).toMatchObject({
      pendingManualToggles: ['cccc'],
      unexpectedToggles: ['dddd'],
      missingIds: [],
      inSync: false,
    });
  });

  it('resumes with the same trial round and suspect pool after the remount', async () => {
    const h = await atSecondTrial();
    await userToggles(h.surface, { dddd: false });
    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow();

    await resyncSession(h.dependencies);
    const resumed = await view();

    expect(resumed?.status).toBe('awaiting-verdict');
    expect(resumed?.currentTrial?.round).toBe(2);
    expect(resumed?.suspects).toEqual(['aaaa', 'bbbb', 'cccc']);
    expect(resumed?.trials.at(-1)?.verdict).toBeNull();
  });
});
