import test from 'node:test';
import assert from 'node:assert/strict';

import { createAssessmentPaper, gradeAssessmentAttempt, inferAssessmentQuestionMeta } from './assessmentEngine.js';

test('legacy questions receive useful inferred metadata without becoming simulation-ready', () => {
  const meta = inferAssessmentQuestionMeta({
    id: 'q-1',
    stem: 'TCP 建立连接需要几次握手？',
    options: [
      { key: 'A', text: '一次' },
      { key: 'B', text: '两次' },
      { key: 'C', text: '三次' }
    ],
    answer: 'C',
    questionType: '单选题',
    reviewStatus: 'ready'
  });

  assert.deepEqual(meta, {
    questionType: 'single-choice',
    difficulty: 'intermediate',
    defaultPoints: 2,
    acceptedAnswers: [['C']],
    scoringPoints: [],
    readiness: 'needs-review'
  });
});

test('objective grading is deterministic while short answers remain pending without AI evidence', () => {
  const paper = {
    id: 'paper-2', totalPoints: 12,
    items: [
      {
        id: 'i-1', questionId: 'q-1', points: 2,
        question: { stem: '单选', assessmentMeta: { questionType: 'single-choice', acceptedAnswers: [['B']] } }
      },
      {
        id: 'i-2', questionId: 'q-2', points: 2,
        question: { stem: '多选', assessmentMeta: { questionType: 'multiple-choice', acceptedAnswers: [['A', 'C']] } }
      },
      {
        id: 'i-3', questionId: 'q-3', points: 2,
        question: { stem: '填空', assessmentMeta: { questionType: 'fill-blank', acceptedAnswers: [['TCP'], ['可靠']] } }
      },
      {
        id: 'i-4', questionId: 'q-4', points: 6,
        question: { stem: '简答', assessmentMeta: { questionType: 'short-answer', scoringPoints: [{ id: 's1', label: '关键点', points: 6 }] } }
      }
    ]
  };
  const attempt = {
    id: 'attempt-1', paperId: paper.id, status: 'submitted',
    answers: {
      'i-1': { value: ['B'] },
      'i-2': { value: ['C', 'A'] },
      'i-3': { value: ['tcp', '错误'] },
      'i-4': { value: '我的解释' }
    }
  };

  const grade = gradeAssessmentAttempt({ paper, attempt, now: '2026-07-19T10:30:00.000Z' });

  assert.deepEqual(grade.items.map((item) => item.score), [2, 2, 1, null]);
  assert.equal(grade.items[3].status, 'needs-self-review');
  assert.equal(grade.score, 5);
  assert.equal(grade.status, 'needs-self-review');
});

test('paper creation uses reviewed questions and freezes their scored snapshots', () => {
  const questions = [
    {
      id: 'q-1', stem: '1 + 1 = ?', options: [], answer: '2', explanation: '基础计算',
      knowledgePoint: '加法', questionType: '填空题',
      assessmentMeta: {
        questionType: 'fill-blank', difficulty: 'basic', defaultPoints: 2,
        acceptedAnswers: [['2']], scoringPoints: [], readiness: 'ready'
      }
    },
    {
      id: 'q-2', stem: '解释 TCP 三次握手。', options: [], answer: 'SYN, SYN-ACK, ACK', explanation: '',
      knowledgePoint: 'TCP', questionType: '简答题',
      assessmentMeta: {
        questionType: 'short-answer', difficulty: 'intermediate', defaultPoints: 8,
        acceptedAnswers: [], scoringPoints: [{ id: 'p-1', label: '说明三次报文', points: 8 }], readiness: 'ready'
      }
    },
    {
      id: 'q-3', stem: '待校订题', options: [], answer: '', explanation: '', knowledgePoint: 'TCP', questionType: '简答题',
      assessmentMeta: { ...inferAssessmentQuestionMeta({ questionType: '简答题', answer: '' }) }
    }
  ];

  const paper = createAssessmentPaper({
    id: 'paper-1',
    title: '网络基础自测',
    questions,
    blueprint: { questionCount: 2, totalPoints: 10, durationMinutes: 30 },
    now: '2026-07-19T10:00:00.000Z'
  });

  assert.equal(paper.items.length, 2);
  assert.equal(paper.totalPoints, 10);
  assert.equal(paper.durationMinutes, 30);
  assert.deepEqual(paper.items.map((item) => item.questionId), ['q-1', 'q-2']);
  assert.equal(paper.items[1].points, 8);
  questions[0].stem = '题库后来被修改';
  assert.equal(paper.items[0].question.stem, '1 + 1 = ?');
});
