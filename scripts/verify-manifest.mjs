/**
 * Manifest and packaging checks that do not need a browser.
 *
 * The Harness installs a bundle through `dsh.bundle.patch`, so a manifest that
 * only declares `dsh.client` is silently uninstallable. This script asserts the
 * shape of the package before anything is published:
 *
 *   1. `package.json` declares `dsh.bundle.patch` and a `web` client half;
 *   2. `cordis.patch.yml` inserts this package under its own id;
 *   3. every path listed in `files` exists (a typo there ships an empty tarball);
 *   4. no shipped file carries a local absolute path.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

/** @param {string} message */
function fail(message) {
  failures.push(message);
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

if (!manifest.dsh?.bundle?.patch) {
  fail('package.json: dsh.bundle.patch is missing — the bundle is not installable');
}
if (manifest.dsh?.client?.platform !== 'web') {
  fail('package.json: dsh.client.platform must be "web" for a UI theme');
}

const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8');
if (!new RegExp(`id:\\s*${manifest.name}\\b`).test(patch)) {
  fail(`cordis.patch.yml: no insert entry with id ${manifest.name}`);
}
if (!patch.includes(manifest.name)) {
  fail(`cordis.patch.yml: does not reference the package name ${manifest.name}`);
}

for (const entry of manifest.files ?? []) {
  // `files` may carry globs (locale/*.json); only plain paths are checked.
  if (entry.includes('*')) continue;
  if (!existsSync(join(root, entry))) fail(`files: ${entry} does not exist`);
}

const shipped = (manifest.files ?? []).filter((entry) => !entry.includes('*'));
const localPath = /\/(?:data\/data|home\/|Users\/)[\w.-]*/;
for (const file of [...shipped, 'cordis.patch.yml']) {
  const text = readFileSync(join(root, file), 'utf8');
  if (localPath.test(text)) fail(`${file}: contains a local absolute path`);
  if (/\btermux\b/i.test(text)) fail(`${file}: mentions termux`);
}

if (failures.length > 0) {
  console.error('manifest check failed:');
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`manifest ok: ${manifest.name}@${manifest.version}`);
