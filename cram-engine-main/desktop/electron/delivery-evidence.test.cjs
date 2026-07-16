const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const helperSourcePath = path.join(__dirname, 'delivery-evidence.cts');

function loadEvidenceHelper() {
  assert.ok(fs.existsSync(helperSourcePath), 'delivery evidence helper source must exist');
  const source = fs.readFileSync(helperSourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: helperSourcePath
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', output)(require, loaded, loaded.exports);
  return loaded.exports;
}

test('playable question evidence matches teaching game option normalization', () => {
  const { buildModeDeliveryEvidence } = loadEvidenceHelper();
  const project = {
    questions: [
      {
        id: 'playable',
        answer: ' b ',
        options: [{ key: ' a ', text: '选项一' }, { key: 'B', text: '选项二' }]
      },
      {
        id: 'duplicate-keys',
        answer: 'A',
        options: [{ key: 'a', text: '选项一' }, { key: ' A ', text: '选项二' }]
      },
      {
        id: 'answer-not-an-option',
        answer: 'C',
        options: [{ key: 'A', text: '选项一' }, { key: 'B', text: '选项二' }]
      }
    ],
    knowledgeBase: []
  };

  assert.deepEqual(buildModeDeliveryEvidence(project, 'playable-questions'), ['question:playable']);
});

test('playable question evidence is empty when no question can run in teaching game', () => {
  const { buildModeDeliveryEvidence } = loadEvidenceHelper();
  const project = {
    questions: [
      { id: 'blank-option', answer: 'A', options: [{ key: 'A', text: '' }, { key: 'B', text: '二' }] },
      { id: 'one-option', answer: 'A', options: [{ key: 'A', text: '一' }] }
    ],
    knowledgeBase: []
  };

  assert.deepEqual(buildModeDeliveryEvidence(project, 'playable-questions'), []);
});

test('wrong question evidence uses only wrong questions with stable prefixes', () => {
  const { buildModeDeliveryEvidence } = loadEvidenceHelper();
  const project = {
    questions: [
      { id: 'wrong-1', wrong: true },
      { id: 'right-1', wrong: false },
      { id: 'wrong-2', wrong: true }
    ],
    knowledgeBase: []
  };

  assert.deepEqual(
    buildModeDeliveryEvidence(project, 'wrong-questions'),
    ['wrong-question:wrong-1', 'wrong-question:wrong-2']
  );
});

test('knowledge source evidence combines knowledge and question ids without collisions', () => {
  const { buildModeDeliveryEvidence } = loadEvidenceHelper();
  const project = {
    questions: [{ id: 'shared' }, { id: 'question-2' }],
    knowledgeBase: [{ id: 'shared' }, { id: 'knowledge-2' }]
  };

  assert.deepEqual(
    buildModeDeliveryEvidence(project, 'knowledge-sources'),
    ['knowledge:shared', 'knowledge:knowledge-2', 'question:shared', 'question:question-2']
  );
});
