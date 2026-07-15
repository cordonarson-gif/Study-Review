export type ProviderKind = 'anthropic' | 'openai-compatible' | 'aliyun';
export type ManagedModelSource = 'preset' | 'fetched' | 'custom';
export type ManagedModel = { id: string; label: string; source: ManagedModelSource; enabled: boolean };
export type MinerUMode = 'precise' | 'agent';
export type MinerUSettings = {
  enabled: boolean;
  mode: MinerUMode;
  apiKey: string;
  baseUrl: string;
  preferForUploads: boolean;
};
export type ProviderProfile = {
  id: string;
  label: string;
  provider: ProviderKind;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  isCustom: boolean;
  selectedModelId: string;
  models: ManagedModel[];
};
export type AppSettings = {
  version: 2;
  activeProviderId: string;
  providers: ProviderProfile[];
  temperature: number;
  maxTokens: number;
  latexEngine: 'xelatex' | 'pdflatex';
  enableLatexPreview: boolean;
  lastModelSyncAt: string | null;
  mineru: MinerUSettings;
};

type ProviderDefaults = Pick<ProviderProfile, 'id' | 'label' | 'provider' | 'baseUrl' | 'selectedModelId' | 'models'>;

const providerDefaults: Record<ProviderKind, ProviderDefaults> = {
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI Compatible',
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    selectedModelId: 'gpt-4.1',
    models: [
      { id: 'gpt-4.1', label: 'gpt-4.1', source: 'preset', enabled: true },
      { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', source: 'preset', enabled: true }
    ]
  },
  aliyun: {
    id: 'aliyun',
    label: 'Qwen Compatible',
    provider: 'aliyun',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    selectedModelId: 'qwen-plus',
    models: [
      { id: 'qwen-plus', label: 'qwen-plus', source: 'preset', enabled: true },
      { id: 'qwen-max', label: 'qwen-max', source: 'preset', enabled: true },
      { id: 'qwen2.5-72b-instruct', label: 'qwen2.5-72b-instruct', source: 'preset', enabled: true }
    ]
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic / Claude',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    selectedModelId: 'claude-opus-4-8',
    models: [
      { id: 'claude-opus-4-8', label: 'claude-opus-4-8', source: 'preset', enabled: true },
      { id: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6', source: 'preset', enabled: true },
      {
        id: 'claude-haiku-4-5-20251001',
        label: 'claude-haiku-4-5-20251001',
        source: 'preset',
        enabled: true
      }
    ]
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function valueOrDefault(value: unknown, fallback: string): string {
  return text(value) || fallback;
}

function providerKind(value: unknown): ProviderKind {
  if (value === 'anthropic' || value === 'openai-compatible' || value === 'aliyun') return value;
  return 'openai-compatible';
}

function modelSource(value: unknown): ManagedModelSource {
  if (value === 'preset' || value === 'fetched' || value === 'custom') return value;
  return 'fetched';
}

function cloneModels(models: ManagedModel[]): ManagedModel[] {
  return models.map((model) => ({ ...model }));
}

function normalizeModels(models: unknown): ManagedModel[] {
  if (!Array.isArray(models)) return [];

  const ids = new Set<string>();
  const normalized: ManagedModel[] = [];

  for (const model of models) {
    if (!isRecord(model)) continue;

    const id = text(model.id);
    if (!id || ids.has(id)) continue;

    ids.add(id);
    normalized.push({
      id,
      label: valueOrDefault(model.label, id),
      source: modelSource(model.source),
      enabled: model.enabled !== false
    });
  }

  return normalized;
}

function normalizeNumeric(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeLatexEngine(value: unknown): 'xelatex' | 'pdflatex' {
  return value === 'pdflatex' ? 'pdflatex' : 'xelatex';
}

export function createDefaultMinerUSettings(): MinerUSettings {
  return {
    enabled: false,
    mode: 'precise',
    apiKey: '',
    baseUrl: 'https://mineru.net',
    preferForUploads: true
  };
}

function normalizeMinerUMode(value: unknown): MinerUMode {
  return value === 'agent' ? 'agent' : 'precise';
}

function normalizeMinerUSettings(value: unknown): MinerUSettings {
  const candidate = isRecord(value) ? value : {};
  const defaults = createDefaultMinerUSettings();

  return {
    enabled: candidate.enabled === true,
    mode: normalizeMinerUMode(candidate.mode),
    apiKey: typeof candidate.apiKey === 'string' ? candidate.apiKey : '',
    baseUrl: valueOrDefault(candidate.baseUrl, defaults.baseUrl),
    preferForUploads: typeof candidate.preferForUploads === 'boolean' ? candidate.preferForUploads : defaults.preferForUploads
  };
}

function profileFromDefaults(defaults: ProviderDefaults): ProviderProfile {
  return {
    ...defaults,
    apiKey: '',
    enabled: true,
    isCustom: false,
    models: cloneModels(defaults.models)
  };
}

export function createDefaultSettings(): AppSettings {
  const providers = [
    profileFromDefaults(providerDefaults['openai-compatible']),
    profileFromDefaults(providerDefaults.aliyun),
    profileFromDefaults(providerDefaults.anthropic)
  ];

  return {
    version: 2,
    activeProviderId: 'openai-compatible',
    providers,
    temperature: 0.2,
    maxTokens: 4096,
    latexEngine: 'xelatex',
    enableLatexPreview: true,
    lastModelSyncAt: null,
    mineru: createDefaultMinerUSettings()
  };
}

export function getEnabledModels(profile: ProviderProfile): ManagedModel[] {
  return normalizeModels(profile.models).filter((model) => model.enabled);
}

export function normalizeProviderProfile(profile: ProviderProfile): ProviderProfile {
  const candidate: Record<string, unknown> = isRecord(profile) ? profile : {};
  const provider = providerKind(candidate.provider);
  const defaults = providerDefaults[provider];
  const models = normalizeModels(candidate.models);
  const selectedModelId = text(candidate.selectedModelId);
  const enabledModels = models.filter((model) => model.enabled);

  return {
    id: valueOrDefault(candidate.id, defaults.id),
    label: valueOrDefault(candidate.label, defaults.label),
    provider,
    baseUrl: valueOrDefault(candidate.baseUrl, defaults.baseUrl),
    apiKey: typeof candidate.apiKey === 'string' ? candidate.apiKey : '',
    enabled: candidate.enabled !== false,
    isCustom: candidate.isCustom === true,
    selectedModelId: enabledModels.some((model) => model.id === selectedModelId)
      ? selectedModelId
      : (enabledModels[0]?.id ?? ''),
    models
  };
}

export function normalizeSettings(input: AppSettings): AppSettings {
  const candidate: Record<string, unknown> = isRecord(input) ? input : {};
  const profiles = Array.isArray(candidate.providers)
    ? candidate.providers.filter(isRecord).map((profile) => normalizeProviderProfile(profile as ProviderProfile))
    : [];
  const profileIds = new Set<string>();
  const uniqueProfiles = profiles.filter((profile) => {
    if (profileIds.has(profile.id)) return false;
    profileIds.add(profile.id);
    return true;
  });
  const normalizedProfiles = uniqueProfiles.length > 0 ? uniqueProfiles : createDefaultSettings().providers;

  if (!normalizedProfiles.some((profile) => profile.enabled)) {
    normalizedProfiles[0] = { ...normalizedProfiles[0], enabled: true };
  }

  const requestedActiveId = text(candidate.activeProviderId);
  const activeProvider = normalizedProfiles.find(
    (profile) => profile.enabled && profile.id === requestedActiveId
  ) ?? normalizedProfiles.find((profile) => profile.enabled) ?? normalizedProfiles[0];

  return {
    version: 2,
    activeProviderId: activeProvider.id,
    providers: normalizedProfiles,
    temperature: normalizeNumeric(candidate.temperature, 0.2),
    maxTokens: normalizeNumeric(candidate.maxTokens, 4096),
    latexEngine: normalizeLatexEngine(candidate.latexEngine),
    enableLatexPreview: typeof candidate.enableLatexPreview === 'boolean' ? candidate.enableLatexPreview : true,
    lastModelSyncAt: typeof candidate.lastModelSyncAt === 'string' ? candidate.lastModelSyncAt : null,
    mineru: normalizeMinerUSettings(candidate.mineru)
  };
}

export function migrateSettings(input: unknown): AppSettings {
  if (!isRecord(input)) return createDefaultSettings();

  if (input.version === 2 && Array.isArray(input.providers)) {
    return normalizeSettings(input as AppSettings);
  }

  const provider = providerKind(input.provider);
  const defaults = providerDefaults[provider];
  let legacyModels = (Array.isArray(input.availableModels) ? input.availableModels : []).map((model) =>
    isRecord(model) ? { ...model, enabled: true } : model
  );
  const usesDefaultModels = normalizeModels(legacyModels).length === 0;

  if (usesDefaultModels) {
    legacyModels = cloneModels(defaults.models);
  }

  const selectedModelId = text(input.model) || (usesDefaultModels ? defaults.selectedModelId : '');

  if (
    selectedModelId &&
    !legacyModels.some((model) => isRecord(model) && text(model.id) === selectedModelId)
  ) {
    legacyModels.push({
      id: selectedModelId,
      label: selectedModelId,
      source: 'custom',
      enabled: true
    });
  }

  const profile = normalizeProviderProfile({
    id: provider,
    label: defaults.label,
    provider,
    baseUrl: valueOrDefault(input.baseUrl, defaults.baseUrl),
    apiKey: typeof input.apiKey === 'string' ? input.apiKey : '',
    enabled: true,
    isCustom: false,
    selectedModelId,
    models: legacyModels
  });

  return normalizeSettings({
    version: 2,
    activeProviderId: profile.id,
    providers: [profile],
    temperature: normalizeNumeric(input.temperature, 0.2),
    maxTokens: normalizeNumeric(input.maxTokens, 4096),
    latexEngine: normalizeLatexEngine(input.latexEngine),
    enableLatexPreview: typeof input.enableLatexPreview === 'boolean' ? input.enableLatexPreview : true,
    lastModelSyncAt: typeof input.lastModelSyncAt === 'string' ? input.lastModelSyncAt : null,
    mineru: normalizeMinerUSettings(input.mineru)
  });
}

export function getActiveProvider(settings: AppSettings): ProviderProfile {
  const normalized = normalizeSettings(settings);
  return normalized.providers.find((profile) => profile.id === normalized.activeProviderId) ?? normalized.providers[0];
}
