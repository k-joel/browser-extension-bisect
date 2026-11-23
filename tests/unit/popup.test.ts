// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import App from '@/entrypoints/popup/App.vue';
import { messenger } from '@/utils/messaging';
import { applyStateUpdate, readState, recordInteraction } from '@/utils/state';
import { enabledItem, interactionCountItem } from '@/utils/storage';
import { installMessagingBridge } from './helpers/messaging-bridge';

function registerBackgroundHandlers(): void {
  messenger.onMessage('getState', () => readState());
  messenger.onMessage('updateState', ({ data }) => applyStateUpdate(data));
  messenger.onMessage('recordInteraction', () => recordInteraction());
}

describe('popup App', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    messenger.removeAllListeners();
    installMessagingBridge();
    registerBackgroundHandlers();
  });

  it('renders initial state loaded from storage', async () => {
    await enabledItem.setValue(true);
    await interactionCountItem.setValue(2);

    const wrapper = mount(App);
    await flushPromises();

    expect(wrapper.get('[data-testid="status"]').text()).toContain('enabled (2 interactions)');
    expect(wrapper.get('[data-testid="toggle-enabled"]').text()).toBe('Disable');
    expect(wrapper.get('[data-testid="settings-json"]').text()).toContain('"batchSize":1');
  });

  it('toggles enabled through messaging and persists to storage', async () => {
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.get('[data-testid="toggle-enabled"]').trigger('click');
    await flushPromises();

    expect(await enabledItem.getValue()).toBe(false);
    expect(wrapper.get('[data-testid="status"]').text()).toContain('disabled');

    await wrapper.get('[data-testid="toggle-enabled"]').trigger('click');
    await flushPromises();

    expect(await enabledItem.getValue()).toBe(true);
    expect(wrapper.get('[data-testid="status"]').text()).toContain('enabled');
  });

  it('records an interaction through messaging', async () => {
    const wrapper = mount(App);
    await flushPromises();

    await wrapper.get('[data-testid="record-interaction"]').trigger('click');
    await flushPromises();

    expect(await interactionCountItem.getValue()).toBe(1);
    expect(wrapper.get('[data-testid="status"]').text()).toContain('1 interactions');
  });

  it('persists the batch size setting into storage', async () => {
    const wrapper = mount(App);
    await flushPromises();

    const input = wrapper.get('[data-testid="batch-size"]');
    await input.setValue('6');
    await flushPromises();

    expect(wrapper.get('[data-testid="settings-json"]').text()).toContain('"batchSize":6');
    expect((await readState()).settings.batchSize).toBe(6);
  });
});
