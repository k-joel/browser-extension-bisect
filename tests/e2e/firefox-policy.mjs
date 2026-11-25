import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { archivePathFor, PreflightError, readCatalog, toFileUrl } from './real-extensions.mjs';
import { buildXpi } from './xpi-writer.mjs';

export const FIREFOX_GECKO_ID = 'dev-test@my-browser-extension.local';
const DISTRIBUTION_DIR = 'distribution';
const POLICY_FILE = 'policies.json';
const CACHE_DIR = path.resolve('.cache/firefox-policy');

/**
 * `policies.json` is only read from the installation directory, so the policy has to
 * sit next to the binary that runs. Puppeteer's Firefox lives in a cache shared by
 * every project on the machine, so the runner works on a private copy instead of
 * mutating a directory it does not own.
 *
 * Nightly is required: a policy `force_installed` add-on must be signed on stable
 * Firefox, and this add-on is deliberately unsigned. Nightly honours
 * `xpinstall.signatures.required=false`, which the harness already sets.
 */
export function resolveFirefoxSourceDir() {
  const cacheRoot = path.join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.cache', 'puppeteer', 'firefox');

  if (fs.existsSync(cacheRoot)) {
    const builds = fs
      .readdirSync(cacheRoot)
      .filter((entry) => entry.startsWith('win64-') || entry.startsWith('mac-') || entry.startsWith('linux-'))
      .map((entry) => ({ entry, nightly: entry.includes('nightly') }))
      .sort((left, right) => Number(right.nightly) - Number(left.nightly) || right.entry.localeCompare(left.entry));

    for (const { entry } of builds) {
      for (const inner of ['core', 'firefox', '']) {
        const dir = path.join(cacheRoot, entry, inner);
        if (fs.existsSync(path.join(dir, 'firefox.exe'))) return dir;
        if (fs.existsSync(path.join(dir, 'firefox'))) return dir;
      }
    }
  }

  throw new PreflightError(
    'Puppeteer could not find a Firefox install. Run "npx puppeteer browsers install firefox@nightly" and retry.',
  );
}

/**
 * Copies the Puppeteer Firefox into `.cache/firefox-policy/` once and reuses it, so
 * the policy file never touches a shared installation.
 */
export function ensurePolicyFirefox(sourceDir) {
  const markerPath = path.join(CACHE_DIR, '.source');
  const marker = `${sourceDir}\n`;
  const cached = fs.existsSync(path.join(CACHE_DIR, 'firefox.exe')) || fs.existsSync(path.join(CACHE_DIR, 'firefox'));
  const markerMatches = fs.existsSync(markerPath) && fs.readFileSync(markerPath, 'utf8') === marker;

  if (!(cached && markerMatches)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.cpSync(sourceDir, CACHE_DIR, { recursive: true });
    fs.writeFileSync(markerPath, marker);
  }

  return CACHE_DIR;
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
        'The policy install did not take: check that "npx puppeteer browsers install firefox@nightly" ran and that ' +
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
