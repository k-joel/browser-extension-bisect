import { describe, expect, it } from 'vitest';
import type { SessionStatus, TargetState, Verdict } from '@/utils/bisect/domain';
import {
  buildTargetState,
  canTransition,
  clearedOf,
  estimateTrials,
  MAX_FINAL_CONFIRMATIONS,
  narrowSuspects,
  nextOutcome,
  partitionSuspects,
  SESSION_TRANSITIONS,
  worstCaseTrials,
} from '@/utils/bisect/engine';

const RANGE_24 = Array.from({ length: 24 }, (_, index) => String(index + 1));

function ids(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
}

interface TraceRow {
  enabled: string[];
  disabled: string[];
  verdict: Verdict;
}

function culpritOracle(culpritId: string): (partition: { enabled: string[] }) => Verdict {
  return (partition) => (partition.enabled.includes(culpritId) ? 'persists' : 'gone');
}

interface Step {
  enabled: string[];
  disabled: string[];
  verdict: Verdict | null;
  suspectCountAfter: number;
}

function runSearch(
  candidates: string[],
  oracle: (partition: { enabled: string[] }) => Verdict,
): {
  steps: Step[];
  culpritId: string | null;
  ambiguityIds: string[];
  reason: string | null;
} {
  let suspects = [...candidates];
  let cleared: string[] = [];
  let lastTrial: { enabledIds: string[]; disabledIds: string[]; verdict: Verdict } | null = null;
  const steps: Step[] = [];

  for (let guard = 0; guard < 100; guard += 1) {
    const outcome = nextOutcome({ suspects, cleared, lastTrial });
    if (outcome.kind === 'completed') {
      return { steps, culpritId: outcome.culpritId, ambiguityIds: [], reason: null };
    }
    if (outcome.kind === 'inconclusive') {
      return { steps, culpritId: null, ambiguityIds: outcome.ambiguityIds, reason: outcome.reason };
    }

    const verdict = oracle(outcome.partition);
    steps.push({
      enabled: outcome.partition.enabled,
      disabled: outcome.partition.disabled,
      verdict,
      suspectCountAfter: suspects.length,
    });

    const nextSuspects = narrowSuspects(suspects, outcome.partition, verdict);
    cleared = clearedOf(candidates, nextSuspects);
    lastTrial = {
      enabledIds: outcome.partition.enabled,
      disabledIds: outcome.partition.disabled,
      verdict,
    };
    suspects = nextSuspects;
  }

  throw new Error('the search did not terminate');
}

describe('partition of the suspect pool', () => {
  it('splits an even pool in half', () => {
    expect(partitionSuspects(['1', '2', '3', '4'])).toEqual({
      enabled: ['1', '2'],
      disabled: ['3', '4'],
    });
    expect(partitionSuspects(RANGE_24)).toEqual({ enabled: ids(1, 12), disabled: ids(13, 24) });
  });

  it('gives the odd pool its extra candidate to the enabled half', () => {
    expect(partitionSuspects(['7', '8', '9'])).toEqual({ enabled: ['7', '8'], disabled: ['9'] });
    expect(partitionSuspects(['1', '2', '3', '4', '5'])).toEqual({
      enabled: ['1', '2', '3'],
      disabled: ['4', '5'],
    });
  });

  it('leaves the lone suspect disabled as the final confirmation trial', () => {
    expect(partitionSuspects(['8'])).toEqual({ enabled: [], disabled: ['8'] });
    expect(partitionSuspects([])).toEqual({ enabled: [], disabled: [] });
  });
});

describe('target state', () => {
  it('keeps every cleared candidate enabled alongside the enabled half', () => {
    const partition = partitionSuspects(['7', '8', '9']);
    const target = buildTargetState(partition, ['1', '2', '3', '4', '5', '6', '10', '11', '12']);

    expect(target.disabled).toEqual(['9']);
    expect(target.enabled).toEqual(['1', '2', '3', '4', '5', '6', '10', '11', '12', '7', '8']);
    expect(target.allOutsideSuspectsEnabled).toBe(true);
    expect(target.enabled).toContain('10');
  });

  it('carries a partition with no cleared candidates unchanged', () => {
    const target = buildTargetState(partitionSuspects(['a', 'b']), []);

    expect(target).toEqual({ enabled: ['a'], disabled: ['b'], allOutsideSuspectsEnabled: true });
  });
});

describe('suspect-set update per verdict', () => {
  const partition = { enabled: ['1', '2'], disabled: ['3', '4'] };

  it('keeps the enabled half when the problem persists', () => {
    expect(narrowSuspects(['1', '2', '3', '4'], partition, 'persists')).toEqual(['1', '2']);
  });

  it('keeps the disabled half when the problem is gone', () => {
    expect(narrowSuspects(['1', '2', '3', '4'], partition, 'gone')).toEqual(['3', '4']);
  });

  it('derives cleared candidates as the candidates outside the suspect set', () => {
    expect(clearedOf(['1', '2', '3', '4'], ['3', '4'])).toEqual(['1', '2']);
    expect(clearedOf(['1', '2', '3', '4'], ['1', '2', '3', '4'])).toEqual([]);
  });
});

describe('the N = 24 worked example (culprit #8)', () => {
  const expected: TraceRow[] = [
    { enabled: ids(1, 12), disabled: ids(13, 24), verdict: 'persists' },
    { enabled: ids(1, 6), disabled: ids(7, 12), verdict: 'gone' },
    { enabled: ids(7, 9), disabled: ids(10, 12), verdict: 'persists' },
    { enabled: ids(7, 8), disabled: ids(9, 9), verdict: 'persists' },
    { enabled: ids(7, 7), disabled: ids(8, 8), verdict: 'gone' },
  ];

  it('reproduces every documented batch and verdict', () => {
    const result = runSearch(RANGE_24, culpritOracle('8'));

    expect(result.steps.map((step) => step.enabled)).toEqual(expected.map((row) => row.enabled));
    expect(result.steps.map((step) => step.disabled)).toEqual(expected.map((row) => row.disabled));
    expect(result.steps.map((step) => step.verdict)).toEqual(expected.map((row) => row.verdict));
  });

  it('names #8 the culprit without an extra confirmation trial', () => {
    const result = runSearch(RANGE_24, culpritOracle('8'));

    expect(result.culpritId).toBe('8');
    expect(result.steps).toHaveLength(5);
  });

  it('keeps the suspect pool strictly shrinking', () => {
    const result = runSearch(RANGE_24, culpritOracle('8'));
    const counts = result.steps.map((step) => step.suspectCountAfter);

    expect(counts).toEqual([24, 12, 6, 3, 2]);
  });

  it('re-enables the candidates the previous trial disproved', () => {
    const result = runSearch(RANGE_24, culpritOracle('8'));
    const second = buildTargetState(
      { enabled: result.steps[1]?.enabled ?? [], disabled: result.steps[1]?.disabled ?? [] },
      clearedOf(RANGE_24, ids(7, 12)),
    );

    expect(second.enabled).toContain('1');
    expect(second.enabled).toContain('13');
    expect(second.enabled).toContain('24');
    expect(second.disabled).toEqual(ids(7, 12));
  });
});

describe('the #7 variant of the worked example', () => {
  it('needs a sixth trial that disables #7 alone', () => {
    const result = runSearch(RANGE_24, culpritOracle('7'));

    expect(result.steps).toHaveLength(6);
    expect(result.steps.map((step) => step.verdict)).toEqual([
      'persists',
      'gone',
      'persists',
      'persists',
      'persists',
      'gone',
    ]);
    expect(result.steps[4]).toMatchObject({ enabled: ['7'], disabled: ['8'] });
    expect(result.steps[5]).toMatchObject({ enabled: [], disabled: ['7'] });
    expect(result.culpritId).toBe('7');
  });
});

describe('small pools', () => {
  it('resolves N = 2 in a single partition trial when the culprit was disabled', () => {
    const result = runSearch(['a', 'b'], culpritOracle('b'));

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({ enabled: ['a'], disabled: ['b'], verdict: 'gone' });
    expect(result.culpritId).toBe('b');
  });

  it('confirms N = 2 in a second trial when the culprit was enabled', () => {
    const result = runSearch(['a', 'b'], culpritOracle('a'));

    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]).toMatchObject({ enabled: ['a'], disabled: ['b'], verdict: 'persists' });
    expect(result.steps[1]).toMatchObject({ enabled: [], disabled: ['a'], verdict: 'gone' });
    expect(result.culpritId).toBe('a');
  });

  it('resolves N = 3 in one or two partition trials', () => {
    const disabledCulprit = runSearch(['a', 'b', 'c'], culpritOracle('c'));
    expect(disabledCulprit.steps).toHaveLength(1);
    expect(disabledCulprit.steps[0]).toMatchObject({ enabled: ['a', 'b'], disabled: ['c'] });
    expect(disabledCulprit.culpritId).toBe('c');

    const enabledCulprit = runSearch(['a', 'b', 'c'], culpritOracle('b'));
    expect(enabledCulprit.steps).toHaveLength(2);
    expect(enabledCulprit.steps[0]).toMatchObject({ enabled: ['a', 'b'], disabled: ['c'] });
    expect(enabledCulprit.steps[1]).toMatchObject({ enabled: ['a'], disabled: ['b'] });
    expect(enabledCulprit.culpritId).toBe('b');
  });
});

describe('step counts', () => {
  it('estimates the baseline plus the ceil(log2 N) partitions', () => {
    expect(estimateTrials(0)).toBe(1);
    expect(estimateTrials(1)).toBe(1);
    expect(estimateTrials(2)).toBe(2);
    expect(estimateTrials(3)).toBe(3);
    expect(estimateTrials(4)).toBe(3);
    expect(estimateTrials(8)).toBe(4);
    expect(estimateTrials(24)).toBe(6);
  });

  it('adds exactly one final confirmation to the worst case', () => {
    expect(worstCaseTrials(24)).toBe(estimateTrials(24) + MAX_FINAL_CONFIRMATIONS);
    expect(worstCaseTrials(24)).toBe(7);
    expect(worstCaseTrials(2)).toBe(3);
  });

  it('matches the documented bounds for the worked example', () => {
    const eight = runSearch(RANGE_24, culpritOracle('8'));
    const seven = runSearch(RANGE_24, culpritOracle('7'));

    expect(eight.steps.length).toBeLessThanOrEqual(estimateTrials(24));
    expect(seven.steps.length).toBeLessThanOrEqual(worstCaseTrials(24));
  });
});

describe('contradictions', () => {
  it('reports an empty suspect set as inconclusive with the ambiguity set', () => {
    const outcome = nextOutcome({
      suspects: [],
      cleared: ['a', 'b'],
      lastTrial: { enabledIds: [], disabledIds: ['a'], verdict: 'persists' },
    });

    expect(outcome).toEqual({
      kind: 'inconclusive',
      ambiguityIds: ['a'],
      reason: 'final-confirmation-persists',
    });
  });

  it('reports a persisting final confirmation as inconclusive instead of blaming the suspect', () => {
    const outcome = nextOutcome({
      suspects: ['8'],
      cleared: ['1', '2'],
      lastTrial: { enabledIds: [], disabledIds: ['8'], verdict: 'persists' },
    });

    expect(outcome).toEqual({
      kind: 'inconclusive',
      ambiguityIds: ['8'],
      reason: 'final-confirmation-persists',
    });
  });

  it('reports an unexplained empty pool as a verdict contradiction', () => {
    const outcome = nextOutcome({
      suspects: [],
      cleared: [],
      lastTrial: { enabledIds: ['a'], disabledIds: ['b'], verdict: 'gone' },
    });

    expect(outcome).toEqual({
      kind: 'inconclusive',
      ambiguityIds: ['a', 'b'],
      reason: 'verdict-contradiction',
    });
  });

  it('never names a culprit from an ambiguous final confirmation', () => {
    const result = runSearch(['a', 'b'], () => 'persists');

    expect(result.culpritId).toBeNull();
    expect(result.ambiguityIds).toEqual(['a']);
    expect(result.reason).toBe('final-confirmation-persists');
  });
});

describe('completion decisions', () => {
  it('completes when the lone suspect was disabled and the verdict was gone', () => {
    expect(
      nextOutcome({
        suspects: ['8'],
        cleared: ['1'],
        lastTrial: { enabledIds: ['7'], disabledIds: ['8'], verdict: 'gone' },
      }),
    ).toEqual({ kind: 'completed', culpritId: '8' });
  });

  it('schedules the final confirmation when the lone suspect was left enabled', () => {
    const outcome = nextOutcome({
      suspects: ['8'],
      cleared: ['1'],
      lastTrial: { enabledIds: ['8'], disabledIds: ['7'], verdict: 'persists' },
    });

    expect(outcome).toMatchObject({
      kind: 'trial',
      partition: { enabled: [], disabled: ['8'] },
    });
  });

  it('opens the first partition trial from a clean baseline', () => {
    const outcome = nextOutcome({ suspects: ['a', 'b', 'c', 'd'], cleared: [], lastTrial: null });

    expect(outcome).toEqual({
      kind: 'trial',
      partition: { enabled: ['a', 'b'], disabled: ['c', 'd'] },
      target: { enabled: ['a', 'b'], disabled: ['c', 'd'], allOutsideSuspectsEnabled: true } satisfies TargetState,
    });
  });
});

describe('session transition table', () => {
  it('matches the documented lifecycle exactly', () => {
    const expected: Record<SessionStatus, SessionStatus[]> = {
      preparing: ['baseline', 'aborted'],
      baseline: ['trial', 'aborted'],
      trial: ['applying'],
      applying: ['awaiting-verdict', 'paused', 'aborted'],
      'awaiting-verdict': ['trial', 'completed', 'inconclusive', 'paused'],
      'awaiting-manual-toggle': ['awaiting-verdict', 'paused', 'aborted'],
      paused: ['trial', 'awaiting-verdict', 'aborted'],
      completed: ['restored'],
      inconclusive: ['restored'],
      aborted: ['restored', 'preparing'],
      restored: ['preparing'],
    };

    expect(SESSION_TRANSITIONS).toEqual(expected);
  });

  it('answers whether a transition is allowed', () => {
    expect(canTransition('awaiting-verdict', 'completed')).toBe(true);
    expect(canTransition('awaiting-verdict', 'inconclusive')).toBe(true);
    expect(canTransition('completed', 'trial')).toBe(false);
    expect(canTransition('inconclusive', 'trial')).toBe(false);
    expect(canTransition('restored', 'preparing')).toBe(true);
  });

  /**
   * SPEC §Session lifecycle: `completed|inconclusive|aborted → restored, new session` and
   * `restored → preparing`. A new session is a new log, so the only status it can land on
   * is `preparing`; every terminal state has to reach it, directly or through `restored`.
   */
  it('lets every terminal state reach a fresh session', () => {
    expect(canTransition('completed', 'restored')).toBe(true);
    expect(canTransition('completed', 'preparing')).toBe(false);
    expect(canTransition('inconclusive', 'restored')).toBe(true);
    expect(canTransition('inconclusive', 'preparing')).toBe(false);
    expect(canTransition('aborted', 'restored')).toBe(true);
    expect(canTransition('aborted', 'preparing')).toBe(true);
    expect(canTransition('restored', 'preparing')).toBe(true);
  });

  it('keeps a live session unreplaceable', () => {
    const live = ['baseline', 'trial', 'applying', 'awaiting-verdict', 'awaiting-manual-toggle', 'paused'] as const;
    for (const from of live) {
      expect(canTransition(from, 'preparing')).toBe(false);
    }
  });
});
