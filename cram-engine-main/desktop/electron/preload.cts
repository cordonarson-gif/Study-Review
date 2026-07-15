import { contextBridge, ipcRenderer } from 'electron';
import { migrateSettings, type AppSettings } from './settings-schema.cjs';

type LearningProfile = {
  version: 1;
  knowledgeLevel: '基础薄弱' | '中等' | '较好' | '未评估';
  learningGoal: string;
  cognitiveStyle: string;
  weakPoints: string[];
  mistakePatterns: string[];
  resourcePreferences: string[];
  availableTime: string;
  motivation: string;
  notes: string;
  confidence: 'low' | 'medium' | 'high';
  updatedAt: string;
};

type PersonalizedResourceType = 'handout' | 'example' | 'flashcard' | 'remediation';

type PersonalizedResource = {
  id: string;
  type: PersonalizedResourceType;
  title: string;
  knowledgePoint: string;
  profileSignal: string;
  contentMarkdown: string;
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};

type GeneratePersonalizedResourcesInput = {
  topic: string;
  type: PersonalizedResourceType | 'all';
};

type LearningPathTaskStatus = 'todo' | 'doing' | 'done';

type LearningPathTask = {
  id: string;
  title: string;
  detail: string;
  status: LearningPathTaskStatus;
  resourceIds: string[];
};

type LearningPathStage = {
  id: string;
  title: string;
  objective: string;
  duration: string;
  tasks: LearningPathTask[];
};

type LearningPathPlan = {
  version: 1;
  goal: string;
  targetDate: string;
  dailyMinutes: number;
  focus: string;
  stages: LearningPathStage[];
  reviewCadence: string[];
  risks: string[];
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};

type GenerateLearningPathInput = {
  targetDate: string;
  dailyMinutes: number;
  focus: string;
};

type StageReportSection = {
  title: string;
  contentMarkdown: string;
};

type StageReport = {
  id: string;
  title: string;
  summary: string;
  sections: StageReportSection[];
  nextActions: string[];
  risks: string[];
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};

type DeliveryPackageItemType =
  | 'resources'
  | 'reports'
  | 'question-bank'
  | 'knowledge-base'
  | 'learning-path'
  | 'archive';

type DeliveryPackageItemStatus = 'ready' | 'needs-review' | 'missing';

type DeliveryPackageItem = {
  id: string;
  type: DeliveryPackageItemType;
  title: string;
  description: string;
  status: DeliveryPackageItemStatus;
  sourceIds: string[];
  checklist: string[];
};

type DeliveryPackage = {
  version: 1;
  title: string;
  summary: string;
  items: DeliveryPackageItem[];
  checklist: string[];
  exportNotes: string;
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};

type LegacyModelOption = {
  id: string;
  label: string;
  provider: string;
  source: 'preset' | 'fetched' | 'custom';
};

type LegacySettingsCompatibility = {
  apiKey: string;
  baseUrl: string;
  provider: string;
  model: string;
  availableModels: LegacyModelOption[];
};

type SettingsCompatibilityResult = AppSettings & LegacySettingsCompatibility;

type LegacyCompatibilitySnapshot = LegacySettingsCompatibility & {
  profileId: string;
};

const legacyProviderDefaults: Record<string, Pick<LegacySettingsCompatibility, 'baseUrl' | 'model'>> = {
  'openai-compatible': {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1'
  },
  aliyun: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus'
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-opus-4-8'
  }
};

let lastLegacyCompatibilitySnapshot: LegacyCompatibilitySnapshot | null = null;

function rememberLegacyCompatibilitySnapshot(profile: AppSettings['providers'][number] | undefined) {
  if (!profile) {
    lastLegacyCompatibilitySnapshot = null;
    return;
  }

  lastLegacyCompatibilitySnapshot = {
    profileId: profile.id,
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    provider: profile.provider,
    model: profile.selectedModelId,
    availableModels: []
  };
}

function toLegacySettings(settings: AppSettings): SettingsCompatibilityResult {
  const profile = settings.providers.find((candidate) => candidate.id === settings.activeProviderId)
    ?? settings.providers[0];

  rememberLegacyCompatibilitySnapshot(profile);

  return {
    ...settings,
    apiKey: profile?.apiKey ?? '',
    baseUrl: profile?.baseUrl ?? '',
    provider: profile?.provider ?? 'openai-compatible',
    model: profile?.selectedModelId ?? '',
    availableModels: settings.providers.flatMap((candidate) => candidate.models.map((model) => ({
      id: model.id,
      label: model.label,
      provider: candidate.provider,
      source: model.source
    })))
  };
}

function isAppSettings(settings: unknown): settings is AppSettings {
  return typeof settings === 'object'
    && settings !== null
    && 'version' in settings
    && settings.version === 2
    && 'providers' in settings
    && Array.isArray(settings.providers);
}

function hasLegacyCompatibilityFields(settings: AppSettings & Partial<LegacySettingsCompatibility>): boolean {
  return 'apiKey' in settings
    || 'baseUrl' in settings
    || 'provider' in settings
    || 'model' in settings;
}

function isLegacyProviderDefault(
  profile: AppSettings['providers'][number],
  field: 'apiKey' | 'baseUrl' | 'model',
  value: string
): boolean {
  const defaults = legacyProviderDefaults[profile.provider];
  return (field === 'baseUrl' && value === defaults?.baseUrl)
    || (field === 'model' && value === defaults?.model);
}

function shouldApplyLegacyField(
  profile: AppSettings['providers'][number],
  activeProfile: AppSettings['providers'][number],
  field: 'apiKey' | 'baseUrl' | 'model',
  value: unknown
): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  if (profile.id === activeProfile.id) {
    return true;
  }

  if (!lastLegacyCompatibilitySnapshot) {
    return false;
  }

  if (profile.id === lastLegacyCompatibilitySnapshot.profileId) {
    return true;
  }

  return value !== lastLegacyCompatibilitySnapshot[field]
    && !isLegacyProviderDefault(profile, field, value);
}

function legacyFieldsStillMatchSnapshot(settings: AppSettings & Partial<LegacySettingsCompatibility>): boolean {
  if (!lastLegacyCompatibilitySnapshot) {
    return false;
  }

  return settings.provider === lastLegacyCompatibilitySnapshot.provider
    && settings.apiKey === lastLegacyCompatibilitySnapshot.apiKey
    && settings.baseUrl === lastLegacyCompatibilitySnapshot.baseUrl
    && settings.model === lastLegacyCompatibilitySnapshot.model;
}

function profileChangedSinceLegacySnapshot(profile: AppSettings['providers'][number]): boolean {
  if (!lastLegacyCompatibilitySnapshot || profile.id !== lastLegacyCompatibilitySnapshot.profileId) {
    return false;
  }

  return profile.apiKey !== lastLegacyCompatibilitySnapshot.apiKey
    || profile.baseUrl !== lastLegacyCompatibilitySnapshot.baseUrl
    || profile.selectedModelId !== lastLegacyCompatibilitySnapshot.model;
}

function toV2Settings(settings: unknown): AppSettings {
  const migrated = migrateSettings(settings);
  if (!isAppSettings(settings)) {
    return migrated;
  }

  const legacy = settings as AppSettings & Partial<LegacySettingsCompatibility>;
  if (!hasLegacyCompatibilityFields(legacy)) {
    return migrated;
  }

  const activeProfile = migrated.providers.find((candidate) => candidate.id === migrated.activeProviderId)
    ?? migrated.providers[0];

  if (!activeProfile) {
    return migrated;
  }

  if (
    legacyFieldsStillMatchSnapshot(legacy)
    && (
      migrated.activeProviderId !== lastLegacyCompatibilitySnapshot?.profileId
      || profileChangedSinceLegacySnapshot(activeProfile)
    )
  ) {
    return migrated;
  }

  const legacyProvider = typeof legacy.provider === 'string' ? legacy.provider : activeProfile.provider;
  const profile = legacyProvider === activeProfile.provider
    ? activeProfile
    : migrated.providers.find((candidate) => candidate.provider === legacyProvider) ?? activeProfile;
  const nextApiKey = shouldApplyLegacyField(profile, activeProfile, 'apiKey', legacy.apiKey)
    ? legacy.apiKey
    : profile.apiKey;
  const nextBaseUrl = shouldApplyLegacyField(profile, activeProfile, 'baseUrl', legacy.baseUrl)
    ? legacy.baseUrl
    : profile.baseUrl;
  const nextModel = shouldApplyLegacyField(profile, activeProfile, 'model', legacy.model)
    ? legacy.model
    : profile.selectedModelId;

  return {
    ...migrated,
    activeProviderId: profile.id,
    providers: migrated.providers.map((candidate) => candidate.id === profile.id ? {
      ...candidate,
      baseUrl: nextBaseUrl,
      apiKey: nextApiKey,
      selectedModelId: nextModel
    } : candidate)
  };
}

try {
  contextBridge.exposeInMainWorld('cramEngine', {
    selectProjectFolder: () => ipcRenderer.invoke('dialog:selectProjectFolder'),
    selectUploadFiles: () => ipcRenderer.invoke('dialog:selectUploadFiles'),
    getSettings: () => ipcRenderer.invoke('settings:get').then(toLegacySettings),
    saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', toV2Settings(settings)).then(toLegacySettings),
    fetchModels: () => ipcRenderer.invoke('settings:fetchModels').then(toLegacySettings),
    testProviderConnection: (profile: unknown) => ipcRenderer.invoke('settings:testProvider', profile),
    fetchProviderModels: (profile: unknown) => ipcRenderer.invoke('settings:fetchProviderModels', profile),
    listProjects: () => ipcRenderer.invoke('projects:list'),
    createProject: (input: unknown) => ipcRenderer.invoke('projects:create', input),
    openProject: (projectId: string) => ipcRenderer.invoke('projects:open', projectId),
    renameProject: (projectId: string, name: string) => ipcRenderer.invoke('projects:rename', projectId, name),
    deleteProject: (projectId: string) => ipcRenderer.invoke('projects:delete', projectId),
    updateProjectModel: (projectId: string, model: string) => ipcRenderer.invoke('projects:updateModel', projectId, model),
    saveProjectConfig: (projectId: string, content: string) => ipcRenderer.invoke('projects:saveConfig', projectId, content),
    saveProjectProgress: (projectId: string, content: string) => ipcRenderer.invoke('projects:saveProgress', projectId, content),
    importProjectFiles: (projectId: string, filePaths: string[]) => ipcRenderer.invoke('projects:importFiles', projectId, filePaths),
    previewQuestionsFromText: (text: string, source: string, sourceName?: string) => ipcRenderer.invoke('questions:previewText', text, source, sourceName),
    previewQuestionsFromFiles: (filePaths: string[]) => ipcRenderer.invoke('questions:previewFiles', filePaths),
    addQuestions: (projectId: string, drafts: unknown[]) => ipcRenderer.invoke('questions:add', projectId, drafts),
    updateQuestion: (projectId: string, question: unknown) => ipcRenderer.invoke('questions:update', projectId, question),
    getKnowledgeResources: (projectId: string, knowledgePoint: string) => ipcRenderer.invoke('resources:get', projectId, knowledgePoint),
    openKnowledgeResource: (projectId: string, resource: unknown) => ipcRenderer.invoke('resources:open', projectId, resource),
    getLearningProfile: (projectId: string) => ipcRenderer.invoke('profile:get', projectId),
    saveLearningProfile: (projectId: string, profile: LearningProfile) => ipcRenderer.invoke('profile:save', projectId, profile),
    analyzeLearningProfile: (projectId: string, input: string) => ipcRenderer.invoke('profile:analyze', projectId, input),
    listPersonalizedResources: (projectId: string) => ipcRenderer.invoke('personalizedResources:list', projectId),
    generatePersonalizedResources: (projectId: string, input: GeneratePersonalizedResourcesInput) => ipcRenderer.invoke('personalizedResources:generate', projectId, input),
    savePersonalizedResource: (projectId: string, resource: PersonalizedResource) => ipcRenderer.invoke('personalizedResources:save', projectId, resource),
    deletePersonalizedResource: (projectId: string, resourceId: string) => ipcRenderer.invoke('personalizedResources:delete', projectId, resourceId),
    getLearningPathPlan: (projectId: string) => ipcRenderer.invoke('learningPath:get', projectId),
    generateLearningPathPlan: (projectId: string, input: GenerateLearningPathInput) => ipcRenderer.invoke('learningPath:generate', projectId, input),
    saveLearningPathPlan: (projectId: string, plan: LearningPathPlan) => ipcRenderer.invoke('learningPath:save', projectId, plan),
    listStageReports: (projectId: string) => ipcRenderer.invoke('stageReports:list', projectId),
    generateStageReport: (projectId: string) => ipcRenderer.invoke('stageReports:generate', projectId),
    saveStageReport: (projectId: string, report: StageReport) => ipcRenderer.invoke('stageReports:save', projectId, report),
    getDeliveryPackage: (projectId: string) => ipcRenderer.invoke('delivery:get', projectId),
    generateDeliveryPackage: (projectId: string) => ipcRenderer.invoke('delivery:generate', projectId),
    saveDeliveryPackage: (projectId: string, deliveryPackage: DeliveryPackage) => ipcRenderer.invoke('delivery:save', projectId, deliveryPackage),
    exportDeliveryPackage: (projectId: string) => ipcRenderer.invoke('delivery:export', projectId),
    runProjectChat: (projectId: string, input: string) => ipcRenderer.invoke('projects:chat', projectId, input),
    addKnowledgeBaseEntry: (projectId: string, entry: unknown) => ipcRenderer.invoke('knowledgeBase:addEntry', projectId, entry),
    draftKnowledgeBaseEntry: (projectId: string, source: 'chat' | 'upload', payload: unknown) => ipcRenderer.invoke('knowledgeBase:draftEntry', projectId, source, payload),
    exportProject: (projectId: string) => ipcRenderer.invoke('projects:export', projectId),
    readText: (projectIdOrFilePath: string, filePath?: string) => ipcRenderer.invoke('project:readText', projectIdOrFilePath, filePath),
    extractFileText: (filePath: string) => ipcRenderer.invoke('project:extractFileText', filePath),
    getUploadDataUrl: (projectId: string, filePath: string) => ipcRenderer.invoke('project:getUploadDataUrl', projectId, filePath),
    saveText: (projectId: string, filePath: string, content: string) => ipcRenderer.invoke('project:saveText', projectId, filePath, content),
    snapshotProject: (projectId: string, root: string) => ipcRenderer.invoke('project:snapshot', projectId, root),
    checkLatex: () => ipcRenderer.invoke('latex:check'),
    // 新增
    getProjectSummary: (projectId: string) => ipcRenderer.invoke('projects:summary', projectId),
    ocrImages: (filePaths: string[]) => ipcRenderer.invoke('ocr:batch', filePaths),
    previewQuestionsFromFileContent: (filePaths: string[]) => ipcRenderer.invoke('questions:previewFilesDirect', filePaths)
  });
  console.log('[preload] cramEngine API exposed successfully');
} catch (err) {
  console.error('[preload] Failed to expose cramEngine:', err);
}
