import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ensurePolicyFirefox, resolveFirefoxSourceDir, writeFirefoxPolicy } from '../../tests/e2e/firefox-policy.mjs';

const SOURCE_BUILD = '20261125090528';
const UPDATED_BUILD = '20261126095627';

let root: string;

function makeInstall(dir: string, buildId: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'firefox.exe'), 'binary');
  fs.writeFileSync(path.join(dir, 'application.ini'), `[App]\nName=Firefox\nBuildID=${buildId}\n`);
}

function makePuppeteerInstall(cacheRoot: string, entry: string, inner: string): string {
  const dir = path.join(cacheRoot, 'firefox', entry, inner);
  makeInstall(dir, SOURCE_BUILD);
  return dir;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bisect-policy-'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('portable Firefox resolution', () => {
  it('prefers the project-local cache over any other cache root', () => {
    const projectCache = path.join(root, 'project-cache');
    const sharedCache = path.join(root, 'shared-cache');
    const portable = makePuppeteerInstall(projectCache, 'win64-nightly_163.0a1', 'firefox');
    makePuppeteerInstall(sharedCache, 'win64-nightly_164.0a1', 'firefox');

    expect(resolveFirefoxSourceDir({ cacheRoots: [projectCache, sharedCache] })).toBe(portable);
  });

  it('skips stable builds, which cannot install the unsigned policy add-on', () => {
    const cacheRoot = path.join(root, 'cache');
    makePuppeteerInstall(cacheRoot, 'win64-stable_160.0', 'core');
    const nightly = makePuppeteerInstall(cacheRoot, 'win64-nightly_163.0a1', 'firefox');

    expect(resolveFirefoxSourceDir({ cacheRoots: [cacheRoot] })).toBe(nightly);
  });
});

describe('policy Firefox copy', () => {
  it('writes the policy into a project-portable install instead of copying it', () => {
    const portableRoot = path.join(root, 'portable');
    const source = makePuppeteerInstall(portableRoot, 'win64-nightly_163.0a1', 'firefox');
    const cacheDir = path.join(root, 'cache');

    expect(ensurePolicyFirefox(source, { cacheDir, portableRoot })).toBe(source);
    expect(fs.existsSync(cacheDir)).toBe(false);
  });

  it('copies the source once and reuses the copy while it still matches', () => {
    const source = path.join(root, 'source');
    const cacheDir = path.join(root, 'cache');
    makeInstall(source, SOURCE_BUILD);

    expect(ensurePolicyFirefox(source, { cacheDir })).toBe(cacheDir);
    const firstWrite = fs.statSync(path.join(cacheDir, 'application.ini')).mtimeMs;

    fs.writeFileSync(path.join(cacheDir, 'marker-of-reuse'), 'yes');
    ensurePolicyFirefox(source, { cacheDir });

    expect(fs.existsSync(path.join(cacheDir, 'marker-of-reuse'))).toBe(true);
    expect(fs.statSync(path.join(cacheDir, 'application.ini')).mtimeMs).toBe(firstWrite);
  });

  it('re-copies a cache whose build id no longer matches its source', () => {
    const source = path.join(root, 'source');
    const cacheDir = path.join(root, 'cache');
    makeInstall(source, SOURCE_BUILD);

    ensurePolicyFirefox(source, { cacheDir });
    // A Firefox self-update replaces the installation in place: the build id moves on and
    // the policy file is gone with everything else that was written into the directory.
    makeInstall(cacheDir, UPDATED_BUILD);
    fs.rmSync(path.join(cacheDir, 'distribution'), { recursive: true, force: true });

    ensurePolicyFirefox(source, { cacheDir });

    const ini = fs.readFileSync(path.join(cacheDir, 'application.ini'), 'utf8');
    expect(ini).toContain(`BuildID=${SOURCE_BUILD}`);
    expect(ini).not.toContain(UPDATED_BUILD);
  });

  it('treats a cache with no build id as stale rather than trusting it', () => {
    const source = path.join(root, 'source');
    const cacheDir = path.join(root, 'cache');
    makeInstall(source, SOURCE_BUILD);
    makeInstall(cacheDir, SOURCE_BUILD);
    fs.rmSync(path.join(cacheDir, 'application.ini'));

    ensurePolicyFirefox(source, { cacheDir });

    expect(fs.readFileSync(path.join(cacheDir, 'application.ini'), 'utf8')).toContain(`BuildID=${SOURCE_BUILD}`);
  });
});

describe('policy file', () => {
  it('disables application updates, because an in-place update replaces the policy itself', () => {
    const installDir = path.join(root, 'install');
    makeInstall(installDir, SOURCE_BUILD);

    const policy = writeFirefoxPolicy({
      installDir,
      selfXpi: path.join(root, 'self.xpi'),
      candidateXpis: [],
      badXpi: null,
      badExtensionId: null,
    });

    const written = JSON.parse(fs.readFileSync(policy.policyPath, 'utf8'));
    expect(written.policies.DisableAppUpdate).toBe(true);
    policy.restore();
  });

  it('keeps the extension policy alongside it', () => {
    const installDir = path.join(root, 'install');
    makeInstall(installDir, SOURCE_BUILD);

    const policy = writeFirefoxPolicy({
      installDir,
      selfXpi: path.join(root, 'self.xpi'),
      candidateXpis: [{ id: 'candidate@example.com', xpi: path.join(root, 'candidate.xpi') }],
      badXpi: path.join(root, 'bad.xpi'),
      badExtensionId: 'bad@example.com',
    });

    const written = JSON.parse(fs.readFileSync(policy.policyPath, 'utf8'));
    expect(Object.keys(written.policies.ExtensionSettings)).toHaveLength(3);
    expect(written.policies.ExtensionSettings['candidate@example.com'].installation_mode).toBe('normal_installed');
    expect(written.policies.ExtensionSettings['bad@example.com'].installation_mode).toBe('normal_installed');
    policy.restore();
  });

  it('deletes the policy again when there was no previous file', () => {
    const installDir = path.join(root, 'install');
    makeInstall(installDir, SOURCE_BUILD);

    const policy = writeFirefoxPolicy({
      installDir,
      selfXpi: path.join(root, 'self.xpi'),
      candidateXpis: [],
      badXpi: null,
      badExtensionId: null,
    });
    expect(fs.existsSync(policy.policyPath)).toBe(true);

    policy.restore();
    expect(fs.existsSync(policy.policyPath)).toBe(false);
  });
});
