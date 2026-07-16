const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mainSourcePath = path.join(__dirname, 'main.cts');
const preloadSourcePath = path.join(__dirname, 'preload.cts');
const globalSourcePath = path.join(__dirname, '..', 'src', 'global.d.ts');

test('Electron project model normalizes project modes and persists mode artifacts', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');

  assert.match(main, /type ProjectMode =/);
  assert.match(main, /type ModeArtifact =/);
  assert.match(main, /function normalizeProjectMode/);
  assert.match(main, /function projectModeArtifactsPath\(projectId: string\)/);
  assert.match(main, /async function listModeArtifacts\(projectId: string\)/);
  assert.match(main, /async function generateModeArtifact\(projectId: string, input: GenerateModeArtifactInput\)/);
  assert.match(main, /async function saveModeArtifact\(projectId: string, artifact: ModeArtifact\)/);
  assert.match(main, /async function deleteModeArtifact\(projectId: string, artifactId: string\)/);
});

test('main and preload expose mode artifact IPC bridge', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const preload = fs.readFileSync(preloadSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');

  for (const channel of ['modeArtifacts:list', 'modeArtifacts:generate', 'modeArtifacts:save', 'modeArtifacts:delete']) {
    assert.match(main, new RegExp(`ipcMain\\.handle\\('${channel}'`));
    assert.match(preload, new RegExp(`ipcRenderer\\.invoke\\('${channel}'`));
  }

  assert.match(globalTypes, /type ProjectMode =/);
  assert.match(globalTypes, /type ModeArtifact =/);
  assert.match(globalTypes, /listModeArtifacts: \(projectId: string\) => Promise<ModeArtifact\[]>/);
  assert.match(globalTypes, /generateModeArtifact: \(projectId: string, input: GenerateModeArtifactInput\) => Promise<ModeArtifact\[]>/);
  assert.match(globalTypes, /saveModeArtifact: \(projectId: string, artifact: ModeArtifact\) => Promise<ModeArtifact\[]>/);
  assert.match(globalTypes, /deleteModeArtifact: \(projectId: string, artifactId: string\) => Promise<ModeArtifact\[]>/);
});
