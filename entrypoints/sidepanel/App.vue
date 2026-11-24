<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  BisectConfig,
  CandidateExtension,
  CapabilityReport,
  DriftReport,
  EnabledStateMap,
  IneligibleExtension,
  ManualBatch,
  RestoreResult,
  SessionView,
  Verdict,
} from '@/utils/bisect/domain';
import { messenger, type SessionMutationResult } from '@/utils/messaging';
import AssistedBaseline from './components/AssistedBaseline.vue';
import AssistedRestore from './components/AssistedRestore.vue';
import BaselineScreen from './components/BaselineScreen.vue';
import CandidatePicker from './components/CandidatePicker.vue';
import CapabilityReportView from './components/CapabilityReport.vue';
import CompletedScreen from './components/CompletedScreen.vue';
import HostIssueScreen from './components/HostIssueScreen.vue';
import InconclusiveScreen from './components/InconclusiveScreen.vue';
import NoSession from './components/NoSession.vue';
import PreflightConsent from './components/PreflightConsent.vue';
import RestoredScreen from './components/RestoredScreen.vue';
import RestorePanel from './components/RestorePanel.vue';
import SessionProgress from './components/SessionProgress.vue';
import TrialScreen from './components/TrialScreen.vue';
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

const screen = computed(() => resolveScreen({ session: session.value, preflightOpen: preflightOpen.value }));

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
    case 'baseline':
      return 'Baseline ready. Answer whether the problem persists.';
    case 'trial':
      return session.value === null ? '' : describeProgress(session.value);
    case 'inconclusive':
      return 'No single culprit was identified; the remaining candidates are listed.';
    case 'host-issue':
      return 'No extension is implicated; this is a browser or machine issue.';
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
 * The assisted baseline has no `applyTargetState` result to show: the batch is the
 * trial's target, and the drift tells the panel how far along the user is.
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
  manualBatch.value = { enableIds: trial.enabledIds, disableIds: trial.disabledIds };
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

function applyMutation(result: SessionMutationResult): void {
  session.value = result.session;
  if (result.restore !== null) restoreOutcome.value = result.restore;
  assistedRestore.value = null;
}

async function applyTrial(): Promise<void> {
  const result = await run(() => messenger.sendMessage('applyTrial'));
  if (result !== null) session.value = result;
}

async function retryTrial(): Promise<void> {
  const result = await run(() => messenger.sendMessage('retryTrial', {}));
  if (result !== null) applyMutation(result);
}

async function submitVerdict(verdict: Verdict): Promise<void> {
  const result = await run(() => messenger.sendMessage('submitVerdict', { verdict }));
  if (result !== null) applyMutation(result);
}

async function restore(): Promise<void> {
  const result = await run(() => messenger.sendMessage('resetSession', { restore: true }));
  if (result === null) return;
  applyMutation(result);
  if (isAssisted(capability.value)) await verifyAssistedRestore();
}

async function reloadTestTab(): Promise<void> {
  reloadMessage.value = null;
  const result = await run(() => messenger.sendMessage('reloadTestTab'));
  if (result === null) return;
  reloadMessage.value = result.ok ? 'The test tab reloaded.' : (result.error ?? 'The test tab could not be reloaded.');
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
      />

      <InconclusiveScreen
        v-else-if="screen === 'inconclusive' && session !== null"
        :session="session"
        :busy="busy"
        :restore-summary-headline="restoreSummary?.headline ?? null"
        @restore="restore"
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
        @verify="verifyAssistedRestore"
        @open-addons="openAddonManager"
      />

      <RestorePanel :summary="restoreSummary" :busy="busy" :available="restoreAvailable" @restore="restore" />
    </template>
  </main>
</template>
