import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildWizardProjectPayload,
  getWizardStepError,
  canCreateWizardProject,
  validateWizardProject
} from './wizardProject.js';

const baseWizard = {
  name: '',
  courseName: '',
  linkedFolder: '',
  examType: '期末卷',
  textbook: '',
  notes: '',
  requirements: '',
  mustKnow: '',
  keyPoints: '',
  initialQuestionText: '',
  provider: 'openai-compatible',
  model: 'gpt-4.1'
};

test('validateWizardProject requires either project name or course name', () => {
  assert.equal(
    validateWizardProject(baseWizard),
    '请至少填写项目名称或课程名称'
  );
});

test('canCreateWizardProject returns true when wizard has a usable title and model', () => {
  assert.equal(
    canCreateWizardProject({
      ...baseWizard,
      courseName: '计算机网络'
    }),
    true
  );
});

test('buildWizardProjectPayload trims values and falls back between name and course name', () => {
  const payload = buildWizardProjectPayload({
    ...baseWizard,
    name: '  网络期末冲刺  ',
    courseName: ' ',
    linkedFolder: '  C:/courses/network  ',
    textbook: '  谢希仁《计算机网络》  ',
    notes: '  章节总结  ',
    requirements: '  重点看简答题  ',
    mustKnow: 'TCP\n\nHTTP  ',
    keyPoints: ' 拥塞控制 \n 流量控制 ',
    provider: 'openai-compatible',
    model: 'gpt-4.1-mini'
  });

  assert.deepEqual(payload, {
    name: '网络期末冲刺',
    courseName: '网络期末冲刺',
    linkedFolder: 'C:/courses/network',
    examType: '期末卷',
    textbook: '谢希仁《计算机网络》',
    notes: '章节总结',
    requirements: '重点看简答题',
    mustKnow: ['TCP', 'HTTP'],
    keyPoints: ['拥塞控制', '流量控制'],
    provider: 'openai-compatible',
    model: 'gpt-4.1-mini',
    initialQuestions: []
  });
});

test('getWizardStepError blocks advancing from step 1 without a title', () => {
  assert.equal(
    getWizardStepError(baseWizard, 1),
    '请至少填写项目名称或课程名称'
  );
});
