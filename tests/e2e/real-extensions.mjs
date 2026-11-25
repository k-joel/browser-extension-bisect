import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_EXTENSIONS_DIR = path.resolve('good_extensions');
export const BAD_EXTENSION_DIR = path.resolve('bad_extension/dist');
export const BAD_EXTENSION_BANNER_ID = 'bad-extension-banner';
export const BAD_EXTENSION_ATTRIBUTE = 'data-bad-extension';
export const BAD_EXTENSION_META_NAME = 'bad-extension-state';
export const BAD_EXTENSION_CONSOLE_MARKER = '[BAD_EXT_ACTIVE]';

const TARGET_DIR = { chrome: 'chrome-mv3', firefox: 'firefox-mv2' };
const ARCHIVE_EXTENSION = { chrome: 'crx', firefox: 'xpi' };

export class PreflightError extends Error {}

/**
 * Reads the downloader's catalog for one browser. The downloader writes
 * `good_extensions/catalog.json`; nothing here re-derives an id from a store URL,
 * so the runner installs exactly what the download step recorded.
 */
export function readCatalog({ extensionsDir = DEFAULT_EXTENSIONS_DIR, browserName, expectedCount }) {
  const catalogPath = path.join(extensionsDir, 'catalog.json');
  if (!fs.existsSync(catalogPath)) {
    throw new PreflightError(
      `No catalog at ${catalogPath}. Run "npm run extensions:download" to fetch the curated extensions.`,
    );
  }

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (error) {
    throw new PreflightError(`Catalog at ${catalogPath} is not valid JSON: ${error.message}`);
  }

  const entries = catalog?.browsers?.[browserName]?.extensions;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new PreflightError(
      `Catalog has no entries for ${browserName}. Run "npm run extensions:download -- --browser=${browserName}".`,
    );
  }

  if (entries.length < expectedCount) {
    throw new PreflightError(
      `Catalog has ${entries.length} ${browserName} extension(s) but ${expectedCount} are required. ` +
        `Run "npm run extensions:download -- --browser=${browserName}" and fix any failed entry.`,
    );
  }

  const selected = entries.slice(0, expectedCount);
  for (const entry of selected) {
    const dir = path.resolve(extensionsDir, '..', entry.dir);
    if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
      throw new PreflightError(
        `Extension "${entry.slug}" is listed in the catalog but ${dir} has no manifest.json. ` +
          `Run "npm run extensions:download -- --browser=${browserName}" to repair it.`,
      );
    }
  }

  return selected;
}

export function readBadExtensionDir(browserName) {
  const target = TARGET_DIR[browserName];
  if (target === undefined) throw new PreflightError(`Unsupported browser "${browserName}"`);
  const dir = path.join(BAD_EXTENSION_DIR, target);
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
    throw new PreflightError(`The bad extension is not built at ${dir}. Run "npm run bad-extension:build" first.`);
  }
  return dir;
}

export function goodExtensionPaths(entries, { extensionsDir = DEFAULT_EXTENSIONS_DIR } = {}) {
  return entries.map((entry) => path.resolve(extensionsDir, '..', entry.dir));
}

export function archivePathFor(extensionsDir, browserName, slug) {
  return path.join(extensionsDir, '_archives', browserName, `${slug}.${ARCHIVE_EXTENSION[browserName]}`);
}

/**
 * The Firefox policy file only accepts `file://` install URLs, so every path has
 * to round-trip through a URL rather than a plain string join.
 */
export function toFileUrl(absolutePath) {
  const normalized = absolutePath.replace(/\\/g, '/');
  return `file:///${normalized.replace(/^\//, '')}`;
}
