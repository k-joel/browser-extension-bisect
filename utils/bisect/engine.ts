import type { SessionStatus, TargetState, Verdict } from './domain';

export interface TrialPartition {
  enabled: string[];
  disabled: string[];
}

export interface AnsweredTrial {
  enabledIds: string[];
  disabledIds: string[];
  verdict: Verdict;
}

export type InconclusiveReason = 'final-confirmation-persists' | 'verdict-contradiction';

export type SearchOutcome =
  | { kind: 'trial'; partition: TrialPartition; target: TargetState }
  | { kind: 'completed'; culpritId: string }
  | { kind: 'inconclusive'; ambiguityIds: string[]; reason: InconclusiveReason };

export interface SearchState {
  suspects: string[];
  cleared: string[];
  lastTrial: AnsweredTrial | null;
}

export const MAX_FINAL_CONFIRMATIONS = 1;

export const SESSION_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  preparing: ['baseline', 'aborted'],
  baseline: ['trial', 'aborted'],
  trial: ['applying'],
  applying: ['awaiting-verdict', 'paused', 'aborted'],
  'awaiting-verdict': ['trial', 'completed', 'inconclusive', 'paused'],
  'awaiting-manual-toggle': ['awaiting-verdict', 'paused', 'aborted'],
  paused: ['trial', 'awaiting-verdict', 'aborted'],
  completed: ['restored'],
  inconclusive: ['restored'],
  aborted: ['restored'],
  restored: ['preparing'],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return SESSION_TRANSITIONS[from].includes(to);
}

/**
 * The disabled half takes `floor(n / 2)` candidates from the tail of the pool, so an
 * odd pool gives its extra candidate to the enabled half (the documented `N = 24`
 * trace needs 7–9 enabled / 10–12 disabled at `n = 3`). A lone suspect is disabled
 * alone, which is the final confirmation trial.
 */
export function partitionSuspects(suspects: readonly string[]): TrialPartition {
  const disabledCount = Math.max(1, Math.floor(suspects.length / 2));
  const boundary = Math.max(0, suspects.length - disabledCount);
  return {
    enabled: suspects.slice(0, boundary),
    disabled: suspects.slice(boundary),
  };
}

export function buildTargetState(partition: TrialPartition, cleared: readonly string[]): TargetState {
  return {
    enabled: [...cleared, ...partition.enabled],
    disabled: [...partition.disabled],
    allOutsideSuspectsEnabled: true,
  };
}

export function narrowSuspects(
  suspects: readonly string[],
  partition: TrialPartition,
  verdict: Verdict,
): string[] {
  const kept = verdict === 'persists' ? partition.enabled : partition.disabled;
  return suspects.filter((id) => kept.includes(id));
}

export function clearedOf(candidates: readonly string[], suspects: readonly string[]): string[] {
  return candidates.filter((id) => !suspects.includes(id));
}

export function estimateTrials(candidateCount: number): number {
  if (candidateCount <= 1) return 1;
  return 1 + Math.ceil(Math.log2(candidateCount));
}

export function worstCaseTrials(candidateCount: number): number {
  return estimateTrials(candidateCount) + MAX_FINAL_CONFIRMATIONS;
}

function isLoneSuspectConfirmation(lastTrial: AnsweredTrial, suspects: readonly string[]): boolean {
  if (lastTrial.disabledIds.length !== 1) return false;
  if (suspects.length === 0) return true;
  return suspects.length === 1 && suspects[0] === lastTrial.disabledIds[0];
}

function contradictedAmbiguity(lastTrial: AnsweredTrial | null): string[] {
  if (lastTrial === null) return [];
  return [...lastTrial.enabledIds, ...lastTrial.disabledIds];
}

export function nextOutcome({ suspects, cleared, lastTrial }: SearchState): SearchOutcome {
  const finalConfirmationPersisted =
    lastTrial !== null &&
    lastTrial.verdict === 'persists' &&
    isLoneSuspectConfirmation(lastTrial, suspects) &&
    suspects.length <= 1;

  if (finalConfirmationPersisted) {
    const ambiguityIds = suspects.length === 1 ? [suspects[0] as string] : [...lastTrial.disabledIds];
    return { kind: 'inconclusive', ambiguityIds, reason: 'final-confirmation-persists' };
  }

  if (suspects.length === 0) {
    return { kind: 'inconclusive', ambiguityIds: contradictedAmbiguity(lastTrial), reason: 'verdict-contradiction' };
  }

  const confirmedAlone =
    suspects.length === 1 &&
    lastTrial !== null &&
    lastTrial.verdict === 'gone' &&
    lastTrial.disabledIds.length === 1 &&
    lastTrial.disabledIds[0] === suspects[0];

  if (confirmedAlone) return { kind: 'completed', culpritId: suspects[0] as string };

  const partition = partitionSuspects(suspects);
  return { kind: 'trial', partition, target: buildTargetState(partition, cleared) };
}
