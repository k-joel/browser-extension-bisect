import { describe, expect, it } from 'vitest';
import type {
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  CapabilityReport,
  Verdict,
} from '@/utils/bisect/domain';
import { type AnsweredTrial, clearedOf, narrowSuspects, nextOutcome, type TrialPartition } from '@/utils/bisect/engine';
import { replayLog } from '@/utils/bisect/replay';

const CAPABILITY: CapabilityReport = {
  browserName: 'chrome',
  canAutoToggle: true,
  selfInstallType: 'normal',
  sideSurface: 'side-panel',
};

function candidate(id: string): CandidateExtension {
  return {
    id,
    name: `Extension ${id}`,
    version: '1.0.0',
    description: '',
    enabledAtStart: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension',
    icons: [],
  };
}

function ids(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}

const RANGE_24 = ids(1, 24);
const CANDIDATES_24 = RANGE_24.map(candidate);

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
    testTab: { tabId: 9, url: null },
  });
}

function culpritOracle(culpritId: string): (partition: TrialPartition) => Verdict {
  return (partition) => (partition.enabled.includes(culpritId) ? 'persists' : 'gone');
}

/**
 * A recorded log exactly as the live session writes it: the all-off baseline, then one
 * `trial-started`/`trial-applied`/`verdict-recorded` triple per partition, then the
 * terminal event. The batches come from the engine, which the engine suite pins to the
 * documented `N = 24` trace; `replayLog` must reach the same culprit from the verdicts.
 */
function buildRecordedLog(oracle: (partition: TrialPartition) => Verdict): BisectLog {
  const events: BisectEvent[] = [startEvent(CANDIDATES_24)];
  const allIds = CANDIDATES_24.map((entry) => entry.id);

  events.push(event('trial-started', { round: 0, enabledIds: [], disabledIds: allIds }));
  events.push(event('trial-applied', { round: 0, errors: [] }));
  events.push(event('baseline-recorded', { mode: 'auto', verdict: 'gone' }));

  let suspects = [...allIds];
  let cleared: string[] = [];
  let lastTrial: AnsweredTrial | null = null;

  for (let round = 1; round <= 24; round += 1) {
    const outcome = nextOutcome({ suspects, cleared, lastTrial });
    if (outcome.kind !== 'trial') break;
    const verdict = oracle(outcome.partition);
    events.push(
      event('trial-started', { round, enabledIds: outcome.target.enabled, disabledIds: outcome.target.disabled }),
    );
    events.push(event('trial-applied', { round, errors: [] }));
    events.push(event('verdict-recorded', { round, verdict }));
    suspects = narrowSuspects(suspects, outcome.partition, verdict);
    cleared = clearedOf(allIds, suspects);
    lastTrial = { enabledIds: outcome.target.enabled, disabledIds: outcome.target.disabled, verdict };
  }

  const final = nextOutcome({ suspects, cleared, lastTrial });
  if (final.kind === 'completed') events.push(event('session-completed', { culpritId: final.culpritId }));
  if (final.kind === 'inconclusive') {
    events.push(event('session-inconclusive', { ambiguityIds: final.ambiguityIds, reason: final.reason }));
  }
  return logOf(events);
}

function correctVerdict(log: BisectLog, round: number, verdict: Verdict): BisectLog {
  return {
    ...log,
    events: log.events.map((entry) =>
      entry.type === 'verdict-recorded' && entry.payload.round === round
        ? { ...entry, payload: { ...entry.payload, verdict } }
        : entry,
    ),
  };
}

function rewriteTrialBatches(
  log: BisectLog,
  rewrite: (round: number, payload: BisectEventPayloads['trial-started']) => BisectEventPayloads['trial-started'],
): BisectLog {
  return {
    ...log,
    events: log.events.map((entry) =>
      entry.type === 'trial-started' ? { ...entry, payload: rewrite(entry.payload.round, entry.payload) } : entry,
    ),
  };
}

const TRACE_8 = buildRecordedLog(culpritOracle('8'));

describe('replaying a recorded search', () => {
  it('replays the N = 24 trace to the culprit the log records', () => {
    const result = replayLog(TRACE_8);

    expect(result.validationError).toBeNull();
    expect(result.culpritId).toBe('8');
    expect(result.ambiguityIds).toEqual([]);
    expect(result.batchDifferences).toEqual([]);
  });

  it('recomputes every partition from the verdict sequence', () => {
    const result = replayLog(TRACE_8);

    expect(result.trials.map((trial) => trial.round)).toEqual([1, 2, 3, 4, 5]);
    expect(result.trials.map((trial) => trial.disabledIds)).toEqual([
      ids(13, 24),
      ids(7, 12),
      ids(10, 12),
      ids(9, 9),
      ids(8, 8),
    ]);
  });

  it('keeps the cleared candidates enabled alongside the enabled half', () => {
    const second = replayLog(TRACE_8).trials[1];

    expect(second?.enabledIds).toContain('13');
    expect(second?.enabledIds).toContain('24');
    expect(second?.enabledIds).toContain('1');
    expect(second?.disabledIds).not.toContain('1');
  });

  it('carries the verdict that produced each recomputed trial', () => {
    const result = replayLog(TRACE_8);

    expect(result.trials.map((trial) => trial.verdict)).toEqual(['persists', 'gone', 'persists', 'persists', 'gone']);
  });

  it('applies nothing: every recomputed trial stays unapplied and error-free', () => {
    const result = replayLog(TRACE_8);

    expect(result.trials.every((trial) => trial.appliedAt === null && trial.errors.length === 0)).toBe(true);
  });

  it('never mutates the log it is given', () => {
    const log = buildRecordedLog(culpritOracle('8'));
    const snapshot = structuredClone(log);

    replayLog(log);

    expect(log).toEqual(snapshot);
  });
});

describe('a corrected verdict', () => {
  const corrected = correctVerdict(TRACE_8, 2, 'persists');

  it('changes the outcome to the candidate the correction implicates', () => {
    expect(replayLog(TRACE_8).culpritId).toBe('8');
    expect(replayLog(corrected).culpritId).toBe('2');
    expect(replayLog(corrected).validationError).toBeNull();
  });

  it('reports the recorded batches that no longer match the recomputed ones', () => {
    const result = replayLog(corrected);

    expect(result.batchDifferences.map((difference) => difference.round)).toEqual([3, 4, 5]);
  });

  it('names both the recorded and the recomputed halves of a difference', () => {
    const difference = replayLog(corrected).batchDifferences[0];

    expect(difference?.recordedEnabledIds).toContain('13');
    expect(difference?.recordedDisabledIds).toEqual(ids(10, 12));
    expect(difference?.recomputedEnabledIds).toContain('13');
    expect(difference?.recomputedDisabledIds).toEqual(ids(4, 6));
  });

  it('recomputes the later partitions in the corrected order', () => {
    expect(replayLog(corrected).trials.map((trial) => trial.disabledIds)).toEqual([
      ids(13, 24),
      ids(7, 12),
      ids(4, 6),
      ids(3, 3),
      ids(2, 2),
    ]);
  });

  it('replays a correction that ends the search earlier than the recorded log', () => {
    const log = logOf([
      startEvent([candidate('a'), candidate('b')]),
      event('trial-started', { round: 0, enabledIds: [], disabledIds: ['a', 'b'] }),
      event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
      event('trial-started', { round: 1, enabledIds: ['a'], disabledIds: ['b'] }),
      event('verdict-recorded', { round: 1, verdict: 'persists' }),
      event('trial-started', { round: 2, enabledIds: [], disabledIds: ['a'] }),
      event('verdict-recorded', { round: 2, verdict: 'gone' }),
      event('session-completed', { culpritId: 'a' }),
    ]);

    const result = replayLog(correctVerdict(log, 1, 'gone'));

    expect(result.culpritId).toBe('b');
    expect(result.trials).toHaveLength(1);
    expect(result.batchDifferences).toEqual([
      {
        round: 2,
        recordedEnabledIds: [],
        recordedDisabledIds: ['a'],
        recomputedEnabledIds: [],
        recomputedDisabledIds: [],
      },
    ]);
  });

  it('drops the recorded culprit when the corrected verdicts no longer support it', () => {
    const log = logOf([
      startEvent([candidate('a'), candidate('b')]),
      event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
      event('trial-started', { round: 1, enabledIds: ['a'], disabledIds: ['b'] }),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'b' }),
    ]);

    const result = replayLog(correctVerdict(log, 1, 'persists'));

    expect(result.culpritId).toBeNull();
    expect(result.validationError).toBeNull();
    expect(result.trials).toHaveLength(1);
    expect(result.trials[0]?.disabledIds).toEqual(['b']);
  });
});

describe('ignoring the recorded batches', () => {
  it('replays from the verdicts alone when every recorded partition is wrong', () => {
    const tampered = rewriteTrialBatches(TRACE_8, (round, payload) => ({
      ...payload,
      enabledIds: round === 0 ? [] : ['ghost'],
      disabledIds: round === 0 ? payload.disabledIds : [],
    }));

    const result = replayLog(tampered);

    expect(result.validationError).toBeNull();
    expect(result.culpritId).toBe('8');
    expect(result.batchDifferences.map((difference) => difference.round)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ignores a recorded batch that names a candidate the snapshot does not contain', () => {
    const tampered = rewriteTrialBatches(TRACE_8, (round, payload) =>
      round === 1 ? { ...payload, enabledIds: [...payload.enabledIds, 'not-a-candidate'] } : payload,
    );

    expect(replayLog(tampered).culpritId).toBe('8');
    expect(replayLog(tampered).batchDifferences).toHaveLength(1);
  });

  it('reports a difference for the recorded baseline batch', () => {
    const tampered = rewriteTrialBatches(TRACE_8, (round, payload) =>
      round === 0 ? { ...payload, disabledIds: payload.disabledIds.slice(0, 12) } : payload,
    );
    const result = replayLog(tampered);

    expect(result.culpritId).toBe('8');
    expect(result.batchDifferences).toHaveLength(1);
    expect(result.batchDifferences[0]).toMatchObject({
      round: 0,
      recomputedEnabledIds: [],
      recomputedDisabledIds: ids(1, 24),
    });
  });
});

describe('an invalid copy', () => {
  function invalid(events: unknown[]): ReturnType<typeof replayLog> {
    return replayLog({ schemaVersion: 1, sessionId: 'session-abc', events } as unknown as BisectLog);
  }

  const BASELINE: BisectEvent[] = [
    event('trial-started', { round: 0, enabledIds: [], disabledIds: ['a', 'b'] }),
    event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
  ];

  function expectInvalid(result: ReturnType<typeof replayLog>, eventIndex: number): void {
    expect(result.culpritId).toBeNull();
    expect(result.ambiguityIds).toEqual([]);
    expect(result.trials).toEqual([]);
    expect(result.validationError?.eventIndex).toBe(eventIndex);
    expect(result.validationError?.message.length).toBeGreaterThan(0);
  }

  it('rejects an empty log', () => {
    const result = invalid([]);

    expectInvalid(result, 0);
    expect(result.validationError?.eventType).toBeNull();
  });

  it('rejects a log that does not start with the session start', () => {
    const result = invalid([...BASELINE]);

    expectInvalid(result, 0);
    expect(result.validationError?.eventType).toBe('trial-started');
  });

  it('rejects an event type that is not part of the bisect log', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      { type: 'session-exploded', at: 5, schemaVersion: 1, payload: {} },
    ]);

    expectInvalid(result, 1);
    expect(result.validationError?.eventType).toBeNull();
    expect(result.validationError?.message).toContain('session-exploded');
  });

  it('rejects a duplicate session start', () => {
    const result = invalid([startEvent([candidate('a'), candidate('b')]), ...BASELINE, startEvent([candidate('a')])]);

    expectInvalid(result, 3);
    expect(result.validationError?.eventType).toBe('session-started');
  });

  it('rejects a candidate order with a candidate that has no id', () => {
    const result = invalid([startEvent([candidate('a'), { ...candidate('b'), id: '' }])]);

    expectInvalid(result, 0);
    expect(result.validationError?.eventType).toBe('session-started');
  });

  it('rejects a candidate order that lists the same candidate twice', () => {
    const result = invalid([startEvent([candidate('a'), candidate('a')])]);

    expectInvalid(result, 0);
    expect(result.validationError?.message).toContain('twice');
  });

  it('rejects an empty candidate order', () => {
    expectInvalid(invalid([startEvent([])]), 0);
  });

  it('rejects rounds that do not increase', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('trial-started', { round: 1, enabledIds: ['a'], disabledIds: ['b'] }),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('trial-started', { round: 3, enabledIds: ['b'], disabledIds: ['a'] }),
    ]);

    expectInvalid(result, 5);
    expect(result.validationError?.eventType).toBe('trial-started');
  });

  it('rejects a verdict for a round that was never started', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
    ]);

    expectInvalid(result, 3);
    expect(result.validationError?.eventType).toBe('verdict-recorded');
  });

  it('rejects a second verdict for the same round', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('trial-started', { round: 1, enabledIds: ['a'], disabledIds: ['b'] }),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('verdict-recorded', { round: 1, verdict: 'persists' }),
    ]);

    expectInvalid(result, 5);
  });

  it('rejects a verdict recorded against the baseline round', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('verdict-recorded', { round: 0, verdict: 'gone' }),
    ]);

    expectInvalid(result, 3);
    expect(result.validationError?.message).toContain('baseline event');
  });

  it('rejects a trial after the search already ended', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('trial-started', { round: 1, enabledIds: ['a'], disabledIds: ['b'] }),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
      event('session-completed', { culpritId: 'b' }),
      event('trial-started', { round: 2, enabledIds: [], disabledIds: ['b'] }),
    ]);

    expectInvalid(result, 6);
    expect(result.validationError?.eventType).toBe('trial-started');
  });

  it('rejects a second baseline verdict', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
    ]);

    expectInvalid(result, 3);
  });

  it('rejects a baseline verdict that is not a known verdict', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      { type: 'baseline-recorded', at: 9, schemaVersion: 1, payload: { mode: 'auto', verdict: 'maybe' } },
    ]);

    expectInvalid(result, 1);
    expect(result.validationError?.eventType).toBe('baseline-recorded');
  });

  it('rejects a trial whose batches are not id lists', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      { type: 'trial-started', at: 9, schemaVersion: 1, payload: { round: 1, enabledIds: 'a', disabledIds: ['b'] } },
    ]);

    expectInvalid(result, 1);
  });

  it('reports the first invalid event, not a later one', () => {
    const result = invalid([
      startEvent([candidate('a'), candidate('b')]),
      ...BASELINE,
      event('verdict-recorded', { round: 4, verdict: 'gone' }),
      { type: 'session-exploded', at: 11, schemaVersion: 1, payload: {} },
    ]);

    expectInvalid(result, 3);
    expect(result.validationError?.eventType).toBe('verdict-recorded');
  });
});

describe('unfinished and inconclusive replays', () => {
  it('reports no outcome when the verdict sequence stops mid-search', () => {
    const log = logOf([
      startEvent([candidate('a'), candidate('b'), candidate('c'), candidate('d')]),
      event('baseline-recorded', { mode: 'auto', verdict: 'gone' }),
      event('trial-started', { round: 1, enabledIds: ['a', 'b'], disabledIds: ['c', 'd'] }),
      event('verdict-recorded', { round: 1, verdict: 'gone' }),
    ]);

    const result = replayLog(log);

    expect(result.validationError).toBeNull();
    expect(result.culpritId).toBeNull();
    expect(result.ambiguityIds).toEqual([]);
    expect(result.trials).toHaveLength(1);
  });

  it('reports the ambiguity set when the verdicts contradict a single culprit', () => {
    const log = buildRecordedLog(() => 'persists');
    const result = replayLog(log);

    expect(result.validationError).toBeNull();
    expect(result.culpritId).toBeNull();
    expect(result.ambiguityIds).toEqual(['1']);
  });

  it('stops recomputing after a persisting baseline aborts the search as a host issue', () => {
    const log = logOf([
      startEvent([candidate('a'), candidate('b')]),
      event('trial-started', { round: 0, enabledIds: [], disabledIds: ['a', 'b'] }),
      event('baseline-recorded', { mode: 'auto', verdict: 'persists' }),
      event('session-reset', { restored: true, errors: [] }),
    ]);

    const result = replayLog(log);

    expect(result.validationError).toBeNull();
    expect(result.culpritId).toBeNull();
    expect(result.ambiguityIds).toEqual([]);
    expect(result.trials).toEqual([]);
    expect(result.batchDifferences).toEqual([]);
  });

  it('resolves a single candidate from the baseline the way the live session does', () => {
    const log = logOf([startEvent([candidate('only')]), event('baseline-recorded', { mode: 'auto', verdict: 'gone' })]);

    expect(replayLog(log).culpritId).toBe('only');
  });
});
