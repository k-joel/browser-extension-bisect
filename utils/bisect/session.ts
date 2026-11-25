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
  SnapshotChange,
  TargetState,
  TestTabBinding,
  TestTabOutcome,
  ToggleError,
  ToggleResult,
  Verdict,
} from './domain';
import { type AnsweredTrial, buildTargetState, partitionSuspects, undoEligibilityOf } from './engine';
import { appendEvent, BisectLogWriteError, createEmptyLog, readBisectLog, reduceLog, writeBisectLog } from './events';
import { isManualBatch, mapToggleError, rollbackTarget } from './management-port';
import { describeSnapshotChanges, pausingChanges, snapshotChanges } from './snapshot';

export const TEST_TAB_SETTLE_TIMEOUT_MS = 15_000;

/** The `session-paused` reason an aborted batch records. */
export const TOGGLE_FAILED_REASON = 'toggle-failed';

/** The `session-paused` reason a side-panel escalation that failed records. */
export const ESCALATION_FAILED_REASON = 'escalation-failed';

/** The `session-paused` reason a candidate that changed under the session records. */
export const SNAPSHOT_CHANGED_REASON = 'snapshot-changed';

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

/**
 * A failed toggle aborts the trial. The log keeps the honest `trial-applied` with its
 * errors (the append-only record of what the browser refused), then the ids this batch
 * did move are put back and the abort is recorded as a `session-paused` that carries
 * the rollback. Nothing is retried silently, so the panel can report the failing id and
 * the recovery its code asks for instead of pretending the batch happened.
 *
 * The commands that re-apply an existing target disagree about the success event they
 * leave behind, so only the abort is shared here; each caller records its own success.
 * A rollback is scoped to what this apply actually moved, because re-applying the whole
 * previous target would retry the toggle that just failed.
 */
type ApplyOutcome = { kind: 'manual' | 'applied' | 'aborted'; log: BisectLog };

async function applyWithAbort(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  target: TargetState,
  round: number,
): Promise<ApplyOutcome> {
  const result = await dependencies.port.applyTargetState(target);
  if (isManualBatch(result)) return { kind: 'manual', log };
  if (result.ok) return { kind: 'applied', log };

  const recorded = await appendAndPersist(log, 'trial-applied', dependencies.now(), {
    round,
    errors: result.errors,
  });
  return { kind: 'aborted', log: await rollbackAndPause(dependencies, recorded, target, result) };
}

async function rollbackAndPause(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  target: TargetState,
  result: ToggleResult,
): Promise<BisectLog> {
  const rollback = await dependencies.port.applyTargetState(rollbackTarget(target, result.applied));
  const restoredIds = isManualBatch(rollback) ? [] : rollback.applied;
  const errors = isManualBatch(rollback) ? [] : rollback.errors;
  return appendAndPersist(log, 'session-paused', dependencies.now(), {
    reason: TOGGLE_FAILED_REASON,
    errors: result.errors,
    rollback: { restoredIds, errors },
  });
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
  const outcome = await applyWithAbort(dependencies, started, target, round);
  if (outcome.kind === 'aborted') return outcome.log;

  return appendAndPersist(outcome.log, 'trial-applied', dependencies.now(), {
    round,
    errors: [],
    ...(outcome.kind === 'manual' ? { manual: true, manualBatch: targetBatchOf(target) } : {}),
  });
}

/**
 * True once a command has parked the session somewhere the caller must not override:
 * an assisted batch still waiting on the user, or an aborted batch.
 */
function isParked(view: SessionView): boolean {
  return view.status === 'awaiting-manual-toggle' || view.status === 'paused';
}

/**
 * The assisted rail re-records the batch so its checklist comes back. On the automated
 * rail nothing extra is written: the batch is already in the browser, the caller's own
 * event is the whole record, and an abort has already written its `trial-applied`.
 */
async function recordManualBatch(
  dependencies: ResolvedDependencies,
  outcome: ApplyOutcome,
  round: number,
  target: TargetState,
): Promise<BisectLog> {
  if (outcome.kind !== 'manual') return outcome.log;
  return appendAndPersist(outcome.log, 'trial-applied', dependencies.now(), {
    round,
    errors: [],
    manual: true,
    manualBatch: targetBatchOf(target),
  });
}

async function reloadAndSettle(
  dependencies: ResolvedDependencies,
  tab: TestTabBinding | null,
): Promise<TestTabOutcome> {
  if (tab === null) return { status: 'unbound', tabId: null };
  try {
    await dependencies.tabs.reload(tab.tabId);
  } catch {
    return { status: 'closed', tabId: tab.tabId };
  }
  const settled = await dependencies.tabs.waitForComplete(tab.tabId);
  return { status: settled ? 'reloaded' : 'unsettled', tabId: tab.tabId };
}

/**
 * The reload is a convenience, never a gate: a closed tab and a tab that never settles
 * both leave the user free to answer, so the outcome is recorded on the trial and the
 * panel turns it into a rebind prompt or a manual-reload hint. Only the two actionable
 * outcomes are written, so an ordinary reload does not grow the log.
 */
async function reloadAfterApply(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  view: SessionView,
): Promise<BisectLog> {
  if (isParked(view)) return log;

  const outcome = await reloadAndSettle(dependencies, view.testTab);
  const trial = view.currentTrial;
  if (trial === null) return log;
  if (outcome.status !== 'closed' && outcome.status !== 'unsettled') return log;

  return appendAndPersist(log, 'trial-applied', dependencies.now(), {
    round: trial.round,
    errors: trial.errors,
    ...(trial.manual && view.manualBatch !== null ? { manual: true, manualBatch: view.manualBatch } : {}),
    testTab: outcome,
  });
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

export function pauseForSnapshotChange(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  changes: SnapshotChange[],
): Promise<BisectLog> {
  return appendAndPersist(log, 'session-paused', dependencies.now(), {
    reason: SNAPSHOT_CHANGED_REASON,
    changes,
  });
}

export function detectSnapshotChanges(dependencies: SessionDependencies, view: SessionView): Promise<SnapshotChange[]> {
  const resolved = resolveDependencies(dependencies);
  return resolved.port
    .listInstalled()
    .then((installed) => snapshotChanges(view.candidateOrder, installed))
    .catch(() => []);
}

export interface SnapshotWatcherOptions {
  dependencies: SessionDependencies;
  /** Reports the pausing subset; an install is a warning and never pauses. */
  onChange(changes: SnapshotChange[]): void;
}

/**
 * `management.onInstalled` also fires for an update on Chrome, so the events only say
 * *something* happened. The watcher therefore re-derives the report from the snapshot
 * rather than trusting the event's own shape, which keeps the pause tied to a version
 * difference the user can see instead of to an event the browser may have reused.
 */
export function createSnapshotWatcher({ dependencies, onChange }: SnapshotWatcherOptions): () => void {
  const resolved = resolveDependencies(dependencies);

  const inspect = async (): Promise<void> => {
    try {
      const view = viewOf(await requireLog());
      if (view.status === 'paused' || view.status === 'restored' || view.status === 'aborted') return;
      const pausing = pausingChanges(await detectSnapshotChanges(resolved, view));
      if (pausing.length > 0) onChange(pausing);
    } catch {
      // No live session, or an unreadable log: nothing to warn about.
    }
  };

  return resolved.port.watchEvents((event) => {
    if (event.type === 'installed' || event.type === 'uninstalled') void inspect();
  });
}

/**
 * The background's own reaction to a watched removal or update. It runs through the same
 * serialized queue as every other write, so a panel command in flight cannot race the
 * pause, and it refuses to move a session that already reached a decision.
 */
export function recordSnapshotPause(
  rawDependencies: SessionDependencies,
  changes: SnapshotChange[],
): Promise<SessionView | null> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await readBisectLog();
    const view = reduceLog(log);
    if (log === null || view === null) return null;
    if (view.status === 'paused' || view.status === 'restored' || view.status === 'aborted') return view;
    if (changes.length === 0) return view;
    return viewOf(await pauseForSnapshotChange(dependencies, log, changes));
  });
}

/**
 * Restart takes a fresh snapshot. The old session is restored first, because the new one
 * starts from "every candidate is enabled" and the search would otherwise inherit a state
 * it never applied. The candidate list is re-read rather than reused, so a restart is the
 * one operation that legitimately sees the browser as it is now.
 */
export function restartSession(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await readBisectLog();
    const previous = reduceLog(log);
    if (previous === null) throw new SessionError('No session to restart');

    if (log !== null) await restoreTouched(dependencies, previous);

    const [lists, capability] = await Promise.all([
      dependencies.port.listCandidates(),
      dependencies.port.getCapabilities(),
    ]);
    const wanted = new Set(previous.originalEnabledIds);
    const candidates = lists.eligible.filter((candidate) => wanted.has(candidate.id));
    if (candidates.length === 0) {
      throw new SessionError('No eligible enabled extensions are left to restart the search with.');
    }

    const started = appendEvent(
      createEmptyLog(dependencies.newSessionId()),
      makeEvent('session-started', dependencies.now(), {
        candidateOrder: candidates,
        capability,
        baselineMode: previous.baselineMode,
        testTab: previous.testTab,
      }),
    );
    await writeBisectLog(started);
    if (previous.baselineMode === 'external') return viewOf(started);

    const applied = await applyAndRecord(dependencies, started, allOffTarget(candidates), 0);
    return viewOf(await reloadAfterApply(dependencies, applied, viewOf(applied)));
  });
}

/**
 * A candidate that was removed or re-versioned invalidates the trial that is on screen:
 * the partition was built from a snapshot the browser no longer matches, so the next
 * verdict would answer a question about an extension that is gone or different. An
 * install never reaches here — see `snapshotChanges`.
 */
async function guardAgainstSnapshotChanges(
  dependencies: ResolvedDependencies,
  log: BisectLog,
  view: SessionView,
): Promise<void> {
  if (view.candidateOrder.length === 0) return;

  const changes = await detectSnapshotChanges(dependencies, view);
  const pausing = pausingChanges(changes);
  if (pausing.length === 0) return;

  await pauseForSnapshotChange(dependencies, log, pausing);
  throw new SessionError(describeSnapshotChanges(pausing));
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
    return viewOf(await reloadAfterApply(dependencies, applied, viewOf(applied)));
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
    await guardAgainstSnapshotChanges(dependencies, log, view);
    await guardAgainstDrift(dependencies, log, view);

    const applied = await applyAndRecord(dependencies, log, nextTrialTarget(view), nextRoundFor(view));
    return viewOf(await reloadAfterApply(dependencies, applied, viewOf(applied)));
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
    if (!result.ok) {
      const aborted = await appendAndPersist(resumed, 'trial-applied', dependencies.now(), {
        round: trial.round,
        errors: result.errors,
      });
      return viewOf(await rollbackAndPause(dependencies, aborted, trial.targetState, result));
    }

    const next = viewOf(resumed);
    return viewOf(await reloadAfterApply(dependencies, resumed, next));
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
    if (!result.ok) {
      const aborted = await appendAndPersist(undone, 'trial-applied', dependencies.now(), {
        round: trial.round,
        errors: result.errors,
      });
      return viewOf(await rollbackAndPause(dependencies, aborted, trial.targetState, result));
    }

    const next = viewOf(undone);
    return viewOf(await reloadAfterApply(dependencies, undone, next));
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
    if (!isManualBatch(result) && !result.ok) {
      return viewOf(await rollbackAndPause(dependencies, reapplied, trial.targetState, result));
    }
    if (isManualBatch(result)) return viewOf(reapplied);

    return viewOf(await reloadAfterApply(dependencies, reapplied, viewOf(reapplied)));
  });
}

/**
 * The recording half of the Chrome permissions escalation. User activation does not
 * cross a runtime message, so the side panel has to make the `setEnabled` call itself;
 * the background only records what happened.
 *
 * A success resumes only after the batch is re-applied: the abort rolled back whatever
 * had landed, so resuming on the strength of one toggle alone would ask the user about a
 * batch that is not in the browser. A failure re-pauses with the browser's code, so a
 * declined or failed escalation always lands on a recovery screen.
 */
export function recordEscalationResult(
  rawDependencies: SessionDependencies,
  payload: { extensionId: string; ok: boolean; error?: string },
): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);
    const trial = view.currentTrial;

    if (view.pause === null) {
      throw new SessionError('No pause is waiting for an escalation result.');
    }
    if (view.status !== 'paused') {
      throw new SessionError(`Cannot record an escalation while the session is ${view.status}`);
    }
    if (!payload.ok) {
      const error: ToggleError = {
        extensionId: payload.extensionId,
        code: payload.error === undefined ? 'needs-user-gesture' : mapToggleError(new Error(payload.error)),
        message: payload.error ?? 'The extension could not be enabled from the side panel.',
      };
      return viewOf(
        await appendAndPersist(log, 'session-paused', dependencies.now(), {
          reason: ESCALATION_FAILED_REASON,
          errors: [error],
          rollback: view.pause.rollback ?? null,
        }),
      );
    }

    const resumed = await appendAndPersist(log, 'session-resumed', dependencies.now(), { reason: 'escalated' });
    if (trial === null) return viewOf(resumed);

    const outcome = await applyWithAbort(dependencies, resumed, trial.targetState, trial.round);
    const recorded = await recordManualBatch(dependencies, outcome, trial.round, trial.targetState);
    const next = viewOf(recorded);
    if (isParked(next)) return next;

    return viewOf(await reloadAfterApply(dependencies, recorded, next));
  });
}

/**
 * Ends a session the user does not want to continue after an escalation they declined.
 * The trial is aborted and the touched candidates are restored, so declining cannot
 * leave extensions disabled with no outcome.
 */
export function declineEscalation(rawDependencies: SessionDependencies): Promise<SessionView> {
  const dependencies = resolveDependencies(rawDependencies);
  return serialize(async () => {
    const log = await requireLog();
    const view = viewOf(log);

    if (view.status !== 'paused') {
      throw new SessionError(`Cannot decline an escalation while the session is ${view.status}`);
    }

    const restored = await restoreTouched(dependencies, view);
    return viewOf(
      await appendAndPersist(log, 'session-reset', dependencies.now(), {
        restored: restored.complete,
        errors: restored.errors,
        manualIds: restored.manualIds,
      }),
    );
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
      await guardAgainstSnapshotChanges(dependencies, log, view);
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

    await guardAgainstSnapshotChanges(dependencies, log, view);
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
