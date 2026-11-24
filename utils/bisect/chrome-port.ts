import type { CapabilityReport, ManagementPort } from './domain';
import { createNotImplementedMethods, listSharedCandidates, type PortDependencies } from './management-port';

export type ChromePortOptions = PortDependencies;

export function createChromePort({ management, getExcludedExtensionIds }: ChromePortOptions): ManagementPort {
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
    listCandidates: () => listSharedCandidates(management, getExcludedExtensionIds),
    ...createNotImplementedMethods(),
  };
}
