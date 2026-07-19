import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const policyPath = path.join(root, 'src', 'lib', 'questionImportPolicy.ts');

async function loadPolicy() {
  assert.ok(fs.existsSync(policyPath), 'questionImportPolicy.ts must define the import confirmation policy');
  const source = fs.readFileSync(policyPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

function draft(answerSource, answer = '') {
  return { answerSource, answer };
}

test('missing-answer API prompt appears only when API and all question-bank answers are absent', async () => {
  const { shouldPromptForAnswerlessImport } = await loadPolicy();

  assert.equal(shouldPromptForAnswerlessImport([draft('missing')], 'not-configured'), true);
  assert.equal(shouldPromptForAnswerlessImport([
    draft('question-bank', 'A'),
    draft('missing')
  ], 'not-configured'), false);
  assert.equal(shouldPromptForAnswerlessImport([draft('missing')], 'completed'), false);
  assert.equal(shouldPromptForAnswerlessImport([draft('missing')], 'failed'), false);
  assert.equal(shouldPromptForAnswerlessImport([draft('manual', '人工答案')], 'not-configured'), false);
});
