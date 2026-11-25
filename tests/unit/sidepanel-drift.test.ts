// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import DriftScreen from '@/entrypoints/sidepanel/components/DriftScreen.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { CandidateExtension, DriftReport, SessionView } from '@/utils/bisect/domain';
import { undoEligibilityOf } from '@/utils/bisect/engine';
import { readBisectLog } from '@/utils/bisect/events';
import { applyTrial, resetSessionQueue, startSession, submitVerdict } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };
const CHARLIE = { id: 'cccc', name: 'Charlie Helper' };
const DELTA = { id: 'dddd', name: 'Delta Toolbar' };
const ECHO = { id: 'eeee', name: 'Echo Tweak' };

const FIVE = [ALPHA, BRAVO, CHARLIE, DELTA, ECHO];

interface Harness {
  surface: FakeManagement;
  wrapper: ReturnType<typeof mount>;
}

function register(surface: FakeManagement): void {
  registerBackgroundHandlers({
    managementPort: createChromePort({ management: surface }),
    tabs: { reload: async () => undefined, waitForComplete: async () => true },
  });
}

function mountAutomated(): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [...FIVE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
  });
  register(surface);
  return { surface, wrapper: mount(App) };
}

function screenOf(wrapper: Harness['wrapper']): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

async function click(wrapper: Harness['wrapper'], testId: string): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
  await flushPromises();
}

async function eventTypes(): Promise<string[]> {
  return (await readBisectLog())?.events.map((event) => event.type) ?? [];
}

/** Picker → preflight → the automated all-off baseline is applied. */
async function startBaseline(harness: Harness): Promise<void> {
  await click(harness.wrapper, 'picker-start');
  await click(harness.wrapper, 'preflight-start');
}

/**
 * Trial 2 applied and answered `persists`, driven through the real session commands so
 * the seeded log is the same one the panel would have written. The panel is then
 * mounted on it, which is the state live undo is offered for.
 */
async function seedAnsweredTrialTwo(surface: FakeManagement): Promise<void> {
  const dependencies = {
    port: createChromePort({ management: surface }),
    tabs: { reload: async () => undefined, waitForComplete: async () => true },
    now: () => 1_000,
    newSessionId: () => 'session-panel',
  };
  await startSession(dependencies, {
    candidateIds: FIVE.map((entry) => entry.id),
    baselineMode: 'auto',
    testTab: null,
  });
  await submitVerdict(dependencies, { verdict: 'gone' });
  await applyTrial(dependencies);
  await submitVerdict(dependencies, { verdict: 'persists' });
  await applyTrial(dependencies);
  await submitVerdict(dependencies, { verdict: 'persists' });
}

/**
 * Paused during trial 2: `dddd` is cleared (outside the partition) and turned off,
 * `cccc` is in the partition and turned on. The two land in different categories, so
 * the paused screen has to tell them apart.
 */
async function driftTrialTwo(harness: Harness): Promise<void> {
  await startBaseline(harness);
  await click(harness.wrapper, 'verdict-gone');
  await click(harness.wrapper, 'trial-apply');
  await click(harness.wrapper, 'verdict-persists');
  await click(harness.wrapper, 'trial-apply');
  await harness.surface.setEnabled('dddd', false);
  await harness.surface.setEnabled('cccc', true);
  await click(harness.wrapper, 'verdict-persists');
}

describe('paused screen on drift', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('shows the pause with the cause and the trial it interrupted', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    expect(screenOf(harness.wrapper)).toBe('paused');
    expect(harness.wrapper.get('[data-testid="paused-screen"]').text()).toContain('Paused on drift');
    expect(harness.wrapper.get('[data-testid="paused-cause"]').text()).toContain('no longer matches this trial');
    expect(harness.wrapper.get('[data-testid="paused-trial"]').text()).toContain('trial 2');
  });

  it('renders expected versus actual per differing candidate', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    const rows = harness.wrapper.findAll('[data-testid="drift-row"]');
    const states = rows.map((row) => ({
      name: row.get('[data-testid="drift-row-name"]').text(),
      state: row.get('[data-testid="drift-row-state"]').text(),
      differs: row.attributes('data-differs'),
    }));

    expect(states).toEqual([
      { name: DELTA.name, state: 'Expected: On · now Off', differs: 'true' },
      { name: CHARLIE.name, state: 'Expected: Off · now On', differs: 'true' },
    ]);
  });

  it('gives every drift category its own data-testid, including the empty ones', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    const pending = harness.wrapper.get('[data-testid="drift-category-pending"]');
    const unexpected = harness.wrapper.get('[data-testid="drift-category-unexpected"]');
    const missing = harness.wrapper.get('[data-testid="drift-category-missing"]');

    expect(pending.attributes('data-category')).toBe('pending');
    expect(pending.attributes('data-count')).toBe('1');
    expect(pending.findAll('[data-testid="drift-category-entry"]')).toHaveLength(1);
    expect(unexpected.attributes('data-category')).toBe('unexpected');
    expect(unexpected.attributes('data-count')).toBe('1');
    expect(unexpected.findAll('[data-testid="drift-category-entry"]')).toHaveLength(1);
    expect(missing.attributes('data-category')).toBe('missing');
    expect(missing.attributes('data-count')).toBe('0');
    expect(missing.get('[data-testid="drift-category-none"]').text()).toBe('None.');
  });

  it('offers the three recovery actions', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    expect(harness.wrapper.get('[data-testid="paused-resync"]').text()).toBe('Re-sync');
    expect(harness.wrapper.get('[data-testid="paused-undo"]').text()).toBe('Undo last verdict');
    expect(harness.wrapper.get('[data-testid="paused-restore"]').text()).toBe('Restore all');
  });

  it('disables Undo with the reason while the browser state is drifted', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    const undo = harness.wrapper.get('[data-testid="paused-undo"]');
    expect(undo.attributes('disabled')).toBeDefined();
    expect(undo.attributes('data-eligible')).toBe('false');
    expect(harness.wrapper.get('[data-testid="paused-undo-blocked"]').text()).toContain('The session is paused');
  });

  it('announces the pause through the live region', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    const live = harness.wrapper.get('[data-testid="sidepanel-live"]');
    expect(live.attributes('aria-live')).toBe('polite');
    expect(live.text()).toContain('Paused on drift');
    expect(live.text()).toContain('1 extension toggled unexpectedly');
    expect(live.text()).toContain('1 extension still to toggle');
    expect(live.text()).toContain('Undo is unavailable');
  });

  it('survives a remount: the paused screen comes from the log', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);
    expect(screenOf(harness.wrapper)).toBe('paused');

    harness.wrapper.unmount();
    messenger.removeAllListeners();
    register(harness.surface);
    const reopened = mount(App);
    await flushPromises();

    expect(screenOf(reopened)).toBe('paused');
    expect(reopened.get('[data-testid="paused-cause"]').text()).toContain('no longer matches this trial');
    expect(reopened.findAll('[data-testid="drift-row"]')).toHaveLength(2);
    expect(reopened.get('[data-testid="drift-category-unexpected"]').attributes('data-count')).toBe('1');
    expect(reopened.get('[data-testid="drift-category-pending"]').attributes('data-count')).toBe('1');
  });
});

describe('recovery from the paused screen', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('re-syncs the expected state and continues on the trial screen', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    await click(harness.wrapper, 'paused-resync');

    expect(screenOf(harness.wrapper)).toBe('trial');
    expect(harness.wrapper.find('[data-testid="paused-screen"]').exists()).toBe(false);
    expect(await eventTypes()).toContain('session-resumed');
  });

  it('restores all from the paused screen', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await driftTrialTwo(harness);

    await click(harness.wrapper, 'paused-restore');

    expect(screenOf(harness.wrapper)).toBe('restored');
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('session-reset');
  });
});

describe('undo affordance on the trial screen', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('is offered once the most recent trial has a verdict', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [...FIVE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
    });
    await seedAnsweredTrialTwo(surface);
    register(surface);
    const wrapper = mount(App);
    await flushPromises();

    const undo = wrapper.get('[data-testid="trial-undo-verdict"]');
    expect(screenOf(wrapper)).toBe('trial');
    expect(undo.attributes('data-eligible')).toBe('true');
    expect(undo.attributes('disabled')).toBeUndefined();
    expect(undo.text()).toContain('trial 2');
  });

  it('is disabled with the reason on the baseline question', async () => {
    const harness = mountAutomated();
    await flushPromises();
    await startBaseline(harness);
    await click(harness.wrapper, 'verdict-gone');

    const undo = harness.wrapper.get('[data-testid="trial-undo-verdict"]');

    expect(undo.attributes('data-eligible')).toBe('false');
    expect(harness.wrapper.get('[data-testid="trial-undo-blocked"]').text()).toContain(
      'baseline check is not a partition trial',
    );
  });

  it('reopens the round and returns to awaiting-verdict after a click', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [...FIVE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
    });
    await seedAnsweredTrialTwo(surface);
    register(surface);
    const wrapper = mount(App);
    await flushPromises();
    expect((await readBisectLog())?.events.at(-1)?.type).toBe('verdict-recorded');

    await click(wrapper, 'trial-undo-verdict');

    expect(screenOf(wrapper)).toBe('trial');
    expect(wrapper.find('[data-testid="verdict-persists"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="trial-question"]').text()).toContain('still happen');
    expect(wrapper.find('[data-testid="trial-history-row"]').exists()).toBe(true);
    const rows = wrapper.findAll('[data-testid="trial-history-verdict"]').map((node) => node.text());
    expect(rows.at(-1)).toBe('Awaiting your verdict');
    expect(await eventTypes()).toContain('verdict-undone');
  });

  it('pauses instead of undoing when the state has drifted', async () => {
    const surface = createFakeManagement({
      self: SELF,
      extensions: [...FIVE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
    });
    await seedAnsweredTrialTwo(surface);
    register(surface);
    const wrapper = mount(App);
    await flushPromises();
    await surface.setEnabled('dddd', false);

    await click(wrapper, 'trial-undo-verdict');

    expect(screenOf(wrapper)).toBe('paused');
    const types = await eventTypes();
    expect(types).not.toContain('verdict-undone');
    expect(types.at(-1)).toBe('session-paused');
  });
});

describe('drift screen component contract', () => {
  const DRIFT: DriftReport = {
    expected: { aaaa: true, bbbb: false, cccc: false },
    actual: { aaaa: false, bbbb: false },
    pendingManualToggles: ['bbbb'],
    unexpectedToggles: ['aaaa'],
    missingIds: ['cccc'],
    inSync: false,
  };

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

  function sessionWith(drift: DriftReport | null): SessionView {
    return {
      sessionId: 's1',
      status: 'paused',
      capability: {
        browserName: 'chrome',
        canAutoToggle: true,
        selfInstallType: 'normal',
        sideSurface: 'side-panel',
      },
      baselineMode: 'auto',
      candidateOrder: [candidateOf(ALPHA), candidateOf(BRAVO), candidateOf(CHARLIE)],
      originalEnabledIds: ['aaaa', 'bbbb', 'cccc'],
      suspects: ['aaaa', 'bbbb', 'cccc'],
      cleared: [],
      currentTrial: null,
      trials: [],
      culpritId: null,
      ambiguityIds: [],
      abortReason: null,
      testTab: null,
      progress: null,
      manualBatch: null,
      pause: drift === null ? null : { reason: 'drift', drift },
      createdAt: 1,
      updatedAt: 2,
    };
  }

  it('renders all three categories from the report', () => {
    const wrapper = mount(DriftScreen, {
      props: { session: sessionWith(DRIFT), busy: false, undoBlockedReason: 'The session is paused.' },
    });

    expect(wrapper.get('[data-testid="drift-category-pending"]').attributes('data-count')).toBe('1');
    expect(wrapper.get('[data-testid="drift-category-unexpected"]').attributes('data-count')).toBe('1');
    expect(wrapper.get('[data-testid="drift-category-missing"]').attributes('data-count')).toBe('1');
    const names = wrapper.findAll('[data-testid="drift-category-name"]').map((node) => node.text());
    expect(names).toEqual(['Bravo Reader', 'Alpha Blocker', 'Charlie Helper']);
  });

  it('names every expected-versus-actual row it can compare', () => {
    const wrapper = mount(DriftScreen, {
      props: { session: sessionWith(DRIFT), busy: false, undoBlockedReason: null },
    });

    const states = wrapper.findAll('[data-testid="drift-row-state"]').map((node) => node.text());
    expect(states).toContain('Expected: On · now Off');
    expect(states).toContain('Expected: Off · now Off');
    expect(states).toContain('Expected: Off · no longer installed');
  });

  it('emits the three actions and gates Undo on eligibility', async () => {
    const blocked = mount(DriftScreen, {
      props: { session: sessionWith(DRIFT), busy: false, undoBlockedReason: 'No verdict is pending.' },
    });
    expect(blocked.get('[data-testid="paused-undo"]').attributes('disabled')).toBeDefined();
    expect(blocked.get('[data-testid="paused-undo-blocked"]').text()).toContain('No verdict is pending.');

    const eligible = mount(DriftScreen, {
      props: { session: sessionWith(DRIFT), busy: false, undoBlockedReason: null },
    });
    expect(eligible.get('[data-testid="paused-undo"]').attributes('disabled')).toBeUndefined();
    expect(eligible.find('[data-testid="paused-undo-blocked"]').exists()).toBe(false);

    await eligible.get('[data-testid="paused-resync"]').trigger('click');
    await eligible.get('[data-testid="paused-undo"]').trigger('click');
    await eligible.get('[data-testid="paused-restore"]').trigger('click');
    expect(eligible.emitted('resync')).toHaveLength(1);
    expect(eligible.emitted('undo')).toHaveLength(1);
    expect(eligible.emitted('restore')).toHaveLength(1);
  });

  it('renders a pause with no recorded comparison without crashing', () => {
    const wrapper = mount(DriftScreen, {
      props: { session: sessionWith(null), busy: false, undoBlockedReason: 'The session is paused.' },
    });

    expect(wrapper.get('[data-testid="paused-cause"]').text()).toContain('paused before it could compare');
    expect(wrapper.find('[data-testid="drift-comparison"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="paused-no-comparison"]').exists()).toBe(true);
  });
});

describe('undo eligibility mirrors the session rule', () => {
  function bareView(overrides: Partial<SessionView> = {}): SessionView {
    return {
      sessionId: 's1',
      status: 'awaiting-verdict',
      capability: {
        browserName: 'chrome',
        canAutoToggle: true,
        selfInstallType: 'normal',
        sideSurface: 'side-panel',
      },
      baselineMode: 'auto',
      candidateOrder: [],
      originalEnabledIds: [],
      suspects: [],
      cleared: [],
      currentTrial: null,
      trials: [],
      culpritId: null,
      ambiguityIds: [],
      abortReason: null,
      testTab: null,
      progress: null,
      manualBatch: null,
      pause: null,
      createdAt: 1,
      updatedAt: 2,
      ...overrides,
    };
  }

  it('refuses every terminal status with a reason', () => {
    for (const status of ['completed', 'inconclusive', 'aborted', 'restored', 'paused'] as const) {
      const eligibility = undoEligibilityOf(bareView({ status }));
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain(status);
    }
  });
});
