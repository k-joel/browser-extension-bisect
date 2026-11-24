<script setup lang="ts">
import type { CandidateExtension, CapabilityReport } from '@/utils/bisect/domain';
import { formatToggleMode, plural } from '../presentation';

defineProps<{
  candidates: CandidateExtension[];
  capability: CapabilityReport;
  testTabLabel: string;
  testTabWarning: string | null;
  blockedReason: string | null;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'start'): void;
  (event: 'cancel'): void;
  (event: 'bind'): void;
}>();
</script>

<template>
  <section class="section" data-testid="preflight" aria-labelledby="preflight-heading">
    <h2 id="preflight-heading" class="section-heading">Before anything is toggled</h2>
    <p class="lead" data-testid="preflight-count">
      {{ plural(candidates.length, 'extension') }} will be disabled for the baseline:
    </p>

    <ul class="list" data-testid="preflight-candidates" aria-label="Extensions that will be disabled">
      <li
        v-for="candidate in candidates"
        :key="candidate.id"
        class="ext preview"
        data-testid="preflight-candidate"
        :data-extension-id="candidate.id"
      >
        <span class="ext-name">
          <span class="ext-name-text" data-testid="preflight-candidate-name">{{ candidate.name }}</span>
          <span class="ext-version" data-testid="preflight-candidate-version">{{ candidate.version }}</span>
        </span>
      </li>
    </ul>

    <p class="note" data-testid="preflight-mode">{{ formatToggleMode(capability) }}</p>
    <p class="note" data-testid="preflight-culprit-note">
      The culprit stays disabled until you press Restore. Nothing has changed yet: no extension is toggled until you
      start the baseline.
    </p>

    <div class="section" data-testid="preflight-test-tab">
      <p class="note">
        Test tab:
        <span data-testid="preflight-test-tab-label">{{ testTabLabel }}</span>
      </p>
      <p v-if="testTabWarning !== null" class="note" data-testid="preflight-test-tab-warning">{{ testTabWarning }}</p>
      <div class="actions">
        <button type="button" data-testid="preflight-bind" :disabled="busy" @click="emit('bind')">
          Bind the current tab
        </button>
      </div>
    </div>

    <p v-if="blockedReason !== null" class="error" data-testid="preflight-blocked">{{ blockedReason }}</p>

    <div class="actions">
      <button
        type="button"
        class="primary"
        data-testid="preflight-start"
        :disabled="busy || blockedReason !== null"
        @click="emit('start')"
      >
        Start baseline
      </button>
      <button type="button" data-testid="preflight-cancel" :disabled="busy" @click="emit('cancel')">
        Back to the picker
      </button>
    </div>
  </section>
</template>
