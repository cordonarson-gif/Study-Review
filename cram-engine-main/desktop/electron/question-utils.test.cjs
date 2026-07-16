const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const questionUtilsUrl = pathToFileURL(
  path.join(__dirname, '..', 'dist-electron', 'question-utils.cjs')
).href;

async function loadQuestionUtils() {
  return import(questionUtilsUrl);
}

test('question parsing does not promote answer fragments, equations, or symbols into knowledge categories', async () => {
  const { parseQuestionDrafts } = await loadQuestionUtils();
  const drafts = parseQuestionDrafts(
    [
      '1. -X',
      '答：补码求负的符号位和数值位需要同时参与运算。',
      '',
      '2. =10100.10011=1.010',
      '答：规格化浮点数需要移动小数点并调整阶码。',
      '',
      '3. 程序计数器PC->地址寄存器MAR',
      '答：PC 的内容送入 MAR 后用于访问主存。'
    ].join('\n'),
    'file',
    '计算机组成原理-期末卷.pdf'
  );

  assert.equal(drafts.length, 3);
  for (const draft of drafts) {
    assert.doesNotMatch(draft.knowledgePoint, /^答[:：]/);
    assert.doesNotMatch(draft.knowledgePoint, /^[=\-+*/\\\d.]+/);
    assert.notEqual(draft.knowledgePoint, '-X');
    assert.notEqual(draft.knowledgePoint, '=10100.10011=1.010');
    assert.match(draft.category, new RegExp(`^${draft.knowledgePoint} / ${draft.questionType}$`));
  }
  assert.ok(drafts.every((draft) => draft.knowledgePoint.includes('计算机') || draft.knowledgePoint.includes('CPU') || draft.knowledgePoint.includes('存储')));
});

test('question parsing keeps imported file as question bank and avoids stem-like knowledge points', async () => {
  const { parseQuestionDrafts } = await loadQuestionUtils();
  const drafts = parseQuestionDrafts(
    [
      '1. 采用微程序控制器的处理器称为微处理器，这种说法是否正确？',
      'A. 正确',
      'B. 错误',
      '答案：B',
      '解析：微程序控制器是一种控制器实现方式，并不等同于微处理器。'
    ].join('\n'),
    'file',
    '计算机组成原理期末卷A.pdf'
  );

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].questionBankName, '计算机组成原理期末卷A');
  assert.match(drafts[0].questionBankId, /^ji-suan-ji-zu-cheng-yuan-li-qi-mo-juan-a|^question-bank-/);
  assert.equal(drafts[0].knowledgePoint, 'CPU 与指令系统');
  assert.equal(drafts[0].questionType, '单选题');
  assert.doesNotMatch(drafts[0].knowledgePoint, /采用微程序控制器/);
  assert.match(drafts[0].category, /^CPU 与指令系统 \/ 单选题$/);
});
