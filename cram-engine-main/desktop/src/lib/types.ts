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

export type AppSettings = {
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
};

export type CreateProjectInput = {
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

export const defaultSettings: AppSettings = {
  apiKey: '',
  baseUrl: providerOptions[0].baseUrl,
  provider: providerOptions[0].id,
  model: providerOptions[0].models[0],
  temperature: 0.2,
  maxTokens: 4096,
  latexEngine: 'xelatex',
  enableLatexPreview: true,
  availableModels: presetModels,
  lastModelSyncAt: null
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
