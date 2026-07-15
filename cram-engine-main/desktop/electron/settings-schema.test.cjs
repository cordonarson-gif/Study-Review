const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const settingsSchemaUrl = pathToFileURL(
  path.join(__dirname, '..', 'dist-electron', 'settings-schema.cjs')
).href;

async function loadSettingsSchema() {
  return import(settingsSchemaUrl);
}

test('migrates legacy settings while preserving connection and custom model data', async () => {
  const { migrateSettings } = await loadSettingsSchema();
  const settings = migrateSettings({
    provider: 'openai-compatible',
    baseUrl: 'https://models.example.test/v1',
    apiKey: 'legacy-api-key',
    model: 'manual-model',
    temperature: 0.65,
    maxTokens: 2048,
    latexEngine: 'pdflatex',
    enableLatexPreview: false,
    lastModelSyncAt: '2026-07-15T10:00:00.000Z',
    availableModels: [
      { id: 'gpt-4.1', label: 'GPT 4.1', provider: 'openai-compatible', source: 'preset' },
      { id: 'manual-model', label: 'My manual model', provider: 'openai-compatible', source: 'custom' }
    ]
  });

  assert.equal(settings.version, 2);
  assert.equal(settings.providers.length, 1);
  assert.equal(settings.activeProviderId, 'openai-compatible');
  assert.deepEqual(settings.providers[0], {
    id: 'openai-compatible',
    label: 'OpenAI Compatible',
    provider: 'openai-compatible',
    baseUrl: 'https://models.example.test/v1',
    apiKey: 'legacy-api-key',
    enabled: true,
    isCustom: false,
    selectedModelId: 'manual-model',
    models: [
      { id: 'gpt-4.1', label: 'GPT 4.1', source: 'preset', enabled: true },
      { id: 'manual-model', label: 'My manual model', source: 'custom', enabled: true }
    ]
  });
  assert.equal(settings.temperature, 0.65);
  assert.equal(settings.maxTokens, 2048);
  assert.equal(settings.latexEngine, 'pdflatex');
  assert.equal(settings.enableLatexPreview, false);
  assert.equal(settings.lastModelSyncAt, '2026-07-15T10:00:00.000Z');
});

test('normalization preserves MinerU document recognition settings', async () => {
  const { normalizeSettings } = await loadSettingsSchema();
  const settings = normalizeSettings({
    version: 2,
    activeProviderId: 'openai-compatible',
    providers: [
      {
        id: 'openai-compatible',
        label: 'OpenAI Compatible',
        provider: 'openai-compatible',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        enabled: true,
        isCustom: false,
        selectedModelId: 'gpt-4.1',
        models: [{ id: 'gpt-4.1', label: 'gpt-4.1', source: 'preset', enabled: true }]
      }
    ],
    temperature: 0.2,
    maxTokens: 4096,
    latexEngine: 'xelatex',
    enableLatexPreview: true,
    lastModelSyncAt: null,
    mineru: {
      enabled: true,
      mode: 'agent',
      apiKey: 'mineru-token',
      baseUrl: ' https://mineru.example.test ',
      preferForUploads: false
    }
  });

  assert.deepEqual(settings.mineru, {
    enabled: true,
    mode: 'agent',
    apiKey: 'mineru-token',
    baseUrl: 'https://mineru.example.test',
    preferForUploads: false
  });
});

test('migration recovers the OpenAI default profile from an empty legacy record', async () => {
  const { getEnabledModels, migrateSettings } = await loadSettingsSchema();
  const settings = migrateSettings({});

  assert.equal(settings.providers.length, 1);
  assert.deepEqual(settings.mineru, {
    enabled: false,
    mode: 'precise',
    apiKey: '',
    baseUrl: 'https://mineru.net',
    preferForUploads: true
  });
  assert.equal(settings.providers[0].enabled, true);
  assert.equal(settings.providers[0].provider, 'openai-compatible');
  assert.equal(settings.providers[0].selectedModelId, 'gpt-4.1');
  assert.deepEqual(
    getEnabledModels(settings.providers[0]).map((model) => model.id),
    ['gpt-4.1', 'gpt-4.1-mini']
  );
});

test('migration preserves a selected legacy model that is absent from the saved model list', async () => {
  const { migrateSettings } = await loadSettingsSchema();
  const settings = migrateSettings({
    provider: 'aliyun',
    baseUrl: 'https://models.example.test/v1',
    apiKey: 'legacy-api-key',
    model: 'legacy-only-model',
    availableModels: [{ id: 'known-model', label: 'Known', provider: 'aliyun', source: 'fetched', enabled: false }]
  });

  assert.equal(settings.providers[0].selectedModelId, 'legacy-only-model');
  assert.deepEqual(settings.providers[0].models, [
    { id: 'known-model', label: 'Known', source: 'fetched', enabled: true },
    { id: 'legacy-only-model', label: 'legacy-only-model', source: 'custom', enabled: true }
  ]);
});

test('normalization moves selection to an enabled provider and visible model', async () => {
  const { normalizeSettings } = await loadSettingsSchema();
  const settings = normalizeSettings({
    version: 2,
    activeProviderId: 'primary',
    providers: [
      {
        id: 'primary',
        label: 'Primary',
        provider: 'openai-compatible',
        baseUrl: 'https://primary.example.test/v1',
        apiKey: '',
        enabled: false,
        isCustom: false,
        selectedModelId: 'gpt-4.1',
        models: [{ id: 'gpt-4.1', label: 'GPT 4.1', source: 'preset', enabled: true }]
      },
      {
        id: 'backup',
        label: 'Backup',
        provider: 'aliyun',
        baseUrl: 'https://backup.example.test/v1',
        apiKey: '',
        enabled: true,
        isCustom: true,
        selectedModelId: 'hidden-model',
        models: [
          { id: 'hidden-model', label: 'Hidden', source: 'fetched', enabled: false },
          { id: 'fallback-model', label: 'Fallback', source: 'custom', enabled: true }
        ]
      }
    ],
    temperature: 0.2,
    maxTokens: 4096,
    latexEngine: 'xelatex',
    enableLatexPreview: true,
    lastModelSyncAt: null
  });

  assert.equal(settings.activeProviderId, 'backup');
  assert.equal(settings.providers[1].selectedModelId, 'fallback-model');
});

test('normalization deduplicates models and restores the first disabled profile', async () => {
  const { normalizeSettings } = await loadSettingsSchema();
  const settings = normalizeSettings({
    version: 2,
    activeProviderId: 'secondary',
    providers: [
      {
        id: 'primary',
        label: 'Primary',
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        apiKey: '',
        enabled: false,
        isCustom: false,
        selectedModelId: 'alpha',
        models: [
          { id: ' alpha ', label: ' Alpha ', source: 'custom', enabled: false },
          { id: 'alpha', label: 'Ignored duplicate', source: 'preset', enabled: true },
          { id: 'beta', label: 'Beta', source: 'fetched', enabled: true }
        ]
      },
      {
        id: 'secondary',
        label: 'Secondary',
        provider: 'aliyun',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        apiKey: '',
        enabled: false,
        isCustom: false,
        selectedModelId: '',
        models: []
      }
    ],
    temperature: 0.2,
    maxTokens: 4096,
    latexEngine: 'xelatex',
    enableLatexPreview: true,
    lastModelSyncAt: null
  });

  assert.equal(settings.activeProviderId, 'primary');
  assert.equal(settings.providers[0].enabled, true);
  assert.deepEqual(settings.providers[0].models, [
    { id: 'alpha', label: 'Alpha', source: 'custom', enabled: false },
    { id: 'beta', label: 'Beta', source: 'fetched', enabled: true }
  ]);
  assert.equal(settings.providers[0].selectedModelId, 'beta');
});

test('normalization keeps the first profile for duplicate trimmed provider ids', async () => {
  const { normalizeSettings } = await loadSettingsSchema();
  const settings = normalizeSettings({
    version: 2,
    activeProviderId: ' duplicate ',
    providers: [
      {
        id: ' duplicate ',
        label: 'First profile',
        provider: 'openai-compatible',
        baseUrl: 'https://first.example.test/v1',
        apiKey: 'first-key',
        enabled: true,
        isCustom: true,
        selectedModelId: 'first-model',
        models: [{ id: 'first-model', label: 'First model', source: 'custom', enabled: true }]
      },
      {
        id: 'duplicate',
        label: 'Second profile',
        provider: 'aliyun',
        baseUrl: 'https://second.example.test/v1',
        apiKey: 'second-key',
        enabled: true,
        isCustom: true,
        selectedModelId: 'second-model',
        models: [{ id: 'second-model', label: 'Second model', source: 'custom', enabled: true }]
      }
    ],
    temperature: 0.2,
    maxTokens: 4096,
    latexEngine: 'xelatex',
    enableLatexPreview: true,
    lastModelSyncAt: null
  });

  assert.equal(settings.activeProviderId, 'duplicate');
  assert.deepEqual(settings.providers, [
    {
      id: 'duplicate',
      label: 'First profile',
      provider: 'openai-compatible',
      baseUrl: 'https://first.example.test/v1',
      apiKey: 'first-key',
      enabled: true,
      isCustom: true,
      selectedModelId: 'first-model',
      models: [{ id: 'first-model', label: 'First model', source: 'custom', enabled: true }]
    }
  ]);
});
