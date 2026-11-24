<script setup lang="ts">
import type { CapabilityReport } from '@/utils/bisect/domain';
import { formatSideSurface, formatToggleMode } from '../presentation';

defineProps<{ capability: CapabilityReport }>();
</script>

<template>
  <section class="section" data-testid="capability-report" aria-labelledby="capability-heading">
    <h2 id="capability-heading" class="section-heading">Capability report</h2>
    <dl class="capability">
      <dt>Browser</dt>
      <dd data-testid="capability-browser">{{ capability.browserName }}</dd>
      <dt>Mode</dt>
      <dd data-testid="capability-toggle-mode">{{ formatToggleMode(capability) }}</dd>
      <dt>Surface</dt>
      <dd data-testid="capability-surface">{{ formatSideSurface(capability) }}</dd>
      <dt>Install type</dt>
      <dd data-testid="capability-install-type">{{ capability.selfInstallType }}</dd>
    </dl>
  </section>
</template>
