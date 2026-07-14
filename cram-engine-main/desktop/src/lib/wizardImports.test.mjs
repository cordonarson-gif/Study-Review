import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendWizardValue,
  appendWizardFileList,
  formatQuestionDraftsForWizard,
  resolveWizardQuestionImportText
} from './wizardImports.js';

test('appendWizardValue appends new content with the requested separator', () => {
  assert.equal(appendWizardValue('existing', 'incoming'), 'existing\nincoming');
  assert.equal(appendWizardValue('existing', 'incoming', '\n\n'), 'existing\n\nincoming');
});

test('appendWizardValue ignores empty values on either side', () => {
  assert.equal(appendWizardValue('', 'incoming'), 'incoming');
  assert.equal(appendWizardValue('existing', ''), 'existing');
  assert.equal(appendWizardValue('', ''), '');
});

test('appendWizardFileList joins multiple file paths before appending', () => {
  assert.equal(
    appendWizardFileList('notes', ['a.txt', 'b.txt']),
    'notes\na.txt\nb.txt'
  );
});

test('formatQuestionDraftsForWizard renders stem, options, answer and explanation', () => {
  const text = formatQuestionDraftsForWizard([
    {
      stem: '1. TCP 属于哪一层？',
      options: [
        { key: 'A', text: '网络层' },
        { key: 'B', text: '传输层' }
      ],
      answer: 'B',
      explanation: 'TCP 工作在传输层。'
    },
    {
      stem: '2. 简述进程和线程的区别。',
      options: [],
      answer: '',
      explanation: ''
    }
  ]);

  assert.equal(
    text,
    [
      '1. TCP 属于哪一层？',
      'A. 网络层',
      'B. 传输层',
      '答案：B',
      '解析：TCP 工作在传输层。',
      '',
      '2. 简述进程和线程的区别。'
    ].join('\n')
  );
});

test('resolveWizardQuestionImportText falls back to raw text when no drafts are recognized', () => {
  assert.equal(
    resolveWizardQuestionImportText([], '原始题目文本'),
    '原始题目文本'
  );
});
