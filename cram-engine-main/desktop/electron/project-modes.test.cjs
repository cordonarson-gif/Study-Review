const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ts = require('typescript');

const mainSourcePath = path.join(__dirname, 'main.cts');
const preloadSourcePath = path.join(__dirname, 'preload.cts');
const globalSourcePath = path.join(__dirname, '..', 'src', 'global.d.ts');
const projectTypesSourcePath = path.join(__dirname, '..', 'src', 'lib', 'types.ts');
const projectModesTsPath = path.join(__dirname, '..', 'src', 'lib', 'projectModes.ts');
const projectModesJsPath = path.join(__dirname, '..', 'src', 'lib', 'projectModes.js');

const advancedModes = [
  'research-innovation',
  'lab-simulation',
  'virtual-teacher',
  'student-development',
  'interactive-courseware',
  'teaching-game',
  'knowledge-graph',
  'mistake-collection'
];

const advancedWorkspaceTabs = [
  'innovation-overview',
  'innovation-landscape',
  'innovation-problems',
  'innovation-methods',
  'innovation-evidence',
  'innovation-roadmap',
  'simulation-overview',
  'simulation-model',
  'simulation-parameters',
  'simulation-run',
  'simulation-results',
  'simulation-report',
  'tutor-overview',
  'tutor-diagnosis',
  'tutor-dialogue',
  'tutor-explanation',
  'tutor-practice',
  'tutor-feedback',
  'development-overview',
  'development-profile',
  'development-goals',
  'development-plan',
  'development-portfolio',
  'development-assessment',
  'courseware-overview',
  'courseware-outline',
  'courseware-content',
  'courseware-assets',
  'courseware-preview',
  'courseware-publish',
  'game-overview',
  'game-bank',
  'game-rules',
  'game-preview',
  'game-results',
  'game-feedback',
  'graph-overview',
  'graph-sources',
  'graph-extract',
  'graph-view',
  'graph-curation',
  'graph-export',
  'mistakes-overview',
  'mistakes-import',
  'mistakes-classify',
  'mistakes-review',
  'mistakes-practice',
  'mistakes-report'
];

const advancedModeLabels = {
  'research-innovation': '科研创新',
  'lab-simulation': '实验模拟',
  'virtual-teacher': '虚拟教师',
  'student-development': '学生发展',
  'interactive-courseware': '互动课件',
  'teaching-game': '教学游戏',
  'knowledge-graph': '知识图谱',
  'mistake-collection': '错题集'
};

function extractStringLiterals(source, pattern, label) {
  const block = source.match(pattern)?.[1];
  assert.ok(block, `missing ${label}`);
  return [...block.matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

async function loadRegistryFromTypeScript() {
  const source = fs.readFileSync(projectModesTsPath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  return import(url);
}

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

test('all shared contracts and main allowlists contain every advanced mode and tab', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const preload = fs.readFileSync(preloadSourcePath, 'utf8');
  const globalTypes = fs.readFileSync(globalSourcePath, 'utf8');
  const projectTypes = fs.readFileSync(projectTypesSourcePath, 'utf8');
  const contractSources = [
    ['electron/main.cts', main],
    ['electron/preload.cts', preload],
    ['src/global.d.ts', globalTypes],
    ['src/lib/types.ts', projectTypes]
  ];
  const projectModesAllowlist = extractStringLiterals(
    main,
    /const projectModes: ProjectMode\[] = \[([\s\S]*?)\];/,
    'projectModes allowlist'
  );
  const workspaceTabsAllowlist = extractStringLiterals(
    main,
    /const workspaceTabs: WorkspaceTabId\[] = \[([\s\S]*?)\];/,
    'workspaceTabs allowlist'
  );

  assert.equal(advancedModes.length, 8);
  assert.equal(advancedWorkspaceTabs.length, 48);

  for (const mode of advancedModes) {
    assert.ok(projectModesAllowlist.includes(mode), `main projectModes missing ${mode}`);
    for (const [file, source] of contractSources) {
      const projectModeUnion = extractStringLiterals(source, /type ProjectMode =([\s\S]*?);/, 'ProjectMode union');
      assert.ok(projectModeUnion.includes(mode), `${file} ProjectMode union missing ${mode}`);
    }
  }

  for (const tabId of advancedWorkspaceTabs) {
    assert.ok(workspaceTabsAllowlist.includes(tabId), `main workspaceTabs missing ${tabId}`);
    for (const [file, source] of contractSources) {
      const workspaceTabUnion = extractStringLiterals(source, /type WorkspaceTabId =([\s\S]*?);/, 'WorkspaceTabId union');
      assert.ok(workspaceTabUnion.includes(tabId), `${file} WorkspaceTabId union missing ${tabId}`);
    }
  }
});

test('fallback artifact labels cover every advanced mode', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const block = main.match(/const modeLabel: Record<ProjectMode, string> = \{([\s\S]*?)\n  \};/)?.[1];
  assert.ok(block, 'missing modeLabel mapping');
  const labels = new Map(
    [...block.matchAll(/'([^']+)': '([^']+)'/g)].map((match) => [match[1], match[2]])
  );

  for (const [mode, label] of Object.entries(advancedModeLabels)) {
    assert.equal(labels.get(mode), label, `modeLabel mismatch for ${mode}`);
  }
});

test('TypeScript and JavaScript advanced registries are semantically identical', async () => {
  const [typescriptRegistry, javascriptRegistry] = await Promise.all([
    loadRegistryFromTypeScript(),
    import(pathToFileURL(projectModesJsPath).href)
  ]);
  const typescriptAdvanced = typescriptRegistry.projectModeTemplates.filter(({ mode }) => advancedModes.includes(mode));
  const javascriptAdvanced = javascriptRegistry.projectModeTemplates.filter(({ mode }) => advancedModes.includes(mode));

  assert.deepEqual(typescriptAdvanced, javascriptAdvanced);
  assert.deepEqual(javascriptAdvanced.map(({ mode }) => mode), advancedModes);
  assert.deepEqual(
    javascriptAdvanced.flatMap(({ tabs }) => tabs.map(({ id }) => id).filter((id) => id !== 'delivery')),
    advancedWorkspaceTabs
  );
});
