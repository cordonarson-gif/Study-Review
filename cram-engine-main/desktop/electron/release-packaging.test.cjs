const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(desktopRoot, relativePath), 'utf8');
}

function readPackage() {
  return JSON.parse(read('package.json'));
}

test('release metadata fixes version, filename, architecture, and clean pipeline', () => {
  const pkg = readPackage();

  assert.equal(pkg.version, '1.2.0');
  assert.equal(pkg.devDependencies.electron, '36.9.5');
  assert.equal(pkg.build.directories.output, 'release-staging');
  assert.equal(pkg.build.win.artifactName, 'Cram-Engine-Desktop-Setup-1.2.0-x64.${ext}');
  assert.deepEqual(pkg.build.win.target, ['nsis']);
  assert.match(pkg.scripts['release:win'], /typecheck/);
  assert.match(pkg.scripts['release:win'], /npm run test/);
  assert.match(pkg.scripts['release:win'], /clean:release/);
  assert.match(pkg.scripts['release:win'], /build:app/);
  assert.match(pkg.scripts['release:win'], /audit-release\.mjs/);
  assert.match(pkg.scripts['release:win'], /electron-builder --win nsis --x64/);
  assert.equal(
    pkg.build.electronDownload.checksums['electron-v36.9.5-win32-x64.zip'],
    'fb8b47aff266bb2483aabf1c6442d519e27c68b4bf432b8e84fd6823e2515e3c'
  );
});

test('packaged file allowlist excludes tests, logs, declarations, maps, and credentials', () => {
  const files = readPackage().build.files;

  assert.ok(files.includes('dist/**'));
  assert.ok(files.includes('dist-electron/**/*.cjs'));
  for (const excluded of [
    '!**/*.test.*',
    '!**/fixtures/**',
    '!**/*.log',
    '!**/*.map',
    '!**/*.d.ts',
    '!**/*.d.cts',
    '!**/.env*',
    '!**/*.{pem,pfx,p12,key,crt}'
  ]) {
    assert.ok(files.includes(excluded), `missing package exclusion: ${excluded}`);
  }
});

test('MiKTeX bootstrap verifies distribution, signature, exit code, and post-install state', () => {
  const source = read('build/miktex-bootstrap.ps1');

  assert.match(source, /Get-Command\s+miktex\.exe/);
  assert.match(source, /Test-MiKTeXPath/);
  assert.match(source, /https:\/\/miktex\.org\/download\/win\/basic-miktex-x64\.exe/);
  assert.match(source, /Get-AuthenticodeSignature/);
  assert.match(source, /Status\s+-ne\s+["']Valid["']/);
  assert.match(source, /Start-Process[\s\S]*-PassThru/);
  assert.match(source, /\.ExitCode/);
  assert.match(source, /\$DownloadFailure\s*=\s*10/);
  assert.match(source, /\$SignatureFailure\s*=\s*11/);
  assert.match(source, /\$InstallerFailure\s*=\s*12/);
  assert.match(source, /\$VerificationFailure\s*=\s*13/);
  assert.match(source, /exit\s+\$ExitCode/);
  assert.doesNotMatch(source, /installation will continue/i);
});

test('NSIS retries MiKTeX failures or aborts the application installation', () => {
  const source = read('build/installer.nsh');

  assert.match(source, /nsExec::ExecToStack/);
  assert.match(source, /Pop\s+\$0/);
  assert.match(source, /MB_RETRYCANCEL/);
  assert.match(source, /IDRETRY/);
  assert.match(source, /Abort/);
  assert.doesNotMatch(source, /nsExec::ExecToLog/);
});

test('release audit inspects ASAR contents, secrets, and emits only setup plus checksum', () => {
  const source = read('scripts/audit-release.mjs');

  assert.match(source, /app\.asar/);
  assert.match(source, /statFile/);
  assert.match(source, /entryStat\.files/);
  assert.ok(source.includes('/\\.wasm\\.js$/i'));
  assert.ok(source.includes('/\\.test\\./i'));
  assert.match(source, /fixtures/);
  assert.match(source, /source map|\.map/i);
  assert.match(source, /sk-/);
  assert.match(source, /AKIA/);
  assert.match(source, /AIza/);
  assert.match(source, /sha256/i);
  assert.match(source, /Cram-Engine-Desktop-Setup-1\.2\.0-x64\.exe/);
});
