import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort, SessionView } from '@/utils/bisect/domain';
import { BisectLogWriteError, readBisectLog, writeBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  getSession,
  resetSessionQueue,
  type SessionDependencies,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };
const CHARLIE = { id: 'cccc', name: 'Charlie Helper' };

const THREE = [ALPHA, BRAVO, CHARLIE];

interface Harness {
  port: ManagementPort;
  surface: FakeManagement;
  dependencies: SessionDependencies;
}

function harness(): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [...THREE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
  });
  return {
    surface,
    port: createChromePort({ management: surface }),
    dependencies: {
      port: createChromePort({ management: surface }),
      tabs: { reload: async () => undefined, waitForComplete: async () => true },
      now: () => 1_000,
      newSessionId: () => 'session-storage',
    },
  };
}

/**
 * Rejects the next `storage.local.set` the way a full disk or a revoked permission does.
 * The fake browser's writer is replaced rather than the item, so the rejection travels the
 * same path a real browser's would: `setValue` -> `driver.setItem` -> `storage.local.set`.
 */
function rejectNextWrite(message = 'QUOTA_BYTES quota exceeded'): () => void {
  const original = fakeBrowser.storage.local.set.bind(fakeBrowser.storage.local);
  let armed = true;
  fakeBrowser.storage.local.set = async (items: Record<string, unknown>) => {
    if (armed) {
      armed = false;
      throw new Error(message);
    }
    return original(items);
  };
  return () => {
    fakeBrowser.storage.local.set = original;
  };
}

function restoreNextWrite(restore: () => void): void {
  restore();
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

/** Baseline applied and answered `gone`, so a `verdict-recorded` is the next single write. */
async function atBaselineAnswered(h: Harness): Promise<void> {
  await startSession(h.dependencies, {
    candidateIds: THREE.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: null,
  });
}

describe('a rejected storage write', () => {
  let restorers: (() => void)[] = [];

  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    restorers = [];
  });

  afterEach(() => {
    for (const restore of restorers) restoreNextWrite(restore);
  });

  it('rejects the command and leaves the previous log byte-identical', async () => {
    const h = harness();
    await atBaselineAnswered(h);
    const before = JSON.stringify(await readBisectLog());

    restorers.push(rejectNextWrite());
    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow(/could not be saved/);

    expect(JSON.stringify(await readBisectLog())).toBe(before);
  });

  it('reports the storage failure rather than blaming the command', async () => {
    const h = harness();
    await atBaselineAnswered(h);

    restorers.push(rejectNextWrite('QUOTA_BYTES quota exceeded'));
    const failure = await submitVerdict(h.dependencies, { verdict: 'gone' }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(BisectLogWriteError);
    expect((failure as Error).message).toContain('QUOTA_BYTES quota exceeded');
    expect((failure as Error).message).toContain('previous log is unchanged');
  });

  it('leaves the session asking the same question it was asking before', async () => {
    const h = harness();
    await atBaselineAnswered(h);
    const before = await view();

    restorers.push(rejectNextWrite());
    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow();

    const after = await view();
    expect(after?.status).toBe(before?.status);
    expect(after?.currentTrial?.verdict).toBeNull();
    expect(after?.currentTrial?.round).toBe(before?.currentTrial?.round);
  });

  it('does not lose an event when the write is retried', async () => {
    const h = harness();
    await atBaselineAnswered(h);
    const before = (await readBisectLog())?.events.length ?? 0;

    restorers.push(rejectNextWrite());
    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow();

    const recorded = await submitVerdict(h.dependencies, { verdict: 'gone' });
    expect(recorded.status).toBe('awaiting-verdict');
    expect((await readBisectLog())?.events.length).toBe(before + 1);
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('baseline-recorded');
  });

  it('keeps a subsequent successful command working', async () => {
    const h = harness();
    await atBaselineAnswered(h);

    restorers.push(rejectNextWrite());
    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow();

    await submitVerdict(h.dependencies, { verdict: 'gone' });
    const applied = await applyTrial(h.dependencies);

    expect(applied.status).toBe('awaiting-verdict');
    expect(applied.currentTrial?.round).toBe(1);
  });

  it('rejects a start whose very first write fails without creating a session', async () => {
    const h = harness();

    restorers.push(rejectNextWrite());
    await expect(
      startSession(h.dependencies, {
        candidateIds: THREE.map((entry) => entry.id),
        baselineMode: 'auto',
        testTab: null,
      }),
    ).rejects.toThrow(/could not be saved/);

    expect(await readBisectLog()).toBeNull();
    expect(await view()).toBeNull();
  });

  it('names the log and the consequence in the message the panel shows', async () => {
    restorers.push(rejectNextWrite('disk is full'));

    await expect(writeBisectLog({ schemaVersion: 1, sessionId: 's', events: [] })).rejects.toThrow(
      /The bisect log could not be saved \(disk is full\)\. The previous log is unchanged\./,
    );
  });

  it('does not write a partial log when the write fails half-way through a session', async () => {
    const h = harness();
    await atBaselineAnswered(h);
    const before = await readBisectLog();

    restorers.push(rejectNextWrite());
    await expect(submitVerdict(h.dependencies, { verdict: 'gone' })).rejects.toThrow();

    const after = await readBisectLog();
    expect(after?.sessionId).toBe(before?.sessionId);
    expect(after?.events).toEqual(before?.events);
  });
});
