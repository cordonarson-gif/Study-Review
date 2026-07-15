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

test('learning path model is declared in renderer and global contracts', () => {
  const types = fs.readFileSync(typesSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');

  for (const source of [types, globalTypes]) {
    assert.match(source, /type LearningPathTaskStatus = 'todo' \| 'doing' \| 'done'/);
    assert.match(source, /type LearningPathTask =/);
    assert.match(source, /type LearningPathStage =/);
    assert.match(source, /type LearningPathPlan =/);
    assert.match(source, /reviewCadence/);
    assert.match(source, /type GenerateLearningPathInput =/);
  }
});

test('PathAgent has project-local persistence and deterministic fallback generation', () => {
  const main = readMainSource();

  assert.match(main, /function projectLearningPathPlanPath\(projectId: string\)/);
  assert.match(main, /async function getLearningPathPlan\(projectId: string\)/);
  assert.match(main, /function buildFallbackLearningPathPlan/);
  assert.match(main, /async function generateLearningPathPlan\(projectId: string, input: GenerateLearningPathInput\)/);
  assert.match(main, /async function saveLearningPathPlan\(projectId: string, plan: LearningPathPlan\)/);
  assert.match(main, /reviewCadence/);
  assert.match(main, /risks/);
});
