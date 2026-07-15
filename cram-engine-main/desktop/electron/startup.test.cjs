const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(desktopRoot, 'package.json');
const mainSourcePath = path.join(__dirname, 'main.cts');
const preloadSourcePath = path.join(__dirname, 'preload.cts');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function readMainSource() {
  return fs.readFileSync(mainSourcePath, 'utf8');
}

function readPreloadSource() {
  return fs.readFileSync(preloadSourcePath, 'utf8');
}

test('package main entry points at compiled electron main bundle', () => {
  const pkg = readPackageJson();

  assert.equal(pkg.main, 'dist-electron/main.cjs');
});

test('dev script waits for compiled electron main bundle', () => {
  const pkg = readPackageJson();

  assert.match(pkg.scripts.dev, /dist-electron\/main\.cjs/);
});

test('main process loads compiled preload bundle with cjs extension', () => {
  const source = readMainSource();

  assert.match(source, /preloadPath\s*=\s*path\.join\(__dirname,\s*'preload\.cjs'\)/);
});

test('main process registers provider settings IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('settings:testProvider'/);
  assert.match(source, /ipcMain\.handle\('settings:fetchProviderModels'/);
});

test('project chat resolves an exact profile before falling back to the active provider', () => {
  const source = readMainSource();

  assert.match(source, /settings\.providers\.find\(\(profile\) => profile\.id === project\.meta\.provider\)/);
  assert.match(source, /settings\.providers\.find\(\(profile\) => profile\.provider === project\.meta\.provider\)/);
  assert.match(source, /getActiveProvider\(settings\)/);
});

test('preload adapts v2 settings for the legacy renderer without changing the IPC payload', () => {
  const source = readPreloadSource();

  assert.match(source, /function toLegacySettings\(settings: AppSettings\): SettingsCompatibilityResult/);
  assert.match(source, /function toV2Settings\(settings: unknown\): AppSettings/);
  assert.match(source, /getSettings: \(\) => ipcRenderer\.invoke\('settings:get'\)\.then\(toLegacySettings\)/);
  assert.match(source, /saveSettings: \(settings: unknown\) => ipcRenderer\.invoke\('settings:save', toV2Settings\(settings\)\)\.then\(toLegacySettings\)/);
  assert.match(source, /legacy\.provider === activeProfile\.provider\s*\? activeProfile/);
  assert.match(source, /fetchModels: \(\) => ipcRenderer\.invoke\('settings:fetchModels'\)\.then\(toLegacySettings\)/);
});
