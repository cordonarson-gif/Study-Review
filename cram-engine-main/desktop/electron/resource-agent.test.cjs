const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSourcePath = path.join(__dirname, 'main.cts');
const typesSourcePath = path.join(__dirname, '..', 'src', 'lib', 'types.ts');
const globalSourcePath = path.join(__dirname, '..', 'src', 'global.d.ts');

function readMainSource() {
  return fs.readFileSync(mainSourcePath, 'utf8');
}

test('personalized resource model is declared in renderer and global contracts', () => {
  const types = fs.readFileSync(typesSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');

  for (const source of [types, globalTypes]) {
    assert.match(source, /type PersonalizedResourceType = 'handout' \| 'example' \| 'flashcard' \| 'remediation'/);
    assert.match(source, /type PersonalizedResource =/);
    assert.match(source, /contentMarkdown/);
    assert.match(source, /profileSignal/);
    assert.match(source, /type GeneratePersonalizedResourcesInput =/);
  }
});

test('ResourceAgent has project-local persistence and deterministic fallback generation', () => {
  const main = readMainSource();

  assert.match(main, /function projectGeneratedResourcesPath\(projectId: string\)/);
  assert.match(main, /async function listPersonalizedResources\(projectId: string\)/);
  assert.match(main, /function buildFallbackPersonalizedResources/);
  assert.match(main, /async function generatePersonalizedResources\(projectId: string, input: GeneratePersonalizedResourcesInput\)/);
  assert.match(main, /async function savePersonalizedResource\(projectId: string, resource: PersonalizedResource\)/);
  assert.match(main, /async function deletePersonalizedResource\(projectId: string, resourceId: string\)/);
  assert.match(main, /handout/);
  assert.match(main, /flashcard/);
  assert.match(main, /remediation/);
});
