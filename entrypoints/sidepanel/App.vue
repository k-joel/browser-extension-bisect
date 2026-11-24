<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type {
  BisectConfig,
  CandidateExtension,
  CapabilityReport,
  IneligibleExtension,
  SessionView,
  Verdict,
} from '@/utils/bisect/domain';
import { messenger, type SessionMutationResult } from '@/utils/messaging';
import BaselineScreen from './components/BaselineScreen.vue';
import CandidatePicker from './components/CandidatePicker.vue';
import CapabilityReportView from './components/CapabilityReport.vue';
import CompletedScreen from './components/CompletedScreen.vue';
import HostIssueScreen from './components/HostIssueScreen.vue';
import NoSession from './components/NoSession.vue';
import PreflightConsent from './components/PreflightConsent.vue';
import RestoredScreen from './components/RestoredScreen.vue';
import RestorePanel from './components/RestorePanel.vue';
import SessionProgress from './components/SessionProgress.vue';
import {
  buildPickerRows,
  describeProgress,
  findCandidate,
  formatTestTab,
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

const excludedIds = computed(() => config.value?.excludedExtensionIds ?? []);

const rows = computed(() => buildPickerRows(eligible.value, excludedIds.value));

const unavailable = computed(() => ineligible.value);

const included = computed(() => selectIncludedCandidates(eligible.value, excludedIds.value));

const testTab = computed(() => config.value?.testTab ?? null);

const testTabWarning = computed(() =>
  testTab.value === null ? 'No test tab is bound yet. Bind one so the baseline can reload it.' : null,
);

const blockedReason = computed(() => {
  if (capability.value !== null && !capability.value.canAutoToggle) {
    return 'Automatic toggling is unavailable in this browser, so the automated baseline cannot run.';
  }
  return included.value.length === 0 ? 'No eligible enabled extensions.' : null;
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

const announcement = computed(() => {
  if (state.value === 'loading') return 'Loading extensions…';
  if (state.value === 'error') return 'Extensions could not be loaded';
  switch (screen.value) {
    case 'preflight':
      return `${plural(included.value.length, 'extension')} will be disabled. Nothing is toggled yet.`;
    case 'baseline':
      return 'Baseline ready. Answer whether the problem persists.';
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
  const result = await run(() =>
    messenger.sendMessage('startSession', {
      candidateIds,
      baselineMode: 'auto',
      testTab: testTab.value,
    }),
  );
  if (result === null) return;
  session.value = result;
  preflightOpen.value = false;
  restoreOutcome.value = null;
}

function applyMutation(result: SessionMutationResult): void {
  session.value = result.session;
  if (result.restore !== null) restoreOutcome.value = result.restore;
}

async function submitVerdict(verdict: Verdict): Promise<void> {
  const result = await run(() => messenger.sendMessage('submitVerdict', { verdict }));
  if (result !== null) applyMutation(result);
}

async function restore(): Promise<void> {
  const result = await run(() => messenger.sendMessage('resetSession', { restore: true }));
  if (result !== null) applyMutation(result);
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

      <BaselineScreen
        v-else-if="screen === 'baseline'"
        :busy="busy"
        :reload-message="reloadMessage"
        @verdict="submitVerdict"
        @reload="reloadTestTab"
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
          @update:query="query = $event"
          @toggle="toggleCandidate"
          @start="openPreflight"
        />
      </template>

      <RestorePanel :summary="restoreSummary" :busy="busy" :available="restoreAvailable" @restore="restore" />
    </template>
  </main>
</template>
