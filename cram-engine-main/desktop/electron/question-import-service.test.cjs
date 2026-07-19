const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const serviceUrl = pathToFileURL(
  path.join(__dirname, '..', 'dist-electron', 'question-import-service.cjs')
).href;

async function loadService() {
  return import(serviceUrl);
}

function choiceDraft(stem, answer = '') {
  return {
    stem,
    options: [
      { key: 'A', text: '选项 A' },
      { key: 'B', text: '选项 B' }
    ],
    answer,
    explanation: '',
    category: '测试 / 单选题',
    knowledgePoint: '测试',
    questionType: '单选题',
    source: 'file',
    generatedBy: 'import',
    answerSource: answer ? 'question-bank' : 'missing',
    reviewStatus: answer ? 'ready' : 'needs-review',
    parseConfidence: 'high',
    sourcePages: ['bank.docx'],
    parseWarnings: answer ? [] : ['未识别到答案']
  };
}

test('answer enrichment sends only missing answers to AI and preserves question-bank answers', async () => {
  const { enrichMissingAnswers } = await loadService();
  const seen = [];
  const result = await enrichMissingAnswers(
    [choiceDraft('已有答案', 'A'), choiceDraft('缺少答案')],
    async (questions) => {
      seen.push(...questions);
      return [{ id: questions[0].id, answer: 'B' }];
    }
  );

  assert.equal(seen.length, 1);
  assert.equal(seen[0].stem, '缺少答案');
  assert.equal(result.drafts[0].answer, 'A');
  assert.equal(result.drafts[0].answerSource, 'question-bank');
  assert.equal(result.drafts[1].answer, 'B');
  assert.equal(result.drafts[1].answerSource, 'ai-inferred');
  assert.equal(result.drafts[1].reviewStatus, 'ready');
  assert.equal(result.aiStatus, 'completed');
});

test('answer enrichment rejects AI choice answers that are absent from parsed options', async () => {
  const { enrichMissingAnswers } = await loadService();
  const result = await enrichMissingAnswers(
    [choiceDraft('非法答案')],
    async (questions) => [{ id: questions[0].id, answer: 'D' }]
  );

  assert.equal(result.drafts[0].answer, '');
  assert.equal(result.drafts[0].answerSource, 'missing');
  assert.equal(result.drafts[0].reviewStatus, 'needs-review');
  assert.match(result.drafts[0].parseWarnings.join(' '), /AI.*无效/);
  assert.equal(result.aiStatus, 'failed');
});

test('answer enrichment stores AI short-answer text as a reference answer', async () => {
  const { enrichMissingAnswers } = await loadService();
  const draft = {
    ...choiceDraft('说明控制器的作用'),
    options: [],
    questionType: '简答题',
    category: '测试 / 简答题'
  };

  const result = await enrichMissingAnswers(
    [draft],
    async (questions) => [{ id: questions[0].id, answer: '控制器负责协调各部件按指令完成操作。' }]
  );

  assert.equal(result.drafts[0].answer, '控制器负责协调各部件按指令完成操作');
  assert.equal(result.drafts[0].answerSource, 'ai-inferred');
  assert.equal(result.drafts[0].reviewStatus, 'ready');
  assert.equal(result.aiStatus, 'completed');
});

test('answer enrichment reports not-configured without changing missing drafts', async () => {
  const { enrichMissingAnswers } = await loadService();
  const result = await enrichMissingAnswers([choiceDraft('没有 API')]);

  assert.equal(result.aiStatus, 'not-configured');
  assert.equal(result.drafts[0].answerSource, 'missing');
  assert.equal(result.summary.needsReview, 1);
});

test('answer inference JSON parser accepts fenced structured output and ignores malformed rows', async () => {
  const { parseAnswerInferenceJson } = await loadService();
  const replies = parseAnswerInferenceJson([
    '```json',
    '{"answers":[{"id":"0","answer":"B"},{"id":"1","answer":"正确"},{"answer":"A"}]}',
    '```'
  ].join('\n'));

  assert.deepEqual(replies, [
    { id: '0', answer: 'B' },
    { id: '1', answer: '正确' }
  ]);
});

test('answer inference batches open questions separately with at most three questions per batch', async () => {
  const { createAnswerInferenceBatches } = await loadService();
  const objective = Array.from({ length: 4 }, (_, index) => ({
    id: `choice-${index}`,
    stem: `选择题 ${index}`,
    options: [{ key: 'A', text: 'A' }, { key: 'B', text: 'B' }],
    questionType: '单选题'
  }));
  const open = Array.from({ length: 13 }, (_, index) => ({
    id: `open-${index}`,
    stem: `简答题 ${index}`,
    options: [],
    questionType: index % 2 === 0 ? '简答题' : '计算题'
  }));

  const batches = createAnswerInferenceBatches([...objective, ...open]);

  assert.deepEqual(batches.map((batch) => batch.length), [4, 3, 3, 3, 3, 1]);
  assert.deepEqual(batches.flat().map((question) => question.id), [...objective, ...open].map((question) => question.id));
});

test('answer inference retries only unresolved open questions one at a time', async () => {
  const { inferAnswersInBatches } = await loadService();
  const questions = [
    { id: '0', stem: '简答题一', options: [], questionType: '简答题' },
    { id: '1', stem: '简答题二', options: [], questionType: '简答题' }
  ];
  const calls = [];

  const replies = await inferAnswersInBatches(questions, async (batch) => {
    calls.push(batch.map((question) => question.id));
    return batch.length > 1
      ? [{ id: '0', answer: '第一题参考答案' }]
      : [{ id: '1', answer: '第二题参考答案' }];
  });

  assert.deepEqual(calls, [['0', '1'], ['1']]);
  assert.deepEqual(replies, [
    { id: '0', answer: '第一题参考答案' },
    { id: '1', answer: '第二题参考答案' }
  ]);
});

test('structure repair sends only low-confidence drafts and keeps repaired results reviewable', async () => {
  const { repairLowConfidenceDrafts } = await loadService();
  const high = choiceDraft('可靠题目', 'A');
  const low = {
    ...choiceDraft('选项缺失'),
    options: [{ key: 'A', text: '只有一个选项' }],
    parseConfidence: 'low',
    parseWarnings: ['选择题选项不足，请人工确认']
  };
  const seen = [];
  const repaired = await repairLowConfidenceDrafts([high, low], async (drafts) => {
    seen.push(...drafts);
    return [{
      id: drafts[0].id,
      stem: '修复后的题干',
      questionType: '单选题',
      options: [{ key: 'A', text: '甲' }, { key: 'B', text: '乙' }]
    }];
  });

  assert.equal(seen.length, 1);
  assert.equal(repaired[0].stem, '可靠题目');
  assert.equal(repaired[1].stem, '修复后的题干');
  assert.equal(repaired[1].parseConfidence, 'medium');
  assert.equal(repaired[1].reviewStatus, 'needs-review');
  assert.match(repaired[1].parseWarnings.join(' '), /AI.*修复/);
});
