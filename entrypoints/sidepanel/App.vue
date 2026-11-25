<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  BisectConfig,
  BisectLog,
  CandidateExtension,
  CapabilityReport,
  DriftReport,
  EnabledStateMap,
  IneligibleExtension,
  ManualBatch,
  ReplayResult,
  RestoreResult,
  SessionView,
  Verdict,
} from '@/utils/bisect/domain';
import { messenger, type SessionMutationResult } from '@/utils/messaging';
import { type CopyStatus, copyText, MANUAL_COPY_MESSAGE } from './clipboard';
import AssistedBaseline from './components/AssistedBaseline.vue';
import AssistedRestore from './components/AssistedRestore.vue';
import AssistedTrial from './components/AssistedTrial.vue';
import BaselineScreen from './components/BaselineScreen.vue';
import CandidatePicker from './components/CandidatePicker.vue';
import CapabilityReportView from './components/CapabilityReport.vue';
import CompletedScreen from './components/CompletedScreen.vue';
import HistoryScreen from './components/HistoryScreen.vue';
import HostIssueScreen from './components/HostIssueScreen.vue';
import InconclusiveScreen from './components/InconclusiveScreen.vue';
import NoSession from './components/NoSession.vue';
import PreflightConsent from './components/PreflightConsent.vue';
import ReplayScreen from './components/ReplayScreen.vue';
import RestoredScreen from './components/RestoredScreen.vue';
import RestorePanel from './components/RestorePanel.vue';
import SessionProgress from './components/SessionProgress.vue';
import TrialScreen from './components/TrialScreen.vue';
import { buildHistory, type HistoryModel, renderBisectReport, serializeBisectLog } from './history';
import {
  baselineModeFor,
  buildPickerRows,
  describeProgress,
  findCandidate,
  formatTestTab,
  isAssisted,
  manualProgress,
  plural,
  type RestoreOutcome,
  type RestoreSummary,
  resolveScreen,
  selectIncludedCandidates,
  summarizeRestore,
} from './presentation';
import {
  applyReplayEdits,
  correctionCount,
  type ReplayEdits,
  type ReplayRoundRow,
  renderReplayReport,
  replayRounds,
  toggleEdit,
} from './replay';

type PanelState = 'loading' | 'ready' | 'error';

const state = ref<PanelState>('loading');
const capability = ref<CapabilityReport | null>(null);
const eligible = ref<CandidateExtension[]>([]);
const ineligible = ref<IneligibleExtension[]>([]);
const config = ref<BisectConfig | null>(null);
const session = ref<SessionView | null>(null);
const query = ref('');
const errorMessage = ref<string | null>(null);
const busy = ref(false);
const preflightOpen = ref(false);
const restoreOutcome = ref<RestoreOutcome | null>(null);
const reloadMessage = ref<string | null>(null);
const manualBatch = ref<ManualBatch | null>(null);
const manualDrift = ref<DriftReport | null>(null);
const addonManagerMessage = ref<string | null>(null);
const assistedRestore = ref<RestoreResult | null>(null);
const restoreAccepted = ref(false);
const historyOpen = ref(false);
const historyLog = ref<BisectLog | null>(null);
const copyStatus = ref<CopyStatus | null>(null);
const replayOpen = ref(false);
const replaySource = ref<BisectLog | null>(null);
const replayEdits = ref<ReplayEdits>({});
const replayResult = ref<ReplayResult | null>(null);
const replayCopyStatus = ref<CopyStatus | null>(null);

const excludedIds = computed(() => config.value?.excludedExtensionIds ?? []);

const rows = computed(() => buildPickerRows(eligible.value, excludedIds.value));

const unavailable = computed(() => ineligible.value);

const included = computed(() => selectIncludedCandidates(eligible.value, excludedIds.value));

const testTab = computed(() => config.value?.testTab ?? null);

const testTabWarning = computed(() =>
  testTab.value === null ? 'No test tab is bound yet. Bind one so the baseline can reload it.' : null,
);

const blockedReason = computed(() => {
  if (included.value.length === 0) return 'No eligible enabled extensions.';
  return null;
});

const capabilityNote = computed(() => {
  if (!isAssisted(capability.value)) return null;
  return 'Assisted mode: this browser does not let the add-on toggle extensions, so you apply the baseline yourself.';
});

const screen = computed(() =>
  resolveScreen({
    session: session.value,
    preflightOpen: preflightOpen.value,
    historyOpen: historyOpen.value,
    replayOpen: replayOpen.value,
  }),
);

const replayRows = computed<ReplayRoundRow[]>(() => replayRounds(replaySource.value, replayEdits.value));

const replayCorrections = computed(() => correctionCount(replayEdits.value, replaySource.value));

const replayNameOf = computed(() => (id: string) => findCandidate(culprits.value, id)?.name ?? id);

const replayDifferences = computed(() => replayResult.value?.batchDifferences ?? []);

const historyModel = computed<HistoryModel | null>(() =>
  session.value === null ? null : buildHistory(session.value, historyLog.value),
);

const culprits = computed(() => (session.value === null ? [] : session.value.candidateOrder));

const culprit = computed(() => findCandidate(culprits.value, session.value?.culpritId ?? null));

const restoreSummary = computed<RestoreSummary | null>(() =>
  restoreOutcome.value === null ? null : summarizeRestore(restoreOutcome.value, culprits.value),
);

const restoreAvailable = computed(() => session.value !== null && session.value.status !== 'restored');

const visibleCount = computed(() => {
  const term = query.value.trim();
  if (term.length === 0) return rows.value.length;
  return rows.value.filter((row) => row.name.toLowerCase().includes(term.toLowerCase())).length;
});

const manualActual = computed<EnabledStateMap>(() => manualDrift.value?.actual ?? {});

const manual = computed(() =>
  manualBatch.value === null ? null : manualProgress(manualBatch.value, manualActual.value),
);

const manualProgressAnnouncement = computed(() => {
  const progress = manual.value;
  if (progress === null) return 'Waiting for the extension list.';
  if (progress.complete) return 'Every candidate is in the baseline state. Verify to continue.';
  return `${progress.done} of ${progress.total} done. ${plural(progress.remainingIds.length, 'extension')} still to toggle.`;
});

const historyAnnouncement = computed(() => {
  const model = historyModel.value;
  if (model === null) return 'No session history yet.';
  return `${plural(model.entries.length, 'entry', 'entries')} in the history. ${model.outcome.label}.`;
});

const announcement = computed(() => {
  if (state.value === 'loading') return 'Loading extensions…';
  if (state.value === 'error') return 'Extensions could not be loaded';
  switch (screen.value) {
    case 'preflight':
      return isAssisted(capability.value)
        ? `${plural(included.value.length, 'extension')} will be turned off by you. Nothing is toggled for you.`
        : `${plural(included.value.length, 'extension')} will be disabled. Nothing is toggled yet.`;
    case 'assisted-baseline':
      return manualProgressAnnouncement.value;
    case 'assisted-trial':
      return manualProgressAnnouncement.value;
    case 'baseline':
      return 'Baseline ready. Answer whether the problem persists.';
    case 'trial':
      return session.value === null ? '' : describeProgress(session.value);
    case 'inconclusive':
      return 'No single culprit was identified; the remaining candidates are listed.';
    case 'host-issue':
      return 'No extension is implicated; this is a browser or machine issue.';
    case 'history':
      return historyAnnouncement.value;
    case 'replay':
      return replayResult.value === null
        ? 'Replay is diagnostic and does not change installed extensions.'
        : 'Replay result ready. No installed extension was changed.';
    case 'completed':
      return `Culprit identified: ${culprit.value?.name ?? session.value?.culpritId ?? 'unknown'}. It is still disabled.`;
    case 'restored':
      return restoreSummary.value?.headline ?? 'Session finished and restored.';
    case 'progress':
      return session.value === null ? '' : describeProgress(session.value);
    default:
      return rows.value.length === 0
        ? 'No eligible enabled extensions'
        : `${visibleCount.value} of ${rows.value.length} candidates shown`;
  }
});

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function load(): Promise<void> {
  state.value = 'loading';
  try {
    const [nextCapability, lists, nextConfig, nextSession] = await Promise.all([
      messenger.sendMessage('getCapabilities'),
      messenger.sendMessage('listCandidates'),
      messenger.sendMessage('getConfig'),
      messenger.sendMessage('getSession'),
    ]);
    capability.value = nextCapability;
    eligible.value = lists.eligible;
    ineligible.value = lists.ineligible;
    config.value = nextConfig;
    session.value = nextSession;
    errorMessage.value = null;
    state.value = 'ready';
  } catch (error) {
    errorMessage.value = describeError(error);
    state.value = 'error';
  }
}

async function run<T>(command: () => Promise<T>): Promise<T | null> {
  busy.value = true;
  try {
    const result = await command();
    errorMessage.value = null;
    return result;
  } catch (error) {
    errorMessage.value = describeError(error);
    return null;
  } finally {
    busy.value = false;
  }
}

async function refreshConfig(): Promise<void> {
  config.value = await messenger.sendMessage('getConfig');
  const lists = await messenger.sendMessage('listCandidates');
  eligible.value = lists.eligible;
  ineligible.value = lists.ineligible;
}

async function toggleCandidate(id: string): Promise<void> {
  if (config.value === null) return;
  const nextExcluded = excludedIds.value.includes(id)
    ? excludedIds.value.filter((entry) => entry !== id)
    : [...excludedIds.value, id];

  await run(async () => {
    config.value = await messenger.sendMessage('updateConfig', { excludedExtensionIds: nextExcluded });
    await refreshConfig();
  });
}

async function bindTestTab(): Promise<void> {
  await run(async () => {
    config.value = await messenger.sendMessage('bindTestTab', {});
  });
}

function openPreflight(): void {
  preflightOpen.value = true;
}

function closePreflight(): void {
  preflightOpen.value = false;
}

async function startBaseline(): Promise<void> {
  const candidateIds = included.value.map((candidate) => candidate.id);
  const mode = baselineModeFor(capability.value ?? FALLBACK_CAPABILITY, 'manual');
  const boundTab = testTab.value;
  const result = await run(() =>
    messenger.sendMessage('startSession', {
      candidateIds,
      baselineMode: mode,
      testTab: boundTab === null ? null : { tabId: boundTab.tabId, url: boundTab.url },
    }),
  );
  if (result === null) return;
  session.value = result;
  preflightOpen.value = false;
  restoreOutcome.value = null;
  assistedRestore.value = null;
  restoreAccepted.value = false;
  addonManagerMessage.value = null;
  await refreshManualState();
}

const FALLBACK_CAPABILITY: CapabilityReport = {
  browserName: 'unknown',
  canAutoToggle: false,
  selfInstallType: 'unknown',
  sideSurface: 'side-panel',
};

/**
 * A manual batch has no `applyTargetState` result to show: the batch is the trial's
 * own target, and the drift tells the panel how far along the user is. The baseline
 * batch and every partition batch use the same procedure, so one refresh serves both.
 */
async function refreshManualState(): Promise<void> {
  const current = session.value;
  const trial = current?.currentTrial ?? null;
  if (current === null || current.status !== 'awaiting-manual-toggle' || trial === null) {
    manualBatch.value = null;
    manualDrift.value = null;
    return;
  }
  const drift = await run(() => messenger.sendMessage('getDrift'));
  if (drift === null) return;
  manualDrift.value = drift;
  manualBatch.value = current.manualBatch ?? { enableIds: trial.enabledIds, disableIds: trial.disabledIds };
}

async function openAddonManager(): Promise<void> {
  addonManagerMessage.value = null;
  const result = await run(() => messenger.sendMessage('openAddonManager'));
  if (result === null) return;
  addonManagerMessage.value = result.opened
    ? 'The Add-ons Manager is open in a new tab. Turn the listed extensions off, then verify.'
    : `The Add-ons Manager could not be opened (${result.error ?? 'unknown reason'}). Use the copyable list instead.`;
}

async function verifyManualState(): Promise<void> {
  await refreshManualState();
  const drift = manualDrift.value;
  if (drift === null) return;
  const confirmed = await run(() => messenger.sendMessage('confirmManualState'));
  if (confirmed === null) return;
  session.value = confirmed;
  manualBatch.value = null;
  manualDrift.value = null;
  addonManagerMessage.value = null;
}

async function attestExternal(): Promise<void> {
  const result = await run(() => messenger.sendMessage('recordExternalBaseline'));
  if (result !== null) session.value = result;
}

async function verifyAssistedRestore(): Promise<void> {
  const result = await run(() => messenger.sendMessage('verifyRestore'));
  if (result !== null) assistedRestore.value = result;
}

/**
 * The user may decide that what is left of the restore is fine. The background
 * records the acceptance, and the panel keeps showing `restoreOutcome` so the
 * remaining differences stay visible instead of being relabelled as a success.
 */
async function acceptAssistedRestore(): Promise<void> {
  const accepted = await run(() => messenger.sendMessage('acceptRestore'));
  if (accepted === null) return;
  restoreAccepted.value = true;
  session.value = accepted;
  await verifyAssistedRestore();
}

/**
 * The history reads the persisted log for the restore note and the report, so a
 * mutation taken while it is open must re-read it. Without this the panel would show
 * the session view of the new log next to history text rendered from the old one.
 */
async function refreshHistoryIfOpen(): Promise<void> {
  if (!historyOpen.value) return;
  historyLog.value = await run(() => messenger.sendMessage('getLog'));
}

async function applyMutation(result: SessionMutationResult): Promise<void> {
  session.value = result.session;
  if (result.restore !== null) restoreOutcome.value = result.restore;
  assistedRestore.value = null;
  restoreAccepted.value = false;
  await refreshHistoryIfOpen();
}

async function applyTrial(): Promise<void> {
  const result = await run(() => messenger.sendMessage('applyTrial'));
  if (result === null) return;
  session.value = result;
  addonManagerMessage.value = null;
  await refreshManualState();
  await refreshHistoryIfOpen();
}

async function retryTrial(): Promise<void> {
  const result = await run(() => messenger.sendMessage('retryTrial', {}));
  if (result === null) return;
  await applyMutation(result);
  await refreshManualState();
}

async function submitVerdict(verdict: Verdict): Promise<void> {
  const result = await run(() => messenger.sendMessage('submitVerdict', { verdict }));
  if (result !== null) await applyMutation(result);
}

async function restore(): Promise<void> {
  const result = await run(() => messenger.sendMessage('resetSession', { restore: true }));
  if (result === null) return;
  await applyMutation(result);
  if (isAssisted(capability.value)) await verifyAssistedRestore();
}

async function reloadTestTab(): Promise<void> {
  reloadMessage.value = null;
  const result = await run(() => messenger.sendMessage('reloadTestTab'));
  if (result === null) return;
  reloadMessage.value = result.ok ? 'The test tab reloaded.' : (result.error ?? 'The test tab could not be reloaded.');
}

async function openHistory(): Promise<void> {
  copyStatus.value = null;
  historyLog.value = await run(() => messenger.sendMessage('getLog'));
  historyOpen.value = true;
}

function closeHistory(): void {
  historyOpen.value = false;
  copyStatus.value = null;
}

/**
 * Replay works on a copy fetched when the screen opens. The edit lives in panel state
 * until the user replays, and the copy is sent as a plain object, never a reactive one.
 */
async function openReplay(): Promise<void> {
  replayCopyStatus.value = null;
  replayEdits.value = {};
  replayResult.value = null;
  const log = await run(() => messenger.sendMessage('getLog'));
  if (log === null) return;
  replaySource.value = log;
  historyOpen.value = false;
  replayOpen.value = true;
}

function closeReplay(): void {
  replayOpen.value = false;
  replaySource.value = null;
  replayEdits.value = {};
  replayResult.value = null;
  replayCopyStatus.value = null;
}

function correctVerdict(round: number): void {
  const row = replayRows.value.find((entry) => entry.round === round);
  if (row === undefined) return;
  replayEdits.value = toggleEdit(replayEdits.value, round, row.editedVerdict);
  replayResult.value = null;
}

function discardReplayEdits(): void {
  replayEdits.value = {};
  replayResult.value = null;
}

async function runReplay(): Promise<void> {
  const source = replaySource.value;
  if (source === null) return;
  const copy = applyReplayEdits(source, { ...replayEdits.value });
  const result = await run(() => messenger.sendMessage('replayLog', { log: copy }));
  if (result !== null) replayResult.value = result;
}

async function copyReplayReport(): Promise<void> {
  const source = replaySource.value;
  const result = replayResult.value;
  if (source === null || result === null || session.value === null) return;
  const text = renderReplayReport(session.value, result);
  const outcome = await copyText(text);
  replayCopyStatus.value =
    outcome === 'copied'
      ? { kind: 'copied', message: 'The replay report is on the clipboard.', text: null }
      : { kind: 'error', message: MANUAL_COPY_MESSAGE, text };
}

async function publishCopy(label: string, text: string): Promise<void> {
  const outcome = await copyText(text);
  copyStatus.value =
    outcome === 'copied'
      ? { kind: 'copied', message: `${label} is on the clipboard.`, text: null }
      : { kind: 'error', message: MANUAL_COPY_MESSAGE, text };
}

async function copyLogJson(): Promise<void> {
  const log = await run(() => messenger.sendMessage('getLog'));
  if (log === null) return;
  historyLog.value = log;
  await publishCopy('The bisect log', serializeBisectLog(log));
}

async function copyReport(): Promise<void> {
  const log = await run(() => messenger.sendMessage('getLog'));
  if (log === null) return;
  const model = session.value === null ? null : buildHistory(session.value, log);
  if (model === null) return;
  historyLog.value = log;
  await publishCopy('The report', renderBisectReport(model));
}

defineExpose({ load });

onMounted(load);
</script>

<template>
  <main class="panel" data-testid="sidepanel-root" :data-state="state" :data-screen="screen">
    <h1 class="title">Extension Bisect</h1>

    <p class="status" data-testid="sidepanel-live" aria-live="polite">{{ announcement }}</p>

    <p v-if="state === 'loading'" class="status" data-testid="sidepanel-loading">Loading extensions…</p>

    <p v-if="errorMessage !== null" class="error" data-testid="sidepanel-error" role="alert">{{ errorMessage }}</p>

    <template v-if="state === 'ready' && capability !== null">
      <CapabilityReportView :capability="capability" />

      <PreflightConsent
        v-if="screen === 'preflight'"
        :candidates="included"
        :capability="capability"
        :test-tab-label="formatTestTab(testTab)"
        :test-tab-warning="testTabWarning"
        :blocked-reason="blockedReason"
        :busy="busy"
        @start="startBaseline"
        @cancel="closePreflight"
        @bind="bindTestTab"
      />

      <AssistedBaseline
        v-else-if="screen === 'assisted-baseline' && session !== null"
        :session="session"
        :batch="manualBatch"
        :progress="manual"
        :busy="busy"
        :addon-manager-message="addonManagerMessage"
        @open-addons="openAddonManager"
        @verify="verifyManualState"
        @attest="attestExternal"
        @copy="addonManagerMessage = 'The list is copied.'"
        @reload="reloadTestTab"
      />

      <AssistedTrial
        v-else-if="screen === 'assisted-trial' && session !== null"
        :session="session"
        :batch="manualBatch"
        :progress="manual"
        :busy="busy"
        :addon-manager-message="addonManagerMessage"
        @open-addons="openAddonManager"
        @verify="verifyManualState"
        @reload="reloadTestTab"
      />

      <BaselineScreen
        v-else-if="screen === 'baseline'"
        :busy="busy"
        :reload-message="reloadMessage"
        @verdict="submitVerdict"
        @reload="reloadTestTab"
      />

      <TrialScreen
        v-else-if="screen === 'trial' && session !== null"
        :session="session"
        :busy="busy"
        :reload-message="reloadMessage"
        @apply-trial="applyTrial"
        @retry-trial="retryTrial"
        @verdict="submitVerdict"
        @reload="reloadTestTab"
        @history="openHistory"
      />

      <HistoryScreen
        v-else-if="screen === 'history' && historyModel !== null"
        :model="historyModel"
        :busy="busy"
        :copy-status="copyStatus"
        @back="closeHistory"
        @copy-log="copyLogJson"
        @copy-report="copyReport"
        @replay="openReplay"
      />

      <ReplayScreen
        v-else-if="screen === 'replay'"
        :rounds="replayRows"
        :result="replayResult"
        :differences="replayDifferences"
        :corrections="replayCorrections"
        :name-of="replayNameOf"
        :busy="busy"
        :copy-status="replayCopyStatus"
        @correct="correctVerdict"
        @replay="runReplay"
        @reset-edits="discardReplayEdits"
        @copy-report="copyReplayReport"
        @back="closeReplay"
      />

      <InconclusiveScreen
        v-else-if="screen === 'inconclusive' && session !== null"
        :session="session"
        :busy="busy"
        :restore-summary-headline="restoreSummary?.headline ?? null"
        @restore="restore"
        @history="openHistory"
        @replay="openReplay"
      />

      <HostIssueScreen
        v-else-if="screen === 'host-issue'"
        :restore-summary-headline="restoreSummary?.headline ?? null"
        :busy="busy"
        @restore="restore"
      />

      <CompletedScreen
        v-else-if="screen === 'completed'"
        :culprit="culprit"
        :culprit-id="session?.culpritId ?? ''"
        :busy="busy"
        :restore-summary-headline="restoreSummary?.headline ?? null"
        @restore="restore"
        @history="openHistory"
        @replay="openReplay"
      />

      <RestoredScreen v-else-if="screen === 'restored'" :summary="restoreSummary" :busy="busy" @restore="restore" />

      <SessionProgress v-else-if="screen === 'progress' && session !== null" :session="session" />

      <template v-else>
        <NoSession :browser-name="capability.browserName" />
        <CandidatePicker
          :rows="rows"
          :unavailable="unavailable"
          :query="query"
          :busy="busy"
          :blocked-reason="blockedReason"
          :note="capabilityNote"
          @update:query="query = $event"
          @toggle="toggleCandidate"
          @start="openPreflight"
        />
      </template>

      <AssistedRestore
        v-if="isAssisted(capability) && session !== null && restoreOutcome !== null"
        :manual-ids="restoreOutcome.manualIds ?? []"
        :restored-ids="assistedRestore?.restoredIds ?? []"
        :candidates="culprits"
        :summary="restoreSummary"
        :busy="busy"
        :accepted="restoreAccepted"
        @verify="verifyAssistedRestore"
        @open-addons="openAddonManager"
        @accept="acceptAssistedRestore"
      />

      <RestorePanel :summary="restoreSummary" :busy="busy" :available="restoreAvailable" @restore="restore" />
    </template>
  </main>
</template>
