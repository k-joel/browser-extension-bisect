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

export interface ManualBatch {
  enableIds: string[];
  disableIds: string[];
}

export interface DriftReport {
  expected: EnabledStateMap;
  actual: EnabledStateMap;
  pendingManualToggles: string[];
  unexpectedToggles: string[];
  missingIds: string[];
  inSync: boolean;
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
  'trial-started': { round: number; enabledIds: string[]; disabledIds: string[] };
  'trial-applied': { round: number; errors: ToggleError[] };
  'verdict-recorded': { round: number; verdict: Verdict };
  'trial-retried': { round: number; reason?: string };
  'verdict-undone': { round: number };
  'session-paused': { reason: string; drift?: DriftReport };
  'session-resumed': { reason: string };
  'session-completed': { culpritId: string };
  'session-inconclusive': { ambiguityIds: string[]; reason: string };
  'session-reset': { restored: boolean; errors: RestoreError[] };
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
}

export interface SessionProgress {
  trialNumber: number;
  estimatedTrials: number;
  suspectCount: number;
}

export interface SessionView {
  sessionId: string;
  status: SessionStatus;
  capability: CapabilityReport;
  candidateOrder: CandidateExtension[];
  originalEnabledIds: string[];
  suspects: string[];
  cleared: string[];
  currentTrial: Trial | null;
  trials: Trial[];
  culpritId: string | null;
  ambiguityIds: string[];
  testTab: TestTabBinding | null;
  progress: SessionProgress | null;
  createdAt: number;
  updatedAt: number;
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
  applyTargetState(target: TargetState): Promise<ToggleResult>;
  verifyState(expected: TargetState): Promise<DriftReport>;
  restore(original: EnabledStateMap): Promise<RestoreResult>;
  watchEvents(listener: (event: ManagementEvent) => void): () => void;
}
