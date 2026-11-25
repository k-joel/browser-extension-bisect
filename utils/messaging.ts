import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  BisectConfig,
  BisectLog,
  CandidateLists,
  CapabilityReport,
  DriftReport,
  ReplayResult,
  RestoreError,
  RestoreResult,
  SessionView,
  Verdict,
} from './bisect/domain';
import type { ReloadTestTabResult, StartSessionRequest } from './bisect/session';
import type { BisectSettings } from './storage';

export interface ExtensionState {
  enabled: boolean;
  interactionCount: number;
  settings: BisectSettings;
}

export interface ContentStatus {
  active: boolean;
  marker: string | null;
}

/**
 * `bindTestTab` carries only the id when the caller already knows it; the
 * background resolves the active tab otherwise. The URL is never sent from the
 * panel because the `tabs` permission is off, so the browser never exposes it.
 */
export interface BindTestTabRequest {
  tabId?: number;
}

/**
 * A mutating session command reports the derived view plus the outcome of the
 * `session-reset` event that the command appended, if it appended one.
 * `SessionView` carries no restore errors, so without this the panel could not
 * distinguish a complete restore from a partial one.
 */
export interface SessionMutationResult {
  session: SessionView;
  restore: { restored: boolean; errors: RestoreError[]; manualIds: string[] } | null;
}

/**
 * The assisted baseline needs `about:addons`, which the panel cannot construct a
 * privileged URL for on its own. A failed open returns the manual instruction and
 * the list of extensions the user has to toggle, for a copyable fallback.
 */
export interface AddonManagerResult {
  opened: boolean;
  error?: string;
}

export interface ProtocolMap {
  getState(): ExtensionState;
  updateState(changes: Partial<BisectSettings> & { enabled?: boolean }): ExtensionState;
  recordInteraction(): ExtensionState;
  getContentStatus(targetTabId?: number): ContentStatus;
  getContentMarker(): string | null;
  getTabId(): number | null;
  getCapabilities(): CapabilityReport;
  listCandidates(): CandidateLists;
  getConfig(): BisectConfig;
  updateConfig(changes: Partial<BisectConfig>): BisectConfig;
  getSession(): SessionView | null;
  /** The persisted bisect log, or `null` when nothing has been recorded yet. */
  getLog(): BisectLog | null;
  /**
   * Recomputes a corrected copy of the log. It is diagnostic: the background writes
   * nothing, so the live log stays append-only and unchanged.
   */
  replayLog(payload: { log: BisectLog }): ReplayResult;
  startSession(request: StartSessionRequest): SessionView;
  applyTrial(): SessionView;
  submitVerdict(payload: { verdict: Verdict }): SessionMutationResult;
  retryTrial(payload: { reason?: string }): SessionMutationResult;
  resetSession(payload: { restore: boolean }): SessionMutationResult;
  bindTestTab(payload: BindTestTabRequest): BisectConfig;
  reloadTestTab(): ReloadTestTabResult;
  getDrift(): DriftReport;
  confirmManualState(): SessionView;
  recordExternalBaseline(): SessionView;
  verifyRestore(): RestoreResult;
  acceptRestore(): SessionView;
  openAddonManager(): AddonManagerResult;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
