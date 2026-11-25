// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import StartupReconciliationView from '@/entrypoints/sidepanel/components/StartupReconciliation.vue';
import { type ChromeManagementPort, createChromePort } from '@/utils/bisect/chrome-port';
import type { SessionView, StartupReconciliation } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import {
  applyTrial,
  resetSessionQueue,
  type SessionDependencies,
  startSession,
  submitVerdict,
} from '@/utils/bisect/session';
import { raiseStartupSignal } from '@/utils/bisect/startup';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };
const CHARLIE = { id: 'cccc', name: 'Charlie Helper' };

const THREE = [ALPHA, BRAVO, CHARLIE];

const TABS = { reload: async () => undefined, waitForComplete: async () => true };

function makeSurface(): FakeManagement {
  return createFakeManagement({
    self: SELF,
    extensions: [...THREE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
  });
}

function register(port: ChromeManagementPort): void {
  registerBackgroundHandlers({ managementPort: port, tabs: TABS });
}

function sessionDependencies(port: ChromeManagementPort): SessionDependencies {
  return { port, tabs: TABS, now: () => 1_000, newSessionId: () => 'session-startup-panel' };
}

/** Baseline applied and answered `gone`, so the session is mid-search at trial 1's plan. */
async function seedInFlight(surface: FakeManagement): Promise<void> {
  const dependencies = sessionDependencies(createChromePort({ management: surface }));
  await startSession(dependencies, {
    candidateIds: THREE.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: null,
  });
  await submitVerdict(dependencies, { verdict: 'gone' });
  await applyTrial(dependencies);
}

function reconciliationWith(overrides: Partial<StartupReconciliation> = {}): StartupReconciliation {
  return {
    sessionId: 's1',
    status: 'awaiting-verdict',
    restarted: true,
    offers: ['resume', 'restore'],
    inFlight: true,
    restorePending: true,
    touchedCount: 3,
    drift: null,
    ...overrides,
  };
}

function screenOf(wrapper: ReturnType<typeof mount>): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

describe('StartupReconciliation component contract', () => {
  it('offers Resume and Restore for an in-flight session', () => {
    const wrapper = mount(StartupReconciliationView, {
      props: { reconciliation: reconciliationWith(), busy: false },
    });

    expect(wrapper.get('[data-testid="startup-reconciliation"]').attributes('data-restarted')).toBe('true');
    expect(wrapper.get('[data-testid="startup-reconciliation-headline"]').text()).toContain('browser restarted');
    expect(wrapper.get('[data-testid="startup-resume"]').text()).toBe('Resume the session');
    expect(wrapper.get('[data-testid="startup-restore"]').text()).toBe('Restore all extensions');
  });

  it('offers only Restore for a finished session with a restore still pending', () => {
    const wrapper = mount(StartupReconciliationView, {
      props: {
        reconciliation: reconciliationWith({ status: 'completed', inFlight: false, offers: ['restore'] }),
        busy: false,
      },
    });

    expect(wrapper.find('[data-testid="startup-resume"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="startup-restore"]').exists()).toBe(true);
  });

  it('says the browser matches the log when the drift is in sync', () => {
    const wrapper = mount(StartupReconciliationView, {
      props: {
        reconciliation: reconciliationWith({
          drift: {
            expected: { aaaa: false },
            actual: { aaaa: false },
            pendingManualToggles: [],
            unexpectedToggles: [],
            missingIds: [],
            inSync: true,
          },
        }),
        busy: false,
      },
    });

    expect(wrapper.get('[data-testid="startup-reconciliation-difference"]').attributes('data-differs')).toBe('false');
    expect(wrapper.get('[data-testid="startup-reconciliation-difference"]').text()).toContain('matches');
  });

  it('names the difference in the drift vocabulary when the browser came back different', () => {
    const wrapper = mount(StartupReconciliationView, {
      props: {
        reconciliation: reconciliationWith({
          drift: {
            expected: { aaaa: false },
            actual: { aaaa: true },
            pendingManualToggles: ['aaaa'],
            unexpectedToggles: [],
            missingIds: [],
            inSync: false,
          },
        }),
        busy: false,
      },
    });

    expect(wrapper.get('[data-testid="startup-reconciliation-difference"]').attributes('data-differs')).toBe('true');
    expect(wrapper.get('[data-testid="startup-reconciliation-difference"]').text()).toContain(
      'not in the expected state',
    );
  });

  it('disables every action while a command is in flight', () => {
    const wrapper = mount(StartupReconciliationView, {
      props: { reconciliation: reconciliationWith(), busy: true },
    });

    expect(wrapper.get('[data-testid="startup-resume"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="startup-restore"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="startup-dismiss"]').attributes('disabled')).toBeDefined();
  });
});

function mountPanel(): { wrapper: ReturnType<typeof mount>; surface: FakeManagement; port: ChromeManagementPort } {
  const surface = makeSurface();
  const port = createChromePort({ management: surface });
  register(port);
  return { surface, port, wrapper: mount(App) };
}

describe('side panel startup offer', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('shows the offer for a session a restart interrupted', async () => {
    const surface = makeSurface();
    await seedInFlight(surface);
    const log = await readBisectLog();
    await raiseStartupSignal({ sessionId: log?.sessionId ?? null, eventCount: log?.events.length ?? 0 });

    const port = createChromePort({ management: surface });
    register(port);
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.find('[data-testid="startup-reconciliation"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="startup-reconciliation"]').attributes('data-restarted')).toBe('true');
    expect(wrapper.find('[data-testid="startup-resume"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="startup-restore"]').exists()).toBe(true);
  });

  it('shows nothing when the log holds no session', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();

    expect(wrapper.find('[data-testid="startup-reconciliation"]').exists()).toBe(false);
    expect(screenOf(wrapper)).toBe('picker');
  });

  it('offers nothing once the session was restored', async () => {
    const surface = makeSurface();
    await seedInFlight(surface);
    const dependencies = sessionDependencies(createChromePort({ management: surface }));
    const { resetSession } = await import('@/utils/bisect/session');
    await resetSession(dependencies, { restore: true });

    const port = createChromePort({ management: surface });
    register(port);
    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.find('[data-testid="startup-reconciliation"]').exists()).toBe(false);
  });

  it('resumes the session from the offer without waiting for a verdict', async () => {
    const surface = makeSurface();
    await seedInFlight(surface);
    const log = await readBisectLog();
    await raiseStartupSignal({ sessionId: log?.sessionId ?? null, eventCount: log?.events.length ?? 0 });

    const port = createChromePort({ management: surface });
    register(port);
    const wrapper = mount(App);
    await flushPromises();
    const sessionAtStart = (await messenger.sendMessage('getSession')) as SessionView | null;

    await wrapper.get('[data-testid="startup-resume"]').trigger('click');
    await flushPromises();

    expect((await messenger.sendMessage('getSession')) as SessionView | null).toMatchObject({
      sessionId: sessionAtStart?.sessionId,
      status: 'awaiting-verdict',
    });
    expect(wrapper.find('[data-testid="startup-reconciliation"]').exists()).toBe(false);
  });

  it('restores from the offer and lands on the restored screen', async () => {
    const surface = makeSurface();
    await seedInFlight(surface);
    const log = await readBisectLog();
    await raiseStartupSignal({ sessionId: log?.sessionId ?? null, eventCount: log?.events.length ?? 0 });

    const port = createChromePort({ management: surface });
    register(port);
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.get('[data-testid="startup-restore"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('restored');
    expect(wrapper.find('[data-testid="startup-reconciliation"]').exists()).toBe(false);
  });

  it('keeps the offer reachable after Dismiss, because it is derived and not consumed', async () => {
    const surface = makeSurface();
    await seedInFlight(surface);
    const log = await readBisectLog();
    await raiseStartupSignal({ sessionId: log?.sessionId ?? null, eventCount: log?.events.length ?? 0 });

    const port = createChromePort({ management: surface });
    register(port);
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.get('[data-testid="startup-dismiss"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="startup-reconciliation"]').exists()).toBe(false);

    const reopened = mount(App);
    await flushPromises();
    expect(reopened.find('[data-testid="startup-reconciliation"]').exists()).toBe(true);
  });
});
