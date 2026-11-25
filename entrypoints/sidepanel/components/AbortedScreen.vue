<script setup lang="ts">
import type { NewSessionOffer } from '../presentation';
import NewSessionAction from './NewSessionAction.vue';

defineProps<{
  restoreSummaryHeadline: string | null;
  offer: NewSessionOffer;
  busy: boolean;
}>();

const emit = defineEmits<(event: 'restore' | 'start-over') => void>();
</script>

<template>
  <section class="section" data-testid="aborted-screen" aria-labelledby="aborted-heading">
    <h2 id="aborted-heading" class="section-heading">Session stopped</h2>

    <!--
      SPEC §Error handling, `User aborts`: the decision to stop without restoring is
      recorded, not inferred. The screen therefore says the extensions the session changed
      are still where the session left them instead of claiming a restore it never ran.
    -->
    <p class="lead" data-testid="aborted-explanation">
      You stopped the session without restoring. The extensions this session changed are still in the state the session
      left them, so the culprit is still disabled.
    </p>
    <p class="note" data-testid="aborted-guidance">
      Your decision is recorded in the bisect log. Press Restore to put every touched extension back to its original
      state.
    </p>

    <p v-if="restoreSummaryHeadline !== null" class="note" data-testid="aborted-restore-summary">
      {{ restoreSummaryHeadline }}
    </p>

    <div class="actions">
      <button type="button" class="primary" data-testid="aborted-restore" :disabled="busy" @click="emit('restore')">
        Restore all extensions
      </button>
    </div>

    <NewSessionAction :offer="offer" :busy="busy" @start-over="emit('start-over')" />
  </section>
</template>
