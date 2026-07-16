import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { createWorker } from 'tesseract.js';
import {
  buildChatRequest,
  buildModelsRequest,
  classifyProviderError,
  classifyProviderResponse,
  mergeManagedModels,
  parseChatResponse,
  parseModelsResponse,
  type ConnectionCheckResult
} from './provider-api.cjs';
import { assertAllowedProjectPath } from './file-access.cjs';
import { detectLatexEnvironment } from './latex-detector.cjs';
import { parseQuestionDrafts, type QuestionDraft, type ReviewQuestion } from './question-utils.cjs';
import {
  createDefaultSettings,
  getActiveProvider,
  migrateSettings,
  normalizeProviderProfile,
  normalizeSettings,
  type AppSettings,
  type ProviderProfile
} from './settings-schema.cjs';

type ProjectFile = {
  name: string;
  path: string;
  kind: 'file' | 'directory';
};

type ProjectSnapshot = {
  root: string;
  files: ProjectFile[];
};

type ParsedUpload = {
  title: string;
  kind: 'file' | 'image';
  summary: string;
  extractedText: string;
  sourcePath: string;
};

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

type LearningProfileEvent = {
  id: string;
  type: 'created' | 'manual-save' | 'agent-analysis' | 'activity-refresh';
  summary: string;
  createdAt: string;
};

type LearningProfileState = {
  profile: LearningProfile;
  events: LearningProfileEvent[];
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

type ProjectMode =
  | 'exam-review'
  | 'paper-assistant'
  | 'research-analysis'
  | 'teaching-design'
  | 'assignment-quiz'
  | 'research-innovation'
  | 'lab-simulation'
  | 'virtual-teacher'
  | 'student-development'
  | 'interactive-courseware'
  | 'teaching-game'
  | 'knowledge-graph'
  | 'mistake-collection';

type WorkspaceTabId =
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
  | 'assignment-feedback'
  | 'innovation-overview'
  | 'innovation-landscape'
  | 'innovation-problems'
  | 'innovation-methods'
  | 'innovation-evidence'
  | 'innovation-roadmap'
  | 'simulation-overview'
  | 'simulation-model'
  | 'simulation-parameters'
  | 'simulation-run'
  | 'simulation-results'
  | 'simulation-report'
  | 'tutor-overview'
  | 'tutor-diagnosis'
  | 'tutor-dialogue'
  | 'tutor-explanation'
  | 'tutor-practice'
  | 'tutor-feedback'
  | 'development-overview'
  | 'development-profile'
  | 'development-goals'
  | 'development-plan'
  | 'development-portfolio'
  | 'development-assessment'
  | 'courseware-overview'
  | 'courseware-outline'
  | 'courseware-content'
  | 'courseware-assets'
  | 'courseware-preview'
  | 'courseware-publish'
  | 'game-overview'
  | 'game-bank'
  | 'game-rules'
  | 'game-preview'
  | 'game-results'
  | 'game-feedback'
  | 'graph-overview'
  | 'graph-sources'
  | 'graph-extract'
  | 'graph-view'
  | 'graph-curation'
  | 'graph-export'
  | 'mistakes-overview'
  | 'mistakes-import'
  | 'mistakes-classify'
  | 'mistakes-review'
  | 'mistakes-practice'
  | 'mistakes-report';

type ModeArtifact = {
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

type GenerateModeArtifactInput = {
  tabId: WorkspaceTabId;
  prompt: string;
  artifactKind: string;
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

type ProjectMeta = {
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
  learningProfile?: LearningProfileState;
  personalizedResources?: PersonalizedResource[];
  learningPathPlan?: LearningPathPlan | null;
  stageReports?: StageReport[];
  deliveryPackage?: DeliveryPackage | null;
  modeArtifacts?: ModeArtifact[];
};

type CreateProjectInput = {
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

type ExportResult = {
  markdownPath: string;
  jsonPath: string;
};

const devServerUrl = process.env.ELECTRON_RENDERER_URL ?? 'http://127.0.0.1:5173';

let mainWindow: BrowserWindow | null = null;
const approvedExternalPaths = new Set<string>();

function appDataRoot() {
  return path.join(app.getPath('appData'), 'CramEngineDesktop');
}

function settingsPath() {
  return path.join(appDataRoot(), 'settings.json');
}

function projectsRoot() {
  return path.join(appDataRoot(), 'projects');
}

function projectRegistryPath() {
  return path.join(projectsRoot(), 'index.json');
}

function projectDir(projectId: string) {
  return path.join(projectsRoot(), projectId);
}

function projectMetaPath(projectId: string) {
  return path.join(projectDir(projectId), 'project.json');
}

function projectConfigPath(projectId: string) {
  return path.join(projectDir(projectId), 'config.yaml');
}

function projectProgressPath(projectId: string) {
  return path.join(projectDir(projectId), 'progress.md');
}

function projectUploadsDir(projectId: string) {
  return path.join(projectDir(projectId), 'uploads');
}

function projectQuestionsPath(projectId: string) {
  return path.join(projectDir(projectId), 'questions', 'index.json');
}

function projectResourcesPath(projectId: string) {
  return path.join(projectDir(projectId), 'resources', 'index.json');
}

function projectGeneratedResourcesPath(projectId: string) {
  return path.join(projectDir(projectId), 'resources', 'generated.json');
}

function projectLearningPathPlanPath(projectId: string) {
  return path.join(projectDir(projectId), 'path', 'plan.json');
}

function projectStageReportsPath(projectId: string) {
  return path.join(projectDir(projectId), 'reports', 'index.json');
}

function projectDeliveryPackagePath(projectId: string) {
  return path.join(projectDir(projectId), 'delivery', 'package.json');
}

function projectModeArtifactsPath(projectId: string) {
  return path.join(projectDir(projectId), 'mode-artifacts', 'index.json');
}

function projectGeneratedDir(projectId: string) {
  return path.join(projectDir(projectId), 'generated');
}

function projectKnowledgeBaseDir(projectId: string) {
  return path.join(projectDir(projectId), 'knowledge-base');
}

function projectKnowledgeEntriesDir(projectId: string) {
  return path.join(projectKnowledgeBaseDir(projectId), 'entries');
}

function projectKnowledgeIndexPath(projectId: string) {
  return path.join(projectKnowledgeBaseDir(projectId), 'index.json');
}

function projectChatPath(projectId: string) {
  return path.join(projectDir(projectId), 'chat', 'history.json');
}

function projectProfileDir(projectId: string) {
  return path.join(projectDir(projectId), 'profile');
}

function projectProfilePath(projectId: string) {
  return path.join(projectProfileDir(projectId), 'profile.json');
}

function projectProfileEventsPath(projectId: string) {
  return path.join(projectProfileDir(projectId), 'events.json');
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';
}

function normalizeFsPath(targetPath: string) {
  return path.resolve(targetPath);
}

function rememberApprovedExternalPaths(filePaths: string[]) {
  for (const filePath of filePaths) {
    approvedExternalPaths.add(normalizeFsPath(filePath));
  }
}

function assertApprovedExternalPath(filePath: string) {
  const normalized = normalizeFsPath(filePath);
  if (!approvedExternalPaths.has(normalized)) {
    throw new Error(`Path is not approved for direct access: ${filePath}`);
  }
  return filePath;
}

async function ensureParentDir(filePath: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function writeJson(filePath: string, data: unknown) {
  await ensureParentDir(filePath);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

const projectModes: ProjectMode[] = [
  'exam-review',
  'paper-assistant',
  'research-analysis',
  'teaching-design',
  'assignment-quiz',
  'research-innovation',
  'lab-simulation',
  'virtual-teacher',
  'student-development',
  'interactive-courseware',
  'teaching-game',
  'knowledge-graph',
  'mistake-collection'
];

const workspaceTabs: WorkspaceTabId[] = [
  'overview',
  'profile',
  'materials',
  'agents',
  'resources',
  'path',
  'practice',
  'import',
  'report',
  'delivery',
  'config',
  'progress',
  'paper-overview',
  'paper-literature',
  'paper-outline',
  'paper-chapters',
  'paper-methods',
  'paper-innovation',
  'paper-format',
  'paper-defense',
  'research-overview',
  'research-dataset',
  'research-plan',
  'research-statistics',
  'research-charts',
  'research-findings',
  'research-report',
  'teaching-overview',
  'teaching-objectives',
  'teaching-key-points',
  'teaching-activities',
  'teaching-assessment',
  'teaching-lesson-plan',
  'teaching-courseware',
  'assignment-overview',
  'assignment-bank',
  'assignment-paper',
  'assignment-online-quiz',
  'assignment-grading',
  'assignment-wrong-answers',
  'assignment-feedback',
  'innovation-overview',
  'innovation-landscape',
  'innovation-problems',
  'innovation-methods',
  'innovation-evidence',
  'innovation-roadmap',
  'simulation-overview',
  'simulation-model',
  'simulation-parameters',
  'simulation-run',
  'simulation-results',
  'simulation-report',
  'tutor-overview',
  'tutor-diagnosis',
  'tutor-dialogue',
  'tutor-explanation',
  'tutor-practice',
  'tutor-feedback',
  'development-overview',
  'development-profile',
  'development-goals',
  'development-plan',
  'development-portfolio',
  'development-assessment',
  'courseware-overview',
  'courseware-outline',
  'courseware-content',
  'courseware-assets',
  'courseware-preview',
  'courseware-publish',
  'game-overview',
  'game-bank',
  'game-rules',
  'game-preview',
  'game-results',
  'game-feedback',
  'graph-overview',
  'graph-sources',
  'graph-extract',
  'graph-view',
  'graph-curation',
  'graph-export',
  'mistakes-overview',
  'mistakes-import',
  'mistakes-classify',
  'mistakes-review',
  'mistakes-practice',
  'mistakes-report'
];

function normalizeProjectMode(mode: unknown): ProjectMode {
  return projectModes.includes(mode as ProjectMode) ? mode as ProjectMode : 'exam-review';
}

function normalizeWorkspaceTabId(tabId: unknown): WorkspaceTabId {
  return workspaceTabs.includes(tabId as WorkspaceTabId) ? tabId as WorkspaceTabId : 'overview';
}

function normalizeModeConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeProjectMeta(meta: ProjectMeta): ProjectMeta {
  return {
    ...meta,
    mode: normalizeProjectMode((meta as Partial<ProjectMeta>).mode),
    modeConfig: normalizeModeConfig((meta as Partial<ProjectMeta>).modeConfig)
  };
}

const defaultLearningProfile = (now = new Date().toISOString()): LearningProfile => {
  return {
    version: 1,
    knowledgeLevel: '未评估',
    learningGoal: '完成当前项目的赛题理解、资料整理与阶段性复盘。',
    cognitiveStyle: '尚未评估，建议先通过一次画像分析补充。',
    weakPoints: [],
    mistakePatterns: [],
    resourcePreferences: ['结构化讲解', '例题拆解', '错题复盘'],
    availableTime: '未填写',
    motivation: '未填写',
    notes: '',
    confidence: 'low',
    updatedAt: now
  };
};

function normalizeLearningProfile(profile: Partial<LearningProfile> | null | undefined): LearningProfile {
  const now = new Date().toISOString();
  const base = defaultLearningProfile(now);
  const toStringList = (value: unknown) => Array.isArray(value)
    ? uniqueStrings(value.map((item) => String(item)))
    : [];
  const knowledgeLevel = ['基础薄弱', '中等', '较好', '未评估'].includes(String(profile?.knowledgeLevel))
    ? profile?.knowledgeLevel as LearningProfile['knowledgeLevel']
    : base.knowledgeLevel;
  const confidence = ['low', 'medium', 'high'].includes(String(profile?.confidence))
    ? profile?.confidence as LearningProfile['confidence']
    : base.confidence;

  return {
    version: 1,
    knowledgeLevel,
    learningGoal: String(profile?.learningGoal || base.learningGoal),
    cognitiveStyle: String(profile?.cognitiveStyle || base.cognitiveStyle),
    weakPoints: toStringList(profile?.weakPoints),
    mistakePatterns: toStringList(profile?.mistakePatterns),
    resourcePreferences: toStringList(profile?.resourcePreferences).length
      ? toStringList(profile?.resourcePreferences)
      : base.resourcePreferences,
    availableTime: String(profile?.availableTime || base.availableTime),
    motivation: String(profile?.motivation || base.motivation),
    notes: String(profile?.notes || ''),
    confidence,
    updatedAt: typeof profile?.updatedAt === 'string' && profile.updatedAt ? profile.updatedAt : now
  };
}

function learningProfileEvent(type: LearningProfileEvent['type'], summary: string): LearningProfileEvent {
  const now = new Date().toISOString();
  return {
    id: `${type}-${Date.now()}`,
    type,
    summary,
    createdAt: now
  };
}

async function ensureLearningProfileState(projectId: string): Promise<LearningProfileState> {
  const profile = normalizeLearningProfile(await readJson<Partial<LearningProfile> | null>(projectProfilePath(projectId), null));
  let events = await readJson<LearningProfileEvent[]>(projectProfileEventsPath(projectId), []);

  if (!events.length) {
    events = [learningProfileEvent('created', '已为项目创建学习画像。')];
  }

  await mkdir(projectProfileDir(projectId), { recursive: true });
  await writeJson(projectProfilePath(projectId), profile);
  await writeJson(projectProfileEventsPath(projectId), events);
  return { profile, events };
}

async function saveLearningProfile(projectId: string, profile: LearningProfile): Promise<LearningProfileState> {
  const normalized = normalizeLearningProfile({
    ...profile,
    updatedAt: new Date().toISOString()
  });
  await writeJson(projectProfilePath(projectId), normalized);
  const events = await appendLearningProfileEvent(projectId, 'manual-save', '已保存手动编辑的学习画像。');
  return { profile: normalized, events };
}

async function appendLearningProfileEvent(
  projectId: string,
  type: LearningProfileEvent['type'],
  summary: string
): Promise<LearningProfileEvent[]> {
  const current = await readJson<LearningProfileEvent[]>(projectProfileEventsPath(projectId), []);
  const events = [learningProfileEvent(type, summary), ...current].slice(0, 50);
  await writeJson(projectProfileEventsPath(projectId), events);
  return events;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function summarizeContent(content: string, maxLength = 120) {
  const normalized = normalizeWhitespace(content).replace(/[#>*`_-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return '暂无摘要';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}…` : normalized;
}

function inferKnowledgeTags(content: string, fallbackTags: string[] = []) {
  const tags = [...fallbackTags];
  const rules: Array<[RegExp, string]> = [
    [/公式|定理|证明|推导|积分|矩阵|导数/i, '公式'],
    [/重点|考点|必考|高频|常考/i, '考点'],
    [/错题|易错|陷阱|误区/i, '易错点'],
    [/定义|概念|术语/i, '概念'],
    [/简答|论述|案例|分析|题型/i, '题型'],
    [/步骤|流程|方法|套路|模板/i, '方法'],
    [/图片|截图|拍照|ocr/i, '图片解析']
  ];

  for (const [pattern, tag] of rules) {
    if (pattern.test(content)) {
      tags.push(tag);
    }
  }

  return uniqueStrings(tags.length ? tags : ['待整理']);
}

function draftKnowledgeEntry(input: {
  source: 'chat' | 'upload' | 'stage' | 'summary';
  title?: string;
  content: string;
  fallbackTags?: string[];
}) {
  const normalized = normalizeWhitespace(input.content);
  const title = input.title?.trim() || summarizeContent(normalized, 28);
  const summary = summarizeContent(normalized, 120);
  const tags = inferKnowledgeTags(normalized, input.fallbackTags ?? []);
  return {
    title,
    summary,
    tags,
    content: normalized || '暂无内容。'
  } satisfies KnowledgeDraft;
}

function materializeQuestionDrafts(drafts: QuestionDraft[]): ReviewQuestion[] {
  const now = new Date().toISOString();
  return drafts.map((draft, index) => ({
    ...draft,
    id: `${slugify(draft.knowledgePoint || draft.questionType || 'question')}-${Date.now()}-${index}`,
    favorite: false,
    wrong: false,
    attempts: 0,
    createdAt: now,
    updatedAt: now
  }));
}

function encodeSearch(value: string) {
  return encodeURIComponent(value.trim() || '期末复习');
}

function buildKnowledgeResources(knowledgePoint: string, existing: KnowledgeResource[] = []) {
  const now = new Date().toISOString();
  const query = encodeSearch(`${knowledgePoint} 讲解`);
  const seeds: Array<Omit<KnowledgeResource, 'id' | 'read' | 'createdAt' | 'updatedAt'>> = [
    {
      knowledgePoint,
      platform: 'bilibili',
      title: `B站：${knowledgePoint} 讲解视频`,
      description: '按当前知识点打开哔哩哔哩搜索结果，适合查找课堂式讲解与例题演示。',
      url: `https://search.bilibili.com/all?keyword=${query}`
    },
    {
      knowledgePoint,
      platform: 'douyin',
      title: `抖音：${knowledgePoint} 快速讲解`,
      description: '按当前知识点打开抖音网页搜索结果，适合查找短视频速记和口诀讲解。',
      url: `https://www.douyin.com/search/${query}`
    },
    {
      knowledgePoint,
      platform: 'web',
      title: `网页文章：${knowledgePoint}`,
      description: '使用通用网页搜索知识文章、定义说明和复习资料。',
      url: `https://www.bing.com/search?q=${query}`
    }
  ];

  return seeds.map((seed) => {
    const found = existing.find((resource) => resource.knowledgePoint === knowledgePoint && resource.platform === seed.platform);
    return found ?? {
      ...seed,
      id: `${slugify(knowledgePoint)}-${seed.platform}`,
      read: false,
      createdAt: now,
      updatedAt: now
    };
  });
}

async function collectEntries(root: string, relative = ''): Promise<ProjectFile[]> {
  const absolute = path.join(root, relative);
  const entries = await readdir(absolute, { withFileTypes: true });
  const results: ProjectFile[] = [];

  for (const entry of entries) {
    const nextRelative = path.join(relative, entry.name);
    results.push({
      name: entry.name,
      path: nextRelative,
      kind: entry.isDirectory() ? 'directory' : 'file'
    });

    if (entry.isDirectory()) {
      results.push(...await collectEntries(root, nextRelative));
    }
  }

  return results;
}

async function snapshotProject(root: string): Promise<ProjectSnapshot> {
  try {
    return {
      root,
      files: await collectEntries(root)
    };
  } catch {
    return { root, files: [] };
  }
}

async function loadSettings(): Promise<AppSettings> {
  const loaded = await readJson<unknown>(settingsPath(), createDefaultSettings());
  return migrateSettings(loaded);
}

async function saveSettings(settings: AppSettings) {
  const normalized = normalizeSettings(settings);
  await writeJson(settingsPath(), normalized);
  return normalized;
}

async function fetchModels() {
  const settings = await loadSettings();
  const profile = getActiveProvider(settings);
  const nextProfile = await fetchProviderModels(profile);
  const nextSettings = await saveSettings({
    ...settings,
    providers: settings.providers.map((candidate) => candidate.id === profile.id ? nextProfile : candidate),
    lastModelSyncAt: new Date().toISOString()
  });

  return nextSettings;
}

async function testProviderConnection(profile: ProviderProfile): Promise<ConnectionCheckResult> {
  if (!profile.baseUrl.trim() || !profile.apiKey.trim()) {
    return { ok: false, kind: 'credentials', message: '请填写 API 地址和 API Key' };
  }

  try {
    const request = buildModelsRequest(profile);
    const response = await fetch(request.url, { headers: request.headers });
    return classifyProviderResponse(response);
  } catch (error) {
    return classifyProviderError(error);
  }
}

async function fetchProviderModels(profile: ProviderProfile): Promise<ProviderProfile> {
  const check = await testProviderConnection(profile);
  if (!check.ok) {
    throw new Error(check.message);
  }

  const request = buildModelsRequest(profile);
  const response = await fetch(request.url, { headers: request.headers });
  const payload = await response.json() as { data?: Array<{ id?: string; name?: string; display_name?: string }> };
  const models = parseModelsResponse(profile.provider, payload)
    .map((id) => ({ id, label: id }));

  return normalizeProviderProfile({
    ...profile,
    models: mergeManagedModels(profile.models, models)
  });
}

async function listProjects(): Promise<ProjectMeta[]> {
  const projects = await readJson<ProjectMeta[]>(projectRegistryPath(), []);
  return projects.map(normalizeProjectMeta).sort((a, b) => {
    const left = new Date(a.lastOpenedAt || a.updatedAt || a.createdAt).getTime();
    const right = new Date(b.lastOpenedAt || b.updatedAt || b.createdAt).getTime();
    return right - left;
  });
}

async function saveProjects(projects: ProjectMeta[]) {
  await writeJson(projectRegistryPath(), projects);
}

async function persistProjectMeta(meta: ProjectMeta) {
  const normalized = normalizeProjectMeta(meta);
  await writeJson(projectMetaPath(normalized.id), normalized);
  const projects = await readJson<ProjectMeta[]>(projectRegistryPath(), []);
  await saveProjects([normalized, ...projects.map(normalizeProjectMeta).filter((project) => project.id !== normalized.id)]);
  return normalized;
}

function buildConfigYaml(input: CreateProjectInput) {
  return yaml.dump({
    course: input.courseName,
    must_know: input.mustKnow,
    key_points: input.keyPoints,
    exam_types: [input.examType],
    materials: {
      textbook: input.textbook,
      notes: input.notes
    },
    preferences: {
      provider: input.provider,
      model: input.model,
      extra_requirements: input.requirements,
      language: '中文',
      tone: '先给一句话核心结论再展开，拒绝学术黑话，拒绝绕弯子'
    }
  }, { lineWidth: 100 });
}

function buildInitialProgress(courseName: string) {
  return `# ${courseName} 进度\n\n- 阶段：拆解\n- 状态：待开始\n- 更新时间：${new Date().toLocaleString('zh-CN')}\n`;
}

const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tif', '.tiff'];
const textLikeExtensions = ['.txt', '.md', '.markdown', '.yaml', '.yml', '.json', '.csv'];
const supportedUploadExtensions = [
  ...imageExtensions,
  ...textLikeExtensions,
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx'
];

function extensionOf(filePath: string) {
  return path.extname(filePath).toLowerCase();
}

function dataUrlMime(filePath: string) {
  switch (extensionOf(filePath)) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.tif':
    case '.tiff':
      return 'image/tiff';
    default:
      return 'image/png';
  }
}

function isTextLikeFile(filePath: string) {
  return textLikeExtensions.includes(extensionOf(filePath));
}

function isImageFile(filePath: string) {
  return imageExtensions.includes(extensionOf(filePath));
}

async function parseImageWithOcr(targetPath: string) {
  const worker = await createWorker('chi_sim+eng');
  try {
    const result = await worker.recognize(targetPath);
    const text = result.data.text.trim();
    return text || 'OCR 未识别到可用文本。';
  } finally {
    await worker.terminate();
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function parseWithMinerUAgent(filePath: string, settings: AppSettings['mineru']) {
  const baseUrl = settings.baseUrl.replace(/\/+$/, '') || 'https://mineru.net';
  const fileName = path.basename(filePath);
  const buffer = await readFile(filePath);

  const uploadRequest = await fetchWithTimeout(`${baseUrl}/api/v4/file-urls/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
    },
    body: JSON.stringify({
      files: [{ name: fileName }],
      filenames: [fileName]
    })
  }, 20000);

  if (!uploadRequest.ok) {
    throw new Error(`MinerU 上传地址申请失败（HTTP ${uploadRequest.status}）`);
  }

  const uploadJson = await uploadRequest.json() as Record<string, any>;
  const uploadItem = uploadJson.data?.files?.[0] ?? uploadJson.data?.[0] ?? uploadJson.files?.[0] ?? uploadJson[0];
  const uploadUrl = uploadItem?.upload_url ?? uploadItem?.uploadUrl ?? uploadItem?.url;
  const objectName = uploadItem?.object_name ?? uploadItem?.objectName ?? uploadItem?.name ?? fileName;
  if (!uploadUrl) {
    throw new Error('MinerU 未返回可用上传地址');
  }

  const upload = await fetchWithTimeout(uploadUrl, { method: 'PUT', body: buffer }, 30000);
  if (!upload.ok) {
    throw new Error(`MinerU 文件上传失败（HTTP ${upload.status}）`);
  }

  const taskRequest = await fetchWithTimeout(`${baseUrl}/api/v4/extract/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
    },
    body: JSON.stringify({
      file_name: fileName,
      fileName,
      object_name: objectName,
      objectName
    })
  }, 20000);

  if (!taskRequest.ok) {
    throw new Error(`MinerU 解析任务创建失败（HTTP ${taskRequest.status}）`);
  }

  const taskJson = await taskRequest.json() as Record<string, any>;
  const taskId = taskJson.data?.task_id ?? taskJson.data?.taskId ?? taskJson.task_id ?? taskJson.taskId;
  if (!taskId) {
    throw new Error('MinerU 未返回解析任务 ID');
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const resultResponse = await fetchWithTimeout(`${baseUrl}/api/v4/extract/task/${encodeURIComponent(String(taskId))}`, {
      headers: settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : undefined
    }, 15000);
    if (!resultResponse.ok) continue;

    const resultJson = await resultResponse.json() as Record<string, any>;
    const data = resultJson.data ?? resultJson;
    const state = String(data.state ?? data.status ?? '').toLowerCase();
    if (state.includes('fail') || state.includes('error')) {
      throw new Error(data.message ?? 'MinerU 解析失败');
    }

    const markdown = data.markdown ?? data.md ?? data.content ?? data.text;
    if (typeof markdown === 'string' && markdown.trim()) return markdown.trim();

    const markdownUrl = data.markdown_url ?? data.markdownUrl ?? data.md_url ?? data.mdUrl;
    if (typeof markdownUrl === 'string' && markdownUrl) {
      const markdownResponse = await fetchWithTimeout(markdownUrl, {}, 15000);
      if (markdownResponse.ok) {
        const markdownText = (await markdownResponse.text()).trim();
        if (markdownText) return markdownText;
      }
    }
  }

  throw new Error('MinerU 解析超时，请稍后重试');
}

async function tryParseWithMinerU(filePath: string) {
  const settings = await loadSettings();
  if (!settings.mineru.enabled || !settings.mineru.preferForUploads) return null;

  try {
    return await parseWithMinerUAgent(filePath, settings.mineru);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MinerU 解析失败';
    return `MinerU 暂未返回可用文本：${message}\n文件已保留，可稍后重试或检查 MinerU API 配置。`;
  }
}

async function extractTextFromFile(filePath: string) {
  if (isImageFile(filePath)) {
    const mineruText = await tryParseWithMinerU(filePath);
    return mineruText ?? await parseImageWithOcr(filePath);
  }

  if (isTextLikeFile(filePath)) {
    return readFile(filePath, 'utf8');
  }

  const mineruText = await tryParseWithMinerU(filePath);
  if (mineruText) return mineruText;

  return `文件已保存：${path.basename(filePath)}\n如需自动识别 PDF、Word、PPT、Excel 等格式，请在系统设置 > 文档识别中启用 MinerU。`;
}

async function parseUpload(targetPath: string, kind: 'file' | 'image'): Promise<ParsedUpload> {
  const title = path.basename(targetPath);
  if (kind === 'image') {
    const extractedText = await extractTextFromFile(targetPath);
    return {
      title,
      kind,
      summary: extractedText === 'OCR 未识别到可用文本。'
        ? '图片已导入，但 OCR 暂未识别出有效文字。'
        : '图片 OCR 已完成，可继续提炼重点并沉淀到知识库。',
      extractedText,
      sourcePath: targetPath
    };
  }

  if (isTextLikeFile(targetPath)) {
    const raw = await extractTextFromFile(targetPath);
    const trimmed = raw.trim();
    const preview = trimmed.slice(0, 1200);
    return {
      title,
      kind,
      summary: `已提取 ${Math.min(trimmed.length, 1200)} 字的文本预览，可继续沉淀到知识库。`,
      extractedText: preview || '文件内容为空。',
      sourcePath: targetPath
    };
  }

  const extractedText = await extractTextFromFile(targetPath);
  if (!extractedText.startsWith('文件已保存：')) {
    const preview = extractedText.trim().slice(0, 1200);
    return {
      title,
      kind,
      summary: `已通过文档识别提取 ${Math.min(extractedText.trim().length, 1200)} 字预览，可继续沉淀到知识库。`,
      extractedText: preview || '文件内容为空。',
      sourcePath: targetPath
    };
  }

  return {
    title,
    kind,
    summary: '该文件类型已导入；配置 MinerU 后可自动识别 PDF、Word、PPT、Excel 等内容。',
    extractedText,
    sourcePath: targetPath
  };
}

async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  const now = new Date().toISOString();
  const id = `${slugify(input.name)}-${Date.now()}`;
  const root = projectDir(id);
  const meta: ProjectMeta = {
    id,
    mode: normalizeProjectMode(input.mode),
    modeConfig: normalizeModeConfig(input.modeConfig),
    name: input.name,
    courseName: input.courseName,
    root,
    examType: input.examType,
    textbook: input.textbook,
    notes: input.notes,
    requirements: input.requirements,
    provider: input.provider,
    model: input.model,
    knowledgeBasePath: projectKnowledgeBaseDir(id),
    linkedFolder: input.linkedFolder,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now
  };

  await mkdir(projectKnowledgeEntriesDir(id), { recursive: true });
  await mkdir(projectUploadsDir(id), { recursive: true });
  await ensureParentDir(projectQuestionsPath(id));
  await ensureParentDir(projectResourcesPath(id));
  await mkdir(projectGeneratedDir(id), { recursive: true });
  await ensureParentDir(projectChatPath(id));
  await mkdir(projectProfileDir(id), { recursive: true });
  await ensureParentDir(projectDeliveryPackagePath(id));
  await ensureParentDir(projectModeArtifactsPath(id));

  const configYaml = buildConfigYaml(input);
  const progressMarkdown = buildInitialProgress(input.courseName);

  await writeJson(projectMetaPath(id), meta);
  await writeFile(projectConfigPath(id), configYaml, 'utf8');
  await writeFile(projectProgressPath(id), progressMarkdown, 'utf8');
  await writeJson(projectKnowledgeIndexPath(id), []);
  await writeJson(projectQuestionsPath(id), materializeQuestionDrafts(input.initialQuestions ?? []));
  await writeJson(projectResourcesPath(id), []);
  await writeJson(projectGeneratedResourcesPath(id), []);
  await writeJson(projectProfilePath(id), defaultLearningProfile(now));
  await writeJson(projectProfileEventsPath(id), [
    {
      id: `created-${Date.now()}`,
      type: 'created',
      summary: '已为新项目创建学习画像。',
      createdAt: now
    }
  ] satisfies LearningProfileEvent[]);
  await writeJson(projectChatPath(id), [
    {
      role: 'assistant',
      content: `已进入 ${input.name}。你可以上传教材、图片、笔记，或直接用当前项目模型开始学习对话。`,
      createdAt: now,
      model: input.model
    }
  ] satisfies ChatTurn[]);

  const projects = await listProjects();
  await saveProjects([meta, ...projects.filter((project) => project.id !== id)]);

  const snapshotRoot = input.linkedFolder || root;

  return {
    meta,
    configYaml,
    progressMarkdown,
    uploads: [],
    knowledgeBase: [],
    questions: await readJson<ReviewQuestion[]>(projectQuestionsPath(id), []),
    resources: [],
    snapshot: await snapshotProject(snapshotRoot),
    chatHistory: await readJson<ChatTurn[]>(projectChatPath(id), []),
    learningProfile: await ensureLearningProfileState(id),
    personalizedResources: await listPersonalizedResources(id),
    learningPathPlan: await getLearningPathPlan(id),
    stageReports: await listStageReports(id),
    deliveryPackage: await getDeliveryPackage(id),
    modeArtifacts: await listModeArtifacts(id)
  };
}

async function openProject(projectId: string): Promise<ProjectDetail> {
  const loadedMeta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const meta = loadedMeta ? normalizeProjectMeta({
    ...loadedMeta,
    lastOpenedAt: new Date().toISOString()
  }) : null;
  if (!meta) {
    throw new Error(`Project not found: ${projectId}`);
  }
  await persistProjectMeta(meta);

  const configYaml = await readFile(projectConfigPath(projectId), 'utf8');
  const progressMarkdown = await readFile(projectProgressPath(projectId), 'utf8');
  const uploads = await readJson<ProjectSourceFile[]>(path.join(projectUploadsDir(projectId), 'index.json'), []);
  const knowledgeBase = await readJson<KnowledgeBaseEntry[]>(projectKnowledgeIndexPath(projectId), []);
  const questions = await readJson<ReviewQuestion[]>(projectQuestionsPath(projectId), []);
  const resources = await readJson<KnowledgeResource[]>(projectResourcesPath(projectId), []);
  const chatHistory = await readJson<ChatTurn[]>(projectChatPath(projectId), []);
  const learningProfile = await ensureLearningProfileState(projectId);
  const personalizedResources = await listPersonalizedResources(projectId);
  const learningPathPlan = await getLearningPathPlan(projectId);
  const stageReports = await listStageReports(projectId);
  const deliveryPackage = await getDeliveryPackage(projectId);
  const modeArtifacts = await listModeArtifacts(projectId);
  const snapshotRoot = meta.linkedFolder || meta.root;

  return {
    meta,
    configYaml,
    progressMarkdown,
    uploads,
    knowledgeBase,
    questions,
    resources,
    snapshot: await snapshotProject(snapshotRoot),
    chatHistory,
    learningProfile,
    personalizedResources,
    learningPathPlan,
    stageReports,
    deliveryPackage,
    modeArtifacts
  };
}

function inferListFromText(text: string, rules: Array<[RegExp, string]>, fallback: string[]) {
  const matches = rules
    .filter(([pattern]) => pattern.test(text))
    .map(([, label]) => label);
  return uniqueStrings(matches.length ? matches : fallback);
}

function buildFallbackProfileAnalysis(project: ProjectDetail, input: string, current: LearningProfile): LearningProfile {
  const text = [
    input,
    project.meta.requirements,
    project.meta.notes,
    project.questions.map((question) => `${question.stem} ${question.category} ${question.knowledgePoint} ${question.explanation}`).join('\n'),
    project.knowledgeBase.map((entry) => `${entry.title} ${entry.summary} ${entry.tags.join(' ')}`).join('\n')
  ].join('\n');
  const weakPointRules: Array<[RegExp, string]> = [
    [/算法|复杂度|递归|动态规划|图论|排序/i, '算法与复杂度'],
    [/数据库|SQL|范式|事务|索引/i, '数据库设计与查询'],
    [/网络|协议|TCP|HTTP|安全/i, '网络协议与安全'],
    [/需求|原型|业务|流程|用例/i, '需求分析与业务建模'],
    [/公式|计算|推导|证明|矩阵|积分/i, '公式推导与计算'],
    [/错题|易错|薄弱|不会|混淆|忘记/i, '错题复盘与概念辨析']
  ];
  const mistakeRules: Array<[RegExp, string]> = [
    [/审题|题干|关键词/i, '审题时容易漏掉限定条件'],
    [/粗心|计算错|符号|单位/i, '计算或符号细节不稳定'],
    [/概念|定义|混淆/i, '相近概念辨析不足'],
    [/步骤|流程|模板/i, '解题步骤缺少固定模板'],
    [/时间|来不及|拖延/i, '时间分配与执行节奏需要加强']
  ];
  const resourceRules: Array<[RegExp, string]> = [
    [/视频|讲解|演示/i, '短视频讲解'],
    [/例题|刷题|练习/i, '例题拆解'],
    [/笔记|总结|文档/i, '结构化笔记'],
    [/错题|复盘/i, '错题复盘']
  ];
  const attempted = project.questions.filter((question) => question.attempts > 0).length;
  const wrong = project.questions.filter((question) => question.wrong).length;
  const weakFromWrong = uniqueStrings(project.questions
    .filter((question) => question.wrong)
    .map((question) => question.knowledgePoint || question.category));
  const weakPoints = uniqueStrings([
    ...weakFromWrong,
    ...inferListFromText(text, weakPointRules, current.weakPoints.length ? current.weakPoints : ['待通过练习数据进一步定位'])
  ]).slice(0, 8);

  return normalizeLearningProfile({
    ...current,
    knowledgeLevel: wrong > 0 || /基础|薄弱|不会|从零/i.test(text)
      ? '基础薄弱'
      : attempted >= Math.max(3, Math.floor(project.questions.length * 0.5))
        ? '中等'
        : current.knowledgeLevel === '未评估' ? '中等' : current.knowledgeLevel,
    learningGoal: input.trim() || current.learningGoal,
    cognitiveStyle: /图|流程|结构|框架/i.test(text)
      ? '偏好结构图、流程拆解和分层讲解。'
      : /例题|刷题|实践/i.test(text)
        ? '偏好通过例题和实践任务建立理解。'
        : current.cognitiveStyle,
    weakPoints,
    mistakePatterns: inferListFromText(text, mistakeRules, current.mistakePatterns.length ? current.mistakePatterns : ['需要积累更多练习记录']),
    resourcePreferences: inferListFromText(text, resourceRules, current.resourcePreferences),
    availableTime: /每天|每周|小时|分钟|晚上|周末/i.test(text) ? summarizeContent(input, 32) : current.availableTime,
    motivation: /比赛|软考|期末|通过|拿奖|升学|项目/i.test(text) ? summarizeContent(input, 48) : current.motivation,
    notes: summarizeContent(text, 180),
    confidence: project.questions.length || input.trim() ? 'medium' : 'low',
    updatedAt: new Date().toISOString()
  });
}

function parseLearningProfileJson(content: string): Partial<LearningProfile> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? content;
  const objectMatch = source.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;

  try {
    return JSON.parse(objectMatch[0]) as Partial<LearningProfile>;
  } catch {
    return null;
  }
}

async function analyzeLearningProfile(projectId: string, input: string): Promise<LearningProfileState> {
  const project = await openProject(projectId);
  const currentState = project.learningProfile ?? await ensureLearningProfileState(projectId);
  const settings = await loadSettings();
  const activeProvider = getActiveProvider(settings);
  const projectProvider = settings.providers.find((candidate) => candidate.id === project.meta.provider)
    ?? settings.providers.find((candidate) => candidate.provider === project.meta.provider)
    ?? activeProvider;
  let nextProfile = buildFallbackProfileAnalysis(project, input, currentState.profile);

  if (projectProvider.apiKey && projectProvider.baseUrl) {
    try {
      const model = project.meta.model || projectProvider.selectedModelId;
      const prompt = [
        '请作为 ProfileAgent，根据项目资料生成学习画像 JSON。',
        '只返回 JSON，不要 Markdown。',
        '字段必须包含：knowledgeLevel, learningGoal, cognitiveStyle, weakPoints, mistakePatterns, resourcePreferences, availableTime, motivation, notes, confidence。',
        `当前画像：${JSON.stringify(currentState.profile)}`,
        `项目：${project.meta.name} / ${project.meta.courseName} / ${project.meta.examType}`,
        `用户补充：${input || '无'}`,
        `题目摘要：${project.questions.slice(0, 20).map((question) => `${question.knowledgePoint}:${question.stem}`).join('\n') || '暂无'}`,
        `知识库：${project.knowledgeBase.slice(0, 10).map((entry) => `${entry.title}:${entry.summary}`).join('\n') || '暂无'}`
      ].join('\n\n');
      const request = buildChatRequest({
        provider: projectProvider.provider,
        baseUrl: projectProvider.baseUrl,
        apiKey: projectProvider.apiKey,
        model,
        temperature: 0.1,
        maxTokens: Math.min(settings.maxTokens || 2048, 2048),
        systemPrompt: '你是学习画像分析智能体，输出严格 JSON。',
        userPrompt: prompt
      });
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body)
      });
      if (response.ok) {
        const payload = await response.json() as {
          content?: Array<{ type?: string; text?: string }>;
          choices?: Array<{ message?: { content?: string } }>;
        };
        const parsed = parseLearningProfileJson(parseChatResponse(projectProvider.provider, payload));
        if (parsed) {
          nextProfile = normalizeLearningProfile({
            ...nextProfile,
            ...parsed,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch {
      nextProfile = buildFallbackProfileAnalysis(project, input, currentState.profile);
    }
  }

  await writeJson(projectProfilePath(projectId), nextProfile);
  const events = await appendLearningProfileEvent(projectId, 'agent-analysis', 'ProfileAgent 已根据项目资料刷新学习画像。');
  return { profile: nextProfile, events };
}

async function formatLearningProfileForPrompt(projectId: string) {
  const state = await ensureLearningProfileState(projectId);
  const profile = state.profile;
  return [
    '学习画像：',
    `- 知识水平：${profile.knowledgeLevel}（置信度：${profile.confidence}）`,
    `- 学习目标：${profile.learningGoal || '未填写'}`,
    `- 认知风格：${profile.cognitiveStyle || '未评估'}`,
    `- 薄弱点：${profile.weakPoints.join('、') || '暂无'}`,
    `- 错题模式：${profile.mistakePatterns.join('、') || '暂无'}`,
    `- 资源偏好：${profile.resourcePreferences.join('、') || '暂无'}`,
    `- 可用时间：${profile.availableTime || '未填写'}`,
    `- 学习动机：${profile.motivation || '未填写'}`
  ].join('\n');
}

const personalizedResourceTypes: PersonalizedResourceType[] = ['handout', 'example', 'flashcard', 'remediation'];

function normalizePersonalizedResource(resource: Partial<PersonalizedResource>, fallbackTopic = '综合复习'): PersonalizedResource {
  const now = new Date().toISOString();
  const type = personalizedResourceTypes.includes(resource.type as PersonalizedResourceType)
    ? resource.type as PersonalizedResourceType
    : 'handout';
  const title = String(resource.title || `${fallbackTopic} 个性化资源`);
  const knowledgePoint = String(resource.knowledgePoint || fallbackTopic);
  const contentMarkdown = String(resource.contentMarkdown || `# ${title}\n\n暂无内容。`);

  return {
    id: String(resource.id || `${type}-${slugify(knowledgePoint)}-${Date.now()}`),
    type,
    title,
    knowledgePoint,
    profileSignal: String(resource.profileSignal || '基于当前学习画像生成'),
    contentMarkdown,
    source: resource.source === 'manual' ? 'manual' : 'agent',
    createdAt: typeof resource.createdAt === 'string' && resource.createdAt ? resource.createdAt : now,
    updatedAt: typeof resource.updatedAt === 'string' && resource.updatedAt ? resource.updatedAt : now
  };
}

async function listPersonalizedResources(projectId: string) {
  const resources = await readJson<Partial<PersonalizedResource>[]>(projectGeneratedResourcesPath(projectId), []);
  return resources.map((resource) => normalizePersonalizedResource(resource));
}

async function writePersonalizedResources(projectId: string, resources: PersonalizedResource[]) {
  const normalized = resources.map((resource) => normalizePersonalizedResource(resource));
  await writeJson(projectGeneratedResourcesPath(projectId), normalized);
  return normalized;
}

function pickResourceTopic(project: ProjectDetail, profile: LearningProfile, input: GeneratePersonalizedResourcesInput) {
  const topic = input.topic.trim();
  if (topic) return topic;
  if (profile.weakPoints.length) return profile.weakPoints[0];
  const questionPoint = project.questions.find((question) => question.knowledgePoint)?.knowledgePoint;
  if (questionPoint) return questionPoint;
  const knowledgeTag = project.knowledgeBase.flatMap((entry) => entry.tags)[0];
  return knowledgeTag || project.meta.courseName || '综合复习';
}

function buildResourceMarkdown(type: PersonalizedResourceType, topic: string, profile: LearningProfile, project: ProjectDetail) {
  const weakPoints = profile.weakPoints.join('、') || '待定位';
  const preference = profile.resourcePreferences.join('、') || '结构化讲解';
  const relatedQuestions = project.questions
    .filter((question) => `${question.knowledgePoint} ${question.category} ${question.stem}`.includes(topic))
    .slice(0, 3);

  if (type === 'handout') {
    return [
      `# ${topic} 个性化讲义`,
      '',
      `## 学习画像依据`,
      `- 知识水平：${profile.knowledgeLevel}`,
      `- 薄弱点：${weakPoints}`,
      `- 偏好资源：${preference}`,
      '',
      '## 核心概念',
      `用三句话把 ${topic} 拆清楚：定义、适用场景、常见陷阱。`,
      '',
      '## 学习顺序',
      '1. 先读概念边界。',
      '2. 再看一个完整例题。',
      '3. 最后用错题清单检查遗漏。'
    ].join('\n');
  }

  if (type === 'example') {
    return [
      `# ${topic} 例题拆解`,
      '',
      '## 题目原型',
      relatedQuestions[0]?.stem || `围绕 ${topic} 设计一道基础到中等难度的综合题。`,
      '',
      '## 解题步骤',
      '1. 标出关键词和限制条件。',
      '2. 写出涉及的公式、定义或流程。',
      '3. 排除最容易混淆的选项或路径。',
      '',
      '## 复盘提示',
      `重点关注：${profile.mistakePatterns.join('、') || '审题、概念辨析、步骤完整性'}。`
    ].join('\n');
  }

  if (type === 'flashcard') {
    return [
      `# ${topic} 速记卡`,
      '',
      `- Q：${topic} 的一句话定义是什么？`,
      `  A：先用自己的话说清对象、条件和结果。`,
      `- Q：${topic} 最容易错在哪里？`,
      `  A：${profile.mistakePatterns[0] || '忽略题干限制或混淆相近概念。'}`,
      `- Q：考前 30 秒怎么检查？`,
      `  A：看关键词、看单位/条件、看最终问题问的是什么。`
    ].join('\n');
  }

  return [
    `# ${topic} 补漏清单`,
    '',
    '## 今天必须补上的 4 件事',
    `- [ ] 复述 ${topic} 的定义和边界。`,
    '- [ ] 找一道已错题，写出错因。',
    '- [ ] 做一道同类题，只看步骤不看答案。',
    '- [ ] 把错题模式写入学习画像或进度页。',
    '',
    `## 针对画像`,
    `当前薄弱点：${weakPoints}`
  ].join('\n');
}

function buildFallbackPersonalizedResources(
  project: ProjectDetail,
  profile: LearningProfile,
  input: GeneratePersonalizedResourcesInput
): PersonalizedResource[] {
  const now = new Date().toISOString();
  const topic = pickResourceTopic(project, profile, input);
  const types = input.type === 'all' ? personalizedResourceTypes : [input.type];

  return types.map((type) => normalizePersonalizedResource({
    id: `${type}-${slugify(topic)}-${Date.now()}`,
    type,
    title: type === 'handout'
      ? `${topic} 个性化讲义`
      : type === 'example'
        ? `${topic} 例题拆解`
        : type === 'flashcard'
          ? `${topic} 速记卡`
          : `${topic} 补漏清单`,
    knowledgePoint: topic,
    profileSignal: `${profile.knowledgeLevel} · ${profile.weakPoints.slice(0, 2).join('、') || '综合画像'}`,
    contentMarkdown: buildResourceMarkdown(type, topic, profile, project),
    source: 'agent',
    createdAt: now,
    updatedAt: now
  }, topic));
}

function parsePersonalizedResourcesJson(content: string): Partial<PersonalizedResource>[] {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? content;
  const arrayMatch = source.match(/\[[\s\S]*\]/);
  const objectMatch = source.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(arrayMatch?.[0] ?? objectMatch?.[0] ?? '[]');
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function generatePersonalizedResources(projectId: string, input: GeneratePersonalizedResourcesInput) {
  const project = await openProject(projectId);
  const profileState = await ensureLearningProfileState(projectId);
  const normalizedInput: GeneratePersonalizedResourcesInput = {
    topic: String(input?.topic || ''),
    type: input?.type === 'all' || personalizedResourceTypes.includes(input?.type as PersonalizedResourceType)
      ? input.type
      : 'all'
  };
  let generated = buildFallbackPersonalizedResources(project, profileState.profile, normalizedInput);
  const settings = await loadSettings();
  const activeProvider = getActiveProvider(settings);
  const provider = settings.providers.find((candidate) => candidate.id === project.meta.provider)
    ?? settings.providers.find((candidate) => candidate.provider === project.meta.provider)
    ?? activeProvider;

  if (provider.apiKey && provider.baseUrl) {
    try {
      const prompt = [
        '请作为 ResourceAgent 生成个性化学习资源，只返回 JSON 数组。',
        '每个对象字段：type,title,knowledgePoint,profileSignal,contentMarkdown。',
        `资源类型：${normalizedInput.type}`,
        `主题：${normalizedInput.topic || '自动选择'}`,
        `学习画像：${JSON.stringify(profileState.profile)}`,
        `项目：${project.meta.name} / ${project.meta.courseName}`,
        `题目：${project.questions.slice(0, 12).map((question) => `${question.knowledgePoint}:${question.stem}`).join('\n') || '暂无'}`
      ].join('\n\n');
      const request = buildChatRequest({
        provider: provider.provider,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: project.meta.model || provider.selectedModelId,
        temperature: 0.2,
        maxTokens: Math.min(settings.maxTokens || 3072, 3072),
        systemPrompt: '你是 ResourceAgent，输出严格 JSON 数组，不要 Markdown 围栏以外的解释。',
        userPrompt: prompt
      });
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body)
      });
      if (response.ok) {
        const payload = await response.json() as {
          content?: Array<{ type?: string; text?: string }>;
          choices?: Array<{ message?: { content?: string } }>;
        };
        const parsed = parsePersonalizedResourcesJson(parseChatResponse(provider.provider, payload));
        if (parsed.length) {
          const topic = pickResourceTopic(project, profileState.profile, normalizedInput);
          generated = parsed.map((resource) => normalizePersonalizedResource(resource, topic));
        }
      }
    } catch {
      generated = buildFallbackPersonalizedResources(project, profileState.profile, normalizedInput);
    }
  }

  const current = await listPersonalizedResources(projectId);
  return writePersonalizedResources(projectId, [...generated, ...current]);
}

async function savePersonalizedResource(projectId: string, resource: PersonalizedResource) {
  const current = await listPersonalizedResources(projectId);
  const normalized = normalizePersonalizedResource({
    ...resource,
    updatedAt: new Date().toISOString()
  }, resource.knowledgePoint);
  const next = current.some((item) => item.id === normalized.id)
    ? current.map((item) => item.id === normalized.id ? normalized : item)
    : [normalized, ...current];
  return writePersonalizedResources(projectId, next);
}

async function deletePersonalizedResource(projectId: string, resourceId: string) {
  const current = await listPersonalizedResources(projectId);
  return writePersonalizedResources(projectId, current.filter((resource) => resource.id !== resourceId));
}

const learningPathTaskStatuses: LearningPathTaskStatus[] = ['todo', 'doing', 'done'];

function normalizeLearningPathTask(task: Partial<LearningPathTask>, index = 0): LearningPathTask {
  const title = String(task.title || `学习任务 ${index + 1}`);
  const status = learningPathTaskStatuses.includes(task.status as LearningPathTaskStatus)
    ? task.status as LearningPathTaskStatus
    : 'todo';

  return {
    id: String(task.id || `task-${slugify(title)}-${index}`),
    title,
    detail: String(task.detail || '按计划完成一次学习、练习和复盘。'),
    status,
    resourceIds: Array.isArray(task.resourceIds)
      ? uniqueStrings(task.resourceIds.map((item) => String(item)))
      : []
  };
}

function normalizeLearningPathStage(stage: Partial<LearningPathStage>, index = 0): LearningPathStage {
  const title = String(stage.title || `阶段 ${index + 1}`);
  const tasks = Array.isArray(stage.tasks) && stage.tasks.length
    ? stage.tasks.map((task, taskIndex) => normalizeLearningPathTask(task, taskIndex))
    : [
        normalizeLearningPathTask({ title: `${title}：学习核心概念` }, 0),
        normalizeLearningPathTask({ title: `${title}：完成对应练习` }, 1),
        normalizeLearningPathTask({ title: `${title}：记录错因与补漏` }, 2)
      ];

  return {
    id: String(stage.id || `stage-${slugify(title)}-${index}`),
    title,
    objective: String(stage.objective || '建立清晰理解并完成一轮练习复盘。'),
    duration: String(stage.duration || '2-3 天'),
    tasks
  };
}

function normalizeLearningPathPlan(plan: Partial<LearningPathPlan> | null | undefined): LearningPathPlan {
  const now = new Date().toISOString();
  const dailyMinutes = Number(plan?.dailyMinutes);
  const stages = Array.isArray(plan?.stages) && plan.stages.length
    ? plan.stages.map((stage, index) => normalizeLearningPathStage(stage, index))
    : [
        normalizeLearningPathStage({ title: '拆解与建模' }, 0),
        normalizeLearningPathStage({ title: '讲义与例题' }, 1),
        normalizeLearningPathStage({ title: '检题与补漏' }, 2)
      ];

  return {
    version: 1,
    goal: String(plan?.goal || '围绕当前项目完成一轮可执行学习闭环。'),
    targetDate: String(plan?.targetDate || '未设定'),
    dailyMinutes: Number.isFinite(dailyMinutes) && dailyMinutes > 0 ? Math.round(dailyMinutes) : 60,
    focus: String(plan?.focus || '薄弱知识点、错题模式与资料沉淀'),
    stages,
    reviewCadence: Array.isArray(plan?.reviewCadence) && plan.reviewCadence.length
      ? uniqueStrings(plan.reviewCadence.map((item) => String(item)))
      : ['每日结束前 5 分钟记录进度', '每完成一个阶段后更新学习画像', '每 3 天回看错题与补漏清单'],
    risks: Array.isArray(plan?.risks) && plan.risks.length
      ? uniqueStrings(plan.risks.map((item) => String(item)))
      : ['如果题目识别或资料沉淀不足，路径会偏泛化。', '如果每日可用时间低于 30 分钟，需要减少阶段目标。'],
    source: plan?.source === 'manual' ? 'manual' : 'agent',
    createdAt: typeof plan?.createdAt === 'string' && plan.createdAt ? plan.createdAt : now,
    updatedAt: typeof plan?.updatedAt === 'string' && plan.updatedAt ? plan.updatedAt : now
  };
}

async function getLearningPathPlan(projectId: string): Promise<LearningPathPlan | null> {
  const raw = await readJson<Partial<LearningPathPlan> | null>(projectLearningPathPlanPath(projectId), null);
  return raw ? normalizeLearningPathPlan(raw) : null;
}

async function writeLearningPathPlan(projectId: string, plan: LearningPathPlan) {
  const normalized = normalizeLearningPathPlan(plan);
  await writeJson(projectLearningPathPlanPath(projectId), normalized);
  return normalized;
}

function pickLearningPathFocus(project: ProjectDetail, profile: LearningProfile, input: GenerateLearningPathInput) {
  const requested = String(input?.focus || '').trim();
  if (requested) return requested;
  if (profile.weakPoints.length) return profile.weakPoints.slice(0, 3).join('、');
  const questionPoints = uniqueStrings(project.questions.map((question) => question.knowledgePoint)).slice(0, 3);
  if (questionPoints.length) return questionPoints.join('、');
  return project.meta.courseName || project.meta.name || '综合学习';
}

function buildFallbackLearningPathPlan(
  project: ProjectDetail,
  profile: LearningProfile,
  resources: PersonalizedResource[],
  input: GenerateLearningPathInput
): LearningPathPlan {
  const now = new Date().toISOString();
  const focus = pickLearningPathFocus(project, profile, input);
  const dailyMinutes = Number.isFinite(Number(input?.dailyMinutes)) && Number(input?.dailyMinutes) > 0
    ? Math.round(Number(input.dailyMinutes))
    : 60;
  const targetDate = String(input?.targetDate || '未设定');
  const weakPoints = profile.weakPoints.length ? profile.weakPoints : uniqueStrings(project.questions.map((question) => question.knowledgePoint)).slice(0, 3);
  const resourceIds = resources.slice(0, 6).map((resource) => resource.id);
  const baseTopics = weakPoints.length ? weakPoints : [focus, '错题复盘', '项目资料整理'];

  const stages: LearningPathStage[] = [
    normalizeLearningPathStage({
      id: 'stage-diagnosis',
      title: '阶段一：拆解目标与薄弱点',
      objective: `围绕 ${focus} 明确考试/项目要求、资料范围和主要缺口。`,
      duration: dailyMinutes >= 90 ? '1-2 天' : '2-3 天',
      tasks: [
        { id: 'task-read-context', title: '整理项目要求', detail: `阅读课程配置、补充要求和已有资料，输出 ${focus} 的任务边界。`, status: 'todo', resourceIds: [] },
        { id: 'task-profile-check', title: '校准学习画像', detail: `检查薄弱点：${baseTopics.slice(0, 3).join('、')}，必要时刷新画像。`, status: 'todo', resourceIds: [] },
        { id: 'task-question-map', title: '题目映射知识点', detail: `从 ${project.questions.length} 道题中找出高频知识点和错题模式。`, status: 'todo', resourceIds: [] }
      ]
    }, 0),
    normalizeLearningPathStage({
      id: 'stage-learn-practice',
      title: '阶段二：讲义学习与例题训练',
      objective: '用个性化资源完成一轮讲义理解、例题拆解和速记卡复述。',
      duration: dailyMinutes >= 90 ? '2-3 天' : '4-5 天',
      tasks: [
        { id: 'task-handout', title: '阅读个性化讲义', detail: `优先学习 ${baseTopics[0] || focus}，边读边写 3 条自己的解释。`, status: 'todo', resourceIds: resourceIds.slice(0, 2) },
        { id: 'task-example', title: '完成例题拆解', detail: '至少完成 2 道同类题，记录每一步的依据。', status: 'todo', resourceIds: resourceIds.slice(2, 4) },
        { id: 'task-flashcard', title: '速记卡自测', detail: '用 5 分钟闭卷复述关键词、陷阱和检查点。', status: 'todo', resourceIds: resourceIds.slice(4, 6) }
      ]
    }, 1),
    normalizeLearningPathStage({
      id: 'stage-review-deliver',
      title: '阶段三：检题补漏与交付沉淀',
      objective: '把错题、补漏清单和知识库内容沉淀成可复用成果。',
      duration: dailyMinutes >= 90 ? '1-2 天' : '2-4 天',
      tasks: [
        { id: 'task-wrong-review', title: '错题复盘', detail: '筛选错题与收藏题，逐题写明“错因—正确路径—下次检查点”。', status: 'todo', resourceIds: [] },
        { id: 'task-remediation', title: '补漏清单', detail: `针对 ${baseTopics.slice(0, 2).join('、') || focus} 完成补漏资源中的待办。`, status: 'todo', resourceIds: resourceIds },
        { id: 'task-progress', title: '更新进度页', detail: '把本轮完成情况写入项目进度，为阶段报告做准备。', status: 'todo', resourceIds: [] }
      ]
    }, 2)
  ];

  return normalizeLearningPathPlan({
    goal: profile.learningGoal || `完成 ${project.meta.name} 的阶段性学习闭环。`,
    targetDate,
    dailyMinutes,
    focus,
    stages,
    reviewCadence: [
      `每天固定 ${dailyMinutes} 分钟：前 70% 学习/练习，后 30% 复盘。`,
      '每完成一个阶段后更新学习画像和进度页。',
      '每 3 天回看错题、补漏清单和速记卡。'
    ],
    risks: [
      project.questions.length ? '题库中错因标记不足时，建议先完成一轮刷题。' : '当前题库为空，路径会更依赖资料和画像，建议先导入题目。',
      resources.length ? '资源已生成，但需要手动确认是否贴合实际考试范围。' : '尚未生成个性化资源，建议先在“资源”页生成讲义和补漏清单。',
      profile.confidence === 'low' ? '学习画像置信度较低，建议先补充自我描述并重新分析。' : '如果每日学习时间变化较大，需要重新生成路径。'
    ],
    source: 'agent',
    createdAt: now,
    updatedAt: now
  });
}

function parseLearningPathPlanJson(content: string): Partial<LearningPathPlan> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? content;
  const objectMatch = source.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(objectMatch?.[0] ?? source);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function generateLearningPathPlan(projectId: string, input: GenerateLearningPathInput) {
  const project = await openProject(projectId);
  const profileState = await ensureLearningProfileState(projectId);
  const resources = await listPersonalizedResources(projectId);
  const normalizedInput: GenerateLearningPathInput = {
    targetDate: String(input?.targetDate || ''),
    dailyMinutes: Number.isFinite(Number(input?.dailyMinutes)) ? Number(input.dailyMinutes) : 60,
    focus: String(input?.focus || '')
  };
  let plan = buildFallbackLearningPathPlan(project, profileState.profile, resources, normalizedInput);
  const settings = await loadSettings();
  const activeProvider = getActiveProvider(settings);
  const provider = settings.providers.find((candidate) => candidate.id === project.meta.provider)
    ?? settings.providers.find((candidate) => candidate.provider === project.meta.provider)
    ?? activeProvider;

  if (provider.apiKey && provider.baseUrl) {
    try {
      const prompt = [
        '请作为 PathAgent 生成项目学习路径，只返回严格 JSON 对象。',
        '对象字段：goal,targetDate,dailyMinutes,focus,stages,reviewCadence,risks。',
        '每个 stage 字段：title,objective,duration,tasks；每个 task 字段：title,detail,status,resourceIds。',
        `输入：${JSON.stringify(normalizedInput)}`,
        `学习画像：${JSON.stringify(profileState.profile)}`,
        `个性化资源：${resources.slice(0, 12).map((resource) => `${resource.id}:${resource.title}:${resource.knowledgePoint}`).join('\n') || '暂无'}`,
        `题目：${project.questions.slice(0, 20).map((question) => `${question.knowledgePoint}:${question.stem}`).join('\n') || '暂无'}`,
        `项目：${project.meta.name} / ${project.meta.courseName}`
      ].join('\n\n');
      const request = buildChatRequest({
        provider: provider.provider,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: project.meta.model || provider.selectedModelId,
        temperature: 0.2,
        maxTokens: Math.min(settings.maxTokens || 4096, 4096),
        systemPrompt: '你是 PathAgent，输出严格 JSON 对象，不要解释。',
        userPrompt: prompt
      });
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body)
      });
      if (response.ok) {
        const payload = await response.json() as {
          content?: Array<{ type?: string; text?: string }>;
          choices?: Array<{ message?: { content?: string } }>;
        };
        const parsed = parseLearningPathPlanJson(parseChatResponse(provider.provider, payload));
        if (parsed) {
          plan = normalizeLearningPathPlan({
            ...parsed,
            source: 'agent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch {
      plan = buildFallbackLearningPathPlan(project, profileState.profile, resources, normalizedInput);
    }
  }

  return writeLearningPathPlan(projectId, plan);
}

async function saveLearningPathPlan(projectId: string, plan: LearningPathPlan) {
  const existing = await getLearningPathPlan(projectId);
  return writeLearningPathPlan(projectId, normalizeLearningPathPlan({
    ...plan,
    source: 'manual',
    createdAt: existing?.createdAt || plan.createdAt,
    updatedAt: new Date().toISOString()
  }));
}

function normalizeStageReportSection(section: Partial<StageReportSection>, index = 0): StageReportSection {
  return {
    title: String(section.title || `报告章节 ${index + 1}`),
    contentMarkdown: String(section.contentMarkdown || '暂无内容。')
  };
}

function normalizeStageReport(report: Partial<StageReport>): StageReport {
  const now = new Date().toISOString();
  const title = String(report.title || '阶段学习报告');
  return {
    id: String(report.id || `report-${Date.now()}`),
    title,
    summary: String(report.summary || '系统已根据当前项目资料生成阶段摘要。'),
    sections: Array.isArray(report.sections) && report.sections.length
      ? report.sections.map((section, index) => normalizeStageReportSection(section, index))
      : [
          normalizeStageReportSection({ title: '画像变化', contentMarkdown: '暂无画像变化。' }, 0),
          normalizeStageReportSection({ title: '练习表现', contentMarkdown: '暂无练习数据。' }, 1),
          normalizeStageReportSection({ title: '知识沉淀', contentMarkdown: '暂无知识库沉淀。' }, 2)
        ],
    nextActions: Array.isArray(report.nextActions) && report.nextActions.length
      ? uniqueStrings(report.nextActions.map((item) => String(item)))
      : ['继续补充题目与资料', '完成一次错题复盘', '更新学习路径任务状态'],
    risks: Array.isArray(report.risks) && report.risks.length
      ? uniqueStrings(report.risks.map((item) => String(item)))
      : ['当前数据量不足时，报告会偏概括。'],
    source: report.source === 'manual' ? 'manual' : 'agent',
    createdAt: typeof report.createdAt === 'string' && report.createdAt ? report.createdAt : now,
    updatedAt: typeof report.updatedAt === 'string' && report.updatedAt ? report.updatedAt : now
  };
}

async function listStageReports(projectId: string) {
  const reports = await readJson<Partial<StageReport>[]>(projectStageReportsPath(projectId), []);
  return Array.isArray(reports) ? reports.map((report) => normalizeStageReport(report)) : [];
}

async function writeStageReports(projectId: string, reports: StageReport[]) {
  const normalized = reports.map((report) => normalizeStageReport(report));
  await writeJson(projectStageReportsPath(projectId), normalized);
  return normalized;
}

function summarizePractice(project: ProjectDetail) {
  const total = project.questions.length;
  const wrong = project.questions.filter((question) => question.wrong).length;
  const favorite = project.questions.filter((question) => question.favorite).length;
  const attempted = project.questions.filter((question) => question.attempts > 0).length;
  return { total, wrong, favorite, attempted };
}

function buildFallbackStageReport(
  project: ProjectDetail,
  profile: LearningProfile,
  pathPlan: LearningPathPlan | null,
  resources: PersonalizedResource[]
): StageReport {
  const now = new Date().toISOString();
  const practice = summarizePractice(project);
  const doneTasks = pathPlan?.stages.flatMap((stage) => stage.tasks).filter((task) => task.status === 'done').length ?? 0;
  const allTasks = pathPlan?.stages.flatMap((stage) => stage.tasks).length ?? 0;
  const pathProgress = allTasks ? `${doneTasks}/${allTasks}` : '未生成路径';
  const weakPoints = profile.weakPoints.join('、') || '暂未定位';

  return normalizeStageReport({
    id: `report-${Date.now()}`,
    title: `${project.meta.name} 阶段报告`,
    summary: `当前项目已有 ${practice.total} 道题、${project.knowledgeBase.length} 条知识库记录、${resources.length} 条个性化资源；路径进度 ${pathProgress}。`,
    sections: [
      {
        title: '画像变化',
        contentMarkdown: [
          `- 知识水平：${profile.knowledgeLevel}`,
          `- 薄弱点：${weakPoints}`,
          `- 学习目标：${profile.learningGoal || '未填写'}`,
          `- 资源偏好：${profile.resourcePreferences.join('、') || '暂无'}`
        ].join('\n')
      },
      {
        title: '练习表现',
        contentMarkdown: [
          `- 题目总数：${practice.total}`,
          `- 已尝试：${practice.attempted}`,
          `- 标记错题：${practice.wrong}`,
          `- 收藏重点：${practice.favorite}`,
          practice.total ? '- 建议：优先复盘错题和收藏题。' : '- 建议：先导入或识别题目，报告会更准确。'
        ].join('\n')
      },
      {
        title: '知识沉淀',
        contentMarkdown: [
          `- 知识库条目：${project.knowledgeBase.length}`,
          `- 个性化资源：${resources.length}`,
          `- 学习路径进度：${pathProgress}`,
          resources.length ? '- 建议：将已确认有效的资源沉淀到知识库。' : '- 建议：先在资源页生成讲义、例题和补漏清单。'
        ].join('\n')
      }
    ],
    nextActions: [
      pathPlan ? '继续推进学习路径中未完成任务。' : '先生成学习路径，建立阶段计划。',
      resources.length ? '把高价值个性化资源整理进知识库。' : '生成至少一组个性化资源。',
      practice.wrong ? '集中复盘标记错题并写明错因。' : '完成一次练习并标记错题/收藏题。'
    ],
    risks: [
      profile.confidence === 'low' ? '画像置信度较低，建议补充自我描述后重新分析。' : '画像如果长期不更新，报告建议会逐渐失真。',
      practice.total < 5 ? '题量较少，练习表现判断不足。' : '题目已有基础，但需要持续记录 attempts/wrong 状态。',
      project.knowledgeBase.length < 3 ? '知识库沉淀较少，交付包内容会偏薄。' : '知识库已有内容，需要定期清理重复和低质量条目。'
    ],
    source: 'agent',
    createdAt: now,
    updatedAt: now
  });
}

function parseStageReportJson(content: string): Partial<StageReport> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] ?? content;
  const objectMatch = source.match(/\{[\s\S]*\}/);

  try {
    const parsed = JSON.parse(objectMatch?.[0] ?? source);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function generateStageReport(projectId: string) {
  const project = await openProject(projectId);
  const profileState = await ensureLearningProfileState(projectId);
  const pathPlan = await getLearningPathPlan(projectId);
  const resources = await listPersonalizedResources(projectId);
  let report = buildFallbackStageReport(project, profileState.profile, pathPlan, resources);
  const settings = await loadSettings();
  const activeProvider = getActiveProvider(settings);
  const provider = settings.providers.find((candidate) => candidate.id === project.meta.provider)
    ?? settings.providers.find((candidate) => candidate.provider === project.meta.provider)
    ?? activeProvider;

  if (provider.apiKey && provider.baseUrl) {
    try {
      const prompt = [
        '请作为 ReportAgent 生成阶段学习报告，只返回严格 JSON 对象。',
        '对象字段：title,summary,sections,nextActions,risks。',
        `项目：${project.meta.name} / ${project.meta.courseName}`,
        `学习画像：${JSON.stringify(profileState.profile)}`,
        `学习路径：${JSON.stringify(pathPlan)}`,
        `题目统计：${JSON.stringify(summarizePractice(project))}`,
        `知识库数量：${project.knowledgeBase.length}`,
        `资源：${resources.map((resource) => `${resource.title}:${resource.knowledgePoint}`).join('\n') || '暂无'}`,
        `进度：${project.progressMarkdown.slice(0, 1200)}`
      ].join('\n\n');
      const request = buildChatRequest({
        provider: provider.provider,
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
        model: project.meta.model || provider.selectedModelId,
        temperature: 0.2,
        maxTokens: Math.min(settings.maxTokens || 4096, 4096),
        systemPrompt: '你是 ReportAgent，输出严格 JSON 对象，不要解释。',
        userPrompt: prompt
      });
      const response = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify(request.body)
      });
      if (response.ok) {
        const payload = await response.json() as {
          content?: Array<{ type?: string; text?: string }>;
          choices?: Array<{ message?: { content?: string } }>;
        };
        const parsed = parseStageReportJson(parseChatResponse(provider.provider, payload));
        if (parsed) {
          report = normalizeStageReport({
            ...parsed,
            source: 'agent',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch {
      report = buildFallbackStageReport(project, profileState.profile, pathPlan, resources);
    }
  }

  const current = await listStageReports(projectId);
  return writeStageReports(projectId, [report, ...current]);
}

async function saveStageReport(projectId: string, report: StageReport) {
  const current = await listStageReports(projectId);
  const normalized = normalizeStageReport({
    ...report,
    source: 'manual',
    updatedAt: new Date().toISOString()
  });
  const next = current.some((item) => item.id === normalized.id)
    ? current.map((item) => item.id === normalized.id ? normalized : item)
    : [normalized, ...current];
  return writeStageReports(projectId, next);
}

function normalizeModeArtifact(artifact: Partial<ModeArtifact>, index = 0, fallbackMode: ProjectMode = 'exam-review'): ModeArtifact {
  const now = new Date().toISOString();
  const tabId = normalizeWorkspaceTabId(artifact.tabId);
  const mode = normalizeProjectMode(artifact.mode || fallbackMode);
  const title = String(artifact.title || `${artifact.kind || '模式成果'} ${index + 1}`);

  return {
    id: String(artifact.id || `mode-artifact-${Date.now()}-${index}`),
    mode,
    tabId,
    title,
    kind: String(artifact.kind || tabId),
    contentMarkdown: String(artifact.contentMarkdown || ''),
    source: artifact.source === 'agent' || artifact.source === 'manual' ? artifact.source : 'fallback',
    createdAt: typeof artifact.createdAt === 'string' && artifact.createdAt ? artifact.createdAt : now,
    updatedAt: typeof artifact.updatedAt === 'string' && artifact.updatedAt ? artifact.updatedAt : now
  };
}

async function listModeArtifacts(projectId: string) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const mode = normalizeProjectMode(meta?.mode);
  const raw = await readJson<Partial<ModeArtifact>[]>(projectModeArtifactsPath(projectId), []);
  return Array.isArray(raw) ? raw.map((artifact, index) => normalizeModeArtifact(artifact, index, mode)) : [];
}

async function writeModeArtifacts(projectId: string, artifacts: ModeArtifact[]) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const mode = normalizeProjectMode(meta?.mode);
  const normalized = artifacts.map((artifact, index) => normalizeModeArtifact(artifact, index, mode));
  await writeJson(projectModeArtifactsPath(projectId), normalized);
  return normalized;
}

function buildFallbackModeArtifact(project: ProjectDetail, input: GenerateModeArtifactInput): ModeArtifact {
  const now = new Date().toISOString();
  const tabId = normalizeWorkspaceTabId(input.tabId);
  const kind = input.artifactKind?.trim() || '模式成果';
  const prompt = input.prompt?.trim() || '请根据当前项目目标生成一份可编辑、可复核、可交付的结构化成果。';
  const modeLabel: Record<ProjectMode, string> = {
    'exam-review': '期末复习',
    'paper-assistant': '论文助手',
    'research-analysis': '科研数据分析',
    'teaching-design': '教学设计',
    'assignment-quiz': '作业测验',
    'research-innovation': '科研创新',
    'lab-simulation': '实验模拟',
    'virtual-teacher': '虚拟教师',
    'student-development': '学生发展',
    'interactive-courseware': '互动课件',
    'teaching-game': '教学游戏',
    'knowledge-graph': '知识图谱',
    'mistake-collection': '错题集'
  };

  return {
    id: `mode-artifact-${Date.now()}`,
    mode: normalizeProjectMode(project.meta.mode),
    tabId,
    title: `${kind}草稿`,
    kind,
    contentMarkdown: [
      `# ${project.meta.name} - ${kind}`,
      '',
      `- 项目类型：${modeLabel[normalizeProjectMode(project.meta.mode)]}`,
      `- 课程 / 方向：${project.meta.courseName || '未填写'}`,
      `- 当前模块：${tabId}`,
      `- 生成要求：${prompt}`,
      '',
      '## 一、目标',
      `围绕“${project.meta.name}”形成一份可继续编辑的 ${kind}。`,
      '',
      '## 二、核心内容',
      '1. 明确本模块要解决的问题。',
      '2. 拆解关键步骤、依据和产出形式。',
      '3. 保留可复核的清单，便于后续导出交付。',
      '',
      '## 三、复核清单',
      '- [ ] 内容与项目目标一致',
      '- [ ] 结构清晰，可直接继续编辑',
      '- [ ] 关键结论有依据或后续补证路径',
      '- [ ] 交付前已人工复核'
    ].join('\n'),
    source: 'fallback',
    createdAt: now,
    updatedAt: now
  };
}

async function generateModeArtifact(projectId: string, input: GenerateModeArtifactInput) {
  const project = await openProject(projectId);
  const artifact = buildFallbackModeArtifact(project, input);
  const current = await listModeArtifacts(projectId);
  return writeModeArtifacts(projectId, [artifact, ...current]);
}

async function saveModeArtifact(projectId: string, artifact: ModeArtifact) {
  const current = await listModeArtifacts(projectId);
  const normalized = normalizeModeArtifact({
    ...artifact,
    source: 'manual',
    updatedAt: new Date().toISOString()
  }, 0, normalizeProjectMode(artifact.mode));
  const next = current.some((item) => item.id === normalized.id)
    ? current.map((item) => item.id === normalized.id ? normalized : item)
    : [normalized, ...current];
  return writeModeArtifacts(projectId, next);
}

async function deleteModeArtifact(projectId: string, artifactId: string) {
  const current = await listModeArtifacts(projectId);
  return writeModeArtifacts(projectId, current.filter((artifact) => artifact.id !== artifactId));
}

const deliveryPackageItemTypes: DeliveryPackageItemType[] = [
  'resources',
  'reports',
  'question-bank',
  'knowledge-base',
  'learning-path',
  'archive'
];

const deliveryPackageItemStatuses: DeliveryPackageItemStatus[] = ['ready', 'needs-review', 'missing'];

function normalizeDeliveryPackageItem(item: Partial<DeliveryPackageItem>, index = 0): DeliveryPackageItem {
  const type = deliveryPackageItemTypes.includes(item.type as DeliveryPackageItemType)
    ? item.type as DeliveryPackageItemType
    : deliveryPackageItemTypes[index] ?? 'archive';
  const status = deliveryPackageItemStatuses.includes(item.status as DeliveryPackageItemStatus)
    ? item.status as DeliveryPackageItemStatus
    : 'needs-review';
  const title = String(item.title || `交付项 ${index + 1}`);

  return {
    id: String(item.id || `${type}-${index}`),
    type,
    title,
    description: String(item.description || '等待补充交付说明。'),
    status,
    sourceIds: Array.isArray(item.sourceIds)
      ? uniqueStrings(item.sourceIds.map((sourceId) => String(sourceId)))
      : [],
    checklist: Array.isArray(item.checklist) && item.checklist.length
      ? uniqueStrings(item.checklist.map((entry) => String(entry)))
      : ['确认内容完整', '确认可复用', '确认导出前已复核']
  };
}

function normalizeDeliveryPackage(deliveryPackage: Partial<DeliveryPackage> | null | undefined): DeliveryPackage {
  const now = new Date().toISOString();
  const items = Array.isArray(deliveryPackage?.items) && deliveryPackage.items.length
    ? deliveryPackage.items.map((item, index) => normalizeDeliveryPackageItem(item, index))
    : [
        normalizeDeliveryPackageItem({ type: 'resources', title: '资料包', status: 'missing' }, 0),
        normalizeDeliveryPackageItem({ type: 'reports', title: '报告包', status: 'missing' }, 1),
        normalizeDeliveryPackageItem({ type: 'question-bank', title: '题库包', status: 'missing' }, 2),
        normalizeDeliveryPackageItem({ type: 'knowledge-base', title: '知识库', status: 'missing' }, 3),
        normalizeDeliveryPackageItem({ type: 'learning-path', title: '学习路径', status: 'missing' }, 4),
        normalizeDeliveryPackageItem({ type: 'archive', title: '项目归档', status: 'needs-review' }, 5)
      ];

  return {
    version: 1,
    title: String(deliveryPackage?.title || '项目成果交付包'),
    summary: String(deliveryPackage?.summary || '汇总当前项目的资料、题库、报告、路径和知识沉淀，形成可导出交付清单。'),
    items,
    checklist: Array.isArray(deliveryPackage?.checklist) && deliveryPackage.checklist.length
      ? uniqueStrings(deliveryPackage.checklist.map((entry) => String(entry)))
      : ['资料包已复核', '报告包已复核', '题库包已复核', '知识库已复核', '导出文件已生成'],
    exportNotes: String(deliveryPackage?.exportNotes || '导出前请检查 missing / needs-review 状态项，并在必要时回到对应页面补充。'),
    source: deliveryPackage?.source === 'manual' ? 'manual' : 'agent',
    createdAt: typeof deliveryPackage?.createdAt === 'string' && deliveryPackage.createdAt ? deliveryPackage.createdAt : now,
    updatedAt: typeof deliveryPackage?.updatedAt === 'string' && deliveryPackage.updatedAt ? deliveryPackage.updatedAt : now
  };
}

async function getDeliveryPackage(projectId: string) {
  const raw = await readJson<Partial<DeliveryPackage> | null>(projectDeliveryPackagePath(projectId), null);
  return raw ? normalizeDeliveryPackage(raw) : null;
}

async function writeDeliveryPackage(projectId: string, deliveryPackage: DeliveryPackage) {
  const normalized = normalizeDeliveryPackage(deliveryPackage);
  await writeJson(projectDeliveryPackagePath(projectId), normalized);
  return normalized;
}

function buildDeliveryStatus(count: number, readyThreshold = 1): DeliveryPackageItemStatus {
  if (count <= 0) return 'missing';
  return count >= readyThreshold ? 'ready' : 'needs-review';
}

function buildModeDeliveryItems(project: ProjectDetail, modeArtifacts: ModeArtifact[]): DeliveryPackageItem[] {
  if (normalizeProjectMode(project.meta.mode) === 'exam-review') {
    return [];
  }

  return [
    normalizeDeliveryPackageItem({
      id: 'delivery-mode-artifacts',
      type: 'archive',
      title: '模式成果包',
      description: modeArtifacts.length
        ? `当前项目已沉淀 ${modeArtifacts.length} 份模式成果，可随交付包导出。`
        : '尚未生成模式成果，建议先在当前项目页面生成至少一份内容。',
      status: modeArtifacts.length ? 'ready' : 'missing',
      sourceIds: modeArtifacts.map((artifact) => artifact.id),
      checklist: ['成果标题清晰', 'Markdown 内容可读', '已复核后再导出']
    }, 6)
  ];
}

function buildFallbackDeliveryPackage(
  project: ProjectDetail,
  profile: LearningProfile,
  pathPlan: LearningPathPlan | null,
  resources: PersonalizedResource[],
  reports: StageReport[],
  modeArtifacts: ModeArtifact[] = []
): DeliveryPackage {
  const now = new Date().toISOString();
  const practice = summarizePractice(project);
  const pathTasks = pathPlan?.stages.flatMap((stage) => stage.tasks) ?? [];
  const doneTasks = pathTasks.filter((task) => task.status === 'done').length;
  const readyCount = [
    resources.length > 0,
    reports.length > 0,
    project.questions.length > 0,
    project.knowledgeBase.length > 0,
    Boolean(pathPlan),
    project.uploads.length > 0 || project.progressMarkdown.trim().length > 0
  ].filter(Boolean).length;

  return normalizeDeliveryPackage({
    title: `${project.meta.name} 成果交付包`,
    summary: [
      `已汇总 ${resources.length} 份个性化资料、${reports.length} 份阶段报告、${project.questions.length} 道题目、${project.knowledgeBase.length} 条知识库记录。`,
      pathPlan ? `学习路径进度 ${doneTasks}/${pathTasks.length}。` : '学习路径尚未生成。',
      `学习画像置信度：${profile.confidence}。`
      , modeArtifacts.length ? `模式成果 ${modeArtifacts.length} 份。` : '模式成果尚未生成。'
    ].join(' '),
    items: [
      {
        id: 'delivery-resources',
        type: 'resources',
        title: '资料包',
        description: resources.length
          ? `包含讲义、例题、速记卡和补漏材料，共 ${resources.length} 条。`
          : '尚未生成个性化资料，建议先进入“资源”页生成资料包。',
        status: buildDeliveryStatus(resources.length),
        sourceIds: resources.map((resource) => resource.id),
        checklist: ['资料标题清晰', '知识点覆盖薄弱项', 'Markdown 内容可读', '可沉淀到知识库']
      },
      {
        id: 'delivery-reports',
        type: 'reports',
        title: '报告包',
        description: reports.length
          ? `包含 ${reports.length} 份阶段报告，可用于复盘画像、练习表现和下一步动作。`
          : '尚未生成阶段报告，建议先进入“报告”页生成报告包。',
        status: buildDeliveryStatus(reports.length),
        sourceIds: reports.map((report) => report.id),
        checklist: ['摘要可读', '下一步动作明确', '风险提醒已确认', '报告时间线可追踪']
      },
      {
        id: 'delivery-question-bank',
        type: 'question-bank',
        title: '题库包',
        description: project.questions.length
          ? `题库已收录 ${project.questions.length} 道题，已尝试 ${practice.attempted} 道，错题 ${practice.wrong} 道。`
          : '题库为空，建议先通过文本、文件或图片导入题目。',
        status: buildDeliveryStatus(project.questions.length),
        sourceIds: project.questions.map((question) => question.id),
        checklist: ['题干完整', '答案与解析完整', '分类准确', '错题和收藏状态已复核']
      },
      {
        id: 'delivery-knowledge-base',
        type: 'knowledge-base',
        title: '知识库',
        description: project.knowledgeBase.length
          ? `知识库已沉淀 ${project.knowledgeBase.length} 条记录。`
          : '知识库尚未沉淀条目，建议从资料、对话或上传内容生成知识条目。',
        status: buildDeliveryStatus(project.knowledgeBase.length),
        sourceIds: project.knowledgeBase.map((entry) => entry.id),
        checklist: ['条目标题明确', '标签可检索', '来源清楚', '重复内容已清理']
      },
      {
        id: 'delivery-learning-path',
        type: 'learning-path',
        title: '学习路径',
        description: pathPlan
          ? `路径包含 ${pathPlan.stages.length} 个阶段、${pathTasks.length} 个任务，已完成 ${doneTasks} 个。`
          : '学习路径尚未生成，建议先进入“路径”页建立阶段计划。',
        status: pathPlan ? (doneTasks > 0 ? 'ready' : 'needs-review') : 'missing',
        sourceIds: pathPlan ? [pathPlan.goal] : [],
        checklist: ['目标日期合理', '阶段任务可执行', '复盘节奏明确', '风险已记录']
      },
      {
        id: 'delivery-archive',
        type: 'archive',
        title: '项目归档',
        description: `项目包含 ${project.uploads.length} 个上传素材，进度页长度 ${project.progressMarkdown.trim().length} 字符。`,
        status: readyCount >= 4 ? 'ready' : 'needs-review',
        sourceIds: project.uploads.map((upload) => upload.storedPath),
        checklist: ['课程配置已确认', '学习进度已更新', '上传素材可追溯', '导出文件可打开']
      }
      , ...buildModeDeliveryItems(project, modeArtifacts)
    ],
    checklist: [
      readyCount >= 4 ? '核心交付项已基本齐备' : '核心交付项仍需补充',
      project.questions.length ? '题库包可导出' : '题库包待补充',
      resources.length ? '资料包可导出' : '资料包待补充',
      reports.length ? '报告包可导出' : '报告包待补充',
      pathPlan ? '学习路径可导出' : '学习路径待生成'
    ],
    exportNotes: '导出的 Markdown 适合人工审阅；JSON 保留结构化清单，便于后续重新导入或自动化处理。',
    source: 'agent',
    createdAt: now,
    updatedAt: now
  });
}

async function generateDeliveryPackage(projectId: string) {
  const project = await openProject(projectId);
  const profileState = await ensureLearningProfileState(projectId);
  const pathPlan = await getLearningPathPlan(projectId);
  const resources = await listPersonalizedResources(projectId);
  const reports = await listStageReports(projectId);
  const modeArtifacts = await listModeArtifacts(projectId);
  const existing = await getDeliveryPackage(projectId);
  const generated = buildFallbackDeliveryPackage(project, profileState.profile, pathPlan, resources, reports, modeArtifacts);

  return writeDeliveryPackage(projectId, {
    ...generated,
    createdAt: existing?.createdAt || generated.createdAt,
    updatedAt: new Date().toISOString()
  });
}

async function saveDeliveryPackage(projectId: string, deliveryPackage: DeliveryPackage) {
  const existing = await getDeliveryPackage(projectId);
  return writeDeliveryPackage(projectId, normalizeDeliveryPackage({
    ...deliveryPackage,
    source: 'manual',
    createdAt: existing?.createdAt || deliveryPackage.createdAt,
    updatedAt: new Date().toISOString()
  }));
}

function renderDeliveryPackageMarkdown(project: ProjectDetail, deliveryPackage: DeliveryPackage) {
  return [
    `# ${deliveryPackage.title}`,
    '',
    deliveryPackage.summary,
    '',
    `- 项目：${project.meta.name}`,
    `- 课程：${project.meta.courseName || '未填写'}`,
    `- 模型：${project.meta.model || '未填写'}`,
    `- 更新时间：${new Date(deliveryPackage.updatedAt).toLocaleString('zh-CN')}`,
    '',
    '## 交付清单',
    '',
    ...deliveryPackage.items.flatMap((item) => [
      `### ${item.title}`,
      '',
      `- 类型：${item.type}`,
      `- 状态：${item.status}`,
      `- 来源数量：${item.sourceIds.length}`,
      '',
      item.description,
      '',
      ...item.checklist.map((entry) => `- [ ] ${entry}`),
      ''
    ]),
    '## 总检查项',
    '',
    ...deliveryPackage.checklist.map((entry) => `- [ ] ${entry}`),
    '',
    '## 导出说明',
    '',
    deliveryPackage.exportNotes
  ].join('\n');
}

async function exportDeliveryPackage(projectId: string): Promise<ExportResult> {
  const detail = await openProject(projectId);
  const deliveryPackage = await getDeliveryPackage(projectId) ?? await generateDeliveryPackage(projectId);
  const exportDir = projectGeneratedDir(projectId);
  await mkdir(exportDir, { recursive: true });

  const markdownPath = path.join(exportDir, `${slugify(detail.meta.name)}-delivery.md`);
  const jsonPath = path.join(exportDir, `${slugify(detail.meta.name)}-delivery.json`);

  await writeFile(markdownPath, renderDeliveryPackageMarkdown(detail, deliveryPackage), 'utf8');
  await writeJson(jsonPath, deliveryPackage);

  return { markdownPath, jsonPath };
}

async function getProjectAllowedRoot(projectId: string) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  if (!meta) {
    throw new Error(`Project not found: ${projectId}`);
  }

  return meta.linkedFolder || meta.root;
}

async function updateProjectModel(projectId: string, model: string) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  if (!meta) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const updatedMeta = {
    ...meta,
    model,
    updatedAt: new Date().toISOString()
  };
  await writeJson(projectMetaPath(projectId), updatedMeta);

  const projects = await listProjects();
  await saveProjects(projects.map((project) => project.id === projectId ? updatedMeta : project));
  return updatedMeta;
}

async function renameProject(projectId: string, name: string) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  if (!meta) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const updatedMeta = {
    ...meta,
    name: name.trim() || meta.name,
    updatedAt: new Date().toISOString()
  };
  return persistProjectMeta(updatedMeta);
}

async function deleteProject(projectId: string) {
  await rm(projectDir(projectId), { recursive: true, force: true });
  const projects = await readJson<ProjectMeta[]>(projectRegistryPath(), []);
  await saveProjects(projects.filter((project) => project.id !== projectId));
  return true;
}

async function saveProjectConfig(projectId: string, content: string) {
  await ensureParentDir(projectConfigPath(projectId));
  await writeFile(projectConfigPath(projectId), content, 'utf8');
  return true;
}

async function saveProjectProgress(projectId: string, content: string) {
  await ensureParentDir(projectProgressPath(projectId));
  await writeFile(projectProgressPath(projectId), content, 'utf8');
  return true;
}

function classifyUpload(filePath: string): 'file' | 'image' {
  return isImageFile(filePath) ? 'image' : 'file';
}

async function importProjectFiles(projectId: string, filePaths: string[]) {
  const uploads = await readJson<ProjectSourceFile[]>(path.join(projectUploadsDir(projectId), 'index.json'), []);
  const nextEntries: ProjectSourceFile[] = [];

  await mkdir(projectUploadsDir(projectId), { recursive: true });

  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const targetName = `${Date.now()}-${fileName}`;
    const targetPath = path.join(projectUploadsDir(projectId), targetName);
    await copyFile(filePath, targetPath);
    const kind = classifyUpload(filePath);
    const parsed = await parseUpload(targetPath, kind);

    nextEntries.push({
      name: fileName,
      storedPath: targetPath,
      originalPath: filePath,
      kind,
      importedAt: new Date().toISOString(),
      parsed
    });
  }

  const merged = [...nextEntries, ...uploads];
  await writeJson(path.join(projectUploadsDir(projectId), 'index.json'), merged);
  return merged;
}

async function previewQuestionsFromText(text: string, source: QuestionDraft['source'] = 'text', sourceName?: string) {
  return parseQuestionDrafts(text, source, sourceName);
}

async function previewQuestionsFromFiles(filePaths: string[]) {
  const drafts: QuestionDraft[] = [];

  for (const filePath of filePaths) {
    const kind = classifyUpload(filePath);
    const parsed = await parseUpload(filePath, kind);
    drafts.push(...parseQuestionDrafts(parsed.extractedText, kind, path.basename(filePath)));
  }

  return drafts;
}

async function addQuestions(projectId: string, drafts: QuestionDraft[]) {
  const current = await readJson<ReviewQuestion[]>(projectQuestionsPath(projectId), []);
  const nextQuestions = [...materializeQuestionDrafts(drafts), ...current];
  await writeJson(projectQuestionsPath(projectId), nextQuestions);
  return nextQuestions;
}

async function updateQuestion(projectId: string, question: ReviewQuestion) {
  const current = await readJson<ReviewQuestion[]>(projectQuestionsPath(projectId), []);
  const updated = {
    ...question,
    updatedAt: new Date().toISOString()
  };
  const nextQuestions = current.map((item) => item.id === question.id ? updated : item);
  await writeJson(projectQuestionsPath(projectId), nextQuestions);
  return nextQuestions;
}

async function getKnowledgeResources(projectId: string, knowledgePoint: string) {
  const current = await readJson<KnowledgeResource[]>(projectResourcesPath(projectId), []);
  const generated = buildKnowledgeResources(knowledgePoint, current);
  const merged = [
    ...generated,
    ...current.filter((resource) => resource.knowledgePoint !== knowledgePoint)
  ];
  await writeJson(projectResourcesPath(projectId), merged);
  return generated;
}

async function openKnowledgeResource(projectId: string, resource: KnowledgeResource) {
  const current = await readJson<KnowledgeResource[]>(projectResourcesPath(projectId), []);
  const updated = {
    ...resource,
    read: true,
    updatedAt: new Date().toISOString()
  };
  const nextResources = current.some((item) => item.id === resource.id)
    ? current.map((item) => item.id === resource.id ? updated : item)
    : [updated, ...current];
  await writeJson(projectResourcesPath(projectId), nextResources);
  await shell.openExternal(resource.url);
  return nextResources;
}

async function appendChatHistory(projectId: string, turns: ChatTurn[]) {
  const current = await readJson<ChatTurn[]>(projectChatPath(projectId), []);
  const merged = [...current, ...turns];
  await writeJson(projectChatPath(projectId), merged);
  return merged;
}

async function runProjectChat(projectId: string, input: string) {
  const project = await openProject(projectId);
  const learningProfileContext = await formatLearningProfileForPrompt(projectId);
  const settings = await loadSettings();
  const activeProfile = getActiveProvider(settings);
  const profile = settings.providers.find((profile) => profile.id === project.meta.provider)
    ?? settings.providers.find((profile) => profile.provider === project.meta.provider)
    ?? activeProfile;
  const model = project.meta.model || profile.selectedModelId;
  const userTurn: ChatTurn = {
    role: 'user',
    content: input,
    createdAt: new Date().toISOString(),
    model
  };

  if (!profile.apiKey || !profile.baseUrl) {
    const fallback: ChatTurn = {
      role: 'assistant',
      content: `当前项目模型为 ${project.meta.model}，但你还没有在设置里完成 API 配置。请先保存 Base URL 和 API Key。`,
      createdAt: new Date().toISOString(),
      model
    };
    const history = await appendChatHistory(projectId, [userTurn, fallback]);
    return { reply: fallback.content, history };
  }

  const recentUploads = project.uploads.slice(0, 3).map((upload) => {
    const extracted = upload.parsed?.extractedText ? `\n解析结果：${upload.parsed.extractedText}` : '';
    return `- ${upload.name} (${upload.kind})${extracted}`;
  }).join('\n');

  const prompt = [
    learningProfileContext,
    `你是“期末速成引擎”的项目内学习助手。`,
    `课程：${project.meta.courseName}`,
    `考试类型：${project.meta.examType}`,
    `教材：${project.meta.textbook || '未填写'}`,
    `补充要求：${project.meta.requirements || '无'}`,
    recentUploads ? `最近上传内容：\n${recentUploads}` : '最近上传内容：暂无',
    `用户问题：${input}`
  ].join('\n\n');

  const request = buildChatRequest({
    provider: profile.provider,
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    systemPrompt: '你是一个面向考试冲刺的中文学习助手，回答要结构化、具体、以提分为目标。',
    userPrompt: prompt
  });
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    throw new Error(`聊天请求失败：${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = parseChatResponse(profile.provider, payload);
  const assistantTurn: ChatTurn = {
    role: 'assistant',
    content: reply,
    createdAt: new Date().toISOString(),
    model
  };
  const history = await appendChatHistory(projectId, [userTurn, assistantTurn]);
  return { reply, history };
}

async function addKnowledgeBaseEntry(
  projectId: string,
  entry: { title: string; summary: string; source: 'chat' | 'upload' | 'stage' | 'summary'; tags: string[]; content: string }
) {
  const index = await readJson<KnowledgeBaseEntry[]>(projectKnowledgeIndexPath(projectId), []);
  const id = `${slugify(entry.title)}-${Date.now()}`;
  const filePath = path.join(projectKnowledgeEntriesDir(projectId), `${id}.md`);
  const nextEntry: KnowledgeBaseEntry = {
    id,
    title: entry.title,
    summary: entry.summary,
    source: entry.source,
    tags: uniqueStrings(entry.tags),
    filePath,
    updatedAt: new Date().toISOString()
  };

  const markdown = `# ${entry.title}\n\n> 来源：${entry.source}\n\n> 标签：${nextEntry.tags.join(' / ')}\n\n${entry.summary}\n\n## 内容\n\n${entry.content}\n`;
  await ensureParentDir(filePath);
  await writeFile(filePath, markdown, 'utf8');
  await writeJson(projectKnowledgeIndexPath(projectId), [nextEntry, ...index]);
  return nextEntry;
}

async function buildKnowledgeDraft(
  source: 'chat' | 'upload',
  payload: { title?: string; content: string; fallbackTags?: string[] }
) {
  return draftKnowledgeEntry({
    source,
    title: payload.title,
    content: payload.content,
    fallbackTags: payload.fallbackTags
  });
}

async function exportProject(projectId: string): Promise<ExportResult> {
  const detail = await openProject(projectId);
  const exportDir = projectGeneratedDir(projectId);
  await mkdir(exportDir, { recursive: true });

  const markdownPath = path.join(exportDir, `${slugify(detail.meta.name)}-export.md`);
  const jsonPath = path.join(exportDir, `${slugify(detail.meta.name)}-export.json`);

  const markdown = [
    `# ${detail.meta.name}`,
    '',
    `- 课程：${detail.meta.courseName}`,
    `- 考试类型：${detail.meta.examType}`,
    `- 模型：${detail.meta.model}`,
    '',
    '## 项目要求',
    '',
    detail.meta.requirements || '暂无',
    '',
    '## 课程配置',
    '',
    '```yaml',
    detail.configYaml.trim(),
    '```',
    '',
    '## 学习进度',
    '',
    detail.progressMarkdown.trim()
  ].join('\n');

  await writeFile(markdownPath, markdown, 'utf8');
  await writeJson(jsonPath, detail);

  return { markdownPath, jsonPath };
}

async function checkLatex() {
  return detectLatexEnvironment();
}

function createMainWindow() {
  // Use __dirname for reliable path resolution in both dev and packaged modes
  const preloadPath = path.join(__dirname, 'preload.cjs');
  console.log('[main] Preload path:', preloadPath);

  const window = new BrowserWindow({
    width: 1600,
    height: 980,
    title: 'Cram Engine Desktop',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadPath
    }
  });

  if (app.isPackaged) {
    const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('[main] Loading file:', htmlPath);
    window.loadFile(htmlPath);
  } else {
    const devUrl = process.env.ELECTRON_RENDERER_URL ?? 'http://127.0.0.1:5173';
    console.log('[main] Loading URL:', devUrl);
    window.loadURL(devUrl).catch((err) => {
      console.error('[main] Failed to load dev URL:', err.message);
      const fallbackPath = path.join(__dirname, '..', 'dist', 'index.html');
      console.log('[main] Falling back to file:', fallbackPath);
      window.loadFile(fallbackPath);
    });
  }

  return window;
}

app.whenReady().then(async () => {
  await mkdir(projectsRoot(), { recursive: true });
  mainWindow = createMainWindow();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

ipcMain.handle('dialog:selectProjectFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled) {
    rememberApprovedExternalPaths(result.filePaths);
  }
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:selectUploadFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '可识别资料', extensions: supportedUploadExtensions.map((item) => item.slice(1)) },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  if (!result.canceled) {
    rememberApprovedExternalPaths(result.filePaths);
  }
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:save', (_event, settings: AppSettings) => saveSettings(settings));
ipcMain.handle('settings:fetchModels', () => fetchModels());
ipcMain.handle('settings:testProvider', (_event, profile: ProviderProfile) => testProviderConnection(profile));
ipcMain.handle('settings:fetchProviderModels', (_event, profile: ProviderProfile) => fetchProviderModels(profile));
ipcMain.handle('projects:list', () => listProjects());
ipcMain.handle('projects:create', (_event, input: CreateProjectInput) => createProject(input));
ipcMain.handle('projects:open', (_event, projectId: string) => openProject(projectId));
ipcMain.handle('projects:rename', (_event, projectId: string, name: string) => renameProject(projectId, name));
ipcMain.handle('projects:delete', (_event, projectId: string) => deleteProject(projectId));
ipcMain.handle('projects:updateModel', (_event, projectId: string, model: string) => updateProjectModel(projectId, model));
ipcMain.handle('projects:saveConfig', (_event, projectId: string, content: string) => saveProjectConfig(projectId, content));
ipcMain.handle('projects:saveProgress', (_event, projectId: string, content: string) => saveProjectProgress(projectId, content));
ipcMain.handle('projects:importFiles', (_event, projectId: string, filePaths: string[]) => importProjectFiles(projectId, filePaths));
ipcMain.handle('questions:previewText', (_event, text: string, source: QuestionDraft['source'], sourceName?: string) => previewQuestionsFromText(text, source, sourceName));
ipcMain.handle('questions:previewFiles', (_event, filePaths: string[]) => previewQuestionsFromFiles(filePaths));
ipcMain.handle('questions:add', (_event, projectId: string, drafts: QuestionDraft[]) => addQuestions(projectId, drafts));
ipcMain.handle('questions:update', (_event, projectId: string, question: ReviewQuestion) => updateQuestion(projectId, question));
ipcMain.handle('resources:get', (_event, projectId: string, knowledgePoint: string) => getKnowledgeResources(projectId, knowledgePoint));
ipcMain.handle('resources:open', (_event, projectId: string, resource: KnowledgeResource) => openKnowledgeResource(projectId, resource));
ipcMain.handle('personalizedResources:list', (_event, projectId: string) => listPersonalizedResources(projectId));
ipcMain.handle('personalizedResources:generate', (_event, projectId: string, input: GeneratePersonalizedResourcesInput) => generatePersonalizedResources(projectId, input));
ipcMain.handle('personalizedResources:save', (_event, projectId: string, resource: PersonalizedResource) => savePersonalizedResource(projectId, resource));
ipcMain.handle('personalizedResources:delete', (_event, projectId: string, resourceId: string) => deletePersonalizedResource(projectId, resourceId));
ipcMain.handle('learningPath:get', (_event, projectId: string) => getLearningPathPlan(projectId));
ipcMain.handle('learningPath:generate', (_event, projectId: string, input: GenerateLearningPathInput) => generateLearningPathPlan(projectId, input));
ipcMain.handle('learningPath:save', (_event, projectId: string, plan: LearningPathPlan) => saveLearningPathPlan(projectId, plan));
ipcMain.handle('stageReports:list', (_event, projectId: string) => listStageReports(projectId));
ipcMain.handle('stageReports:generate', (_event, projectId: string) => generateStageReport(projectId));
ipcMain.handle('stageReports:save', (_event, projectId: string, report: StageReport) => saveStageReport(projectId, report));
ipcMain.handle('modeArtifacts:list', (_event, projectId: string) => listModeArtifacts(projectId));
ipcMain.handle('modeArtifacts:generate', (_event, projectId: string, input: GenerateModeArtifactInput) => generateModeArtifact(projectId, input));
ipcMain.handle('modeArtifacts:save', (_event, projectId: string, artifact: ModeArtifact) => saveModeArtifact(projectId, artifact));
ipcMain.handle('modeArtifacts:delete', (_event, projectId: string, artifactId: string) => deleteModeArtifact(projectId, artifactId));
ipcMain.handle('delivery:get', (_event, projectId: string) => getDeliveryPackage(projectId));
ipcMain.handle('delivery:generate', (_event, projectId: string) => generateDeliveryPackage(projectId));
ipcMain.handle('delivery:save', (_event, projectId: string, deliveryPackage: DeliveryPackage) => saveDeliveryPackage(projectId, deliveryPackage));
ipcMain.handle('delivery:export', (_event, projectId: string) => exportDeliveryPackage(projectId));
ipcMain.handle('profile:get', (_event, projectId: string) => ensureLearningProfileState(projectId));
ipcMain.handle('profile:save', (_event, projectId: string, profile: LearningProfile) => saveLearningProfile(projectId, profile));
ipcMain.handle('profile:analyze', (_event, projectId: string, input: string) => analyzeLearningProfile(projectId, input));
ipcMain.handle('projects:chat', (_event, projectId: string, input: string) => runProjectChat(projectId, input));
ipcMain.handle('knowledgeBase:addEntry', (_event, projectId: string, entry) => addKnowledgeBaseEntry(projectId, entry));
ipcMain.handle('knowledgeBase:draftEntry', (_event, _projectId: string, source: 'chat' | 'upload', payload) => buildKnowledgeDraft(source, payload));
ipcMain.handle('projects:export', (_event, projectId: string) => exportProject(projectId));
ipcMain.handle('latex:check', () => checkLatex());
ipcMain.handle('project:snapshot', async (_event, projectId: string, root: string) => {
  const allowedRoot = await getProjectAllowedRoot(projectId);
  assertAllowedProjectPath(allowedRoot, root);
  return snapshotProject(root);
});
ipcMain.handle('project:readText', async (_event, projectIdOrFilePath: string, filePath?: string) => {
  if (!filePath) {
    const approvedPath = assertApprovedExternalPath(projectIdOrFilePath);
    return extractTextFromFile(approvedPath);
  }

  const allowedRoot = await getProjectAllowedRoot(projectIdOrFilePath);
  assertAllowedProjectPath(allowedRoot, filePath);
  return readFile(filePath, 'utf8');
});
ipcMain.handle('project:extractFileText', async (_event, filePath: string) => {
  const approvedPath = assertApprovedExternalPath(filePath);
  return extractTextFromFile(approvedPath);
});
ipcMain.handle('project:getUploadDataUrl', async (_event, projectId: string, filePath: string) => {
  const allowedRoot = await getProjectAllowedRoot(projectId);
  assertAllowedProjectPath(allowedRoot, filePath);
  if (!isImageFile(filePath)) return '';
  const buffer = await readFile(filePath);
  return `data:${dataUrlMime(filePath)};base64,${buffer.toString('base64')}`;
});
ipcMain.handle('project:saveText', async (_event, projectId: string, filePath: string, content: string) => {
  const allowedRoot = await getProjectAllowedRoot(projectId);
  assertAllowedProjectPath(allowedRoot, filePath);
  await ensureParentDir(filePath);
  await writeFile(filePath, content, 'utf8');
  return true;
});

// ---- 新增 IPC handlers (增量追加) ----

/** 获取项目的统计摘要（题目数/知识库数/进度百分比） */
ipcMain.handle('projects:summary', async (_event, projectId: string) => {
  const questions = await readJson<ReviewQuestion[]>(projectQuestionsPath(projectId), []);
  const kb = await readJson<KnowledgeBaseEntry[]>(projectKnowledgeIndexPath(projectId), []);
  const attempted = questions.filter((q) => q.attempts > 0).length;
  return {
    questionCount: questions.length,
    knowledgeBaseCount: kb.length,
    progressPercent: questions.length ? Math.round((attempted / questions.length) * 100) : 0
  };
});

/** 批量 OCR 图片 */
ipcMain.handle('ocr:batch', async (_event, filePaths: string[]) => {
  const results: Array<{ path: string; text: string }> = [];
  for (const fp of filePaths) {
    const approvedPath = assertApprovedExternalPath(fp);
    const text = await extractTextFromFile(approvedPath);
    results.push({ path: fp, text });
  }
  return results;
});

/** 从文件内容直接解析题目（不做上传存储，仅解析） */
ipcMain.handle('questions:previewFilesDirect', async (_event, filePaths: string[]) => {
  const drafts: QuestionDraft[] = [];
  for (const fp of filePaths) {
    const approvedPath = assertApprovedExternalPath(fp);
    const kind = classifyUpload(fp);
    const text = await extractTextFromFile(approvedPath);
    drafts.push(...parseQuestionDrafts(text, kind, path.basename(fp)));
  }
  return drafts;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
