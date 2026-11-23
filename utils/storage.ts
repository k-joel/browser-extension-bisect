import { storage } from 'wxt/utils/storage';

export const enabledItem = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

export const interactionCountItem = storage.defineItem<number>('local:interactionCount', {
  fallback: 0,
});

export interface BisectSettings {
  batchSize: number;
  enabledExtensions: string[];
}

export const BISECT_SETTINGS_DEFAULTS: BisectSettings = {
  batchSize: 1,
  enabledExtensions: [],
};

export const settingsItem = storage.defineItem<BisectSettings>('local:settings', {
  fallback: BISECT_SETTINGS_DEFAULTS,
});

export function createNextSettings(current: BisectSettings, changes: Partial<BisectSettings>): BisectSettings {
  return {
    ...current,
    ...changes,
  };
}

export function formatStatus(enabled: boolean, interactionCount: number): string {
  const state = enabled ? 'enabled' : 'disabled';
  return `${state} (${interactionCount} interactions)`;
}

export function incrementInteractionCount(count: number): number {
  return Number.isFinite(count) && count > 0 ? count + 1 : 1;
}
