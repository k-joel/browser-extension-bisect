<script setup lang="ts">
import type { TrialSummaryRow } from '../presentation';

defineProps<{ rows: TrialSummaryRow[] }>();
</script>

<template>
  <section v-if="rows.length > 0" class="section" data-testid="trial-history" aria-labelledby="trial-history-heading">
    <h3 id="trial-history-heading" class="section-heading">Trials so far</h3>
    <ol class="list" data-testid="trial-history-list">
      <li v-for="row in rows" :key="row.round" class="history" data-testid="trial-history-row" :data-round="row.round">
        <p class="history-heading" data-testid="trial-history-round">Trial {{ row.round }}</p>
        <p class="note" data-testid="trial-history-enabled">Enabled: {{ row.enabledNames.join(', ') || 'None' }}</p>
        <p class="note" data-testid="trial-history-disabled">Disabled: {{ row.disabledNames.join(', ') || 'None' }}</p>
        <p class="note" data-testid="trial-history-verdict">{{ row.verdictLabel }}</p>
      </li>
    </ol>
  </section>
</template>
