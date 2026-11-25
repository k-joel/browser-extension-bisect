export type Verdict = 'persists' | 'gone';

export type BaselineMode = 'auto' | 'manual' | 'external';

export type SideSurface = 'side-panel' | 'sidebar';

export type ExtensionKind =
  | 'extension'
  | 'theme'
  | 'hosted_app'
  | 'packaged_app'
  | 'legacy_packaged_app'
  | 'login_screen_extension';

export interface IconMetadata {
  url: string;
  size: number;
}

export interface CandidateExtension {
  id: string;
  name: string;
  version: string;
  description: string;
  enabledAtStart: boolean;
  mayDisable: boolean;
  installType: string;
  type: ExtensionKind;
  icons: IconMetadata[];
}

export type IneligibleReason = 'self' | 'theme-or-app' | 'policy-locked' | 'disabled-at-start';

export interface IneligibleExtension {
  id: string;
  name: string;
  version: string;
  type: ExtensionKind;
  reason: IneligibleReason;
}

export interface CandidateLists {
  eligible: CandidateExtension[];
  ineligible: IneligibleExtension[];
}

/**
 * What the browser reports about one installed extension, without the eligibility
 * filter: the snapshot diff needs to see candidates that the session itself turned
 * off, which `listCandidates` reports as ineligible.
 */
export interface InstalledExtension {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface CapabilityReport {
  browserName: string;
  canAutoToggle: boolean;
  selfInstallType: string;
  sideSurface: SideSurface;
}

export interface TestTabBinding {
  tabId: number;
  url: string | null;
}

export interface TargetState {
  enabled: string[];
  disabled: string[];
  allOutsideSuspectsEnabled: boolean;
  /**
   * Candidates that are not part of this trial's partition but must stay enabled:
   * the cleared ones. Verification needs them to name a toggle *outside* the trial.
   */
  outsideTrialIds?: string[];
}

export type EnabledStateMap = Record<string, boolean>;

export type ToggleErrorCode =
  | 'policy-blocked'
  | 'needs-user-gesture'
  | 'manual-recovery-required'
  | 'extension-removed'
  | 'unsupported-requirements';

export interface ToggleError {
  extensionId: string;
  code: ToggleErrorCode;
  message: string;
}

export interface ToggleResult {
  applied: string[];
  errors: ToggleError[];
  ok: boolean;
}

/**
 * What the abort actually managed to return to the previous target state. It is
 * recorded next to the failure so a rollback that could not finish is auditable
 * instead of being implied by the absence of an error.
 */
export interface ToggleRollback {
  restoredIds: string[];
  errors: ToggleError[];
}

export interface ManualBatch {
  enableIds: string[];
  disableIds: string[];
}

export interface DriftReport {
  /** One entry per candidate in the session scope: the trial's target, or `true` outside it. */
  expected: EnabledStateMap;
  actual: EnabledStateMap;
  /** Candidates the trial asked for that are not in the target state yet. */
  pendingManualToggles: string[];
  /** Candidates outside the current trial that left their expected enabled state. */
  unexpectedToggles: string[];
  missingIds: string[];
  inSync: boolean;
}

export type DriftCategory = 'pending' | 'unexpected' | 'missing';

export type SnapshotChangeKind = 'installed' | 'updated' | 'removed';

/**
 * A change the browser made under a live session. It is reported beside the snapshot and
 * never merged into it: `session-started` stays the only source of candidates, so a new or
 * re-versioned extension cannot reshape a search that already started.
 */
export interface SnapshotChange {
  kind: SnapshotChangeKind;
  extensionId: string;
  name: string;
  /** The version the snapshot recorded, or `null` for a candidate that was never in it. */
  snapshotVersion: string | null;
  currentVersion: string | null;
}

export interface SessionPause {
  reason: string;
  drift: DriftReport | null;
  /** The mid-session change that paused the session, if one did. */
  changes: SnapshotChange[];
  /**
   * The toggles that failed and could not be rolled back into place. Naming them on the
   * pause itself is what lets the panel offer the recovery its code asks for, and it
   * keeps the per-id code readable long after the batch's `trial-applied` was written.
   */
  errors: ToggleError[];
  /** Present when the pause aborted a batch that could not be applied. */
  rollback?: ToggleRollback | null;
}

export interface RestoreError {
  extensionId: string;
  code: ToggleErrorCode;
  message: string;
}

export interface RestoreResult {
  restoredIds: string[];
  manualIds: string[];
  errors: RestoreError[];
  complete: boolean;
}

export type ManagementEvent =
  | { type: 'enabled'; extensionId: string; name: string }
  | { type: 'disabled'; extensionId: string; name: string }
  | { type: 'installed'; extensionId: string; name: string; version: string; enabled: boolean }
  | { type: 'uninstalled'; extensionId: string };

export interface BisectEventPayloads {
  'session-started': {
    candidateOrder: CandidateExtension[];
    capability: CapabilityReport;
    baselineMode: BaselineMode;
    testTab: TestTabBinding | null;
  };
  'baseline-recorded': { mode: BaselineMode; verdict: Verdict };
  'trial-started': { round: number; enabledIds: string[]; disabledIds: string[]; manual?: boolean };
  'trial-applied': {
    round: number;
    errors: ToggleError[];
    manual?: boolean;
    manualBatch?: ManualBatch;
    testTab?: TestTabOutcome;
  };
  'verdict-recorded': { round: number; verdict: Verdict };
  'trial-retried': { round: number; reason?: string };
  'verdict-undone': { round: number };
  'session-paused': {
    reason: string;
    drift?: DriftReport;
    errors?: ToggleError[];
    rollback?: ToggleRollback | null;
    changes?: SnapshotChange[];
  };
  'session-resumed': { reason: string };
  'session-completed': { culpritId: string };
  'session-inconclusive': { ambiguityIds: string[]; reason: string };
  'session-reset': { restored: boolean; errors: RestoreError[]; manualIds?: string[]; accepted?: boolean };
}

export type BisectEventType = keyof BisectEventPayloads;

export type BisectEvent = {
  [Type in BisectEventType]: {
    type: Type;
    at: number;
    schemaVersion: 1;
    payload: BisectEventPayloads[Type];
  };
}[BisectEventType];

export interface BisectConfig {
  schemaVersion: 1;
  excludedExtensionIds: string[];
  testTab: TestTabBinding | null;
  lastCandidateIds?: string[];
}

export interface BisectLog {
  schemaVersion: 1;
  sessionId: string;
  events: BisectEvent[];
}

export type SessionStatus =
  | 'preparing'
  | 'baseline'
  | 'trial'
  | 'applying'
  | 'awaiting-verdict'
  | 'awaiting-manual-toggle'
  | 'paused'
  | 'completed'
  | 'inconclusive'
  | 'aborted'
  | 'restored';

export interface Trial {
  round: number;
  enabledIds: string[];
  disabledIds: string[];
  targetState: TargetState;
  verdict: Verdict | null;
  appliedAt: number | null;
  errors: ToggleError[];
  manual: boolean;
  /**
   * What happened when the session tried to reload the test tab for this batch. `closed`
   * and `unsettled` are hints the panel turns into a rebind prompt and a manual-reload
   * hint; neither ever withholds the verdict.
   */
  testTab: TestTabOutcome | null;
}

export type TestTabStatus = 'reloaded' | 'unsettled' | 'closed' | 'unbound';

export interface TestTabOutcome {
  status: TestTabStatus;
  tabId: number | null;
}

export interface SessionProgress {
  trialNumber: number;
  estimatedTrials: number;
  suspectCount: number;
}

export type AbortReason = 'host-issue';

/**
 * What the last `session-reset` recorded. It is kept on the session view so the restored
 * screen can still say honestly what is left over after a panel reload: the `session-reset`
 * event is the audit record, and `accepted` distinguishes "the state matches" from "the
 * user decided the remaining differences are fine" (SPEC §Restore).
 */
export interface SessionRestore {
  restored: boolean;
  errors: RestoreError[];
  manualIds: string[];
  accepted: boolean;
}

export interface SessionView {
  sessionId: string;
  status: SessionStatus;
  capability: CapabilityReport;
  baselineMode: BaselineMode;
  candidateOrder: CandidateExtension[];
  originalEnabledIds: string[];
  suspects: string[];
  cleared: string[];
  currentTrial: Trial | null;
  trials: Trial[];
  culpritId: string | null;
  ambiguityIds: string[];
  abortReason: AbortReason | null;
  testTab: TestTabBinding | null;
  progress: SessionProgress | null;
  /**
   * The batch the user still has to apply by hand, or `null` when nothing is
   * pending. The reducer derives it from the applied `trial-applied` event, so a
   * closed and reopened panel shows the same checklist.
   */
  manualBatch: ManualBatch | null;
  /**
   * The pause the session is sitting in, with the drift it saw. Derived from the
   * `session-paused` event, so a reopened panel can still show expected vs actual.
   */
  pause: SessionPause | null;
  /**
   * Extensions the browser installed, updated, or removed under this session. The
   * snapshot is never rewritten: this is a report about it, so the search keeps the
   * candidate order it started with and the panel can warn about the difference.
   */
  changes: SnapshotChange[];
  /**
   * What the last `session-reset` said, or `null` while no restore was recorded. The
   * restored screen reads it so an incomplete assisted restore is never rendered as a
   * success, and so a panel that reopened after the restore still shows what is left
   * over instead of an empty summary.
   */
  restore: SessionRestore | null;
  /**
   * True while no `session-reset` is recorded and the session touched something, so
   * candidates may still be disabled. Starting a new session is refused until this is
   * false: replacing the log would otherwise strand the browser in a reduced state.
   */
  restorePending: boolean;
  createdAt: number;
  updatedAt: number;
}

export type StartupOffer = 'resume' | 'restore';

/**
 * What a browser restart left behind: the log's own view of the session, the state the
 * browser actually came back in, and the two actions the panel may offer. Deriving it
 * never writes and never toggles, because a reconcile that moved extensions on its own
 * would be a second writer of the browser state.
 */
export interface StartupReconciliation {
  sessionId: string;
  status: SessionStatus;
  /** True when the background recorded a browser start that this log has not moved past. */
  restarted: boolean;
  /** The actions to offer, `resume` before `restore`. Empty means nothing needs attention. */
  offers: StartupOffer[];
  /** True while the log's session still has steps left. */
  inFlight: boolean;
  /** True when no `session-reset` was recorded, so touched candidates may still be off. */
  restorePending: boolean;
  /** How many candidates the session touched, which is what Restore would re-enable. */
  touchedCount: number;
  /** What the browser reports versus the state the log last asked for. */
  drift: DriftReport | null;
}

export interface BatchDifference {
  round: number;
  recordedEnabledIds: string[];
  recordedDisabledIds: string[];
  recomputedEnabledIds: string[];
  recomputedDisabledIds: string[];
}

export interface ReplayValidationError {
  eventIndex: number;
  eventType: BisectEventType | null;
  message: string;
}

export interface ReplayResult {
  culpritId: string | null;
  ambiguityIds: string[];
  trials: Trial[];
  batchDifferences: BatchDifference[];
  validationError: ReplayValidationError | null;
}

export interface ManagementPort {
  getCapabilities(): Promise<CapabilityReport>;
  listCandidates(): Promise<CandidateLists>;
  /**
   * Every installed extension as the browser reports it, unfiltered. The snapshot diff
   * needs the raw list because the session's own toggles make candidates ineligible and
   * because a mid-session install is exactly what `listCandidates` leaves out.
   */
  listInstalled(): Promise<InstalledExtension[]>;
  applyTargetState(target: TargetState): Promise<ToggleResult | ManualBatch>;
  verifyState(expected: TargetState): Promise<DriftReport>;
  restore(original: EnabledStateMap): Promise<RestoreResult>;
  watchEvents(listener: (event: ManagementEvent) => void): () => void;
}
