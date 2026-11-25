<script setup lang="ts">
import { computed } from 'vue';
import { type NewSessionOffer, plural, type RestoreStatus } from '../presentation';
import NewSessionAction from './NewSessionAction.vue';

const props = defineProps<{
  restore: RestoreStatus;
  offer: NewSessionOffer;
  busy: boolean;
}>();

const emit = defineEmits<(event: 'restore' | 'start-over') => void>();

const leftoverCount = computed(() => props.restore.leftover.length);
</script>

<template>
  <section
    class="section"
    data-testid="restored-screen"
    :data-complete="String(restore.complete)"
    aria-labelledby="restored-heading"
  >
    <h2 id="restored-heading" class="section-heading">Session finished</h2>

    <!--
      The screen never asserts success: `restored` is the audit state a `session-reset`
      records, not a claim that the browser state matches. SPEC §Restore keeps a restore
      pending until the state matches or the user explicitly accepts the differences, so
      the copy below is derived from the event's own leftover lists.
    -->
    <p class="lead" data-testid="restored-explanation">
      {{
        restore.complete
          ? 'The session is over and every extension it touched is enabled again.'
          : restore.accepted
            ? 'The session is over. You accepted the extensions that were left as they are.'
            : `The session is over, but ${plural(leftoverCount, 'extension')} is not back in its original state.`
      }}
    </p>

    <p
      :class="restore.complete ? 'note' : 'error'"
      data-testid="restored-summary"
      :data-complete="String(restore.complete)"
      role="status"
    >
      {{ restore.headline }}
    </p>

    <p class="note" data-testid="restored-detail">{{ restore.detail }}</p>

    <ul
      v-if="restore.leftover.length > 0"
      class="list"
      data-testid="restored-leftovers"
      aria-label="Extensions that are still not back in their original state"
    >
      <li
        v-for="entry in restore.leftover"
        :key="entry.id"
        class="ext"
        data-testid="restored-leftover"
        :data-extension-id="entry.id"
        :data-kind="entry.kind"
      >
        <span class="ext-name">
          <span class="ext-name-text" data-testid="restored-leftover-name">{{ entry.name }}</span>
          <span class="ext-version" data-testid="restored-leftover-kind">{{ entry.kind }}</span>
        </span>
        <span class="ext-reason" data-testid="restored-leftover-state">{{
          entry.kind === 'manual' ? 'Off' : 'Refused'
        }}</span>
      </li>
    </ul>

    <p v-if="restore.nextStep !== null" class="note" data-testid="restored-next-step" role="status">
      {{ restore.nextStep }}
    </p>

    <div class="actions">
      <button type="button" data-testid="restored-restore" :disabled="busy" @click="emit('restore')">
        {{ restore.complete ? 'Restore again' : 'Restore all extensions' }}
      </button>
    </div>

    <NewSessionAction :offer="offer" :busy="busy" @start-over="emit('start-over')" />
  </section>
</template>
