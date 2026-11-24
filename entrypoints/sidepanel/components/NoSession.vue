<script setup lang="ts">
defineProps<{ browserName: string }>();
</script>

<template>
  <section class="section" data-testid="no-session" aria-labelledby="no-session-heading">
    <h2 id="no-session-heading" class="section-heading">No session</h2>
    <p class="lead">Find the extension causing a problem.</p>
    <p class="note" data-testid="culprit-warning">The culprit stays disabled until you press Restore.</p>
    <p class="note">Extensions are toggled only after you review the candidates and start a baseline.</p>
  </section>
</template>
