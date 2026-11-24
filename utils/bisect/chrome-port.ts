import type {
  CapabilityReport,
  DriftReport,
  EnabledStateMap,
  ManagementPort,
  RestoreResult,
  TargetState,
  ToggleResult,
} from './domain';
import {
  applySharedTargetState,
  createNotImplementedWatchEvents,
  listSharedCandidates,
  type PortDependencies,
  restoreSharedState,
  verifySharedState,
} from './management-port';

export type ChromePortOptions = PortDependencies;

export function createChromePort({ management }: ChromePortOptions): ManagementPort {
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
    ...createNotImplementedWatchEvents(),
  };
}
