<script setup lang="ts">
import { computed } from 'vue';
import type { SessionView } from '@/utils/bisect/domain';
import { type DriftSummary, describeDriftCause, formatSyncState, summarizeDriftView } from '../presentation';

const props = defineProps<{
  session: SessionView;
  busy: boolean;
  /** Why Undo is not offered right now; `null` means it is available. */
  undoBlockedReason: string | null;
}>();

const emit = defineEmits<{
  (event: 'resync'): void;
  (event: 'undo'): void;
  (event: 'restore'): void;
}>();

const EMPTY_SUMMARY: DriftSummary = { categories: [], rows: [], missing: [] };

const summary = computed<DriftSummary>(() => {
  const drift = props.session.pause?.drift ?? null;
  return drift === null ? EMPTY_SUMMARY : summarizeDriftView(drift, props.session.candidateOrder);
});

const cause = computed(() => describeDriftCause(props.session.pause?.drift ?? null));
const undoAvailable = computed(() => props.undoBlockedReason === null);
const undoDisabled = computed(() => props.busy || !undoAvailable.value);

const trialLabel = computed(() => {
  const round = props.session.currentTrial?.round ?? null;
  if (round === null) return 'no trial';
  return round === 0 ? 'the baseline check' : `trial ${round}`;
});
</script>

<template>
  <section class="section paused" data-testid="paused-screen" aria-labelledby="paused-heading">
    <h2 id="paused-heading" class="section-heading">Paused on drift</h2>
    <p class="lead" data-testid="paused-cause">{{ cause }}</p>
    <p class="note" data-testid="paused-trial">
      The pause interrupted {{ trialLabel }}. Nothing was toggled while the session was paused.
    </p>

    <p v-if="summary.rows.length === 0" class="note" data-testid="paused-no-comparison" role="status">
      The pause recorded no per-candidate comparison, so only the recovery actions are available.
    </p>

    <template v-else>
      <h3 class="section-heading">Expected versus actual</h3>
      <ul class="list" data-testid="drift-comparison">
        <li
          v-for="row in summary.rows"
          :key="row.id"
          class="ext drift-row"
          data-testid="drift-row"
          :data-extension-id="row.id"
          :data-differs="row.differs"
        >
          <span class="ext-name-text" data-testid="drift-row-name">{{ row.name }}</span>
          <span class="ext-reason" data-testid="drift-row-state">{{ formatSyncState(row.expected, row.actual) }}</span>
        </li>
      </ul>
    </template>

    <div class="drift-categories" data-testid="drift-categories">
      <div
        v-for="category in summary.categories"
        :key="category.category"
        class="drift-category"
        :data-testid="`drift-category-${category.category}`"
        :data-category="category.category"
        :data-count="category.ids.length"
      >
        <h3 class="section-heading" data-testid="drift-category-label">{{ category.label }}</h3>
        <p class="note" data-testid="drift-category-detail">{{ category.detail }}</p>
        <ul v-if="category.ids.length > 0" class="list">
          <li
            v-for="(id, index) in category.ids"
            :key="`${category.category}-${id}`"
            class="ext"
            data-testid="drift-category-entry"
            :data-extension-id="id"
          >
            <span class="ext-name-text" data-testid="drift-category-name">{{ category.names[index] }}</span>
          </li>
        </ul>
        <p v-else class="note" data-testid="drift-category-none">None.</p>
      </div>
    </div>

    <div class="actions" data-testid="paused-actions">
      <button type="button" class="primary" data-testid="paused-resync" :disabled="busy" @click="emit('resync')">
        Re-sync
      </button>
      <button
        type="button"
        data-testid="paused-undo"
        :disabled="undoDisabled"
        :aria-disabled="undoDisabled"
        :data-eligible="undoAvailable"
        @click="emit('undo')"
      >
        Undo last verdict
      </button>
      <button type="button" data-testid="paused-restore" :disabled="busy" @click="emit('restore')">Restore all</button>
    </div>

    <p v-if="!undoAvailable" class="note" data-testid="paused-undo-blocked">
      Undo last verdict is unavailable: {{ undoBlockedReason }} Re-sync or Restore all instead.
    </p>
    <p class="note" data-testid="paused-undo-note">
      Undo is only offered for the most recent trial, and only while the browser state is consistent.
    </p>
  </section>
</template>
