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

test('learning profile model has the expected eight dimensions and project-local state', () => {
  const types = fs.readFileSync(typesSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');
  const main = readMainSource();

  for (const source of [types, globalTypes]) {
    assert.match(source, /type LearningProfile =/);
    assert.match(source, /knowledgeLevel/);
    assert.match(source, /learningGoal/);
    assert.match(source, /cognitiveStyle/);
    assert.match(source, /weakPoints/);
    assert.match(source, /mistakePatterns/);
    assert.match(source, /resourcePreferences/);
    assert.match(source, /availableTime/);
    assert.match(source, /motivation/);
    assert.match(source, /type LearningProfileState =/);
  }

  assert.match(main, /function projectProfileDir\(projectId: string\)/);
  assert.match(main, /function projectProfilePath\(projectId: string\)/);
  assert.match(main, /function projectProfileEventsPath\(projectId: string\)/);
  assert.match(main, /const defaultLearningProfile/);
});

test('ProfileAgent has deterministic fallback analysis and event persistence', () => {
  const main = readMainSource();

  assert.match(main, /async function analyzeLearningProfile\(projectId: string, input: string\)/);
  assert.match(main, /function buildFallbackProfileAnalysis/);
  assert.match(main, /weakPoints/);
  assert.match(main, /mistakePatterns/);
  assert.match(main, /appendLearningProfileEvent/);
  assert.match(main, /agent-analysis/);
});
