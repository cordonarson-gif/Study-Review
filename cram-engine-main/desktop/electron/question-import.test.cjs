const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const questionImportUrl = pathToFileURL(path.join(__dirname, '..', 'dist-electron', 'question-import.cjs')).href;

async function loadQuestionImport() {
  return import(questionImportUrl);
}

test('question file import parses the complete extracted document instead of a 1200 character preview', async () => {
  const { previewQuestionFiles } = await loadQuestionImport();
  const padding = '课程说明'.repeat(170);
  const documentText = [
    `1. 第一题内容\n${padding}\nA. 选项甲\nB. 选项乙\n答案：A`,
    '2. 第二题位于文档末尾\nA. 选项甲\nB. 选项乙\n答案：B'
  ].join('\n\n');

  const drafts = await previewQuestionFiles(
    ['C:/fixtures/questions.docx'],
    async () => documentText
  );

  assert.equal(drafts.length, 2);
  assert.equal(drafts.at(-1).stem, '第二题位于文档末尾');
  assert.equal(drafts.at(-1).answer, 'B');
});

test('question file import propagates extraction errors without creating drafts', async () => {
  const { previewQuestionFiles } = await loadQuestionImport();

  await assert.rejects(
    previewQuestionFiles(['C:/fixtures/questions.docx'], async () => {
      throw new Error('MinerU API Token 无效或没有访问权限，请在系统设置中更新 Token');
    }),
    /更新 Token/
  );
});
