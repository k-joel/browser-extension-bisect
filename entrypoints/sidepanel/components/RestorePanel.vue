<script setup lang="ts">
import type { RestoreSummary } from '../presentation';

defineProps<{
  summary: RestoreSummary | null;
  busy: boolean;
  /** Guard against offering Restore before a session has touched anything. */
  available: boolean;
}>();

const emit = defineEmits<(event: 'restore') => void>();
</script>

<template>
  <section class="section restore" data-testid="restore-panel" aria-labelledby="restore-heading">
    <h2 id="restore-heading" class="section-heading">Restore</h2>
    <p class="note" data-testid="restore-policy">
      Restore re-enables only the extensions this session changed. Other extensions are never touched.
    </p>

    <p
      v-if="summary !== null"
      :class="summary.complete ? 'note' : 'error'"
      data-testid="restore-summary"
      :data-complete="summary.complete"
      role="status"
    >
      {{ summary.headline }}
    </p>

    <ul v-if="summary !== null && summary.failures.length > 0" class="list" data-testid="restore-failures">
      <li
        v-for="failure in summary.failures"
        :key="failure.id"
        class="ext"
        data-testid="restore-failure"
        :data-extension-id="failure.id"
      >
        <span class="ext-name">
          <span class="ext-name-text" data-testid="restore-failure-name">{{ failure.name }}</span>
          <span class="ext-version" data-testid="restore-failure-code">{{ failure.code }}</span>
        </span>
        <span class="ext-reason" data-testid="restore-failure-message">{{ failure.message }}</span>
      </li>
    </ul>

    <div class="actions">
      <button
        type="button"
        data-testid="restore-button"
        :disabled="busy || !available"
        :aria-disabled="busy || !available"
        @click="emit('restore')"
      >
        Restore all extensions
      </button>
    </div>
  </section>
</template>
