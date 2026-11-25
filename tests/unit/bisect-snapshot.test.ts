import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort, SessionView, SnapshotChange } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  createSnapshotWatcher,
  detectSnapshotChanges,
  getSession,
  recordSnapshotPause,
  resetSession,
  resetSessionQueue,
  restartSession,
  type SessionDependencies,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { snapshotChanges } from '@/utils/bisect/snapshot';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha', version: '1.0.0' };
const BRAVO = { id: 'bbbb', name: 'Bravo', version: '1.0.0' };
const CHARLIE = { id: 'cccc', name: 'Charlie', version: '1.0.0' };
const DELTA = { id: 'dddd', name: 'Delta', version: '1.0.0' };

const FOUR = [ALPHA, BRAVO, CHARLIE, DELTA];

interface Harness {
  port: ManagementPort;
  surface: FakeManagement;
  dependencies: SessionDependencies;
  reloads: number[];
}

function harness(installs: { id: string; name: string; version?: string; enabled?: boolean }[]): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      ...installs.map((entry) =>
        makeExtensionInfo({
          id: entry.id,
          name: entry.name,
          version: entry.version ?? '1.0.0',
          enabled: entry.enabled ?? true,
        }),
      ),
      SELF,
    ],
  });
  const reloads: number[] = [];
  const port = createChromePort({ management: surface });
  let sessionCounter = 0;
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
      now: () => 2_000,
      newSessionId: () => {
        sessionCounter += 1;
        return `session-snapshot-${sessionCounter}`;
      },
    },
  };
}

async function eventTypes(): Promise<string[]> {
  return (await readBisectLog())?.events.map((event) => event.type) ?? [];
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

/** The session past the baseline, parked on the answered baseline question. */
async function atFirstTrialPlan(h: Harness): Promise<void> {
  await startSession(h.dependencies, {
    candidateIds: FOUR.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: null,
  });
  await submitVerdict(h.dependencies, { verdict: 'gone' });
}

describe('snapshotChanges', () => {
  it('reports an install that was never in the snapshot without touching the order', () => {
    const snapshot = FOUR.map((entry) => ({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      description: '',
      enabledAtStart: true,
      mayDisable: true,
      installType: 'normal',
      type: 'extension' as const,
      icons: [],
    }));

    const changes = snapshotChanges(snapshot, [
      ...FOUR.map((entry) => ({ id: entry.id, name: entry.name, version: entry.version, enabled: true })),
      { id: 'ffff', name: 'Foxtrot', version: '0.1.0', enabled: true },
    ]);

    expect(changes).toEqual([
      {
        kind: 'installed',
        extensionId: 'ffff',
        name: 'Foxtrot',
        snapshotVersion: null,
        currentVersion: '0.1.0',
      },
    ]);
    expect(snapshot.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'cccc', 'dddd']);
  });

  it('reports an update with both versions and a removal with no current version', () => {
    const snapshot = FOUR.map((entry) => ({
      id: entry.id,
      name: entry.name,
      version: entry.version,
      description: '',
      enabledAtStart: true,
      mayDisable: true,
      installType: 'normal',
      type: 'extension' as const,
      icons: [],
    }));

    const changes = snapshotChanges(snapshot, [
      { id: 'aaaa', name: 'Alpha', version: '2.0.0', enabled: true },
      { id: 'bbbb', name: 'Bravo', version: '1.0.0', enabled: true },
      { id: 'cccc', name: 'Charlie', version: '1.0.0', enabled: false },
    ]);

    expect(changes).toEqual([
      { kind: 'updated', extensionId: 'aaaa', name: 'Alpha', snapshotVersion: '1.0.0', currentVersion: '2.0.0' },
      { kind: 'removed', extensionId: 'dddd', name: 'Delta', snapshotVersion: '1.0.0', currentVersion: null },
    ]);
  });
});

describe('an extension installed mid-session', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('never joins the snapshot and leaves the suspects and cleared pools alone', async () => {
    const h = harness(FOUR);
    await startSession(h.dependencies, {
      candidateIds: FOUR.map((entry) => entry.id),
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    const before = await view();

    const foxtrot = makeExtensionInfo({ id: 'ffff', name: 'Foxtrot', version: '0.1.0' });
    h.surface.emitInstalled(foxtrot);

    const after = await view();
    expect(after?.candidateOrder.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'cccc', 'dddd']);
    expect(after?.suspects).toEqual(before?.suspects);
    expect(after?.cleared).toEqual(before?.cleared);
    expect(after?.changes).toEqual([]);
  });

  it('does not pause the session for an install', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);

    h.surface.emitInstalled(makeExtensionInfo({ id: 'ffff', name: 'Foxtrot', version: '0.1.0' }));
    const applied = await applyTrial(h.dependencies);

    expect(applied.status).toBe('awaiting-verdict');
    expect(applied.pause).toBeNull();
    expect(await eventTypes()).not.toContain('session-paused');
  });

  it('still reports the install as a warning beside the unchanged snapshot', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    h.surface.installExtension(makeExtensionInfo({ id: 'ffff', name: 'Foxtrot', version: '0.1.0' }));

    const changes = await detectFor(h);

    expect(changes).toEqual([
      { kind: 'installed', extensionId: 'ffff', name: 'Foxtrot', snapshotVersion: null, currentVersion: '0.1.0' },
    ]);
    expect((await view())?.candidateOrder.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'cccc', 'dddd']);
  });

  async function detectFor(h: Harness): Promise<SnapshotChange[]> {
    const current = await view();
    if (current === null) throw new Error('no session');
    return detectSnapshotChanges(h.dependencies, current);
  }
});

describe('an updated candidate mid-session', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('pauses the session with a warning and refuses the next verdict', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    await applyTrial(h.dependencies);

    h.surface.setVersion('aaaa', '2.0.0');

    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow(/changed under this session/);

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(paused?.pause?.reason).toBe('snapshot-changed');
    expect(paused?.pause?.changes).toEqual([
      { kind: 'updated', extensionId: 'aaaa', name: 'Alpha', snapshotVersion: '1.0.0', currentVersion: '2.0.0' },
    ]);
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('session-paused');
  });

  it('leaves the candidate order and the suspect pool untouched', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    await applyTrial(h.dependencies);
    const before = await view();

    h.surface.setVersion('bbbb', '3.0.0');

    await expect(applyTrial(h.dependencies)).rejects.toThrow(/changed under this session/);

    const paused = await view();
    expect(paused?.candidateOrder.map((entry) => entry.id)).toEqual(before?.candidateOrder.map((entry) => entry.id));
    expect(paused?.suspects).toEqual(before?.suspects);
    expect(paused?.cleared).toEqual(before?.cleared);
    expect(paused?.pause?.changes.map((change) => change.extensionId)).toEqual(['bbbb']);
  });
});

describe('a removed candidate mid-session', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('pauses with the removal and invalidates the open trial', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    await applyTrial(h.dependencies);
    const before = await view();
    const openRound = before?.currentTrial?.round ?? null;
    const verdictsBefore = (await readBisectLog())?.events.filter((event) => event.type === 'verdict-recorded');

    h.surface.removeExtension('cccc');

    await expect(submitVerdict(h.dependencies, { verdict: 'persists' })).rejects.toThrow(/no longer installed/);

    const paused = await view();
    expect(paused?.status).toBe('paused');
    expect(paused?.pause?.reason).toBe('snapshot-changed');
    expect(paused?.pause?.changes).toEqual([
      { kind: 'removed', extensionId: 'cccc', name: 'Charlie', snapshotVersion: '1.0.0', currentVersion: null },
    ]);
    expect(paused?.currentTrial?.round).toBe(openRound);
    expect(paused?.currentTrial?.verdict).toBeNull();
    const verdictsAfter = (await readBisectLog())?.events.filter((event) => event.type === 'verdict-recorded');
    expect(verdictsAfter).toHaveLength(verdictsBefore?.length ?? 0);
  });

  it('keeps the removal out of the candidate order so restore still knows about it', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    await applyTrial(h.dependencies);

    h.surface.removeExtension('cccc');
    await expect(applyTrial(h.dependencies)).rejects.toThrow(/no longer installed/);

    const paused = await view();
    expect(paused?.candidateOrder.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'cccc', 'dddd']);
    expect(paused?.originalEnabledIds).toEqual(['aaaa', 'bbbb', 'cccc', 'dddd']);
  });

  it('restores the touched candidates and records the outcome after a removal', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    await applyTrial(h.dependencies);
    h.surface.removeExtension('cccc');
    await expect(applyTrial(h.dependencies)).rejects.toThrow();

    const restored = await resetSession(h.dependencies, { restore: true });

    expect(restored.status).toBe('restored');
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('session-reset');
  });
});

describe('the mid-session watcher', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('reports only the pausing kinds, so an install never reaches the pause path', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    const seen: SnapshotChange[][] = [];
    const stop = createSnapshotWatcher({ dependencies: h.dependencies, onChange: (changes) => seen.push(changes) });

    h.surface.emitInstalled(makeExtensionInfo({ id: 'ffff', name: 'Foxtrot', version: '0.1.0' }));
    await flushMicrotasks();
    expect(seen).toEqual([]);

    h.surface.removeExtension('dddd');
    h.surface.emitUninstalled('dddd');
    await flushMicrotasks();
    stop();

    expect(seen).toHaveLength(1);
    expect(seen[0]?.map((change) => change.kind)).toEqual(['removed']);
    expect((await readBisectLog())?.events.at(-1)?.type).not.toBe('session-paused');
  });

  it('records the pause through the serialized queue and refuses a second one', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    const changes: SnapshotChange[] = [
      { kind: 'removed', extensionId: 'dddd', name: 'Delta', snapshotVersion: '1.0.0', currentVersion: null },
    ];

    const paused = await recordSnapshotPause(h.dependencies, changes);
    expect(paused?.status).toBe('paused');

    const types = await eventTypes();
    const again = await recordSnapshotPause(h.dependencies, changes);

    expect(again?.status).toBe('paused');
    expect(await eventTypes()).toEqual(types);
  });

  it('never pauses a session it has nothing to report about', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);

    const result = await recordSnapshotPause(h.dependencies, []);

    expect(result?.status).not.toBe('paused');
    expect(await eventTypes()).not.toContain('session-paused');
  });
});

describe('restart with a fresh snapshot', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('restores the previous session, starts a new one, and re-reads the candidate list', async () => {
    const h = harness(FOUR);
    await atFirstTrialPlan(h);
    await applyTrial(h.dependencies);
    h.surface.removeExtension('cccc');
    await expect(applyTrial(h.dependencies)).rejects.toThrow();
    const previousSessionId = (await readBisectLog())?.sessionId;

    const restarted = await restartSession(h.dependencies);

    expect(restarted.sessionId).not.toBe(previousSessionId);
    expect(restarted.candidateOrder.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'dddd']);
    expect(restarted.changes).toEqual([]);
    expect(restarted.status).toBe('awaiting-verdict');
    expect(restarted.currentTrial?.round).toBe(0);
    const events = (await readBisectLog())?.events ?? [];
    expect(events[0]?.type).toBe('session-started');
    expect(events.filter((event) => event.type === 'session-started')).toHaveLength(1);
  });

  it('re-enables the previous candidates before snapshotting the new all-off baseline', async () => {
    const h = harness([ALPHA, BRAVO]);
    await startSession(h.dependencies, {
      candidateIds: ['aaaa', 'bbbb'],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    h.surface.setEnabledCalls.length = 0;

    await restartSession(h.dependencies);

    const reenabled = h.surface.setEnabledCalls.filter((call) => call.enabled && call.id !== 'ffff');
    expect(reenabled.map((call) => call.id).sort()).toEqual(['aaaa', 'bbbb']);
  });

  it('refuses a restart with no session to restart', async () => {
    const h = harness(FOUR);

    await expect(restartSession(h.dependencies)).rejects.toThrow(/No session to restart/);
  });
});

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 12; index += 1) await Promise.resolve();
}
