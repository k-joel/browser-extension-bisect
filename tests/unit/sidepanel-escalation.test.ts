// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import ToggleFailurePanel from '@/entrypoints/sidepanel/components/ToggleFailurePanel.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { CandidateExtension, SessionPause, ToggleErrorCode } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };

const CANDIDATES: CandidateExtension[] = [ALPHA, BRAVO].map((entry) => ({
  id: entry.id,
  name: entry.name,
  version: '1.0.0',
  description: '',
  enabledAtStart: true,
  mayDisable: true,
  installType: 'normal',
  type: 'extension',
  icons: [],
}));

type Wrapper = ReturnType<typeof mount>;

interface Harness {
  surface: FakeManagement;
  /** Arms a toggle failure; the fake surface reads it on every `setEnabled`. */
  arm(next: (id: string, enabled: boolean) => Error | null): void;
}

function reset(): void {
  fakeBrowser.reset();
  resetSessionQueue();
  messenger.removeAllListeners();
  installMessagingBridge();
}

function register(surface: FakeManagement): void {
  registerBackgroundHandlers({
    managementPort: createChromePort({ management: surface }),
    tabs: { reload: async () => undefined, waitForComplete: async () => true },
  });
}

/**
 * The panel's escalation calls `browser.management` directly (user activation cannot cross
 * a message), and the WXT fake browser ships no `management` implementation. Wiring the
 * fake surface onto the global fake is therefore the honest seam: in Chrome both realms
 * see the same `management` API.
 */
function makeHarness(): Harness {
  let failOn: (id: string, enabled: boolean) => Error | null = () => null;
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      makeExtensionInfo({ id: ALPHA.id, name: ALPHA.name }),
      makeExtensionInfo({ id: BRAVO.id, name: BRAVO.name }),
      SELF,
    ],
    setEnabledError: (id, enabled) => failOn(id, enabled),
  });
  Object.assign(fakeBrowser.management, {
    getAll: surface.getAll,
    getSelf: surface.getSelf,
    setEnabled: surface.setEnabled,
  });
  return {
    surface,
    arm(next) {
      failOn = next;
    },
  };
}

function screenOf(wrapper: Wrapper): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

async function click(wrapper: Wrapper, testId: string): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
  await flushPromises();
}

async function logEvents(): Promise<{ type: string; payload: unknown }[]> {
  return ((await readBisectLog())?.events ?? []).map((event) => ({ type: event.type, payload: event.payload }));
}

async function eventTypes(): Promise<string[]> {
  return (await logEvents()).map((event) => event.type);
}

/**
 * Baseline applied and answered `gone`, so round 1 is planned with `aaaa` enabled and
 * `bbbb` disabled. The failure is armed on the *enable* of `aaaa` just before the batch
 * is applied, which is the shape Chrome reports as `kGestureNeededForEscalationError`.
 */
async function mountWithFailureCode(code = 'kGestureNeededForEscalationError'): Promise<{
  harness: Harness;
  wrapper: Wrapper;
}> {
  const harness = makeHarness();
  register(harness.surface);
  const wrapper = mount(App);
  await flushPromises();
  await click(wrapper, 'picker-start');
  await click(wrapper, 'preflight-start');
  await click(wrapper, 'verdict-gone');
  harness.arm((id, enabled) => (id === ALPHA.id && enabled ? new Error(code) : null));
  await click(wrapper, 'trial-apply');
  return { harness, wrapper };
}

describe('the escalation screen', () => {
  beforeEach(reset);

  it('takes over the paused screen when a toggle failed', async () => {
    const { wrapper } = await mountWithFailureCode();

    expect(screenOf(wrapper)).toBe('toggle-failure');
    expect(wrapper.get('[data-testid="toggle-failure"]').text()).toContain('A toggle failed');
    expect(wrapper.find('[data-testid="paused-screen"]').exists()).toBe(false);
  });

  it('names the failing extension and its mapped code', async () => {
    const { wrapper } = await mountWithFailureCode();

    const rows = wrapper.findAll('[data-testid="toggle-failure-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attributes('data-extension-id')).toBe(ALPHA.id);
    expect(rows[0]?.attributes('data-code')).toBe('needs-user-gesture');
    expect(wrapper.get('[data-testid="toggle-failure-name"]').text()).toBe(ALPHA.name);
    expect(wrapper.get('[data-testid="toggle-failure-message"]').text()).toContain('kGestureNeededForEscalationError');
  });

  it('offers exactly one Enable with click action', async () => {
    const { wrapper } = await mountWithFailureCode();

    expect(wrapper.findAll('[data-testid="escalation-enable"]')).toHaveLength(1);
    expect(wrapper.get('[data-testid="escalation-enable"]').text()).toBe('Enable with click');
    expect(wrapper.get('[data-testid="escalation-actions"]').attributes('data-extension-id')).toBe(ALPHA.id);
    expect(wrapper.find('[data-testid="escalation-decline"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="escalation-note"]').text()).toContain('click');
  });

  it('announces the failure and the ways out through the live region', async () => {
    const { wrapper } = await mountWithFailureCode();

    const live = wrapper.get('[data-testid="sidepanel-live"]');
    expect(live.attributes('aria-live')).toBe('polite');
    expect(live.text()).toContain('Enable it with a click, or restore all extensions');
  });

  it('records a successful click and resumes the session', async () => {
    const { harness, wrapper } = await mountWithFailureCode();
    harness.arm(() => null);

    await click(wrapper, 'escalation-enable');

    const events = await logEvents();
    expect(events.at(-1)).toEqual({ type: 'session-resumed', payload: { reason: 'escalated' } });
    expect(screenOf(wrapper)).not.toBe('toggle-failure');
    expect(harness.surface.setEnabledCalls).toContainEqual({ id: ALPHA.id, enabled: true });
  });

  it('records a failed click and stays on a recovery screen', async () => {
    const { wrapper } = await mountWithFailureCode();

    await click(wrapper, 'escalation-enable');

    expect(screenOf(wrapper)).toBe('toggle-failure');
    const events = await logEvents();
    expect(events.at(-1)?.type).toBe('session-paused');
    expect(events.at(-1)?.payload).toMatchObject({ reason: 'escalation-failed' });
    expect(wrapper.findAll('[data-testid="toggle-failure-code"]').map((node) => node.text())).toContain(
      'needs-user-gesture',
    );
  });

  it('never leaves a silent stuck state when the click is declined', async () => {
    const { wrapper } = await mountWithFailureCode();

    await click(wrapper, 'escalation-decline');

    expect(screenOf(wrapper)).toBe('restored');
    expect((await eventTypes()).at(-1)).toBe('session-reset');
  });

  it('restores the touched candidates on decline', async () => {
    const { harness, wrapper } = await mountWithFailureCode();
    // The baseline left both candidates off and the aborted batch rolled `bbbb` back into
    // the baseline state, so declining owes the user both ids enabled again.
    expect((await harness.surface.getAll()).filter((info) => info.id === BRAVO.id)[0]?.enabled).toBe(false);
    harness.arm(() => null);

    await click(wrapper, 'escalation-decline');

    const after = await harness.surface.getAll();
    expect(after.find((info) => info.id === ALPHA.id)?.enabled).toBe(true);
    expect(after.find((info) => info.id === BRAVO.id)?.enabled).toBe(true);
  });

  it('reports an incomplete restore when declining cannot finish it', async () => {
    const { wrapper } = await mountWithFailureCode();

    // The surface still refuses the re-enable, so declining must not claim a success.
    await click(wrapper, 'escalation-decline');

    expect(screenOf(wrapper)).toBe('restored');
    expect(wrapper.get('[data-testid="restore-summary"]').attributes('data-complete')).toBe('false');
  });
});

describe('manual recovery guidance', () => {
  beforeEach(reset);

  const MANAGER_CODES: { code: string; mapped: ToggleErrorCode }[] = [
    { code: 'kCannotReEnableGreylistedError', mapped: 'manual-recovery-required' },
    { code: 'ExtensionMayModifySettings', mapped: 'policy-blocked' },
  ];

  it.each(MANAGER_CODES)('points a $code failure at the extension manager', async ({ code, mapped }) => {
    const { wrapper } = await mountWithFailureCode(code);

    expect(wrapper.get('[data-testid="toggle-failure-code"]').text()).toBe(mapped);
    expect(wrapper.get('[data-testid="manual-recovery-note"]').text()).toContain('extension manager');
    expect(wrapper.get('[data-testid="manual-recovery-url"]').text()).toBe('chrome://extensions');
    expect(wrapper.get('[data-testid="toggle-failure-manager"]').attributes('data-manager-url')).toBe(
      'chrome://extensions',
    );
    expect(wrapper.find('[data-testid="escalation-enable"]').exists()).toBe(false);
  });

  it('offers no escalation for a removed extension', async () => {
    const { wrapper } = await mountWithFailureCode('kNoExtensionError');

    expect(wrapper.get('[data-testid="toggle-failure-code"]').text()).toBe('extension-removed');
    expect(wrapper.find('[data-testid="escalation-enable"]').exists()).toBe(false);
  });

  it('still offers Restore on a manual-recovery failure', async () => {
    const { wrapper } = await mountWithFailureCode('kCannotReEnableGreylistedError');

    expect(wrapper.find('[data-testid="toggle-failure-restore"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="restore-panel"]').exists()).toBe(true);
  });
});

describe('restore reports incomplete honestly', () => {
  beforeEach(reset);

  /**
   * The abort rolled `bbbb` back, so `aaaa` is the only id still off after the pause.
   * Re-arming on the enable of `aaaa` is what makes the *restore* fail rather than the
   * batch, which is the path that must never be reported as a success.
   */
  async function abortedThenGreylisted(): Promise<{ harness: Harness; wrapper: Wrapper }> {
    const { harness, wrapper } = await mountWithFailureCode('ExtensionMayModifySettings');
    harness.arm((id, enabled) => (id === ALPHA.id && enabled ? new Error('kCannotReEnableGreylistedError') : null));
    return { harness, wrapper };
  }

  it('shows the greylist failure and the extension manager after a restore', async () => {
    const { wrapper } = await abortedThenGreylisted();

    await click(wrapper, 'toggle-failure-restore');

    expect(screenOf(wrapper)).toBe('restored');
    const summary = wrapper.get('[data-testid="restore-summary"]');
    expect(summary.attributes('data-complete')).toBe('false');
    expect(summary.text()).toContain('Restore incomplete');
    expect(wrapper.findAll('[data-testid="restore-failure-code"]').map((node) => node.text())).toContain(
      'manual-recovery-required',
    );
    expect(wrapper.get('[data-testid="restore-manager-url"]').text()).toContain('chrome://extensions');
  });

  it('never relabels a manual-recovery failure as a success', async () => {
    const { wrapper } = await abortedThenGreylisted();

    await click(wrapper, 'toggle-failure-restore');

    const summary = wrapper.get('[data-testid="restore-summary"]');
    expect(summary.text()).not.toContain('enabled again.');
    expect(wrapper.findAll('[data-testid="restore-failure"]')).toHaveLength(1);
  });
});

describe('ToggleFailurePanel component contract', () => {
  function pauseWith(code: ToggleErrorCode): SessionPause {
    return {
      reason: 'toggle-failed',
      drift: null,
      changes: [],
      errors: [{ extensionId: ALPHA.id, code, message: 'the browser refused' }],
      rollback: null,
    };
  }

  it('renders the escalation only for needs-user-gesture', () => {
    const gesture = mount(ToggleFailurePanel, {
      props: { pause: pauseWith('needs-user-gesture'), candidates: CANDIDATES, busy: false },
    });
    expect(gesture.find('[data-testid="escalation-enable"]').exists()).toBe(true);

    for (const code of ['manual-recovery-required', 'policy-blocked', 'extension-removed'] as const) {
      const other = mount(ToggleFailurePanel, {
        props: { pause: pauseWith(code), candidates: CANDIDATES, busy: false },
      });
      expect(other.find('[data-testid="escalation-enable"]').exists()).toBe(false);
    }
  });

  it('emits the extension id from the click action', async () => {
    const wrapper = mount(ToggleFailurePanel, {
      props: { pause: pauseWith('needs-user-gesture'), candidates: CANDIDATES, busy: false },
    });

    await wrapper.get('[data-testid="escalation-enable"]').trigger('click');

    expect(wrapper.emitted('enable-with-click')).toEqual([[ALPHA.id]]);
  });

  it('emits decline from both the decline and the restore actions', async () => {
    const wrapper = mount(ToggleFailurePanel, {
      props: { pause: pauseWith('needs-user-gesture'), candidates: CANDIDATES, busy: false },
    });

    await wrapper.get('[data-testid="escalation-decline"]').trigger('click');
    await wrapper.get('[data-testid="toggle-failure-restore"]').trigger('click');

    expect(wrapper.emitted('decline')).toHaveLength(2);
  });

  it('disables every action while the panel is busy', () => {
    const wrapper = mount(ToggleFailurePanel, {
      props: { pause: pauseWith('needs-user-gesture'), candidates: CANDIDATES, busy: true },
    });

    expect(wrapper.get('[data-testid="escalation-enable"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="escalation-decline"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="toggle-failure-restore"]').attributes('disabled')).toBeDefined();
  });

  it('renders an id that is not a known candidate without crashing', () => {
    const wrapper = mount(ToggleFailurePanel, {
      props: {
        pause: {
          ...pauseWith('policy-blocked'),
          errors: [{ extensionId: 'ghost', code: 'policy-blocked', message: 'gone' }],
        },
        candidates: CANDIDATES,
        busy: false,
      },
    });

    expect(wrapper.get('[data-testid="toggle-failure-name"]').text()).toBe('ghost');
  });
});

describe('the escalation pause survives a panel reload', () => {
  beforeEach(reset);

  it('re-renders the same failing id from the log', async () => {
    const { harness, wrapper } = await mountWithFailureCode();
    expect(screenOf(wrapper)).toBe('toggle-failure');

    wrapper.unmount();
    messenger.removeAllListeners();
    register(harness.surface);
    const reopened = mount(App);
    await flushPromises();

    expect(screenOf(reopened)).toBe('toggle-failure');
    expect(reopened.get('[data-testid="toggle-failure-code"]').text()).toBe('needs-user-gesture');
    expect(reopened.findAll('[data-testid="escalation-enable"]')).toHaveLength(1);
  });
});
