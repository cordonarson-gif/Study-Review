const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSourcePath = path.join(__dirname, 'main.cts');
const typesSourcePath = path.join(__dirname, '..', 'src', 'lib', 'types.ts');
const globalSourcePath = path.join(__dirname, '..', 'src', 'global.d.ts');

test('stage report model is declared in renderer and global contracts', () => {
  const types = fs.readFileSync(typesSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');

  for (const source of [types, globalTypes]) {
    assert.match(source, /type StageReportSection =/);
    assert.match(source, /type StageReport =/);
    assert.match(source, /nextActions/);
    assert.match(source, /contentMarkdown/);
  }
});

test('ReportAgent has project-local persistence and deterministic fallback generation', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');

  assert.match(main, /function projectStageReportsPath\(projectId: string\)/);
  assert.match(main, /async function listStageReports\(projectId: string\)/);
  assert.match(main, /function buildFallbackStageReport/);
  assert.match(main, /async function generateStageReport\(projectId: string\)/);
  assert.match(main, /async function saveStageReport\(projectId: string, report: StageReport\)/);
});
