// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { createChromePort } from '@/utils/bisect/chrome-port';
import type { SessionView } from '@/utils/bisect/domain';
import { readBisectLog } from '@/utils/bisect/events';
import { resetSessionQueue } from '@/utils/bisect/session';
import { messenger } from '@/utils/messaging';
import { createFakeManagement, type FakeManagement, makeExtensionInfo } from './helpers/fake-management';
import { installMessagingBridge } from './helpers/messaging-bridge';

const SELF = makeExtensionInfo({ id: 'self-id', name: 'Browser Extension Bisect' });

const ALPHA = { id: 'aaaa', name: 'Alpha Blocker' };
const BRAVO = { id: 'bbbb', name: 'Bravo Reader' };
const CHARLIE = { id: 'cccc', name: 'Charlie Helper' };

const THREE = [ALPHA, BRAVO, CHARLIE];

const TABS = { reload: async () => undefined, waitForComplete: async () => true };

function makeSurface(): FakeManagement {
  return createFakeManagement({
    self: SELF,
    extensions: [...THREE.map((entry) => makeExtensionInfo({ id: entry.id, name: entry.name })), SELF],
  });
}

function rejectNextWrite(message = 'QUOTA_BYTES quota exceeded'): () => void {
  const original = fakeBrowser.storage.local.set.bind(fakeBrowser.storage.local);
  let armed = true;
  fakeBrowser.storage.local.set = async (items: Record<string, unknown>) => {
    if (armed) {
      armed = false;
      throw new Error(message);
    }
    return original(items);
  };
  return () => {
    fakeBrowser.storage.local.set = original;
  };
}

function screenOf(wrapper: ReturnType<typeof mount>): string | undefined {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

function errorText(wrapper: ReturnType<typeof mount>): string {
  const node = wrapper.find('[data-testid="sidepanel-error"]');
  return node.exists() ? node.text() : '';
}

function mountPanel(): { wrapper: ReturnType<typeof mount>; surface: FakeManagement } {
  const surface = makeSurface();
  registerBackgroundHandlers({ managementPort: createChromePort({ management: surface }), tabs: TABS });
  return { wrapper: mount(App), surface };
}

async function startBaseline(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.get('[data-testid="picker-start"]').trigger('click');
  await flushPromises();
  await wrapper.get('[data-testid="preflight-start"]').trigger('click');
  await flushPromises();
}

describe('side panel storage failure', () => {
  let restore: (() => void) | null = null;

  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  afterEach(() => {
    restore?.();
    restore = null;
  });

  it('shows the storage failure when a verdict cannot be saved', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await startBaseline(wrapper);

    restore = rejectNextWrite();
    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(errorText(wrapper)).toContain('could not be saved');
    expect(errorText(wrapper)).toContain('previous log is unchanged');
  });

  it('keeps the baseline question on screen after a rejected write', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await startBaseline(wrapper);
    const before = screenOf(wrapper);

    restore = rejectNextWrite();
    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe(before);
    expect(wrapper.find('[data-testid="verdict-persists"]').exists()).toBe(true);
  });

  it('still accepts the same verdict once the write succeeds', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await startBaseline(wrapper);

    restore = rejectNextWrite();
    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    expect(errorText(wrapper)).not.toBe('');

    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(screenOf(wrapper)).toBe('trial');
    expect(errorText(wrapper)).toBe('');
    expect((await messenger.sendMessage('getSession')) as SessionView | null).toMatchObject({
      status: 'awaiting-verdict',
    });
  });

  it('leaves the persisted log untouched so a reopened panel reads the same session', async () => {
    const { wrapper } = mountPanel();
    await flushPromises();
    await startBaseline(wrapper);
    const before = JSON.stringify(await readBisectLog());

    restore = rejectNextWrite();
    await wrapper.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    expect(JSON.stringify(await readBisectLog())).toBe(before);

    const reopened = mount(App);
    await flushPromises();
    expect(screenOf(reopened)).toBe('baseline');
  });
});
