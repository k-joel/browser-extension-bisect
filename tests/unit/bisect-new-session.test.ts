// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  getSession,
  resetSession,
  resetSessionQueue,
  startNewSession,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };

interface Harness {
  surface: FakeManagement;
  port: ManagementPort;
  dependencies: Parameters<typeof startSession>[0];
}

let sessionSeq = 0;

function createHarness(installs: { id: string; name: string }[] = [ALPHA, BRAVO]): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [...installs.map((install) => makeExtensionInfo({ id: install.id, name: install.name })), SELF],
  });
  const dependencies = {
    port: createChromePort({ management: surface }),
    tabs: { reload: async () => undefined, waitForComplete: async () => true },
    now: () => 1_000,
    newSessionId: () => {
      sessionSeq += 1;
      return `session-${sessionSeq}`;
    },
  };
  return { surface, port: dependencies.port, dependencies };
}

async function toCompleted(harness: Harness): Promise<void> {
  await startSession(harness.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
  await submitVerdict(harness.dependencies, { verdict: 'gone' });
  await applyTrial(harness.dependencies);
  await submitVerdict(harness.dependencies, { verdict: 'gone' });
}

/**
 * A finished session must not be the end of the line. SPEC §Session lifecycle allows
 * `completed|inconclusive|aborted → restored, new session` and `restored → preparing`;
 * the replacement log is the only way back to the picker.
 */
describe('starting a new session', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    sessionSeq = 0;
  });

  it('refuses to replace a live session, so one session stays active', async () => {
    const harness = createHarness();
    await startSession(harness.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
    const before = await readBisectLog();

    await expect(startNewSession(harness.dependencies)).rejects.toThrow(/cannot replace it yet/);

    expect((await readBisectLog())?.sessionId).toBe(before?.sessionId);
    await expect(getSession()).resolves.toMatchObject({ status: 'awaiting-verdict' });
  });

  it('refuses to leave a disabled extension behind: the restore comes first', async () => {
    const harness = createHarness();
    await toCompleted(harness);
    expect(harness.surface.setEnabledCalls.length).toBeGreaterThan(0);

    await expect(startNewSession(harness.dependencies)).rejects.toThrow(/Restore the extensions/);

    await expect(getSession()).resolves.toMatchObject({ status: 'completed' });
  });

  it('writes a new empty log from a restored session and leaves nothing live', async () => {
    const harness = createHarness();
    await toCompleted(harness);
    const finished = await readBisectLog();
    await resetSession(harness.dependencies, { restore: true });

    await expect(startNewSession(harness.dependencies)).resolves.toBeNull();

    const next = await readBisectLog();
    expect(next?.sessionId).not.toBe(finished?.sessionId);
    expect(next?.events).toEqual([]);
    await expect(getSession()).resolves.toBeNull();
  });

  it('accepts the terminal audit state the panel renders after a restore', async () => {
    const harness = createHarness([ALPHA]);
    await startSession(harness.dependencies, { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });
    await submitVerdict(harness.dependencies, { verdict: 'persists' });
    await expect(getSession()).resolves.toMatchObject({ status: 'aborted', abortReason: 'host-issue' });

    await expect(startNewSession(harness.dependencies)).resolves.toBeNull();
    await expect(getSession()).resolves.toBeNull();
  });

  it('toggles nothing when it replaces the log', async () => {
    const harness = createHarness();
    await toCompleted(harness);
    await resetSession(harness.dependencies, { restore: true });
    harness.surface.setEnabledCalls.length = 0;

    await startNewSession(harness.dependencies);

    expect(harness.surface.setEnabledCalls).toEqual([]);
  });
});

/**
 * The panel seam: the picker is reachable only from `session === null`, so a terminal
 * screen that offers no way out is a dead end however correct the log is.
 */
describe('the terminal screens offer a new session', () => {
  const TABS = { reload: async () => undefined, waitForComplete: async () => true };

  function mountPanel(): { surface: FakeManagement; wrapper: ReturnType<typeof mount> } {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [
        makeExtensionInfo({ id: 'aaaa', name: 'Alpha Blocker' }),
        makeExtensionInfo({ id: 'bbbb', name: 'Bravo Reader' }),
        SELF,
      ],
    });
    registerBackgroundHandlers({ managementPort: createChromePort({ management: surface }), tabs: TABS });
    return { surface, wrapper: mount(App) };
  }

  function screenOf(wrapper: ReturnType<typeof mount>): string | undefined {
    return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
  }

  async function toCompletedScreen(wrapper: ReturnType<typeof mount>): Promise<void> {
    await wrapper.get('[data-testid="picker-start"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="preflight-start"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="trial-apply"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
  }

  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    sessionSeq = 0;
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('offers the action on the completed screen but holds it until the restore', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await toCompletedScreen(wrapper);

    expect(screenOf(wrapper)).toBe('completed');
    expect(wrapper.get('[data-testid="new-session-start"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="new-session-note"]').text()).toContain('Restore all extensions first');
  });

  it('lands on the picker with a new log after a restore', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await toCompletedScreen(wrapper);
    const finished = await readBisectLog();
    const finishedName = wrapper.get('[data-testid="culprit-name"]').text();

    await wrapper.get('[data-testid="completed-restore"]').trigger('click');
    await flushPromises();
    expect(screenOf(wrapper)).toBe('restored');
    expect(wrapper.get('[data-testid="new-session-start"]').attributes('disabled')).toBeUndefined();

    await wrapper.get('[data-testid="new-session-start"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('picker');
    expect(wrapper.findAll('[data-testid="candidate-row"]')).toHaveLength(2);
    expect(wrapper.find('[data-testid="culprit-name"]').exists()).toBe(false);
    const next = await readBisectLog();
    expect(next?.sessionId).not.toBe(finished?.sessionId);
    expect(next?.events).toEqual([]);
    expect(finishedName).toBe('Bravo Reader');
  });

  it('starts a fresh session from the picker that reaches a new session id', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await toCompletedScreen(wrapper);
    const first = await readBisectLog();
    await wrapper.get('[data-testid="completed-restore"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="new-session-start"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="picker-start"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="preflight-start"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('baseline');
    const second = await readBisectLog();
    expect(second?.sessionId).not.toBe(first?.sessionId);
    expect(second?.events[0]?.type).toBe('session-started');
    expect(second?.events.filter((event) => event.type === 'session-started')).toHaveLength(1);
  });

  it('offers the same way out of the inconclusive and host-issue screens', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await wrapper.get('[data-testid="picker-start"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="preflight-start"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('host-issue');
    expect(wrapper.find('[data-testid="new-session-start"]').exists()).toBe(true);

    await wrapper.get('[data-testid="new-session-start"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('picker');
    expect((await readBisectLog())?.events).toEqual([]);
  });
});
