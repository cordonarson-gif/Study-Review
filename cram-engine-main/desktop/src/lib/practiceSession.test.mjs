import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildQuestionBanks,
  filterPracticeQuestions,
  normalizePracticeKnowledgePoint
} from './practiceSession.js';

const sampleQuestions = [
  {
    id: 'q-1',
    stem: 'TCP 是哪一层协议？',
    options: [],
    answer: '传输层',
    explanation: '',
    category: '计算机网络 / 单选题',
    knowledgePoint: '计算机网络',
    questionType: '单选题',
    source: 'text',
    favorite: false,
    wrong: false,
    attempts: 0,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z'
  },
  {
    id: 'q-2',
    stem: '解释拥塞控制的目标。',
    options: [],
    answer: '避免网络过载',
    explanation: '',
    category: '计算机网络 / 简答题',
    knowledgePoint: '计算机网络',
    questionType: '简答题',
    source: 'text',
    favorite: false,
    wrong: false,
    attempts: 0,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z'
  },
  {
    id: 'q-3',
    stem: '什么是进程调度？',
    options: [],
    answer: '分配 CPU',
    explanation: '',
    category: '操作系统 / 简答题',
    knowledgePoint: '操作系统',
    questionType: '简答题',
    source: 'text',
    favorite: false,
    wrong: false,
    attempts: 0,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z'
  }
];

test('filterPracticeQuestions keeps nested category matches in random mode', () => {
  const result = filterPracticeQuestions(sampleQuestions, {
    mode: 'random',
    selectedCategory: '计算机网络 / 单选题',
    shuffleSeed: 123
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'q-1');
});

test('filterPracticeQuestions matches sanitized categories for legacy noisy imports', () => {
  const result = filterPracticeQuestions([
    {
      ...sampleQuestions[0],
      id: 'legacy-noisy',
      stem: '-X',
      category: '-X / 问答题',
      knowledgePoint: '-X',
      questionType: '问答题',
      sourceName: '计算机组成原理-期末卷.pdf'
    }
  ], {
    mode: 'category',
    selectedCategory: '计算机组成原理 / 问答题',
    shuffleSeed: 0
  });

  assert.deepEqual(result.map((question) => question.id), ['legacy-noisy']);
});

test('filterPracticeQuestions returns only wrong questions in wrong mode', () => {
  const result = filterPracticeQuestions(
    sampleQuestions.map((question, index) => ({
      ...question,
      wrong: index !== 1
    })),
    {
      mode: 'wrong',
      selectedCategory: 'ALL_CATEGORIES',
      shuffleSeed: 0
    }
  );

  assert.deepEqual(
    result.map((question) => question.id),
    ['q-1', 'q-3']
  );
});

test('buildQuestionBanks groups questions by imported bank before knowledge categories', () => {
  const result = buildQuestionBanks([
    { ...sampleQuestions[0], id: 'bank-a-1', questionBankId: 'bank-a', questionBankName: '计组期末卷 A' },
    { ...sampleQuestions[1], id: 'bank-a-2', questionBankId: 'bank-a', questionBankName: '计组期末卷 A' },
    { ...sampleQuestions[2], id: 'bank-b-1', questionBankId: 'bank-b', questionBankName: '操作系统错题集' }
  ]);

  assert.deepEqual(result.map((bank) => [bank.id, bank.name, bank.count]), [
    ['all', '全部题库', 3],
    ['bank-a', '计组期末卷 A', 2],
    ['bank-b', '操作系统错题集', 1]
  ]);
});

test('filterPracticeQuestions can jump into a selected question bank and then filter by category', () => {
  const result = filterPracticeQuestions([
    { ...sampleQuestions[0], id: 'bank-a-cpu', questionBankId: 'bank-a', questionBankName: '计组期末卷 A', knowledgePoint: 'CPU 与指令系统', questionType: '单选题', category: 'CPU 与指令系统 / 单选题' },
    { ...sampleQuestions[1], id: 'bank-b-cpu', questionBankId: 'bank-b', questionBankName: '模拟卷 B', knowledgePoint: 'CPU 与指令系统', questionType: '单选题', category: 'CPU 与指令系统 / 单选题' },
    { ...sampleQuestions[2], id: 'bank-a-memory', questionBankId: 'bank-a', questionBankName: '计组期末卷 A', knowledgePoint: '存储系统', questionType: '问答题', category: '存储系统 / 问答题' }
  ], {
    mode: 'category',
    selectedQuestionBank: 'bank-a',
    selectedCategory: 'CPU 与指令系统 / 单选题',
    shuffleSeed: 0
  });

  assert.deepEqual(result.map((question) => question.id), ['bank-a-cpu']);
});

test('legacy placeholder labels are replaced before rendering banks and categories', () => {
  const noisyQuestion = {
    ...sampleQuestions[0],
    id: 'legacy-question-mark',
    stem: '采用微程序控制器的处理器称为微处理器，这种说法是否正确？',
    category: '???????? / 单选题',
    knowledgePoint: '????????',
    questionBankId: 'legacy-bad-bank',
    questionBankName: '????????',
    sourceName: '????????'
  };

  const banks = buildQuestionBanks([noisyQuestion]);

  assert.equal(banks[1].name, '导入题库');
  assert.equal(normalizePracticeKnowledgePoint(noisyQuestion), 'CPU 与指令系统');
  assert.doesNotMatch(banks[1].name, /\?{2,}/);
  assert.doesNotMatch(normalizePracticeKnowledgePoint(noisyQuestion), /\?{2,}/);
});
