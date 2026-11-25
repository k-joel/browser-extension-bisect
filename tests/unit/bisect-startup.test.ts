import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort, SessionView } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  getSession,
  reconcileStartup,
  resetSession,
  resetSessionQueue,
  resumeSession,
  type SessionDependencies,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { raiseStartupSignal } from '@/utils/bisect/startup';
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
      newSessionId: () => 'session-startup',
    },
  };
}

/** Baseline applied and answered `gone`, so the session is mid-search at trial 1's plan. */
async function atFirstPlan(h: Harness): Promise<void> {
  await startSession(h.dependencies, {
    candidateIds: THREE.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: null,
  });
  await submitVerdict(h.dependencies, { verdict: 'gone' });
  await applyTrial(h.dependencies);
}

/** Records the browser start the way `runtime.onStartup` would, at the log's current shape. */
async function restartBrowser(): Promise<void> {
  const log = await readBisectLog();
  await raiseStartupSignal({ sessionId: log?.sessionId ?? null, eventCount: log?.events.length ?? 0 });
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

describe('startup reconciliation', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('offers resume and restore for a session a restart interrupted mid-flight', async () => {
    const h = harness();
    await atFirstPlan(h);
    await restartBrowser();

    const reconciliation = await reconcileStartup(h.dependencies);

    expect(reconciliation?.offers).toEqual(['resume', 'restore']);
    expect(reconciliation?.restarted).toBe(true);
    expect(reconciliation?.inFlight).toBe(true);
    expect(reconciliation?.status).toBe('awaiting-verdict');
    expect(reconciliation?.restorePending).toBe(true);
    expect(reconciliation?.touchedCount).toBeGreaterThan(0);
  });

  it('offers only restore for a completed session whose restore is still pending', async () => {
    const h = harness();
    await startSession(h.dependencies, {
      candidateIds: [ALPHA.id],
      baselineMode: 'auto',
      testTab: null,
    });
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    expect((await view())?.status).toBe('completed');
    await restartBrowser();

    const reconciliation = await reconcileStartup(h.dependencies);

    expect(reconciliation?.status).toBe('completed');
    expect(reconciliation?.offers).toEqual(['restore']);
    expect(reconciliation?.inFlight).toBe(false);
    expect(reconciliation?.restorePending).toBe(true);
  });

  it('offers nothing once the session was restored', async () => {
    const h = harness();
    await atFirstPlan(h);
    await resetSession(h.dependencies, { restore: true });
    await restartBrowser();

    const reconciliation = await reconcileStartup(h.dependencies);

    expect(reconciliation?.status).toBe('restored');
    expect(reconciliation?.offers).toEqual([]);
    expect(reconciliation?.restorePending).toBe(false);
  });

  it('offers nothing when no log exists', async () => {
    const h = harness();
    await restartBrowser();

    await expect(reconcileStartup(h.dependencies)).resolves.toBeNull();
  });

  it('offers nothing without a recorded browser start, so a live session is not interrupted', async () => {
    const h = harness();
    await atFirstPlan(h);

    const reconciliation = await reconcileStartup(h.dependencies);

    expect(reconciliation?.status).toBe('awaiting-verdict');
    expect(reconciliation?.restarted).toBe(false);
  });

  it('never toggles an extension while reconciling', async () => {
    const h = harness();
    await atFirstPlan(h);
    await restartBrowser();
    const callsBefore = h.surface.setEnabledCalls.length;
    const logBefore = JSON.stringify(await readBisectLog());

    await reconcileStartup(h.dependencies);

    expect(h.surface.setEnabledCalls).toHaveLength(callsBefore);
    expect(JSON.stringify(await readBisectLog())).toBe(logBefore);
  });

  it('reports the drift between the log and the browser instead of correcting it', async () => {
    const h = harness();
    await atFirstPlan(h);
    await restartBrowser();
    const trial = (await view())?.currentTrial;
    const driftedId = trial?.disabledIds[0] as string;
    await h.surface.setEnabled(driftedId, true);
    const callsBefore = h.surface.setEnabledCalls.length;

    const reconciliation = await reconcileStartup(h.dependencies);

    expect(reconciliation?.drift?.inSync).toBe(false);
    expect(reconciliation?.drift?.pendingManualToggles).toContain(driftedId);
    expect(h.surface.setEnabledCalls).toHaveLength(callsBefore);
  });

  it('stops announcing the restart once the session has moved past it', async () => {
    const h = harness();
    await atFirstPlan(h);
    await restartBrowser();
    expect((await reconcileStartup(h.dependencies))?.restarted).toBe(true);

    await resumeSession(h.dependencies);

    expect((await reconcileStartup(h.dependencies))?.restarted).toBe(false);
  });
});

describe('startup resume', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('re-applies the state the log expects and records the resumption', async () => {
    const h = harness();
    await atFirstPlan(h);
    const trial = (await view())?.currentTrial;
    const expectedDisabled = trial?.disabledIds[0] as string;
    await h.surface.setEnabled(expectedDisabled, true);

    const resumed = await resumeSession(h.dependencies);

    expect(resumed.status).toBe('awaiting-verdict');
    for (const id of trial?.disabledIds ?? []) {
      expect(h.surface.setEnabledCalls.some((call) => call.id === id && call.enabled === false)).toBe(true);
    }
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('session-resumed');
  });

  it('refuses to resume a session that already reached a terminal outcome', async () => {
    const h = harness();
    await startSession(h.dependencies, { candidateIds: [ALPHA.id], baselineMode: 'auto', testTab: null });
    await submitVerdict(h.dependencies, { verdict: 'gone' });

    await expect(resumeSession(h.dependencies)).rejects.toThrow(/Nothing is left to resume/);
  });

  it('refuses to resume when no session exists', async () => {
    const h = harness();

    await expect(resumeSession(h.dependencies)).rejects.toThrow(/No active session/);
  });
});
