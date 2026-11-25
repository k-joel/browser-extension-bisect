import { storage } from 'wxt/utils/storage';
import type { ManagementEventSurface, ManagementExtensionInfo, ManagementSurface } from './management-port';

/**
 * Test-mode-only management overlay for the assisted Firefox E2E. Firefox cannot
 * toggle a temporary add-on, so the harness records the "manual disable-all" state
 * here and the assisted adapter's `getAll` merges it. Never reached by product
 * code: every caller guards with `isTestMode()`, and the module keeps no top-level
 * side effects so `build:prod:*` drops it entirely (see `docs/NOTES.md`).
 */
export const TEST_DRIVER_KEY = 'local:bisectTestDriver' as const;

export const TEST_DRIVER_GLOBAL = '__extBisectTestDriver';

export interface TestDriverStore {
  enabledById: Record<string, boolean>;
  /**
   * `setEnabled` rejections the harness wants the adapter to hit, keyed by
   * `${extensionId}:${enabled ? 'on' : 'off'}`. Chrome cannot be made to refuse a
   * toggle on demand, so the failure paths are driven through this documented
   * test-mode overlay instead of a real browser restriction.
   */
  toggleErrors?: Record<string, string>;
}

function isStringMap(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
}

function normalizeStore(value: unknown): TestDriverStore {
  if (typeof value !== 'object' || value === null) return { enabledById: {} };
  const source = value as Partial<TestDriverStore>;
  const enabledById: Record<string, boolean> = {};
  const stored = source.enabledById;
  if (typeof stored === 'object' && stored !== null) {
    for (const [id, enabled] of Object.entries(stored)) {
      if (typeof enabled === 'boolean') enabledById[id] = enabled;
    }
  }
  const toggleErrors = isStringMap(source.toggleErrors) ? { ...source.toggleErrors } : {};
  return Object.keys(toggleErrors).length === 0 ? { enabledById } : { enabledById, toggleErrors };
}

function storeItem() {
  return storage.defineItem<TestDriverStore>(TEST_DRIVER_KEY, { fallback: { enabledById: {} } });
}

export async function readTestDriverStore(): Promise<TestDriverStore> {
  return normalizeStore(await storeItem().getValue());
}

export async function setTestDriverEnabled(extensionId: string, enabled: boolean): Promise<TestDriverStore> {
  const current = await readTestDriverStore();
  const next: TestDriverStore = { ...current, enabledById: { ...current.enabledById, [extensionId]: enabled } };
  await storeItem().setValue(next);
  return next;
}

/**
 * Arms a `setEnabled` rejection for one id in one direction. Arming replaces the whole
 * map so a test can turn one failure into the next one without a reset in between.
 */
export async function setTestDriverToggleError(
  extensionId: string,
  enabled: boolean,
  message: string | null,
): Promise<TestDriverStore> {
  const current = await readTestDriverStore();
  const key = `${extensionId}:${enabled ? 'on' : 'off'}`;
  const toggleErrors = { ...(current.toggleErrors ?? {}) };
  if (message === null) delete toggleErrors[key];
  else toggleErrors[key] = message;
  const next: TestDriverStore = { enabledById: current.enabledById };
  if (Object.keys(toggleErrors).length > 0) next.toggleErrors = toggleErrors;
  await storeItem().setValue(next);
  return next;
}

export async function resetTestDriverStore(): Promise<void> {
  await storeItem().setValue({ enabledById: {} });
}

function withOverlay(info: ManagementExtensionInfo, store: TestDriverStore): ManagementExtensionInfo {
  const overridden = store.enabledById[info.id];
  return overridden === undefined || overridden === info.enabled ? info : { ...info, enabled: overridden };
}

type InfoListener = (info: ManagementExtensionInfo) => void;

/**
 * The real `management.onEnabled`/`onDisabled` never fire for the overlay's storage-backed
 * manual state, because no browser toggle happened. The assisted rail's completion signal
 * is exactly those two events, so the overlay publishes them itself: it watches the store
 * and, for each id whose recorded state changed, emits the event an Add-ons Manager toggle
 * would have.
 *
 * Without this an E2E that "drives the manual state" would prove nothing about SPEC
 * §Management port, because the debounced re-verify would never be scheduled at all.
 */
function createOverlayEventSurface(
  eventName: 'enabled' | 'disabled',
  management: ManagementSurface,
): ManagementEventSurface<ManagementExtensionInfo> {
  const listeners = new Set<InfoListener>();
  let unwatch: (() => void) | null = null;

  const broadcast = (info: ManagementExtensionInfo): void => {
    for (const listener of listeners) listener(info);
  };

  const subscribe = (): (() => void) =>
    storage.defineItem<TestDriverStore>(TEST_DRIVER_KEY, { fallback: { enabledById: {} } }).watch(async (value) => {
      const store = normalizeStore(value);
      const all = await management.getAll().catch(() => []);
      for (const [extensionId, enabled] of Object.entries(store.enabledById)) {
        const info = all.find((entry) => entry.id === extensionId);
        if (info === undefined || info.enabled === enabled) continue;
        if ((eventName === 'enabled') !== enabled) continue;
        broadcast({ ...info, enabled });
      }
    });

  return {
    addListener: (listener: InfoListener) => {
      listeners.add(listener);
      if (unwatch === null) unwatch = subscribe();
    },
    removeListener: (listener: InfoListener) => {
      listeners.delete(listener);
      if (listeners.size === 0 && unwatch !== null) {
        unwatch();
        unwatch = null;
      }
    },
  };
}

/**
 * Merges the recorded manual state into `getAll` so the adapter observes it as the
 * real enabled state, and publishes the `onEnabled`/`onDisabled` events a real
 * Add-ons Manager toggle would have. Toggles stay browser-rejected, so the assisted rail
 * is still exercised end to end: the add-on can only observe.
 *
 * On the automated rail the overlay also honours an armed `setEnabled` rejection. That
 * is the only way to drive the failure paths in a real browser — Chrome cannot be asked
 * to refuse a toggle on demand — and it keeps the product's error mapping and abort
 * rollback under test rather than replacing them.
 */
export function withTestDriverOverlay(management: ManagementSurface): ManagementSurface {
  return {
    ...management,
    async getAll(): Promise<ManagementExtensionInfo[]> {
      const store = await readTestDriverStore();
      const all = await management.getAll();
      return all.map((info) => withOverlay(info, store));
    },
    async setEnabled(extensionId: string, enabled: boolean): Promise<void> {
      const store = await readTestDriverStore();
      const armed = store.toggleErrors?.[`${extensionId}:${enabled ? 'on' : 'off'}`];
      if (armed !== undefined) throw new Error(armed);
      await management.setEnabled(extensionId, enabled);
    },
    onEnabled: createOverlayEventSurface('enabled', management),
    onDisabled: createOverlayEventSurface('disabled', management),
  };
}

export interface TestDriverGlobal {
  setEnabled(extensionId: string, enabled: boolean): Promise<TestDriverStore>;
  setToggleError(extensionId: string, enabled: boolean, message: string | null): Promise<TestDriverStore>;
  read(): Promise<TestDriverStore>;
  reset(): Promise<void>;
}

/**
 * Publishes the driver in the background's global scope so the E2E harness can
 * drive the manual state from any extension page before it presses Verify.
 */
export function installTestDriverGlobal(target: Record<string, unknown>): void {
  const driver: TestDriverGlobal = {
    setEnabled: setTestDriverEnabled,
    setToggleError: setTestDriverToggleError,
    read: readTestDriverStore,
    reset: resetTestDriverStore,
  };
  target[TEST_DRIVER_GLOBAL] = driver;
}
