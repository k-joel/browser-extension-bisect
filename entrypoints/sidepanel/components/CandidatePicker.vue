<script setup lang="ts">
import { computed } from 'vue';
import type { IneligibleExtension } from '@/utils/bisect/domain';
import { matchesSearch, type PickerRow } from '../presentation';
import CandidateRow from './CandidateRow.vue';
import IneligibleList from './IneligibleList.vue';

const props = defineProps<{
  rows: PickerRow[];
  unavailable: IneligibleExtension[];
  query: string;
  busy: boolean;
  blockedReason: string | null;
  note: string | null;
}>();

const emit = defineEmits<{
  (event: 'toggle', id: string): void;
  (event: 'update:query', value: string): void;
  (event: 'start'): void;
}>();

const visibleRows = computed(() => props.rows.filter((row) => matchesSearch(row.name, props.query)));

const searchEmpty = computed(() => props.rows.length > 0 && visibleRows.value.length === 0);

const includedCount = computed(() => props.rows.filter((row) => !row.excluded).length);

function onSearch(event: Event): void {
  emit('update:query', (event.target as HTMLInputElement).value);
}
</script>

<template>
  <section class="section" data-testid="candidate-picker" aria-labelledby="candidate-picker-heading">
    <h2 id="candidate-picker-heading" class="section-heading">Choose candidates</h2>

    <label class="search" for="candidate-search">
      Search by name
      <input
        id="candidate-search"
        data-testid="candidate-search"
        type="search"
        autocomplete="off"
        spellcheck="false"
        placeholder="Search extensions"
        :value="query"
        @input="onSearch"
      >
    </label>

    <p v-if="rows.length === 0" class="empty" data-testid="eligible-empty">
      No eligible enabled extensions. Enable at least one regular extension and reopen the panel.
    </p>
    <p v-else-if="searchEmpty" class="empty" data-testid="search-empty">No extension matches "{{ query.trim() }}".</p>
    <CandidateRow v-else :rows="visibleRows" @toggle="emit('toggle', $event)" />

    <IneligibleList v-if="unavailable.length > 0" :entries="unavailable" />

    <p v-if="blockedReason !== null" class="error" data-testid="picker-blocked">{{ blockedReason }}</p>
    <p v-else-if="note !== null" class="note" data-testid="picker-mode-note">{{ note }}</p>

    <div class="actions">
      <button
        type="button"
        class="primary"
        data-testid="picker-start"
        :disabled="busy || blockedReason !== null"
        @click="emit('start')"
      >
        Review {{ includedCount }} {{ includedCount === 1 ? 'candidate' : 'candidates' }}
      </button>
    </div>
  </section>
</template>
