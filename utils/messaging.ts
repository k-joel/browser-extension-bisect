import { defineExtensionMessaging } from '@webext-core/messaging';
import type { BisectSettings } from './storage';

export interface ExtensionState {
  enabled: boolean;
  interactionCount: number;
  settings: BisectSettings;
}

export interface ContentStatus {
  active: boolean;
  marker: string | null;
}

export interface ProtocolMap {
  getState(): ExtensionState;
  updateState(changes: Partial<BisectSettings> & { enabled?: boolean }): ExtensionState;
  recordInteraction(): ExtensionState;
  getContentStatus(targetTabId?: number): ContentStatus;
  getContentMarker(): string | null;
  getTabId(): number | null;
}

export const messenger = defineExtensionMessaging<ProtocolMap>();
