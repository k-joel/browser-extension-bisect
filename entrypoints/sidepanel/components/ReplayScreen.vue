<script setup lang="ts">
import { computed } from 'vue';
import type { BatchDifference, ReplayResult } from '@/utils/bisect/domain';
import type { CopyStatus } from '../clipboard';
import { plural } from '../presentation';
import type { ReplayRoundRow } from '../replay';
import CopyStatusView from './CopyStatus.vue';

const props = defineProps<{
  rounds: ReplayRoundRow[];
  result: ReplayResult | null;
  differences: BatchDifference[];
  corrections: number;
  nameOf: (id: string) => string;
  busy: boolean;
  copyStatus: CopyStatus | null;
}>();

const emit = defineEmits<{
  (event: 'correct', round: number): void;
  (event: 'replay'): void;
  (event: 'reset-edits'): void;
  (event: 'copy-report'): void;
  (event: 'back'): void;
}>();

const invalid = computed(() => props.result?.validationError ?? null);

const outcomeLabel = computed(() => {
  const result = props.result;
  if (result === null) return null;
  if (result.culpritId !== null) return `Replayed culprit: ${props.nameOf(result.culpritId)}`;
  if (result.ambiguityIds.length > 0) {
    return `Replayed outcome: inconclusive — ${result.ambiguityIds.map(props.nameOf).join(', ')}`;
  }
  return 'Replayed outcome: inconclusive, no single culprit';
});

const invalidEventLabel = computed(() => {
  const error = invalid.value;
  if (error === null) return null;
  const type = error.eventType === null ? 'unknown event' : error.eventType;
  return `Event ${error.eventIndex} (${type})`;
});

function batchLabel(ids: readonly string[]): string {
  return ids.length === 0 ? 'None' : ids.map(props.nameOf).join(', ');
}

function differenceLabel(difference: BatchDifference): string {
  return difference.round === 0 ? 'Baseline check' : `Trial ${difference.round}`;
}
</script>

<template>
  <section class="section" data-testid="replay-screen" aria-labelledby="replay-heading">
    <h2 id="replay-heading" class="section-heading">Replay a corrected verdict</h2>

    <p class="note" data-testid="replay-diagnostic-notice" role="note">
      Replay recomputes the result. It does not change installed extensions.
    </p>
    <p class="note" data-testid="replay-source-note">
      You are editing a copy. The live log stays append-only and visibly unchanged.
    </p>

    <p v-if="rounds.length === 0" class="note" data-testid="replay-empty">
      This log has no partition verdict to correct.
    </p>

    <ol v-else class="list" data-testid="replay-rounds">
      <li
        v-for="round in rounds"
        :key="round.round"
        class="history"
        data-testid="replay-round"
        :data-round="round.round"
        :data-corrected="round.corrected ? 'true' : 'false'"
      >
        <p class="history-heading" data-testid="replay-round-label">Trial {{ round.round }}</p>
        <p class="note" data-testid="replay-round-original">Recorded: {{ round.recordedLabel }}</p>
        <p class="note" data-testid="replay-round-edited">Copy: {{ round.editedLabel }}</p>
        <div class="actions">
          <button
            type="button"
            :data-testid="`replay-correct-${round.round}`"
            :disabled="busy"
            @click="emit('correct', round.round)"
          >
            {{ round.corrected ? `Undo the correction on trial ${round.round}` : `Correct trial ${round.round}` }}
          </button>
        </div>
      </li>
    </ol>

    <p v-if="corrections > 0" class="note" data-testid="replay-correction-count">
      {{ plural(corrections, 'verdict') }} corrected on this copy.
    </p>

    <div class="actions">
      <button
        type="button"
        class="primary"
        data-testid="replay-run"
        :disabled="busy || rounds.length === 0"
        @click="emit('replay')"
      >
        Replay the corrected copy
      </button>
      <button
        type="button"
        data-testid="replay-reset-edits"
        :disabled="busy || corrections === 0"
        @click="emit('reset-edits')"
      >
        Discard the corrections
      </button>
    </div>

    <section
      v-if="result !== null"
      class="section"
      data-testid="replay-result"
      :data-outcome="invalid !== null ? 'invalid' : result.culpritId === null ? 'inconclusive' : 'culprit'"
      aria-live="polite"
    >
      <h3 class="section-heading">Replay result</h3>

      <template v-if="invalid !== null">
        <p class="error" data-testid="replay-invalid-message" role="alert">
          The edited copy is invalid. {{ invalid.message }}
        </p>
        <p class="note" data-testid="replay-invalid-event">First invalid event: {{ invalidEventLabel }}</p>
        <p class="note" data-testid="replay-invalid-note">Fix the copy and replay again.</p>
      </template>

      <template v-else>
        <p class="lead" data-testid="replay-outcome">{{ outcomeLabel }}</p>
        <p class="note" data-testid="replay-trials-count">
          {{ plural(result.trials.length, 'recomputed trial') }}
        </p>

        <ol v-if="result.trials.length > 0" class="list" data-testid="replay-trials">
          <li
            v-for="trial in result.trials"
            :key="trial.round"
            class="history"
            data-testid="replay-trial"
            :data-round="trial.round"
          >
            <p class="history-heading" data-testid="replay-trial-round">Trial {{ trial.round }}</p>
            <p class="note" data-testid="replay-trial-enabled">Enabled: {{ batchLabel(trial.enabledIds) }}</p>
            <p class="note" data-testid="replay-trial-disabled">Disabled: {{ batchLabel(trial.disabledIds) }}</p>
          </li>
        </ol>

        <p
          class="note"
          data-testid="replay-differences-status"
          :data-differences="differences.length === 0 ? 'none' : 'present'"
        >
          {{
            differences.length === 0
              ? 'The recorded batches all match the recomputed ones.'
              : 'The recorded batches differ from the recomputed ones.'
          }}
        </p>

        <ol v-if="differences.length > 0" class="list" data-testid="replay-differences">
          <li
            v-for="difference in differences"
            :key="difference.round"
            class="history"
            data-testid="replay-difference"
            :data-round="difference.round"
          >
            <p class="history-heading" data-testid="replay-difference-label">
              {{ differenceLabel(difference) }} — recorded batch differs
            </p>
            <p class="note" data-testid="replay-difference-enabled">
              Recorded enabled: {{ batchLabel(difference.recordedEnabledIds) }}
            </p>
            <p class="note" data-testid="replay-difference-disabled">
              Recorded disabled: {{ batchLabel(difference.recordedDisabledIds) }}
            </p>
            <p class="note" data-testid="replay-difference-recomputed-enabled">
              Recomputed enabled: {{ batchLabel(difference.recomputedEnabledIds) }}
            </p>
            <p class="note" data-testid="replay-difference-recomputed-disabled">
              Recomputed disabled: {{ batchLabel(difference.recomputedDisabledIds) }}
            </p>
          </li>
        </ol>

        <div class="actions">
          <button type="button" data-testid="replay-copy-report" :disabled="busy" @click="emit('copy-report')">
            Copy the replay report
          </button>
        </div>
      </template>

      <CopyStatusView :status="copyStatus" />
    </section>

    <div class="actions">
      <button type="button" data-testid="replay-back" :disabled="busy" @click="emit('back')">
        Back to the session
      </button>
    </div>
  </section>
</template>
