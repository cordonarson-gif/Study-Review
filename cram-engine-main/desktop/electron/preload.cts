import { contextBridge, ipcRenderer } from 'electron';
import { migrateSettings, type AppSettings } from './settings-schema.cjs';

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

function toLegacySettings(settings: AppSettings): SettingsCompatibilityResult {
  const profile = settings.providers.find((candidate) => candidate.id === settings.activeProviderId)
    ?? settings.providers[0];

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

function toV2Settings(settings: unknown): AppSettings {
  const migrated = migrateSettings(settings);
  if (!isAppSettings(settings)) {
    return migrated;
  }

  const legacy = settings as AppSettings & Partial<LegacySettingsCompatibility>;
  const activeProfile = migrated.providers.find((candidate) => candidate.id === migrated.activeProviderId)
    ?? migrated.providers[0];

  if (!activeProfile) {
    return migrated;
  }

  const profile = legacy.provider === activeProfile.provider
    ? activeProfile
    : migrated.providers.find((candidate) => candidate.provider === legacy.provider) ?? activeProfile;

  return {
    ...migrated,
    activeProviderId: profile.id,
    providers: migrated.providers.map((candidate) => candidate.id === profile.id ? {
      ...candidate,
      baseUrl: legacy.baseUrl ?? candidate.baseUrl,
      apiKey: legacy.apiKey ?? candidate.apiKey,
      selectedModelId: legacy.model ?? candidate.selectedModelId
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
    runProjectChat: (projectId: string, input: string) => ipcRenderer.invoke('projects:chat', projectId, input),
    addKnowledgeBaseEntry: (projectId: string, entry: unknown) => ipcRenderer.invoke('knowledgeBase:addEntry', projectId, entry),
    draftKnowledgeBaseEntry: (projectId: string, source: 'chat' | 'upload', payload: unknown) => ipcRenderer.invoke('knowledgeBase:draftEntry', projectId, source, payload),
    exportProject: (projectId: string) => ipcRenderer.invoke('projects:export', projectId),
    readText: (projectIdOrFilePath: string, filePath?: string) => ipcRenderer.invoke('project:readText', projectIdOrFilePath, filePath),
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
