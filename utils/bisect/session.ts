import { readBisectConfig, updateBisectConfig } from './config';
import type {
  BaselineMode,
  BisectConfig,
  BisectEvent,
  BisectEventPayloads,
  BisectEventType,
  BisectLog,
  CandidateExtension,
  EnabledStateMap,
  ManagementPort,
  RestoreResult,
  SessionView,
  TargetState,
  TestTabBinding,
  Verdict,
} from './domain';
import { type AnsweredTrial, buildTargetState, partitionSuspects } from './engine';
import { appendEvent, BisectLogWriteError, createEmptyLog, readBisectLog, reduceLog, writeBisectLog } from './events';

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

    const target = allOffTarget(candidates);
    const applied = await applyAndRecord(dependencies, log, target, 0);
    await reloadAndSettle(dependencies, request.testTab);

    const failures = viewOf(applied).currentTrial?.errors ?? [];
    if (failures.length === 0) return viewOf(applied);

    const restored = await restoreTouched(dependencies, viewOf(applied));
    return viewOf(
      await appendAndPersist(applied, 'session-reset', dependencies.now(), {
        restored: restored.complete,
        errors: restored.errors,
      }),
    );
  });
}

export function getSession(): Promise<SessionView | null> {
  return serialize(async () => reduceLog(await readBisectLog()));
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

    const applied = await applyAndRecord(dependencies, log, nextTrialTarget(view), nextRoundFor(view));
    await reloadAndSettle(dependencies, view.testTab);
    return viewOf(applied);
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
    const reapplied = await appendAndPersist(retried, 'trial-applied', dependencies.now(), {
      round: trial.round,
      errors: result.errors,
    });
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
      const recorded = await appendAndPersist(log, 'baseline-recorded', dependencies.now(), {
        mode: 'auto',
        verdict: payload.verdict,
      });
      if (payload.verdict === 'gone') return viewOf(await settleOutcome(dependencies, recorded));

      const restored = await restoreTouched(dependencies, view);
      return viewOf(
        await appendAndPersist(recorded, 'session-reset', dependencies.now(), {
          restored: restored.complete,
          errors: restored.errors,
        }),
      );
    }

    const pending = view.currentTrial;
    if (view.status !== 'awaiting-verdict' || pending === null || pending.verdict !== null) {
      throw new SessionError('No verdict is pending');
    }

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
