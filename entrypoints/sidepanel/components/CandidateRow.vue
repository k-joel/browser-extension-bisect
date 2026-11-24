<script setup lang="ts">
import type { PickerRow } from '../presentation';
import { initialsFor } from '../presentation';

defineProps<{ rows: PickerRow[] }>();
const emit = defineEmits<(event: 'toggle', id: string) => void>();
</script>

<template>
  <ul class="list" data-testid="candidate-list" aria-label="Extensions in the search">
    <li
      v-for="row in rows"
      :key="row.id"
      class="ext"
      data-testid="candidate-row"
      :data-extension-id="row.id"
      :data-selected="!row.excluded"
    >
      <input
        type="checkbox"
        data-testid="candidate-checkbox"
        :checked="!row.excluded"
        :aria-label="row.excluded ? `Include ${row.name} in the search` : `Exclude ${row.name} from the search`"
        @change="emit('toggle', row.id)"
      >
      <span class="initials" data-testid="candidate-initials" aria-hidden="true">{{ initialsFor(row.name) }}</span>
      <span class="ext-name">
        <span class="ext-name-text" data-testid="candidate-name">{{ row.name }}</span>
        <span class="ext-version" data-testid="candidate-version">{{ row.version }}</span>
      </span>
      <span v-if="row.excluded" class="ext-reason" data-testid="candidate-reason">Excluded by you</span>
    </li>
  </ul>
</template>
