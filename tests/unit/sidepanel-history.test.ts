import { describe, expect, it } from 'vitest';
import {
  BASELINE_MODE_LABELS,
  buildHistory,
  renderBisectReport,
  retryCountsByRound,
  serializeBisectLog,
} from '@/entrypoints/sidepanel/history';
import type {
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  CapabilityReport,
  Trial,
} from '@/utils/bisect/domain';
import { reduceLog } from '@/utils/bisect/events';

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

let clock = 1000;

function event<Type extends BisectEventType>(type: Type, payload: BisectEventPayloads[Type]): BisectEvent {
  clock += 1;
  return { type, at: clock, schemaVersion: 1, payload } as BisectEvent;
}

function logOf(events: BisectEvent[]): BisectLog {
  return { schemaVersion: 1, sessionId: 'session-abc', events };
}

function startEvent(candidates: CandidateExtension[]): BisectEvent {
  return event('session-started', {
    candidateOrder: candidates,
    capability: CAPABILITY,
    baselineMode: 'auto',
    testTab: { tabId: 7, url: null },
  });
}

function baselineTrial(disabled: string[]): BisectEvent[] {
  return [
    event('trial-started', { round: 0, enabledIds: [], disabledIds: disabled }),
    event('trial-applied', { round: 0, errors: [] }),
    event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
  ];
}

function partition(round: number, enabled: string[], disabled: string[]): BisectEvent[] {
  return [
    event('trial-started', { round, enabledIds: enabled, disabledIds: disabled }),
    event('trial-applied', { round, errors: [] }),
  ];
}

function viewOf(log: BisectLog) {
  const view = reduceLog(log);
  if (view === null) throw new Error('expected a session view');
  return view;
}

describe('history model ordering', () => {
  it('lists the baseline first and then every trial in round order', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'bbbb' }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.entries.map((entry) => entry.roundLabel)).toEqual(['Baseline check', 'Trial 1']);
    expect(model.entries.map((entry) => entry.round)).toEqual([0, 1]);
    expect(model.entries[0]?.kind).toBe('baseline');
    expect(model.entries[1]?.kind).toBe('trial');
  });

  it('gives every entry its enabled and disabled batches as candidate names', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO, CHARLIE]),
      ...baselineTrial(['aaaa', 'bbbb', 'cccc']),
      ...partition(1, ['aaaa', 'bbbb'], ['cccc']),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.entries[0]?.enabledNames).toEqual([]);
    expect(model.entries[0]?.disabledNames).toEqual(['Alpha Blocker', 'Bravo Reader', 'Charlie Toolbar']);
    expect(model.entries[1]?.enabledNames).toEqual(['Alpha Blocker', 'Bravo Reader']);
    expect(model.entries[1]?.disabledNames).toEqual(['Charlie Toolbar']);
  });

  it('carries each verdict with the exact labels', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'persists' }),
      ...partition(2, ['aaaa'], ['bbbb']),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.entries[0]?.verdictLabel).toBe('Problem is gone');
    expect(model.entries[1]?.verdictLabel).toBe('Problem persists');
    expect(model.entries[2]?.verdictLabel).toBe('Awaiting your verdict');
  });

  it('counts retries per round and leaves an unretried round without a marker', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('trial-retried', { round: 1, reason: 'could not reproduce' }),
      event('trial-applied', { round: 1, errors: [] }),
      event('trial-retried', { round: 1 }),
      event('trial-applied', { round: 1, errors: [] }),
      ...partition(2, ['aaaa'], ['bbbb']),
    ]);

    expect(retryCountsByRound(log)).toEqual({ 1: 2 });
    const model = buildHistory(viewOf(log), log);
    expect(model.entries[0]?.retries).toBe(0);
    expect(model.entries[0]?.retryLabel).toBeNull();
    expect(model.entries[1]?.retries).toBe(2);
    expect(model.entries[1]?.retryLabel).toBe('2 retries');
    expect(model.entries[2]?.retryLabel).toBeNull();
  });

  it('keeps a trial that was retried after a recorded verdict in order without inventing a round', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'persists' }),
      event('trial-retried', { round: 1 }),
      event('trial-applied', { round: 1, errors: [] }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.entries.map((entry) => entry.round)).toEqual([0, 1]);
    expect(model.entries[1]?.retries).toBe(1);
    expect(model.entries[1]?.verdictLabel).toBe('Awaiting your verdict');
  });
});

describe('history outcome', () => {
  it('names the culprit and flags it as left disabled', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'bbbb' }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.outcome.kind).toBe('culprit');
    expect(model.outcome.label).toBe('Culprit: Bravo Reader');
    expect(model.outcome.names).toEqual(['Bravo Reader']);
    expect(model.outcome.note).toBeNull();
  });

  it('lists the ambiguity set for an inconclusive session', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-inconclusive', { ambiguityIds: ['bbbb'], reason: 'verdict-contradiction' }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.outcome.kind).toBe('inconclusive');
    expect(model.outcome.names).toEqual(['Bravo Reader']);
  });

  it('reports a host-issue abort as an aborted outcome', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      event('baseline-recorded', { mode: 'auto', verdict: 'persists' }),
      event('session-reset', { restored: true, errors: [] }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.outcome.kind).toBe('aborted');
    expect(model.outcome.note).toBe('Every touched extension is back to its original state.');
  });

  it('reports a restore that happened after a culprit as a restored note on the culprit', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'bbbb' }),
      event('session-reset', { restored: true, errors: [] }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.outcome.kind).toBe('culprit');
    expect(model.outcome.note).toBe('Every touched extension is back to its original state.');
  });

  it('reports a live session as in progress instead of inventing an outcome', () => {
    const log = logOf([startEvent([ALPHA, BRAVO]), ...baselineTrial(['aaaa', 'bbbb'])]);

    const model = buildHistory(viewOf(log), log);

    expect(model.outcome.kind).toBe('in-progress');
    expect(model.outcome.label).toContain('Waiting for your verdict');
  });

  /**
   * `session-reset` moves the status to `restored` but keeps the ambiguity set, so the
   * history must still report the inconclusive conclusion instead of reducing it to a
   * generic restore.
   */
  it('keeps the inconclusive outcome after the user restores', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'persists' }),
      event('session-inconclusive', { ambiguityIds: ['aaaa'], reason: 'final-confirmation-persists' }),
      event('session-reset', { restored: true, errors: [] }),
    ]);
    const view = viewOf(log);

    const model = buildHistory(view, log);

    expect(view.status).toBe('restored');
    expect(model.outcome.kind).toBe('inconclusive');
    expect(model.outcome.names).toEqual(['Alpha Blocker']);
    expect(model.outcome.note).toBe('Every touched extension is back to its original state.');
  });
});

describe('history baseline without a recorded trial', () => {
  it('derives the external baseline from the captured snapshot', () => {
    const log = logOf([
      event('session-started', {
        candidateOrder: [ALPHA, BRAVO],
        capability: CAPABILITY,
        baselineMode: 'external',
        testTab: null,
      }),
      event('baseline-recorded', { mode: 'external', verdict: 'gone' }),
    ]);

    const model = buildHistory(viewOf(log), log);

    expect(model.entries).toHaveLength(1);
    expect(model.entries[0]?.enabledNames).toEqual([]);
    expect(model.entries[0]?.disabledNames).toEqual(['Alpha Blocker', 'Bravo Reader']);
    expect(model.entries[0]?.verdictLabel).toBe('Problem is gone');
    expect(model.entries[0]?.note).toContain('Troubleshoot Mode');
    expect(model.baselineModeLabel).toBe(BASELINE_MODE_LABELS.external);
    expect(model.testTabLabel).toBe('No test tab bound');
  });

  /**
   * The panel starts a Firefox session at `manual` because that is the mode its start
   * screen offers; the Troubleshoot-Mode attestation is what makes the baseline
   * `external`. The report must print the mode the log actually recorded, or it labels
   * the manual baseline directly above the external attestation note.
   */
  it('reports an external mode the session did not start with', () => {
    const log = logOf([
      event('session-started', {
        candidateOrder: [ALPHA, BRAVO],
        capability: CAPABILITY,
        baselineMode: 'manual',
        testTab: null,
      }),
      event('baseline-recorded', { mode: 'external', verdict: 'gone' }),
    ]);

    const model = buildHistory(viewOf(log), log);
    const report = renderBisectReport(model);

    expect(model.baselineModeLabel).toBe(BASELINE_MODE_LABELS.external);
    expect(report).toContain(`Baseline mode: ${BASELINE_MODE_LABELS.external}`);
    expect(report).not.toContain(`Baseline mode: ${BASELINE_MODE_LABELS.manual}`);
    expect(model.entries[0]?.note).toContain('Troubleshoot Mode');
  });
});

describe('report renderer', () => {
  function model() {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'bbbb' }),
    ]);
    return buildHistory(viewOf(log), log);
  }

  it('states the session id and the candidate snapshot in the captured order', () => {
    const report = renderBisectReport(model());

    expect(report).toContain('Session: session-abc');
    expect(report).toContain('Candidates (2, in the captured order): Alpha Blocker, Bravo Reader');
  });

  it('renders the baseline and every trial with batches and verdict', () => {
    const report = renderBisectReport(model());

    expect(report).toContain('Baseline check');
    expect(report).toContain('Trial 1');
    expect(report).toContain('  enabled: Alpha Blocker');
    expect(report).toContain('  disabled: Bravo Reader');
    expect(report).toContain('  verdict: Problem is gone');
  });

  it('renders the outcome', () => {
    expect(renderBisectReport(model())).toContain('Outcome: Culprit: Bravo Reader');
  });

  it('renders retries on the trial that has them', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO]),
      ...baselineTrial(['aaaa', 'bbbb']),
      ...partition(1, ['aaaa'], ['bbbb']),
      event('trial-retried', { round: 1 }),
      event('trial-applied', { round: 1, errors: [] }),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'bbbb' }),
    ]);

    const report = renderBisectReport(buildHistory(viewOf(log), log));

    expect(report).toContain('  retries: 1');
  });

  it('is a pure function of the model it is given', () => {
    const built = model();
    const snapshot = structuredClone(built);

    renderBisectReport(built);

    expect(built).toEqual(snapshot);
  });

  it('serializes the persisted log unchanged for the copy action', () => {
    const log = logOf([startEvent([ALPHA, BRAVO]), ...baselineTrial(['aaaa', 'bbbb'])]);

    expect(JSON.parse(serializeBisectLog(log))).toEqual(log);
  });
});

/**
 * The report is rendered from the reducer output plus the log, so a value the
 * reducer drops (a verdict on a retried trial) must not reappear in the report.
 */
describe('report agrees with the reducer', () => {
  it('reports the same rounds the session view exposes', () => {
    const log = logOf([
      startEvent([ALPHA, BRAVO, CHARLIE]),
      ...baselineTrial(['aaaa', 'bbbb', 'cccc']),
      ...partition(1, ['aaaa'], ['bbbb', 'cccc']),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      ...partition(2, ['bbbb'], ['cccc']),
    ]);
    const view = viewOf(log);

    const model = buildHistory(view, log);

    const rounds = view.trials.map((trial: Trial) => trial.round).sort((left, right) => left - right);
    expect(model.entries.map((entry) => entry.round)).toEqual(rounds);
  });
});
