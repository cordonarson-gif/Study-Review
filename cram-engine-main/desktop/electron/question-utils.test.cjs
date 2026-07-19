const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
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

test('question parsing structures the real computer architecture bank without promoting headings or options', async () => {
  const { parseQuestionDrafts } = await loadQuestionUtils();
  const fixture = fs.readFileSync(
    path.join(__dirname, 'fixtures', 'computer-architecture-question-bank.txt'),
    'utf8'
  );

  const drafts = parseQuestionDrafts(fixture, 'file', '计算机组成原理题库2.docx');

  assert.equal(drafts.length, 53);
  assert.deepEqual(
    drafts.reduce((counts, draft) => {
      counts[draft.questionType] = (counts[draft.questionType] || 0) + 1;
      return counts;
    }, {}),
    { 单选题: 29, 判断题: 14, 简答题: 3, 计算题: 7 }
  );
  assert.equal(drafts[0].stem, '微程序放在______中。');
  assert.deepEqual(drafts[0].options.map((option) => option.key), ['A', 'B', 'C', 'D']);
  assert.equal(drafts[0].answer, '');
  assert.equal(drafts[0].answerSource, 'missing');
  assert.equal(drafts[0].reviewStatus, 'needs-review');
  assert.ok(drafts.every((draft) => !/^【(?:章节|知识点)|^(?:选择题|简答题)[:：]?$/.test(draft.stem)));
  assert.ok(drafts.every((draft) => !/^[A-H][.．、)]/.test(draft.stem)));
});

test('question parsing separates inline options and recovers an implicit first option', async () => {
  const { parseQuestionDrafts } = await loadQuestionUtils();
  const drafts = parseQuestionDrafts(
    [
      '选择题：',
      '1. 1MB 等于多少字节？ A. 2^10 B. 2^20 C. 2^30 D. 1024',
      '2. 磁盘平均等待时间通常是指（ ）。',
      '磁盘旋转一周所需时间 B. 磁盘旋转半周所需时间 C. 磁盘旋转三分之二周所需时间'
    ].join('\n'),
    'image',
    'page-1.png'
  );

  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts[0].options.map((option) => option.text), ['2^10', '2^20', '2^30', '1024']);
  assert.deepEqual(drafts[1].options.map((option) => option.key), ['A', 'B', 'C']);
  assert.equal(drafts[1].options[0].text, '磁盘旋转一周所需时间');
});

test('question parsing continues an unfinished question across ordered image pages', async () => {
  const { parseQuestionSources } = await loadQuestionUtils();
  const drafts = parseQuestionSources([
    {
      text: '单选题：\n1. 微程序存放在哪里？\nA. 主存\nB. 控制存储器',
      source: 'image',
      sourceName: 'page-1.png'
    },
    {
      text: 'C. Cache\nD. 磁盘\n答案：B\n2. 控制器的功能是（ ）。\nA. 运算\nB. 产生控制信号',
      source: 'image',
      sourceName: 'page-2.png'
    }
  ]);

  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts[0].options.map((option) => option.key), ['A', 'B', 'C', 'D']);
  assert.equal(drafts[0].answer, 'B');
  assert.equal(drafts[0].answerSource, 'question-bank');
  assert.deepEqual(drafts[0].sourcePages, ['page-1.png', 'page-2.png']);
  assert.deepEqual(drafts[1].sourcePages, ['page-2.png']);
});

test('legacy question metadata is normalized without rewriting known answers', async () => {
  const { normalizeQuestionMetadata } = await loadQuestionUtils();
  const imported = normalizeQuestionMetadata({ answer: 'B', source: 'file', generatedBy: 'import' });
  const generated = normalizeQuestionMetadata({ answer: 'A', source: 'ai', generatedBy: 'ai' });
  const missing = normalizeQuestionMetadata({ answer: '', source: 'file', generatedBy: 'import' });

  assert.equal(imported.answerSource, 'question-bank');
  assert.equal(imported.reviewStatus, 'ready');
  assert.equal(generated.answerSource, 'ai-inferred');
  assert.equal(missing.answerSource, 'missing');
  assert.equal(missing.reviewStatus, 'needs-review');
  assert.match(missing.parseWarnings.join(' '), /未识别到答案/);
});

test('question parsing applies a trailing answer table by question number', async () => {
  const { parseQuestionDrafts } = await loadQuestionUtils();
  const drafts = parseQuestionDrafts([
    '选择题：',
    '1. 第一题？ A. 甲 B. 乙',
    '答案：',
    '2. 第二题？ A. 丙 B. 丁',
    '答案：',
    '参考答案：1.B 2.A'
  ].join('\n'), 'file', 'answers.docx');

  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts.map((draft) => draft.answer), ['B', 'A']);
  assert.ok(drafts.every((draft) => draft.answerSource === 'question-bank'));
  assert.ok(drafts.every((draft) => draft.reviewStatus === 'ready'));
});
