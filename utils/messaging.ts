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
  StartupReconciliation,
  Verdict,
} from './bisect/domain';
import type { ReloadTestTabResult, StartSessionRequest } from './bisect/session';

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
  restore: { restored: boolean; errors: RestoreError[]; manualIds: string[]; declined: boolean } | null;
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
  getCapabilities(): CapabilityReport;
  listCandidates(): CandidateLists;
  getConfig(): BisectConfig;
  updateConfig(changes: Partial<BisectConfig>): BisectConfig;
  getSession(): SessionView | null;
  /**
   * What a browser restart left to decide, or `null` when there is nothing to offer.
   * Deriving it writes nothing and toggles nothing.
   */
  getStartupReconciliation(): StartupReconciliation | null;
  /** The explicit Resume: re-applies the state the log expects and records the resumption. */
  resumeSession(): SessionMutationResult;
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
  /**
   * Re-applies the paused trial's expected state and closes the pause; the log gains
   * `session-resumed`.
   */
  resyncSession(): SessionMutationResult;
  /**
   * Reopens the most recent trial. Refused when the state drifted or the verdict is no
   * longer the last step; `session-paused` is appended in the drift case.
   */
  undoLastVerdict(): SessionMutationResult;
  resetSession(payload: { restore: boolean }): SessionMutationResult;
  /**
   * SPEC §Error handling, `User aborts`. The panel asks "Restore all extensions?" first;
   * `restore: true` runs the restore, `restore: false` leaves the touched extensions as
   * the session left them and records the decision on the `session-reset`.
   */
  abortSession(payload: { restore: boolean }): SessionMutationResult;
  bindTestTab(payload: BindTestTabRequest): BisectConfig;
  reloadTestTab(): ReloadTestTabResult;
  getDrift(): DriftReport;
  /**
   * Records the outcome of the `setEnabled` the side panel made itself. User activation
   * does not cross a runtime message, so the panel owns that call and the background only
   * writes the result: success resumes the paused session, failure re-pauses it.
   */
  recordEscalationResult(payload: { extensionId: string; ok: boolean; error?: string }): SessionMutationResult;
  /** Ends the session and restores the touched candidates after a declined escalation. */
  declineEscalation(): SessionMutationResult;
  /**
   * Restores the current session and starts a fresh one from the browser as it is now.
   * It is the only command allowed to see a mid-session install or update as a candidate.
   */
  restartSession(): SessionMutationResult;
  /**
   * Replaces a terminal session's log with an empty one, which is the only route from a
   * finished session back to the picker. Refused for a live session and refused while a
   * restore is still pending.
   */
  startNewSession(): SessionView | null;
  confirmManualState(): SessionView;
  recordExternalBaseline(): SessionView;
  verifyRestore(): RestoreResult;
  acceptRestore(): SessionView;
  openAddonManager(): AddonManagerResult;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
