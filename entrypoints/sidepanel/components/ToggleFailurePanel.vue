<script setup lang="ts">
import { computed } from 'vue';
import type { CandidateExtension, SessionPause, ToggleErrorCode } from '@/utils/bisect/domain';
import {
  EXTENSION_MANAGER_URL,
  escalationRequestOf,
  needsManualRecovery,
  recoveryNeedsExtensionManager,
  toggleFailureRows,
} from '../presentation';

const props = defineProps<{
  pause: SessionPause;
  candidates: CandidateExtension[];
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'enable-with-click', extensionId: string): void;
  (event: 'decline'): void;
}>();

const rows = computed(() => toggleFailureRows(props.pause, props.candidates));
const escalation = computed(() => escalationRequestOf(props.pause, props.candidates));
const manualRecovery = computed(() => needsManualRecovery(props.pause));
const managerUrl = computed(() => (manualRecovery.value ? EXTENSION_MANAGER_URL : null));

function showsManager(code: ToggleErrorCode): boolean {
  return recoveryNeedsExtensionManager(code);
}
</script>

<template>
  <section class="section toggle-failure" data-testid="toggle-failure" aria-labelledby="toggle-failure-heading">
    <h2 id="toggle-failure-heading" class="section-heading">A toggle failed</h2>
    <p class="lead" data-testid="toggle-failure-explanation">
      The browser refused a change, so the trial was aborted and every extension this batch had already moved was put
      back. Nothing is retried on its own.
    </p>

    <ul class="list" data-testid="toggle-failure-rows">
      <li
        v-for="row in rows"
        :key="row.id"
        class="ext"
        data-testid="toggle-failure-row"
        :data-extension-id="row.id"
        :data-code="row.code"
      >
        <span class="ext-name">
          <span class="ext-name-text" data-testid="toggle-failure-name">{{ row.name }}</span>
          <span class="ext-version" data-testid="toggle-failure-code">{{ row.code }}</span>
        </span>
        <span class="ext-reason" data-testid="toggle-failure-guidance">{{ row.guidance }}</span>
        <span class="ext-reason" data-testid="toggle-failure-message">{{ row.message }}</span>
        <span
          v-if="showsManager(row.code)"
          class="ext-reason"
          data-testid="toggle-failure-manager"
          :data-manager-url="managerUrl"
        >
          {{ managerUrl }}
        </span>
      </li>
    </ul>

    <div v-if="escalation !== null" class="actions" data-testid="escalation-actions" :data-extension-id="escalation.id">
      <button
        type="button"
        class="primary"
        data-testid="escalation-enable"
        :disabled="busy"
        :aria-label="`Enable ${escalation.name} with click`"
        @click="emit('enable-with-click', escalation.id)"
      >
        Enable with click
      </button>
      <p class="note" data-testid="escalation-note">
        Chrome has to see a click on this add-on’s own page before it re-enables {{ escalation.name }}. The add-on
        cannot make that call from its background page.
      </p>
      <button type="button" data-testid="escalation-decline" :disabled="busy" @click="emit('decline')">
        Do not enable it; restore instead
      </button>
    </div>

    <p v-if="manualRecovery" class="note" data-testid="manual-recovery-note" role="status">
      This one cannot be fixed from here. Re-enable the listed extensions yourself in the extension manager, then press
      Restore all to record the result.
    </p>
    <p v-if="manualRecovery" class="note" data-testid="manual-recovery-url">{{ managerUrl }}</p>

    <div class="actions">
      <button type="button" data-testid="toggle-failure-restore" :disabled="busy" @click="emit('decline')">
        Restore all extensions
      </button>
    </div>
  </section>
</template>
