<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  busy: boolean;
}>();

const emit = defineEmits<(event: 'abort', restore: boolean) => void>();

const asking = ref(false);

/**
 * SPEC §Error handling, `User aborts`: the action stops the session and the panel asks
 * "Restore all extensions?" first, defaulting to yes.
 *
 * The default is marked on the button itself (`data-default` plus the primary style)
 * rather than implied by the reading order, so the answer the add-on recommends is the
 * one a keyboard user reaches first and the one a test can assert.
 */
</script>

<template>
  <div class="section abort" data-testid="abort-panel">
    <template v-if="asking">
      <h3 class="section-heading" data-testid="abort-question">Restore all extensions?</h3>
      <p class="note" data-testid="abort-detail">
        Stopping ends this session. Every extension it changed keeps its current state unless you restore it now.
      </p>
      <div class="actions">
        <button
          type="button"
          class="primary"
          data-testid="abort-restore"
          data-default="true"
          :disabled="busy"
          @click="emit('abort', true)"
        >
          Restore all extensions and stop
        </button>
        <button type="button" data-testid="abort-leave" :disabled="busy" @click="emit('abort', false)">
          Stop and keep the extensions as they are
        </button>
        <button type="button" data-testid="abort-cancel" :disabled="busy" @click="asking = false">Keep testing</button>
      </div>
    </template>

    <template v-else>
      <div class="actions">
        <button type="button" data-testid="abort-session" :disabled="busy" @click="asking = true">
          Stop this session
        </button>
      </div>
      <p class="note" data-testid="abort-note">
        Stopping asks whether to restore the extensions this session changed. Restore stays available afterwards.
      </p>
    </template>
  </div>
</template>
