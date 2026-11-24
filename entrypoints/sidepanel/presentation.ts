import type {
  BaselineMode,
  CandidateExtension,
  CapabilityReport,
  EnabledStateMap,
  IneligibleReason,
  ManualBatch,
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
  | 'assisted-baseline'
  | 'assisted-trial'
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
  manualIds?: string[];
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
  if (isAssistedBaseline(session)) return 'assisted-baseline';
  if (session.status === 'baseline') return 'baseline';
  if (isBaselineQuestion(session)) return 'baseline';
  if (isAssistedTrial(session)) return 'assisted-trial';
  if (isTrialQuestion(session) || needsNextTrial(session)) return 'trial';
  return 'progress';
}

/**
 * A manual all-off batch still waiting on the user. Only the baseline is in scope
 * here; an assisted partition batch has its own screen, because it asks the user to
 * enable *and* disable and must not offer a verdict before the state is verified.
 */
export function isAssistedBaseline(view: SessionView): boolean {
  const trial = view.currentTrial;
  return view.status === 'awaiting-manual-toggle' && trial !== null && trial.round === 0 && trial.manual;
}

/**
 * An assisted partition batch: the session is waiting for the user to match the
 * batch, and no verdict exists yet. The panel shows the two checklists and a Verify
 * action, and withholds both verdict buttons until `confirmManualState` succeeds.
 */
export function isAssistedTrial(view: SessionView): boolean {
  const trial = view.currentTrial;
  return view.status === 'awaiting-manual-toggle' && trial !== null && trial.round > 0 && trial.manual;
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

/**
 * Assisted mode never toggles anything, so the baseline is a checklist the add-on
 * can verify. `external` is the faster attestation offered on the same screen and
 * is recorded by `recordExternalBaseline`, not by the start. An enterprise-policy
 * install reports `canAutoToggle`, in which case the automated baseline runs.
 */
export function baselineModeFor(capability: CapabilityReport, requested: BaselineMode): BaselineMode {
  if (capability.canAutoToggle) return 'auto';
  return requested === 'external' ? 'external' : 'manual';
}

export function isAssisted(capability: CapabilityReport | null): boolean {
  return capability !== null && !capability.canAutoToggle;
}

export interface ManualProgress {
  done: number;
  total: number;
  remainingIds: string[];
  complete: boolean;
}

/**
 * "6 of 8 off": the count of candidates already in the target state, so the user
 * sees progress even when a toggle they did not expect also drifted.
 */
export function manualProgress(batch: ManualBatch, actual: EnabledStateMap): ManualProgress {
  const targets: [string, boolean][] = [
    ...batch.enableIds.map((id): [string, boolean] => [id, true]),
    ...batch.disableIds.map((id): [string, boolean] => [id, false]),
  ];
  const remainingIds = targets.filter(([id, enabled]) => actual[id] !== enabled).map(([id]) => id);
  const total = targets.length;
  return { done: total - remainingIds.length, total, remainingIds, complete: remainingIds.length === 0 };
}

export function formatManualProgress(progress: ManualProgress): string {
  return `${progress.done} of ${progress.total} done`;
}

/**
 * The trial wording: the user is matching a batch that has both directions, so
 * "matched" describes the goal better than "done" does.
 */
export function formatTrialProgress(progress: ManualProgress): string {
  return `${progress.done} of ${progress.total} matched`;
}

export function manualInstruction(batch: ManualBatch, candidates: CandidateExtension[]): string {
  const names = (ids: string[]) =>
    ids.map((id) => candidates.find((candidate) => candidate.id === id)?.name ?? id).join(', ');
  const parts: string[] = [];
  if (batch.disableIds.length > 0) parts.push(`turn off ${names(batch.disableIds)}`);
  if (batch.enableIds.length > 0) parts.push(`turn on ${names(batch.enableIds)}`);
  return `${parts.join(' and ')} in the Add-ons Manager.`.replace(/^./, (first) => first.toUpperCase());
}

/**
 * The copyable fallback when `about:addons` cannot be opened: the exact per-extension
 * names and target states, so the user can still do the work from memory.
 */
export function manualChecklistLines(
  batch: ManualBatch,
  candidates: CandidateExtension[],
): { id: string; name: string; target: 'On' | 'Off' }[] {
  const nameOf = (id: string) => candidates.find((candidate) => candidate.id === id)?.name ?? id;
  return [
    ...batch.disableIds.map((id) => ({ id, name: nameOf(id), target: 'Off' as const })),
    ...batch.enableIds.map((id) => ({ id, name: nameOf(id), target: 'On' as const })),
  ];
}

export interface AssistedRestoreRow {
  id: string;
  name: string;
  done: boolean;
}

export interface AssistedRestoreSummary {
  total: number;
  remaining: number;
  rows: AssistedRestoreRow[];
  complete: boolean;
}

/**
 * The assisted restore checklist: every touched candidate with its original state,
 * ticked when the browser reports it already back.
 */
export function assistedRestoreSummary(
  manualIds: readonly string[],
  restoredIds: readonly string[],
  candidates: CandidateExtension[],
): AssistedRestoreSummary {
  const ids = [...new Set([...restoredIds, ...manualIds])];
  const rows = ids.map((id) => ({
    id,
    name: candidates.find((candidate) => candidate.id === id)?.name ?? id,
    done: restoredIds.includes(id),
  }));
  return {
    total: rows.length,
    remaining: rows.filter((row) => !row.done).length,
    rows,
    complete: rows.length > 0 && rows.every((row) => row.done),
  };
}
