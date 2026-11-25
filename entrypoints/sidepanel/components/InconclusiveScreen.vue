<script setup lang="ts">
import { computed } from 'vue';
import type { SessionView } from '@/utils/bisect/domain';
import {
  ambiguityNames,
  describeInconclusiveReason,
  inconclusiveReasonOf,
  type NewSessionOffer,
} from '../presentation';
import NewSessionAction from './NewSessionAction.vue';

const props = defineProps<{
  session: SessionView;
  busy: boolean;
  restoreSummaryHeadline: string | null;
  offer: NewSessionOffer;
}>();

const emit = defineEmits<{
  (event: 'restore'): void;
  (event: 'history'): void;
  (event: 'replay'): void;
  (event: 'start-over'): void;
}>();

const ambiguity = computed(() => ambiguityNames(props.session));
const reason = computed(() => describeInconclusiveReason(inconclusiveReasonOf(props.session)));
</script>

<template>
  <section class="section" data-testid="inconclusive-screen" aria-labelledby="inconclusive-heading">
    <h2 id="inconclusive-heading" class="section-heading">No single culprit identified</h2>
    <p class="lead" data-testid="inconclusive-reason">{{ reason }}</p>
    <p class="note" data-testid="inconclusive-explanation">
      This usually means two extensions interact, more than one is at fault, or a verdict was misreported. Never a
      single extension on this evidence, so none is blamed.
    </p>

    <p class="note" data-testid="inconclusive-ambiguity-label">Still possible:</p>
    <ul v-if="ambiguity.length > 0" class="list" data-testid="inconclusive-ambiguity">
      <li v-for="name in ambiguity" :key="name" class="ext" data-testid="inconclusive-ambiguity-entry">
        <span class="ext-name">
          <span class="ext-name-text" data-testid="inconclusive-ambiguity-name">{{ name }}</span>
        </span>
      </li>
    </ul>
    <p v-else class="note" data-testid="inconclusive-ambiguity">
      The whole candidate set, because the verdicts eliminated every suspect.
    </p>

    <p v-if="restoreSummaryHeadline !== null" class="note" data-testid="inconclusive-restore-summary">
      {{ restoreSummaryHeadline }}
    </p>
    <div class="actions">
      <button
        type="button"
        class="primary"
        data-testid="inconclusive-restore"
        :disabled="busy"
        @click="emit('restore')"
      >
        Restore all extensions
      </button>
    </div>

    <div class="actions">
      <button type="button" data-testid="inconclusive-history" :disabled="busy" @click="emit('history')">
        Show the session history
      </button>
      <button type="button" data-testid="inconclusive-replay" :disabled="busy" @click="emit('replay')">
        Correct a verdict and replay
      </button>
    </div>
    <p id="inconclusive-replay-note" class="note" data-testid="inconclusive-replay-note">
      Replay works on a copy of the log and never changes installed extensions.
    </p>

    <NewSessionAction :offer="offer" :busy="busy" @start-over="emit('start-over')" />
  </section>
</template>
