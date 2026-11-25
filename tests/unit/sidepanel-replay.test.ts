// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { copyText, MANUAL_COPY_MESSAGE } from '@/entrypoints/sidepanel/clipboard';
import { REPLAY_DIAGNOSTIC_NOTICE } from '@/entrypoints/sidepanel/replay';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type {
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  CapabilityReport,
  ManagementPort,
} from '@/utils/bisect/domain';
import { readBisectLog, writeBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const CAPABILITY: CapabilityReport = {
  browserName: 'chrome',
  canAutoToggle: true,
  selfInstallType: 'normal',
  sideSurface: 'side-panel',
};

function candidate(id: string, name: string): CandidateExtension {
  return {
    id,
    name,
    version: '1.0.0',
    description: '',
    enabledAtStart: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension',
    icons: [],
  };
}

const ALPHA = candidate('aaaa', 'Alpha Blocker');
const BRAVO = candidate('bbbb', 'Bravo Reader');
const CHARLIE = candidate('cccc', 'Charlie Toolbar');
const DELTA = candidate('dddd', 'Delta Helper');

function buildPort(): ManagementPort {
  return createChromePort({
    management: createFakeManagement({
      self: SELF,
      extensions: [ALPHA, BRAVO, SELF].map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })),
    }),
  });
}

let clock = 1000;

function event<Type extends BisectEventType>(type: Type, payload: BisectEventPayloads[Type]): BisectEvent {
  clock += 1;
  return { type, at: clock, schemaVersion: 1, payload } as BisectEvent;
}

function logOf(events: BisectEvent[]): BisectLog {
  return { schemaVersion: 1, sessionId: 'session-replay', events };
}

function startEvent(candidates: CandidateExtension[]): BisectEvent {
  return event('session-started', {
    candidateOrder: candidates,
    capability: CAPABILITY,
    baselineMode: 'auto',
    testTab: { tabId: 4, url: null },
  });
}

/**
 * A four-candidate session that really ends on Bravo: trial 1 keeps the enabled half,
 * trial 2 disables Bravo alone and the problem is gone. Correcting trial 1 to
 * `Problem is gone` re-implicates Delta and makes trial 2's batch wrong.
 */
function fourCandidateLog(): BisectLog {
  return logOf([
    startEvent([ALPHA, BRAVO, CHARLIE, DELTA]),
    event('trial-started', { round: 0, enabledIds: [], disabledIds: ['aaaa', 'bbbb', 'cccc', 'dddd'] }),
    event('trial-applied', { round: 0, errors: [] }),
    event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
    event('trial-started', { round: 1, enabledIds: ['aaaa', 'bbbb'], disabledIds: ['cccc', 'dddd'] }),
    event('trial-applied', { round: 1, errors: [] }),
    event('verdict-recorded', { round: 1, verdict: 'persists' }),
    event('trial-started', {
      round: 2,
      enabledIds: ['cccc', 'dddd', 'aaaa'],
      disabledIds: ['bbbb'],
    }),
    event('trial-applied', { round: 2, errors: [] }),
    event('verdict-recorded', { round: 2, verdict: 'gone' }),
    event('session-completed', { culpritId: 'bbbb' }),
  ]);
}

function twoCandidateLog(): BisectLog {
  return logOf([
    startEvent([ALPHA, BRAVO]),
    event('trial-started', { round: 0, enabledIds: [], disabledIds: ['aaaa', 'bbbb'] }),
    event('trial-applied', { round: 0, errors: [] }),
    event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
    event('trial-started', { round: 1, enabledIds: ['aaaa'], disabledIds: ['bbbb'] }),
    event('trial-applied', { round: 1, errors: [] }),
    event('verdict-recorded', { round: 1, verdict: 'gone' }),
    event('session-completed', { culpritId: 'bbbb' }),
  ]);
}

interface Harness {
  wrapper: ReturnType<typeof mount>;
  clipboard: { writeText: ReturnType<typeof vi.fn> };
}

async function mountWithLog(log: BisectLog): Promise<Harness> {
  await writeBisectLog(log);
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

async function openReplayFromCompleted(harness: Harness): Promise<void> {
  await click(harness.wrapper, 'completed-replay');
}

function differenceRows(wrapper: Harness['wrapper']) {
  return wrapper.findAll('[data-testid="replay-difference"]').map((row) => ({
    round: row.attributes('data-round'),
    label: row.get('[data-testid="replay-difference-label"]').text(),
    recordedEnabled: row.get('[data-testid="replay-difference-enabled"]').text(),
    recordedDisabled: row.get('[data-testid="replay-difference-disabled"]').text(),
    recomputedEnabled: row.get('[data-testid="replay-difference-recomputed-enabled"]').text(),
    recomputedDisabled: row.get('[data-testid="replay-difference-recomputed-disabled"]').text(),
  }));
}

describe('the replay screen', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is reachable from the completed screen', async () => {
    const harness = await mountWithLog(twoCandidateLog());
    expect(harness.wrapper.get('[data-testid="completed-replay"]').attributes('disabled')).toBeUndefined();

    await openReplayFromCompleted(harness);

    expect(screenOf(harness.wrapper)).toBe('replay');
    expect(harness.wrapper.find('[data-testid="replay-screen"]').exists()).toBe(true);
  });

  it('is reachable from the history screen', async () => {
    const harness = await mountWithLog(twoCandidateLog());
    await click(harness.wrapper, 'completed-history');

    await click(harness.wrapper, 'history-replay');

    expect(screenOf(harness.wrapper)).toBe('replay');
  });

  it('says replay is diagnostic and does not change installed extensions', async () => {
    const harness = await mountWithLog(twoCandidateLog());
    await openReplayFromCompleted(harness);

    const notice = harness.wrapper.get('[data-testid="replay-diagnostic-notice"]').text();

    expect(notice).toBe(REPLAY_DIAGNOSTIC_NOTICE);
    expect(notice).toContain('does not change installed extensions');
    expect(harness.wrapper.get('[data-testid="replay-source-note"]').text()).toContain('copy');
  });

  it('lists every recorded verdict of the copy', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);

    const rounds = harness.wrapper.findAll('[data-testid="replay-round"]').map((row) => ({
      round: row.attributes('data-round'),
      original: row.get('[data-testid="replay-round-original"]').text(),
      edited: row.get('[data-testid="replay-round-edited"]').text(),
    }));

    expect(rounds.map((row) => row.round)).toEqual(['1', '2']);
    expect(rounds[0]?.original).toBe('Recorded: Problem persists');
    expect(rounds[0]?.edited).toBe('Copy: Problem persists');
  });

  it('edits a verdict on a copy and leaves the live log untouched', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    const before = await readBisectLog();
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-correct-1');

    const after = await readBisectLog();
    expect(after).toEqual(before);
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
    expect(harness.wrapper.get('[data-testid="replay-correction-count"]').text()).toContain('1 verdict corrected');
    expect(harness.wrapper.get('[data-testid="replay-round"]').attributes('data-corrected')).toBe('true');
  });

  it('replays the corrected copy to the culprit the correction implicates', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-correct-1');
    await click(harness.wrapper, 'replay-run');

    expect(harness.wrapper.get('[data-testid="replay-result"]').attributes('data-outcome')).toBe('culprit');
    expect(harness.wrapper.get('[data-testid="replay-outcome"]').text()).toBe('Replayed culprit: Delta Helper');
  });

  it('keeps the recorded culprit when no verdict is corrected', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-run');

    expect(harness.wrapper.get('[data-testid="replay-outcome"]').text()).toBe('Replayed culprit: Bravo Reader');
    expect(harness.wrapper.get('[data-testid="replay-differences-status"]').attributes('data-differences')).toBe(
      'none',
    );
  });

  it('renders the recomputed trials with their batches', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-run');

    const trials = harness.wrapper.findAll('[data-testid="replay-trial"]').map((row) => ({
      round: row.attributes('data-round'),
      enabled: row.get('[data-testid="replay-trial-enabled"]').text(),
      disabled: row.get('[data-testid="replay-trial-disabled"]').text(),
    }));

    expect(trials.map((trial) => trial.round)).toEqual(['1', '2']);
    expect(trials[0]?.enabled).toBe('Enabled: Alpha Blocker, Bravo Reader');
    expect(trials[0]?.disabled).toBe('Disabled: Charlie Toolbar, Delta Helper');
  });

  it('marks every recorded batch that disagrees with the verdicts', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-correct-1');
    await click(harness.wrapper, 'replay-run');

    const status = harness.wrapper.get('[data-testid="replay-differences-status"]');
    expect(status.attributes('data-differences')).toBe('present');
    expect(status.text()).toContain('differ');

    const differences = differenceRows(harness.wrapper);
    expect(differences.map((row) => row.round)).toEqual(['2']);
    expect(differences[0]?.label).toContain('recorded batch differs');
    expect(differences[0]?.recordedEnabled).toBe('Recorded enabled: Charlie Toolbar, Delta Helper, Alpha Blocker');
    expect(differences[0]?.recordedDisabled).toBe('Recorded disabled: Bravo Reader');
    expect(differences[0]?.recomputedDisabled).toBe('Recomputed disabled: Delta Helper');
  });

  it('discards the corrections and returns to the recorded result', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);
    await click(harness.wrapper, 'replay-correct-1');

    await click(harness.wrapper, 'replay-reset-edits');

    expect(harness.wrapper.find('[data-testid="replay-correction-count"]').exists()).toBe(false);
    await click(harness.wrapper, 'replay-run');
    expect(harness.wrapper.get('[data-testid="replay-outcome"]').text()).toBe('Replayed culprit: Bravo Reader');
  });

  it('reports the first invalid event for a structurally broken copy', async () => {
    const log = fourCandidateLog();
    const broken = logOf([
      ...log.events,
      { type: 'session-exploded', at: 9999, schemaVersion: 1, payload: {} } as unknown as BisectEvent,
    ]);
    const harness = await mountWithLog(broken);
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-run');

    expect(harness.wrapper.get('[data-testid="replay-result"]').attributes('data-outcome')).toBe('invalid');
    expect(harness.wrapper.get('[data-testid="replay-invalid-message"]').text()).toContain('invalid');
    expect(harness.wrapper.get('[data-testid="replay-invalid-event"]').text()).toContain(
      `Event ${broken.events.length - 1}`,
    );
    expect(harness.wrapper.find('[data-testid="replay-outcome"]').exists()).toBe(false);
    expect(harness.wrapper.find('[data-testid="replay-trials"]').exists()).toBe(false);
  });

  it('copies a replay report that names the correction and the diagnostic nature', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);
    await click(harness.wrapper, 'replay-correct-1');
    await click(harness.wrapper, 'replay-run');

    await click(harness.wrapper, 'replay-copy-report');

    const copied = harness.clipboard.writeText.mock.calls[0]?.[0] as string;
    expect(copied).toContain('Replay of a corrected bisect log');
    expect(copied).toContain('no installed extension was changed');
    expect(copied).toContain('Recorded batches that differ: trial 2');
    expect(copied).toContain('Outcome: Replayed culprit: Delta Helper');
    expect(harness.wrapper.get('[data-testid="copy-status"]').attributes('data-status')).toBe('copied');
  });

  it('offers the selectable fallback when the clipboard is unavailable', async () => {
    const harness = await mountWithLog(fourCandidateLog());
    await openReplayFromCompleted(harness);
    await click(harness.wrapper, 'replay-run');
    harness.clipboard.writeText.mockRejectedValue(new Error('clipboard denied'));
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true });

    await click(harness.wrapper, 'replay-copy-report');

    expect(harness.wrapper.get('[data-testid="copy-status"]').attributes('data-status')).toBe('error');
    expect(harness.wrapper.get('[data-testid="copy-status-message"]').text()).toBe(MANUAL_COPY_MESSAGE);
    const fallback = harness.wrapper.get('[data-testid="copy-fallback-text"]');
    expect((fallback.element as HTMLTextAreaElement).value).toContain('Replayed culprit: Bravo Reader');
  });

  it('returns to the session screen', async () => {
    const harness = await mountWithLog(twoCandidateLog());
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-back');

    expect(screenOf(harness.wrapper)).toBe('completed');
  });

  it('is reachable from the inconclusive screen', async () => {
    const harness = await mountWithLog(
      logOf([
        startEvent([ALPHA, BRAVO]),
        event('trial-started', { round: 0, enabledIds: [], disabledIds: ['aaaa', 'bbbb'] }),
        event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
        event('trial-started', { round: 1, enabledIds: ['aaaa'], disabledIds: ['bbbb'] }),
        event('verdict-recorded', { round: 1, verdict: 'gone' }),
        event('session-inconclusive', { ambiguityIds: ['bbbb'], reason: 'verdict-contradiction' }),
      ]),
    );

    expect(screenOf(harness.wrapper)).toBe('inconclusive');
    await click(harness.wrapper, 'inconclusive-replay');

    expect(screenOf(harness.wrapper)).toBe('replay');
  });

  it('reports the ambiguity set when a correction leaves no single culprit', async () => {
    const harness = await mountWithLog(
      logOf([
        startEvent([ALPHA, BRAVO]),
        event('trial-started', { round: 0, enabledIds: [], disabledIds: ['aaaa', 'bbbb'] }),
        event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
        event('trial-started', { round: 1, enabledIds: ['aaaa'], disabledIds: ['bbbb'] }),
        event('verdict-recorded', { round: 1, verdict: 'gone' }),
        event('session-completed', { culpritId: 'bbbb' }),
      ]),
    );
    await openReplayFromCompleted(harness);

    await click(harness.wrapper, 'replay-correct-1');
    await click(harness.wrapper, 'replay-run');

    expect(harness.wrapper.get('[data-testid="replay-result"]').attributes('data-outcome')).toBe('inconclusive');
    expect(harness.wrapper.get('[data-testid="replay-outcome"]').text()).toContain('inconclusive');
  });
});

describe('the replay clipboard helper', () => {
  it('reports a copy outcome without touching the log', async () => {
    const writeText = vi.fn(async () => undefined);

    await expect(copyText('report', { clipboard: { writeText }, legacyCopy: () => false })).resolves.toBe('copied');
  });
});
