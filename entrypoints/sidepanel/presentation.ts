import type {
  CandidateExtension,
  CapabilityReport,
  IneligibleReason,
  RestoreError,
  SessionStatus,
  SessionView,
  TestTabBinding,
  Verdict,
} from '@/utils/bisect/domain';

const REASON_LABELS: Record<IneligibleReason, string> = {
  'theme-or-app': 'Theme or app',
  'disabled-at-start': 'Disabled at start',
  'policy-locked': 'Policy-locked',
  self: 'This add-on',
};

const STATUS_TEXT: Record<SessionStatus, string> = {
  preparing: 'Choose the candidates to bisect.',
  baseline: 'Applying the all-off baseline.',
  trial: 'Applying the next trial.',
  applying: 'Toggling extensions.',
  'awaiting-verdict': 'Waiting for your verdict.',
  'awaiting-manual-toggle': 'Waiting for you to match the trial in the extension manager.',
  paused: 'Paused.',
  completed: 'The culprit is identified.',
  inconclusive: 'The evidence is contradictory, so no culprit is named.',
  aborted: 'The session was aborted.',
  restored: 'Every touched extension is back to its original state.',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  persists: 'Problem persists',
  gone: 'Problem is gone',
};

export interface PickerRow {
  id: string;
  name: string;
  version: string;
  excluded: boolean;
}

export type PanelScreen =
  | 'loading'
  | 'error'
  | 'picker'
  | 'preflight'
  | 'baseline'
  | 'trial'
  | 'host-issue'
  | 'completed'
  | 'inconclusive'
  | 'restored'
  | 'progress';

export interface ScreenInput {
  session: SessionView | null;
  preflightOpen: boolean;
}

export interface RestoreOutcome {
  restored: boolean;
  errors: RestoreError[];
}

export interface RestoreFailure {
  id: string;
  name: string;
  code: string;
  message: string;
}

export interface RestoreSummary {
  complete: boolean;
  headline: string;
  failures: RestoreFailure[];
}

export function formatIneligibleReason(reason: IneligibleReason): string {
  return REASON_LABELS[reason];
}

export function formatToggleMode(capability: CapabilityReport): string {
  return capability.canAutoToggle
    ? 'Automatic — the add-on toggles extensions for you'
    : 'Assisted — you apply each batch in the browser’s add-on manager';
}

export function formatSideSurface(capability: CapabilityReport): string {
  return capability.sideSurface === 'sidebar' ? 'Sidebar' : 'Side panel';
}

export function compareByNameThenId(left: { name: string; id: string }, right: { name: string; id: string }): number {
  const byName = left.name.localeCompare(right.name, 'en', { sensitivity: 'variant' });
  if (byName !== 0) return byName;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function buildPickerRows(eligible: CandidateExtension[], excludedIds: readonly string[]): PickerRow[] {
  return eligible
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      version: candidate.version,
      excluded: excludedIds.includes(candidate.id),
    }))
    .sort(compareByNameThenId);
}

export function initialsFor(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function matchesSearch(name: string, query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length === 0) return true;
  return name.toLowerCase().includes(trimmed.toLowerCase());
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatTestTab(tab: TestTabBinding | null): string {
  if (tab === null) return 'No test tab bound';
  const label = `Tab #${tab.tabId}`;
  return tab.url === null ? label : `${label} · ${tab.url}`;
}

export function selectIncludedCandidates(
  eligible: CandidateExtension[],
  excludedIds: readonly string[],
): CandidateExtension[] {
  return eligible.filter((candidate) => !excludedIds.includes(candidate.id)).sort(compareByNameThenId);
}

export function isBaselineQuestion(view: SessionView): boolean {
  const trial = view.currentTrial;
  return view.status === 'awaiting-verdict' && trial !== null && trial.round === 0 && trial.verdict === null;
}

/**
 * True once the baseline question is answered and the search still has work to do:
 * either no partition trial exists yet, or the last one was answered. The panel
 * then owes the user the next partition.
 */
export function needsNextTrial(view: SessionView): boolean {
  if (view.status !== 'awaiting-verdict') return false;
  const trial = view.currentTrial;
  if (trial === null) return view.suspects.length > 0;
  return trial.verdict !== null && view.suspects.length > 0;
}

export function isTrialQuestion(view: SessionView): boolean {
  const trial = view.currentTrial;
  return view.status === 'awaiting-verdict' && trial !== null && trial.round > 0 && trial.verdict === null;
}

export function nextTrialNumber(view: SessionView): number {
  const rounds = view.trials.map((trial) => trial.round);
  return rounds.length === 0 ? 1 : Math.max(...rounds) + 1;
}

export interface PartitionPreview {
  enabled: string[];
  disabled: string[];
}

export function partitionPreview(suspects: readonly string[]): PartitionPreview {
  const disabledCount = Math.max(1, Math.floor(suspects.length / 2));
  const boundary = Math.max(0, suspects.length - disabledCount);
  return { enabled: suspects.slice(0, boundary), disabled: suspects.slice(boundary) };
}

export interface TrialSummaryRow {
  round: number;
  enabledNames: string[];
  disabledNames: string[];
  verdictLabel: string;
}

export function describeTrialHistory(view: SessionView): TrialSummaryRow[] {
  return view.trials
    .filter((trial) => trial.round > 0)
    .map((trial) => ({
      round: trial.round,
      enabledNames: trial.enabledIds.map((id) => findCandidate(view.candidateOrder, id)?.name ?? id),
      disabledNames: trial.disabledIds.map((id) => findCandidate(view.candidateOrder, id)?.name ?? id),
      verdictLabel: trial.verdict === null ? 'Awaiting your verdict' : VERDICT_LABELS[trial.verdict],
    }));
}

export type InconclusiveReason = 'final-confirmation-persists' | 'verdict-contradiction';

const INCONCLUSIVE_TEXT: Record<InconclusiveReason, string> = {
  'final-confirmation-persists':
    'The last trial disabled the only remaining suspect and the problem still happened, so the evidence contradicts a single culprit.',
  'verdict-contradiction': 'The verdicts eliminated every suspect, so no single extension explains the problem.',
};

export function inconclusiveReasonOf(view: SessionView): InconclusiveReason {
  const answered = view.currentTrial;
  if (answered !== null && answered.disabledIds.length === 1 && answered.verdict === 'persists') {
    return 'final-confirmation-persists';
  }
  return 'verdict-contradiction';
}

export function describeInconclusiveReason(reason: InconclusiveReason): string {
  return INCONCLUSIVE_TEXT[reason];
}

export function ambiguityNames(view: SessionView): string[] {
  return view.ambiguityIds.map((id) => findCandidate(view.candidateOrder, id)?.name ?? id);
}

export function resolveScreen({ session, preflightOpen }: ScreenInput): PanelScreen {
  if (session === null) return preflightOpen ? 'preflight' : 'picker';
  if (session.status === 'restored') return 'restored';
  if (session.status === 'aborted' && session.abortReason === 'host-issue') return 'host-issue';
  if (session.status === 'completed' && session.culpritId !== null) return 'completed';
  if (session.status === 'inconclusive') return 'inconclusive';
  if (isBaselineQuestion(session)) return 'baseline';
  if (isTrialQuestion(session) || needsNextTrial(session)) return 'trial';
  return 'progress';
}

export function describeSessionStatus(status: SessionStatus): string {
  return STATUS_TEXT[status];
}

export function summarizeRestore(outcome: RestoreOutcome, candidates: CandidateExtension[]): RestoreSummary {
  const failures = outcome.errors.map((error) => ({
    id: error.extensionId,
    name: candidates.find((candidate) => candidate.id === error.extensionId)?.name ?? error.extensionId,
    code: error.code,
    message: error.message,
  }));
  const complete = outcome.restored && failures.length === 0;
  return {
    complete,
    headline: complete
      ? 'All touched extensions are enabled again.'
      : `Restore incomplete: ${plural(failures.length, 'extension')} could not be re-enabled.`,
    failures,
  };
}

export function describeProgress(view: SessionView): string {
  if (view.trials.length === 0) {
    return `Baseline complete · ${plural(view.suspects.length, 'suspect')} remain`;
  }
  const progress = view.progress;
  if (progress === null) return `${plural(view.suspects.length, 'suspect')} remain`;
  return `Trial ${progress.trialNumber} of ~${progress.estimatedTrials} · ${plural(progress.suspectCount, 'suspect')}`;
}

export function findCandidate(candidates: CandidateExtension[], extensionId: string | null): CandidateExtension | null {
  if (extensionId === null) return null;
  return candidates.find((candidate) => candidate.id === extensionId) ?? null;
}
