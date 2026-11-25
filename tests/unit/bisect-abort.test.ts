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
  abortSession,
  applyTrial,
  getSession,
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

/** Baseline applied and answered `gone`, so two candidates are touched and still off. */
async function midSearch(harness: Harness): Promise<void> {
  await startSession(harness.dependencies, { candidateIds: ['aaaa', 'bbbb'], baselineMode: 'auto', testTab: null });
  await submitVerdict(harness.dependencies, { verdict: 'gone' });
}

async function lastResetEvent() {
  const log = await readBisectLog();
  return log?.events.at(-1) ?? null;
}

/**
 * SPEC §Error handling, `User aborts`: the UI asks "Restore all?" with yes as the
 * default and records the decision. Both answers have to be honoured and auditable:
 * yes re-enables what the session touched, no leaves the browser exactly as it is and
 * says so in the log, so the next reader is not told a restore happened.
 */
describe('aborting a session', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    sessionSeq = 0;
  });

  it('restores every touched candidate and records a real restore when the answer is yes', async () => {
    const harness = createHarness();
    await midSearch(harness);
    harness.surface.setEnabledCalls.length = 0;

    const view = await abortSession(harness.dependencies, { restore: true });

    expect(view.status).toBe('restored');
    expect(view.restorePending).toBe(false);
    expect(harness.surface.setEnabledCalls.map((call) => call.id).sort()).toEqual(['aaaa', 'bbbb']);
    expect(harness.surface.setEnabledCalls.every((call) => call.enabled)).toBe(true);
    const last = await lastResetEvent();
    expect(last?.type).toBe('session-reset');
    expect(last?.payload).toMatchObject({ restored: true, errors: [], manualIds: [] });
    expect(last?.payload).not.toHaveProperty('declined');
  });

  it('leaves the browser untouched and records the declined restore when the answer is no', async () => {
    const harness = createHarness();
    await midSearch(harness);
    const before = await harness.surface.getAll();
    harness.surface.setEnabledCalls.length = 0;

    const view = await abortSession(harness.dependencies, { restore: false });

    expect(harness.surface.setEnabledCalls).toEqual([]);
    expect(await harness.surface.getAll()).toEqual(before);
    expect(view.status).toBe('aborted');
    expect(view.abortReason).toBeNull();
    expect(view.restorePending).toBe(true);

    const last = await lastResetEvent();
    expect(last?.type).toBe('session-reset');
    expect(last?.payload).toMatchObject({ restored: false, declined: true, errors: [], manualIds: [] });
  });

  it('reports the decision honestly instead of claiming a restore that did not happen', async () => {
    const harness = createHarness();
    await midSearch(harness);

    const view = await abortSession(harness.dependencies, { restore: false });

    expect(view.restore).not.toBeNull();
    expect(view.restore?.restored).toBe(false);
    expect(view.restore?.errors).toEqual([]);
  });

  it('keeps the aborted session unfinishable: a new session still owes the restore', async () => {
    const harness = createHarness();
    await midSearch(harness);

    await abortSession(harness.dependencies, { restore: false });

    await expect(startNewSession(harness.dependencies)).rejects.toThrow(/Restore the extensions/);
    await expect(getSession()).resolves.toMatchObject({ status: 'aborted' });
  });

  it('survives a panel reopen, so the decision is not a one-off in memory', async () => {
    const harness = createHarness();
    await midSearch(harness);
    await abortSession(harness.dependencies, { restore: false });

    const reopened = await getSession();

    expect(reopened?.status).toBe('aborted');
    expect(reopened?.restore?.restored).toBe(false);
    expect(reopened?.restorePending).toBe(true);
  });

  it('refuses to abort once the session already reached a terminal outcome', async () => {
    const harness = createHarness([ALPHA]);
    await startSession(harness.dependencies, { candidateIds: ['aaaa'], baselineMode: 'auto', testTab: null });
    await submitVerdict(harness.dependencies, { verdict: 'gone' });
    await resetSessionQueue();
    const harnessAgain = harness;

    await expect(abortSession(harnessAgain.dependencies, { restore: true })).rejects.toThrow(/already over/);
  });

  it('refuses to abort when no session exists', async () => {
    const harness = createHarness();

    await expect(abortSession(harness.dependencies, { restore: true })).rejects.toThrow(/No active session/);
  });

  it('aborts a session that is only planning its next trial', async () => {
    const harness = createHarness();
    await midSearch(harness);
    await applyTrial(harness.dependencies);

    const view = await abortSession(harness.dependencies, { restore: true });

    expect(view.status).toBe('restored');
    expect(view.restore?.restored).toBe(true);
  });
});

/**
 * The panel seam: the abort action has to be reachable on a live session screen, ask
 * the question the SPEC mandates with yes as the default, and take both answers to a
 * screen the user can read.
 */
describe('the abort action on the live session screens', () => {
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

  async function toBaselineQuestion(wrapper: ReturnType<typeof mount>): Promise<void> {
    await wrapper.get('[data-testid="picker-start"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="preflight-start"]').trigger('click');
    await flushPromises();
  }

  function enabledOf(surface: FakeManagement, id: string): boolean | undefined {
    const calls = surface.setEnabledCalls.filter((call) => call.id === id);
    return calls.at(-1)?.enabled;
  }

  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    sessionSeq = 0;
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('offers the action on a live screen but not before a session exists', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();

    expect(wrapper.find('[data-testid="abort-panel"]').exists()).toBe(false);

    await toBaselineQuestion(wrapper);
    expect(screenOf(wrapper)).toBe('baseline');
    expect(wrapper.find('[data-testid="abort-session"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="abort-question"]').exists()).toBe(false);
  });

  it('asks "Restore all extensions?" with yes as the default answer', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await toBaselineQuestion(wrapper);

    await wrapper.get('[data-testid="abort-session"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="abort-question"]').text()).toBe('Restore all extensions?');
    const restore = wrapper.get('[data-testid="abort-restore"]');
    expect(restore.attributes('data-default')).toBe('true');
    expect(restore.classes()).toContain('primary');
    expect(wrapper.get('[data-testid="abort-leave"]').text()).toBe('Stop and keep the extensions as they are');
    expect(wrapper.find('[data-testid="abort-cancel"]').exists()).toBe(true);

    await wrapper.get('[data-testid="abort-cancel"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="abort-question"]').exists()).toBe(false);
    expect(screenOf(wrapper)).toBe('baseline');
  });

  it('restores and lands on the restored screen when the user answers yes', async () => {
    const { wrapper, surface } = mountPanel();
    await flushPromises();
    await toBaselineQuestion(wrapper);
    await wrapper.get('[data-testid="abort-session"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="abort-restore"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('restored');
    expect(wrapper.get('[data-testid="restored-summary"]').attributes('data-complete')).toBe('true');
    expect(enabledOf(surface, 'aaaa')).toBe(true);
    expect(enabledOf(surface, 'bbbb')).toBe(true);
    const log = await readBisectLog();
    expect(log?.events.at(-1)).toMatchObject({ type: 'session-reset', payload: { restored: true } });
  });

  it('records the declined restore and leaves the extensions off when the user answers no', async () => {
    const { wrapper, surface } = mountPanel();
    await flushPromises();
    await toBaselineQuestion(wrapper);
    const callsBefore = surface.setEnabledCalls.length;
    await wrapper.get('[data-testid="abort-session"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="abort-leave"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('aborted');
    expect(surface.setEnabledCalls).toHaveLength(callsBefore);
    expect(wrapper.get('[data-testid="aborted-explanation"]').text()).toContain('still');
    expect(wrapper.get('[data-testid="new-session-start"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="new-session-note"]').text()).toContain('Restore all extensions first');

    const log = await readBisectLog();
    expect(log?.events.at(-1)).toMatchObject({
      type: 'session-reset',
      payload: { restored: false, declined: true },
    });
  });

  it('offers Restore from the aborted screen, so declining is not a dead end', async () => {
    const { wrapper, surface } = mountPanel();
    await flushPromises();
    await toBaselineQuestion(wrapper);
    await wrapper.get('[data-testid="abort-session"]').trigger('click');
    await flushPromises();
    await wrapper.get('[data-testid="abort-leave"]').trigger('click');
    await flushPromises();

    await wrapper.get('[data-testid="aborted-restore"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('restored');
    expect(enabledOf(surface, 'aaaa')).toBe(true);
    expect(enabledOf(surface, 'bbbb')).toBe(true);
  });
});
