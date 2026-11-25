import type {
  BaselineMode,
  CandidateExtension,
  CapabilityReport,
  DriftCategory,
  DriftReport,
  EnabledStateMap,
  IneligibleReason,
  ManualBatch,
  RestoreError,
  SessionPause,
  SessionStatus,
  SessionView,
  SnapshotChange,
  SnapshotChangeKind,
  StartupReconciliation,
  TestTabBinding,
  ToggleErrorCode,
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
  | 'paused'
  | 'toggle-failure'
  | 'snapshot-change'
  | 'history'
  | 'replay'
  | 'host-issue'
  | 'completed'
  | 'inconclusive'
  | 'restored'
  | 'progress';

export interface ScreenInput {
  session: SessionView | null;
  preflightOpen: boolean;
  historyOpen?: boolean;
  replayOpen?: boolean;
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
  guidance: string;
}

export interface RestoreSummary {
  complete: boolean;
  headline: string;
  failures: RestoreFailure[];
  /** The browser's extension manager, for the failures that can only be fixed there. */
  extensionManagerUrl: string | null;
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

export function resolveScreen({
  session,
  preflightOpen,
  historyOpen = false,
  replayOpen = false,
}: ScreenInput): PanelScreen {
  if (session === null) return preflightOpen ? 'preflight' : 'picker';
  if (replayOpen) return 'replay';
  if (historyOpen) return 'history';
  if (session.status === 'restored') return 'restored';
  if (session.status === 'paused') {
    if (isSnapshotPause(session)) return 'snapshot-change';
    return isToggleFailure(session) ? 'toggle-failure' : 'paused';
  }
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

/**
 * What the Resume/Restore offer means for this session. The wording stays on the drift
 * vocabulary the rest of the panel uses: a restore is still pending until
 * `session-reset` is recorded, and an in-flight session is one the search has not
 * finished with.
 */
export function describeStartupOffer(reconciliation: StartupReconciliation): string {
  const touched = plural(reconciliation.touchedCount, 'extension');
  if (reconciliation.inFlight) {
    return `Resume puts ${touched} back to the batch this session was asking about, and you keep every recorded verdict. Restore re-enables ${touched} now and ends the session.`;
  }
  if (reconciliation.restorePending) {
    return `The session is ${describeSessionStatus(reconciliation.status).toLowerCase()} No restore is recorded yet, so Restore re-enables the ${touched} this session changed.`;
  }
  return 'Nothing needs attention: the session already reached a settled state.';
}

/**
 * The browser-versus-log difference in the drift vocabulary. `null` means the browser
 * matches the last applied batch, which is also what a session with no recorded drift
 * says; the two are kept apart so an in-sync restart does not read like a warning.
 */
export function describeStartupDifference(reconciliation: StartupReconciliation): string | null {
  const drift = reconciliation.drift;
  if (drift === null || drift.inSync) return null;
  const parts: string[] = [];
  if (drift.pendingManualToggles.length > 0) {
    parts.push(`${plural(drift.pendingManualToggles.length, 'extension')} not in the expected state`);
  }
  if (drift.unexpectedToggles.length > 0) {
    parts.push(`${plural(drift.unexpectedToggles.length, 'extension')} changed outside the batch`);
  }
  if (drift.missingIds.length > 0) {
    parts.push(`${plural(drift.missingIds.length, 'extension')} no longer installed`);
  }
  return `The browser came back with ${parts.join(', ')}.`;
}

export function summarizeRestore(outcome: RestoreOutcome, candidates: CandidateExtension[]): RestoreSummary {
  const failures = outcome.errors.map((error) => ({
    id: error.extensionId,
    name: candidates.find((candidate) => candidate.id === error.extensionId)?.name ?? error.extensionId,
    code: error.code,
    message: error.message,
    guidance: describeRecovery(error.code),
  }));
  const complete = outcome.restored && failures.length === 0;
  const requiresManager = outcome.errors.some((error) => recoveryNeedsExtensionManager(error.code));
  return {
    complete,
    headline: complete
      ? 'All touched extensions are enabled again.'
      : `Restore incomplete: ${plural(failures.length, 'extension')} could not be re-enabled.`,
    failures,
    extensionManagerUrl: requiresManager ? EXTENSION_MANAGER_URL : null,
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

export interface DriftCategorySummary {
  category: DriftCategory;
  label: string;
  detail: string;
  ids: string[];
  names: string[];
}

export interface DriftRow {
  id: string;
  name: string;
  expected: 'On' | 'Off' | null;
  actual: 'On' | 'Off' | null;
  differs: boolean;
}

export interface DriftSummary {
  categories: DriftCategorySummary[];
  rows: DriftRow[];
  missing: string[];
}

const DRIFT_CATEGORY_TEXT: Record<DriftCategory, { label: string; detail: string }> = {
  pending: {
    label: 'Still to toggle',
    detail: 'This trial asked for a state these candidates have not reached yet.',
  },
  unexpected: {
    label: 'Toggled unexpectedly',
    detail: 'These candidates changed outside the trial, so the batch no longer matches.',
  },
  missing: {
    label: 'No longer installed',
    detail: 'These candidates disappeared, so no toggle can bring the trial back.',
  },
};

export const DRIFT_CATEGORY_ORDER: readonly DriftCategory[] = ['pending', 'unexpected', 'missing'];

function stateLabel(enabled: boolean | undefined): 'On' | 'Off' | null {
  if (enabled === undefined) return null;
  return enabled ? 'On' : 'Off';
}

/**
 * The drift the paused screen renders: one entry per category so each gets its own
 * `data-testid`, and one row per candidate that either differs or is missing. A row
 * with `expected === null` is a candidate the pause has no recorded state for.
 */
export function summarizeDriftView(drift: DriftReport, candidates: CandidateExtension[]): DriftSummary {
  const nameOf = (id: string) => candidates.find((candidate) => candidate.id === id)?.name ?? id;
  const idsByCategory: Record<DriftCategory, string[]> = {
    pending: drift.pendingManualToggles,
    unexpected: drift.unexpectedToggles,
    missing: drift.missingIds,
  };

  const categories = DRIFT_CATEGORY_ORDER.map((category) => {
    const ids = idsByCategory[category];
    return {
      category,
      label: DRIFT_CATEGORY_TEXT[category].label,
      detail: DRIFT_CATEGORY_TEXT[category].detail,
      ids,
      names: ids.map(nameOf),
    };
  });

  const ordered = [...new Set([...drift.missingIds, ...drift.unexpectedToggles, ...drift.pendingManualToggles])];
  const rows = ordered.map((id) => ({
    id,
    name: nameOf(id),
    expected: stateLabel(drift.expected[id]),
    actual: stateLabel(drift.actual[id]),
    differs: drift.expected[id] !== drift.actual[id],
  }));

  return { categories, rows, missing: drift.missingIds.map(nameOf) };
}

export function describeDriftCause(drift: DriftReport | null): string {
  if (drift === null) return 'The session paused before it could compare the browser state.';
  const total = drift.pendingManualToggles.length + drift.unexpectedToggles.length + drift.missingIds.length;
  return `The browser state no longer matches this trial (${plural(total, 'candidate')}). Choose how to recover.`;
}

export function formatSyncState(expected: 'On' | 'Off' | null, actual: 'On' | 'Off' | null): string {
  if (expected === null && actual === null) return 'Not recorded';
  if (expected === null) return `Expected: unknown · now ${actual}`;
  if (actual === null) return `Expected: ${expected} · no longer installed`;
  return `Expected: ${expected} · now ${actual}`;
}

export const EXTENSION_MANAGER_URL = 'chrome://extensions';

/**
 * Where the user has to finish the job by hand when the add-on cannot. The browser's
 * extension manager is the only place a greylisted or policy-locked re-enable can be
 * completed, so every manual-recovery surface names it instead of implying the add-on
 * will retry.
 */
const RECOVERY_GUIDANCE: Record<ToggleErrorCode, string> = {
  'needs-user-gesture': 'Chrome needs a click on this add-on’s own page before it will re-enable the extension.',
  'manual-recovery-required': `The browser blocked the re-enable. Turn the extension back on yourself in ${EXTENSION_MANAGER_URL}.`,
  'policy-blocked': `An administrator policy locks this extension. Only ${EXTENSION_MANAGER_URL} can tell you whether it can be enabled at all.`,
  'extension-removed': 'The extension is no longer installed, so there is nothing left to restore.',
  'unsupported-requirements': `The browser refused the change. Re-enable the extension yourself in ${EXTENSION_MANAGER_URL}.`,
};

export function describeRecovery(code: ToggleErrorCode): string {
  return RECOVERY_GUIDANCE[code];
}

export function recoveryNeedsExtensionManager(code: ToggleErrorCode): boolean {
  return code !== 'needs-user-gesture';
}

export interface ToggleFailureRow {
  id: string;
  name: string;
  code: ToggleErrorCode;
  message: string;
  guidance: string;
}

/**
 * The per-id failure list a pause renders. It is derived from the pause's own errors, so
 * the screen shows exactly the ids and codes the batch recorded and nothing is inferred
 * from the trial's position.
 */
export function toggleFailureRows(pause: SessionPause | null, candidates: CandidateExtension[]): ToggleFailureRow[] {
  if (pause === null) return [];
  return pause.errors.map((error) => ({
    id: error.extensionId,
    name: candidates.find((candidate) => candidate.id === error.extensionId)?.name ?? error.extensionId,
    code: error.code,
    message: error.message,
    guidance: describeRecovery(error.code),
  }));
}

export interface EscalationRequest {
  id: string;
  name: string;
}

/**
 * The single gesture-bound retry the SPEC allows. Only a `needs-user-gesture` failure can
 * be completed from the panel, and only one extension at a time, so the action stays a
 * single named extension rather than a batch.
 */
export function escalationRequestOf(
  pause: SessionPause | null,
  candidates: CandidateExtension[],
): EscalationRequest | null {
  const row = toggleFailureRows(pause, candidates).find((entry) => entry.code === 'needs-user-gesture');
  return row === undefined ? null : { id: row.id, name: row.name };
}

/**
 * True when the pause needs manual recovery the add-on cannot automate. The panel then
 * shows the extension-manager instructions and Restore instead of an escalation button.
 */
export function needsManualRecovery(pause: SessionPause | null): boolean {
  if (pause === null) return false;
  return pause.errors.some(
    (error) =>
      error.code === 'manual-recovery-required' ||
      error.code === 'policy-blocked' ||
      error.code === 'extension-removed',
  );
}

/**
 * A pause the add-on itself caused by refusing a toggle, as opposed to one it found in
 * the browser. The two need different screens: drift is something the user changed and
 * can re-sync, a toggle failure is something the browser refused and only restore or a
 * gesture can finish.
 */
export function isToggleFailure(view: SessionView): boolean {
  const pause = view.pause;
  if (view.status !== 'paused' || pause === null) return false;
  return pause.errors.length > 0;
}

/**
 * The pause a mid-session install/update/removal opened. It is told apart from drift and
 * from a toggle failure by the changes it carries, not by its reason string, so the panel
 * keeps rendering the same screen even if the reason vocabulary grows.
 */
export function isSnapshotPause(view: SessionView): boolean {
  if (view.status !== 'paused') return false;
  const changes = view.pause?.changes ?? [];
  return changes.some((change) => change.kind !== 'installed');
}

/**
 * True when the browser reported a change that is only a warning. An install never pauses,
 * so it is derived from the view's `changes` rather than from a pause: the pause field is
 * empty in exactly that case, and the warning is the only thing the panel has to show.
 */
export function isSnapshotWarningOnly(view: SessionView): boolean {
  const changes = view.changes;
  if (changes.length === 0) return false;
  return changes.every((change) => change.kind === 'installed');
}

/**
 * The test tab stopped being usable for this batch. It is a hint, not a gate: the batch
 * is in the browser and the user can still see whether the symptom happens, so the panel
 * offers a rebind beside the verdict buttons rather than replacing them.
 */
export function testTabPromptOf(view: SessionView): TestTabPrompt | null {
  const trial = view.currentTrial;
  if (trial === null || trial.testTab === null) return null;
  if (trial.verdict !== null) return null;

  if (trial.testTab.status === 'closed') {
    return {
      kind: 'closed',
      tabId: trial.testTab.tabId,
      headline: 'The test tab was closed.',
      detail: 'Bind another tab to keep the automatic reload, or answer the verdict without one.',
      action: 'Bind another test tab',
    };
  }
  if (trial.testTab.status === 'unsettled') {
    return {
      kind: 'unsettled',
      tabId: trial.testTab.tabId,
      headline: 'The test tab did not finish loading.',
      detail: 'Reload it yourself once it is ready, then answer the verdict. The batch is already applied.',
      action: 'Reload the test tab again',
    };
  }
  return null;
}

export interface TestTabPrompt {
  kind: 'closed' | 'unsettled';
  tabId: number | null;
  headline: string;
  detail: string;
  action: string;
}

/**
 * A candidate that the browser installed, updated, or removed under the session. The
 * snapshot is unchanged by definition, so the warning is always a sentence about the
 * difference and never a change to the candidate list.
 */
export interface SnapshotWarningRow {
  kind: SnapshotChangeKind;
  id: string;
  name: string;
  detail: string;
}

const SNAPSHOT_KIND_TEXT: Record<SnapshotChangeKind, { label: string; detail: string }> = {
  installed: {
    label: 'Installed during this session',
    detail: 'It was installed after the session started, so it is not a candidate in this search.',
  },
  updated: {
    label: 'Updated during this session',
    detail: 'The version changed after the snapshot was taken, so the search paused instead of answering.',
  },
  removed: {
    label: 'Removed during this session',
    detail: 'It is no longer installed, so the trial that included it cannot be answered.',
  },
};

export function summarizeSnapshotChanges(changes: readonly SnapshotChange[]): SnapshotWarningRow[] {
  return changes.map((change) => ({
    kind: change.kind,
    id: change.extensionId,
    name: change.name,
    detail: SNAPSHOT_KIND_TEXT[change.kind].detail,
  }));
}

export function formatSnapshotKind(kind: SnapshotChangeKind): string {
  return SNAPSHOT_KIND_TEXT[kind].label;
}

/**
 * Only a change that invalidated the trial asks for restore-or-restart. An install never
 * reaches a pause, so it never offers a choice: nothing about the search changed.
 */
export function needsSnapshotDecision(view: SessionView): boolean {
  if (view.status !== 'paused') return false;
  const changes = view.pause?.changes ?? [];
  return changes.some((change) => change.kind !== 'installed');
}

export function describeSnapshotPause(changes: readonly SnapshotChange[]): string {
  if (changes.length === 0) return 'The browser changed under this session.';
  const parts = changes.map((change) => {
    if (change.kind === 'removed') return `${change.name} was removed`;
    if (change.kind === 'updated') return `${change.name} was updated`;
    return `${change.name} was installed`;
  });
  return `The browser changed under this session: ${parts.join(', ')}. The trial on screen can no longer be answered.`;
}
