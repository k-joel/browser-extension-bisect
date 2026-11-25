// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { registerBackgroundHandlers } from '@/entrypoints/background';
import App from '@/entrypoints/sidepanel/App.vue';
import { type ChromeManagementPort, createChromePort } from '@/utils/bisect/chrome-port';
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

function register(port: ChromeManagementPort): void {
  registerBackgroundHandlers({ managementPort: port, tabs: TABS });
}

async function screenOf(wrapper: ReturnType<typeof mount>): Promise<string | undefined> {
  return wrapper.get('[data-testid="sidepanel-root"]').attributes('data-screen');
}

async function eventTypes(): Promise<string[]> {
  return (await readBisectLog())?.events.map((event) => event.type) ?? [];
}

async function sessionId(): Promise<string | null> {
  return (await readBisectLog())?.sessionId ?? null;
}

/** Two panels mounted over one background and one management surface. */
function mountTwoPanels(): {
  first: ReturnType<typeof mount>;
  second: ReturnType<typeof mount>;
  surface: FakeManagement;
  port: ChromeManagementPort;
} {
  const surface = makeSurface();
  const port = createChromePort({ management: surface });
  register(port);
  return { first: mount(App), second: mount(App), surface, port };
}

async function startFromPicker(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.get('[data-testid="picker-start"]').trigger('click');
  await flushPromises();
  await wrapper.get('[data-testid="preflight-start"]').trigger('click');
  await flushPromises();
}

describe('two side panels', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('shows the same session in both panels', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();

    await startFromPicker(first);

    expect(await screenOf(first)).toBe('baseline');
    expect(await screenOf(second)).toBe('baseline');
    expect(first.get('[data-testid="sidepanel-root"]').attributes('data-screen')).toBe(
      second.get('[data-testid="sidepanel-root"]').attributes('data-screen'),
    );
  });

  it('converges the second panel when the first one answers a verdict', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);

    await first.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    expect(await screenOf(first)).toBe('trial');
    expect(await screenOf(second)).toBe('trial');
  });

  it('converges the second panel when the first one applies a trial', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    await first.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    await first.get('[data-testid="trial-apply"]').trigger('click');
    await flushPromises();

    expect(await screenOf(second)).toBe('trial');
    expect(second.find('[data-testid="verdict-persists"]').exists()).toBe(true);
  });

  it('cannot fork the session id when both panels act', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    const idBefore = await sessionId();

    await first.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();
    await second.get('[data-testid="trial-apply"]').trigger('click');
    await flushPromises();

    expect(await sessionId()).toBe(idBefore);
  });

  it('converges the second panel through the log change, not a re-mount', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    expect(await screenOf(second)).toBe('baseline');

    await first.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    // Neither panel was remounted, so the only way `second` reached the trial screen is the
    // stored log changing under it.
    expect(await screenOf(second)).toBe('trial');
  });

  it('reflects a mutation the panel never dispatched itself', async () => {
    const { first, second, surface } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    expect(await screenOf(second)).toBe('baseline');

    // A third party writes the log the way the background does when a watched extension is
    // removed mid-session. No panel pressed anything, so only the log watch can react.
    const { recordSnapshotPause } = await import('@/utils/bisect/session');
    await recordSnapshotPause({ port: createChromePort({ management: surface }), tabs: TABS }, [
      { kind: 'removed', extensionId: 'cccc', name: 'Charlie Helper', snapshotVersion: '1.0.0', currentVersion: null },
    ]);
    await flushPromises();

    expect(await screenOf(second)).toBe('snapshot-change');
  });

  it('converges a panel that missed the change on its next read', async () => {
    const { first } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    await first.get('[data-testid="verdict-gone"]').trigger('click');
    await flushPromises();

    // A panel mounted after the mutation is the harshest version of "missed the broadcast":
    // it never heard anything and must still land on the session the log holds. No second
    // `registerBackgroundHandlers` — the background is one writer, not one per panel.
    const late = mount(App);
    await flushPromises();

    expect(await screenOf(late)).toBe('trial');
    expect((await messenger.sendMessage('getSession')) as SessionView | null).toMatchObject({
      status: 'awaiting-verdict',
    });
  });
});

describe('concurrent dispatches', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    resetSessionQueue();
    messenger.removeAllListeners();
    installMessagingBridge();
  });

  it('serializes two panels mutating at once without losing an event', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    const before = await eventTypes();

    await Promise.all([
      first.get('[data-testid="verdict-gone"]').trigger('click'),
      second.get('[data-testid="verdict-gone"]').trigger('click'),
    ]);
    await flushPromises();

    const after = await eventTypes();
    const appended = after.slice(before.length);
    expect(appended.length).toBeGreaterThanOrEqual(1);
    expect(appended).toContain('baseline-recorded');
    // The queue rejects the second verdict rather than appending a second one: the round
    // was already answered, which is the whole point of serializing the writers.
    expect(appended.filter((type) => type === 'baseline-recorded')).toHaveLength(1);
    expect(appended).not.toContain('session-paused');
  });

  it('keeps the log append-only and the session unforked under a burst', async () => {
    const { first, second } = mountTwoPanels();
    await flushPromises();
    await startFromPicker(first);
    const idBefore = await sessionId();
    const before = await eventTypes();

    // Both panels answer the same open baseline at once. Whichever loses the race must be
    // refused, never appended: a second `baseline-recorded` would fork the search.
    await Promise.all([
      first.get('[data-testid="verdict-gone"]').trigger('click'),
      second.get('[data-testid="verdict-gone"]').trigger('click'),
    ]);
    await flushPromises();
    await second
      .get('[data-testid="trial-apply"]')
      .trigger('click')
      .catch(() => undefined);
    await flushPromises();

    const after = await readBisectLog();
    expect(after?.sessionId).toBe(idBefore);
    expect(after?.events.slice(0, before.length).map((event) => event.type)).toEqual(before);
    expect(after?.events.filter((event) => event.type === 'baseline-recorded')).toHaveLength(1);
  });
});
