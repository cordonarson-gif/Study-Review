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
