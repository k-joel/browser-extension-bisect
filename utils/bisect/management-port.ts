import type { CandidateExtension, CandidateLists, ExtensionKind, IneligibleExtension, ManagementPort } from './domain';

export interface ManagementExtensionInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  mayDisable: boolean;
  installType: string;
  type: string;
  icons?: { url: string; size: number }[];
}

export interface ManagementEventSurface<T> {
  addListener(listener: (value: T) => void): void;
  removeListener(listener: (value: T) => void): void;
}

export interface ManagementSurface {
  getAll(): Promise<ManagementExtensionInfo[]>;
  getSelf(): Promise<ManagementExtensionInfo>;
  setEnabled(id: string, enabled: boolean): Promise<void>;
  onEnabled: ManagementEventSurface<ManagementExtensionInfo>;
  onDisabled: ManagementEventSurface<ManagementExtensionInfo>;
  onInstalled: ManagementEventSurface<ManagementExtensionInfo>;
  onUninstalled: ManagementEventSurface<string>;
}

export interface PortDependencies {
  management: ManagementSurface;
}

export const NOT_IMPLEMENTED_MESSAGE = 'not implemented';

export interface CandidateFilterOptions {
  selfId: string;
}

function toCandidate(info: ManagementExtensionInfo): CandidateExtension {
  return {
    id: info.id,
    name: info.name,
    version: info.version,
    description: info.description ?? '',
    enabledAtStart: info.enabled,
    mayDisable: info.mayDisable,
    installType: info.installType,
    type: info.type as ExtensionKind,
    icons: info.icons ?? [],
  };
}

export function resolveIneligibleReason(
  info: ManagementExtensionInfo,
  options: CandidateFilterOptions,
): IneligibleExtension['reason'] | null {
  if (info.id === options.selfId) return 'self';
  if (info.type !== 'extension') return 'theme-or-app';
  if (!info.enabled) return 'disabled-at-start';
  if (!info.mayDisable) return 'policy-locked';
  return null;
}

export function compareCandidates(left: { name: string; id: string }, right: { name: string; id: string }): number {
  const byName = left.name.localeCompare(right.name, 'en', { sensitivity: 'variant' });
  if (byName !== 0) return byName;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function partitionCandidates(infos: ManagementExtensionInfo[], options: CandidateFilterOptions): CandidateLists {
  const eligible: CandidateExtension[] = [];
  const ineligible: IneligibleExtension[] = [];

  for (const info of infos) {
    const reason = resolveIneligibleReason(info, options);
    if (reason === null) {
      eligible.push(toCandidate(info));
    } else {
      ineligible.push({
        id: info.id,
        name: info.name,
        version: info.version,
        type: info.type as ExtensionKind,
        reason,
      });
    }
  }

  eligible.sort(compareCandidates);
  ineligible.sort(compareCandidates);
  return { eligible, ineligible };
}

export async function listSharedCandidates(management: ManagementSurface): Promise<CandidateLists> {
  const [all, self] = await Promise.all([management.getAll(), management.getSelf()]);
  return partitionCandidates(all, { selfId: self.id });
}

export function createNotImplementedMethods(): Pick<
  ManagementPort,
  'applyTargetState' | 'verifyState' | 'restore' | 'watchEvents'
> {
  const reject = () => Promise.reject(new Error(NOT_IMPLEMENTED_MESSAGE));
  const throwSync = (): never => {
    throw new Error(NOT_IMPLEMENTED_MESSAGE);
  };
  return {
    applyTargetState: reject,
    verifyState: reject,
    restore: reject,
    watchEvents: throwSync,
  };
}
