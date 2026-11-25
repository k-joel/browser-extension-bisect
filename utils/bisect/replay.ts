import type {
  BatchDifference,
  BisectEventType,
  BisectLog,
  ReplayResult,
  ReplayValidationError,
  TargetState,
  Trial,
  Verdict,
} from './domain';
import { type AnsweredTrial, clearedOf, narrowSuspects, nextOutcome } from './engine';

const EVENT_TYPES: readonly BisectEventType[] = [
  'session-started',
  'baseline-recorded',
  'trial-started',
  'trial-applied',
  'verdict-recorded',
  'trial-retried',
  'verdict-undone',
  'session-paused',
  'session-resumed',
  'session-completed',
  'session-inconclusive',
  'session-reset',
];

const KNOWN_EVENT_TYPES = new Set<string>(EVENT_TYPES);

const TERMINAL_TYPES = new Set<string>(['session-completed', 'session-inconclusive']);

interface RecordedBatch {
  enabledIds: string[];
  disabledIds: string[];
}

interface ParsedLog {
  candidateIds: string[];
  baselineVerdict: Verdict | null;
  verdicts: Map<number, Verdict>;
  recordedBatches: Map<number, RecordedBatch>;
}

type ParseOutcome = { kind: 'valid'; parsed: ParsedLog } | { kind: 'invalid'; error: ReplayValidationError };

function invalid(
  eventIndex: number,
  eventType: BisectEventType | null,
  message: string,
): { kind: 'invalid'; error: ReplayValidationError } {
  return { kind: 'invalid', error: { eventIndex, eventType, message } };
}

function isVerdict(value: unknown): value is Verdict {
  return value === 'persists' || value === 'gone';
}

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string' && entry.length > 0);
}

function isRound(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function candidateIdsOf(candidateOrder: unknown): { ids: string[] } | { error: string } {
  if (!Array.isArray(candidateOrder) || candidateOrder.length === 0) {
    return { error: 'The session start event has no candidate order, so there is nothing to replay.' };
  }
  const ids: string[] = [];
  for (const entry of candidateOrder) {
    const candidate = entry as { id?: unknown } | null;
    if (typeof candidate?.id !== 'string' || candidate.id.length === 0) {
      return { error: 'A candidate in the session start event has no usable id.' };
    }
    if (ids.includes(candidate.id)) {
      return { error: `The session start event lists "${candidate.id}" twice, so the order is ambiguous.` };
    }
    ids.push(candidate.id);
  }
  return { ids };
}

function describeUnknownType(event: unknown): string {
  const type = (event as { type?: unknown } | null)?.type;
  return typeof type === 'string' ? `"${type}"` : 'with no type';
}

/**
 * The all-off baseline is its own round-0 trial on the automated and assisted rails,
 * but an external attestation is recorded without one, so the first partition is round 1.
 */
function firstTrialRound(requested: number): number {
  return requested === 0 ? 0 : 1;
}

/**
 * Validates the structure replay depends on and collects the verdict sequence plus the
 * recorded batches. The recorded `trial-started` sets are collected only so they can be
 * compared afterwards; nothing here treats them as authoritative.
 */
function parseLog(log: BisectLog): ParseOutcome {
  const events = (log as unknown as { events?: unknown } | null)?.events;
  if (!Array.isArray(events) || events.length === 0) {
    return invalid(0, null, 'The bisect log copy has no events, so there is nothing to replay.');
  }

  let candidateIds: string[] | null = null;
  let baselineVerdict: Verdict | null = null;
  let baselineTrialSeen = false;
  let partitionTrialSeen = false;
  let lastStartedRound: number | null = null;
  let terminal: { index: number; type: string } | null = null;
  const verdicts = new Map<number, Verdict>();
  const recordedBatches = new Map<number, RecordedBatch>();
  const startedRounds = new Set<number>();

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index] as { type?: unknown; payload?: unknown } | null;
    const type = event?.type;

    if (typeof type !== 'string' || !KNOWN_EVENT_TYPES.has(type)) {
      return invalid(
        index,
        null,
        `The copy contains an event ${describeUnknownType(event)} that is not part of a bisect log.`,
      );
    }

    const eventType = type as BisectEventType;
    const payload = (event?.payload ?? {}) as Record<string, unknown>;

    if (index === 0) {
      if (eventType !== 'session-started') {
        return invalid(0, eventType, 'The bisect log copy must begin with the session start event.');
      }
      const ids = candidateIdsOf(payload.candidateOrder);
      if ('error' in ids) return invalid(0, eventType, ids.error);
      candidateIds = ids.ids;
      continue;
    }

    if (eventType === 'session-started') {
      return invalid(index, eventType, 'The bisect log copy contains more than one session start event.');
    }

    if (terminal !== null && eventType !== 'session-reset') {
      if (TERMINAL_TYPES.has(eventType)) {
        return invalid(index, eventType, `The log records a second outcome after the "${terminal.type}" event.`);
      }
      return invalid(
        index,
        eventType,
        `A "${eventType}" event follows the "${terminal.type}" event, but the search has already ended.`,
      );
    }

    switch (eventType) {
      case 'baseline-recorded': {
        if (baselineVerdict !== null) {
          return invalid(index, eventType, 'The log records more than one baseline verdict.');
        }
        if (partitionTrialSeen) {
          return invalid(index, eventType, 'A baseline verdict must come before the first partition trial.');
        }
        if (!isVerdict(payload.verdict)) {
          return invalid(index, eventType, 'The baseline verdict is neither "persists" nor "gone".');
        }
        baselineVerdict = payload.verdict;
        break;
      }
      case 'trial-started': {
        if (!isRound(payload.round)) {
          return invalid(index, eventType, 'A trial start event has no usable round number.');
        }
        const round: number = payload.round;
        if (!isIdList(payload.enabledIds) || !isIdList(payload.disabledIds)) {
          return invalid(index, eventType, `Trial ${round} does not carry an enabled and a disabled id list.`);
        }
        const expectedRound: number = lastStartedRound === null ? firstTrialRound(round) : lastStartedRound + 1;
        if (round !== expectedRound) {
          return invalid(
            index,
            eventType,
            `Rounds must increase by one: expected trial ${expectedRound}, found trial ${round}.`,
          );
        }
        if (round === 0) {
          if (baselineTrialSeen) return invalid(index, eventType, 'The log records more than one baseline trial.');
          if (baselineVerdict !== null) {
            return invalid(index, eventType, 'A baseline trial cannot start after the baseline verdict was recorded.');
          }
          baselineTrialSeen = true;
        } else {
          partitionTrialSeen = true;
        }
        startedRounds.add(round);
        recordedBatches.set(round, { enabledIds: payload.enabledIds, disabledIds: payload.disabledIds });
        lastStartedRound = round;
        break;
      }
      case 'verdict-recorded': {
        if (!isRound(payload.round)) {
          return invalid(index, eventType, 'A verdict event has no usable round number.');
        }
        if (payload.round === 0) {
          return invalid(index, eventType, 'The baseline verdict is recorded by the baseline event, not by a trial.');
        }
        if (!startedRounds.has(payload.round)) {
          return invalid(index, eventType, `A verdict was recorded for trial ${payload.round}, which never started.`);
        }
        if (verdicts.has(payload.round)) {
          return invalid(index, eventType, `The log records more than one verdict for trial ${payload.round}.`);
        }
        if (!isVerdict(payload.verdict)) {
          return invalid(index, eventType, `The verdict for trial ${payload.round} is neither "persists" nor "gone".`);
        }
        verdicts.set(payload.round, payload.verdict);
        break;
      }
      case 'verdict-undone':
      case 'trial-retried': {
        if (!isRound(payload.round) || !startedRounds.has(payload.round)) {
          return invalid(index, eventType, `A "${eventType}" event names a trial that never started.`);
        }
        verdicts.delete(payload.round);
        break;
      }
      case 'session-completed':
      case 'session-inconclusive': {
        terminal = { index, type: eventType };
        break;
      }
      default:
        break;
    }
  }

  if (candidateIds === null) {
    return invalid(0, null, 'The session start event is missing, so the log cannot be replayed.');
  }

  return { kind: 'valid', parsed: { candidateIds, baselineVerdict, verdicts, recordedBatches } };
}

interface Recomputation {
  culpritId: string | null;
  ambiguityIds: string[];
  trials: Trial[];
  ended: boolean;
}

function recomputedTrial(round: number, target: TargetState, verdict: Verdict): Trial {
  return {
    round,
    enabledIds: [...target.enabled],
    disabledIds: [...target.disabled],
    targetState: {
      enabled: [...target.enabled],
      disabled: [...target.disabled],
      allOutsideSuspectsEnabled: target.allOutsideSuspectsEnabled,
    },
    verdict,
    appliedAt: null,
    errors: [],
    manual: false,
    testTab: null,
  };
}

/**
 * Walks the search again from the verdict sequence alone. Every decision comes from
 * `engine.ts`, the same module the live session and the reducer use, so a replayed
 * search cannot partition, count, or conclude differently from a live one.
 */
function recompute(parsed: ParsedLog): Recomputation {
  const unfinished = (trials: Trial[]): Recomputation => ({ culpritId: null, ambiguityIds: [], trials, ended: false });
  if (parsed.baselineVerdict !== 'gone') return unfinished([]);
  if (parsed.candidateIds.length === 1) {
    return { culpritId: parsed.candidateIds[0] as string, ambiguityIds: [], trials: [], ended: true };
  }

  let suspects = [...parsed.candidateIds];
  let cleared: string[] = [];
  let lastTrial: AnsweredTrial | null = null;
  const trials: Trial[] = [];

  for (let round = 1; round <= parsed.candidateIds.length + 1; round += 1) {
    const outcome = nextOutcome({ suspects, cleared, lastTrial });
    if (outcome.kind === 'completed') {
      return { culpritId: outcome.culpritId, ambiguityIds: [], trials, ended: true };
    }
    if (outcome.kind === 'inconclusive') {
      return { culpritId: null, ambiguityIds: outcome.ambiguityIds, trials, ended: true };
    }

    const verdict = parsed.verdicts.get(round);
    if (verdict === undefined) return unfinished(trials);

    const trial = recomputedTrial(round, outcome.target, verdict);
    trials.push(trial);
    suspects = narrowSuspects(suspects, outcome.partition, verdict);
    cleared = clearedOf(parsed.candidateIds, suspects);
    lastTrial = { enabledIds: trial.enabledIds, disabledIds: trial.disabledIds, verdict };
  }

  return unfinished(trials);
}

function sortedIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  const leftSorted = sortedIds(left);
  const rightSorted = sortedIds(right);
  if (leftSorted.length !== rightSorted.length) return false;
  return leftSorted.every((id, index) => id === rightSorted[index]);
}

/**
 * The replayed baseline is always the all-off batch, so a recorded baseline batch is
 * compared against the full candidate snapshot rather than against a recomputed trial.
 */
function recomputedBatchOf(round: number, parsed: ParsedLog, recomputation: Recomputation): RecordedBatch | null {
  if (round === 0) return { enabledIds: [], disabledIds: [...parsed.candidateIds] };
  const trial = recomputation.trials.find((entry) => entry.round === round);
  return trial === undefined ? null : { enabledIds: trial.enabledIds, disabledIds: trial.disabledIds };
}

function batchDifferencesOf(parsed: ParsedLog, recomputation: Recomputation): BatchDifference[] {
  const differences: BatchDifference[] = [];
  const rounds = [...parsed.recordedBatches.keys()].sort((left, right) => left - right);

  for (const round of rounds) {
    const recorded = parsed.recordedBatches.get(round);
    if (recorded === undefined) continue;

    const recomputed = recomputedBatchOf(round, parsed, recomputation);
    if (recomputed === null) {
      if (!recomputation.ended) continue;
      differences.push({
        round,
        recordedEnabledIds: [...recorded.enabledIds],
        recordedDisabledIds: [...recorded.disabledIds],
        recomputedEnabledIds: [],
        recomputedDisabledIds: [],
      });
      continue;
    }

    const matches =
      sameIds(recorded.enabledIds, recomputed.enabledIds) && sameIds(recorded.disabledIds, recomputed.disabledIds);
    if (matches) continue;

    differences.push({
      round,
      recordedEnabledIds: [...recorded.enabledIds],
      recordedDisabledIds: [...recorded.disabledIds],
      recomputedEnabledIds: [...recomputed.enabledIds],
      recomputedDisabledIds: [...recomputed.disabledIds],
    });
  }

  return differences;
}

function invalidResult(error: ReplayValidationError): ReplayResult {
  return { culpritId: null, ambiguityIds: [], trials: [], batchDifferences: [], validationError: error };
}

/**
 * Recomputes the search from a copy of the log whose verdicts may have been corrected.
 * It is a pure function of the log: it never toggles an extension, never touches the
 * live log, and reports the first invalid event when the copy is structurally broken.
 */
export function replayLog(log: BisectLog): ReplayResult {
  const parsed = parseLog(log);
  if (parsed.kind === 'invalid') return invalidResult(parsed.error);

  const recomputation = recompute(parsed.parsed);
  return {
    culpritId: recomputation.culpritId,
    ambiguityIds: [...recomputation.ambiguityIds],
    trials: recomputation.trials,
    batchDifferences: batchDifferencesOf(parsed.parsed, recomputation),
    validationError: null,
  };
}
