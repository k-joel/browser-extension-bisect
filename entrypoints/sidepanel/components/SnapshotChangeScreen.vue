<script setup lang="ts">
import { computed } from 'vue';
import type { SessionView } from '@/utils/bisect/domain';
import {
  describeSnapshotPause,
  formatSnapshotKind,
  needsSnapshotDecision,
  summarizeSnapshotChanges,
} from '../presentation';

const props = defineProps<{
  session: SessionView;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'restore'): void;
  (event: 'restart'): void;
}>();

const changes = computed(() => props.session.pause?.changes ?? []);
const rows = computed(() => summarizeSnapshotChanges(changes.value));
const cause = computed(() => describeSnapshotPause(changes.value));
const decision = computed(() => needsSnapshotDecision(props.session));

const installOnlyNote = computed(() =>
  rows.value.every((row) => row.kind === 'installed')
    ? 'Nothing in the search changed. The new extension is not a candidate.'
    : 'The trial on screen cannot be answered, so choose how to continue.',
);
</script>

<template>
  <section class="section snapshot-change" data-testid="snapshot-change" aria-labelledby="snapshot-change-heading">
    <h2 id="snapshot-change-heading" class="section-heading">The browser changed under this session</h2>
    <p class="lead" data-testid="snapshot-change-cause">{{ cause }}</p>
    <p class="note" data-testid="snapshot-change-note">{{ installOnlyNote }}</p>

    <ul class="list" data-testid="snapshot-change-rows">
      <li
        v-for="row in rows"
        :key="`${row.kind}-${row.id}`"
        class="ext"
        data-testid="snapshot-change-row"
        :data-extension-id="row.id"
        :data-kind="row.kind"
      >
        <span class="ext-name">
          <span class="ext-name-text" data-testid="snapshot-change-name">{{ row.name }}</span>
          <span class="ext-version" data-testid="snapshot-change-kind">{{ formatSnapshotKind(row.kind) }}</span>
        </span>
        <span class="ext-reason" data-testid="snapshot-change-detail">{{ row.detail }}</span>
      </li>
    </ul>

    <div v-if="decision" class="actions" data-testid="snapshot-change-actions">
      <button
        type="button"
        class="primary"
        data-testid="snapshot-change-restore"
        :disabled="busy"
        @click="emit('restore')"
      >
        Restore and stop
      </button>
      <button type="button" data-testid="snapshot-change-restart" :disabled="busy" @click="emit('restart')">
        Restart with a fresh snapshot
      </button>
    </div>

    <p v-if="decision" class="note" data-testid="snapshot-change-restart-note">
      A restart re-enables the candidates this session touched and starts a new search from the extensions installed
      now. The current log is replaced.
    </p>
    <p v-if="!decision" class="note" data-testid="snapshot-change-no-decision">
      No decision is needed: the install does not affect the candidates in this search.
    </p>
  </section>
</template>
