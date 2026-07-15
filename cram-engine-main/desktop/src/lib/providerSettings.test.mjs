import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProviders, getSelectableModels, hideOrShowModel, removeCustomModel } from './providerSettings.js';

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

test('hideOrShowModel clears a selected model without a visible fallback', () => {
  const profile = { ...providers[0], selectedModelId: 'gpt', models: [...providers[0].models] };
  const next = hideOrShowModel(profile, 'gpt', false);
  assert.equal(next.models.find((model) => model.id === 'gpt').enabled, false);
  assert.equal(next.selectedModelId, '');
});

test('removeCustomModel refuses to remove a non-custom model', () => {
  assert.equal(removeCustomModel(providers[0], 'gpt').models.length, 2);
  assert.equal(removeCustomModel(providers[1], 'deepseek-chat').models.length, 0);
});
