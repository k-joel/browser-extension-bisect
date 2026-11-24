<script setup lang="ts">
import type { CandidateExtension } from '@/utils/bisect/domain';

defineProps<{
  culprit: CandidateExtension | null;
  culpritId: string;
  busy: boolean;
  restoreSummaryHeadline: string | null;
}>();

const emit = defineEmits<{
  (event: 'restore'): void;
  (event: 'history'): void;
}>();
</script>

<template>
  <section class="section" data-testid="completed-screen" aria-labelledby="completed-heading">
    <h2 id="completed-heading" class="section-heading">Culprit identified</h2>
    <p class="lead" data-testid="culprit-name">
      {{ culprit?.name ?? culpritId }}
    </p>
    <p class="note" data-testid="culprit-detail">
      The culprit is still disabled. Press Restore to enable it again, or keep it disabled and remove it.
    </p>
    <p v-if="restoreSummaryHeadline !== null" class="note" data-testid="completed-restore-summary">
      {{ restoreSummaryHeadline }}
    </p>
    <div class="actions">
      <button type="button" data-testid="completed-restore" :disabled="busy" @click="emit('restore')">Restore</button>
    </div>

    <div class="actions">
      <button type="button" data-testid="completed-history" :disabled="busy" @click="emit('history')">
        Show the session history
      </button>
      <button type="button" data-testid="completed-replay" disabled aria-describedby="completed-replay-note">
        Correct a verdict and replay
      </button>
    </div>
    <p id="completed-replay-note" class="note" data-testid="completed-replay-note">
      Replay is not available yet. The history lists every trial so the conclusion is already legible.
    </p>
  </section>
</template>
