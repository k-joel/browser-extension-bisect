<script setup lang="ts">
import type { NewSessionOffer, RestoreSummary } from '../presentation';
import NewSessionAction from './NewSessionAction.vue';

defineProps<{
  summary: RestoreSummary | null;
  offer: NewSessionOffer;
  busy: boolean;
}>();

const emit = defineEmits<(event: 'restore' | 'start-over') => void>();
</script>

<template>
  <section class="section" data-testid="restored-screen" aria-labelledby="restored-heading">
    <h2 id="restored-heading" class="section-heading">Session finished</h2>
    <p class="lead" data-testid="restored-explanation">
      The session is over and the touched extensions are back to their original states.
    </p>
    <p
      v-if="summary !== null"
      :class="summary.complete ? 'note' : 'error'"
      data-testid="restored-summary"
      :data-complete="summary.complete"
    >
      {{ summary.headline }}
    </p>
    <div class="actions">
      <button type="button" data-testid="restored-restore" :disabled="busy" @click="emit('restore')">
        Restore again
      </button>
    </div>

    <NewSessionAction :offer="offer" :busy="busy" @start-over="emit('start-over')" />
  </section>
</template>
