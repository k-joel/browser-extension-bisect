<script setup lang="ts">
import { computed } from 'vue';
import type { SessionView } from '@/utils/bisect/domain';
import { describeProgress, describeSessionStatus, findCandidate } from '../presentation';

const props = defineProps<{ session: SessionView }>();

const trial = computed(() => props.session.currentTrial);

function namesOf(ids: readonly string[]): string {
  return ids.map((id) => findCandidate(props.session.candidateOrder, id)?.name ?? id).join(', ');
}

const enabledLabel = computed(() => namesOf(trial.value?.enabledIds ?? []));
const disabledLabel = computed(() => namesOf(trial.value?.disabledIds ?? []));
const progressLabel = computed(() => describeProgress(props.session));
</script>

<template>
  <section class="section" data-testid="session-progress" aria-labelledby="progress-heading">
    <h2 id="progress-heading" class="section-heading">Session in progress</h2>
    <p class="lead" data-testid="progress-status">{{ describeSessionStatus(session.status) }}</p>
    <p class="note" data-testid="progress-count">{{ progressLabel }}</p>

    <dl v-if="trial !== null" class="capability" data-testid="progress-trial">
      <dt>Enabled</dt>
      <dd data-testid="progress-enabled">{{ enabledLabel === '' ? 'None' : enabledLabel }}</dd>
      <dt>Disabled</dt>
      <dd data-testid="progress-disabled">{{ disabledLabel === '' ? 'None' : disabledLabel }}</dd>
    </dl>

    <p class="note" data-testid="progress-note">
      The half-split trial loop continues in ISS-004. Restore is available at any time.
    </p>
  </section>
</template>
