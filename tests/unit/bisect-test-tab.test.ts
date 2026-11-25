import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { testTabPromptOf } from '@/entrypoints/sidepanel/presentation';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { SessionView } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  getSession,
  resetSessionQueue,
  retryTrial,
  type SessionDependencies,
  startSession,
  submitVerdict,
  type TestTabSurface,
} from '@/utils/bisect/session';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha' };
const BRAVO = { id: 'bbbb', name: 'Bravo' };
const CHARLIE = { id: 'cccc', name: 'Charlie' };

const THREE = [ALPHA, BRAVO, CHARLIE];

interface TabsScript {
  reload?(tabId: number): Promise<void>;
  waitForComplete?(tabId: number): Promise<boolean>;
}

interface Harness {
  dependencies: SessionDependencies;
  reloads: number[];
}

function harness(tabs: TabsScript = {}): Harness {
  const management = createFakeManagement({
    self: SELF,
    extensions: [...THREE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
  });
  const reloads: number[] = [];
  const surface: TestTabSurface = {
    reload: async (tabId: number) => {
      reloads.push(tabId);
      await tabs.reload?.(tabId);
    },
    waitForComplete: async (tabId: number) => tabs.waitForComplete?.(tabId) ?? true,
  };
  return {
    reloads,
    dependencies: {
      port: createChromePort({ management }),
      tabs: surface,
      now: () => 3_000,
      newSessionId: () => 'session-tabs',
    },
  };
}

async function view(): Promise<SessionView | null> {
  return getSession();
}

async function startWithTab(dependencies: SessionDependencies, tabId = 7): Promise<SessionView> {
  return startSession(dependencies, {
    candidateIds: THREE.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: { tabId, url: null },
  });
}

describe('a closed test tab', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('records the closed tab on the trial and still asks the baseline verdict', async () => {
    const h = harness({
      reload: async () => {
        throw new Error('No tab with id: 7.');
      },
    });

    const started = await startWithTab(h.dependencies);

    expect(started.status).toBe('awaiting-verdict');
    expect(started.currentTrial?.testTab).toEqual({ status: 'closed', tabId: 7 });
    expect(started.pause).toBeNull();
  });

  it('accepts the verdict without a reload, so the prompt never blocks it', async () => {
    const h = harness({
      reload: async () => {
        throw new Error('No tab with id: 7.');
      },
    });
    await startWithTab(h.dependencies);

    const answered = await submitVerdict(h.dependencies, { verdict: 'gone' });

    expect(answered.status).toBe('awaiting-verdict');
    expect(answered.currentTrial?.round).toBe(0);
    expect(answered.currentTrial?.verdict).toBe('gone');
    expect((await readBisectLog())?.events.map((event) => event.type)).toContain('baseline-recorded');
  });

  it('keeps the closed tab on the trial after a panel remount, so the prompt still shows', async () => {
    const h = harness({
      reload: async () => {
        throw new Error('No tab with id: 7.');
      },
    });
    await startWithTab(h.dependencies);

    const rehydrated = await view();

    expect(rehydrated?.currentTrial?.testTab?.status).toBe('closed');
    expect(testTabPromptOf(rehydrated as SessionView)).toMatchObject({ kind: 'closed', tabId: 7 });
  });

  it('does not stop the search from continuing through the next trial', async () => {
    const h = harness({
      reload: async () => {
        throw new Error('No tab with id: 7.');
      },
    });
    await startWithTab(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'gone' });

    const applied = await applyTrial(h.dependencies);

    expect(applied.status).toBe('awaiting-verdict');
    expect(applied.currentTrial?.round).toBe(1);
    expect(applied.currentTrial?.testTab).toEqual({ status: 'closed', tabId: 7 });
    expect((await submitVerdict(h.dependencies, { verdict: 'gone' })).status).toBe('completed');
  });

  it('offers the rebind prompt only while the verdict is still open', async () => {
    const h = harness({
      reload: async () => {
        throw new Error('No tab with id: 7.');
      },
    });
    await startWithTab(h.dependencies);
    expect(testTabPromptOf((await view()) as SessionView)).not.toBeNull();

    const answered = await submitVerdict(h.dependencies, { verdict: 'persists' });

    expect(testTabPromptOf(answered)).toBeNull();
  });
});

describe('a test tab that never settles', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('falls back to the manual-reload hint instead of waiting forever', async () => {
    const h = harness({ waitForComplete: async () => false });

    const started = await startWithTab(h.dependencies);

    expect(started.status).toBe('awaiting-verdict');
    expect(started.currentTrial?.testTab).toEqual({ status: 'unsettled', tabId: 7 });
    expect(testTabPromptOf(started)).toMatchObject({ kind: 'unsettled', tabId: 7 });
  });

  it('does not block the verdict', async () => {
    const h = harness({ waitForComplete: async () => false });
    await startWithTab(h.dependencies);

    const answered = await submitVerdict(h.dependencies, { verdict: 'gone' });
    const applied = await applyTrial(h.dependencies);
    const answeredAgain = await submitVerdict(h.dependencies, { verdict: 'gone' });

    expect(answered.currentTrial?.verdict).toBe('gone');
    expect(applied.currentTrial?.testTab?.status).toBe('unsettled');
    expect(answeredAgain.status).toBe('completed');
  });

  it('allows a retry, which re-runs the reload and records the hint again', async () => {
    const h = harness({ waitForComplete: async () => false });
    await startWithTab(h.dependencies);
    await submitVerdict(h.dependencies, { verdict: 'gone' });
    await applyTrial(h.dependencies);

    const retried = await retryTrial(h.dependencies, {});

    expect(retried.currentTrial?.testTab?.status).toBe('unsettled');
    expect((await readBisectLog())?.events.map((event) => event.type)).toContain('trial-retried');
  });
});

describe('an ordinary reload', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
  });

  it('records no hint, so the log does not grow for a tab that settled', async () => {
    const h = harness();

    const started = await startWithTab(h.dependencies);

    expect(started.currentTrial?.testTab).toBeNull();
    expect(testTabPromptOf(started)).toBeNull();
    expect(h.reloads).toEqual([7]);
    const applications = (await readBisectLog())?.events.filter((event) => event.type === 'trial-applied');
    expect(applications).toHaveLength(1);
  });

  it('records no hint when no tab is bound at all', async () => {
    const h = harness();

    const started = await startSession(h.dependencies, {
      candidateIds: THREE.map((entry) => entry.id),
      baselineMode: 'auto',
      testTab: null,
    });

    expect(started.currentTrial?.testTab).toBeNull();
    expect(h.reloads).toEqual([]);
  });
});
