import { readBisectConfig, updateBisectConfig } from './config';
import type {
  BaselineMode,
  BisectConfig,
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  DriftReport,
  EnabledStateMap,
  ManagementPort,
  ManualBatch,
  RestoreResult,
  SessionView,
  TargetState,
  TestTabBinding,
  Verdict,
} from './domain';
import { type AnsweredTrial, buildTargetState, partitionSuspects, undoEligibilityOf } from './engine';
import { appendEvent, BisectLogWriteError, createEmptyLog, readBisectLog, reduceLog, writeBisectLog } from './events';
import { isManualBatch } from './management-port';

export const TEST_TAB_SETTLE_TIMEOUT_MS = 15_000;

export interface TestTabSurface {
  reload(tabId: number): Promise<void>;
  waitForComplete(tabId: number): Promise<boolean>;
}

export interface SessionDependencies {
  port: ManagementPort;
  tabs: TestTabSurface;
  now?: () => number;
  newSessionId?: () => string;
}

export interface StartSessionRequest {
  candidateIds: string[];
  baselineMode: BaselineMode;
  testTab: TestTabBinding | null;
}

export type ReloadTestTabResult = { ok: boolean; error?: string };

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

type ResolvedDependencies = SessionDependencies & { now: () => number; newSessionId: () => string };

let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

export function resetSessionQueue(): void {
  queue = Promise.resolve();
}

function defaultSessionId(): string {
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveDependencies(dependencies: SessionDependencies): ResolvedDependencies {
  return {
    ...dependencies,
    now: dependencies.now ?? Date.now,
    newSessionId: dependencies.newSessionId ?? defaultSessionId,
  };
}

function makeEvent<Type extends BisectEventType>(
  type: Type,
  at: number,
  payload: BisectEventPayloads[Type],
): BisectEvent {
  return { type, at, schemaVersion: 1, payload } as BisectEvent;
}

async function requireLog(): Promise<BisectLog> {
  const log = await readBisectLog();
  if (log === null) throw new SessionError('No active session');
  return log;
}

async function appendAndPersist(
  log: BisectLog,
  type: BisectEventType,
  at: number,
  payload: BisectEventPayloads[BisectEventType],
): Promise<BisectLog> {
  const next = appendEvent(log, makeEvent(type, at, payload as never));
  await writeBisectLog(next);
  return next;
}

function viewOf(log: BisectLog): SessionView {
  const view = reduceLog(log);
  if (view === null) throw new SessionError('No active session');
  return view;
}

function touchedIdsOf(view: SessionView): string[] {
  const touched = new Set<string>();
  for (const trial of view.trials) {
    for (const id of trial.enabledIds) touched.add(id);
    for (const id of trial.disabledIds) touched.add(id);
  }
  return [...touched];
}

function touchedOriginalMap(view: SessionView): EnabledStateMap {
  const touched = new Set(touchedIdsOf(view));
  const map: EnabledStateMap = {};
  for (const id of view.originalEnabledIds) {
    if (touched.has(id)) map[id] = true;
  }
  return map;
}

function selectCandidates(all: CandidateExtension[], requested: readonly string[]): CandidateExtension[] {
  const wanted = new Set(requested);
  return all.filter((candidate) => wanted.has(candidate.id));
}

function allOffTarget(candidates: CandidateExtension[]): TargetState {
  return { enabled: [], disabled: candidates.map((candidate) => candidate.id), allOutsideSuspectsEnabled: true };
}

function answeredTrialOf(view: SessionView): AnsweredTrial | null {
  const trial = view.currentTrial;
  if (trial === null || trial.verdict === null) return null;
  return { enabledIds: trial.enabledIds, disabledIds: trial.disabledIds, verdict: trial.verdict };
}

/**
 * The target state the next trial must apply, derived from the suspect pool the
 * reducer already narrowed to. Cleared candidates stay enabled.
 */
export function nextTrialTarget(view: SessionView): TargetState {
  return buildTargetState(partitionSuspects(view.suspects), view.cleared);
}

export { partitionSuspects };

/**
 * The assisted adapter's `ManualBatch` is only the residual diff against the current
 * state, which is empty for the half of the pool that is already off. The session
 * records the whole target instead, so the checklist and the "n of m matched"
 * progress cover every candidate the trial cares about — including the cleared ones
 * that must stay enabled.
 */
function targetBatchOf(target: TargetState): ManualBatch {
  return { enableIds: [...target.enabled], disableIds: [...target.disabled] };
}

async function applyAndRecord(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  target: TargetState,
  round: number,
): Promise<BisectLog> {
  const started = await appendAndPersist(log, 'trial-started', dependencies.now(), {
    round,
    enabledIds: target.enabled,
    disabledIds: target.disabled,
  });
  const result = await dependencies.port.applyTargetState(target);
  if (isManualBatch(result)) {
    return appendAndPersist(started, 'trial-applied', dependencies.now(), {
      round,
      errors: [],
      manual: true,
      manualBatch: targetBatchOf(target),
    });
  }
  return appendAndPersist(started, 'trial-applied', dependencies.now(), { round, errors: result.errors });
}

async function reloadAndSettle(dependencies: ResolvedDependencies, tab: TestTabBinding | null): Promise<boolean> {
  if (tab === null) return false;
  try {
    await dependencies.tabs.reload(tab.tabId);
  } catch {
    return false;
  }
  return dependencies.tabs.waitForComplete(tab.tabId);
}

async function restoreTouched(dependencies: ResolvedDependencies, view: SessionView): Promise<RestoreResult> {
  return dependencies.port.restore(touchedOriginalMap(view));
}

function isBaselineQuestion(view: SessionView): boolean {
  return view.status === 'awaiting-verdict' && view.currentTrial?.round === 0 && view.currentTrial.verdict === null;
}

/**
 * Both writers pause through here, so the reason vocabulary and the rule that a pause
 * always carries the drift it saw stay in one place.
 */
export async function pauseForDrift(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  drift: DriftReport,
): Promise<BisectLog> {
  return appendAndPersist(log, 'session-paused', dependencies.now(), { reason: 'drift', drift });
}

/**
 * `verifyState` proves the browser state the session is about to build on. Without this
 * the trial would partition a state that no longer exists, and the verdict would answer
 * a question nobody asked.
 */
async function guardAgainstDrift(dependencies: ResolvedDependencies, log: BisectLog, view: SessionView): Promise<void> {
  const trial = view.currentTrial;
  if (trial === null) return;

  const drift = await dependencies.port.verifyState(trial.targetState);
  if (drift.inSync) return;

  await pauseForDrift(dependencies, log, drift);
  throw new SessionError(describeDrift(drift));
}

/**
 * Assisted mode parks the session in `awaiting-manual-toggle` until the user's own
 * toggles match the batch. The reducer cannot know when that happened, so accepting
 * the batch is an explicit command that first proves the state with `verifyState`.
 */
export function verifyManualState(rawDependencies: SessionDependencies): Promise<DriftReport> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const view = viewOf(await requireLog());
    const trial = view.currentTrial;
    if (trial === null) throw new SessionError('No trial is open to verify');
    return dependencies.port.verifyState(trial.targetState);
  });
}

export function confirmManualState(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const trial = view.currentTrial;
    if (trial === null || !trial.manual) throw new SessionError('No manual batch is waiting to be confirmed');
    if (view.status !== 'awaiting-manual-toggle') {
      throw new SessionError(`Cannot confirm a manual batch while the session is ${view.status}`);
    }

    const drift = await dependencies.port.verifyState(trial.targetState);
    if (!drift.inSync) {
      throw new SessionError(describeDrift(drift));
    }
    return viewOf(await appendAndPersist(log, 'session-resumed', dependencies.now(), { reason: 'manual-verified' }));
  });
}

function describeDrift(drift: DriftReport): string {
  const parts: string[] = [];
  if (drift.pendingManualToggles.length > 0) {
    parts.push(`${drift.pendingManualToggles.length} still to toggle`);
  }
  if (drift.unexpectedToggles.length > 0) parts.push(`${drift.unexpectedToggles.length} toggled unexpectedly`);
  if (drift.missingIds.length > 0) parts.push(`${drift.missingIds.length} no longer installed`);
  return `The browser state does not match this batch yet: ${parts.join(', ')}.`;
}

/**
 * The external baseline attests the symptom is gone with every extension off, in
 * Troubleshoot Mode, where this add-on cannot see anything. The baseline is a
 * recorded human attestation; the full-enabled state it proceeds from is applied
 * by the caller with the ordinary (assisted) batch.
 */
export function recordExternalBaseline(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const baselineOpen = view.status === 'baseline' || view.status === 'awaiting-manual-toggle';
    const trialNotStarted = view.currentTrial === null || view.currentTrial.round === 0;
    if (!baselineOpen || !trialNotStarted) {
      throw new SessionError(`Cannot record an external baseline while the session is ${view.status}`);
    }

    const recorded = await appendAndPersist(log, 'baseline-recorded', dependencies.now(), {
      mode: 'external',
      verdict: 'gone',
    });
    return viewOf(await settleOutcome(dependencies, recorded));
  });
}

/**
 * Re-runs the restore diff without appending an audit event, so the panel can show
 * which candidates still have to be re-enabled by hand and can confirm that the
 * user finished the checklist.
 */
export function verifyRestore(rawDependencies: SessionDependencies): Promise<RestoreResult> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const view = viewOf(await requireLog());
    return dependencies.port.restore(touchedOriginalMap(view));
  });
}

/**
 * Assisted restore cannot finish on its own: a candidate may be gone, and the user
 * may legitimately decide that what is left is fine. The explicit accept records the
 * remaining differences and the outstanding errors, and never upgrades them to a
 * complete restore — `restored` stays false so the audit stays honest.
 */
export function acceptRestore(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const result = await dependencies.port.restore(touchedOriginalMap(view));

    return viewOf(
      await appendAndPersist(log, 'session-reset', dependencies.now(), {
        restored: result.complete,
        errors: result.errors,
        manualIds: result.manualIds,
        accepted: true,
      }),
    );
  });
}

export interface ManualStateWatcherOptions {
  dependencies: SessionDependencies;
  /** Coalesces a burst of `onEnabled`/`onDisabled` events into one re-verify. */
  debounceMs?: number;
  onDrift(drift: DriftReport): void;
}

export const MANUAL_STATE_DEBOUNCE_MS = 150;

/**
 * `management` fires one event per toggle, and the user flips several extensions in
 * a row. Debouncing keeps the panel from re-reading `getAll()` once per extension,
 * and the drift the watcher reports is the same one Verify checks, so the progress
 * counter and the gate cannot disagree.
 */
export function createManualStateWatcher({
  dependencies,
  debounceMs = MANUAL_STATE_DEBOUNCE_MS,
  onDrift,
}: ManualStateWatcherOptions): () => void {
  const resolved = resolveDependencies(dependencies);
  let timer: ReturnType<typeof setTimeout> | null = null;

  const reverify = async (): Promise<void> => {
    timer = null;
    try {
      const view = viewOf(await requireLog());
      const trial = view.currentTrial;
      if (trial === null || view.status !== 'awaiting-manual-toggle') return;
      onDrift(await resolved.port.verifyState(trial.targetState));
    } catch {
      // A closed session or an unreadable log simply stops the watcher's work.
    }
  };

  const schedule = (): void => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => void reverify(), debounceMs);
  };

  const unsubscribe = resolved.port.watchEvents((event) => {
    if (event.type === 'enabled' || event.type === 'disabled') schedule();
  });

  return () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    unsubscribe();
  };
}

export function startSession(rawDependencies: SessionDependencies, request: StartSessionRequest): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const [lists, capability] = await Promise.all([
      dependencies.port.listCandidates(),
      dependencies.port.getCapabilities(),
    ]);
    const candidates = selectCandidates(lists.eligible, request.candidateIds);
    if (candidates.length === 0) {
      throw new SessionError('No eligible enabled extensions.');
    }

    const log = appendEvent(
      createEmptyLog(dependencies.newSessionId()),
      makeEvent('session-started', dependencies.now(), {
        candidateOrder: candidates,
        capability,
        baselineMode: request.baselineMode,
        testTab: request.testTab,
      }),
    );
    await writeBisectLog(log);

    // The external baseline is verified in Troubleshoot Mode, where this add-on is
    // itself disabled. Nothing is toggled: the attestation is the baseline, and the
    // search resumes from the full-enabled state the browser comes back in.
    if (request.baselineMode === 'external') return viewOf(log);

    const applied = await applyAndRecord(dependencies, log, allOffTarget(candidates), 0);
    const view = viewOf(applied);
    if (view.status !== 'awaiting-manual-toggle') await reloadAndSettle(dependencies, request.testTab);

    const failures = view.currentTrial?.errors ?? [];
    if (failures.length === 0) return view;

    const restored = await restoreTouched(dependencies, view);
    return viewOf(
      await appendAndPersist(applied, 'session-reset', dependencies.now(), {
        restored: restored.complete,
        errors: restored.errors,
        manualIds: restored.manualIds,
      }),
    );
  });
}

export function getSession(): Promise<SessionView | null> {
  return serialize(async () => reduceLog(await readBisectLog()));
}

/**
 * A read of the persisted log for the history screen and the two copy actions. It
 * enters the same queue as the mutating commands so a copy taken while a verdict is
 * being recorded observes either the old log or the new one, never a torn read.
 */
export function getLog(): Promise<BisectLog | null> {
  return serialize(() => readBisectLog());
}

function assertTrialAppliable(status: SessionView['status']): void {
  if (status === 'completed' || status === 'inconclusive' || status === 'aborted' || status === 'restored') {
    throw new SessionError(`Cannot apply a trial while the session is ${status}`);
  }
  if (status !== 'awaiting-verdict' && status !== 'baseline' && status !== 'trial') {
    throw new SessionError(`Cannot apply a trial while the session is ${status}`);
  }
}

function nextRoundFor(view: SessionView): number {
  const rounds = view.trials.map((trial) => trial.round);
  return rounds.length === 0 ? 1 : Math.max(...rounds) + 1;
}

export function applyTrial(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    assertTrialAppliable(view.status);
    await guardAgainstDrift(dependencies, log, view);

    const applied = await applyAndRecord(dependencies, log, nextTrialTarget(view), nextRoundFor(view));
    const next = viewOf(applied);
    if (next.status !== 'awaiting-manual-toggle') await reloadAndSettle(dependencies, next.testTab);
    return next;
  });
}

/**
 * Re-sync puts the expected state back and closes the pause. An assisted batch cannot
 * be applied by the add-on, so the re-applied target is recorded as a fresh
 * `trial-applied` for the same round and the session parks on the checklist again.
 */
export function resyncSession(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const trial = view.currentTrial;

    if (view.status !== 'paused') {
      throw new SessionError(`Cannot re-sync while the session is ${view.status}`);
    }
    if (trial === null) throw new SessionError('No trial is open to re-sync');

    const result = await dependencies.port.applyTargetState(trial.targetState);
    const resumed = await appendAndPersist(log, 'session-resumed', dependencies.now(), { reason: 're-synced' });
    if (isManualBatch(result)) {
      return viewOf(
        await appendAndPersist(resumed, 'trial-applied', dependencies.now(), {
          round: trial.round,
          errors: [],
          manual: true,
          manualBatch: targetBatchOf(trial.targetState),
        }),
      );
    }

    const next = viewOf(resumed);
    await reloadAndSettle(dependencies, next.testTab);
    return next;
  });
}

/**
 * Live undo reopens the most recent trial. The batch on screen is that trial's own
 * target, so re-applying it is the unambiguous way back; a drifted browser would make
 * the reopened round answer a different question, hence the verify first.
 */
export function undoLastVerdict(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const eligibility = undoEligibilityOf(view);
    const trial = view.currentTrial;

    if (!eligibility.eligible || trial === null) {
      throw new SessionError(eligibility.reason ?? 'The last verdict cannot be undone.');
    }

    const drift = await dependencies.port.verifyState(trial.targetState);
    if (!drift.inSync) {
      await pauseForDrift(dependencies, log, drift);
      throw new SessionError(describeDrift(drift));
    }

    const undone = await appendAndPersist(log, 'verdict-undone', dependencies.now(), { round: trial.round });
    const result = await dependencies.port.applyTargetState(trial.targetState);
    if (isManualBatch(result)) {
      return viewOf(
        await appendAndPersist(undone, 'trial-applied', dependencies.now(), {
          round: trial.round,
          errors: [],
          manual: true,
          manualBatch: targetBatchOf(trial.targetState),
        }),
      );
    }

    const next = viewOf(undone);
    await reloadAndSettle(dependencies, next.testTab);
    return next;
  });
}

/**
 * Re-applies the current trial's target state without recording a verdict: the
 * log gains `trial-retried` and a fresh `trial-applied` for the same round, so the
 * round number and the suspect pool are unchanged.
 */
export function retryTrial(
  rawDependencies: SessionDependencies,
  payload: { reason?: string } = {},
): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const trial = view.currentTrial;

    if (trial === null || trial.round === 0) {
      throw new SessionError('No partition trial is open to retry');
    }

    const retried = await appendAndPersist(log, 'trial-retried', dependencies.now(), {
      round: trial.round,
      ...(payload.reason === undefined ? {} : { reason: payload.reason }),
    });
    const result = await dependencies.port.applyTargetState(trial.targetState);
    const reapplied = isManualBatch(result)
      ? await appendAndPersist(retried, 'trial-applied', dependencies.now(), {
          round: trial.round,
          errors: [],
          manual: true,
          manualBatch: targetBatchOf(trial.targetState),
        })
      : await appendAndPersist(retried, 'trial-applied', dependencies.now(), {
          round: trial.round,
          errors: result.errors,
        });
    if (isManualBatch(result)) return viewOf(reapplied);

    await reloadAndSettle(dependencies, view.testTab);
    return viewOf(reapplied);
  });
}

/**
 * Appends the terminal audit event once the reducer has reached a terminal
 * outcome, so the log names the culprit or the ambiguity set explicitly instead
 * of only implying it from the last verdict.
 */
async function settleOutcome(dependencies: ResolvedDependencies, log: BisectLog): Promise<BisectLog> {
  const view = viewOf(log);
  const hasTerminalEvent = log.events.some(
    (event) => event.type === 'session-completed' || event.type === 'session-inconclusive',
  );
  if (hasTerminalEvent) return log;

  if (view.status === 'completed' && view.culpritId !== null) {
    return appendAndPersist(log, 'session-completed', dependencies.now(), { culpritId: view.culpritId });
  }
  if (view.status === 'inconclusive') {
    return appendAndPersist(log, 'session-inconclusive', dependencies.now(), {
      ambiguityIds: view.ambiguityIds,
      reason: explanationOf(view, log),
    });
  }
  return log;
}

function explanationOf(view: SessionView, log: BisectLog): string {
  const answered = answeredTrialOf(view);
  const lastEvent = log.events.at(-1);
  if (answered !== null && answered.disabledIds.length === 1 && answered.verdict === 'persists') {
    return 'final-confirmation-persists';
  }
  if (lastEvent?.type === 'verdict-recorded' && lastEvent.payload.verdict === 'persists') {
    return 'final-confirmation-persists';
  }
  return 'verdict-contradiction';
}

export function submitVerdict(
  rawDependencies: SessionDependencies,
  payload: { verdict: Verdict },
): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);

    if (isBaselineQuestion(view)) {
      await guardAgainstDrift(dependencies, log, view);
      const recorded = await appendAndPersist(log, 'baseline-recorded', dependencies.now(), {
        mode: view.baselineMode,
        verdict: payload.verdict,
      });
      if (payload.verdict === 'gone') return viewOf(await settleOutcome(dependencies, recorded));

      const restored = await restoreTouched(dependencies, view);
      return viewOf(
        await appendAndPersist(recorded, 'session-reset', dependencies.now(), {
          restored: restored.complete,
          errors: restored.errors,
          manualIds: restored.manualIds,
        }),
      );
    }

    const pending = view.currentTrial;
    if (view.status !== 'awaiting-verdict' || pending === null || pending.verdict !== null) {
      throw new SessionError('No verdict is pending');
    }

    await guardAgainstDrift(dependencies, log, view);

    const recorded = await appendAndPersist(log, 'verdict-recorded', dependencies.now(), {
      round: pending.round,
      verdict: payload.verdict,
    });
    return viewOf(await settleOutcome(dependencies, recorded));
  });
}

export function resetSession(
  rawDependencies: SessionDependencies,
  payload: { restore: boolean },
): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const result: RestoreResult = payload.restore
      ? await restoreTouched(dependencies, view)
      : { restoredIds: [], manualIds: [], errors: [], complete: true };

    return viewOf(
      await appendAndPersist(log, 'session-reset', dependencies.now(), {
        restored: result.complete,
        errors: result.errors,
        manualIds: result.manualIds,
      }),
    );
  });
}

export function bindTestTab(_dependencies: SessionDependencies, payload: TestTabBinding): Promise<BisectConfig> {
  return serialize(async () => updateBisectConfig({ testTab: { tabId: payload.tabId, url: payload.url } }));
}

export function reloadTestTab(rawDependencies: SessionDependencies): Promise<ReloadTestTabResult> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const config = await readBisectConfig();
    if (config.testTab === null) {
      return { ok: false, error: 'No test tab is bound; bind one before reloading.' };
    }
    try {
      await dependencies.tabs.reload(config.testTab.tabId);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
    await dependencies.tabs.waitForComplete(config.testTab.tabId);
    return { ok: true };
  });
}

export { BisectLogWriteError };
