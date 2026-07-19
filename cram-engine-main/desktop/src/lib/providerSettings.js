function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function visibleModels(profile) {
  return Array.isArray(profile?.models)
    ? profile.models.filter((model) => model && model.enabled !== false)
    : [];
}

export function filterProviders(providers, query) {
  const needle = normalizedText(query).toLowerCase();
  if (!needle) return [...providers];

  return providers.filter((provider) => {
    const haystack = [
      provider?.label,
      provider?.id,
      provider?.provider,
      provider?.baseUrl
    ].map((value) => String(value ?? '').toLowerCase()).join('\n');
    return haystack.includes(needle);
  });
}

export function getSelectableModels(providers) {
  return providers.flatMap((provider) => {
    if (!provider?.enabled) return [];

    return visibleModels(provider).map((model) => ({
      providerId: provider.id,
      id: model.id,
      label: model.label || model.id
    }));
  });
}

function hasUsableCredentials(provider) {
  return Boolean(
    provider?.enabled
    && normalizedText(provider.apiKey)
    && normalizedText(provider.baseUrl)
  );
}

export function findConfiguredProvider(providers, activeProviderId) {
  const list = Array.isArray(providers) ? providers : [];
  const active = list.find((provider) => provider?.id === activeProviderId);
  if (hasUsableCredentials(active)) return active;

  return list.find(hasUsableCredentials) ?? null;
}

export function hideOrShowModel(profile, modelId, enabled) {
  const models = Array.isArray(profile?.models)
    ? profile.models.map((model) => model.id === modelId ? { ...model, enabled } : model)
    : [];
  const currentSelection = profile?.selectedModelId ?? '';
  const selectedModelId = models.some((model) => model.id === currentSelection && model.enabled)
    ? currentSelection
    : (models.find((model) => model.enabled)?.id ?? '');

  return {
    ...profile,
    selectedModelId,
    models
  };
}

export function removeCustomModel(profile, modelId) {
  const model = Array.isArray(profile?.models)
    ? profile.models.find((candidate) => candidate.id === modelId)
    : null;

  if (!model || model.source !== 'custom') {
    return profile;
  }

  const models = profile.models.filter((candidate) => candidate.id !== modelId);
  const selectedModelId = profile.selectedModelId === modelId
    ? (models.find((candidate) => candidate.enabled)?.id ?? '')
    : profile.selectedModelId;

  return {
    ...profile,
    selectedModelId,
    models
  };
}

export function addCustomModel(profile, modelId, label = modelId) {
  const id = normalizedText(modelId);
  if (!id) return profile;

  const models = Array.isArray(profile?.models) ? profile.models : [];
  if (models.some((model) => model.id === id)) return profile;

  const nextModel = {
    id,
    label: normalizedText(label) || id,
    source: 'custom',
    enabled: true
  };

  return {
    ...profile,
    selectedModelId: profile?.selectedModelId || id,
    models: [...models, nextModel]
  };
}

export function replaceProvider(providers, nextProfile) {
  return providers.map((profile) => profile.id === nextProfile.id ? nextProfile : profile);
}
