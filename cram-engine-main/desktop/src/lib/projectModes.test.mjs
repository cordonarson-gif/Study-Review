import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectModeTemplate,
  projectModeTemplates,
  projectModeOptions,
  getWorkspaceTabsForMode
} from './projectModes.js';
import { getProjectModeDisplay } from './projectDisplay.js';

test('project mode registry exposes all supported modes', () => {
  assert.deepEqual(projectModeOptions.map((mode) => mode.mode), [
    'exam-review',
    'paper-assistant',
    'research-analysis',
    'teaching-design',
    'assignment-quiz',
    'research-innovation',
    'lab-simulation',
    'virtual-teacher',
    'student-development',
    'interactive-courseware',
    'teaching-game',
    'knowledge-graph',
    'mistake-collection',
    'modeling-competition',
    'literature-review',
    'academic-formatting'
  ]);
  assert.equal(projectModeTemplates.length, 16);

  for (const template of projectModeTemplates) {
    assert.ok(template.title);
    assert.ok(template.description);
    assert.ok(template.wizardFields.length >= 4);
    assert.ok(template.tabs.length >= 6);
    assert.ok(template.tabs.some((tab) => tab.id === 'delivery'));
    assert.ok(template.agents.length >= 1);
    assert.ok(template.deliverables.length >= 3);
    assert.ok(template.supportedUploads.length >= 1);
  }
});

test('unknown project mode falls back to exam review', () => {
  assert.equal(getProjectModeTemplate('missing-mode').mode, 'exam-review');
});

test('mode workspace tabs are focused to the selected workflow', () => {
  assert.ok(getWorkspaceTabsForMode('paper-assistant').some((tab) => tab.id === 'paper-outline'));
  assert.ok(getWorkspaceTabsForMode('research-analysis').some((tab) => tab.id === 'research-charts'));
  assert.ok(getWorkspaceTabsForMode('teaching-design').some((tab) => tab.id === 'teaching-lesson-plan'));
  assert.ok(getWorkspaceTabsForMode('assignment-quiz').some((tab) => tab.id === 'assignment-grading'));
  assert.ok(getWorkspaceTabsForMode('lab-simulation').some((tab) => tab.id === 'simulation-run'));
  assert.ok(getWorkspaceTabsForMode('knowledge-graph').some((tab) => tab.id === 'graph-view'));
  assert.ok(getWorkspaceTabsForMode('interactive-courseware').some((tab) => tab.id === 'courseware-preview'));
  assert.ok(getWorkspaceTabsForMode('teaching-game').some((tab) => tab.id === 'game-preview'));
  assert.ok(getWorkspaceTabsForMode('mistake-collection').some((tab) => tab.id === 'mistakes-review'));
  assert.ok(getWorkspaceTabsForMode('modeling-competition').some((tab) => tab.id === 'modeling-solution'));
  assert.ok(getWorkspaceTabsForMode('literature-review').some((tab) => tab.id === 'literature-synthesis'));
  assert.ok(getWorkspaceTabsForMode('academic-formatting').some((tab) => tab.id === 'format-docx-check'));
});

test('paper assistant exposes the complete writing workflow and accepted source formats', () => {
  const paper = getProjectModeTemplate('paper-assistant');

  assert.deepEqual(paper.tabs.map((tab) => tab.id), [
    'paper-overview', 'paper-literature', 'paper-outline', 'paper-chapters',
    'paper-methods', 'paper-innovation', 'paper-format', 'paper-defense', 'delivery'
  ]);
  assert.deepEqual(paper.supportedUploads, ['pdf', 'docx', 'txt', 'md', 'ris', 'bib']);
  assert.deepEqual(paper.deliverables.map((deliverable) => deliverable.id), ['outline', 'innovation', 'defense']);
});

test('project cards use mode-specific badges instead of exam labels for every mode', () => {
  const examDisplay = getProjectModeDisplay({
    mode: 'exam-review',
    courseName: '计算机组成原理',
    examType: '期末卷'
  });
  const paperDisplay = getProjectModeDisplay({
    mode: 'paper-assistant',
    courseName: '深度学习',
    examType: '期末卷'
  });
  const simulationDisplay = getProjectModeDisplay({
    mode: 'lab-simulation',
    courseName: '物理实验',
    examType: '期末卷'
  });

  assert.equal(examDisplay.subtitle, '期末卷');
  assert.equal(paperDisplay.subtitle, '论文助手');
  assert.equal(simulationDisplay.subtitle, '实验与仿真');
  assert.notEqual(paperDisplay.subtitle, '期末卷');
  assert.notEqual(simulationDisplay.subtitle, '期末卷');
  assert.notEqual(paperDisplay.icon, examDisplay.icon);
  assert.notEqual(simulationDisplay.icon, examDisplay.icon);

  const badges = projectModeTemplates.map((template) => getProjectModeDisplay({
    mode: template.mode,
    courseName: template.title,
    examType: '期末卷'
  }));
  assert.equal(new Set(badges.map((badge) => badge.icon)).size, projectModeTemplates.length);
  assert.equal(new Set(badges.map((badge) => badge.shortLabel)).size, projectModeTemplates.length);
});
