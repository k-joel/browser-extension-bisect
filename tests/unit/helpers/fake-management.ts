import type { ManagementExtensionInfo, ManagementSurface } from '@/utils/bisect/management-port';

export interface FakeManagementOptions {
  extensions: ManagementExtensionInfo[];
  self: ManagementExtensionInfo;
  setEnabledError?: (id: string, enabled: boolean) => Error | null;
}

export interface FakeManagement extends ManagementSurface {
  setEnabledCalls: { id: string; enabled: boolean }[];
  emitEnabled(info: ManagementExtensionInfo): void;
  emitDisabled(info: ManagementExtensionInfo): void;
  emitInstalled(info: ManagementExtensionInfo): void;
  emitUninstalled(id: string): void;
}

type Listener<T> = (value: T) => void;

function createEvent<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    surface: {
      addListener: (listener: Listener<T>) => {
        listeners.add(listener);
      },
      removeListener: (listener: Listener<T>) => {
        listeners.delete(listener);
      },
    },
    emit: (value: T) => {
      for (const listener of listeners) listener(value);
    },
  };
}

export function makeExtensionInfo(
  overrides: Partial<ManagementExtensionInfo> & { id: string; name: string },
): ManagementExtensionInfo {
  return {
    version: '1.0.0',
    description: '',
    enabled: true,
    mayDisable: true,
    installType: 'normal',
    type: 'extension',
    icons: [],
    ...overrides,
  };
}

export function createFakeManagement(options: FakeManagementOptions): FakeManagement {
  const extensions = options.extensions.map((info) => ({ ...info }));
  const setEnabledCalls: { id: string; enabled: boolean }[] = [];
  const enabled = createEvent<ManagementExtensionInfo>();
  const disabled = createEvent<ManagementExtensionInfo>();
  const installed = createEvent<ManagementExtensionInfo>();
  const uninstalled = createEvent<string>();

  return {
    getAll: async () => extensions.map((info) => ({ ...info })),
    getSelf: async () => ({ ...options.self }),
    setEnabled: async (id, nextEnabled) => {
      setEnabledCalls.push({ id, enabled: nextEnabled });
      const error = options.setEnabledError?.(id, nextEnabled) ?? null;
      if (error !== null) throw error;
      const target = extensions.find((info) => info.id === id);
      if (target !== undefined) target.enabled = nextEnabled;
    },
    onEnabled: enabled.surface,
    onDisabled: disabled.surface,
    onInstalled: installed.surface,
    onUninstalled: uninstalled.surface,
    setEnabledCalls,
    emitEnabled: enabled.emit,
    emitDisabled: disabled.emit,
    emitInstalled: installed.emit,
    emitUninstalled: uninstalled.emit,
  };
}
