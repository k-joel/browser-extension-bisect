<script setup lang="ts">
import type { Verdict } from '@/utils/bisect/domain';
import { VERDICT_LABELS } from '../presentation';

defineProps<{
  busy: boolean;
  reloadMessage: string | null;
}>();

const emit = defineEmits<{
  (event: 'verdict', verdict: Verdict): void;
  (event: 'reload'): void;
}>();
</script>

<template>
  <section class="section" data-testid="baseline-screen" aria-labelledby="baseline-heading">
    <h2 id="baseline-heading" class="section-heading">Baseline check</h2>
    <p class="lead" data-testid="baseline-question">
      Every candidate extension is now disabled. Does the problem still happen?
    </p>
    <p class="note" data-testid="baseline-detail">
      Reload or retest the page in the test tab, then answer. The culprit stays disabled until you press Restore.
    </p>

    <div class="actions">
      <button type="button" data-testid="verdict-persists" :disabled="busy" @click="emit('verdict', 'persists')">
        {{ VERDICT_LABELS.persists }}
      </button>
      <button
        type="button"
        class="primary"
        data-testid="verdict-gone"
        :disabled="busy"
        @click="emit('verdict', 'gone')"
      >
        {{ VERDICT_LABELS.gone }}
      </button>
    </div>

    <div class="actions">
      <button type="button" data-testid="baseline-reload" :disabled="busy" @click="emit('reload')">
        Reload the test tab
      </button>
    </div>
    <p v-if="reloadMessage !== null" class="note" data-testid="baseline-reload-status">{{ reloadMessage }}</p>
  </section>
</template>
