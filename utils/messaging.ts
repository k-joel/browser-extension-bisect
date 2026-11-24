import { defineExtensionMessaging } from '@webext-core/messaging';
import type {
  BisectConfig,
  CandidateLists,
  CapabilityReport,
  RestoreError,
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
  restore: { restored: boolean; errors: RestoreError[] } | null;
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
  startSession(request: StartSessionRequest): SessionView;
  applyTrial(): SessionView;
  submitVerdict(payload: { verdict: Verdict }): SessionMutationResult;
  retryTrial(payload: { reason?: string }): SessionMutationResult;
  resetSession(payload: { restore: boolean }): SessionMutationResult;
  bindTestTab(payload: BindTestTabRequest): BisectConfig;
  reloadTestTab(): ReloadTestTabResult;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
