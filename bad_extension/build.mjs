import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const TARGETS = [
  { dir: 'chrome-mv3', manifest: 'manifest.chrome.json', expectedManifestVersion: 3 },
  { dir: 'firefox-mv2', manifest: 'manifest.firefox.json', expectedManifestVersion: 2 },
];

function readManifest(name, expectedManifestVersion) {
  const file = path.join(SRC, name);
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (manifest.manifest_version !== expectedManifestVersion) {
    throw new Error(`${name} declares manifest_version ${manifest.manifest_version}, expected ${expectedManifestVersion}`);
  }
  if (typeof manifest.name !== 'string' || manifest.name.length === 0) {
    throw new Error(`${name} is missing a name`);
  }
  return manifest;
}

function build(target) {
  const manifest = readManifest(target.manifest, target.expectedManifestVersion);
  const outDir = path.join(DIST, target.dir);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.copyFileSync(path.join(SRC, 'content.js'), path.join(outDir, 'content.js'));
  fs.copyFileSync(path.join(SRC, 'content.css'), path.join(outDir, 'content.css'));

  return { target: target.dir, name: manifest.name, version: manifest.version };
}

const built = TARGETS.map(build);
for (const entry of built) {
  console.log(`${entry.target}: ${entry.name} ${entry.version}`);
}
