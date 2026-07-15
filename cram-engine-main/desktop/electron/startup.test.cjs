const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

const desktopRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(desktopRoot, 'package.json');
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

test('main process registers provider settings IPC handlers', () => {
  const source = readMainSource();

  assert.match(source, /ipcMain\.handle\('settings:testProvider'/);
  assert.match(source, /ipcMain\.handle\('settings:fetchProviderModels'/);
});

test('project chat resolves an exact profile before falling back to the active provider', () => {
  const source = readMainSource();

  assert.match(source, /settings\.providers\.find\(\(profile\) => profile\.id === project\.meta\.provider\)/);
  assert.match(source, /settings\.providers\.find\(\(profile\) => profile\.provider === project\.meta\.provider\)/);
  assert.match(source, /getActiveProvider\(settings\)/);
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
