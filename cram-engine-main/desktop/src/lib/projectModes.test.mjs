import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectModeTemplate,
  projectModeTemplates,
  projectModeOptions,
  getWorkspaceTabsForMode
} from './projectModes.js';

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
    'mistake-collection'
  ]);

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
});
