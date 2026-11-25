<script setup lang="ts">
import { computed } from 'vue';
import type { SessionView } from '@/utils/bisect/domain';
import { formatSnapshotKind, summarizeSnapshotChanges } from '../presentation';

const props = defineProps<{
  session: SessionView;
}>();

const emit = defineEmits<(event: 'dismiss') => void>();

const rows = computed(() => summarizeSnapshotChanges(props.session.changes));
</script>

<template>
  <aside
    v-if="rows.length > 0"
    class="note snapshot-warning"
    data-testid="snapshot-warning"
    :data-count="rows.length"
    aria-live="polite"
  >
    <p class="lead" data-testid="snapshot-warning-headline">The browser changed under this session</p>
    <ul class="list">
      <li
        v-for="row in rows"
        :key="`${row.kind}-${row.id}`"
        class="ext"
        data-testid="snapshot-warning-row"
        :data-extension-id="row.id"
        :data-kind="row.kind"
      >
        <span class="ext-name-text" data-testid="snapshot-warning-name">{{ row.name }}</span>
        <span class="ext-reason" data-testid="snapshot-warning-kind">{{ formatSnapshotKind(row.kind) }}</span>
      </li>
    </ul>
    <p class="note" data-testid="snapshot-warning-detail">
      The candidate order was captured when this session started and does not change. A newly installed extension is not
      part of this search.
    </p>
    <div class="actions">
      <button type="button" data-testid="snapshot-warning-dismiss" @click="emit('dismiss')">Dismiss the warning</button>
    </div>
  </aside>
</template>
