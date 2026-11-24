import type { BaselineMode, BisectEventPayloads, BisectLog, SessionView, Trial, Verdict } from '@/utils/bisect/domain';
import { describeSessionStatus, findCandidate, formatTestTab, plural, VERDICT_LABELS } from './presentation';

export type HistoryEntryKind = 'baseline' | 'trial';

export interface HistoryEntry {
  key: string;
  kind: HistoryEntryKind;
  round: number;
  roundLabel: string;
  enabledNames: string[];
  disabledNames: string[];
  verdictLabel: string;
  retries: number;
  retryLabel: string | null;
  note: string | null;
}

export type HistoryOutcomeKind = 'culprit' | 'inconclusive' | 'aborted' | 'restored' | 'in-progress';

export interface HistoryOutcome {
  kind: HistoryOutcomeKind;
  label: string;
  names: string[];
  note: string | null;
}

export interface HistoryModel {
  sessionId: string;
  candidateNames: string[];
  baselineModeLabel: string;
  testTabLabel: string;
  entries: HistoryEntry[];
  outcome: HistoryOutcome;
}

export const BASELINE_MODE_LABELS: Record<BaselineMode, string> = {
  auto: 'Automatic',
  external: 'External attestation in Troubleshoot Mode',
  manual: 'Assisted — you turned the extensions off',
};

const AWAITING_VERDICT = 'Awaiting your verdict';

const EXTERNAL_BASELINE_NOTE =
  'Attested in Troubleshoot Mode with every extension off, so nothing was toggled by the add-on.';

const MANUAL_BATCH_NOTE = 'Applied by hand in the Add-ons Manager, then verified.';

const RESTORED_NOTE = 'Every touched extension is back to its original state.';

export function retryCountsByRound(log: BisectLog | null): Record<number, number> {
  const counts: Record<number, number> = {};
  if (log === null) return counts;
  for (const event of log.events) {
    if (event.type !== 'trial-retried') continue;
    const round = event.payload.round;
    counts[round] = (counts[round] ?? 0) + 1;
  }
  return counts;
}

function recordedBaseline(log: BisectLog | null): BisectEventPayloads['baseline-recorded'] | null {
  if (log === null) return null;
  let found: BisectEventPayloads['baseline-recorded'] | null = null;
  for (const event of log.events) {
    if (event.type === 'baseline-recorded') found = event.payload;
  }
  return found;
}

function lastRestoreComplete(log: BisectLog | null): boolean {
  if (log === null) return false;
  let complete = false;
  for (const event of log.events) {
    if (event.type === 'session-reset') complete = event.payload.restored;
  }
  return complete;
}

function retryLabelOf(count: number): string | null {
  if (count === 0) return null;
  return `${plural(count, 'retry', 'retries')}`;
}

function verdictLabelOf(verdict: Verdict | null): string {
  return verdict === null ? AWAITING_VERDICT : VERDICT_LABELS[verdict];
}

function entryOfTrial(trial: Trial, nameOf: (id: string) => string, retries: number): HistoryEntry {
  return {
    key: `trial-${trial.round}`,
    kind: 'trial',
    round: trial.round,
    roundLabel: `Trial ${trial.round}`,
    enabledNames: trial.enabledIds.map(nameOf),
    disabledNames: trial.disabledIds.map(nameOf),
    verdictLabel: verdictLabelOf(trial.verdict),
    retries,
    retryLabel: retryLabelOf(retries),
    note: trial.manual ? MANUAL_BATCH_NOTE : null,
  };
}

function baselineEntry(
  view: SessionView,
  recorded: BisectEventPayloads['baseline-recorded'] | null,
  retries: number,
  nameOf: (id: string) => string,
): HistoryEntry {
  const baselineTrial = view.trials.find((trial) => trial.round === 0) ?? null;
  const candidateNames = view.candidateOrder.map((candidate) => candidate.name);

  if (baselineTrial !== null) {
    return {
      key: 'baseline',
      kind: 'baseline',
      round: 0,
      roundLabel: 'Baseline check',
      enabledNames: baselineTrial.enabledIds.map(nameOf),
      disabledNames: baselineTrial.disabledIds.map(nameOf),
      verdictLabel: verdictLabelOf(baselineTrial.verdict),
      retries,
      retryLabel: retryLabelOf(retries),
      note: baselineTrial.manual ? MANUAL_BATCH_NOTE : null,
    };
  }

  return {
    key: 'baseline',
    kind: 'baseline',
    round: 0,
    roundLabel: 'Baseline check',
    enabledNames: [],
    disabledNames: candidateNames,
    verdictLabel: verdictLabelOf(recorded?.verdict ?? null),
    retries,
    retryLabel: retryLabelOf(retries),
    note: recorded === null ? null : EXTERNAL_BASELINE_NOTE,
  };
}

function outcomeOf(view: SessionView, restored: boolean, nameOf: (id: string) => string): HistoryOutcome {
  if (view.culpritId !== null) {
    const name = nameOf(view.culpritId);
    return {
      kind: 'culprit',
      label: `Culprit: ${name}`,
      names: [name],
      note: restored ? RESTORED_NOTE : null,
    };
  }
  if (view.status === 'inconclusive') {
    return {
      kind: 'inconclusive',
      label: 'Inconclusive: no single culprit was identified',
      names: view.ambiguityIds.map(nameOf),
      note: restored ? RESTORED_NOTE : null,
    };
  }
  if (view.abortReason !== null) {
    return {
      kind: 'aborted',
      label: 'Aborted: the problem persists with every extension off, so no extension is implicated',
      names: [],
      note: restored ? RESTORED_NOTE : null,
    };
  }
  if (view.status === 'restored') {
    return { kind: 'restored', label: 'Restored before an outcome was reached', names: [], note: RESTORED_NOTE };
  }
  return {
    kind: 'in-progress',
    label: `In progress: ${describeSessionStatus(view.status)}`,
    names: [],
    note: null,
  };
}

export function buildHistory(view: SessionView, log: BisectLog | null): HistoryModel {
  const nameOf = (id: string) => findCandidate(view.candidateOrder, id)?.name ?? id;
  const retries = retryCountsByRound(log);
  const recorded = recordedBaseline(log);

  const entries: HistoryEntry[] = [baselineEntry(view, recorded, retries[0] ?? 0, nameOf)];
  const trials = view.trials.filter((trial) => trial.round > 0).sort((left, right) => left.round - right.round);
  for (const trial of trials) entries.push(entryOfTrial(trial, nameOf, retries[trial.round] ?? 0));

  return {
    sessionId: view.sessionId,
    candidateNames: view.candidateOrder.map((candidate) => candidate.name),
    baselineModeLabel: BASELINE_MODE_LABELS[view.baselineMode],
    testTabLabel: formatTestTab(view.testTab),
    entries,
    outcome: outcomeOf(view, lastRestoreComplete(log), nameOf),
  };
}

function batchText(names: string[]): string {
  return names.length === 0 ? 'none' : names.join(', ');
}

export function renderBisectReport(model: HistoryModel): string {
  const lines: string[] = [
    'Extension Bisect report',
    `Session: ${model.sessionId}`,
    `Candidates (${model.candidateNames.length}, in the captured order): ${batchText(model.candidateNames)}`,
    `Baseline mode: ${model.baselineModeLabel}`,
    `Test tab: ${model.testTabLabel}`,
    '',
  ];

  for (const entry of model.entries) {
    lines.push(entry.roundLabel);
    lines.push(`  enabled: ${batchText(entry.enabledNames)}`);
    lines.push(`  disabled: ${batchText(entry.disabledNames)}`);
    lines.push(`  verdict: ${entry.verdictLabel}`);
    if (entry.retryLabel !== null) lines.push(`  retries: ${entry.retries}`);
    if (entry.note !== null) lines.push(`  note: ${entry.note}`);
    lines.push('');
  }

  lines.push(`Outcome: ${model.outcome.label}`);
  if (model.outcome.names.length > 0) lines.push(`Outcome candidates: ${batchText(model.outcome.names)}`);
  if (model.outcome.note !== null) lines.push(`Outcome note: ${model.outcome.note}`);

  return `${lines.join('\n').trimEnd()}\n`;
}

export function serializeBisectLog(log: BisectLog): string {
  return JSON.stringify(log, null, 2);
}
