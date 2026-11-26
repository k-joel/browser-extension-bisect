import fs from 'node:fs';
import path from 'node:path';
import { archivePathFor, PreflightError, readCatalog, toFileUrl } from './real-extensions.mjs';
import { buildXpi } from './xpi-writer.mjs';

export const FIREFOX_GECKO_ID = 'dev-test@my-browser-extension.local';
const DISTRIBUTION_DIR = 'distribution';
const POLICY_FILE = 'policies.json';
/**
 * The policy rail needs a Firefox that honours `xpinstall.signatures.required=false`:
 * stable and beta releases ignore the pref, so a policy `force_installed` add-on must
 * be signed there and this add-on's own XPI deliberately is not. Only Nightly qualifies.
 *
 * Its download is kept inside the repository rather than in `~/.cache/puppeteer`,
 * which every project on the machine shares. Keeping it here makes the browser a
 * disposable project artefact: no installer, no registry entry, no shared profile,
 * and deleting `.cache/` removes it completely.
 */
const PORTABLE_CACHE_DIR = path.resolve('.cache/puppeteer');
const CACHE_DIR = path.resolve('.cache/firefox-policy');

function isWithin(dir, root) {
  if (root === undefined) return false;
  const relative = path.relative(path.resolve(root), path.resolve(dir));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function findNightlyInstall(cacheRoot) {
  const root = path.join(path.resolve(cacheRoot), 'firefox');
  if (!fs.existsSync(root)) return null;

  const builds = fs
    .readdirSync(root)
    .filter(
      (entry) =>
        entry.includes('nightly') &&
        (entry.startsWith('win64-') || entry.startsWith('mac-') || entry.startsWith('linux-')),
    )
    .sort((left, right) => right.localeCompare(left));

  for (const entry of builds) {
    for (const inner of ['core', 'firefox', '']) {
      const dir = path.join(root, entry, inner);
      if (fs.existsSync(path.join(dir, 'firefox.exe')) || fs.existsSync(path.join(dir, 'firefox'))) return dir;
    }
  }
  return null;
}

/**
 * Locates the project-local Nightly that `npm run firefox:install` downloads. It never
 * looks at a system installation or the shared Puppeteer cache: using either would
 * reintroduce the machine-wide side effects this project keeps out of its test setup.
 */
export function resolveFirefoxSourceDir({ cacheRoots = [PORTABLE_CACHE_DIR] } = {}) {
  const seen = new Set();

  for (const cacheRoot of cacheRoots) {
    const root = path.resolve(cacheRoot);
    if (seen.has(root)) continue;
    seen.add(root);

    const install = findNightlyInstall(root);
    if (install !== null) return install;
  }

  throw new PreflightError(
    'Puppeteer could not find a project-local Nightly Firefox. Run "npm run firefox:install" and retry.',
  );
}

/**
 * The build a Firefox installation actually is. A self-update rewrites it, which is the
 * only in-place signal that the copy no longer matches the source it came from.
 */
function readBuildId(installDir) {
  const iniPath = path.join(installDir, 'application.ini');
  if (!fs.existsSync(iniPath)) return null;
  const match = /^BuildID=(.+)$/m.exec(fs.readFileSync(iniPath, 'utf8'));
  return match === null ? null : match[1].trim();
}

/**
 * A project-local Nightly is already a private, disposable copy, so the policy is
 * written into it directly. Any other source — notably a shared Puppeteer cache — is
 * copied into `.cache/firefox-policy/` first, so the policy never touches a directory
 * this project does not own.
 *
 * The copy is the one that gets launched, so it is the one that can try to update
 * itself. `DisableAppUpdate` in the policy stops that, but a copy updated before that
 * policy existed — or by a build that ignored it — has already been replaced in place,
 * so the cached build id is compared with the source's and a mismatch re-copies.
 */
export function ensurePolicyFirefox(sourceDir, { cacheDir = CACHE_DIR, portableRoot = PORTABLE_CACHE_DIR } = {}) {
  const source = path.resolve(sourceDir);
  if (isWithin(source, portableRoot)) return source;

  const markerPath = path.join(cacheDir, '.source');
  const marker = `${sourceDir}\n`;
  const cached = fs.existsSync(path.join(cacheDir, 'firefox.exe')) || fs.existsSync(path.join(cacheDir, 'firefox'));
  const markerMatches = fs.existsSync(markerPath) && fs.readFileSync(markerPath, 'utf8') === marker;
  const buildMatches = cached && readBuildId(cacheDir) === readBuildId(sourceDir);

  if (!(cached && markerMatches && buildMatches)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.cpSync(sourceDir, cacheDir, { recursive: true });
    fs.writeFileSync(markerPath, marker);
  }

  return cacheDir;
}

/**
 * Builds the add-on's own unsigned XPI from the existing test-mode build. `wxt zip`
 * also produces an ~850 MB sources archive, so packing the built directory directly
 * keeps this step fast and dependency-free.
 */
export function buildSelfXpi({ buildDir, artifactsDir }) {
  const destination = path.join(artifactsDir, 'self.xpi');
  buildXpi(buildDir, destination);
  return destination;
}

function extensionSettings(extensions) {
  const settings = {};
  for (const extension of extensions) {
    settings[extension.id] = {
      installation_mode: extension.mode,
      install_url: toFileUrl(extension.xpi),
    };
  }
  return settings;
}

/**
 * Writes the policy file that makes Firefox treat this add-on as policy-installed.
 * That is the only supported way to get `installType === 'admin'`, which is in turn
 * the only way `management.setEnabled` may toggle other extensions (Firefox 140+).
 *
 * Candidates are `normal_installed`, not `force_installed`: a forced install is
 * policy-locked and would land in the `policy-locked` ineligible bucket instead of
 * being a candidate the bisect can turn off.
 *
 * `DisableAppUpdate` is not about the add-on at all: this Firefox is a private copy in
 * `.cache/`, and an in-place self-update replaces the whole installation directory —
 * `distribution/policies.json` included — then exits immediately. Puppeteer reports that
 * as "Failed to launch the browser process: Code: 0" with an empty stderr, because
 * handing off to the updater is a clean exit for the process it spawned.
 */
export function writeFirefoxPolicy({ installDir, selfXpi, candidateXpis, badXpi = null, badExtensionId = null }) {
  const distribution = path.join(installDir, DISTRIBUTION_DIR);
  const policyPath = path.join(distribution, POLICY_FILE);
  const backupPath = `${policyPath}.bisect-backup`;

  if (!fs.existsSync(policyPath)) {
    // A genuinely new file: the rollback deletes it rather than restoring anything.
    fs.mkdirSync(distribution, { recursive: true });
  }

  const previous = fs.existsSync(policyPath) ? fs.readFileSync(policyPath, 'utf8') : null;
  if (previous !== null && !fs.existsSync(backupPath)) fs.writeFileSync(backupPath, previous);

  const policy = {
    policies: {
      DisableAppUpdate: true,
      ExtensionSettings: extensionSettings([
        ...(selfXpi === null ? [] : [{ id: FIREFOX_GECKO_ID, mode: 'force_installed', xpi: selfXpi }]),
        ...candidateXpis.map((entry) => ({ id: entry.id, mode: 'normal_installed', xpi: entry.xpi })),
        ...(badXpi === null || badExtensionId === null
          ? []
          : [{ id: badExtensionId, mode: 'normal_installed', xpi: badXpi }]),
      ]),
    },
  };

  fs.writeFileSync(policyPath, `${JSON.stringify(policy, null, 2)}\n`);
  return {
    policyPath,
    badExtensionId,
    restore() {
      if (previous === null) {
        fs.rmSync(policyPath, { force: true });
      } else {
        fs.writeFileSync(policyPath, previous);
      }
      fs.rmSync(backupPath, { force: true });
    },
  };
}

/**
 * The whole Firefox automation rests on one runtime fact: this add-on must report
 * `installType === 'admin'`, because `management.setEnabled` in Firefox refuses to
 * touch other extensions otherwise ("setEnabled can only be used for themes or by
 * addons installed by enterprise policy"). Proving it up front turns a confusing
 * mid-search failure into one actionable message.
 */
export async function assertPolicyAdmin(surface) {
  const info = await surface.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    const self = await api.management.getSelf();
    const all = await api.management.getAll();
    return {
      selfId: self.id,
      installType: self.installType,
      extensionCount: all.filter((entry) => entry.type === 'extension').length,
    };
  });

  if (info.installType !== 'admin') {
    throw new PreflightError(
      `Firefox reports installType "${info.installType}" for this add-on, so it cannot toggle other extensions. ` +
        'The policy install did not take: check that "npm run firefox:install" ran and that ' +
        '<firefox>/distribution/policies.json is valid.',
    );
  }
  return info;
}

export function firefoxPolicyPlan({
  extensionsDir,
  buildDir,
  artifactsDir,
  browserName = 'firefox',
  includeSelf = true,
  badExtensionDir = null,
}) {
  const entries = readCatalog({ extensionsDir, browserName, expectedCount: 20 });
  const candidateXpis = entries.map((entry) => {
    const xpi = archivePathFor(extensionsDir ?? path.resolve('good_extensions'), browserName, entry.slug);
    if (!fs.existsSync(xpi)) {
      throw new PreflightError(
        `Missing signed XPI for "${entry.slug}" at ${xpi}. ` +
          'A policy-installed Firefox candidate must be a store-signed archive, so run "npm run extensions:download".',
      );
    }
    return { id: entry.id, slug: entry.slug, xpi };
  });

  /**
   * The bad extension has to be policy-installed too. A temporary add-on installed over
   * BiDi is permanently enabled in Firefox, so the all-off baseline could never hold and
   * the search could never turn it off.
   */
  let badXpi = null;
  let badExtensionId = null;
  if (badExtensionDir !== null) {
    badXpi = path.join(artifactsDir, 'bad-extension.xpi');
    buildXpi(badExtensionDir, badXpi);
    const manifest = JSON.parse(fs.readFileSync(path.join(badExtensionDir, 'manifest.json'), 'utf8'));
    badExtensionId = manifest.browser_specific_settings?.gecko?.id ?? manifest.applications?.gecko?.id ?? null;
    if (badExtensionId === null) {
      throw new PreflightError('The Firefox build of the bad extension declares no gecko id');
    }
  }

  return {
    entries,
    candidateXpis,
    selfXpi: includeSelf ? buildSelfXpi({ buildDir, artifactsDir }) : null,
    badXpi,
    badExtensionId,
  };
}
