<script setup lang="ts">
import type { CopyStatus } from '../clipboard';

defineProps<{ status: CopyStatus | null }>();
</script>

<template>
  <section class="section" data-testid="copy-status" :data-status="status?.kind ?? 'idle'">
    <p
      :class="status?.kind === 'error' ? 'error' : 'note'"
      data-testid="copy-status-message"
      role="status"
      aria-live="polite"
    >
      {{ status?.message ?? '' }}
    </p>
    <label v-if="status !== null && status.text !== null" class="search" data-testid="copy-fallback">
      <span>Select this text and copy it</span>
      <textarea readonly rows="10" data-testid="copy-fallback-text" :value="status.text"></textarea>
    </label>
  </section>
</template>
