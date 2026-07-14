const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const fileAccessPath = path.join(__dirname, '..', 'dist-electron', 'file-access.cjs');

function loadFileAccess() {
  return require(fileAccessPath);
}

test('assertAllowedProjectPath allows files inside project root', async () => {
  const fileAccess = await loadFileAccess();
  const projectRoot = 'C:/data/project-alpha';
  const nestedFile = 'C:/data/project-alpha/notes/chapter1.md';

  assert.equal(fileAccess.assertAllowedProjectPath(projectRoot, nestedFile), nestedFile);
});

test('assertAllowedProjectPath rejects traversal outside project root', async () => {
  const fileAccess = await loadFileAccess();
  const projectRoot = 'C:/data/project-alpha';
  const outsideFile = 'C:/data/secret.txt';

  assert.throws(() => fileAccess.assertAllowedProjectPath(projectRoot, outsideFile), /outside the allowed project root/i);
});
