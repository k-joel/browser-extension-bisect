<script setup lang="ts">
import type { TestTabPrompt } from '../presentation';

defineProps<{
  prompt: TestTabPrompt;
  busy: boolean;
}>();

const emit = defineEmits<{
  (event: 'bind'): void;
  (event: 'reload'): void;
}>();
</script>

<template>
  <div
    class="note test-tab-prompt"
    data-testid="test-tab-prompt"
    :data-kind="prompt.kind"
    :data-tab-id="prompt.tabId"
    role="status"
  >
    <p class="lead" data-testid="test-tab-prompt-headline">{{ prompt.headline }}</p>
    <p data-testid="test-tab-prompt-detail">{{ prompt.detail }}</p>
    <div class="actions">
      <button
        type="button"
        data-testid="test-tab-prompt-action"
        :disabled="busy"
        @click="prompt.kind === 'closed' ? emit('bind') : emit('reload')"
      >
        {{ prompt.action }}
      </button>
    </div>
    <p class="note" data-testid="test-tab-prompt-verdict-note">
      The batch is already applied, so the verdict below can be answered with or without a tab.
    </p>
  </div>
</template>
