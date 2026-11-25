import { storage } from 'wxt/utils/storage';
import type { DriftReport } from './domain';

/**
 * The refreshed assisted-mode drift, published after the debounced re-verify that
 * `management` `onEnabled`/`onDisabled` trigger.
 *
 * It is a *report*, not state: the enabled map comes from `management.getAll()` and the
 * expected map from the log's own current trial, so nothing here can be authoritative
 * about either. The background is its only writer, and the panel watches it exactly the
 * way it watches the log, which is how a user's own toggles move the progress counter
 * without a button press (SPEC §Management port, user story 30).
 */
export const MANUAL_STATE_KEY = 'local:bisectManualState' as const;

export interface ManualStateReport {
  sessionId: string;
  /** The trial round the drift was computed for, so a stale report cannot be adopted. */
  round: number;
  drift: DriftReport;
  /** When the re-verify ran, which is what makes the report's age visible. */
  at: number;
}

export const manualStateItem = storage.defineItem<ManualStateReport | null>(MANUAL_STATE_KEY, {
  fallback: null,
});

function isDrift(value: unknown): value is DriftReport {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DriftReport>;
  return (
    typeof candidate.expected === 'object' &&
    typeof candidate.actual === 'object' &&
    Array.isArray(candidate.pendingManualToggles) &&
    Array.isArray(candidate.unexpectedToggles) &&
    Array.isArray(candidate.missingIds) &&
    typeof candidate.inSync === 'boolean'
  );
}

export function normalizeManualState(value: unknown): ManualStateReport | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<ManualStateReport>;
  if (typeof candidate.sessionId !== 'string' || candidate.sessionId.length === 0) return null;
  if (typeof candidate.round !== 'number' || !Number.isInteger(candidate.round)) return null;
  if (!isDrift(candidate.drift)) return null;
  return {
    sessionId: candidate.sessionId,
    round: candidate.round,
    drift: candidate.drift,
    at: typeof candidate.at === 'number' ? candidate.at : 0,
  };
}

export async function readManualState(): Promise<ManualStateReport | null> {
  return normalizeManualState(await manualStateItem.getValue());
}

export async function writeManualState(report: ManualStateReport): Promise<void> {
  await manualStateItem.setValue(report);
}

export async function clearManualState(): Promise<void> {
  await manualStateItem.setValue(null);
}

/**
 * The panel's convergence seam for assisted progress, beside `watchBisectLog`: the
 * background publishes, every open panel refreshes, and no panel has to poll.
 */
export function watchManualState(listener: (report: ManualStateReport | null) => void): () => void {
  return manualStateItem.watch((value) => listener(normalizeManualState(value)));
}
