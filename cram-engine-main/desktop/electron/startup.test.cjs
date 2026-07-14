const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(desktopRoot, 'package.json');
const mainSourcePath = path.join(__dirname, 'main.cts');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function readMainSource() {
  return fs.readFileSync(mainSourcePath, 'utf8');
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
