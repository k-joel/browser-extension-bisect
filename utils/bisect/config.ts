import { storage } from 'wxt/utils/storage';
import type { BisectConfig, TestTabBinding } from './domain';

export const BISECT_CONFIG_KEY = 'local:bisectConfig' as const;

export const DEFAULT_BISECT_CONFIG: BisectConfig = {
  schemaVersion: 1,
  excludedExtensionIds: [],
  testTab: null,
};

export const LEGACY_STORAGE_KEYS = ['local:enabled', 'local:interactionCount', 'local:settings'] as const;

export const bisectConfigItem = storage.defineItem<BisectConfig>(BISECT_CONFIG_KEY, {
  fallback: DEFAULT_BISECT_CONFIG,
});

function isTestTabBinding(value: unknown): value is TestTabBinding {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<TestTabBinding>;
  const urlIsValid = candidate.url === null || typeof candidate.url === 'string';
  return typeof candidate.tabId === 'number' && Number.isInteger(candidate.tabId) && urlIsValid;
}

function sanitizeExcludedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0);
  return [...new Set(ids)];
}

export function normalizeBisectConfig(value: unknown): BisectConfig {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Partial<BisectConfig>;
  return {
    schemaVersion: 1,
    excludedExtensionIds: sanitizeExcludedIds(source.excludedExtensionIds),
    testTab: isTestTabBinding(source.testTab) ? source.testTab : null,
  };
}

export async function readBisectConfig(): Promise<BisectConfig> {
  return normalizeBisectConfig(await bisectConfigItem.getValue());
}

async function writeBisectConfig(changes: Partial<BisectConfig>): Promise<BisectConfig> {
  const current = await readBisectConfig();
  const { schemaVersion: _ignoredVersion, ...rest } = changes;
  const next = normalizeBisectConfig({ ...current, ...rest });
  await bisectConfigItem.setValue(next);
  return next;
}

let writeQueue: Promise<unknown> = Promise.resolve();

export function updateBisectConfig(changes: Partial<BisectConfig>): Promise<BisectConfig> {
  const next = writeQueue.then(
    () => writeBisectConfig(changes),
    () => writeBisectConfig(changes),
  );
  writeQueue = next.catch(() => undefined);
  return next;
}

export function watchBisectConfig(listener: (config: BisectConfig) => void): () => void {
  return bisectConfigItem.watch((value) => listener(normalizeBisectConfig(value)));
}

export async function deleteLegacyStorageKeys(): Promise<void> {
  await storage.removeItems([...LEGACY_STORAGE_KEYS]);
}
