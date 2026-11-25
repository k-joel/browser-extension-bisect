// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import SnapshotChangeScreen from '@/entrypoints/sidepanel/components/SnapshotChangeScreen.vue';
import SnapshotWarning from '@/entrypoints/sidepanel/components/SnapshotWarning.vue';
import TestTabPromptView from '@/entrypoints/sidepanel/components/TestTabPrompt.vue';
import TrialScreen from '@/entrypoints/sidepanel/components/TrialScreen.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import { bisectConfigItem } from '@/utils/bisect/config';
import type { CandidateExtension, SessionView, SnapshotChange } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };
const CHARLIE = { id: 'cccc', name: 'Charlie Helper' };

const THREE = [ALPHA, BRAVO, CHARLIE];

interface Harness {
  surface: FakeManagement;
  wrapper: ReturnType<typeof mount>;
}

function candidateOf(entry: { id: string; name: string }): CandidateExtension {
  return {
    id: entry.id,
    name: entry.name,
    version: '1.0.0',
    description: '',
    enabledAtStart: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension',
    icons: [],
  };
}

type Trial = NonNullable<SessionView['currentTrial']>;

function trialOf(overrides: Partial<Trial> = {}): Trial {
  return {
    round: 1,
    enabledIds: ['aaaa'],
    disabledIds: ['bbbb', 'cccc'],
    targetState: { enabled: ['aaaa'], disabled: ['bbbb', 'cccc'], allOutsideSuspectsEnabled: true },
    verdict: null,
    appliedAt: 1,
    errors: [],
    manual: false,
    testTab: null,
    ...overrides,
  };
}

function sessionWith(overrides: Partial<SessionView> = {}): SessionView {
  return {
    sessionId: 's1',
    status: 'awaiting-verdict',
    capability: { browserName: 'chrome', canAutoToggle: true, selfInstallType: 'normal', sideSurface: 'side-panel' },
    baselineMode: 'auto',
    candidateOrder: THREE.map(candidateOf),
    originalEnabledIds: ['aaaa', 'bbbb', 'cccc'],
    suspects: ['aaaa', 'bbbb', 'cccc'],
    cleared: [],
    currentTrial: trialOf(),
    trials: [],
    culpritId: null,
    ambiguityIds: [],
    abortReason: null,
    testTab: { tabId: 7, url: null },
    progress: { trialNumber: 1, estimatedTrials: 2, suspectCount: 3 },
    manualBatch: null,
    pause: null,
    changes: [],
    restorePending: false,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

const REMOVED: SnapshotChange = {
  kind: 'removed',
  extensionId: 'cccc',
  name: 'Charlie Helper',
  snapshotVersion: '1.0.0',
  currentVersion: null,
};

const UPDATED: SnapshotChange = {
  kind: 'updated',
  extensionId: 'bbbb',
  name: 'Bravo Reader',
  snapshotVersion: '1.0.0',
  currentVersion: '2.0.0',
};

const INSTALLED: SnapshotChange = {
  kind: 'installed',
  extensionId: 'ffff',
  name: 'Foxtrot',
  snapshotVersion: null,
  currentVersion: '0.1.0',
};

describe('TestTabPrompt component contract', () => {
  it('offers a rebind for a closed tab and never hides the batch', () => {
    const wrapper = mount(TestTabPromptView, {
      props: {
        prompt: {
          kind: 'closed',
          tabId: 7,
          headline: 'The test tab was closed.',
          detail: 'Bind another tab to keep the automatic reload, or answer the verdict without one.',
          action: 'Bind another test tab',
        },
        busy: false,
      },
    });

    expect(wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-kind')).toBe('closed');
    expect(wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-tab-id')).toBe('7');
    expect(wrapper.get('[data-testid="test-tab-prompt-headline"]').text()).toContain('closed');
    expect(wrapper.get('[data-testid="test-tab-prompt-action"]').text()).toBe('Bind another test tab');
    expect(wrapper.get('[data-testid="test-tab-prompt-verdict-note"]').text()).toContain('answered with or without');
  });

  it('offers a manual reload for a tab that never settled', async () => {
    const wrapper = mount(TestTabPromptView, {
      props: {
        prompt: {
          kind: 'unsettled',
          tabId: 7,
          headline: 'The test tab did not finish loading.',
          detail: 'Reload it yourself once it is ready, then answer the verdict.',
          action: 'Reload the test tab again',
        },
        busy: false,
      },
    });

    expect(wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-kind')).toBe('unsettled');
    await wrapper.get('[data-testid="test-tab-prompt-action"]').trigger('click');
    expect(wrapper.emitted('reload')).toHaveLength(1);
    expect(wrapper.emitted('bind')).toBeUndefined();
  });

  it('emits bind rather than reload for a closed tab', async () => {
    const wrapper = mount(TestTabPromptView, {
      props: {
        prompt: {
          kind: 'closed',
          tabId: 3,
          headline: 'The test tab was closed.',
          detail: 'Bind another tab.',
          action: 'Bind another test tab',
        },
        busy: false,
      },
    });

    await wrapper.get('[data-testid="test-tab-prompt-action"]').trigger('click');
    expect(wrapper.emitted('bind')).toHaveLength(1);
    expect(wrapper.emitted('reload')).toBeUndefined();
  });
});

describe('TrialScreen test-tab hints', () => {
  const BASE_PROPS = { busy: false, reloadMessage: null, undoBlockedReason: 'The session is paused.' };

  it('shows the rebind prompt beside the verdict buttons for a closed tab', () => {
    const session = sessionWith({
      currentTrial: {
        ...trialOf(),
        testTab: { status: 'closed', tabId: 7 },
      },
    });

    const wrapper = mount(TrialScreen, { props: { ...BASE_PROPS, session } });

    expect(wrapper.find('[data-testid="test-tab-prompt"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-kind')).toBe('closed');
    expect(wrapper.find('[data-testid="verdict-persists"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="verdict-persists"]').attributes('disabled')).toBeUndefined();
  });

  it('shows the manual-reload hint beside the verdict buttons for a tab that never settled', () => {
    const session = sessionWith({
      currentTrial: {
        ...trialOf(),
        testTab: { status: 'unsettled', tabId: 7 },
      },
    });

    const wrapper = mount(TrialScreen, { props: { ...BASE_PROPS, session } });

    expect(wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-kind')).toBe('unsettled');
    expect(wrapper.get('[data-testid="test-tab-prompt-action"]').text()).toBe('Reload the test tab again');
    expect(wrapper.get('[data-testid="verdict-gone"]').attributes('disabled')).toBeUndefined();
  });

  it('shows no hint once the verdict is recorded', () => {
    const session = sessionWith({
      currentTrial: {
        ...trialOf(),
        verdict: 'persists',
        testTab: { status: 'closed', tabId: 7 },
      },
    });

    const wrapper = mount(TrialScreen, { props: { ...BASE_PROPS, session } });

    expect(wrapper.find('[data-testid="test-tab-prompt"]').exists()).toBe(false);
  });

  it('shows no hint for an ordinary reload', () => {
    const session = sessionWith();

    const wrapper = mount(TrialScreen, { props: { ...BASE_PROPS, session } });

    expect(wrapper.find('[data-testid="test-tab-prompt"]').exists()).toBe(false);
  });

  it('emits bind-tab from the rebind action', async () => {
    const session = sessionWith({
      currentTrial: { ...trialOf(), testTab: { status: 'closed', tabId: 7 } },
    });
    const wrapper = mount(TrialScreen, { props: { ...BASE_PROPS, session } });

    await wrapper.get('[data-testid="test-tab-prompt-action"]').trigger('click');

    expect(wrapper.emitted('bind-tab')).toHaveLength(1);
  });
});

describe('SnapshotChangeScreen component contract', () => {
  function pausedWith(changes: SnapshotChange[]): SessionView {
    return sessionWith({
      status: 'paused',
      pause: { reason: 'snapshot-changed', drift: null, changes, errors: [] },
      changes,
    });
  }

  it('renders a removal with a stable test id and the restore-or-restart choice', () => {
    const wrapper = mount(SnapshotChangeScreen, { props: { session: pausedWith([REMOVED]), busy: false } });

    const row = wrapper.get('[data-testid="snapshot-change-row"]');
    expect(row.attributes('data-extension-id')).toBe('cccc');
    expect(row.attributes('data-kind')).toBe('removed');
    expect(wrapper.get('[data-testid="snapshot-change-name"]').text()).toBe('Charlie Helper');
    expect(wrapper.get('[data-testid="snapshot-change-kind"]').text()).toBe('Removed during this session');
    expect(wrapper.get('[data-testid="snapshot-change-cause"]').text()).toContain('Charlie Helper was removed');
    expect(wrapper.get('[data-testid="snapshot-change-restore"]').text()).toBe('Restore and stop');
    expect(wrapper.get('[data-testid="snapshot-change-restart"]').text()).toBe('Restart with a fresh snapshot');
  });

  it('renders an update with both versions from the change it was given', () => {
    const wrapper = mount(SnapshotChangeScreen, { props: { session: pausedWith([UPDATED]), busy: false } });

    expect(wrapper.get('[data-testid="snapshot-change-row"]').attributes('data-kind')).toBe('updated');
    expect(wrapper.get('[data-testid="snapshot-change-cause"]').text()).toContain('Bravo Reader was updated');
    expect(wrapper.get('[data-testid="snapshot-change-note"]').text()).toContain('cannot be answered');
  });

  it('offers no choice when the only change is an install', () => {
    const wrapper = mount(SnapshotChangeScreen, { props: { session: pausedWith([INSTALLED]), busy: false } });

    expect(wrapper.find('[data-testid="snapshot-change-actions"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="snapshot-change-no-decision"]').text()).toContain('does not affect');
  });

  it('emits restore and restart and disables both while busy', async () => {
    const ready = mount(SnapshotChangeScreen, { props: { session: pausedWith([REMOVED]), busy: false } });
    await ready.get('[data-testid="snapshot-change-restore"]').trigger('click');
    await ready.get('[data-testid="snapshot-change-restart"]').trigger('click');
    expect(ready.emitted('restore')).toHaveLength(1);
    expect(ready.emitted('restart')).toHaveLength(1);

    const busy = mount(SnapshotChangeScreen, { props: { session: pausedWith([REMOVED]), busy: true } });
    expect(busy.get('[data-testid="snapshot-change-restore"]').attributes('disabled')).toBeDefined();
    expect(busy.get('[data-testid="snapshot-change-restart"]').attributes('disabled')).toBeDefined();
  });
});

describe('SnapshotWarning component contract', () => {
  it('renders every change with its kind and keeps the snapshot explanation', () => {
    const wrapper = mount(SnapshotWarning, {
      props: { session: sessionWith({ changes: [INSTALLED, UPDATED] }) },
    });

    const rows = wrapper.findAll('[data-testid="snapshot-warning-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.attributes('data-kind')).toBe('installed');
    expect(rows[0]?.attributes('data-extension-id')).toBe('ffff');
    expect(rows[1]?.attributes('data-kind')).toBe('updated');
    expect(wrapper.get('[data-testid="snapshot-warning-detail"]').text()).toContain('does not change');
  });

  it('renders nothing when the browser changed nothing', () => {
    const wrapper = mount(SnapshotWarning, { props: { session: sessionWith() } });

    expect(wrapper.find('[data-testid="snapshot-warning"]').exists()).toBe(false);
  });

  it('is a live region and can be dismissed', async () => {
    const wrapper = mount(SnapshotWarning, { props: { session: sessionWith({ changes: [INSTALLED] }) } });

    expect(wrapper.get('[data-testid="snapshot-warning"]').attributes('aria-live')).toBe('polite');
    await wrapper.get('[data-testid="snapshot-warning-dismiss"]').trigger('click');
    expect(wrapper.emitted('dismiss')).toHaveLength(1);
  });
});

describe('the panel under a mid-session change', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  function register(surface: FakeManagement): void {
    registerBackgroundHandlers({
      managementPort: createChromePort({ management: surface }),
      tabs: {
        reload: async () => {
          throw new Error('No tab with id: 7.');
        },
        waitForComplete: async () => true,
      },
    });
  }

  function mountAutomated(surface: FakeManagement): Harness {
    register(surface);
    return { surface, wrapper: mount(App) };
  }

  function createSurface(): FakeManagement {
    return createFakeManagement({
      self: SELF,
      extensions: [...THREE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
    });
  }

  /**
   * A bound tab the reload surface refuses stands in for the user closing it: the binding
   * is real, so the session records the failure instead of treating it as unbound.
   */
  async function bindClosedTab(): Promise<void> {
    await bisectConfigItem.setValue({ schemaVersion: 1, excludedExtensionIds: [], testTab: { tabId: 7, url: null } });
  }

  async function click(wrapper: Harness['wrapper'], testId: string): Promise<void> {
    await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
    await flushPromises();
  }

  function screenOf(wrapper: Harness['wrapper']): string | undefined {
    return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
  }

  it('routes a removal pause to the snapshot-change screen with restore and restart', async () => {
    const harness = mountAutomated(createSurface());
    await flushPromises();
    await click(harness.wrapper, 'picker-start');
    await click(harness.wrapper, 'preflight-start');
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');

    harness.surface.removeExtension('cccc');
    await click(harness.wrapper, 'verdict-persists');

    expect(screenOf(harness.wrapper)).toBe('snapshot-change');
    expect(harness.wrapper.get('[data-testid="snapshot-change-row"]').attributes('data-kind')).toBe('removed');
    expect(harness.wrapper.find('[data-testid="snapshot-change-restart"]').exists()).toBe(true);
    expect(harness.wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('Choose restore or restart');
  });

  it('asks the background for a fresh snapshot when the restart action is pressed', async () => {
    const harness = mountAutomated(createSurface());
    await flushPromises();
    await click(harness.wrapper, 'picker-start');
    await click(harness.wrapper, 'preflight-start');
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');
    harness.surface.removeExtension('cccc');
    await click(harness.wrapper, 'verdict-persists');
    const previousSession = (await readBisectLog())?.sessionId;

    await click(harness.wrapper, 'snapshot-change-restart');

    const log = await readBisectLog();
    expect(log?.sessionId).not.toBe(previousSession);
    expect(log?.events[0]?.type).toBe('session-started');
    expect(screenOf(harness.wrapper)).toBe('baseline');
  });

  it('shows the install warning without pausing the session', async () => {
    const harness = mountAutomated(createSurface());
    await flushPromises();
    await click(harness.wrapper, 'picker-start');
    await click(harness.wrapper, 'preflight-start');
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');
    expect(screenOf(harness.wrapper)).toBe('trial');

    harness.surface.installExtension(makeExtensionInfo({ id: 'ffff', name: 'Foxtrot', version: '0.1.0' }));
    await click(harness.wrapper, 'trial-retry');

    expect(screenOf(harness.wrapper)).toBe('trial');
    expect(harness.wrapper.get('[data-testid="snapshot-warning-row"]').attributes('data-kind')).toBe('installed');
    expect(harness.wrapper.get('[data-testid="snapshot-warning"]').attributes('data-count')).toBe('1');
    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(true);
    const log = await readBisectLog();
    expect(log?.events.filter((event) => event.type === 'session-paused')).toHaveLength(0);
    const start = log?.events[0]?.payload as { candidateOrder: { id: string }[] } | undefined;
    expect(start?.candidateOrder.map((entry) => entry.id)).toEqual(['aaaa', 'bbbb', 'cccc']);
    await click(harness.wrapper, 'snapshot-warning-dismiss');
    expect(harness.wrapper.find('[data-testid="snapshot-warning"]').exists()).toBe(false);
  });

  it('offers the rebind prompt on the trial screen when the tab is closed', async () => {
    await bindClosedTab();
    const harness = mountAutomated(createSurface());
    await flushPromises();
    await click(harness.wrapper, 'picker-start');
    await click(harness.wrapper, 'preflight-start');
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');

    expect(screenOf(harness.wrapper)).toBe('trial');
    expect(harness.wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-kind')).toBe('closed');
    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(true);
  });

  it('still answers the verdict from the prompt screen', async () => {
    await bindClosedTab();
    const harness = mountAutomated(createSurface());
    await flushPromises();
    await click(harness.wrapper, 'picker-start');
    await click(harness.wrapper, 'preflight-start');
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');
    expect(harness.wrapper.get('[data-testid="test-tab-prompt"]').attributes('data-kind')).toBe('closed');

    await click(harness.wrapper, 'verdict-gone');

    const verdicts = (await readBisectLog())?.events.filter((event) => event.type === 'verdict-recorded');
    expect(verdicts).toHaveLength(1);
    expect(harness.wrapper.find('[data-testid="test-tab-prompt"]').exists()).toBe(false);
  });
});
