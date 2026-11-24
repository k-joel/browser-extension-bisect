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
    expect(types.at(-1)).toBe('verdict-recorded');
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
