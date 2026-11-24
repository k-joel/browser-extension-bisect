<script setup lang="ts">
defineProps<{
  restoreSummaryHeadline: string | null;
  busy: boolean;
}>();

const emit = defineEmits<(event: 'restore') => void>();
</script>

<template>
  <section class="section" data-testid="host-issue-screen" aria-labelledby="host-issue-heading">
    <h2 id="host-issue-heading" class="section-heading">This is a browser or machine issue</h2>
    <p class="lead" data-testid="host-issue-explanation">
      The problem still happened with every candidate extension disabled, so no installed extension is implicated.
    </p>
    <p class="note" data-testid="host-issue-guidance">
      Try another browser profile, disable hardware acceleration, or check the site in a window without extensions.
    </p>
    <p v-if="restoreSummaryHeadline !== null" class="note" data-testid="host-issue-restore-summary">
      {{ restoreSummaryHeadline }}
    </p>
    <div class="actions">
      <button type="button" data-testid="host-issue-restore" :disabled="busy" @click="emit('restore')">
        Restore all extensions
      </button>
    </div>
  </section>
</template>
