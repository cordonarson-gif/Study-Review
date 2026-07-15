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

