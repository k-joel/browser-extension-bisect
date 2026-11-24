import { storage } from 'wxt/utils/storage';
import type { ManagementExtensionInfo, ManagementSurface } from './management-port';

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
}

function normalizeStore(value: unknown): TestDriverStore {
  if (typeof value !== 'object' || value === null) return { enabledById: {} };
  const source = (value as Partial<TestDriverStore>).enabledById;
  const enabledById: Record<string, boolean> = {};
  if (typeof source === 'object' && source !== null) {
    for (const [id, enabled] of Object.entries(source)) {
      if (typeof enabled === 'boolean') enabledById[id] = enabled;
    }
  }
  return { enabledById };
}

function storeItem() {
  return storage.defineItem<TestDriverStore>(TEST_DRIVER_KEY, { fallback: { enabledById: {} } });
}

export async function readTestDriverStore(): Promise<TestDriverStore> {
  return normalizeStore(await storeItem().getValue());
}

export async function setTestDriverEnabled(extensionId: string, enabled: boolean): Promise<TestDriverStore> {
  const current = await readTestDriverStore();
  const next: TestDriverStore = { enabledById: { ...current.enabledById, [extensionId]: enabled } };
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

/**
 * Merges the recorded manual state into `getAll` so the adapter observes it as the
 * real enabled state. Toggles stay browser-rejected, so the assisted rail is still
 * exercised end to end: the add-on can only observe.
 */
export function withTestDriverOverlay(management: ManagementSurface): ManagementSurface {
  return {
    ...management,
    async getAll(): Promise<ManagementExtensionInfo[]> {
      const store = await readTestDriverStore();
      const all = await management.getAll();
      return all.map((info) => withOverlay(info, store));
    },
  };
}

export interface TestDriverGlobal {
  setEnabled(extensionId: string, enabled: boolean): Promise<TestDriverStore>;
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
    read: readTestDriverStore,
    reset: resetTestDriverStore,
  };
  target[TEST_DRIVER_GLOBAL] = driver;
}
