<script setup lang="ts">
import type { IneligibleExtension } from '@/utils/bisect/domain';
import { formatIneligibleReason, initialsFor } from '../presentation';

defineProps<{ entries: IneligibleExtension[] }>();
</script>

<template>
  <section class="section" data-testid="ineligible-section" aria-labelledby="ineligible-heading">
    <h2 id="ineligible-heading" class="section-heading">Not eligible</h2>
    <ul class="list" data-testid="ineligible-list" aria-label="Ineligible extensions">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="ext"
        data-testid="ineligible-row"
        :data-extension-id="entry.id"
        :data-reason="entry.reason"
      >
        <span class="initials" data-testid="ineligible-initials" aria-hidden="true">{{ initialsFor(entry.name) }}</span>
        <span class="ext-name">
          <span class="ext-name-text" data-testid="ineligible-name">{{ entry.name }}</span>
          <span class="ext-version" data-testid="ineligible-version">{{ entry.version }}</span>
        </span>
        <span class="ext-reason" data-testid="ineligible-reason">{{ formatIneligibleReason(entry.reason) }}</span>
      </li>
    </ul>
  </section>
</template>
