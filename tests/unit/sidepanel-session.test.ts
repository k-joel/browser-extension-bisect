// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import { readBisectConfig } from '@/utils/bisect/config';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

interface Install {
  id: string;
  name: string;
  version?: string;
  type?: string;
  enabled?: boolean;
  mayDisable?: boolean;
}

interface Harness {
  surface: FakeManagement;
  reloads: number[];
  wrapper: ReturnType<typeof mount>;
  reopen: () => Promise<ReturnType<typeof mount>>;
}

interface HarnessOptions {
  installs?: Install[];
  setEnabledError?: (id: string, enabled: boolean) => Error | null;
  tabId?: number;
}

const DEFAULT_INSTALLS: Install[] = [
  { id: 'aaaa', name: 'Alpha Blocker', version: '1.2.3' },
  { id: 'bbbb', name: 'Bravo Reader', version: '4.9.0' },
];

function buildPort(surface: FakeManagement): ManagementPort {
  return createChromePort({ management: surface });
}

async function mountHarness(options: HarnessOptions = {}): Promise<Harness> {
  const installs = options.installs ?? DEFAULT_INSTALLS;
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      ...installs.map((install) =>
        makeExtensionInfo({
          id: install.id,
          name: install.name,
          version: install.version ?? '1.0.0',
          enabled: install.enabled ?? true,
          mayDisable: install.mayDisable ?? true,
          ...(install.type === undefined ? {} : { type: install.type }),
        }),
      ),
      SELF,
    ],
    ...(options.setEnabledError === undefined ? {} : { setEnabledError: options.setEnabledError }),
  });
  const reloads: number[] = [];
  const tabs = {
    reload: async (tabId: number) => {
      reloads.push(tabId);
    },
    waitForComplete: async () => true,
  };

  registerBackgroundHandlers({ managementPort: buildPort(surface), tabs });

  if (options.tabId !== undefined) {
    await fakeBrowser.storage.local.set({ bisectConfig: defaultConfig({ tabId: options.tabId }) });
  }

  const wrapper = mount(App);
  await flushPromises();

  return {
    surface,
    reloads,
    wrapper,
    async reopen() {
      wrapper.unmount();
      messenger.removeAllListeners();
      registerBackgroundHandlers({ managementPort: buildPort(surface), tabs });
      const reopened = mount(App);
      await flushPromises();
      return reopened;
    },
  };
}

function defaultConfig(overrides: { excluded?: string[]; tabId?: number } = {}) {
  return {
    schemaVersion: 1,
    excludedExtensionIds: overrides.excluded ?? [],
    testTab: overrides.tabId === undefined ? null : { tabId: overrides.tabId, url: null },
  };
}

async function openPreflight(harness: Harness): Promise<void> {
  await harness.wrapper.get('[data-testid="picker-start"]').trigger('click');
  await flushPromises();
}

async function startBaseline(harness: Harness): Promise<void> {
  await openPreflight(harness);
  await harness.wrapper.get('[data-testid="preflight-start"]').trigger('click');
  await flushPromises();
}

function screenOf(wrapper: Harness['wrapper']): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

describe('side panel pre-flight consent', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('lists exactly the candidates that will be toggled', async () => {
    const harness = await mountHarness();
    await openPreflight(harness);

    expect(screenOf(harness.wrapper)).toBe('preflight');
    const rows = harness.wrapper.findAll('[data-testid="preflight-candidate"]');
    expect(rows.map((row) => row.get('[data-testid="preflight-candidate-name"]').text())).toEqual([
      'Alpha Blocker',
      'Bravo Reader',
    ]);
    expect(harness.wrapper.get('[data-testid="preflight-count"]').text()).toContain('2 extensions');
  });

  it('omits user-excluded candidates from the pre-flight list', async () => {
    await fakeBrowser.storage.local.set({ bisectConfig: defaultConfig({ excluded: ['bbbb'] }) });
    const harness = await mountHarness();

    await openPreflight(harness);

    const rows = harness.wrapper.findAll('[data-testid="preflight-candidate"]');
    expect(rows.map((row) => row.get('[data-testid="preflight-candidate-name"]').text())).toEqual(['Alpha Blocker']);
    expect(harness.wrapper.get('[data-testid="preflight-count"]').text()).toContain('1 extension');
  });

  it('explains that the culprit stays disabled until Restore and that nothing has changed yet', async () => {
    const harness = await mountHarness();
    await openPreflight(harness);

    const note = harness.wrapper.get('[data-testid="preflight-culprit-note"]').text();
    expect(note).toContain('The culprit stays disabled until you press Restore');
    expect(note).toContain('no extension is toggled until you');
  });

  it('shows the bound test tab with its URL when known', async () => {
    await fakeBrowser.storage.local.set({
      bisectConfig: { schemaVersion: 1, excludedExtensionIds: [], testTab: { tabId: 7, url: 'https://example.test/' } },
    });
    const harness = await mountHarness();
    await openPreflight(harness);

    expect(harness.wrapper.get('[data-testid="preflight-test-tab-label"]').text()).toBe(
      'Tab #7 · https://example.test/',
    );
    expect(harness.wrapper.find('[data-testid="preflight-test-tab-warning"]').exists()).toBe(false);
  });

  it('renders "Tab #N" without a URL when the browser hides tab.url', async () => {
    const harness = await mountHarness({ tabId: 42 });
    await openPreflight(harness);

    expect(harness.wrapper.get('[data-testid="preflight-test-tab-label"]').text()).toBe('Tab #42');
  });

  it('binds the current test tab when the user confirms it', async () => {
    await fakeBrowser.windows.create({ focused: true });
    await fakeBrowser.tabs.create({ url: 'https://example.test/', active: true });
    const harness = await mountHarness();
    await openPreflight(harness);

    expect(harness.wrapper.get('[data-testid="preflight-test-tab-label"]').text()).toBe('No test tab bound');
    expect(harness.wrapper.get('[data-testid="preflight-test-tab-warning"]').text()).toContain('No test tab is bound');

    await harness.wrapper.get('[data-testid="preflight-bind"]').trigger('click');
    await flushPromises();

    const config = await readBisectConfig();
    expect(config.testTab).toEqual({ tabId: 1, url: 'https://example.test/' });
    expect(harness.wrapper.get('[data-testid="preflight-test-tab-label"]').text()).toBe(
      'Tab #1 · https://example.test/',
    );
    expect(harness.wrapper.find('[data-testid="preflight-test-tab-warning"]').exists()).toBe(false);
  });

  it('toggles nothing before Start baseline is clicked', async () => {
    const harness = await mountHarness();
    await openPreflight(harness);
    await flushPromises();

    expect(harness.surface.setEnabledCalls).toEqual([]);
    await expect(readBisectLog()).resolves.toBeNull();
    expect(harness.wrapper.get('[data-testid="preflight-start"]').text()).toBe('Start baseline');
  });

  it('blocks the start when no candidate is selected', async () => {
    await fakeBrowser.storage.local.set({ bisectConfig: defaultConfig({ excluded: ['aaaa', 'bbbb'] }) });
    const harness = await mountHarness();

    expect(harness.wrapper.get('[data-testid="picker-start"]').attributes('disabled')).toBeDefined();
    expect(harness.wrapper.get('[data-testid="picker-blocked"]').text()).toContain('No eligible enabled extensions');
  });
});

describe('side panel baseline', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('asks the baseline question with the exact verdict labels after the all-off baseline', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await startBaseline(harness);

    expect(screenOf(harness.wrapper)).toBe('baseline');
    expect(harness.wrapper.get('[data-testid="verdict-persists"]').text()).toBe('Problem persists');
    expect(harness.wrapper.get('[data-testid="verdict-gone"]').text()).toBe('Problem is gone');
    expect(harness.wrapper.get('[data-testid="baseline-question"]').text()).toContain(
      'Every candidate extension is now disabled',
    );
  });

  it('disables every candidate and leaves non-candidates untouched', async () => {
    const harness = await mountHarness({
      installs: [
        ...DEFAULT_INSTALLS,
        { id: 'zzzz', name: 'Zulu Dormant', enabled: false },
        { id: 'theme-id', name: 'Theme Midnight', type: 'theme' },
      ],
    });
    await startBaseline(harness);

    const toggled = harness.surface.setEnabledCalls.map((call) => [call.id, call.enabled]);
    expect(toggled).toEqual([
      ['aaaa', false],
      ['bbbb', false],
    ]);
  });

  it('reloads the bound test tab', async () => {
    const harness = await mountHarness({ tabId: 9 });
    await startBaseline(harness);

    expect(harness.reloads).toEqual([9]);
  });

  it('aborts as a host issue when the baseline persists and explains no extension is implicated', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await startBaseline(harness);

    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('host-issue');
    expect(harness.wrapper.get('[data-testid="host-issue-explanation"]').text()).toContain(
      'no installed extension is implicated',
    );
    expect(harness.wrapper.find('[data-testid="host-issue-restore"]').exists()).toBe(true);
    expect(harness.surface.setEnabledCalls.map((call) => [call.id, call.enabled])).toEqual([
      ['aaaa', false],
      ['bbbb', false],
      ['aaaa', true],
      ['bbbb', true],
    ]);
    const log = await readBisectLog();
    expect(log?.events.map((event) => event.type)).toEqual([
      'session-started',
      'trial-started',
      'trial-applied',
      'baseline-recorded',
      'session-reset',
    ]);
  });

  it('advances past the baseline question when the symptom is gone and N > 1', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await startBaseline(harness);

    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('progress');
    expect(harness.wrapper.get('[data-testid="progress-count"]').text()).toContain('2 suspects');
    const log = await readBisectLog();
    expect(log?.events.at(-1)?.type).toBe('baseline-recorded');
  });

  it('resolves N = 1 from the baseline and leaves the culprit disabled', async () => {
    const harness = await mountHarness({ installs: [{ id: 'aaaa', name: 'Alpha Blocker' }], tabId: 5 });
    await startBaseline(harness);

    expect(screenOf(harness.wrapper)).toBe('baseline');

    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('completed');
    expect(harness.wrapper.get('[data-testid="culprit-name"]').text()).toBe('Alpha Blocker');
    expect(harness.wrapper.get('[data-testid="culprit-detail"]').text()).toContain('still disabled');
    expect(harness.surface.setEnabledCalls).toEqual([{ id: 'aaaa', enabled: false }]);
  });

  it('rehydrates the baseline screen from the log on a panel reload', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await startBaseline(harness);

    const reopened = await harness.reopen();

    expect(screenOf(reopened)).toBe('baseline');
    expect(reopened.get('[data-testid="verdict-persists"]').text()).toBe('Problem persists');
    expect(reopened.get('[data-testid="verdict-gone"]').text()).toBe('Problem is gone');
  });

  it('rehydrates a completed N = 1 session from the log', async () => {
    const harness = await mountHarness({ installs: [{ id: 'aaaa', name: 'Alpha Blocker' }], tabId: 5 });
    await startBaseline(harness);
    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    const reopened = await harness.reopen();

    expect(screenOf(reopened)).toBe('completed');
    expect(reopened.get('[data-testid="culprit-name"]').text()).toBe('Alpha Blocker');
  });
});

describe('side panel restore', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('shows Restore on the picker, the pre-flight, and every session screen', async () => {
    const harness = await mountHarness({ tabId: 5 });

    expect(harness.wrapper.find('[data-testid="restore-panel"]').exists()).toBe(true);
    expect(harness.wrapper.get('[data-testid="restore-panel"]').isVisible()).toBe(true);
    expect(harness.wrapper.get('[data-testid="restore-button"]').attributes('disabled')).toBeDefined();

    await startBaseline(harness);
    expect(harness.wrapper.get('[data-testid="restore-panel"]').isVisible()).toBe(true);
    expect(harness.wrapper.get('[data-testid="restore-button"]').attributes('disabled')).toBeUndefined();

    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();
    expect(harness.wrapper.get('[data-testid="restore-panel"]').isVisible()).toBe(true);
  });

  it('re-enables only the touched candidates and never claims a partial restore', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await startBaseline(harness);
    harness.surface.setEnabledCalls.length = 0;

    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();

    expect(harness.surface.setEnabledCalls.map((call) => [call.id, call.enabled])).toEqual([
      ['aaaa', true],
      ['bbbb', true],
    ]);
    expect(screenOf(harness.wrapper)).toBe('restored');
    const summary = harness.wrapper.get('[data-testid="restore-summary"]');
    expect(summary.attributes('data-complete')).toBe('true');
    expect(summary.text()).toContain('All touched extensions are enabled again');
    expect(harness.wrapper.find('[data-testid="restore-failure"]').exists()).toBe(false);
  });

  it('reports a failing re-enable per extension and does not claim a full restore', async () => {
    const harness = await mountHarness({
      tabId: 5,
      setEnabledError: (id, enabled) => (enabled && id === 'aaaa' ? new Error('greylisted by the browser') : null),
    });
    await startBaseline(harness);

    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();

    const summary = harness.wrapper.get('[data-testid="restore-summary"]');
    expect(summary.attributes('data-complete')).toBe('false');
    expect(summary.text()).toContain('Restore incomplete');
    expect(summary.text()).not.toContain('enabled again.');

    const failures = harness.wrapper.findAll('[data-testid="restore-failure"]');
    expect(failures).toHaveLength(1);
    expect(failures[0]?.get('[data-testid="restore-failure-name"]').text()).toBe('Alpha Blocker');
    expect(failures[0]?.get('[data-testid="restore-failure-message"]').text()).toContain('greylisted by the browser');
  });

  it('restores from the host-issue screen without re-toggling already-restored extensions', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await startBaseline(harness);
    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();
    harness.surface.setEnabledCalls.length = 0;

    await harness.wrapper.get('[data-testid="host-issue-restore"]').trigger('click');
    await flushPromises();

    expect(harness.surface.setEnabledCalls).toEqual([]);
    expect(harness.wrapper.get('[data-testid="host-issue-restore-summary"]').text()).toContain('enabled again');
  });

  it('keeps a stable data-testid on every meaningful session node', async () => {
    const harness = await mountHarness({ tabId: 5 });
    await openPreflight(harness);

    const preflightIds = harness.wrapper.findAll('[data-testid]').map((node) => node.attributes('data-testid'));
    for (const id of [
      'preflight',
      'preflight-count',
      'preflight-candidates',
      'preflight-candidate',
      'preflight-candidate-name',
      'preflight-culprit-note',
      'preflight-test-tab-label',
      'preflight-start',
      'preflight-cancel',
      'restore-panel',
      'restore-policy',
      'restore-button',
    ]) {
      expect(preflightIds).toContain(id);
    }
    expect(harness.wrapper.get('[data-testid="sidepanel-live"]').attributes('aria-live')).toBe('polite');

    await harness.wrapper.get('[data-testid="preflight-start"]').trigger('click');
    await flushPromises();

    const baselineIds = harness.wrapper.findAll('[data-testid]').map((node) => node.attributes('data-testid'));
    for (const id of ['baseline-screen', 'baseline-question', 'verdict-persists', 'verdict-gone', 'baseline-reload']) {
      expect(baselineIds).toContain(id);
    }
  });
});
