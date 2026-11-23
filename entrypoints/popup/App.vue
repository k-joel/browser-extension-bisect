<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { type ExtensionState, messenger } from '@/utils/messaging';
import { type BisectSettings, formatStatus } from '@/utils/storage';
import { isTestMode, readTabIdParam } from '@/utils/test-mode';

const state = ref<ExtensionState | null>(null);
const errorMessage = ref<string | null>(null);
const busy = ref(false);
const batchSizeDraft = ref(1);

const testMode = isTestMode();
const targetTabId = testMode ? readTabIdParam(window.location.search) : undefined;

watch(
  () => state.value?.settings.batchSize,
  (next) => {
    if (next !== undefined) batchSizeDraft.value = next;
  },
);

async function loadState(): Promise<void> {
  try {
    state.value = await messenger.sendMessage('getState');
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}

async function sendUpdate(update: Partial<BisectSettings> & { enabled?: boolean }): Promise<void> {
  busy.value = true;
  try {
    state.value = await messenger.sendMessage('updateState', update);
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

async function toggleEnabled(): Promise<void> {
  if (state.value === null) return;
  await sendUpdate({ enabled: !state.value.enabled });
}

async function recordInteraction(): Promise<void> {
  busy.value = true;
  try {
    state.value = await messenger.sendMessage('recordInteraction');
    errorMessage.value = null;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    busy.value = false;
  }
}

async function setBatchSize(size: number): Promise<void> {
  if (!Number.isFinite(size) || size < 1) {
    batchSizeDraft.value = state.value?.settings.batchSize ?? 1;
    return;
  }
  batchSizeDraft.value = size;
  await sendUpdate({ batchSize: size });
}

onMounted(loadState);
</script>

<template>
  <main class="app" data-testid="popup-root">
    <h1 class="title">Extension Bisect</h1>

    <p class="status" data-testid="status" :data-enabled="state?.enabled ?? false">
      {{ state === null ? 'Loading…' : formatStatus(state.enabled, state.interactionCount) }}
    </p>

    <p v-if="errorMessage !== null" class="error" data-testid="error">{{ errorMessage }}</p>

    <p v-if="testMode" class="test-mode" data-testid="test-mode" :data-tab-id="targetTabId ?? ''">
      Test mode{{ targetTabId === undefined ? '' : ` · tab ${targetTabId}` }}
    </p>

    <button
      type="button"
      class="primary"
      data-testid="toggle-enabled"
      :disabled="busy || state === null"
      @click="toggleEnabled"
    >
      {{ state?.enabled ? 'Disable' : 'Enable' }}
    </button>

    <button
      type="button"
      data-testid="record-interaction"
      :disabled="busy || state === null"
      @click="recordInteraction"
    >
      Record interaction
    </button>

    <div class="settings" data-testid="settings">
      <label for="batch-size">Batch size</label>
      <input
        id="batch-size"
        data-testid="batch-size"
        type="number"
        min="1"
        max="100"
        :value="batchSizeDraft"
        @change="setBatchSize(Number(($event.target as HTMLInputElement).value))"
      >
      <span class="settings-json" data-testid="settings-json">{{ JSON.stringify(state?.settings ?? null) }}</span>
    </div>
  </main>
</template>
