const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const providerApiUrl = pathToFileURL(path.join(__dirname, '..', 'dist-electron', 'provider-api.cjs')).href;

async function loadProviderApi() {
  return import(providerApiUrl);
}

test('buildModelsRequest uses anthropic v1 endpoint and headers', async () => {
  const providerApi = await loadProviderApi();
  const request = providerApi.buildModelsRequest({
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'test-key'
  });

  assert.equal(request.url, 'https://api.anthropic.com/v1/models');
  assert.equal(request.headers['x-api-key'], 'test-key');
  assert.equal(request.headers['anthropic-version'], '2023-06-01');
  assert.equal(request.headers.Authorization, undefined);
});

test('buildModelsRequest uses bearer auth for openai-compatible providers', async () => {
  const providerApi = await loadProviderApi();
  const request = providerApi.buildModelsRequest({
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'test-key'
  });

  assert.equal(request.url, 'https://api.openai.com/v1/models');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  assert.equal(request.headers['x-api-key'], undefined);
});

test('buildModelsRequest uses bearer auth for aliyun providers', async () => {
  const providerApi = await loadProviderApi();
  const request = providerApi.buildModelsRequest({
    provider: 'aliyun',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/',
    apiKey: 'test-key'
  });

  assert.equal(request.url, 'https://dashscope.aliyuncs.com/compatible-mode/v1/models');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  assert.equal(request.headers['x-api-key'], undefined);
});

test('buildChatRequest creates anthropic messages payload', async () => {
  const providerApi = await loadProviderApi();
  const request = providerApi.buildChatRequest({
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: 'test-key',
    model: 'claude-opus-4-8',
    temperature: 0.2,
    maxTokens: 4096,
    systemPrompt: 'system prompt',
    userPrompt: 'user prompt'
  });

  assert.equal(request.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(request.headers['x-api-key'], 'test-key');
  assert.deepEqual(request.body, {
    model: 'claude-opus-4-8',
    temperature: 0.2,
    max_tokens: 4096,
    system: 'system prompt',
    messages: [{ role: 'user', content: 'user prompt' }]
  });
});

test('parseChatResponse reads anthropic text blocks', async () => {
  const providerApi = await loadProviderApi();
  const text = providerApi.parseChatResponse('anthropic', {
    content: [
      { type: 'text', text: '第一段' },
      { type: 'thinking', text: '忽略我' },
      { type: 'text', text: '第二段' }
    ]
  });

  assert.equal(text, '第一段\n\n第二段');
});

test('parseChatResponse reads openai-compatible message content', async () => {
  const providerApi = await loadProviderApi();
  const text = providerApi.parseChatResponse('openai-compatible', {
    choices: [{ message: { content: 'hello world' } }]
  });

  assert.equal(text, 'hello world');
});

test('classifyProviderResponse reports a successful connection', async () => {
  const providerApi = await loadProviderApi();

  assert.deepEqual(providerApi.classifyProviderResponse({ ok: true, status: 200, statusText: 'OK' }), {
    ok: true,
    message: '连接成功',
    status: 200
  });
});

test('classifyProviderResponse identifies authentication failures', async () => {
  const providerApi = await loadProviderApi();

  assert.deepEqual(providerApi.classifyProviderResponse({ ok: false, status: 401, statusText: 'Unauthorized' }), {
    ok: false,
    kind: 'authentication',
    message: 'API Key 无效或没有访问权限',
    status: 401
  });
  assert.deepEqual(providerApi.classifyProviderResponse({ ok: false, status: 403, statusText: 'Forbidden' }), {
    ok: false,
    kind: 'authentication',
    message: 'API Key 无效或没有访问权限',
    status: 403
  });
});

test('classifyProviderResponse identifies unavailable model-list endpoints', async () => {
  const providerApi = await loadProviderApi();

  assert.deepEqual(providerApi.classifyProviderResponse({ ok: false, status: 404, statusText: 'Not Found' }), {
    ok: false,
    kind: 'endpoint',
    message: 'API 地址或模型列表路径不可用',
    status: 404
  });
});

test('classifyProviderResponse identifies service failures without exposing response text', async () => {
  const providerApi = await loadProviderApi();

  assert.deepEqual(providerApi.classifyProviderResponse({ ok: false, status: 500, statusText: 'Internal Server Error' }), {
    ok: false,
    kind: 'service',
    message: 'API 服务返回错误（500）',
    status: 500
  });
});

test('classifyProviderError identifies connection timeouts', async () => {
  const providerApi = await loadProviderApi();
  const error = new Error('request aborted');
  error.name = 'AbortError';

  assert.deepEqual(providerApi.classifyProviderError(error), {
    ok: false,
    kind: 'service',
    message: '连接超时'
  });
});

test('classifyProviderError identifies transport failures', async () => {
  const providerApi = await loadProviderApi();

  assert.deepEqual(providerApi.classifyProviderError(new TypeError('fetch failed')), {
    ok: false,
    kind: 'network',
    message: '无法连接到 API 服务'
  });
});

test('mergeManagedModels preserves custom and hidden fetched models without mutating inputs', async () => {
  const providerApi = await loadProviderApi();
  const existing = [
    { id: 'gpt-4.1', label: 'GPT-4.1', source: 'preset', enabled: true },
    { id: 'my-model', label: 'My model', source: 'custom', enabled: false },
    { id: 'old-fetched', label: 'Old fetched label', source: 'fetched', enabled: false }
  ];
  const fetched = [
    { id: ' old-fetched ', label: 'Updated fetched label' },
    { id: 'new-fetched', label: 'New fetched label' }
  ];
  const existingBefore = structuredClone(existing);
  const fetchedBefore = structuredClone(fetched);

  const merged = providerApi.mergeManagedModels(existing, fetched);

  assert.deepEqual(merged, [
    { id: 'gpt-4.1', label: 'GPT-4.1', source: 'preset', enabled: true },
    { id: 'my-model', label: 'My model', source: 'custom', enabled: false },
    { id: 'old-fetched', label: 'Updated fetched label', source: 'fetched', enabled: false },
    { id: 'new-fetched', label: 'New fetched label', source: 'fetched', enabled: true }
  ]);
  assert.deepEqual(existing, existingBefore);
  assert.deepEqual(fetched, fetchedBefore);
  assert.notStrictEqual(merged[2], existing[2]);
});

test('mergeManagedModels retains an existing fetched label when the server label is blank', async () => {
  const providerApi = await loadProviderApi();
  const merged = providerApi.mergeManagedModels(
    [{ id: 'fetched-model', label: 'Saved label', source: 'fetched', enabled: false }],
    [{ id: ' fetched-model ', label: '   ' }]
  );

  assert.deepEqual(merged, [
    { id: 'fetched-model', label: 'Saved label', source: 'fetched', enabled: false }
  ]);
});

test('mergeManagedModels omits blank existing ids while preserving valid model order and state', async () => {
  const providerApi = await loadProviderApi();
  const merged = providerApi.mergeManagedModels(
    [
      { id: '   ', label: 'Blank', source: 'custom', enabled: true },
      { id: 'preset-model', label: 'Preset', source: 'preset', enabled: false },
      { id: 'fetched-model', label: 'Saved fetched label', source: 'fetched', enabled: false }
    ],
    [{ id: 'fetched-model', label: 'Server fetched label' }]
  );

  assert.deepEqual(merged, [
    { id: 'preset-model', label: 'Preset', source: 'preset', enabled: false },
    { id: 'fetched-model', label: 'Server fetched label', source: 'fetched', enabled: false }
  ]);
  assert.equal(merged.some((model) => !model.id.trim()), false);
});

test('mergeManagedModels ignores blank fetched ids and keeps the first value for duplicate ids', async () => {
  const providerApi = await loadProviderApi();
  const merged = providerApi.mergeManagedModels(
    [
      { id: 'existing', label: 'Existing model', source: 'preset', enabled: false },
      { id: 'existing', label: 'Ignored duplicate', source: 'custom', enabled: true }
    ],
    [
      { id: '   ', label: 'Ignored blank' },
      { id: ' remote-model ', label: 'Remote model' },
      { id: 'remote-model', label: 'Ignored fetched duplicate' },
      { id: 'existing', label: 'Does not replace preset' },
      { id: 'next-model' },
      { id: 'next-model', label: 'Ignored second next model' }
    ]
  );

  assert.deepEqual(merged, [
    { id: 'existing', label: 'Existing model', source: 'preset', enabled: false },
    { id: 'remote-model', label: 'Remote model', source: 'fetched', enabled: true },
    { id: 'next-model', label: 'next-model', source: 'fetched', enabled: true }
  ]);
});
