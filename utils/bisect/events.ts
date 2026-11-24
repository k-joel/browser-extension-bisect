import { storage } from 'wxt/utils/storage';
import type { BisectEvent, BisectLog, CapabilityReport, SessionStatus, SessionView, Trial, Verdict } from './domain';
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

export async function writeBisectLog(log: BisectLog): Promise<void> {
  await bisectLogItem.setValue(log);
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
      applyBaseline(acc, event.payload.verdict);
      return;
    case 'trial-started':
      acc.suspectsBeforeTrial = [...acc.suspects];
      acc.trials.push({
        round: event.payload.round,
        enabledIds: event.payload.enabledIds,
        disabledIds: event.payload.disabledIds,
        targetState: {
          enabled: event.payload.enabledIds,
          disabled: event.payload.disabledIds,
          allOutsideSuspectsEnabled: true,
        },
        verdict: null,
        appliedAt: null,
        errors: [],
        manual: event.payload.manual === true,
      });
      acc.status = 'trial';
      return;
    case 'trial-applied': {
      const trial = acc.trials.at(-1);
      if (trial === undefined) return;
      trial.appliedAt = event.at;
      trial.errors = event.payload.errors;
      trial.manual = event.payload.manual === true;
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
      acc.status = 'paused';
      return;
    case 'session-resumed': {
      if (event.payload.reason === 'manual-verified') {
        acc.status = 'awaiting-verdict';
        return;
      }
      acc.status = acc.trials.some((trial) => trial.appliedAt !== null) ? 'awaiting-verdict' : 'baseline';
      return;
    }
    case 'session-completed':
      acc.culpritId = event.payload.culpritId;
      acc.status = 'completed';
      return;
    case 'session-inconclusive':
      acc.ambiguityIds = event.payload.ambiguityIds;
      acc.culpritId = null;
      acc.status = 'inconclusive';
      return;
    case 'session-reset':
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
    createdAt: 0,
    updatedAt: 0,
  };

  for (const event of log.events) applyEvent(acc, event);

  const lastTrial = acc.trials.at(-1) ?? null;
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
