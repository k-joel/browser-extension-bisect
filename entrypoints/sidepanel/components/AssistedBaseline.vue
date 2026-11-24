<script setup lang="ts">
import { computed } from 'vue';
import type { ManualBatch, SessionView } from '@/utils/bisect/domain';
import {
  formatManualProgress,
  type ManualProgress,
  manualChecklistLines,
  manualInstruction,
  plural,
} from '../presentation';

const props = defineProps<{
  session: SessionView;
  batch: ManualBatch | null;
  progress: ManualProgress | null;
  busy: boolean;
  addonManagerMessage: string | null;
}>();

const emit = defineEmits<{
  (event: 'open-addons'): void;
  (event: 'verify'): void;
  (event: 'attest'): void;
  (event: 'copy'): void;
  (event: 'reload'): void;
}>();

const candidates = computed(() => props.session.candidateOrder);

const checklist = computed(() => (props.batch === null ? [] : manualChecklistLines(props.batch, candidates.value)));

const instruction = computed(() => (props.batch === null ? null : manualInstruction(props.batch, candidates.value)));

const progressLabel = computed(() => (props.progress === null ? null : formatManualProgress(props.progress)));

const offCount = computed(() => {
  const progress = props.progress;
  if (progress === null) return 0;
  return progress.done;
});

const needsManualToggle = computed(
  () => props.batch !== null && !(props.batch.enableIds.length === 0 && props.batch.disableIds.length === 0),
);

const copyText = computed(() => checklist.value.map((row) => `${row.name}: ${row.target}`).join('\n'));

async function copyList(): Promise<void> {
  try {
    await navigator.clipboard.writeText(copyText.value);
  } catch {
    // The list is still visible; a clipboard denial must not break the flow.
  }
  emit('copy');
}
</script>

<template>
  <section class="section assisted" data-testid="assisted-baseline" aria-labelledby="assisted-heading">
    <h2 id="assisted-heading" class="section-heading">Baseline in assisted mode</h2>

    <p class="lead" data-testid="assisted-explanation">
      This browser does not let the add-on toggle extensions, so you apply the baseline yourself. Pick either route.
    </p>

    <div class="section" data-testid="assisted-external">
      <h3 class="section-heading">Fastest: check it in Troubleshoot Mode</h3>
      <p class="note" data-testid="assisted-external-instruction">
        Open Troubleshoot Mode to turn every extension off at once, retest the problem there, then come back and attest.
      </p>
      <div class="actions">
        <button type="button" class="primary" data-testid="assisted-attest" :disabled="busy" @click="emit('attest')">
          The problem is gone with every extension off
        </button>
      </div>
    </div>

    <div class="section" data-testid="assisted-manual">
      <h3 class="section-heading">Or turn each extension off yourself</h3>
      <p v-if="instruction !== null" class="note" data-testid="assisted-manual-instruction">{{ instruction }}</p>

      <div class="actions">
        <button type="button" data-testid="assisted-open-addons" :disabled="busy" @click="emit('open-addons')">
          Open the Add-ons Manager
        </button>
        <button
          type="button"
          data-testid="assisted-verify"
          :disabled="busy || !needsManualToggle"
          @click="emit('verify')"
        >
          Verify the state
        </button>
      </div>

      <p v-if="addonManagerMessage !== null" class="note" data-testid="assisted-addons-message">
        {{ addonManagerMessage }}
      </p>

      <p
        v-if="progressLabel !== null"
        class="note assisted-progress"
        data-testid="assisted-progress"
        aria-live="polite"
      >
        {{ progressLabel }} · {{ offCount }} of {{ progress?.total }} extensions are in the baseline state
      </p>

      <ul class="list" data-testid="assisted-checklist" aria-label="Extensions to turn off">
        <li
          v-for="row in checklist"
          :key="row.id"
          class="ext preview"
          data-testid="assisted-checklist-row"
          :data-extension-id="row.id"
          :data-state="row.target"
        >
          <span class="ext-name">
            <span class="ext-name-text" data-testid="assisted-checklist-name">{{ row.name }}</span>
            <span class="ext-version" data-testid="assisted-checklist-target">{{ row.target }}</span>
          </span>
          <span
            class="ext-reason checklist-done"
            data-testid="assisted-checklist-done"
            :data-done="progress !== null && !progress.remainingIds.includes(row.id) ? 'true' : 'false'"
          >
            {{ progress !== null && !progress.remainingIds.includes(row.id) ? 'Done' : 'Waiting' }}
          </span>
        </li>
      </ul>

      <div class="actions">
        <button type="button" data-testid="assisted-copy" :disabled="busy || checklist.length === 0" @click="copyList">
          Copy the list
        </button>
        <button type="button" data-testid="assisted-reload" :disabled="busy" @click="emit('reload')">
          Reload the test tab
        </button>
      </div>
    </div>

    <p class="note" data-testid="assisted-restore-note">
      Restore asks you to turn {{ plural(session.candidateOrder.length, 'extension') }} back on and checks each one.
      Nothing is toggled for you.
    </p>
  </section>
</template>
