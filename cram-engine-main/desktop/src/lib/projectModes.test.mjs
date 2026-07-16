import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectModeTemplate,
  projectModeTemplates,
  projectModeOptions,
  getWorkspaceTabsForMode
} from './projectModes.js';

test('project mode registry exposes all phase-one modes', () => {
  assert.deepEqual(projectModeOptions.map((mode) => mode.mode), [
    'exam-review',
    'paper-assistant',
    'research-analysis',
    'teaching-design',
    'assignment-quiz'
  ]);

  for (const template of projectModeTemplates) {
    assert.ok(template.title);
    assert.ok(template.description);
    assert.ok(template.wizardFields.length >= 4);
    assert.ok(template.tabs.length >= 4);
    assert.ok(template.deliverables.length >= 3);
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
});
