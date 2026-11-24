// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { copyText, legacyCopyText, MANUAL_COPY_MESSAGE } from '@/entrypoints/sidepanel/clipboard';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { ManagementPort } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const INSTALLS = [
  { id: 'aaaa', name: 'Alpha Blocker' },
  { id: 'bbbb', name: 'Bravo Reader' },
];

function buildPort(): ManagementPort {
  return createChromePort({
    management: createFakeManagement({
      self: SELF,
      extensions: [...INSTALLS.map((install) => makeExtensionInfo(install)), SELF],
    }),
  });
}

interface Harness {
  wrapper: ReturnType<typeof mount>;
  clipboard: { writeText: ReturnType<typeof vi.fn> };
}

async function mountHarness(): Promise<Harness> {
  registerBackgroundHandlers({
    managementPort: buildPort(),
    tabs: { reload: async () => undefined, waitForComplete: async () => true },
  });

  const clipboard = { writeText: vi.fn(async () => undefined) };
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });

  const wrapper = mount(App);
  await flushPromises();
  return { wrapper, clipboard };
}

function screenOf(wrapper: Harness['wrapper']): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

async function click(wrapper: Harness['wrapper'], testId: string): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click');
  await flushPromises();
}

async function startLoop(harness: Harness): Promise<void> {
  await click(harness.wrapper, 'picker-start');
  await click(harness.wrapper, 'preflight-start');
}

/**
 * Two candidates: the all-off baseline, then trial 1 with Alpha enabled and Bravo
 * disabled. A `Problem is gone` verdict leaves Bravo as the lone disabled suspect, so
 * the session completes with a culprit and the history holds a baseline and one trial.
 */
async function runToCulprit(harness: Harness): Promise<void> {
  await startLoop(harness);
  await click(harness.wrapper, 'verdict-gone');
  await click(harness.wrapper, 'trial-apply');
  await click(harness.wrapper, 'verdict-gone');
}

function historyEntries(wrapper: Harness['wrapper']) {
  return wrapper.findAll('[data-testid="history-entry"]').map((row) => ({
    round: row.attributes('data-round'),
    kind: row.attributes('data-kind'),
    roundLabel: row.get('[data-testid="history-entry-round"]').text(),
    enabled: row.get('[data-testid="history-entry-enabled"]').text(),
    disabled: row.get('[data-testid="history-entry-disabled"]').text(),
    verdict: row.get('[data-testid="history-entry-verdict"]').text(),
    retry: row.find('[data-testid="history-entry-retry"]').exists()
      ? row.get('[data-testid="history-entry-retry"]').text()
      : null,
  }));
}

describe('clipboard helper', () => {
  it('uses navigator.clipboard when it resolves', async () => {
    const writeText = vi.fn(async () => undefined);

    await expect(copyText('payload', { clipboard: { writeText }, legacyCopy: () => false })).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('payload');
  });

  it('falls back to the legacy copy path when the clipboard rejects', async () => {
    const legacyCopy = vi.fn(() => true);
    const clipboard = {
      writeText: vi.fn(async () => {
        throw new Error('clipboard denied');
      }),
    };

    await expect(copyText('payload', { clipboard, legacyCopy })).resolves.toBe('copied');
    expect(legacyCopy).toHaveBeenCalledWith('payload');
  });

  it('reports a manual outcome when both paths fail, so the caller can show the textarea', async () => {
    const clipboard = {
      writeText: vi.fn(async () => {
        throw new Error('clipboard denied');
      }),
    };

    await expect(copyText('payload', { clipboard, legacyCopy: () => false })).resolves.toBe('manual');
  });

  it('reports a manual outcome when the legacy path throws', async () => {
    const legacyCopy = () => {
      throw new Error('execCommand is not a function');
    };

    await expect(copyText('payload', { clipboard: null, legacyCopy })).resolves.toBe('manual');
  });

  it('leaves no textarea behind after the legacy copy attempt', () => {
    const before = document.querySelectorAll('textarea').length;

    legacyCopyText('payload');

    expect(document.querySelectorAll('textarea')).toHaveLength(before);
  });
});

describe('history screen', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is reachable from the trial screen', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');

    await click(harness.wrapper, 'trial-history-open');

    expect(screenOf(harness.wrapper)).toBe('history');
    expect(harness.wrapper.find('[data-testid="history-screen"]').exists()).toBe(true);
  });

  it('renders the baseline first and then every trial in order', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');

    await click(harness.wrapper, 'trial-history-open');
    const entries = historyEntries(harness.wrapper);

    expect(entries.map((entry) => entry.round)).toEqual(['0', '1']);
    expect(entries.map((entry) => entry.kind)).toEqual(['baseline', 'trial']);
    expect(entries[0]?.roundLabel).toBe('Baseline check');
    expect(entries[1]?.roundLabel).toBe('Trial 1');
    expect(entries[1]?.verdict).toBe('Awaiting your verdict');
  });

  it('shows each entry’s enabled and disabled batches as names', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');

    await click(harness.wrapper, 'trial-history-open');
    const entries = historyEntries(harness.wrapper);

    expect(entries[0]?.enabled).toBe('Enabled: None');
    expect(entries[0]?.disabled).toBe('Disabled: Alpha Blocker, Bravo Reader');
    expect(entries[1]?.enabled).toBe('Enabled: Alpha Blocker');
    expect(entries[1]?.disabled).toBe('Disabled: Bravo Reader');
    expect(entries[0]?.kind).toBe('baseline');
  });

  it('carries the exact verdict labels and the awaiting marker', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');

    await click(harness.wrapper, 'trial-history-open');
    const entries = historyEntries(harness.wrapper);

    expect(entries[0]?.verdict).toBe('Problem is gone');
    expect(entries[1]?.verdict).toBe('Awaiting your verdict');
  });

  it('marks a retried trial with its retry count', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');
    await click(harness.wrapper, 'trial-retry');

    await click(harness.wrapper, 'trial-history-open');
    const entries = historyEntries(harness.wrapper);

    expect(entries[1]?.retry).toBe('1 retry');
  });

  it('reports the culprit outcome', async () => {
    const harness = await mountHarness();
    await runToCulprit(harness);
    await click(harness.wrapper, 'completed-history');

    expect(harness.wrapper.get('[data-testid="history-outcome"]').attributes('data-outcome')).toBe('culprit');
    expect(harness.wrapper.get('[data-testid="history-outcome-label"]').text()).toBe('Culprit: Bravo Reader');
    expect(harness.wrapper.findAll('[data-testid="history-outcome-name"]')).toHaveLength(1);
    expect(historyEntries(harness.wrapper).map((entry) => entry.round)).toEqual(['0', '1']);
  });

  it('states the session id and the candidate snapshot in the captured order', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    const log = await readBisectLog();
    expect(harness.wrapper.get('[data-testid="history-session-id"]').text()).toContain(log?.sessionId ?? '');
    expect(harness.wrapper.get('[data-testid="history-candidates"]').text()).toContain('Alpha Blocker, Bravo Reader');
  });

  it('returns to the session screen', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    await click(harness.wrapper, 'history-back');

    expect(screenOf(harness.wrapper)).toBe('trial');
  });
});

describe('history copy actions', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies the persisted log exactly, JSON and unchanged', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    await click(harness.wrapper, 'history-copy-log');

    const copied = harness.clipboard.writeText.mock.calls[0]?.[0];
    expect(typeof copied).toBe('string');
    await expect(readBisectLog()).resolves.toEqual(JSON.parse(copied as string));
  });

  it('copies a readable report naming the session, the candidates, the batches, and the outcome', async () => {
    const harness = await mountHarness();
    await runToCulprit(harness);
    await click(harness.wrapper, 'completed-history');

    await click(harness.wrapper, 'history-copy-report');

    const copied = harness.clipboard.writeText.mock.calls[0]?.[0] as string;
    const log = await readBisectLog();
    expect(copied).toContain(log?.sessionId ?? '');
    expect(copied).toContain('Alpha Blocker, Bravo Reader');
    expect(copied).toContain('Baseline check');
    expect(copied).toContain('Trial 1');
    expect(copied).toContain('verdict: Problem is gone');
    expect(copied).toContain('Outcome: Culprit: Bravo Reader');
  });

  it('confirms a successful copy in the live region', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    await click(harness.wrapper, 'history-copy-report');

    expect(harness.wrapper.get('[data-testid="copy-status"]').attributes('data-status')).toBe('copied');
    expect(harness.wrapper.get('[data-testid="copy-status-message"]').text()).toContain('on the clipboard');
    expect(harness.wrapper.get('[data-testid="copy-status-message"]').attributes('aria-live')).toBe('polite');
    expect(harness.wrapper.find('[data-testid="copy-fallback"]').exists()).toBe(false);
  });

  it('shows an error state and a selectable textarea when the clipboard is unavailable', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    harness.clipboard.writeText.mockRejectedValue(new Error('clipboard denied'));
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true });

    await click(harness.wrapper, 'history-copy-log');

    expect(harness.wrapper.get('[data-testid="copy-status"]').attributes('data-status')).toBe('error');
    expect(harness.wrapper.get('[data-testid="copy-status-message"]').text()).toBe(MANUAL_COPY_MESSAGE);
    const fallback = harness.wrapper.get('[data-testid="copy-fallback-text"]');
    expect(fallback.attributes('readonly')).toBeDefined();
    const log = await readBisectLog();
    expect(JSON.parse((fallback.element as HTMLTextAreaElement).value)).toEqual(log);
  });

  it('never renders a fallback textarea on a successful copy', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    await click(harness.wrapper, 'history-copy-log');

    expect(harness.wrapper.find('[data-testid="copy-fallback-text"]').exists()).toBe(false);
  });

  it('offers replay as a documented, disabled affordance', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-history-open');

    expect(harness.wrapper.get('[data-testid="history-replay"]').attributes('disabled')).toBeDefined();
    expect(harness.wrapper.get('[data-testid="history-replay-note"]').text()).toContain('not available yet');
  });
});

describe('history links from the terminal screens', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('links the completed screen to the history and to a disabled replay', async () => {
    const harness = await mountHarness();
    await runToCulprit(harness);

    expect(screenOf(harness.wrapper)).toBe('completed');
    expect(harness.wrapper.get('[data-testid="completed-history"]').text()).toContain('history');
    expect(harness.wrapper.get('[data-testid="completed-replay"]').attributes('disabled')).toBeDefined();
    expect(harness.wrapper.get('[data-testid="completed-replay-note"]').text()).toContain('not available yet');

    await click(harness.wrapper, 'completed-history');

    expect(screenOf(harness.wrapper)).toBe('history');
  });

  it('links the inconclusive screen to the history and to a disabled replay', async () => {
    const harness = await mountHarness();
    await startLoop(harness);
    await click(harness.wrapper, 'verdict-gone');
    await click(harness.wrapper, 'trial-apply');
    await click(harness.wrapper, 'verdict-persists');
    await click(harness.wrapper, 'trial-apply');
    await click(harness.wrapper, 'verdict-persists');

    expect(screenOf(harness.wrapper)).toBe('inconclusive');
    expect(harness.wrapper.get('[data-testid="inconclusive-history"]').text()).toContain('history');
    expect(harness.wrapper.get('[data-testid="inconclusive-replay"]').attributes('disabled')).toBeDefined();

    await click(harness.wrapper, 'inconclusive-history');

    expect(screenOf(harness.wrapper)).toBe('history');
    expect(harness.wrapper.get('[data-testid="history-outcome"]').attributes('data-outcome')).toBe('inconclusive');
  });
});
