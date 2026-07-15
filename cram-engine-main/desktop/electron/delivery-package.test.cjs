const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSourcePath = path.join(__dirname, 'main.cts');
const typesSourcePath = path.join(__dirname, '..', 'src', 'lib', 'types.ts');
const globalSourcePath = path.join(__dirname, '..', 'src', 'global.d.ts');

test('delivery package model is declared in renderer and global contracts', () => {
  const types = fs.readFileSync(typesSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');

  for (const source of [types, globalTypes]) {
    assert.match(source, /type DeliveryPackageItemType =/);
    assert.match(source, /type DeliveryPackageItemStatus = 'ready' \| 'needs-review' \| 'missing'/);
    assert.match(source, /type DeliveryPackageItem =/);
    assert.match(source, /type DeliveryPackage =/);
    assert.match(source, /checklist/);
  }
});

test('DeliveryAgent has project-local persistence and export generation', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');

  assert.match(main, /function projectDeliveryPackagePath\(projectId: string\)/);
  assert.match(main, /async function getDeliveryPackage\(projectId: string\)/);
  assert.match(main, /function buildFallbackDeliveryPackage/);
  assert.match(main, /async function generateDeliveryPackage\(projectId: string\)/);
  assert.match(main, /async function saveDeliveryPackage\(projectId: string, deliveryPackage: DeliveryPackage\)/);
  assert.match(main, /async function exportDeliveryPackage\(projectId: string\)/);
});
