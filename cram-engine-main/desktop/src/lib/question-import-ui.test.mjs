import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const panelSource = fs.readFileSync(path.join(root, 'src', 'components', 'QuestionImportPanel.tsx'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src', 'app', 'App.tsx'), 'utf8');
const practiceSource = fs.readFileSync(path.join(root, 'src', 'components', 'PracticePanel.tsx'), 'utf8');

test('question import panel uses unified preview and preserves drafts while visiting API settings', () => {
  assert.match(panelSource, /previewQuestionImport\(/);
  assert.match(panelSource, /sessionStorage/);
  assert.match(panelSource, /onOpenProviderSettings/);
  assert.match(panelSource, /retryFailedSources/);
  assert.match(appSource, /onOpenProviderSettings=\{\(\) => setViewMode\('settings'\)\}/);
});

test('question import preview exposes editable options and answer provenance', () => {
  assert.match(panelSource, /updateOption/);
  assert.match(panelSource, /addOption/);
  assert.match(panelSource, /removeOption/);
  assert.match(panelSource, /import\.bankAnswer/);
  assert.match(panelSource, /import\.aiInferred/);
  assert.match(panelSource, /import\.needsReview/);
});

test('question import confirmation offers confirm, API settings, and cancel for missing answers', () => {
  assert.match(panelSource, /shouldPromptForAnswerlessImport\(drafts, aiStatus\)/);
  assert.match(panelSource, /import\.missingAnswerDesc/);
  assert.match(panelSource, /common\.confirm/);
  assert.match(panelSource, /import\.connectApi/);
  assert.match(panelSource, /common\.cancel/);
});

test('practice treats questions without a standard answer as neutral instead of wrong', () => {
  assert.match(practiceSource, /practice\.noStandardAnswer/);
  assert.match(practiceSource, /if \(!currentQuestion\.answer\.trim\(\)\)/);
});

test('practice identifies AI-generated open answers as reference answers', () => {
  assert.match(practiceSource, /answerSource === 'ai-inferred'/);
  assert.match(practiceSource, /practice\.aiRefAnswer/);
  assert.match(practiceSource, /practice\.bankRefAnswer/);
});
