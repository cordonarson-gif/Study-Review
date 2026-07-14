import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { createWorker } from 'tesseract.js';
import {
  buildChatRequest,
  buildModelsRequest,
  normalizeSettings,
  parseChatResponse,
  parseModelsResponse,
  resolveDefaultProvider
} from './provider-api.cjs';
import { assertAllowedProjectPath } from './file-access.cjs';
import { parseQuestionDrafts, type QuestionDraft, type ReviewQuestion } from './question-utils.cjs';
import {
  generateCourseOutline,
  generateChapterScene,
  generateAllScenes,
  type CourseGenerationInput,
  type CourseOutline,
  type Chapter,
  type CourseScene,
  type GeneratedCourse
} from './course-generator.cjs';
import {
  createSession,
  executeAction,
  defaultPersonas,
  type AgentSession,
  type SessionAction,
  type AgentSpeech
} from './agent-orchestrator.cjs';
import { exportPptx } from './pptx-exporter.cjs';
import { exportInteractiveHtml } from './html-exporter.cjs';

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

type AppSettings = {
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

const devServerUrl = process.env.ELECTRON_RENDERER_URL ?? 'http://127.0.0.1:5173';
const defaultProvider = resolveDefaultProvider();
const presetModels: ModelOption[] = [
  { id: 'gpt-4.1', label: 'gpt-4.1', provider: 'openai-compatible', source: 'preset' },
  { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', provider: 'openai-compatible', source: 'preset' },
  { id: 'gpt-4o', label: 'gpt-4o', provider: 'openai-compatible', source: 'preset' },
  { id: 'deepseek-chat', label: 'deepseek-chat', provider: 'deepseek', source: 'preset' },
  { id: 'deepseek-reasoner', label: 'deepseek-reasoner', provider: 'deepseek', source: 'preset' },
  { id: 'qwen-plus', label: 'qwen-plus', provider: 'aliyun', source: 'preset' },
  { id: 'qwen-max', label: 'qwen-max', provider: 'aliyun', source: 'preset' },
  { id: 'qwen2.5-72b-instruct', label: 'qwen2.5-72b-instruct', provider: 'aliyun', source: 'preset' },
  { id: 'claude-opus-4-8', label: 'claude-opus-4-8', provider: 'anthropic', source: 'preset' },
  { id: 'claude-sonnet-4-6', label: 'claude-sonnet-4-6', provider: 'anthropic', source: 'preset' },
  { id: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5-20251001', provider: 'anthropic', source: 'preset' },
];
const defaultSettings: AppSettings = {
  apiKey: '',
  baseUrl: defaultProvider.baseUrl,
  provider: defaultProvider.provider,
  model: defaultProvider.model,
  temperature: 0.2,
  maxTokens: 4096,
  latexEngine: 'xelatex',
  enableLatexPreview: true,
  availableModels: presetModels,
  lastModelSyncAt: null
};

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

function projectCoursePath(projectId: string) {
  return path.join(projectDir(projectId), 'course.json');
}

function projectAgentSessionPath(projectId: string) {
  return path.join(projectDir(projectId), 'agent-session.json');
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

function dedupeModels(models: ModelOption[]) {
  return Array.from(new Map(models.map((model) => [model.id, model])).values());
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
  const loaded = await readJson<AppSettings>(settingsPath(), defaultSettings);
  return normalizeSettings({
    ...defaultSettings,
    ...loaded,
    availableModels: dedupeModels([...(loaded.availableModels ?? []), ...presetModels])
  });
}

async function saveSettings(settings: AppSettings) {
  const merged = normalizeSettings({
    ...defaultSettings,
    ...settings,
    availableModels: dedupeModels(settings.availableModels ?? presetModels)
  });
  await writeJson(settingsPath(), merged);
  return merged;
}

async function fetchModels() {
  const settings = await loadSettings();
  if (!settings.baseUrl || !settings.apiKey) {
    throw new Error('请先配置 Base URL 和 API Key');
  }

  const request = buildModelsRequest({
    provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey
  });
  const response = await fetch(request.url, { headers: request.headers });

  if (!response.ok) {
    throw new Error(`获取模型失败：${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as { data?: Array<{ id?: string; name?: string; display_name?: string }> };
  const fetched = parseModelsResponse(settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun', payload)
    .map((modelId: string) => ({
      id: modelId,
      label: modelId,
      provider: settings.provider,
      source: 'fetched' as const
    }));

  const nextSettings = await saveSettings({
    ...settings,
    availableModels: dedupeModels([...settings.availableModels, ...fetched]),
    lastModelSyncAt: new Date().toISOString(),
    model: fetched[0]?.id ?? settings.model
  });

  return nextSettings;
}

async function listProjects(): Promise<ProjectMeta[]> {
  const projects = await readJson<ProjectMeta[]>(projectRegistryPath(), []);
  return [...projects].sort((a, b) => {
    const left = new Date(a.lastOpenedAt || a.updatedAt || a.createdAt).getTime();
    const right = new Date(b.lastOpenedAt || b.updatedAt || b.createdAt).getTime();
    return right - left;
  });
}

async function saveProjects(projects: ProjectMeta[]) {
  await writeJson(projectRegistryPath(), projects);
}

async function persistProjectMeta(meta: ProjectMeta) {
  await writeJson(projectMetaPath(meta.id), meta);
  const projects = await readJson<ProjectMeta[]>(projectRegistryPath(), []);
  await saveProjects([meta, ...projects.filter((project) => project.id !== meta.id)]);
  return meta;
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

async function parseUpload(targetPath: string, kind: 'file' | 'image'): Promise<ParsedUpload> {
  const title = path.basename(targetPath);
  if (kind === 'image') {
    const extractedText = await parseImageWithOcr(targetPath);
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

  const extension = path.extname(targetPath).toLowerCase();
  const textLike = ['.txt', '.md', '.markdown', '.yaml', '.yml', '.json', '.csv'];
  if (textLike.includes(extension)) {
    const raw = await readFile(targetPath, 'utf8');
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

  return {
    title,
    kind,
    summary: '该文件类型已导入，但当前仅保留文件本体，后续可扩展专用解析器。',
    extractedText: `文件已保存：${title}`,
    sourcePath: targetPath
  };
}

async function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  const now = new Date().toISOString();
  const id = `${slugify(input.name)}-${Date.now()}`;
  const root = projectDir(id);
  const meta: ProjectMeta = {
    id,
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

  const configYaml = buildConfigYaml(input);
  const progressMarkdown = buildInitialProgress(input.courseName);

  await writeJson(projectMetaPath(id), meta);
  await writeFile(projectConfigPath(id), configYaml, 'utf8');
  await writeFile(projectProgressPath(id), progressMarkdown, 'utf8');
  await writeJson(projectKnowledgeIndexPath(id), []);
  await writeJson(projectQuestionsPath(id), materializeQuestionDrafts(input.initialQuestions ?? []));
  await writeJson(projectResourcesPath(id), []);
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
    chatHistory: await readJson<ChatTurn[]>(projectChatPath(id), [])
  };
}

async function openProject(projectId: string): Promise<ProjectDetail> {
  const loadedMeta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const meta = loadedMeta ? {
    ...loadedMeta,
    lastOpenedAt: new Date().toISOString()
  } : null;
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
    chatHistory
  };
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
  const extension = path.extname(filePath).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(extension) ? 'image' : 'file';
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
  const settings = await loadSettings();
  const userTurn: ChatTurn = {
    role: 'user',
    content: input,
    createdAt: new Date().toISOString(),
    model: project.meta.model
  };

  if (!settings.apiKey || !settings.baseUrl) {
    const fallback: ChatTurn = {
      role: 'assistant',
      content: `当前模型为 ${settings.model}，但你还没有在设置里完成 API 配置。请先保存 Base URL 和 API Key。`,
      createdAt: new Date().toISOString(),
      model: project.meta.model
    };
    const history = await appendChatHistory(projectId, [userTurn, fallback]);
    return { reply: fallback.content, history };
  }

  const recentUploads = project.uploads.slice(0, 3).map((upload) => {
    const extracted = upload.parsed?.extractedText ? `\n解析结果：${upload.parsed.extractedText}` : '';
    return `- ${upload.name} (${upload.kind})${extracted}`;
  }).join('\n');

  const prompt = [
    `你是“期末速成引擎”的项目内学习助手。`,
    `课程：${project.meta.courseName}`,
    `考试类型：${project.meta.examType}`,
    `教材：${project.meta.textbook || '未填写'}`,
    `补充要求：${project.meta.requirements || '无'}`,
    recentUploads ? `最近上传内容：\n${recentUploads}` : '最近上传内容：暂无',
    `用户问题：${input}`
  ].join('\n\n');

  const request = buildChatRequest({
    provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    systemPrompt: '你是一个面向考试冲刺的中文学习助手，回答要结构化、具体、以提分为目标。重要：回复时直接以知识点标题开头，不要使用"同学你好！""你好！"等任何寒暄前缀或问候语，也不要加"针对""关于"等引导词，直接输出核心内容。',
    userPrompt: prompt
  });
  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '(无法读取响应体)');
    console.error(`[chat] API 错误详情: provider=${settings.provider}, model=${project.meta.model}, url=${request.url}`);
    console.error(`[chat] 响应体: ${errorBody}`);
    throw new Error(`聊天请求失败：${response.status} ${response.statusText}\n${errorBody}`);
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = parseChatResponse(settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun', payload);
  const assistantTurn: ChatTurn = {
    role: 'assistant',
    content: reply,
    createdAt: new Date().toISOString(),
    model: project.meta.model
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

async function deleteKnowledgeBaseEntry(projectId: string, entryId: string) {
  const index = await readJson<KnowledgeBaseEntry[]>(projectKnowledgeIndexPath(projectId), []);
  const entry = index.find((e) => e.id === entryId);
  if (!entry) return false;
  // 删除条目文件
  try { await rm(entry.filePath, { force: true }); } catch { /* ignore */ }
  // 从索引中移除
  const next = index.filter((e) => e.id !== entryId);
  await writeJson(projectKnowledgeIndexPath(projectId), next);
  return true;
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
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'xelatex.exe'),
    'C:/Program Files/MiKTeX/miktex/bin/x64/xelatex.exe',
    'C:/Program Files/MiKTeX/miktex/bin/x64/pdflatex.exe'
  ];

  for (const candidate of candidates) {
    try {
      await stat(candidate);
      return { available: true, engine: path.basename(candidate), path: candidate };
    } catch {
      continue;
    }
  }

  return { available: false, engine: 'missing', path: null };
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
  const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'] });
  if (!result.canceled) {
    rememberApprovedExternalPaths(result.filePaths);
  }
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('settings:get', () => loadSettings());
ipcMain.handle('settings:save', (_event, settings: AppSettings) => saveSettings(settings));
ipcMain.handle('settings:fetchModels', () => fetchModels());
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
ipcMain.handle('projects:chat', (_event, projectId: string, input: string) => runProjectChat(projectId, input));
ipcMain.handle('knowledgeBase:addEntry', (_event, projectId: string, entry) => addKnowledgeBaseEntry(projectId, entry));
ipcMain.handle('knowledgeBase:draftEntry', (_event, _projectId: string, source: 'chat' | 'upload', payload) => buildKnowledgeDraft(source, payload));
ipcMain.handle('knowledgeBase:deleteEntry', (_event, projectId: string, entryId: string) => deleteKnowledgeBaseEntry(projectId, entryId));
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
    return readFile(approvedPath, 'utf8');
  }

  const allowedRoot = await getProjectAllowedRoot(projectIdOrFilePath);
  assertAllowedProjectPath(allowedRoot, filePath);
  return readFile(filePath, 'utf8');
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
    const kind = classifyUpload(fp);
    if (kind === 'image') {
      const text = await parseImageWithOcr(fp);
      results.push({ path: fp, text });
    } else {
      const raw = await readFile(fp, 'utf8');
      results.push({ path: fp, text: raw });
    }
  }
  return results;
});

/** 从文件内容直接解析题目（不做上传存储，仅解析） */
ipcMain.handle('questions:previewFilesDirect', async (_event, filePaths: string[]) => {
  const drafts: QuestionDraft[] = [];
  for (const fp of filePaths) {
    const kind = classifyUpload(fp);
    if (kind === 'image') {
      const text = await parseImageWithOcr(fp);
      drafts.push(...parseQuestionDrafts(text, 'image', path.basename(fp)));
    } else {
      const raw = await readFile(fp, 'utf8');
      drafts.push(...parseQuestionDrafts(raw, 'file', path.basename(fp)));
    }
  }
  return drafts;
});

// ---- Phase 1: 课程生成管线 IPC handlers ----

/** 第一阶段：生成课程大纲 */
ipcMain.handle('courses:generateOutline', async (_event, input: CourseGenerationInput) => {
  const settings = await loadSettings();
  const llm = settings.apiKey ? {
    provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens
  } : null;

  return generateCourseOutline(input, llm);
});

/** 第二阶段：为某个章节生成场景内容 */
ipcMain.handle('courses:generateScene', async (_event, projectId: string, chapter: Chapter) => {
  const settings = await loadSettings();
  const project = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const courseTitle = project?.courseName || '未命名课程';

  const llm = settings.apiKey ? {
    provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens
  } : null;

  return generateChapterScene(chapter, courseTitle, llm);
});

/** 批量生成所有章节场景 */
ipcMain.handle('courses:generateAllScenes', async (_event, projectId: string, outline: CourseOutline) => {
  const settings = await loadSettings();
  const llm = settings.apiKey ? {
    provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens
  } : null;

  return generateAllScenes(outline, llm);
});

/** 加载项目的已生成课程 */
ipcMain.handle('courses:load', async (_event, projectId: string) => {
  try {
    return await readJson<GeneratedCourse | null>(projectCoursePath(projectId), null);
  } catch {
    return null;
  }
});

/** 保存生成的课程 */
ipcMain.handle('courses:save', async (_event, projectId: string, course: GeneratedCourse) => {
  await writeJson(projectCoursePath(projectId), course);
  return true;
});

// ---- Phase 2: 多智能体编排 IPC handlers ----

/** 创建智能体会话 */
ipcMain.handle('agents:createSession', async (_event, projectId: string, courseContext: string) => {
  const session = createSession(projectId, courseContext);
  await writeJson(projectAgentSessionPath(projectId), session);
  return session;
});

/** 执行一次会话操作 */
ipcMain.handle('agents:executeAction', async (_event, projectId: string, sessionId: string, action: SessionAction) => {
  const session = await readJson<AgentSession | null>(projectAgentSessionPath(projectId), null);
  if (!session) throw new Error('会话不存在，请先创建');

  const settings = await loadSettings();
  const llm = settings.apiKey ? {
    provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
    baseUrl: settings.baseUrl,
    apiKey: settings.apiKey,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens
  } : null;

  const result = await executeAction(session, action, llm);
  // 保存更新后的会话
  await writeJson(projectAgentSessionPath(projectId), result.session);
  return result;
});

/** 加载智能体会话 */
ipcMain.handle('agents:loadSession', async (_event, projectId: string) => {
  try {
    return await readJson<AgentSession | null>(projectAgentSessionPath(projectId), null);
  } catch {
    return null;
  }
});

// ---- Phase 6: 导出增强 IPC handlers ----

/** PPTX 导出 */
ipcMain.handle('export:pptx', async (_event, projectId: string, courseData: any) => {
  const exportDir = projectGeneratedDir(projectId);
  const scenes = courseData.scenes || [];
  const title = courseData.outline?.meta?.title || '课程导出';
  const pptxPath = await exportPptx(exportDir, scenes, title);
  return { path: pptxPath };
});

/** 互动 HTML 导出 */
ipcMain.handle('export:html', async (_event, projectId: string, courseData: any) => {
  const exportDir = projectGeneratedDir(projectId);
  const title = courseData.outline?.meta?.title || '课程导出';
  const htmlPath = await exportInteractiveHtml(exportDir, courseData, title);
  return { path: htmlPath };
});

/** 测试 API 连接 */
ipcMain.handle('settings:testConnection', async () => {
  const settings = await loadSettings();
  if (!settings.apiKey) return { ok: false, message: '未配置 API Key' };
  try {
    const request = buildModelsRequest({
      provider: settings.provider as 'anthropic' | 'openai-compatible' | 'aliyun',
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey
    });
    const response = await fetch(request.url, { headers: request.headers });
    return { ok: response.ok, message: response.ok ? '连接成功' : `HTTP ${response.status}` };
  } catch (e) { return { ok: false, message: e instanceof Error ? e.message : '连接失败' }; }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});