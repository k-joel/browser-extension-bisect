<script setup lang="ts">
import { computed } from 'vue';
import type { SessionView, Verdict } from '@/utils/bisect/domain';
import {
  ambiguityNames,
  describeProgress,
  describeTrialHistory,
  findCandidate,
  isTrialQuestion,
  needsNextTrial,
  partitionPreview,
  VERDICT_LABELS,
} from '../presentation';
import TrialHistory from './TrialHistory.vue';

const props = defineProps<{
  session: SessionView;
  busy: boolean;
  reloadMessage: string | null;
}>();

const emit = defineEmits<{
  (event: 'apply-trial'): void;
  (event: 'retry-trial'): void;
  (event: 'verdict', verdict: Verdict): void;
  (event: 'reload'): void;
  (event: 'history'): void;
}>();

const asking = computed(() => isTrialQuestion(props.session));
const awaitingApply = computed(() => needsNextTrial(props.session));
const trial = computed(() => props.session.currentTrial);

const preview = computed(() => partitionPreview(props.session.suspects));

const nextRound = computed(() => {
  const rounds = props.session.trials.map((entry) => entry.round);
  return rounds.length === 0 ? 1 : Math.max(...rounds) + 1;
});

const enabledPreviewNames = computed(() => preview.value.enabled.map(nameOf));
const disabledPreviewNames = computed(() => preview.value.disabled.map(nameOf));

function nameOf(id: string): string {
  return findCandidate(props.session.candidateOrder, id)?.name ?? id;
}

const appliedEnabledNames = computed(() => (trial.value?.enabledIds ?? []).map(nameOf));
const appliedDisabledNames = computed(() => (trial.value?.disabledIds ?? []).map(nameOf));

const progressLabel = computed(() => describeProgress(props.session));
const history = computed(() => describeTrialHistory(props.session));
const ambiguity = computed(() => ambiguityNames(props.session));

const isFinalConfirmation = computed(() => {
  const suspects = props.session.suspects;
  if (suspects.length !== 1) return false;
  const disabled = asking.value ? (trial.value?.disabledIds ?? []) : preview.value.disabled;
  return disabled.length === 1 && disabled[0] === suspects[0];
});

const question = computed(() => {
  if (!asking.value) {
    return isFinalConfirmation.value
      ? 'The final confirmation disables the only remaining suspect; "Problem is gone" identifies it.'
      : 'The next trial re-enables the first half of the remaining suspects and disables the second half.';
  }
  return isFinalConfirmation.value
    ? 'The last remaining candidate extension is disabled. Does the problem still happen?'
    : 'Does the problem still happen with this batch applied?';
});
</script>

<template>
  <section class="section" data-testid="trial-screen" aria-labelledby="trial-heading">
    <h2 id="trial-heading" class="section-heading">
      {{ asking ? `Trial ${trial?.round ?? 1}` : `Trial ${nextRound}` }}
    </h2>
    <p class="lead" data-testid="trial-progress">{{ progressLabel }}</p>

    <template v-if="awaitingApply">
      <p class="lead" data-testid="trial-question">{{ question }}</p>
      <dl class="capability" data-testid="trial-plan">
        <dt>Will be enabled</dt>
        <dd data-testid="trial-plan-enabled">
          {{ enabledPreviewNames.length === 0 ? 'None' : enabledPreviewNames.join(', ') }}
        </dd>
        <dt>Will be disabled</dt>
        <dd data-testid="trial-plan-disabled">
          {{ disabledPreviewNames.length === 0 ? 'None' : disabledPreviewNames.join(', ') }}
        </dd>
      </dl>
      <div class="actions">
        <button type="button" class="primary" data-testid="trial-apply" :disabled="busy" @click="emit('apply-trial')">
          Apply trial {{ nextRound }}
        </button>
      </div>
    </template>

    <template v-else-if="asking">
      <p class="lead" data-testid="trial-question">{{ question }}</p>
      <dl class="capability" data-testid="trial-applied-state">
        <dt>Enabled</dt>
        <dd data-testid="trial-enabled">
          {{ appliedEnabledNames.length === 0 ? 'None' : appliedEnabledNames.join(', ') }}
        </dd>
        <dt>Disabled</dt>
        <dd data-testid="trial-disabled">
          {{ appliedDisabledNames.length === 0 ? 'None' : appliedDisabledNames.join(', ') }}
        </dd>
      </dl>

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
        <button type="button" data-testid="trial-retry" :disabled="busy" @click="emit('retry-trial')">
          Retry this trial
        </button>
        <button type="button" data-testid="trial-reload" :disabled="busy" @click="emit('reload')">
          Reload the test tab
        </button>
      </div>
      <p v-if="reloadMessage !== null" class="note" data-testid="trial-reload-status">{{ reloadMessage }}</p>
      <p class="note" data-testid="trial-retry-note">
        Retry re-applies exactly this batch without recording a verdict, for a symptom you could not reproduce yet.
      </p>
    </template>

    <p v-if="ambiguity.length > 0" class="error" data-testid="trial-ambiguity">
      Ambiguous candidates: {{ ambiguity.join(', ') }}
    </p>

    <div class="actions">
      <button type="button" data-testid="trial-history-open" :disabled="busy" @click="emit('history')">
        Show the full session history
      </button>
    </div>

    <TrialHistory :rows="history" />
  </section>
</template>
