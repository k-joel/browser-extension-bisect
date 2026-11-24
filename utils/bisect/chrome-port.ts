import type {
  CapabilityReport,
  DriftReport,
  EnabledStateMap,
  ManagementEvent,
  ManagementPort,
  RestoreResult,
  TargetState,
  ToggleResult,
} from './domain';
import {
  applySharedTargetState,
  listSharedCandidates,
  type PortDependencies,
  restoreSharedState,
  subscribeToManagementEvents,
  verifySharedState,
} from './management-port';

export type ChromePortOptions = PortDependencies;

/**
 * Chrome can always toggle regular extensions, so its `applyTargetState` never
 * narrows to a `ManualBatch`; callers of this port need no assist check.
 */
export interface ChromeManagementPort extends Omit<ManagementPort, 'applyTargetState'> {
  applyTargetState(target: TargetState): Promise<ToggleResult>;
}

export function createChromePort({ management }: ChromePortOptions): ChromeManagementPort {
  return {
    async getCapabilities(): Promise<CapabilityReport> {
      const self = await management.getSelf();
      return {
        browserName: 'chrome',
        canAutoToggle: true,
        selfInstallType: self.installType,
        sideSurface: 'side-panel',
      };
    },
    listCandidates: () => listSharedCandidates(management),
    applyTargetState: (target: TargetState): Promise<ToggleResult> => applySharedTargetState(management, target),
    verifyState: (expected: TargetState): Promise<DriftReport> => verifySharedState(management, expected),
    restore: (original: EnabledStateMap): Promise<RestoreResult> => restoreSharedState(management, original),
    watchEvents: (listener: (event: ManagementEvent) => void): (() => void) =>
      subscribeToManagementEvents(management, listener),
  };
}
