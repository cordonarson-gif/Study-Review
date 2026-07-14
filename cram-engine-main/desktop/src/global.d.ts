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

// ---- Phase 1: 课程生成管线类型 ----

type CourseGenerationInput = {
  sourceType: 'text' | 'pdf' | 'chat';
  topic?: string;
  documentPath?: string;
  options?: {
    totalDuration?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    audience?: string;
    focus?: string;
  };
};

type CourseMeta = {
  title: string;
  totalDuration: string;
  difficulty: string;
  audience: string;
  objectives: string[];
  createdAt: string;
};

type SceneType = 'slide-lecture' | 'interactive-quiz' | 'sim-lab' | 'pbl-project';

type Chapter = {
  id: string;
  title: string;
  duration: string;
  objectives: string[];
  sceneType: SceneType;
  knowledgePoints: string[];
  interactionNodes: number[];
};

type CourseOutline = {
  meta: CourseMeta;
  chapters: Chapter[];
};

type SlidePage = {
  index: number;
  title: string;
  bulletPoints: string[];
  imageDescription?: string;
  latexFormulas?: string[];
  voiceScript: string;
  spotlight?: { region: string; duration: number };
  laserPath?: { points: string[]; speed: number };
};

type SlideLectureScene = {
  sceneType: 'slide-lecture';
  chapterId: string;
  slides: SlidePage[];
};

type QuizItem = {
  id: string;
  type: 'single-choice' | 'multi-choice' | 'short-answer';
  knowledgePoint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stem: string;
  options?: { key: string; text: string }[];
  answer: string;
  explanation: string;
  scoringRule?: { keywords?: string[]; dimensionWeights?: Record<string, number> };
};

type QuizScene = {
  sceneType: 'interactive-quiz';
  chapterId: string;
  questions: QuizItem[];
  feedbackSystem: {
    wrongAnswerRemediation: string;
    knowledgeGapDetection: string;
    reviewPath: string;
  };
};

type SimLabScene = {
  sceneType: 'sim-lab';
  chapterId: string;
  title: string;
  description: string;
  experimentType: 'physics' | 'algorithm' | 'flowchart' | 'custom';
  htmlCode: string;
  guide: {
    objective: string;
    instructions: string[];
    reflectionQuestions: string[];
    aiNarration: string;
  };
};

type PBLRole = {
  id: string;
  name: string;
  responsibilities: string[];
  persona: string;
};

type PBLMilestone = {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  deadline: string;
};

type PBLScene = {
  sceneType: 'pbl-project';
  chapterId: string;
  title: string;
  background: string;
  finalDeliverables: string[];
  milestones: PBLMilestone[];
  roles: PBLRole[];
  collaborationFlow: {
    phases: { name: string; tasks: string[]; aiInteractions: string[] }[];
    checkpoints: string[];
  };
};

type CourseScene = SlideLectureScene | QuizScene | SimLabScene | PBLScene;

type GeneratedCourse = {
  outline: CourseOutline;
  scenes: CourseScene[];
  generatedAt: string;
};

type CourseGenerationProgress = {
  phase: 'outline' | 'scenes';
  stage: string;
  currentChapter: number;
  totalChapters: number;
  message: string;
};

// ---- Phase 2: 多智能体系统类型 ----

type AgentRole = 'teacher' | 'assistant' | 'student';
type InteractionMode = 'discussion' | 'debate' | 'qa';

type AgentPersona = {
  id: string; role: AgentRole; name: string; avatar: string;
  description: string; systemPrompt: string;
  teachingStyle?: string; knowledgeBase?: string; viewpoint?: string;
  activityLevel: 'high' | 'medium' | 'low';
};

type AgentSpeech = {
  id: string; agentId: string; agentName: string; agentRole: AgentRole;
  content: string; createdAt: string; turnIndex: number;
};

type OrchestratorState = 'idle' | 'teacher-lecturing' | 'discussion-open' |
  'discussion-nominate' | 'discussion-wrapup' | 'debate-opening' |
  'debate-statements' | 'debate-free' | 'debate-summary' | 'qa-answering' | 'qa-followup';

type DebateStance = 'affirmative' | 'negative' | 'neutral';

type AgentBinding = {
  persona: AgentPersona; stance?: DebateStance;
};

type AgentTurn = {
  turnIndex: number; speakerId: string; speeches: AgentSpeech[]; completed: boolean;
};

type AgentSession = {
  sessionId: string; projectId: string; mode: InteractionMode;
  state: OrchestratorState; agents: AgentBinding[];
  turns: AgentTurn[]; currentTurn: number;
  courseContext: string; chapterContext: string;
  studentInputQueue: string[]; createdAt: string; updatedAt: string;
};

type SessionAction = {
  type: 'start-discussion' | 'start-debate' | 'student-ask' | 'student-join' |
        'teacher-nominate' | 'teacher-wrapup' | 'next-turn' | 'switch-mode';
  payload?: {
    topic?: string; question?: string; nomineeId?: string;
    targetMode?: InteractionMode; studentStance?: DebateStance;
  };
};

type AgentActionResult = {
  session: AgentSession;
  speech: AgentSpeech | null;
};

declare global {
  interface Window {
    cramEngine: {
      selectProjectFolder: () => Promise<string | null>;
      selectUploadFiles: () => Promise<string[]>;
      getSettings: () => Promise<AppSettings>;
      saveSettings: (settings: AppSettings) => Promise<AppSettings>;
      fetchModels: () => Promise<AppSettings>;
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
      deleteKnowledgeBaseEntry: (projectId: string, entryId: string) => Promise<boolean>;
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
      // ---- Phase 1: 课程生成管线 API ----
      /** 第一阶段：生成结构化课程大纲 */
      generateCourseOutline: (input: CourseGenerationInput) => Promise<CourseOutline>;
      /** 第二阶段：按章节生成场景内容 */
      generateChapterScene: (projectId: string, chapter: Chapter) => Promise<CourseScene>;
      /** 加载项目的已生成课程 */
      loadGeneratedCourse: (projectId: string) => Promise<GeneratedCourse | null>;
      /** 保存生成的课程 */
      saveGeneratedCourse: (projectId: string, course: GeneratedCourse) => Promise<boolean>;
      // ---- Phase 2: 多智能体 API ----
      createAgentSession: (projectId: string, courseContext: string) => Promise<AgentSession>;
      executeAgentAction: (projectId: string, sessionId: string, action: SessionAction) => Promise<AgentActionResult>;
      loadAgentSession: (projectId: string) => Promise<AgentSession | null>;
      // Phase 6: 导出增强
      testConnection: () => Promise<{ ok: boolean; message: string }>;
      exportPptx: (projectId: string, courseData: any) => Promise<{ path: string }>;
      exportInteractiveHtml: (projectId: string, courseData: any) => Promise<{ path: string }>;
    };
  }
}

export {};