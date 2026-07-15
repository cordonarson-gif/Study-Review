declare module 'js-yaml';

type ProjectFile = {
  name: string;
  path: string;
  kind: 'file' | 'directory';
};

type ProjectSnapshot = {
  root: string;
  files: ProjectFile[];
};

type ModelOption = {
  id: string;
  label: string;
  provider: string;
  source: 'preset' | 'fetched' | 'custom';
};

type ProviderKind = 'anthropic' | 'openai-compatible' | 'aliyun';

type ManagedModel = {
  id: string;
  label: string;
  source: 'preset' | 'fetched' | 'custom';
  enabled: boolean;
};

type ProviderProfile = {
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

type ConnectionCheckResult =
  | { ok: true; message: string; status: number }
  | {
      ok: false;
      kind: 'credentials' | 'authentication' | 'endpoint' | 'network' | 'service';
      message: string;
      status?: number;
    };

type ParsedUpload = {
  title: string;
  kind: 'file' | 'image';
  summary: string;
  extractedText: string;
  sourcePath: string;
};

type QuestionOption = {
  key: string;
  text: string;
};

type ReviewQuestion = {
  id: string;
  stem: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  category: string;
  knowledgePoint: string;
  questionType: string;
  source: 'text' | 'file' | 'image' | 'manual';
  sourceName?: string;
  favorite: boolean;
  wrong: boolean;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

type QuestionDraft = Omit<ReviewQuestion, 'id' | 'favorite' | 'wrong' | 'attempts' | 'createdAt' | 'updatedAt'>;

type KnowledgeResource = {
  id: string;
  knowledgePoint: string;
  platform: 'bilibili' | 'douyin' | 'web';
  title: string;
  description: string;
  url: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
};

type ChatTurn = {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  model?: string;
};

type AppSettings = {
  version: 2;
  activeProviderId: string;
  providers: ProviderProfile[];
  temperature: number;
  maxTokens: number;
  latexEngine: 'xelatex' | 'pdflatex';
  enableLatexPreview: boolean;
  lastModelSyncAt: string | null;
};

type LegacyAppSettings = {
  apiKey: string;
  baseUrl: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  latexEngine: 'xelatex' | 'pdflatex';
  enableLatexPreview: boolean;
  availableModels: ModelOption[];
  lastModelSyncAt: string | null;
};

type SettingsCompatibilityResult = AppSettings & LegacyAppSettings;

type ProjectMeta = {
  id: string;
  name: string;
  courseName: string;
  root: string;
  examType: string;
  textbook: string;
  notes: string;
  requirements: string;
  provider: string;
  model: string;
  knowledgeBasePath: string;
  linkedFolder?: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
};

type ProjectSourceFile = {
  name: string;
  storedPath: string;
  originalPath: string;
  kind: 'file' | 'image';
  importedAt: string;
  parsed?: ParsedUpload;
};

type KnowledgeBaseEntry = {
  id: string;
  title: string;
  summary: string;
  source: 'chat' | 'upload' | 'stage' | 'summary';
  tags: string[];
  filePath: string;
  updatedAt: string;
};

type KnowledgeDraft = {
  title: string;
  summary: string;
  tags: string[];
  content: string;
};

type ProjectDetail = {
  meta: ProjectMeta;
  configYaml: string;
  progressMarkdown: string;
  uploads: ProjectSourceFile[];
  knowledgeBase: KnowledgeBaseEntry[];
  questions: ReviewQuestion[];
  resources: KnowledgeResource[];
  snapshot: ProjectSnapshot;
  chatHistory: ChatTurn[];
};

type CreateProjectInput = {
  name: string;
  courseName: string;
  linkedFolder?: string;
  examType: string;
  textbook: string;
  notes: string;
  requirements: string;
  mustKnow: string[];
  keyPoints: string[];
  provider: string;
  model: string;
  initialQuestions?: QuestionDraft[];
};

type ExportResult = {
  markdownPath: string;
  jsonPath: string;
};

declare global {
  interface Window {
    cramEngine: {
      selectProjectFolder: () => Promise<string | null>;
      selectUploadFiles: () => Promise<string[]>;
      getSettings: () => Promise<SettingsCompatibilityResult>;
      saveSettings: (settings: AppSettings | LegacyAppSettings) => Promise<SettingsCompatibilityResult>;
      fetchModels: () => Promise<SettingsCompatibilityResult>;
      testProviderConnection: (profile: ProviderProfile) => Promise<ConnectionCheckResult>;
      fetchProviderModels: (profile: ProviderProfile) => Promise<ProviderProfile>;
      listProjects: () => Promise<ProjectMeta[]>;
      createProject: (input: CreateProjectInput) => Promise<ProjectDetail>;
      openProject: (projectId: string) => Promise<ProjectDetail>;
      renameProject: (projectId: string, name: string) => Promise<ProjectMeta>;
      deleteProject: (projectId: string) => Promise<boolean>;
      updateProjectModel: (projectId: string, model: string) => Promise<ProjectMeta>;
      saveProjectConfig: (projectId: string, content: string) => Promise<boolean>;
      saveProjectProgress: (projectId: string, content: string) => Promise<boolean>;
      importProjectFiles: (projectId: string, filePaths: string[]) => Promise<ProjectSourceFile[]>;
      previewQuestionsFromText: (text: string, source: QuestionDraft['source'], sourceName?: string) => Promise<QuestionDraft[]>;
      previewQuestionsFromFiles: (filePaths: string[]) => Promise<QuestionDraft[]>;
      addQuestions: (projectId: string, drafts: QuestionDraft[]) => Promise<ReviewQuestion[]>;
      updateQuestion: (projectId: string, question: ReviewQuestion) => Promise<ReviewQuestion[]>;
      getKnowledgeResources: (projectId: string, knowledgePoint: string) => Promise<KnowledgeResource[]>;
      openKnowledgeResource: (projectId: string, resource: KnowledgeResource) => Promise<KnowledgeResource[]>;
      runProjectChat: (projectId: string, input: string) => Promise<{ reply: string; history: ChatTurn[] }>;
      addKnowledgeBaseEntry: (projectId: string, entry: { title: string; summary: string; source: 'chat' | 'upload' | 'stage' | 'summary'; tags: string[]; content: string }) => Promise<KnowledgeBaseEntry>;
      draftKnowledgeBaseEntry: (projectId: string, source: 'chat' | 'upload', payload: { title?: string; content: string; fallbackTags?: string[] }) => Promise<KnowledgeDraft>;
      exportProject: (projectId: string) => Promise<ExportResult>;
      readText: (projectIdOrFilePath: string, filePath?: string) => Promise<string>;
      saveText: (projectId: string, filePath: string, content: string) => Promise<boolean>;
      snapshotProject: (projectId: string, root: string) => Promise<ProjectSnapshot>;
      checkLatex: () => Promise<{ available: boolean; engine: string; path: string | null }>;
      /** 新增：获取项目统计摘要 */
      getProjectSummary: (projectId: string) => Promise<{ questionCount: number; knowledgeBaseCount: number; progressPercent: number }>;
      /** 新增：批量 OCR 图片 */
      ocrImages: (filePaths: string[]) => Promise<Array<{ path: string; text: string }>>;
      /** 新增：从文件内容直接解析题目 */
      previewQuestionsFromFileContent: (filePaths: string[]) => Promise<QuestionDraft[]>;
    };
  }
}

export {};
