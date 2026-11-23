import type { ExtensionState } from './messaging';
import {
  type BisectSettings,
  createNextSettings,
  enabledItem,
  incrementInteractionCount,
  interactionCountItem,
  settingsItem,
} from './storage';

export interface StateUpdate extends Partial<BisectSettings> {
  enabled?: boolean;
}

export async function readState(): Promise<ExtensionState> {
  const [enabled, interactionCount, settings] = await Promise.all([
    enabledItem.getValue(),
    interactionCountItem.getValue(),
    settingsItem.getValue(),
  ]);
  return { enabled, interactionCount, settings };
}

function extractSettingsChanges(update: StateUpdate): Partial<BisectSettings> {
  const changes: Partial<BisectSettings> = {};
  if (update.batchSize !== undefined) changes.batchSize = update.batchSize;
  if (update.enabledExtensions !== undefined) changes.enabledExtensions = update.enabledExtensions;
  return changes;
}

export async function applyStateUpdate(update: StateUpdate): Promise<ExtensionState> {
  const current = await readState();
  const nextEnabled = update.enabled ?? current.enabled;
  const nextSettings = createNextSettings(current.settings, extractSettingsChanges(update));
  await Promise.all([enabledItem.setValue(nextEnabled), settingsItem.setValue(nextSettings)]);
  return {
    enabled: nextEnabled,
    interactionCount: current.interactionCount,
    settings: nextSettings,
  };
}

export async function recordInteraction(): Promise<ExtensionState> {
  const current = await readState();
  const nextCount = incrementInteractionCount(current.interactionCount);
  await interactionCountItem.setValue(nextCount);
  return {
    ...current,
    interactionCount: nextCount,
  };
}
