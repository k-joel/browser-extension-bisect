<script setup lang="ts">
import { computed } from 'vue';
import type { ManualBatch, SessionView } from '@/utils/bisect/domain';
import {
  formatTrialProgress,
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
  (event: 'reload'): void;
}>();

const candidates = computed(() => props.session.candidateOrder);

const checklist = computed(() => (props.batch === null ? [] : manualChecklistLines(props.batch, candidates.value)));

const enableRows = computed(() => checklist.value.filter((row) => row.target === 'On'));
const disableRows = computed(() => checklist.value.filter((row) => row.target === 'Off'));

const instruction = computed(() => (props.batch === null ? null : manualInstruction(props.batch, candidates.value)));

const progressLabel = computed(() => (props.progress === null ? null : formatTrialProgress(props.progress)));

const matched = computed(() => props.progress?.complete ?? false);

const trial = computed(() => props.session.currentTrial);
const round = computed(() => trial.value?.round ?? 1);

function doneOf(id: string): boolean {
  const progress = props.progress;
  if (progress === null) return false;
  return !progress.remainingIds.includes(id);
}

const copyText = computed(() => checklist.value.map((row) => `${row.name}: ${row.target}`).join('\n'));

async function copyList(): Promise<void> {
  try {
    await navigator.clipboard.writeText(copyText.value);
  } catch {
    // The list stays visible; a clipboard denial must not block the flow.
  }
}
</script>

<template>
  <section class="section assisted" data-testid="assisted-trial" aria-labelledby="assisted-trial-heading">
    <h2 id="assisted-trial-heading" class="section-heading">Trial {{ round }} in assisted mode</h2>

    <p class="lead" data-testid="assisted-trial-explanation">
      This browser does not let the add-on toggle extensions, so match this batch in the Add-ons Manager yourself. The
      verdict appears once the add-on has verified the state.
    </p>

    <p v-if="instruction !== null" class="note" data-testid="assisted-trial-instruction">{{ instruction }}</p>

    <div class="actions">
      <button
        type="button"
        class="primary"
        data-testid="assisted-trial-open-addons"
        :disabled="busy"
        @click="emit('open-addons')"
      >
        Open the Add-ons Manager
      </button>
      <button type="button" data-testid="assisted-trial-verify" :disabled="busy" @click="emit('verify')">
        Verify the state
      </button>
    </div>

    <p v-if="addonManagerMessage !== null" class="note" data-testid="assisted-trial-addons-message">
      {{ addonManagerMessage }}
    </p>

    <p
      v-if="progressLabel !== null"
      class="note assisted-progress"
      data-testid="assisted-trial-progress"
      :data-matched="String(matched)"
      aria-live="polite"
    >
      {{ progressLabel }}
    </p>

    <section class="section" data-testid="assisted-trial-enable-list" aria-labelledby="assisted-trial-enable-heading">
      <h3 id="assisted-trial-enable-heading" class="section-heading">
        Keep on ({{ plural(enableRows.length, 'extension') }})
      </h3>
      <ul class="list">
        <li
          v-for="row in enableRows"
          :key="row.id"
          class="ext preview"
          data-testid="assisted-trial-enable-row"
          :data-extension-id="row.id"
        >
          <span class="ext-name">
            <span class="ext-name-text" data-testid="assisted-trial-enable-name">{{ row.name }}</span>
          </span>
          <span class="ext-reason" data-testid="assisted-trial-enable-state" :data-done="String(doneOf(row.id))">
            {{ doneOf(row.id) ? 'On' : 'Turn on' }}
          </span>
        </li>
      </ul>
    </section>

    <section class="section" data-testid="assisted-trial-disable-list" aria-labelledby="assisted-trial-disable-heading">
      <h3 id="assisted-trial-disable-heading" class="section-heading">
        Turn off ({{ plural(disableRows.length, 'extension') }})
      </h3>
      <ul class="list">
        <li
          v-for="row in disableRows"
          :key="row.id"
          class="ext preview"
          data-testid="assisted-trial-disable-row"
          :data-extension-id="row.id"
        >
          <span class="ext-name">
            <span class="ext-name-text" data-testid="assisted-trial-disable-name">{{ row.name }}</span>
          </span>
          <span class="ext-reason" data-testid="assisted-trial-disable-state" :data-done="String(doneOf(row.id))">
            {{ doneOf(row.id) ? 'Off' : 'Turn off' }}
          </span>
        </li>
      </ul>
    </section>

    <div class="actions">
      <button
        type="button"
        data-testid="assisted-trial-copy"
        :disabled="busy || checklist.length === 0"
        @click="copyList"
      >
        Copy the lists
      </button>
      <button type="button" data-testid="assisted-trial-reload" :disabled="busy" @click="emit('reload')">
        Reload the test tab
      </button>
    </div>

    <p class="note" data-testid="assisted-trial-verdict-note">
      {{
        matched
          ? 'Every extension matches the batch. Verify to record your verdict.'
          : 'The verdict buttons appear after the add-on verifies that the batch is in place.'
      }}
    </p>
  </section>
</template>
