<script setup lang="ts">
import { computed } from 'vue';
import type { CopyStatus } from '../clipboard';
import type { HistoryEntry, HistoryModel } from '../history';
import { plural } from '../presentation';
import CopyStatusView from './CopyStatus.vue';

const props = defineProps<{
  model: HistoryModel;
  busy: boolean;
  copyStatus: CopyStatus | null;
}>();

const emit = defineEmits<{
  (event: 'back'): void;
  (event: 'copy-log'): void;
  (event: 'copy-report'): void;
  (event: 'replay'): void;
}>();

const candidates = computed(() => props.model.candidateNames);

const outcomeNames = computed(() => props.model.outcome.names);

function batchLabel(names: string[]): string {
  return names.length === 0 ? 'None' : names.join(', ');
}

function isBaseline(entry: HistoryEntry): boolean {
  return entry.kind === 'baseline';
}
</script>

<template>
  <section class="section" data-testid="history-screen" aria-labelledby="history-heading">
    <h2 id="history-heading" class="section-heading">Session history</h2>
    <p class="lead" data-testid="history-session-id">Session {{ model.sessionId }}</p>
    <p class="note" data-testid="history-candidates">
      {{ plural(candidates.length, 'candidate') }} in the captured order: {{ batchLabel(candidates) }}
    </p>
    <p class="note" data-testid="history-baseline-mode">
      {{ model.baselineModeLabel }} baseline · {{ model.testTabLabel }}
    </p>

    <ol class="list" data-testid="history-list">
      <li
        v-for="entry in model.entries"
        :key="entry.key"
        class="history"
        data-testid="history-entry"
        :data-round="entry.round"
        :data-kind="entry.kind"
      >
        <p class="history-heading" data-testid="history-entry-round">{{ entry.roundLabel }}</p>
        <p class="note" data-testid="history-entry-enabled">Enabled: {{ batchLabel(entry.enabledNames) }}</p>
        <p class="note" data-testid="history-entry-disabled">Disabled: {{ batchLabel(entry.disabledNames) }}</p>
        <p class="note" data-testid="history-entry-verdict">{{ entry.verdictLabel }}</p>
        <p
          v-if="entry.retryLabel !== null"
          class="note"
          data-testid="history-entry-retry"
          :data-retries="entry.retries"
        >
          {{ entry.retryLabel }}
        </p>
        <p v-if="entry.note !== null" class="note" data-testid="history-entry-note">{{ entry.note }}</p>
        <p v-if="isBaseline(entry)" class="note" data-testid="history-entry-baseline">All-off baseline check</p>
      </li>
    </ol>

    <section class="section" data-testid="history-outcome" :data-outcome="model.outcome.kind" aria-live="polite">
      <h3 class="section-heading">Outcome</h3>
      <p class="lead" data-testid="history-outcome-label">{{ model.outcome.label }}</p>
      <ul v-if="outcomeNames.length > 0" class="list" data-testid="history-outcome-names">
        <li v-for="name in outcomeNames" :key="name" class="ext" data-testid="history-outcome-name">
          <span class="ext-name">
            <span class="ext-name-text">{{ name }}</span>
          </span>
        </li>
      </ul>
      <p v-if="model.outcome.note !== null" class="note" data-testid="history-outcome-note">{{ model.outcome.note }}</p>
    </section>

    <div class="actions">
      <button type="button" data-testid="history-copy-log" :disabled="busy" @click="emit('copy-log')">
        Copy the bisect log
      </button>
      <button type="button" data-testid="history-copy-report" :disabled="busy" @click="emit('copy-report')">
        Copy the report
      </button>
    </div>

    <CopyStatusView :status="copyStatus" />

    <div class="actions">
      <button type="button" data-testid="history-back" :disabled="busy" @click="emit('back')">
        Back to the session
      </button>
      <button type="button" data-testid="history-replay" :disabled="busy" @click="emit('replay')">
        Correct a verdict and replay
      </button>
    </div>
    <p id="history-replay-note" class="note" data-testid="history-replay-note">
      Replay works on a copy of the log and never changes installed extensions.
    </p>
  </section>
</template>
