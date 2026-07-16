import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKnowledgeGraph,
  getPlayableQuestions,
  layoutKnowledgeGraph,
  parseCoursewareSlides,
  runParameterSweep
} from './advancedModeWorkspaces.js';

test('runParameterSweep creates a six-point linear sweep including both endpoints', () => {
  const result = runParameterSweep({
    model: 'linear',
    start: 0,
    end: 10,
    steps: 6,
    coefficient: 2,
    initialValue: 1
  });

  assert.deepEqual(result.points, [
    { x: 0, y: 1 },
    { x: 2, y: 5 },
    { x: 4, y: 9 },
    { x: 6, y: 13 },
    { x: 8, y: 17 },
    { x: 10, y: 21 }
  ]);
});

test('runParameterSweep decay output is finite and monotonically decreasing', () => {
  const { points } = runParameterSweep({
    model: 'decay',
    start: 5,
    end: 9,
    steps: 5,
    coefficient: 0.5,
    initialValue: 12
  });

  assert.equal(points[0].y, 12);
  assert.ok(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(points.slice(1).every((point, index) => point.y < points[index].y));
});

test('runParameterSweep saturation output is finite and bounded by initialValue', () => {
  const { points } = runParameterSweep({
    model: 'saturation',
    start: 0,
    end: 1000,
    steps: 8,
    coefficient: 4,
    initialValue: 25
  });

  assert.ok(points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(points.every(({ y }) => y >= 0 && y <= 25));
  assert.ok(points.slice(1).every((point, index) => point.y >= points[index].y));
});

test('runParameterSweep rejects non-finite values, reversed ranges and invalid step counts in Chinese', () => {
  const valid = {
    model: 'linear',
    start: 0,
    end: 1,
    steps: 2,
    coefficient: 1,
    initialValue: 1
  };

  assert.throws(() => runParameterSweep({ ...valid, end: Number.POSITIVE_INFINITY }), /有限数字/);
  assert.throws(() => runParameterSweep({ ...valid, start: 2, end: 1 }), /起始值不能大于结束值/);
  assert.throws(() => runParameterSweep({ ...valid, steps: 1 }), /2.*50/);
  assert.throws(() => runParameterSweep({ ...valid, steps: 51 }), /2.*50/);
  assert.throws(() => runParameterSweep({ ...valid, steps: 2.5 }), /整数/);
});

const knowledgeBase = [
  {
    id: 'kb-1',
    title: '牛顿第二定律',
    summary: '力等于质量乘以加速度。',
    source: 'upload',
    tags: ['力学', '运动'],
    filePath: 'physics.md',
    updatedAt: '2026-07-16T00:00:00.000Z'
  },
  {
    id: 'kb-2',
    title: '动量守恒',
    summary: '封闭系统的总动量保持不变。',
    source: 'summary',
    tags: ['力学'],
    filePath: '',
    updatedAt: '2026-07-16T00:00:00.000Z'
  }
];

const questions = [
  {
    id: 'q-1',
    stem: '恒力作用下加速度如何变化？',
    options: [
      { key: 'A', text: '保持不变' },
      { key: 'B', text: '不断增大' }
    ],
    answer: 'A',
    explanation: '',
    category: '力学',
    knowledgePoint: '牛顿第二定律',
    questionType: '单选题',
    source: 'manual',
    favorite: false,
    wrong: false,
    attempts: 0,
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z'
  }
];

const artifacts = [
  {
    id: 'artifact-1',
    mode: 'knowledge-graph',
    tabId: 'graph-extract',
    title: '力学关系提取',
    kind: 'graph-notes',
    contentMarkdown: '牛顿第二定律与动量守恒都属于力学。',
    source: 'agent',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z'
  }
];

test('buildKnowledgeGraph creates stable typed nodes and edges from knowledge, questions and artifacts', () => {
  const input = { knowledgeBase, questions, artifacts };
  const first = buildKnowledgeGraph(input);
  const second = buildKnowledgeGraph(input);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.nodes.map(({ id, type }) => ({ id, type })),
    [
      { id: 'knowledge:kb-1', type: 'knowledge' },
      { id: 'tag:力学', type: 'tag' },
      { id: 'tag:运动', type: 'tag' },
      { id: 'knowledge:kb-2', type: 'knowledge' },
      { id: 'question:q-1', type: 'question' },
      { id: 'artifact:artifact-1', type: 'artifact' }
    ]
  );
  assert.ok(first.edges.some((edge) => edge.type === 'tag' && edge.source === 'knowledge:kb-1' && edge.target === 'tag:力学'));
  assert.ok(first.edges.some((edge) => edge.type === 'knowledge-point' && edge.source === 'question:q-1' && edge.target === 'knowledge:kb-1'));
  assert.ok(first.edges.every((edge) => typeof edge.id === 'string' && edge.id.length > 0));
});

test('buildKnowledgeGraph falls back to empty arrays for empty or omitted input', () => {
  assert.deepEqual(buildKnowledgeGraph(), { nodes: [], edges: [] });
  assert.deepEqual(buildKnowledgeGraph({ knowledgeBase: [], questions: [], artifacts: [] }), { nodes: [], edges: [] });
});

test('layoutKnowledgeGraph is deterministic and keeps every node within bounds', () => {
  const graph = buildKnowledgeGraph({ knowledgeBase, questions, artifacts });
  const first = layoutKnowledgeGraph(graph, 640, 360);
  const second = layoutKnowledgeGraph(graph, 640, 360);

  assert.deepEqual(first, second);
  assert.deepEqual(first.edges, graph.edges);
  assert.ok(first.nodes.every(({ x, y }) => x >= 0 && x <= 640 && y >= 0 && y <= 360));
});

test('parseCoursewareSlides splits level-one and level-two headings plus horizontal rules', () => {
  const slides = parseCoursewareSlides(`# 第一章\n导语\n\n## 概念\n定义内容\n\n---\n\n练习内容`);

  assert.deepEqual(slides, [
    { id: 'slide-1', title: '第一章', content: '导语' },
    { id: 'slide-2', title: '概念', content: '定义内容' },
    { id: 'slide-3', title: '第 3 页', content: '练习内容' }
  ]);
});

test('parseCoursewareSlides always returns at least one slide', () => {
  assert.deepEqual(parseCoursewareSlides(''), [
    { id: 'slide-1', title: '第 1 页', content: '' }
  ]);
});

test('getPlayableQuestions keeps questions with an answer and at least two non-empty options without mutation', () => {
  const input = [
    questions[0],
    { ...questions[0], id: 'q-empty-option', options: [{ key: 'A', text: '有效' }, { key: 'B', text: '  ' }] },
    { ...questions[0], id: 'q-empty-answer', answer: ' ', options: [{ key: 'A', text: '一' }, { key: 'B', text: '二' }] },
    { ...questions[0], id: 'q-cleaned', options: [{ key: 'A', text: ' 一 ' }, { key: 'B', text: '二' }, { key: 'C', text: ' ' }] }
  ];
  const snapshot = structuredClone(input);

  const result = getPlayableQuestions(input);

  assert.deepEqual(result.map((question) => question.id), ['q-1', 'q-cleaned']);
  assert.deepEqual(input, snapshot);
  assert.notEqual(result, input);
});
