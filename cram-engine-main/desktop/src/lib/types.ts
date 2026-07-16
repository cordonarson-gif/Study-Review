export type ProjectFile = {
  name: string;
  path: string;
  kind: 'file' | 'directory';
};

export type ProjectSnapshot = {
  root: string;
  files: ProjectFile[];
};

export type ProviderOption = {
  id: string;
  label: string;
  baseUrl: string;
  models: string[];
};

export type ModelOption = {
  id: string;
  label: string;
  provider: string;
  source: 'preset' | 'fetched' | 'custom';
};

export type ProviderKind = 'anthropic' | 'openai-compatible' | 'aliyun';

export type ManagedModelSource = 'preset' | 'fetched' | 'custom';

export type ManagedModel = {
  id: string;
  label: string;
  source: ManagedModelSource;
  enabled: boolean;
};

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

export type ConnectionCheckResult =
  | { ok: true; message: string; status: number }
  | {
      ok: false;
      kind: 'credentials' | 'authentication' | 'endpoint' | 'network' | 'service';
      message: string;
      status?: number;
    };

export type ParsedUpload = {
  title: string;
  kind: 'file' | 'image';
  summary: string;
  extractedText: string;
  sourcePath: string;
};

export type QuestionOption = {
  key: string;
  text: string;
};

export type ReviewQuestion = {
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

export type QuestionDraft = Omit<ReviewQuestion, 'id' | 'favorite' | 'wrong' | 'attempts' | 'createdAt' | 'updatedAt'>;

export type KnowledgeResource = {
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

export type ChatTurn = {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  model?: string;
};

export type LearningProfile = {
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

export type LearningProfileEvent = {
  id: string;
  type: 'created' | 'manual-save' | 'agent-analysis' | 'activity-refresh';
  summary: string;
  createdAt: string;
};

export type LearningProfileState = {
  profile: LearningProfile;
  events: LearningProfileEvent[];
};

export type PersonalizedResourceType = 'handout' | 'example' | 'flashcard' | 'remediation';

export type PersonalizedResource = {
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

export type GeneratePersonalizedResourcesInput = {
  topic: string;
  type: PersonalizedResourceType | 'all';
};

export type LearningPathTaskStatus = 'todo' | 'doing' | 'done';

export type LearningPathTask = {
  id: string;
  title: string;
  detail: string;
  status: LearningPathTaskStatus;
  resourceIds: string[];
};

export type LearningPathStage = {
  id: string;
  title: string;
  objective: string;
  duration: string;
  tasks: LearningPathTask[];
};

export type LearningPathPlan = {
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

export type GenerateLearningPathInput = {
  targetDate: string;
  dailyMinutes: number;
  focus: string;
};

export type StageReportSection = {
  title: string;
  contentMarkdown: string;
};

export type StageReport = {
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

export type ProjectMode =
  | 'exam-review'
  | 'paper-assistant'
  | 'research-analysis'
  | 'teaching-design'
  | 'assignment-quiz';

export type WizardFieldType = 'text' | 'textarea' | 'select' | 'number' | 'file-list';

export type WizardField = {
  key: string;
  label: string;
  type: WizardFieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export type WorkspaceTabId =
  | 'overview'
  | 'profile'
  | 'materials'
  | 'agents'
  | 'resources'
  | 'path'
  | 'practice'
  | 'import'
  | 'report'
  | 'delivery'
  | 'config'
  | 'progress'
  | 'paper-overview'
  | 'paper-literature'
  | 'paper-outline'
  | 'paper-chapters'
  | 'paper-methods'
  | 'paper-innovation'
  | 'paper-format'
  | 'paper-defense'
  | 'research-overview'
  | 'research-dataset'
  | 'research-plan'
  | 'research-statistics'
  | 'research-charts'
  | 'research-findings'
  | 'research-report'
  | 'teaching-overview'
  | 'teaching-objectives'
  | 'teaching-key-points'
  | 'teaching-activities'
  | 'teaching-assessment'
  | 'teaching-lesson-plan'
  | 'teaching-courseware'
  | 'assignment-overview'
  | 'assignment-bank'
  | 'assignment-paper'
  | 'assignment-online-quiz'
  | 'assignment-grading'
  | 'assignment-wrong-answers'
  | 'assignment-feedback';

export type WorkspaceTabTemplate = {
  id: WorkspaceTabId;
  label: string;
  description: string;
};

export type AgentTemplate = {
  id: string;
  label: string;
  description: string;
};

export type DeliverableTemplate = {
  id: string;
  label: string;
  checklist: string[];
};

export type ProjectModeTemplate = {
  mode: ProjectMode;
  title: string;
  description: string;
  icon: string;
  recommendedFor: string[];
  wizardFields: WizardField[];
  tabs: WorkspaceTabTemplate[];
  agents: AgentTemplate[];
  deliverables: DeliverableTemplate[];
  supportedUploads: string[];
};

export type ModeArtifact = {
  id: string;
  mode: ProjectMode;
  tabId: WorkspaceTabId;
  title: string;
  kind: string;
  contentMarkdown: string;
  source: 'agent' | 'manual' | 'fallback';
  createdAt: string;
  updatedAt: string;
};

export type GenerateModeArtifactInput = {
  tabId: WorkspaceTabId;
  prompt: string;
  artifactKind: string;
};

export type DeliveryPackageItemType =
  | 'resources'
  | 'reports'
  | 'question-bank'
  | 'knowledge-base'
  | 'learning-path'
  | 'archive';

export type DeliveryPackageItemStatus = 'ready' | 'needs-review' | 'missing';

export type DeliveryPackageItem = {
  id: string;
  type: DeliveryPackageItemType;
  title: string;
  description: string;
  status: DeliveryPackageItemStatus;
  sourceIds: string[];
  checklist: string[];
};

export type DeliveryPackage = {
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

export type LegacyAppSettings = {
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

export type VersionedAppSettings = {
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

export type AppSettings = VersionedAppSettings & LegacyAppSettings;

export type ProjectSourceFile = {
  name: string;
  storedPath: string;
  originalPath: string;
  kind: 'file' | 'image';
  importedAt: string;
  parsed?: ParsedUpload;
};

export type KnowledgeBaseEntry = {
  id: string;
  title: string;
  summary: string;
  source: 'chat' | 'upload' | 'stage' | 'summary';
  tags: string[];
  filePath: string;
  updatedAt: string;
};

export type ProjectMeta = {
  id: string;
  mode: ProjectMode;
  modeConfig?: Record<string, unknown>;
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

export type ProjectDetail = {
  meta: ProjectMeta;
  configYaml: string;
  progressMarkdown: string;
  uploads: ProjectSourceFile[];
  knowledgeBase: KnowledgeBaseEntry[];
  questions: ReviewQuestion[];
  resources: KnowledgeResource[];
  snapshot: ProjectSnapshot;
  chatHistory: ChatTurn[];
  learningProfile?: LearningProfileState;
  personalizedResources?: PersonalizedResource[];
  learningPathPlan?: LearningPathPlan | null;
  stageReports?: StageReport[];
  deliveryPackage?: DeliveryPackage | null;
  modeArtifacts?: ModeArtifact[];
};

export type CreateProjectInput = {
  mode?: ProjectMode;
  modeConfig?: Record<string, unknown>;
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

export type ExportResult = {
  markdownPath: string;
  jsonPath: string;
};

export type AgentMessage = {
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  model?: string;
};

export const providerOptions: ProviderOption[] = [
  {
    id: 'openai-compatible',
    label: 'OpenAI Compatible',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4.1', 'gpt-4.1-mini']
  },
  {
    id: 'aliyun',
    label: 'Qwen Compatible',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-max', 'qwen2.5-72b-instruct']
  },
  {
    id: 'anthropic',
    label: 'Anthropic / Claude',
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001']
  }
];

export const presetModels: ModelOption[] = providerOptions.flatMap((provider) =>
  provider.models.map((model) => ({
    id: model,
    label: model,
    provider: provider.id,
    source: 'preset' as const
  }))
);

export const defaultProviderProfiles: ProviderProfile[] = providerOptions.map((provider) => ({
  id: provider.id,
  label: provider.label,
  provider: provider.id as ProviderKind,
  baseUrl: provider.baseUrl,
  apiKey: '',
  enabled: true,
  isCustom: false,
  selectedModelId: provider.models[0],
  models: provider.models.map((model) => ({
    id: model,
    label: model,
    source: 'preset' as const,
    enabled: true
  }))
}));

export const defaultSettings: AppSettings = {
  version: 2,
  activeProviderId: providerOptions[0].id,
  providers: defaultProviderProfiles,
  apiKey: '',
  baseUrl: providerOptions[0].baseUrl,
  provider: providerOptions[0].id,
  model: providerOptions[0].models[0],
  temperature: 0.2,
  maxTokens: 4096,
  latexEngine: 'xelatex',
  enableLatexPreview: true,
  availableModels: presetModels,
  lastModelSyncAt: null,
  mineru: {
    enabled: false,
    mode: 'precise',
    apiKey: '',
    baseUrl: 'https://mineru.net',
    preferForUploads: true
  }
};

export const examOptions = ['期末卷', '开卷', '闭卷', '面试', '论文答辩'] as const;
export const stageOrder = ['拆解', '讲授', '检题', '补漏'] as const;

// ---- 增量新增类型 ----

/** 题目分类树节点 */
export type CategoryTreeNode = {
  name: string;
  count: number;
  children: CategoryTreeNode[];
};

/** 题目录入入口 Tab */
export type ImportTab = 'text' | 'file' | 'image';

/** 项目排序方式 */
export type ProjectSortKey = 'lastOpened' | 'created' | 'name';

/** 项目摘要（含统计信息） */
export type ProjectSummary = ProjectMeta & {
  questionCount: number;
  knowledgeBaseCount: number;
  progressPercent: number;
};

/** 刷题统计 */
export type PracticeStats = {
  total: number;
  completed: number;
  correct: number;
  wrong: number;
  favorite: number;
};
