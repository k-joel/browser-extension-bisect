<script setup lang="ts">
import type { NewSessionOffer } from '../presentation';

defineProps<{
  offer: NewSessionOffer;
  busy: boolean;
}>();

const emit = defineEmits<(event: 'start-over') => void>();
</script>

<template>
  <div class="section" data-testid="new-session" :data-blocked="offer.blockedReason !== null">
    <h3 class="section-heading">Search another extension</h3>
    <p class="note" data-testid="new-session-policy">
      A new session starts from your extensions as they are now, with a fresh log. The log of this session is kept in
      your browser until it is replaced.
    </p>
    <p v-if="offer.blockedReason !== null" class="note" data-testid="new-session-note" role="status">
      {{ offer.blockedReason }}
    </p>
    <div class="actions">
      <button
        type="button"
        data-testid="new-session-start"
        :disabled="busy || offer.blockedReason !== null"
        :aria-disabled="busy || offer.blockedReason !== null"
        @click="emit('start-over')"
      >
        {{ offer.label }}
      </button>
    </div>
  </div>
</template>
