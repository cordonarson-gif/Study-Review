import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFile, listPackage, statFile } from '@electron/asar';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagingRoot = path.join(desktopRoot, 'release-staging');
const releaseRoot = path.join(desktopRoot, 'release');
const setupName = 'Cram-Engine-Desktop-Setup-1.2.0-x64.exe';
const setupPath = path.join(stagingRoot, setupName);
const asarPath = path.join(stagingRoot, 'win-unpacked', 'resources', 'app.asar');
const bootstrapPath = path.join(stagingRoot, 'win-unpacked', 'resources', 'miktex-bootstrap.ps1');

const forbiddenEntries = [
  { label: 'test file', pattern: /\.test\./i },
  { label: 'test directory', pattern: /(^|[\\/])(?:test|tests|__tests__)([\\/]|$)/i },
  { label: 'fixtures', pattern: /(^|[\\/])fixtures([\\/]|$)/i },
  { label: 'mock data', pattern: /(^|[\\/])mocks?([\\/]|$)/i },
  { label: 'log file', pattern: /\.log$/i },
  { label: 'source map', pattern: /\.map$/i },
  { label: 'type declaration', pattern: /\.d\.(?:ts|cts)$/i },
  { label: 'environment file', pattern: /(^|[\\/])\.env(?:\.|$)/i },
  { label: 'certificate or private key', pattern: /\.(?:pem|pfx|p12|key|crt)$/i }
];

const secretPatterns = [
  { label: 'OpenAI-style key', pattern: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { label: 'AWS access key', pattern: /AKIA[0-9A-Z]{16}/g },
  { label: 'Google API key', pattern: /AIza[0-9A-Za-z_-]{30,}/g },
  { label: 'GitHub token', pattern: /gh[pousr]_[A-Za-z0-9]{30,}/g },
  { label: 'Slack token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/g },
  { label: 'non-empty API credential default', pattern: /apiKey\s*:\s*["'][^"']{12,}["']/g }
];

function assertNoForbiddenEntry(entry) {
  for (const rule of forbiddenEntries) {
    if (rule.pattern.test(entry)) {
      throw new Error(`Release audit rejected ${rule.label}: ${entry}`);
    }
  }
}

function assertNoSecrets(text, sourceName) {
  for (const rule of secretPatterns) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(text)) {
      throw new Error(`Release audit found ${rule.label} in ${sourceName}`);
    }
  }
}

async function assertRegularFile(filePath, label) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`${label} is missing or empty: ${filePath}`);
  }
}

async function sha256(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

await assertRegularFile(setupPath, 'NSIS setup');
await assertRegularFile(asarPath, 'Electron ASAR');
await assertRegularFile(bootstrapPath, 'MiKTeX bootstrap');

const setupHeader = Buffer.alloc(2);
const setupHandle = await import('node:fs/promises').then(({ open }) => open(setupPath, 'r'));
try {
  await setupHandle.read(setupHeader, 0, setupHeader.length, 0);
} finally {
  await setupHandle.close();
}
if (setupHeader.toString('ascii') !== 'MZ') {
  throw new Error('NSIS setup does not have a Windows PE header.');
}

const archiveEntries = listPackage(asarPath);
for (const rawEntry of archiveEntries) {
  const entry = rawEntry.replace(/^[\\/]/, '');
  assertNoForbiddenEntry(entry);
  const entryStat = statFile(asarPath, entry);
  if (entryStat.files) continue;
  if (/\.wasm\.js$/i.test(entry)) continue;

  if (!/\.(?:cjs|js|json|html|css|ps1|nsh)$/i.test(entry)) continue;
  const contents = extractFile(asarPath, entry);
  if (contents.length > 16 * 1024 * 1024) continue;
  assertNoSecrets(contents.toString('utf8'), entry);
}

assertNoSecrets(await readFile(bootstrapPath, 'utf8'), 'miktex-bootstrap.ps1');

await rm(releaseRoot, { recursive: true, force: true });
await mkdir(releaseRoot, { recursive: true });
const finalSetupPath = path.join(releaseRoot, setupName);
await copyFile(setupPath, finalSetupPath);
const digest = await sha256(finalSetupPath);
const checksumName = `${setupName}.sha256`;
await writeFile(path.join(releaseRoot, checksumName), `${digest}  ${setupName}\r\n`, 'ascii');

const finalEntries = (await readdir(releaseRoot)).sort();
const expectedEntries = [setupName, checksumName].sort();
if (JSON.stringify(finalEntries) !== JSON.stringify(expectedEntries)) {
  throw new Error(`Unexpected final release contents: ${finalEntries.join(', ')}`);
}

await rm(stagingRoot, { recursive: true, force: true });
console.log(`Release audit passed. SHA256: ${digest}`);
