const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(desktopRoot, 'package.json');
const electronBuilderConfigPath = path.join(desktopRoot, 'electron-builder.config.ts');
const miktexBootstrapPath = path.join(desktopRoot, 'build', 'miktex-bootstrap.ps1');
const installerNshPath = path.join(desktopRoot, 'build', 'installer.nsh');
const mainSourcePath = path.join(__dirname, 'main.cts');
const preloadSourcePath = path.join(__dirname, 'preload.cts');
const compiledPreloadPath = path.join(desktopRoot, 'dist-electron', 'preload.cjs');

function readPackageJson() {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
}

function readMainSource() {
  return fs.readFileSync(mainSourcePath, 'utf8');
}

function readPreloadSource() {
  return fs.readFileSync(preloadSourcePath, 'utf8');
}

function readElectronBuilderConfig() {
  return fs.readFileSync(electronBuilderConfigPath, 'utf8');
}

function createProviderProfile({ id, provider, apiKey, baseUrl, selectedModelId }) {
  return {
    id,
    label: id,
    provider,
    baseUrl,
    apiKey,
    enabled: true,
    isCustom: false,
    selectedModelId,
    models: [
      { id: selectedModelId, label: selectedModelId, source: 'custom', enabled: true }
    ]
  };
}

function createProviderSettings() {
  return {
    version: 2,
    activeProviderId: 'openai-compatible',
    providers: [
      createProviderProfile({
        id: 'openai-compatible',
        provider: 'openai-compatible',
        apiKey: 'openai-key',
        baseUrl: 'https://openai.example/v1',
        selectedModelId: 'gpt-test'
      }),
      createProviderProfile({
        id: 'aliyun',
        provider: 'aliyun',
        apiKey: 'aliyun-existing-key',
        baseUrl: 'https://aliyun.example/v1',
        selectedModelId: 'qwen-existing'
      })
    ],
    temperature: 0.2,
    maxTokens: 4096,
    latexEngine: 'xelatex',
    enableLatexPreview: true,
    lastModelSyncAt: null
  };
}

async function withPreloadApi(settings, run) {
  let exposedApi;
  let savedSettings;
  const electronMock = {
    contextBridge: {
      exposeInMainWorld(_name, api) {
        exposedApi = api;
      }
    },
    ipcRenderer: {
      invoke(channel, payload) {
        if (channel === 'settings:get') {
          return Promise.resolve(settings);
        }

        if (channel === 'settings:save') {
          savedSettings = payload;
          return Promise.resolve(payload);
        }

        return Promise.reject(new Error(`Unexpected IPC channel: ${channel}`));
      }
    }
  };
  const originalLoad = Module._load;

  delete require.cache[compiledPreloadPath];
  Module._load = function load(request, parent, isMain) {
    if (request === 'electron') return electronMock;
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    require(compiledPreloadPath);
    assert.ok(exposedApi, 'preload exposed the cramEngine API');
    await run(exposedApi, () => savedSettings);
  } finally {
    Module._load = originalLoad;
    delete require.cache[compiledPreloadPath];
  }
}

test('package main entry points at compiled electron main bundle', () => {
  const pkg = readPackageJson();

  assert.equal(pkg.main, 'dist-electron/main.cjs');
});

test('dev script waits for compiled electron main bundle', () => {
  const pkg = readPackageJson();

  assert.match(pkg.scripts.dev, /dist-electron\/main\.cjs/);
});

test('main process loads compiled preload bundle with cjs extension', () => {
  const source = readMainSource();

  assert.match(source, /preloadPath\s*=\s*path\.join\(__dirname,\s*'preload\.cjs'\)/);
});

test('main process disables renderer sandbox so preload can load local compatibility helpers', () => {
  const source = readMainSource();

  assert.match(source, /sandbox:\s*false/);
});

test('main process registers provider settings IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('settings:testProvider'/);
  assert.match(source, /ipcMain\.handle\('settings:fetchProviderModels'/);
});

test('main process registers learning profile IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('profile:get'/);
  assert.match(source, /ipcMain\.handle\('profile:save'/);
  assert.match(source, /ipcMain\.handle\('profile:analyze'/);
});

test('preload exposes learning profile bridge methods', () => {
  const source = readPreloadSource();

  assert.match(source, /getLearningProfile: \(projectId: string\) => ipcRenderer\.invoke\('profile:get', projectId\)/);
  assert.match(source, /saveLearningProfile: \(projectId: string, profile: LearningProfile\) => ipcRenderer\.invoke\('profile:save', projectId, profile\)/);
  assert.match(source, /analyzeLearningProfile: \(projectId: string, input: string\) => ipcRenderer\.invoke\('profile:analyze', projectId, input\)/);
});

test('main process registers personalized resource IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('personalizedResources:list'/);
  assert.match(source, /ipcMain\.handle\('personalizedResources:generate'/);
  assert.match(source, /ipcMain\.handle\('personalizedResources:save'/);
  assert.match(source, /ipcMain\.handle\('personalizedResources:delete'/);
});

test('preload exposes personalized resource bridge methods', () => {
  const source = readPreloadSource();

  assert.match(source, /listPersonalizedResources: \(projectId: string\) => ipcRenderer\.invoke\('personalizedResources:list', projectId\)/);
  assert.match(source, /generatePersonalizedResources: \(projectId: string, input: GeneratePersonalizedResourcesInput\) => ipcRenderer\.invoke\('personalizedResources:generate', projectId, input\)/);
  assert.match(source, /savePersonalizedResource: \(projectId: string, resource: PersonalizedResource\) => ipcRenderer\.invoke\('personalizedResources:save', projectId, resource\)/);
  assert.match(source, /deletePersonalizedResource: \(projectId: string, resourceId: string\) => ipcRenderer\.invoke\('personalizedResources:delete', projectId, resourceId\)/);
});

test('main and preload expose AI question generation bridge', () => {
  const mainSource = readMainSource();
  const preloadSource = readPreloadSource();

  assert.match(mainSource, /async function generateQuestions\(projectId: string, input: GenerateQuestionsInput\)/);
  assert.match(mainSource, /ipcMain\.handle\('questions:generate'/);
  assert.match(preloadSource, /generateQuestions: \(projectId: string, input: GenerateQuestionsInput\) => ipcRenderer\.invoke\('questions:generate', projectId, input\)/);
});

test('main and preload expose unified question import preview bridge', () => {
  const mainSource = readMainSource();
  const preloadSource = readPreloadSource();

  assert.match(mainSource, /async function previewQuestionImport\(input: QuestionImportRequest\)/);
  assert.match(mainSource, /ipcMain\.handle\('questions:previewImport'/);
  assert.match(preloadSource, /previewQuestionImport: \(input: QuestionImportRequest\) => ipcRenderer\.invoke\('questions:previewImport', input\)/);
});

test('main process registers learning path IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('learningPath:get'/);
  assert.match(source, /ipcMain\.handle\('learningPath:generate'/);
  assert.match(source, /ipcMain\.handle\('learningPath:save'/);
});

test('preload exposes learning path bridge methods', () => {
  const source = readPreloadSource();

  assert.match(source, /getLearningPathPlan: \(projectId: string\) => ipcRenderer\.invoke\('learningPath:get', projectId\)/);
  assert.match(source, /generateLearningPathPlan: \(projectId: string, input: GenerateLearningPathInput\) => ipcRenderer\.invoke\('learningPath:generate', projectId, input\)/);
  assert.match(source, /saveLearningPathPlan: \(projectId: string, plan: LearningPathPlan\) => ipcRenderer\.invoke\('learningPath:save', projectId, plan\)/);
});

test('main process registers stage report IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('stageReports:list'/);
  assert.match(source, /ipcMain\.handle\('stageReports:generate'/);
  assert.match(source, /ipcMain\.handle\('stageReports:save'/);
});

test('preload exposes stage report bridge methods', () => {
  const source = readPreloadSource();

  assert.match(source, /listStageReports: \(projectId: string\) => ipcRenderer\.invoke\('stageReports:list', projectId\)/);
  assert.match(source, /generateStageReport: \(projectId: string\) => ipcRenderer\.invoke\('stageReports:generate', projectId\)/);
  assert.match(source, /saveStageReport: \(projectId: string, report: StageReport\) => ipcRenderer\.invoke\('stageReports:save', projectId, report\)/);
});

test('main process registers delivery package IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('delivery:get'/);
  assert.match(source, /ipcMain\.handle\('delivery:generate'/);
  assert.match(source, /ipcMain\.handle\('delivery:save'/);
  assert.match(source, /ipcMain\.handle\('delivery:export'/);
});

test('preload exposes delivery package bridge methods', () => {
  const source = readPreloadSource();

  assert.match(source, /getDeliveryPackage: \(projectId: string\) => ipcRenderer\.invoke\('delivery:get', projectId\)/);
  assert.match(source, /generateDeliveryPackage: \(projectId: string\) => ipcRenderer\.invoke\('delivery:generate', projectId\)/);
  assert.match(source, /saveDeliveryPackage: \(projectId: string, deliveryPackage: DeliveryPackage\) => ipcRenderer\.invoke\('delivery:save', projectId, deliveryPackage\)/);
  assert.match(source, /exportDeliveryPackage: \(projectId: string\) => ipcRenderer\.invoke\('delivery:export', projectId\)/);
});

test('project chat resolves an exact profile before falling back to the active provider', () => {
  const source = readMainSource();

  assert.match(source, /settings\.providers\.find\(\(profile\) => profile\.id === project\.meta\.provider\)/);
  assert.match(source, /settings\.providers\.find\(\(profile\) => profile\.provider === project\.meta\.provider\)/);
  assert.match(source, /getActiveProvider\(settings\)/);
});

test('project chat includes learning profile context in the tutor prompt', () => {
  const source = readMainSource();

  assert.match(source, /formatLearningProfileForPrompt/);
  assert.match(source, /const learningProfileContext = await formatLearningProfileForPrompt\(projectId\)/);
  assert.match(source, /学习画像/);
  assert.match(source, /learningProfileContext/);
});

test('preload adapts v2 settings for the legacy renderer without changing the IPC payload', () => {
  const source = readPreloadSource();

  assert.match(source, /function toLegacySettings\(settings: AppSettings\): SettingsCompatibilityResult/);
  assert.match(source, /function toV2Settings\(settings: unknown\): AppSettings/);
  assert.match(source, /getSettings: \(\) => ipcRenderer\.invoke\('settings:get'\)\.then\(toLegacySettings\)/);
  assert.match(source, /saveSettings: \(settings: unknown\) => ipcRenderer\.invoke\('settings:save', toV2Settings\(settings\)\)\.then\(toLegacySettings\)/);
  assert.match(source, /let lastLegacyCompatibilitySnapshot: LegacyCompatibilitySnapshot \| null = null/);
  assert.match(source, /const legacyProviderDefaults: Record<string, Pick<LegacySettingsCompatibility, 'baseUrl' \| 'model'>>/);
  assert.match(source, /function shouldApplyLegacyField\(/);
  assert.match(source, /fetchModels: \(\) => ipcRenderer\.invoke\('settings:fetchModels'\)\.then\(toLegacySettings\)/);
});

test('preload preserves destination provider credentials when legacy renderer switches providers with original flat fields', async () => {
  const settings = createProviderSettings();

  await withPreloadApi(settings, async (api, getSavedSettings) => {
    const legacySettings = await api.getSettings();

    await api.saveSettings({
      ...legacySettings,
      provider: 'aliyun'
    });

    const saved = getSavedSettings();
    const aliyun = saved.providers.find((profile) => profile.id === 'aliyun');

    assert.equal(saved.activeProviderId, 'aliyun');
    assert.equal(aliyun.apiKey, 'aliyun-existing-key');
    assert.equal(aliyun.baseUrl, 'https://aliyun.example/v1');
    assert.equal(aliyun.selectedModelId, 'qwen-existing');
  });
});

test('preload preserves destination provider custom values when legacy renderer switches providers with dropdown defaults', async () => {
  const settings = createProviderSettings();

  await withPreloadApi(settings, async (api, getSavedSettings) => {
    const legacySettings = await api.getSettings();

    await api.saveSettings({
      ...legacySettings,
      provider: 'aliyun',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'qwen-plus'
    });

    const saved = getSavedSettings();
    const aliyun = saved.providers.find((profile) => profile.id === 'aliyun');

    assert.equal(saved.activeProviderId, 'aliyun');
    assert.equal(aliyun.apiKey, 'aliyun-existing-key');
    assert.equal(aliyun.baseUrl, 'https://aliyun.example/v1');
    assert.equal(aliyun.selectedModelId, 'qwen-existing');
  });
});

test('preload preserves provider-array edits from the v2 settings page over stale legacy fields', async () => {
  const settings = createProviderSettings();

  await withPreloadApi(settings, async (api, getSavedSettings) => {
    const loaded = await api.getSettings();
    const edited = {
      ...loaded,
      providers: loaded.providers.map((profile) => profile.id === 'openai-compatible' ? {
        ...profile,
        label: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'deepseek-key',
        selectedModelId: 'deepseek-chat',
        models: [
          ...profile.models.map((model) => ({ ...model, enabled: false })),
          { id: 'deepseek-chat', label: 'deepseek-chat', source: 'custom', enabled: true }
        ]
      } : profile)
    };

    await api.saveSettings(edited);

    const saved = getSavedSettings();
    const openaiCompatible = saved.providers.find((profile) => profile.id === 'openai-compatible');

    assert.equal(saved.activeProviderId, 'openai-compatible');
    assert.equal(openaiCompatible.label, 'DeepSeek');
    assert.equal(openaiCompatible.apiKey, 'deepseek-key');
    assert.equal(openaiCompatible.baseUrl, 'https://api.deepseek.com');
    assert.equal(openaiCompatible.selectedModelId, 'deepseek-chat');
  });
});

test('installer build config creates an NSIS setup exe with MiKTeX bootstrap resources', () => {
  const source = readElectronBuilderConfig();
  const pkg = readPackageJson();

  assert.match(source, /target:\s*\[\s*'nsis'\s*\]/);
  assert.match(source, /extraResources:\s*\[/);
  assert.match(source, /from:\s*'build\/miktex-bootstrap\.ps1'/);
  assert.match(source, /to:\s*'miktex-bootstrap\.ps1'/);
  assert.match(source, /nsis:\s*\{/);
  assert.match(source, /include:\s*'build\/installer\.nsh'/);
  assert.match(source, /oneClick:\s*false/);
  assert.match(source, /allowElevation:\s*true/);
  assert.match(source, /allowToChangeInstallationDirectory:\s*true/);
  assert.match(source, /createDesktopShortcut:\s*true/);
  assert.match(source, /publish:\s*null/);
  assert.deepEqual(pkg.build.win.target, ['nsis']);
  assert.equal(pkg.build.nsis.include, 'build/installer.nsh');
  assert.equal(pkg.build.nsis.allowElevation, true);
  assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
  assert.equal(pkg.build.extraResources[0].from, 'build/miktex-bootstrap.ps1');
  assert.equal(pkg.build.extraResources[0].to, 'miktex-bootstrap.ps1');
});

test('MiKTeX bootstrap script skips existing LaTeX and contains no bundled API secrets', () => {
  const source = fs.readFileSync(miktexBootstrapPath, 'utf8');

  assert.match(source, /function\s+Test-MiKTeX/);
  assert.match(source, /Get-Command\s+xelatex\.exe/);
  assert.match(source, /LOCALAPPDATA/);
  assert.match(source, /ProgramFiles/);
  assert.match(source, /MiKTeX/);
  assert.match(source, /https:\/\/miktex\.org\/download\/win\/basic-miktex-x64\.exe/);
  assert.match(source, /--unattended/);
  assert.match(source, /--user-install=/);
  assert.match(source, /--auto-install=yes/);
  assert.match(source, /Skipping dependency installation/);
  assert.doesNotMatch(source, /github_pat|sk-[A-Za-z0-9]|DEEPSEEK|OPENAI_API|ANTHROPIC_API|DASHSCOPE_API|apiKey\s*[:=]/i);
});

test('NSIS installer hook runs MiKTeX bootstrap during install', () => {
  const source = fs.readFileSync(installerNshPath, 'utf8');

  assert.match(source, /!macro\s+customInstall/);
  assert.match(source, /nsExec::ExecToStack/);
  assert.match(source, /MB_RETRYCANCEL/);
  assert.match(source, /Abort/);
  assert.match(source, /powershell\.exe["']?\s+-NoProfile\s+-ExecutionPolicy\s+Bypass/);
  assert.match(source, /miktex-bootstrap\.ps1/);
});
