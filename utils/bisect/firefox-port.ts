import type {
  CapabilityReport,
  DriftReport,
  EnabledStateMap,
  InstalledExtension,
  ManagementEvent,
  ManagementPort,
  ManualBatch,
  RestoreError,
  RestoreResult,
  TargetState,
  ToggleResult,
} from './domain';
import {
  applySharedTargetState,
  describeError,
  diffAgainstTarget,
  listInstalledExtensions,
  listSharedCandidates,
  type ManagementSurface,
  mapToggleError,
  type PortDependencies,
  restoreSharedState,
  subscribeToManagementEvents,
  verifySharedState,
} from './management-port';

export const MANUAL_VERIFY_DEBOUNCE_MS = 150;

export interface FirefoxPortOptions extends PortDependencies {
  debounceMs?: number;
}

interface DebouncedEmitter {
  push(event: ManagementEvent): void;
  cancel(): void;
}

function createDebouncedEmitter(emit: (event: ManagementEvent) => void, debounceMs: number): DebouncedEmitter {
  let pending: ManagementEvent | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    timer = null;
    const event = pending;
    pending = null;
    if (event !== null) emit(event);
  };

  return {
    push(event) {
      pending = event;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, debounceMs);
    },
    cancel() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = null;
    },
  };
}

/**
 * The assisted rail cannot see the session's candidate snapshot, so it remembers
 * the batch it last asked the user to apply: a mismatch it asked for is a *pending*
 * manual toggle, and a mismatch it never asked for is an unexpected toggle.
 */
function createRequestedStates(management: ManagementSurface) {
  let requested: EnabledStateMap = {};
  return {
    async remember(target: TargetState): Promise<ManualBatch> {
      const batch = diffAgainstTarget(await management.getAll(), target);
      const next = { ...requested };
      for (const id of batch.enableIds) next[id] = true;
      for (const id of batch.disableIds) next[id] = false;
      requested = next;
      return batch;
    },
    wasRequested(extensionId: string, enabled: boolean): boolean {
      return requested[extensionId] === enabled;
    },
  };
}

async function assistedRestore(management: ManagementSurface, original: EnabledStateMap): Promise<RestoreResult> {
  const current = await management.getAll();
  const restoredIds: string[] = [];
  const manualIds: string[] = [];
  const errors: RestoreError[] = [];

  for (const [extensionId, enabled] of Object.entries(original)) {
    const info = current.find((entry) => entry.id === extensionId);
    if (info === undefined) {
      errors.push({
        extensionId,
        code: 'extension-removed',
        message: 'The extension is no longer installed, so it cannot be restored.',
      });
      continue;
    }
    if (info.enabled === enabled) restoredIds.push(extensionId);
    else manualIds.push(extensionId);
  }

  return {
    restoredIds,
    manualIds,
    errors,
    complete: errors.length === 0 && manualIds.length === 0,
  };
}

export function createFirefoxPort({
  management,
  debounceMs = MANUAL_VERIFY_DEBOUNCE_MS,
}: FirefoxPortOptions): ManagementPort {
  const requested = createRequestedStates(management);

  const isPolicyInstalled = async (): Promise<boolean> => {
    const self = await management.getSelf();
    return self.installType === 'admin';
  };

  return {
    async getCapabilities(): Promise<CapabilityReport> {
      const self = await management.getSelf();
      return {
        browserName: 'firefox',
        canAutoToggle: self.installType === 'admin',
        selfInstallType: self.installType,
        sideSurface: 'sidebar',
      };
    },
    listCandidates: () => listSharedCandidates(management),
    listInstalled: (): Promise<InstalledExtension[]> => listInstalledExtensions(management),
    async applyTargetState(target: TargetState): Promise<ToggleResult | ManualBatch> {
      if (await isPolicyInstalled()) return applySharedTargetState(management, target);
      return requested.remember(target);
    },
    async verifyState(expected: TargetState): Promise<DriftReport> {
      if (await isPolicyInstalled()) return verifySharedState(management, expected);
      return verifySharedState(management, expected, {
        wasRequested: (extensionId, enabled) => requested.wasRequested(extensionId, enabled),
      });
    },
    async restore(original: EnabledStateMap): Promise<RestoreResult> {
      if (await isPolicyInstalled()) return restoreSharedState(management, original);
      return assistedRestore(management, original);
    },
    watchEvents(listener: (event: ManagementEvent) => void): () => void {
      const emitter = createDebouncedEmitter(listener, debounceMs);
      const unsubscribe = subscribeToManagementEvents(management, (event) => emitter.push(event));
      return () => {
        emitter.cancel();
        unsubscribe();
      };
    },
  };
}

export function mapAssistedError(error: unknown): string {
  return `${mapToggleError(error)}: ${describeError(error)}`;
}
