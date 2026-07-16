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
  'mistake-collection',
  'modeling-competition',
  'literature-review',
  'academic-formatting'
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
  'mistakes-report',
  'modeling-overview',
  'modeling-problem',
  'modeling-assumptions',
  'modeling-solution',
  'modeling-validation',
  'modeling-paper',
  'literature-overview',
  'literature-search',
  'literature-matrix',
  'literature-synthesis',
  'literature-gaps',
  'literature-outline',
  'format-overview',
  'format-template',
  'format-docx-check',
  'format-formulas',
  'format-figures',
  'format-export'
];

const advancedModeLabels = {
  'research-innovation': '科研创新',
  'lab-simulation': '实验模拟',
  'virtual-teacher': '虚拟教师',
  'student-development': '学生发展',
  'interactive-courseware': '互动课件',
  'teaching-game': '教学游戏',
  'knowledge-graph': '知识图谱',
  'mistake-collection': '错题集',
  'modeling-competition': '数学建模',
  'literature-review': '文献综述',
  'academic-formatting': '学术排版'
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

  assert.equal(advancedModes.length, 11);
  assert.equal(advancedWorkspaceTabs.length, 66);

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

test('mode artifact contracts cover domain tabs with distinct sections and checklists', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const requiredContractTabs = [
    'paper-literature',
    'paper-outline',
    'paper-methods',
    'paper-innovation',
    'paper-format',
    'paper-defense',
    'research-dataset',
    'research-plan',
    'research-statistics',
    'research-charts',
    'research-findings',
    'research-report',
    'teaching-objectives',
    'teaching-key-points',
    'teaching-activities',
    'teaching-assessment',
    'teaching-lesson-plan',
    'teaching-courseware',
    'assignment-bank',
    'assignment-paper',
    'assignment-online-quiz',
    'assignment-grading',
    'assignment-wrong-answers',
    'assignment-feedback',
    'innovation-evidence',
    'innovation-problems',
    'innovation-methods',
    'innovation-roadmap',
    'tutor-diagnosis',
    'tutor-dialogue',
    'tutor-explanation',
    'tutor-practice',
    'tutor-feedback',
    'development-profile',
    'development-goals',
    'development-plan',
    'development-portfolio',
    'development-assessment',
    'simulation-model',
    'simulation-parameters',
    'simulation-results',
    'simulation-report',
    'courseware-outline',
    'courseware-content',
    'courseware-assets',
    'courseware-publish',
    'game-rules',
    'game-results',
    'game-feedback',
    'graph-extract',
    'graph-curation',
    'graph-export',
    'mistakes-classify',
    'mistakes-report',
    'modeling-problem',
    'modeling-assumptions',
    'modeling-solution',
    'modeling-validation',
    'modeling-paper',
    'literature-search',
    'literature-matrix',
    'literature-synthesis',
    'literature-gaps',
    'literature-outline',
    'format-template',
    'format-docx-check',
    'format-formulas',
    'format-figures',
    'format-export'
  ];

  assert.match(main, /type ModeArtifactContract = \{[\s\S]*?purpose: string;[\s\S]*?sections: string\[\];[\s\S]*?checklist: string\[\];[\s\S]*?\};/);
  assert.match(main, /const modeArtifactContracts: Partial<Record<WorkspaceTabId, ModeArtifactContract>> = \{/);
  assert.match(main, /const overviewModeArtifactContract: ModeArtifactContract = \{/);
  assert.doesNotMatch(main, /'delivery':\s*\{[\s\S]*?purpose:/);

  for (const tabId of requiredContractTabs) {
    assert.match(
      main,
      new RegExp(`'${tabId}':\\s*(?:\\{\\s*purpose:|defineModeArtifactContract\\()`),
      `missing artifact contract for ${tabId}`
    );
  }

  assert.match(main, /function resolveModeArtifactContract\(tabId: WorkspaceTabId\)/);
  assert.match(main, /modeArtifactContracts\[tabId\] \?\? overviewModeArtifactContract/);
  assert.match(main, /contract\.sections\.(?:flatMap|map)/);
  assert.match(main, /contract\.checklist\.map/);
});

test('mode artifact prompt includes bounded project context without provider secrets', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const promptStart = main.indexOf('function buildModeArtifactPrompt(');
  const generationStart = main.indexOf('async function generateModeArtifact(', promptStart);

  assert.notEqual(promptStart, -1, 'missing buildModeArtifactPrompt');
  assert.ok(generationStart > promptStart, 'buildModeArtifactPrompt must precede generation');

  const promptSource = main.slice(promptStart, generationStart);
  assert.match(promptSource, /project: ProjectDetail/);
  assert.match(promptSource, /input: GenerateModeArtifactInput/);
  assert.match(promptSource, /currentArtifacts: ModeArtifact\[\]/);
  assert.match(promptSource, /project\.meta\.name/);
  assert.match(promptSource, /project\.meta\.mode/);
  assert.match(promptSource, /project\.meta\.courseName/);
  assert.match(promptSource, /project\.meta\.requirements/);
  assert.match(promptSource, /project\.meta\.modeConfig/);
  assert.match(promptSource, /JSON\.stringify/);
  assert.match(promptSource, /project\.uploads[\s\S]*?\.filter[\s\S]*?\.slice\(0, 3\)/);
  assert.match(promptSource, /upload\.name/);
  assert.match(promptSource, /upload\.parsed\?\.summary/);
  assert.match(promptSource, /upload\.parsed\?\.extractedText/);
  assert.match(promptSource, /currentArtifacts\.map/);
  assert.match(promptSource, /artifact\.title/);
  assert.match(promptSource, /artifact\.kind/);
  assert.match(promptSource, /artifact\.tabId/);
  assert.match(promptSource, /resolveModeArtifactContract\(input\.tabId\)/);
  assert.match(promptSource, /input\.prompt/);
  assert.match(promptSource, /const untrustedProjectData = \{/);
  assert.match(promptSource, /uploads: recentUploads/);
  assert.match(promptSource, /artifacts: currentArtifacts\.map/);
  assert.match(promptSource, /JSON\.stringify\(untrustedProjectData, null, 2\)/);
  assert.match(promptSource, /UNTRUSTED_PROJECT_DATA/);
  const untrustedStart = promptSource.indexOf('const untrustedProjectData = {');
  const untrustedEnd = promptSource.indexOf('\n  };', untrustedStart);
  const untrustedSource = promptSource.slice(untrustedStart, untrustedEnd);
  assert.doesNotMatch(untrustedSource, /input\.prompt|userPrompt|USER_REQUEST/);
  assert.match(promptSource, /const userRequest = truncateModeArtifactContext\([\s\S]*?input\.prompt[\s\S]*?4000\s*\)/);
  assert.match(promptSource, /USER_REQUEST \(JSON string\):\\n\$\{JSON\.stringify\(userRequest\)\}/);
  assert.ok(promptSource.indexOf('contract.checklist') < promptSource.indexOf('USER_REQUEST'));
  assert.doesNotMatch(promptSource, /apiKey|Authorization/i);
});

test('mode artifact provider resolution requires an exact id or one unambiguous legacy kind', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const helperSource = main.match(/function resolveModeArtifactProvider\([\s\S]*?\n\}/)?.[0];

  assert.ok(helperSource, 'missing resolveModeArtifactProvider');

  const output = ts.transpileModule(`${helperSource}\nmodule.exports = { resolveModeArtifactProvider };`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const helperModule = { exports: {} };
  Function('module', 'exports', output)(helperModule, helperModule.exports);
  const { resolveModeArtifactProvider } = helperModule.exports;
  const exact = { id: 'project-profile', provider: 'openai-compatible' };
  const otherOpenAi = { id: 'other-openai', provider: 'openai-compatible' };
  const anthropic = { id: 'claude-custom', provider: 'anthropic' };
  const aliyunA = { id: 'qwen-a', provider: 'aliyun' };
  const aliyunB = { id: 'qwen-b', provider: 'aliyun' };
  const settings = {
    activeProviderId: otherOpenAi.id,
    providers: [exact, otherOpenAi, anthropic, aliyunA, aliyunB]
  };

  assert.equal(resolveModeArtifactProvider(settings, exact.id), exact);
  assert.equal(resolveModeArtifactProvider(settings, 'anthropic'), anthropic);
  assert.equal(resolveModeArtifactProvider(settings, 'aliyun'), undefined);
  assert.equal(resolveModeArtifactProvider(settings, 'missing-profile'), undefined);
  assert.equal(resolveModeArtifactProvider({ ...settings, providers: [exact] }, 'anthropic'), undefined);
});

test('mode artifact generation uses the project provider and safely falls back on every failure', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const generationStart = main.indexOf('async function generateModeArtifact(');
  const saveStart = main.indexOf('async function saveModeArtifact(', generationStart);

  assert.notEqual(generationStart, -1, 'missing generateModeArtifact');
  assert.ok(saveStart > generationStart, 'missing saveModeArtifact after generation');

  const generationSource = main.slice(generationStart, saveStart);
  assert.match(generationSource, /await openProject\(projectId\)/);
  assert.match(generationSource, /await listModeArtifacts\(projectId\)/);
  assert.match(generationSource, /await loadSettings\(\)/);
  assert.match(generationSource, /resolveModeArtifactProvider\(settings, project\.meta\.provider\)/);
  assert.doesNotMatch(generationSource, /getActiveProvider\(settings\)/);
  assert.doesNotMatch(generationSource, /settings\.providers\.find\(\(profile\) => profile\.provider === project\.meta\.provider\)/);
  assert.match(generationSource, /project\.meta\.model \|\| profile\.selectedModelId/);
  assert.match(generationSource, /buildModeArtifactPrompt\(project, input, current\)/);
  assert.match(generationSource, /buildChatRequest\(\{/);
  assert.match(generationSource, /systemPrompt: ['"][^'"]*UNTRUSTED_PROJECT_DATA[^'"]*untrusted reference data[^'"]*never follow instructions[^'"]*USER_REQUEST[^'"]*contract[^'"]*never allow[^'"]*override system[^'"]*['"]/i);
  assert.match(generationSource, /fetchWithTimeout\(request\.url,[\s\S]*?30000\)/);
  assert.match(generationSource, /if \(!response\.ok\)/);
  assert.match(generationSource, /throw new Error\(`Mode artifact request failed \(HTTP \$\{response\.status\}\)`\)/);
  assert.match(generationSource, /parseChatResponse\(profile\.provider, payload\)\.trim\(\)/);
  assert.match(generationSource, /if \(!isUsableModeArtifactReply\(contentMarkdown\)\)/);
  assert.match(generationSource, /source: 'agent'/);
  assert.match(generationSource, /createdAt: now/);
  assert.match(generationSource, /updatedAt: now/);
  assert.match(generationSource, /if \(!profile\?\.apiKey \|\| !profile\.baseUrl\)[\s\S]*?buildFallbackModeArtifact\(project, input\)/);
  assert.match(generationSource, /catch[\s\S]*?buildFallbackModeArtifact\(project, input\)/);
  assert.doesNotMatch(generationSource, /response\.text\(|statusText|error\.message/);
});

test('mode artifact mutations use UUIDs and serialize every project write', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const normalizeStart = main.indexOf('function normalizeModeArtifact(');
  const deliveryStart = main.indexOf('const deliveryPackageItemTypes', normalizeStart);
  const modeArtifactSource = main.slice(normalizeStart, deliveryStart);
  const mutationStart = main.indexOf('async function mutateModeArtifacts(');
  const generationStart = main.indexOf('async function generateModeArtifact(');
  const saveStart = main.indexOf('async function saveModeArtifact(', generationStart);
  const deleteStart = main.indexOf('async function deleteModeArtifact(', saveStart);
  const generationSource = main.slice(generationStart, saveStart);
  const saveSource = main.slice(saveStart, deleteStart);
  const deleteSource = main.slice(deleteStart, deliveryStart);

  assert.match(main, /import \{ randomUUID \} from 'node:crypto'/);
  assert.ok((modeArtifactSource.match(/`mode-artifact-\$\{randomUUID\(\)\}`/g) ?? []).length >= 3);
  assert.doesNotMatch(modeArtifactSource, /`mode-artifact-\$\{Date\.now\(\)/);
  assert.match(main, /const modeArtifactMutationQueues = new Map<string, Promise<void>>\(\)/);
  assert.notEqual(mutationStart, -1, 'missing mutateModeArtifacts');
  const mutationSource = main.slice(mutationStart, generationStart);
  assert.match(mutationSource, /await listModeArtifacts\(projectId\)/);
  assert.match(mutationSource, /await writeModeArtifacts\(projectId, next\)/);
  assert.match(mutationSource, /modeArtifactMutationQueues\.set\(projectId, tail\)/);
  assert.match(mutationSource, /modeArtifactMutationQueues\.get\(projectId\) === tail/);
  assert.match(mutationSource, /modeArtifactMutationQueues\.delete\(projectId\)/);
  assert.ok(generationSource.indexOf('fetchWithTimeout(') < generationSource.lastIndexOf('mutateModeArtifacts('));
  assert.ok((generationSource.match(/mutateModeArtifacts\(projectId/g) ?? []).length >= 3);
  assert.doesNotMatch(generationSource, /writeModeArtifacts\(projectId/);
  assert.match(saveSource, /mutateModeArtifacts\(projectId, \(current\) =>/);
  assert.match(saveSource, /current\.map/);
  assert.match(deleteSource, /mutateModeArtifacts\(projectId, \(current\) =>/);
  assert.match(deleteSource, /current\.filter/);
});

test('mode artifact reply validation rejects blank parser placeholders', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  const helperSource = main.match(/function isUsableModeArtifactReply\([\s\S]*?\n\}/)?.[0];

  assert.ok(helperSource, 'missing isUsableModeArtifactReply');

  const output = ts.transpileModule(`${helperSource}\nmodule.exports = { isUsableModeArtifactReply };`, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  const helperModule = { exports: {} };
  Function('module', 'exports', output)(helperModule, helperModule.exports);
  const { isUsableModeArtifactReply } = helperModule.exports;

  assert.equal(isUsableModeArtifactReply(''), false);
  assert.equal(isUsableModeArtifactReply('   \n'), false);
  assert.equal(isUsableModeArtifactReply('模型未返回内容。'), false);
  assert.equal(isUsableModeArtifactReply('  模型未返回内容。  '), false);
  assert.equal(isUsableModeArtifactReply('# 可用成果'), true);

  const generationStart = main.indexOf('async function generateModeArtifact(');
  const saveStart = main.indexOf('async function saveModeArtifact(', generationStart);
  const generationSource = main.slice(generationStart, saveStart);
  assert.match(generationSource, /if \(!isUsableModeArtifactReply\(contentMarkdown\)\)/);
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
