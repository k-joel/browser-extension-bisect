import type { SessionStatus, SessionView, TargetState, Verdict } from './domain';

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

const UNDO_REFUSED_STATUSES: readonly SessionStatus[] = ['paused', 'completed', 'inconclusive', 'aborted', 'restored'];

export interface UndoEligibility {
  eligible: boolean;
  reason: string | null;
}

/**
 * Live undo corrects the most recent verdict, so it is only offered while that verdict
 * is the last thing the search learned. A newer trial, a terminal outcome, or a pause
 * all mean the batch to return to is no longer the one on screen; the caller then has
 * to re-sync or restore instead.
 */
export function undoEligibilityOf(view: SessionView): UndoEligibility {
  const trial = view.currentTrial;
  if (UNDO_REFUSED_STATUSES.includes(view.status)) {
    return { eligible: false, reason: `The session is ${view.status}, so there is no verdict to undo.` };
  }
  if (trial === null || trial.verdict === null) {
    return { eligible: false, reason: 'No verdict has been recorded yet.' };
  }
  if (view.status !== 'awaiting-verdict') {
    return { eligible: false, reason: `The session is ${view.status}, so the verdict is not the last step.` };
  }
  if (trial.round === 0) {
    return { eligible: false, reason: 'The baseline check is not a partition trial, so its verdict cannot be undone.' };
  }
  if (view.trials.at(-1)?.round !== trial.round) {
    return { eligible: false, reason: 'A newer trial has already started.' };
  }
  return { eligible: true, reason: null };
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

/**
 * `outsideTrialIds` names the cleared candidates: they are enabled by this target but
 * are not part of the partition, so a drift there is an unexpected toggle rather than
 * a pending manual one. It stays absent when nothing has been cleared yet, so a plain
 * first partition keeps its documented shape.
 */
export function buildTargetState(partition: TrialPartition, cleared: readonly string[]): TargetState {
  const target: TargetState = {
    enabled: [...cleared, ...partition.enabled],
    disabled: [...partition.disabled],
    allOutsideSuspectsEnabled: true,
  };
  if (cleared.length > 0) target.outsideTrialIds = [...cleared];
  return target;
}

export function narrowSuspects(suspects: readonly string[], partition: TrialPartition, verdict: Verdict): string[] {
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
