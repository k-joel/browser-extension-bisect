<script setup lang="ts">
import { computed } from 'vue';
import type { StartupReconciliation } from '@/utils/bisect/domain';
import { describeStartupDifference, describeStartupOffer } from '../presentation';

const props = defineProps<{
  reconciliation: StartupReconciliation;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'resume'): void;
  (event: 'restore'): void;
  (event: 'dismiss'): void;
}>();

const offersResume = computed(() => props.reconciliation.offers.includes('resume'));
const offersRestore = computed(() => props.reconciliation.offers.includes('restore'));
const difference = computed(() => describeStartupDifference(props.reconciliation));
</script>

<template>
  <aside
    class="note startup-reconciliation"
    data-testid="startup-reconciliation"
    :data-restarted="reconciliation.restarted"
    :data-status="reconciliation.status"
    aria-live="polite"
  >
    <p class="lead" data-testid="startup-reconciliation-headline">
      {{ reconciliation.restarted ? 'The browser restarted during this session' : 'This session is unfinished' }}
    </p>
    <p class="note" data-testid="startup-reconciliation-detail">{{ describeStartupOffer(reconciliation) }}</p>
    <p class="note" data-testid="startup-reconciliation-difference" :data-differs="difference !== null">
      {{ difference ?? 'The browser matches the state this session last asked for.' }}
    </p>
    <div class="actions" data-testid="startup-reconciliation-actions">
      <button
        v-if="offersResume"
        type="button"
        class="primary"
        data-testid="startup-resume"
        :disabled="busy"
        @click="emit('resume')"
      >
        Resume the session
      </button>
      <button
        v-if="offersRestore"
        type="button"
        data-testid="startup-restore"
        :disabled="busy"
        @click="emit('restore')"
      >
        Restore all extensions
      </button>
      <button type="button" data-testid="startup-dismiss" :disabled="busy" @click="emit('dismiss')">
        Decide later
      </button>
    </div>
  </aside>
</template>
