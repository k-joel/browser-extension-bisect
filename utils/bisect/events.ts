import { storage } from 'wxt/utils/storage';
import type {
  BisectEvent,
  BisectLog,
  CapabilityReport,
  ManualBatch,
  SessionPause,
  SessionStatus,
  SessionView,
  TargetState,
  Trial,
  Verdict,
} from './domain';
import { type AnsweredTrial, clearedOf, estimateTrials, narrowSuspects, nextOutcome } from './engine';

export const BISECT_LOG_KEY = 'local:bisectLog' as const;

export const LOG_EVENT_CAP = 500;

const BASELINE_MODE_CAPABILITY: CapabilityReport = {
  browserName: 'unknown',
  canAutoToggle: false,
  selfInstallType: 'unknown',
  sideSurface: 'side-panel',
};

export const bisectLogItem = storage.defineItem<BisectLog | null>(BISECT_LOG_KEY, {
  fallback: null,
});

export class BisectLogWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BisectLogWriteError';
  }
}

function isEvent(value: unknown): value is BisectEvent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<BisectEvent>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.at === 'number' &&
    typeof candidate.payload === 'object' &&
    candidate.payload !== null
  );
}

export function normalizeBisectLog(value: unknown): BisectLog | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<BisectLog>;
  if (typeof candidate.sessionId !== 'string' || candidate.sessionId.length === 0) return null;
  if (!Array.isArray(candidate.events)) return null;
  return {
    schemaVersion: 1,
    sessionId: candidate.sessionId,
    events: candidate.events.filter(isEvent),
  };
}

export async function readBisectLog(): Promise<BisectLog | null> {
  return normalizeBisectLog(await bisectLogItem.getValue());
}

/**
 * A rejected write must be distinguishable from every other failure, because the caller
 * replays the previous log and reports the storage problem rather than blaming the
 * command. The message is what the panel shows, so it names the log and the consequence.
 */
export async function writeBisectLog(log: BisectLog): Promise<void> {
  try {
    await bisectLogItem.setValue(log);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BisectLogWriteError(`The bisect log could not be saved (${reason}). The previous log is unchanged.`);
  }
}

/**
 * The panel's convergence seam: every browser context that owns a side panel hears the
 * same `storage.onChanged`, so one panel's mutation refreshes the others without the
 * background having to broadcast a message nobody may be listening for.
 */
export function watchBisectLog(listener: (log: BisectLog | null) => void): () => void {
  return bisectLogItem.watch((value) => listener(normalizeBisectLog(value)));
}

export function createEmptyLog(sessionId: string): BisectLog {
  return { schemaVersion: 1, sessionId, events: [] };
}

export function appendEvent(log: BisectLog, event: BisectEvent): BisectLog {
  if (log.events.length >= LOG_EVENT_CAP) {
    throw new BisectLogWriteError(
      `The bisect log reached its ${LOG_EVENT_CAP}-event cap; the session fails closed rather than dropping audit data.`,
    );
  }
  return { ...log, events: [...log.events, event] };
}

interface SessionAccumulator {
  status: SessionStatus;
  capability: CapabilityReport;
  baselineMode: SessionView['baselineMode'];
  candidateOrder: SessionView['candidateOrder'];
  originalEnabledIds: string[];
  suspects: string[];
  suspectsBeforeTrial: string[];
  cleared: string[];
  trials: Trial[];
  culpritId: string | null;
  ambiguityIds: string[];
  abortReason: SessionView['abortReason'];
  testTab: SessionView['testTab'];
  manualBatch: ManualBatch | null;
  pause: SessionPause | null;
  resetRecorded: boolean;
  createdAt: number;
  updatedAt: number;
}

function suspectsFromVerdict(trial: Trial, verdict: Verdict, suspects: readonly string[]): string[] {
  const partition = { enabled: trial.enabledIds, disabled: trial.disabledIds };
  return narrowSuspects(suspects, partition, verdict);
}

function toAnsweredTrial(trial: Trial | undefined): AnsweredTrial | null {
  if (trial === undefined || trial.verdict === null) return null;
  return {
    enabledIds: trial.enabledIds,
    disabledIds: trial.disabledIds,
    verdict: trial.verdict,
  };
}

function resetOutcome(acc: SessionAccumulator): void {
  acc.culpritId = null;
  acc.ambiguityIds = [];
}

/**
 * The trial's target as the log records it, plus the candidates the trial left out of
 * its partition. Verification needs the second list: a toggle there is drift *outside*
 * the trial, which the trial's own two id lists cannot express.
 */
function targetStateOf(enabledIds: string[], disabledIds: string[], clearedIds: readonly string[]): TargetState {
  const target: TargetState = { enabled: enabledIds, disabled: disabledIds, allOutsideSuspectsEnabled: true };
  if (clearedIds.length > 0) target.outsideTrialIds = [...clearedIds];
  return target;
}

function applyEvent(acc: SessionAccumulator, event: BisectEvent): void {
  acc.updatedAt = event.at;
  switch (event.type) {
    case 'session-started':
      acc.capability = event.payload.capability;
      acc.baselineMode = event.payload.baselineMode;
      acc.candidateOrder = event.payload.candidateOrder;
      acc.originalEnabledIds = event.payload.candidateOrder.map((candidate) => candidate.id);
      acc.suspects = [...acc.originalEnabledIds];
      acc.testTab = event.payload.testTab;
      acc.status = 'baseline';
      acc.createdAt = event.at;
      return;
    case 'baseline-recorded':
      // The recorded mode wins over the mode a start screen guessed: a Firefox session
      // starts as `manual` and becomes `external` only through the attestation.
      acc.baselineMode = event.payload.mode;
      applyBaseline(acc, event.payload.verdict);
      return;
    case 'trial-started':
      acc.suspectsBeforeTrial = [...acc.suspects];
      acc.trials.push({
        round: event.payload.round,
        enabledIds: event.payload.enabledIds,
        disabledIds: event.payload.disabledIds,
        targetState: targetStateOf(event.payload.enabledIds, event.payload.disabledIds, acc.cleared),
        verdict: null,
        appliedAt: null,
        errors: [],
        manual: event.payload.manual === true,
        testTab: null,
      });
      acc.status = 'trial';
      return;
    case 'trial-applied': {
      const trial = acc.trials.at(-1);
      if (trial === undefined) return;
      trial.appliedAt = event.at;
      trial.errors = event.payload.errors;
      trial.manual = event.payload.manual === true;
      if (event.payload.testTab !== undefined) trial.testTab = event.payload.testTab;
      acc.manualBatch = trial.manual ? (event.payload.manualBatch ?? null) : null;
      acc.status = trial.manual ? 'awaiting-manual-toggle' : 'awaiting-verdict';
      return;
    }
    case 'verdict-recorded':
      applyVerdict(acc, event.payload.verdict);
      return;
    case 'trial-retried': {
      const trial = acc.trials.at(-1);
      if (trial === undefined) return;
      if (trial.verdict !== null) acc.suspects = [...acc.suspectsBeforeTrial];
      acc.cleared = clearedOf(acc.originalEnabledIds, acc.suspects);
      trial.verdict = null;
      trial.appliedAt = null;
      trial.errors = [];
      acc.manualBatch = null;
      resetOutcome(acc);
      acc.status = 'trial';
      return;
    }
    case 'verdict-undone': {
      const trial = acc.trials.at(-1);
      if (trial === undefined) return;
      trial.verdict = null;
      acc.suspects = [...acc.suspectsBeforeTrial];
      acc.cleared = clearedOf(acc.originalEnabledIds, acc.suspects);
      resetOutcome(acc);
      acc.status = 'awaiting-verdict';
      return;
    }
    case 'session-paused':
      acc.pause = {
        reason: event.payload.reason,
        drift: event.payload.drift ?? null,
        changes: event.payload.changes ?? [],
        errors: event.payload.errors ?? [],
        rollback: event.payload.rollback ?? null,
      };
      acc.status = 'paused';
      return;
    case 'session-resumed': {
      acc.pause = null;
      if (event.payload.reason === 'manual-verified') {
        acc.manualBatch = null;
        acc.status = 'awaiting-verdict';
        return;
      }
      if (acc.manualBatch !== null) {
        acc.status = 'awaiting-manual-toggle';
        return;
      }
      acc.status = acc.trials.some((trial) => trial.appliedAt !== null) ? 'awaiting-verdict' : 'baseline';
      return;
    }
    case 'session-completed':
      acc.culpritId = event.payload.culpritId;
      acc.pause = null;
      acc.status = 'completed';
      return;
    case 'session-inconclusive':
      acc.ambiguityIds = event.payload.ambiguityIds;
      acc.culpritId = null;
      acc.pause = null;
      acc.status = 'inconclusive';
      return;
    case 'session-reset':
      acc.manualBatch = null;
      acc.pause = null;
      acc.resetRecorded = true;
      acc.status = acc.abortReason === null ? 'restored' : 'aborted';
      return;
  }
}

function applyBaseline(acc: SessionAccumulator, verdict: Verdict): void {
  const baseline = acc.trials.at(-1);
  if (baseline !== undefined && baseline.round === 0) baseline.verdict = verdict;

  if (verdict === 'persists') {
    acc.abortReason = 'host-issue';
    acc.status = 'aborted';
    return;
  }
  if (acc.originalEnabledIds.length === 1) {
    acc.culpritId = acc.originalEnabledIds[0] as string;
    acc.status = 'completed';
    return;
  }
  acc.status = 'awaiting-verdict';
}

function applyVerdict(acc: SessionAccumulator, verdict: Verdict): void {
  const trial = acc.trials.at(-1);
  if (trial === undefined) return;
  trial.verdict = verdict;
  acc.suspects = suspectsFromVerdict(trial, verdict, acc.suspects);
  acc.cleared = clearedOf(acc.originalEnabledIds, acc.suspects);

  const outcome = nextOutcome({
    suspects: acc.suspects,
    cleared: acc.cleared,
    lastTrial: toAnsweredTrial(trial),
  });

  if (outcome.kind === 'completed') {
    acc.culpritId = outcome.culpritId;
    acc.ambiguityIds = [];
    acc.status = 'completed';
    return;
  }
  if (outcome.kind === 'inconclusive') {
    acc.culpritId = null;
    acc.ambiguityIds = outcome.ambiguityIds;
    acc.status = 'inconclusive';
    return;
  }
  acc.status = 'awaiting-verdict';
}

/**
 * The ids any applied batch moved. A session that touched nothing can be replaced
 * without a restore; one that did must be restored first.
 */
function touchedCountOf(trials: readonly Trial[]): number {
  const touched = new Set<string>();
  for (const trial of trials) {
    for (const id of trial.enabledIds) touched.add(id);
    for (const id of trial.disabledIds) touched.add(id);
  }
  return touched.size;
}

export function reduceLog(log: BisectLog | null): SessionView | null {
  if (log === null || log.events.length === 0) return null;

  const acc: SessionAccumulator = {
    status: 'preparing',
    capability: BASELINE_MODE_CAPABILITY,
    baselineMode: 'auto',
    candidateOrder: [],
    originalEnabledIds: [],
    suspects: [],
    suspectsBeforeTrial: [],
    cleared: [],
    trials: [],
    culpritId: null,
    ambiguityIds: [],
    abortReason: null,
    testTab: null,
    manualBatch: null,
    pause: null,
    resetRecorded: false,
    createdAt: 0,
    updatedAt: 0,
  };

  for (const event of log.events) applyEvent(acc, event);

  const lastTrial = acc.trials.at(-1) ?? null;
  const touchedCount = touchedCountOf(acc.trials);
  return {
    sessionId: log.sessionId,
    status: acc.status,
    capability: acc.capability,
    baselineMode: acc.baselineMode,
    candidateOrder: acc.candidateOrder,
    originalEnabledIds: acc.originalEnabledIds,
    suspects: acc.suspects,
    cleared: acc.cleared,
    currentTrial: lastTrial,
    trials: acc.trials,
    culpritId: acc.culpritId,
    ambiguityIds: acc.ambiguityIds,
    abortReason: acc.abortReason,
    testTab: acc.testTab,
    manualBatch: acc.manualBatch,
    pause: acc.pause,
    changes: acc.pause?.changes ?? [],
    restorePending: !acc.resetRecorded && touchedCount > 0,
    progress:
      acc.originalEnabledIds.length === 0
        ? null
        : {
            trialNumber: acc.trials.length,
            estimatedTrials: estimateTrials(acc.originalEnabledIds.length),
            suspectCount: acc.suspects.length,
          },
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
  };
}
