import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const settingsDir = dirname(fileURLToPath(import.meta.url));

async function readComponent(name) {
  return readFile(join(settingsDir, `${name}.tsx`), 'utf8');
}

test('ProviderSettingsPage composes the three-column settings workspace', async () => {
  const source = await readComponent('ProviderSettingsPage');

  assert.match(source, /<SettingsCategoryNav\b/);
  assert.match(source, /<ProviderList\b/);
  assert.match(source, /<ProviderDetail\b/);
});

test('ProviderDetail exposes connection testing and model management', async () => {
  const source = await readComponent('ProviderDetail');

  assert.match(source, /testProviderConnection/);
  assert.match(source, /<ModelManager\b/);
  assert.match(source, /测试连接/);
});
