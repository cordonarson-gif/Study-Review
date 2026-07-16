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
  const { assessModeDeliveryEvidence } = loadEvidenceHelper();
  assert.equal(typeof assessModeDeliveryEvidence, 'function');
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

  assert.deepEqual(
    assessModeDeliveryEvidence(project, 'playable-questions'),
    { sourceIds: ['question:playable'], status: 'ready' }
  );
});

test('playable question evidence is empty when no question can run in teaching game', () => {
  const { assessModeDeliveryEvidence } = loadEvidenceHelper();
  assert.equal(typeof assessModeDeliveryEvidence, 'function');
  const project = {
    questions: [
      { id: 'blank-option', answer: 'A', options: [{ key: 'A', text: '' }, { key: 'B', text: '二' }] },
      { id: 'one-option', answer: 'A', options: [{ key: 'A', text: '一' }] }
    ],
    knowledgeBase: []
  };

  assert.deepEqual(
    assessModeDeliveryEvidence(project, 'playable-questions'),
    { sourceIds: [], status: 'missing' }
  );
});

test('incomplete wrong question evidence needs review', () => {
  const { assessModeDeliveryEvidence } = loadEvidenceHelper();
  assert.equal(typeof assessModeDeliveryEvidence, 'function');
  const project = {
    questions: [
      { id: 'wrong-1', wrong: true, stem: '题干', answer: '', explanation: '解析' },
      { id: 'right-1', wrong: false },
      { id: 'wrong-2', wrong: true, stem: '', answer: '答案', explanation: '解析' }
    ],
    knowledgeBase: []
  };

  assert.deepEqual(
    assessModeDeliveryEvidence(project, 'wrong-questions'),
    { sourceIds: ['wrong-question:wrong-1', 'wrong-question:wrong-2'], status: 'needs-review' }
  );
});

test('complete wrong question evidence is ready without requiring options', () => {
  const { assessModeDeliveryEvidence } = loadEvidenceHelper();
  assert.equal(typeof assessModeDeliveryEvidence, 'function');
  const project = {
    questions: [
      { id: 'wrong-open', wrong: true, stem: '说明概念', answer: '完整答案', explanation: '完整解析', options: [] }
    ],
    knowledgeBase: []
  };

  assert.deepEqual(
    assessModeDeliveryEvidence(project, 'wrong-questions'),
    { sourceIds: ['wrong-question:wrong-open'], status: 'ready' }
  );
});

test('knowledge source evidence combines knowledge and question ids without collisions', () => {
  const { assessModeDeliveryEvidence } = loadEvidenceHelper();
  assert.equal(typeof assessModeDeliveryEvidence, 'function');
  const project = {
    questions: [{ id: 'shared' }, { id: 'question-2' }],
    knowledgeBase: [{ id: 'shared' }, { id: 'knowledge-2' }]
  };

  assert.deepEqual(
    assessModeDeliveryEvidence(project, 'knowledge-sources'),
    {
      sourceIds: ['knowledge:shared', 'knowledge:knowledge-2', 'question:shared', 'question:question-2'],
      status: 'ready'
    }
  );
});

test('delivery evidence payload includes only referenced project questions and knowledge', () => {
  const { selectDeliveryEvidence } = loadEvidenceHelper();
  assert.equal(typeof selectDeliveryEvidence, 'function');
  const project = {
    questions: [
      {
        id: 'q-1', stem: '题目一', options: [{ key: 'A', text: '一' }], answer: 'A', explanation: '解析一',
        knowledgePoint: '知识点一', wrong: true, category: '分类', secret: 'omit'
      },
      {
        id: 'q-2', stem: '题目二', options: [], answer: '答案二', explanation: '解析二',
        knowledgePoint: '知识点二', wrong: false
      },
      { id: 'q-unreferenced', stem: '不应导出', options: [], answer: '无', explanation: '无', knowledgePoint: '', wrong: false }
    ],
    knowledgeBase: [
      { id: 'k-1', title: '知识一', summary: '摘要一', tags: ['标签'], source: 'upload', updatedAt: '2026-01-01' },
      { id: 'k-unreferenced', title: '不应导出', summary: '', tags: [], source: 'chat', updatedAt: '2026-01-02' }
    ]
  };
  const deliveryPackage = {
    items: [
      { sourceIds: ['wrong-question:q-1', 'question:q-2', 'question:q-2', 'knowledge:k-1', 'artifact-id'] }
    ]
  };

  assert.deepEqual(selectDeliveryEvidence(project, deliveryPackage), {
    questions: [
      {
        id: 'q-1', stem: '题目一', options: [{ key: 'A', text: '一' }], answer: 'A', explanation: '解析一',
        knowledgePoint: '知识点一', wrong: true
      },
      {
        id: 'q-2', stem: '题目二', options: [], answer: '答案二', explanation: '解析二',
        knowledgePoint: '知识点二', wrong: false
      }
    ],
    knowledgeBase: [
      { id: 'k-1', title: '知识一', summary: '摘要一', tags: ['标签'], source: 'upload', updatedAt: '2026-01-01' }
    ]
  });
});
