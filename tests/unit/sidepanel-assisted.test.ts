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

/**
 * The background publishes its debounced re-verify asynchronously, so a component test
 * has to let the promise chain settle before reading the refreshed counter. Each turn
 * yields to the macrotask queue, which is where the debounce timer lands.
 */
async function waitUntil(predicate: () => boolean, turns = 40): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) {
    await flushPromises();
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('waitUntil timed out');
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

  /**
   * SPEC §Management port: `onEnabled`/`onDisabled` must debounce a re-verify, and the
   * progress must follow it. Before this, the counter only moved when the user pressed
   * Verify, so a user who disabled every extension by hand still read "0 of 2 done".
   */
  it('moves the progress counter on the management events alone, without a Verify press', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);
    expect(harness.wrapper.get('[data-testid="assisted-progress"]').text()).toContain('0 of 2 done');

    await userToggles(harness.surface, { aaaa: false });
    await harness.surface.emitDisabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha Blocker', enabled: false }));

    // The panel never pressed Verify; only the background's debounced re-verify ran.
    await waitUntil(() => harness.wrapper.get('[data-testid="assisted-progress"]').text().includes('1 of 2 done'));

    expect(screenOf(harness.wrapper)).toBe('assisted-baseline');
    expect(harness.wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('1 of 2 done');
  });

  it('completes the progress from the events alone when the last extension is turned off', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    harness.surface.emitDisabled(makeExtensionInfo({ id: 'aaaa', name: 'Alpha Blocker', enabled: false }));
    harness.surface.emitDisabled(makeExtensionInfo({ id: 'bbbb', name: 'Bravo Reader', enabled: false }));

    await waitUntil(() => harness.wrapper.get('[data-testid="assisted-progress"]').text().includes('2 of 2 done'));

    // The verdict is still withheld: the state was observed, never confirmed.
    expect(screenOf(harness.wrapper)).toBe('assisted-baseline');
    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(false);
  });

  it('keeps the checklist rows in step with the live counter', async () => {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);

    await userToggles(harness.surface, { bbbb: false });
    await harness.surface.emitDisabled(makeExtensionInfo({ id: 'bbbb', name: 'Bravo Reader', enabled: false }));

    await waitUntil(() => {
      const rows = harness.wrapper.findAll('[data-testid="assisted-checklist-row"]');
      return rows.some((row) => row.get('[data-testid="assisted-checklist-done"]').attributes('data-done') === 'true');
    });

    const done = harness.wrapper
      .findAll('[data-testid="assisted-checklist-row"]')
      .filter((row) => row.get('[data-testid="assisted-checklist-done"]').attributes('data-done') === 'true');
    expect(done).toHaveLength(1);
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

/**
 * The assisted trial screen: the add-on may not toggle anything, so the panel asks
 * the user to match the batch and only then offers a verdict. Verdict presence is
 * the state signal every other test relies on, so absence is asserted explicitly.
 */
describe('assisted trial screen', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  async function startAssistedTrial(
    installs: Install[] = [
      { id: 'aaaa', name: 'Alpha Blocker' },
      { id: 'bbbb', name: 'Bravo Reader' },
      { id: 'cccc', name: 'Charlie Toolbar' },
    ],
  ): Promise<Harness> {
    const harness = mountAssisted(installs);
    await flushPromises();
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, Object.fromEntries(installs.map((install) => [install.id, false])));
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="trial-apply"]').trigger('click');
    await flushPromises();
    return harness;
  }

  it('routes an assisted partition batch to the assisted trial screen', async () => {
    const harness = await startAssistedTrial();

    expect(screenOf(harness.wrapper)).toBe('assisted-trial');
    expect(harness.wrapper.find('[data-testid="assisted-trial"]').exists()).toBe(true);
  });

  it('shows separate enable and disable checklists instead of one blob', async () => {
    const harness = await startAssistedTrial();

    const enableRows = harness.wrapper.findAll('[data-testid="assisted-trial-enable-row"]');
    const disableRows = harness.wrapper.findAll('[data-testid="assisted-trial-disable-row"]');

    expect(enableRows.map((row) => row.get('[data-testid="assisted-trial-enable-name"]').text())).toEqual([
      'Alpha Blocker',
      'Bravo Reader',
    ]);
    expect(disableRows.map((row) => row.get('[data-testid="assisted-trial-disable-name"]').text())).toEqual([
      'Charlie Toolbar',
    ]);
  });

  it('does not render the verdict buttons before verification', async () => {
    const harness = await startAssistedTrial();

    expect(harness.wrapper.find('[data-testid="verdict-persists"]').exists()).toBe(false);
    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(false);
  });

  it('offers the Add-ons Manager, Verify and the manual progress', async () => {
    const harness = await startAssistedTrial();

    expect(harness.wrapper.find('[data-testid="assisted-trial-open-addons"]').exists()).toBe(true);
    expect(harness.wrapper.find('[data-testid="assisted-trial-verify"]').exists()).toBe(true);
    // Round 1 disables the tail suspect, which is already off after the baseline.
    expect(harness.wrapper.get('[data-testid="assisted-trial-progress"]').text()).toContain('1 of 3 matched');
    expect(harness.wrapper.get('[data-testid="assisted-trial-progress"]').attributes('data-matched')).toBe('false');
  });

  it('reports manual progress once the user matches the batch through management', async () => {
    const harness = await startAssistedTrial();

    await userToggles(harness.surface, { aaaa: true });
    await harness.wrapper.get('[data-testid="assisted-trial-verify"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('assisted-trial');
    expect(harness.wrapper.get('[data-testid="sidepanel-live"]').text()).toContain('2 of 3 done');
    expect(harness.wrapper.get('[data-testid="assisted-trial-progress"]').text()).toContain('2 of 3 matched');
    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(false);
  });

  it('reveals the exact verdict labels only after the batch verifies', async () => {
    const harness = await startAssistedTrial();
    await userToggles(harness.surface, { aaaa: true, bbbb: true });

    expect(harness.wrapper.find('[data-testid="verdict-gone"]').exists()).toBe(false);

    await harness.wrapper.get('[data-testid="assisted-trial-verify"]').trigger('click');
    await flushPromises();

    expect(screenOf(harness.wrapper)).toBe('trial');
    expect(harness.wrapper.get('[data-testid="verdict-persists"]').text()).toBe('Problem persists');
    expect(harness.wrapper.get('[data-testid="verdict-gone"]').text()).toBe('Problem is gone');
  });

  it('reports the unverified batch instead of accepting it', async () => {
    const harness = await startAssistedTrial();

    await harness.wrapper.get('[data-testid="assisted-trial-verify"]').trigger('click');
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="sidepanel-error"]').text()).toContain('does not match this batch yet');
    expect(screenOf(harness.wrapper)).toBe('assisted-trial');
  });

  it('reports the Add-ons Manager outcome and falls back to the copyable list', async () => {
    const harness = await startAssistedTrial();

    await harness.wrapper.get('[data-testid="assisted-trial-open-addons"]').trigger('click');
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="assisted-trial-addons-message"]').text()).toMatch(
      /open in a new tab|could not be opened/,
    );
    expect(harness.wrapper.findAll('[data-testid="assisted-trial-enable-row"]').length).toBeGreaterThan(0);
    expect(harness.wrapper.findAll('[data-testid="assisted-trial-disable-row"]').length).toBeGreaterThan(0);
  });

  it('keeps the cleared candidates on the enable checklist across the loop', async () => {
    const harness = await startAssistedTrial([
      { id: 'aaaa', name: 'Alpha Blocker' },
      { id: 'bbbb', name: 'Bravo Reader' },
      { id: 'cccc', name: 'Charlie Toolbar' },
      { id: 'dddd', name: 'Delta Helper' },
    ]);

    // Round 1 asks for the first half on and the second half off.
    await userToggles(harness.surface, { aaaa: true, bbbb: true, cccc: false, dddd: false });
    await harness.wrapper.get('[data-testid="assisted-trial-verify"]').trigger('click');
    await flushPromises();

    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="trial-apply"]').trigger('click');
    await flushPromises();

    const enableNames = harness.wrapper
      .findAll('[data-testid="assisted-trial-enable-row"]')
      .map((row) => row.get('[data-testid="assisted-trial-enable-name"]').text());

    expect(screenOf(harness.wrapper)).toBe('assisted-trial');
    expect(enableNames).toEqual(['Alpha Blocker', 'Bravo Reader', 'Charlie Toolbar']);
  });
});

describe('assisted restore pending and explicit accept', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  async function restoreOnce(): Promise<Harness> {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="verdict-persists"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();
    return harness;
  }

  it('stays restore-pending while the checklist is unfinished', async () => {
    const harness = await restoreOnce();

    const summary = harness.wrapper.get('[data-testid="assisted-restore-summary"]');
    expect(summary.attributes('data-complete')).toBe('false');
    expect(summary.text()).toContain('still to turn back on');
    expect(harness.wrapper.find('[data-testid="assisted-restore-accept"]').exists()).toBe(true);
  });

  it('offers the explicit accept of the remaining differences', async () => {
    const harness = await restoreOnce();
    await userToggles(harness.surface, { aaaa: true });

    await harness.wrapper.get('[data-testid="assisted-restore-accept"]').trigger('click');
    await flushPromises();

    const log = await readBisectLog();
    expect(log?.events.at(-1)?.payload).toMatchObject({
      restored: false,
      manualIds: ['bbbb'],
      accepted: true,
    });
    expect(harness.wrapper.get('[data-testid="assisted-restore-accepted"]').text()).toContain('accepted');
  });

  it('reports completion once the checklist verifies, without the accept action', async () => {
    const harness = await restoreOnce();
    await userToggles(harness.surface, { aaaa: true, bbbb: true });
    await harness.wrapper.get('[data-testid="assisted-restore-verify"]').trigger('click');
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="assisted-restore-summary"]').attributes('data-complete')).toBe('true');
    expect(harness.wrapper.find('[data-testid="assisted-restore-accept"]').exists()).toBe(false);
  });
});

/**
 * SPEC §Restore keeps a restore-pending session pending until the state matches or the user
 * accepts what is left, and a `session-reset { restored: false, manualIds }` is not a
 * success. The restored screen used to assert "the touched extensions are back to their
 * original states" above two extensions that were visibly still off.
 */
describe('the restored screen after an incomplete assisted restore', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  async function restoreToRestoredScreen(): Promise<Harness> {
    const harness = mountAssisted();
    await flushPromises();
    await startAssistedBaseline(harness);
    await userToggles(harness.surface, { aaaa: false, bbbb: false });
    await harness.wrapper.get('[data-testid="assisted-verify"]').trigger('click');
    await flushPromises();
    await harness.wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    expect(screenOf(harness.wrapper)).toBe('trial');
    await harness.wrapper.get('[data-testid="restore-button"]').trigger('click');
    await flushPromises();
    expect(screenOf(harness.wrapper)).toBe('restored');
    return harness;
  }

  it('does not claim the touched extensions are back when they are not', async () => {
    const harness = await restoreToRestoredScreen();

    const explanation = harness.wrapper.get('[data-testid="restored-explanation"]').text();
    expect(explanation).not.toContain('back to their original states');
    expect(explanation).toContain('is not back in its original state');

    const summary = harness.wrapper.get('[data-testid="restored-summary"]');
    expect(summary.attributes('data-complete')).toBe('false');
    expect(summary.text()).toContain('still off');
    expect(summary.text()).not.toContain('0 extensions');
  });

  it('names every extension that is still off, with what to do about it', async () => {
    const harness = await restoreToRestoredScreen();

    const rows = harness.wrapper.findAll('[data-testid="restored-leftover"]');
    expect(rows.map((row) => row.get('[data-testid="restored-leftover-name"]').text())).toEqual([
      'Alpha Blocker',
      'Bravo Reader',
    ]);
    expect(rows.map((row) => row.attributes('data-kind'))).toEqual(['manual', 'manual']);
    expect(harness.wrapper.get('[data-testid="restored-next-step"]').text()).toContain('Add-ons Manager');
    expect(harness.wrapper.get('[data-testid="restored-screen"]').attributes('data-complete')).toBe('false');
  });

  it('still offers the explicit accept of the remaining differences', async () => {
    const harness = await restoreToRestoredScreen();

    expect(harness.wrapper.find('[data-testid="assisted-restore-accept"]').exists()).toBe(true);
    await harness.wrapper.get('[data-testid="assisted-restore-accept"]').trigger('click');
    await flushPromises();

    expect(harness.wrapper.get('[data-testid="restored-detail"]').text()).toContain('You accepted');
    expect(harness.wrapper.find('[data-testid="restored-next-step"]').exists()).toBe(false);
    expect(harness.wrapper.get('[data-testid="restored-summary"]').attributes('data-complete')).toBe('false');
  });

  it('renders the honest state after a panel reload, when no live outcome is held', async () => {
    const harness = await restoreToRestoredScreen();
    harness.wrapper.unmount();
    messenger.removeAllListeners();
    registerBackgroundHandlers({
      managementPort: createFirefoxPort({ management: harness.surface, debounceMs: 5 }),
      tabs: { reload: async () => undefined, waitForComplete: async () => true },
    });
    const reopened = mount(App);
    await flushPromises();

    expect(screenOf(reopened)).toBe('restored');
    expect(reopened.get('[data-testid="restored-summary"]').attributes('data-complete')).toBe('false');
    expect(reopened.findAll('[data-testid="restored-leftover"]')).toHaveLength(2);
  });
});
