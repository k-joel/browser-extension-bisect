import type { CapabilityReport, ManagementPort } from './domain';
import { createNotImplementedMethods, listSharedCandidates, type PortDependencies } from './management-port';

export type FirefoxPortOptions = PortDependencies;

export function createFirefoxPort({ management }: FirefoxPortOptions): ManagementPort {
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
    ...createNotImplementedMethods(),
  };
}
