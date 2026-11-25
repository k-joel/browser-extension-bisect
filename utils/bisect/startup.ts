import { storage } from 'wxt/utils/storage';

/**
 * The durable trace of "this browser just started with a session on disk". The
 * background writes it from `runtime.onStartup`; the panel reads it once.
 *
 * The signal carries the event count it was raised at, so a session that moved on
 * consumes the offer by itself: no caller has to remember to clear it, and a resumed
 * session can never re-interrupt the user with a stale restart.
 */
export const STARTUP_SIGNAL_KEY = 'local:bisectStartupSignal' as const;

export interface StartupSignal {
  /** The session the log held when the browser started. */
  sessionId: string | null;
  /** `log.events.length` at that moment. */
  eventCount: number;
}

export const startupSignalItem = storage.defineItem<StartupSignal | null>(STARTUP_SIGNAL_KEY, {
  fallback: null,
});

function isSignal(value: unknown): value is StartupSignal {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<StartupSignal>;
  const idIsValid = candidate.sessionId === null || typeof candidate.sessionId === 'string';
  return idIsValid && typeof candidate.eventCount === 'number' && Number.isInteger(candidate.eventCount);
}

export async function readStartupSignal(): Promise<StartupSignal | null> {
  const value = await startupSignalItem.getValue();
  return isSignal(value) ? value : null;
}

export async function raiseStartupSignal(signal: StartupSignal): Promise<void> {
  await startupSignalItem.setValue(signal);
}

/**
 * True when the recorded start still applies to this log: the same session, and not a
 * single event appended since. Both halves matter — a restart followed by a resumed
 * session is no longer a restart to announce.
 */
export function signalMatches(signal: StartupSignal | null, sessionId: string, eventCount: number): boolean {
  if (signal === null) return false;
  return signal.sessionId === sessionId && signal.eventCount === eventCount;
}
