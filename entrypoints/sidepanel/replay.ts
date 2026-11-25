import type { BisectLog, ReplayResult, SessionView, Verdict } from '@/utils/bisect/domain';
import {
  BASELINE_MODE_LABELS,
  type HistoryEntry,
  type HistoryModel,
  type HistoryOutcome,
  renderBisectReport,
} from './history';
import { findCandidate, formatTestTab, VERDICT_LABELS } from './presentation';

export const REPLAY_DIAGNOSTIC_NOTICE = 'Replay recomputes the result. It does not change installed extensions.';

export const REPLAY_SOURCE_NOTE = 'You are editing a copy. The live log stays append-only and visibly unchanged.';

export type ReplayEdits = Record<number, Verdict>;

export interface ReplayRoundRow {
  round: number;
  recordedVerdict: Verdict;
  editedVerdict: Verdict;
  recordedLabel: string;
  editedLabel: string;
  corrected: boolean;
}

function otherVerdict(verdict: Verdict): Verdict {
  return verdict === 'persists' ? 'gone' : 'persists';
}

/**
 * The rounds a user may correct: every partition trial that recorded a verdict. The
 * baseline verdict is not offered, because a wrong baseline already ends the search
 * with a restore and a fresh session rather than a partition to re-run.
 */
export function recordedVerdicts(log: BisectLog | null): Map<number, Verdict> {
  const verdicts = new Map<number, Verdict>();
  if (log === null) return verdicts;
  for (const event of log.events) {
    if (event.type === 'verdict-recorded') verdicts.set(event.payload.round, event.payload.verdict);
  }
  return verdicts;
}

export function replayRounds(log: BisectLog | null, edits: ReplayEdits): ReplayRoundRow[] {
  const rows: ReplayRoundRow[] = [];
  for (const [round, recordedVerdict] of [...recordedVerdicts(log)].sort(([left], [right]) => left - right)) {
    const editedVerdict = edits[round] ?? recordedVerdict;
    rows.push({
      round,
      recordedVerdict,
      editedVerdict,
      recordedLabel: VERDICT_LABELS[recordedVerdict],
      editedLabel: VERDICT_LABELS[editedVerdict],
      corrected: editedVerdict !== recordedVerdict,
    });
  }
  return rows;
}

export function correctionCount(edits: ReplayEdits, log: BisectLog | null): number {
  const recorded = recordedVerdicts(log);
  let count = 0;
  for (const [round, verdict] of Object.entries(edits)) {
    const original = recorded.get(Number(round));
    if (original !== undefined && original !== verdict) count += 1;
  }
  return count;
}

export function toggleEdit(edits: ReplayEdits, round: number, current: Verdict): ReplayEdits {
  return { ...edits, [round]: otherVerdict(current) };
}

/**
 * Builds the copy the replay runs on: a fresh plain object with the corrected verdicts
 * substituted. The source log is never written to, and nothing reactive is handed to
 * the messaging layer.
 */
export function applyReplayEdits(log: BisectLog, edits: ReplayEdits): BisectLog {
  const events = log.events.map((event): BisectLog['events'][number] => {
    if (event.type !== 'verdict-recorded') return { ...event };
    const edited = edits[event.payload.round];
    const verdict = edited === undefined ? event.payload.verdict : edited;
    return { ...event, payload: { ...event.payload, verdict } };
  });
  return { schemaVersion: log.schemaVersion, sessionId: log.sessionId, events };
}

function replayOutcomeOf(result: ReplayResult, session: SessionView): HistoryOutcome {
  const nameOf = (id: string) => findCandidate(session.candidateOrder, id)?.name ?? id;
  const note = 'Replay is diagnostic: no installed extension was changed.';

  if (result.culpritId !== null) {
    const name = nameOf(result.culpritId);
    return { kind: 'culprit', label: `Replayed culprit: ${name}`, names: [name], note };
  }
  if (result.ambiguityIds.length > 0) {
    return {
      kind: 'inconclusive',
      label: 'Replayed outcome: inconclusive, no single culprit',
      names: result.ambiguityIds.map(nameOf),
      note,
    };
  }
  return { kind: 'in-progress', label: 'Replayed outcome: the corrected verdicts are unfinished', names: [], note };
}

function replayEntryOf(
  round: number,
  enabledIds: readonly string[],
  disabledIds: readonly string[],
  verdict: Verdict | null,
  nameOf: (id: string) => string,
): HistoryEntry {
  return {
    key: `replay-${round}`,
    kind: round === 0 ? 'baseline' : 'trial',
    round,
    roundLabel: round === 0 ? 'Baseline check' : `Trial ${round}`,
    enabledNames: enabledIds.map(nameOf),
    disabledNames: disabledIds.map(nameOf),
    verdictLabel: verdict === null ? 'Awaiting your verdict' : VERDICT_LABELS[verdict],
    retries: 0,
    retryLabel: null,
    note: 'Recomputed by replay.',
  };
}

/**
 * Shapes the replay result as the ISS-007 history model, so the report renderer is the
 * same one the live session uses and the copied text has one format.
 */
export function buildReplayReportModel(session: SessionView, result: ReplayResult): HistoryModel {
  const nameOf = (id: string) => findCandidate(session.candidateOrder, id)?.name ?? id;
  const entries = result.trials.map((trial) =>
    replayEntryOf(trial.round, trial.enabledIds, trial.disabledIds, trial.verdict, nameOf),
  );

  return {
    sessionId: session.sessionId,
    candidateNames: session.candidateOrder.map((candidate) => candidate.name),
    baselineModeLabel: BASELINE_MODE_LABELS[session.baselineMode],
    testTabLabel: formatTestTab(session.testTab),
    entries,
    outcome: replayOutcomeOf(result, session),
  };
}

export function renderReplayReport(session: SessionView, result: ReplayResult): string {
  const report = renderBisectReport(buildReplayReportModel(session, result));
  const header = 'Replay of a corrected bisect log (diagnostic only; no installed extension was changed)';
  const differences =
    result.batchDifferences.length === 0
      ? 'Recorded batches: none differ from the recomputed ones'
      : `Recorded batches that differ: ${result.batchDifferences.map((entry) => `trial ${entry.round}`).join(', ')}`;
  return `${header}\n${differences}\n\n${report}`;
}
