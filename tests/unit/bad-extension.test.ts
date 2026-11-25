import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve('bad_extension');
const SRC = path.join(ROOT, 'src');

function readManifest(name: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(SRC, name), 'utf8'));
}

function readContentScript(): string {
  return fs.readFileSync(path.join(SRC, 'content.js'), 'utf8');
}

describe('bad extension manifests', () => {
  it('ships an MV3 manifest for Chrome and an MV2 manifest for Firefox', () => {
    expect(readManifest('manifest.chrome.json').manifest_version).toBe(3);
    expect(readManifest('manifest.firefox.json').manifest_version).toBe(2);
  });

  it('declares the same display name for both browsers', () => {
    expect(readManifest('manifest.chrome.json').name).toBe('Bad Extension');
    expect(readManifest('manifest.firefox.json').name).toBe('Bad Extension');
  });

  it('gives the Firefox manifest a gecko id so the policy rail can address it', () => {
    const manifest = readManifest('manifest.firefox.json');
    const geckoId = (manifest.browser_specific_settings as { gecko?: { id?: string } } | undefined)?.gecko?.id;
    expect(geckoId).toBe('bad-extension@browser-extension-bisect.test');
  });

  it('injects on every http and https page at document_start', () => {
    for (const name of ['manifest.chrome.json', 'manifest.firefox.json']) {
      const scripts = readManifest(name).content_scripts as
        | { matches?: string[]; js?: string[]; run_at?: string }[]
        | undefined;
      expect(scripts).toHaveLength(1);
      expect(scripts?.[0]?.matches).toEqual(['http://*/*', 'https://*/*']);
      expect(scripts?.[0]?.js).toEqual(['content.js']);
      expect(scripts?.[0]?.run_at).toBe('document_start');
    }
  });

  it('requests no permissions, so it can never be the reason a page is blocked', () => {
    for (const name of ['manifest.chrome.json', 'manifest.firefox.json']) {
      expect(readManifest(name).permissions).toBeUndefined();
    }
  });
});

describe('bad extension symptom contract', () => {
  const content = readContentScript();

  it('renders the human-readable banner the runner and a person both look for', () => {
    expect(content).toContain("'bad-extension-banner'");
    expect(content).toContain("'Bad extension enabled'");
  });

  it('exposes the machine-readable markers the E2E reads', () => {
    expect(content).toContain("'data-bad-extension'");
    expect(content).toContain("'bad-extension-state'");
    expect(content).toContain("'[BAD_EXT_ACTIVE]'");
  });

  it('raises both error modes from the same injection', () => {
    // One content script has to serve the human and the agent, otherwise the two could
    // disagree about whether the fault is present.
    expect(content).toContain('setAttribute(MARKER_ATTRIBUTE');
    expect(content).toContain('console.info(CONSOLE_MARKER)');
    expect(content).toContain('renderBanner');
  });

  it('never names or inspects an extension, because identifying the culprit is the bisect job', () => {
    expect(content).not.toContain('management.');
    expect(content).not.toContain('runtime.getManifest');
    expect(content).not.toContain('chrome.');
    expect(content).not.toContain('browser.');
  });
});

describe('bad extension build output', () => {
  const targets = [
    { dir: 'chrome-mv3', manifestVersion: 3 },
    { dir: 'firefox-mv2', manifestVersion: 2 },
  ];

  it.each(targets)('produces a loadable $dir target', ({ dir, manifestVersion }) => {
    const buildDir = path.join(ROOT, 'dist', dir);
    if (!fs.existsSync(path.join(buildDir, 'manifest.json'))) {
      // `npm run bad-extension:build` is a prerequisite of the E2E gate, not of unit tests.
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(buildDir, 'manifest.json'), 'utf8'));
    expect(manifest.manifest_version).toBe(manifestVersion);
    expect(fs.existsSync(path.join(buildDir, 'content.js'))).toBe(true);
    expect(fs.existsSync(path.join(buildDir, 'content.css'))).toBe(true);
  });
});
