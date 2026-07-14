import test from 'node:test';
import assert from 'node:assert/strict';

import { filterPracticeQuestions } from './practiceSession.js';

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

test('filterPracticeQuestions returns only wrong questions in wrong mode', () => {
  const result = filterPracticeQuestions(
    sampleQuestions.map((question, index) => ({
      ...question,
      wrong: index !== 1
    })),
    {
      mode: 'wrong',
      selectedCategory: '全部',
      shuffleSeed: 0
    }
  );

  assert.deepEqual(
    result.map((question) => question.id),
    ['q-1', 'q-3']
  );
});
