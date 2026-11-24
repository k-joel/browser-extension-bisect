// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { readBisectLog } from '@/utils/bisect/events';
import { createFirefoxPort } from '@/utils/bisect/firefox-port';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect', installType: 'normal' });

interface Install {
  id: string;
  name: string;
  enabled?: boolean;
  installType?: string;
}

interface Harness {
  surface: FakeManagement;
  wrapper: ReturnType<typeof mount>;
}

/**
 * The assisted flow needs a Firefox-shaped port: `canAutoToggle` false for a
 * normal install, and a management surface the user (not the adapter) moves.
 */
function mountAssisted(
  installs: Install[] = [
    { id: 'aaaa', name: 'Alpha Blocker' },
    { id: 'bbbb', name: 'Bravo Reader' },
  ],
): Harness {
  const surface = createFakeManagement({
    self: SELF,
    extensions: [
      ...installs.map((install) =>
        makeExtensionInfo({
          id: install.id,
          name: install.name,
          enabled: install.enabled ?? true,
          installType: install.installType ?? 'normal',
        }),
      ),
      SELF,
    ],
  });
  registerBackgroundHandlers({
    managementPort: createFirefoxPort({ management: surface, debounceMs: 5 }),
    tabs: { reload: async () => undefined, waitForComplete: async () => true },
  });
  return { surface, wrapper: mount(App) };
}

async function userToggles(surface: FakeManagement, states: Record<string, boolean>): Promise<void> {
  for (const [id, enabled] of Object.entries(states)) await surface.setEnabled(id, enabled);
  await flushPromises();
}

function screenOf(wrapper: Harness['wrapper']): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

async function openPreflight(wrapper: Harness['wrapper']): Promise<void> {
  await wrapper.get('[data-testid="picker-start"]').trigger('click');
  await flushPromises();
}

async function startAssistedBaseline(harness: Harness): Promise<void> {
  await openPreflight(harness.wrapper);
  await harness.wrapper.get('[data-testid="preflight-start"]').trigger('click');
  await flushPromises();
}

describe('assisted capability report', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('names assisted mode and explains that the baseline is manual', async () => {
    const { wrapper } = mountAssisted();
    await flushPromises();

    expect(wrapper.get('[data-testid="capability-toggle-mode"]').text()).toContain('Assisted');
    expect(wrapper.get('[data-testid="picker-mode-note"]').text()).toContain('does not let the add-on toggle');
  });

  it('keeps the automated Start reachable because the assisted baseline starts the same session', async () => {
    const { wrapper } = mountAssisted();
    await flushPromises();

    expect(wrapper.get('[data-testid="picker-start"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('[data-testid="picker-blocked"]').exists()).toBe(false);
  });

  it('still blocks the start when no candidate is selectable', async () => {
    const { wrapper } = mountAssisted([{ id: 'aaaa', name: 'Alpha Blocker', enabled: false }]);
    await flushPromises();

    expect(wrapper.get('[data-testid="picker-start"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="picker-blocked"]').text()).toContain('No eligible enabled extensions');
  });

  it('warns in the pre-flight that the user turns the extensions off', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await openPreflight(harness.wrapper);

    expect(harness.wrapper.get('[data-testid="preflight-mode"]').text()).toContain('Assisted');
    expect(harness.wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('turned off by you');
  });

  it('toggles nothing from the pre-flight', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await openPreflight(harness.wrapper);

    expect(harness.surface.setEnabledCalls).toEqual([]);
    await expect(readBisectLog()).resolves.toBeNull();
  });
});

describe('assisted baseline screen', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('offers external attestation and a manual checklist without toggling', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    expect(screenOf(harness.wrapper)).toBe('assisted-baseline');
    expect(harness.wrapper.find('[data-testid="assisted-attest"]').exists()).toBe(true);
    expect(harness.wrapper.find('[data-testid="assisted-open-addons"]').exists()).toBe(true);
    expect(harness.wrapper.find('[data-testid="assisted-verify"]').exists()).toBe(true);
    expect(harness.surface.setEnabledCalls).toEqual([]);
  });

  it('lists every candidate with the state the baseline needs', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    const rows = harness.wrapper.findAll('[data-testid="assisted-checklist-row"]');
    expect(rows.map((row) => row.get('[data-testid="assisted-checklist-name"]').text())).toEqual([
      'Alpha Blocker',
      'Bravo Reader',
    ]);
    expect(rows.every((row) => row.get('[data-testid="assisted-checklist-target"]').text() === 'Off')).toBe(true);
  });

  it('reads progress as a count of the extensions already in the baseline state', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    expect(harness.wrapper.get('[data-testid="assisted-progress"]').text()).toContain('0 of 2 done');

    await harness.surface.setEnabled('aaaa', false);
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('assisted-baseline');
    expect(harness.wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('1 of 2 done');
  });

  it('verifies the manual state through management before asking the baseline question', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('assisted-baseline');
    expect(harness.wrapper.get('[data-testid="sidepanel-error"]').text()).toContain('does not match this batch yet');
    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(false);
  });

  it('accepts the baseline once every candidate is off and asks the exact verdict labels', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('baseline');
    expect(harness.wrapper.get('[data-testid="verdict-persists"]').text()).toBe('Problem persists');
    expect(harness.wrapper.get('[data-testid="verdict-gone"]').text()).toBe('Problem is gone');
  });

  it('records the manual mode in the log when the baseline is accepted', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();

    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    const log = await readBisectLog();
    const baseline = log?.events.find((event) => event.type === 'baseline-recorded');
    expect(baseline?.payload).toEqual({ mode: 'manual', verdict: 'gone' });
  });

  it('opens the Add-ons Manager and reports the outcome', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    await harness.wrapper.get('[data-testid="assisted-open-addons"]').trigger('click');
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="assisted-addons-message"]').text()).toMatch(
      /open in a new tab|could not be opened/,
    );
  });

  it('records external-clean from the attestation and proceeds at full-enabled state', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);
    const before = await harness.surface.getAll();

    await harness.wrapper.get('[data-testid="assisted-attest"]').trigger('click');
    await flushPromises();

    const log = await readBisectLog();
    expect(log?.events.find((event) => event.type === 'baseline-recorded')?.payload).toEqual({
      mode: 'external',
      verdict: 'gone',
    });
    expect(await harness.surface.getAll()).toEqual(before);
    expect(harness.surface.setEnabledCalls).toEqual([]);
    expect(screenOf(harness.wrapper)).toBe('trial');
  });
});

describe('assisted host issue and N = 1', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('aborts as a host issue when the manual all-off baseline persists', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();

    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('host-issue');
    expect(harness.wrapper.get('[data-testid="host-issue-explanation"]').text()).toContain(
      'no installed extension is implicated',
    );
  });

  it('resolves N = 1 from the assisted baseline without a partition loop', async () => {
    const harness = mountAssisted([{ id: 'aaaa', name: 'Alpha Blocker' }]);
    await flushPromises();
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, { aaaa: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();

    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('completed');
    expect(harness.wrapper.get('[data-testid="culprit-name"]').text()).toBe('Alpha Blocker');
  });

  it('blocks N = 0 before any assisted screen appears', async () => {
    const harness = mountAssisted([{ id: 'aaaa', name: 'Alpha Blocker', enabled: false }]);
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="picker-start"]').attributes('disabled')).toBeDefined();
    expect(screenOf(harness.wrapper)).toBe('picker');
  });
});

describe('assisted restore', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  async function completeManualBaseline(harness: Harness): Promise<void> {
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();
  }

  it('shows the original states as a checklist and reports an incomplete restore', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await completeManualBaseline(harness);
    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();

    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();

    const summary = harness.wrapper.get('[data-testid="assisted-restore-summary"]');
    expect(summary.attributes('data-complete')).toBe('false');
    expect(summary.text()).toContain('still to turn back on');
    const rows = harness.wrapper.findAll('[data-testid="assisted-restore-row"]');
    expect(rows.map((row) => row.get('[data-testid="assisted-restore-name"]').text())).toEqual([
      'Alpha Blocker',
      'Bravo Reader',
    ]);
    expect(rows.every((row) => row.attributes('data-done') === 'false')).toBe(true);
  });

  it('verifies completion once the user re-enabled every touched extension', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await completeManualBaseline(harness);
    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();

    await userToggles(harness.surface, { aaaa: true, bbbb: true });
    await harness.wrapper.get('[data-testid="assisted-restore-verify"]').trigger('click');
    await flushPromises();

    const summary = harness.wrapper.get('[data-testid="assisted-restore-summary"]');
    expect(summary.attributes('data-complete')).toBe('true');
    expect(summary.text()).toContain('Every touched extension is enabled again');
    expect(harness.surface.setEnabledCalls.filter((call) => call.enabled)).toHaveLength(2);
  });

  it('never claims a restore the adapter could not make', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await completeManualBaseline(harness);
    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();

    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="restore-summary"]').attributes('data-complete')).toBe('false');
  });
});
