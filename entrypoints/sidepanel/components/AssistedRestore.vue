<script setup lang="ts">
import { computed } from 'vue';
import type { CandidateExtension } from '@/utils/bisect/domain';
import { assistedRestoreSummary, plural, type RestoreSummary } from '../presentation';

const props = defineProps<{
  manualIds: string[];
  restoredIds: string[];
  candidates: CandidateExtension[];
  summary: RestoreSummary | null;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'verify'): void;
  (event: 'open-addons'): void;
}>();

const checklist = computed(() => assistedRestoreSummary(props.manualIds, props.restoredIds, props.candidates));

const headline = computed(() => {
  if (checklist.value.total === 0) return 'No extension of this session has to be turned back on.';
  if (checklist.value.complete) return 'Every touched extension is enabled again.';
  return `${plural(checklist.value.remaining, 'extension')} still to turn back on.`;
});
</script>

<template>
  <section class="section assisted" data-testid="assisted-restore" aria-labelledby="assisted-restore-heading">
    <h2 id="assisted-restore-heading" class="section-heading">Restore in assisted mode</h2>
    <p class="note" data-testid="assisted-restore-policy">
      Restore lists only the extensions this session changed. Turn them back on yourself, then verify.
    </p>

    <p
      :class="checklist.complete ? 'note' : 'error'"
      data-testid="assisted-restore-summary"
      :data-complete="String(checklist.complete)"
      role="status"
    >
      {{ headline }}
    </p>

    <p v-if="summary !== null" :class="summary.complete ? 'note' : 'error'" data-testid="assisted-restore-errors">
      {{ summary.headline }}
    </p>

    <ul class="list" data-testid="assisted-restore-checklist" aria-label="Extensions to turn back on">
      <li
        v-for="row in checklist.rows"
        :key="row.id"
        class="ext preview"
        data-testid="assisted-restore-row"
        :data-extension-id="row.id"
        :data-done="String(row.done)"
      >
        <span class="ext-name">
          <span class="ext-name-text" data-testid="assisted-restore-name">{{ row.name }}</span>
        </span>
        <span class="ext-reason" data-testid="assisted-restore-state">{{ row.done ? 'On' : 'Off' }}</span>
      </li>
    </ul>

    <div class="actions">
      <button type="button" data-testid="assisted-restore-open-addons" :disabled="busy" @click="emit('open-addons')">
        Open the Add-ons Manager
      </button>
      <button type="button" data-testid="assisted-restore-verify" :disabled="busy" @click="emit('verify')">
        Verify the restore
      </button>
    </div>
  </section>
</template>
