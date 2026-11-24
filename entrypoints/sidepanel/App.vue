<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { BisectConfig, CandidateExtension, CapabilityReport, IneligibleExtension } from '@/utils/bisect/domain';
import { messenger } from '@/utils/messaging';
import CandidatePicker from './components/CandidatePicker.vue';
import CapabilityReportView from './components/CapabilityReport.vue';
import NoSession from './components/NoSession.vue';
import { buildPickerRows, intrinsicIneligible } from './presentation';

type PanelState = 'loading' | 'ready' | 'error';

const state = ref<PanelState>('loading');
const capability = ref<CapabilityReport | null>(null);
const eligible = ref<CandidateExtension[]>([]);
const ineligible = ref<IneligibleExtension[]>([]);
const config = ref<BisectConfig | null>(null);
const query = ref('');
const errorMessage = ref<string | null>(null);

const excludedIds = computed(() => config.value?.excludedExtensionIds ?? []);

const rows = computed(() => buildPickerRows(eligible.value, ineligible.value, excludedIds.value));

const unavailable = computed(() => intrinsicIneligible(ineligible.value));

const visibleCount = computed(() => {
  const term = query.value.trim();
  if (term.length === 0) return rows.value.length;
  return rows.value.filter((row) => row.name.toLowerCase().includes(term.toLowerCase())).length;
});

const announcement = computed(() => {
  if (state.value === 'loading') return 'Loading extensions…';
  if (state.value === 'error') return 'Extensions could not be loaded';
  if (rows.value.length === 0) return 'No eligible enabled extensions';
  return `${visibleCount.value} of ${rows.value.length} candidates shown`;
});

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function load(): Promise<void> {
  state.value = 'loading';
  try {
    const [nextCapability, lists, nextConfig] = await Promise.all([
      messenger.sendMessage('getCapabilities'),
      messenger.sendMessage('listCandidates'),
      messenger.sendMessage('getConfig'),
    ]);
    capability.value = nextCapability;
    eligible.value = lists.eligible;
    ineligible.value = lists.ineligible;
    config.value = nextConfig;
    errorMessage.value = null;
    state.value = 'ready';
  } catch (error) {
    errorMessage.value = describeError(error);
    state.value = 'error';
  }
}

async function toggleCandidate(id: string): Promise<void> {
  if (config.value === null) return;
  const nextExcluded = excludedIds.value.includes(id)
    ? excludedIds.value.filter((entry) => entry !== id)
    : [...excludedIds.value, id];

  try {
    config.value = await messenger.sendMessage('updateConfig', { excludedExtensionIds: nextExcluded });
    const lists = await messenger.sendMessage('listCandidates');
    eligible.value = lists.eligible;
    ineligible.value = lists.ineligible;
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = describeError(error);
  }
}

onMounted(load);

defineExpose({ load });
</script>

<template>
  <main class="panel" data-testid="sidepanel-root" :data-state="state">
    <h1 class="title">Extension Bisect</h1>

    <p class="status" data-testid="sidepanel-live" aria-live="polite">{{ announcement }}</p>

    <p v-if="state === 'loading'" class="status" data-testid="sidepanel-loading">Loading extensions…</p>

    <p v-if="errorMessage !== null" class="error" data-testid="sidepanel-error" role="alert">{{ errorMessage }}</p>

    <template v-if="state === 'ready' && capability !== null">
      <CapabilityReportView :capability="capability" />
      <NoSession :browser-name="capability.browserName" />
      <CandidatePicker
        :rows="rows"
        :unavailable="unavailable"
        :query="query"
        @update:query="query = $event"
        @toggle="toggleCandidate"
      />
    </template>
  </main>
</template>
