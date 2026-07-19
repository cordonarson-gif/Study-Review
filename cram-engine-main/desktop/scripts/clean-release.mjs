import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const relativePath of ['dist', 'dist-electron', 'release-staging', 'release']) {
  await rm(path.join(desktopRoot, relativePath), { recursive: true, force: true });
}

console.log('Cleaned release and build directories.');
