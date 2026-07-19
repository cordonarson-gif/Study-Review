import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProviders, findConfiguredProvider, getSelectableModels, hideOrShowModel, removeCustomModel } from './providerSettings.js';

const providers = [
  { id: 'openai', label: 'OpenAI', enabled: true, models: [{ id: 'gpt', label: 'GPT', enabled: true, source: 'preset' }, { id: 'hidden', label: 'Hidden', enabled: false, source: 'fetched' }] },
  { id: 'deepseek', label: 'DeepSeek', enabled: false, models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat', enabled: true, source: 'custom' }] }
];

test('filterProviders keeps source order', () => {
  assert.deepEqual(filterProviders(providers, 'seek').map((provider) => provider.id), ['deepseek']);
});

test('getSelectableModels excludes disabled profiles and hidden models', () => {
  assert.deepEqual(getSelectableModels(providers), [{ providerId: 'openai', id: 'gpt', label: 'GPT' }]);
});

test('findConfiguredProvider falls back to another enabled provider with credentials', () => {
  const openai = { ...providers[0], apiKey: '', baseUrl: 'https://api.openai.com/v1' };
  const maylily = { ...providers[1], enabled: true, apiKey: 'sk-test', baseUrl: 'https://maylily.xyz/v1' };

  assert.equal(findConfiguredProvider([openai, maylily], 'openai')?.id, 'deepseek');
});

test('findConfiguredProvider prefers the active provider when it has credentials', () => {
  const openai = { ...providers[0], apiKey: 'sk-openai', baseUrl: 'https://api.openai.com/v1' };
  const maylily = { ...providers[1], enabled: true, apiKey: 'sk-test', baseUrl: 'https://maylily.xyz/v1' };

  assert.equal(findConfiguredProvider([openai, maylily], 'openai')?.id, 'openai');
});

test('hideOrShowModel clears a selected model without a visible fallback', () => {
  const profile = { ...providers[0], selectedModelId: 'gpt', models: [...providers[0].models] };
  const next = hideOrShowModel(profile, 'gpt', false);
  assert.equal(next.models.find((model) => model.id === 'gpt').enabled, false);
  assert.equal(next.selectedModelId, '');
});

test('hideOrShowModel moves selection to the first visible fallback', () => {
  const profile = {
    ...providers[0],
    selectedModelId: 'gpt',
    models: [
      { id: 'gpt', label: 'GPT', enabled: true, source: 'preset' },
      { id: 'fallback', label: 'Fallback', enabled: true, source: 'custom' }
    ]
  };
  const next = hideOrShowModel(profile, 'gpt', false);

  assert.equal(next.selectedModelId, 'fallback');
});

test('hideOrShowModel preserves selection when toggling a different model', () => {
  const profile = {
    ...providers[0],
    selectedModelId: 'gpt',
    models: [
      { id: 'gpt', label: 'GPT', enabled: true, source: 'preset' },
      { id: 'fallback', label: 'Fallback', enabled: true, source: 'custom' }
    ]
  };

  const next = hideOrShowModel(profile, 'fallback', false);

  assert.equal(next.selectedModelId, 'gpt');
});

test('hideOrShowModel selects a model restored from an all-hidden state', () => {
  const profile = {
    ...providers[0],
    selectedModelId: '',
    models: [
      { id: 'gpt', label: 'GPT', enabled: false, source: 'preset' },
      { id: 'fallback', label: 'Fallback', enabled: false, source: 'custom' }
    ]
  };

  const next = hideOrShowModel(profile, 'fallback', true);

  assert.equal(next.selectedModelId, 'fallback');
  assert.equal(next.models.find((model) => model.id === 'fallback').enabled, true);
});

test('hideOrShowModel does not mutate the input profile or model records', () => {
  const profile = {
    ...providers[0],
    selectedModelId: 'gpt',
    models: providers[0].models.map((model) => ({ ...model }))
  };
  const snapshot = structuredClone(profile);

  hideOrShowModel(profile, 'gpt', false);

  assert.deepEqual(profile, snapshot);
});

test('removeCustomModel refuses to remove preset and fetched models', () => {
  assert.equal(removeCustomModel(providers[0], 'gpt').models.length, 2);
  assert.equal(removeCustomModel(providers[0], 'hidden').models.length, 2);
});

test('removeCustomModel removes custom models', () => {
  assert.equal(removeCustomModel(providers[1], 'deepseek-chat').models.length, 0);
});
