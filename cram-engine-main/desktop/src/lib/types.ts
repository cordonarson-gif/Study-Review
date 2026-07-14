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
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini']
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  {
    id: 'aliyun',
    label: 'Qwen (阿里云)',
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

// ================================================================
// Phase 1: 课程生成管线类型定义
// ================================================================

/** 课程生成输入源 */
export type CourseGenerationInput = {
  /** 输入类型：文本主题 / 文档路径 */
  sourceType: 'text' | 'pdf' | 'chat';
  /** 文本主题（sourceType=text 时必填） */
  topic?: string;
  /** 文档路径（sourceType=pdf 时必填） */
  documentPath?: string;
  /** 可选参数 */
  options?: {
    totalDuration?: string;   // 课程总时长，如 "30分钟"
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    audience?: string;         // 目标受众
    focus?: string;            // 侧重方向
  };
};

/** 课程元数据 */
export type CourseMeta = {
  title: string;
  totalDuration: string;
  difficulty: string;
  audience: string;
  objectives: string[];
  createdAt: string;
};

/** 场景类型枚举 */
export type SceneType = 'slide-lecture' | 'interactive-quiz' | 'sim-lab' | 'pbl-project';

/** 一个章节 */
export type Chapter = {
  id: string;
  title: string;
  duration: string;
  objectives: string[];
  sceneType: SceneType;
  knowledgePoints: string[];
  interactionNodes: number[];  // 预设互动节点位置（分钟）
};

/** 结构化课程大纲 */
export type CourseOutline = {
  meta: CourseMeta;
  chapters: Chapter[];
};

/** 单张幻灯片 */
export type SlidePage = {
  index: number;
  title: string;
  bulletPoints: string[];     // 逐条显示的内容
  imageDescription?: string;   // 配图描述
  latexFormulas?: string[];    // LaTeX 公式列表
  voiceScript: string;         // 语音旁白脚本
  spotlight?: {                // 聚光灯特效
    region: string;            // 高亮区域描述
    duration: number;          // 停留时长（秒）
  };
  laserPath?: {                // 激光笔路径
    points: string[];          // 指示点描述序列
    speed: number;             // 移动速度
  };
};

/** 幻灯片授课场景 */
export type SlideLectureScene = {
  sceneType: 'slide-lecture';
  chapterId: string;
  slides: SlidePage[];
};

/** 测验题目 */
export type QuizItem = {
  id: string;
  type: 'single-choice' | 'multi-choice' | 'short-answer';
  knowledgePoint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  stem: string;
  options?: { key: string; text: string }[];
  answer: string;
  explanation: string;
  scoringRule?: {
    keywords?: string[];         // 主观题得分关键词
    dimensionWeights?: Record<string, number>; // 评分维度权重
  };
};

/** 互动测验场景 */
export type QuizScene = {
  sceneType: 'interactive-quiz';
  chapterId: string;
  questions: QuizItem[];
  feedbackSystem: {
    wrongAnswerRemediation: string;  // 错题补救策略
    knowledgeGapDetection: string;   // 知识盲点识别策略
    reviewPath: string;              // 复习路径推荐
  };
};

/** HTML 模拟实验场景 */
export type SimLabScene = {
  sceneType: 'sim-lab';
  chapterId: string;
  title: string;
  description: string;
  experimentType: 'physics' | 'algorithm' | 'flowchart' | 'custom';
  htmlCode: string;            // 单文件 HTML/CSS/JS
  guide: {
    objective: string;         // 实验目的
    instructions: string[];    // 操作指引
    reflectionQuestions: string[]; // 思考题
    aiNarration: string;       // AI 讲解旁白
  };
};

/** PBL 项目角色 */
export type PBLRole = {
  id: string;
  name: string;
  responsibilities: string[];
  persona: string;             // 能力人设描述
};

/** PBL 里程碑 */
export type PBLMilestone = {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  acceptanceCriteria: string[];
  deadline: string;
};

/** PBL 项目制学习场景 */
export type PBLScene = {
  sceneType: 'pbl-project';
  chapterId: string;
  title: string;
  background: string;          // 主题背景
  finalDeliverables: string[]; // 最终交付物要求
  milestones: PBLMilestone[];
  roles: PBLRole[];
  collaborationFlow: {
    phases: {
      name: string;
      tasks: string[];
      aiInteractions: string[]; // AI 发言逻辑
    }[];
    checkpoints: string[];    // 进度检查点
  };
};

/** 场景联合类型 */
export type CourseScene = SlideLectureScene | QuizScene | SimLabScene | PBLScene;

/** 生成的完整课程 */
export type GeneratedCourse = {
  outline: CourseOutline;
  scenes: CourseScene[];
  generatedAt: string;
};

/** 课程生成进度回调 */
export type CourseGenerationProgress = {
  phase: 'outline' | 'scenes';
  stage: string;
  currentChapter: number;
  totalChapters: number;
  message: string;
};

// ---- 增量新增类型 ----

// ================================================================
// Phase 2: 多智能体编排系统类型定义
// ================================================================

/** 智能体角色 */
export type AgentRole = 'teacher' | 'assistant' | 'student';

/** 交互模式 */
export type InteractionMode = 'discussion' | 'debate' | 'qa';

/** 智能体人设配置 */
export type AgentPersona = {
  id: string;
  role: AgentRole;
  name: string;
  avatar: string;              // emoji 头像
  description: string;         // 一句话人设
  systemPrompt: string;        // 角色 System Prompt
  teachingStyle?: string;      // 教师专用：严谨/通俗/互动型
  knowledgeBase?: string;      // 知识基础描述（同学用）
  viewpoint?: string;          // 观点立场（辩论用）
  activityLevel: 'high' | 'medium' | 'low'; // 发言活跃度
};

/** 智能体会话消息 */
export type AgentSpeech = {
  id: string;
  agentId: string;             // 发送者 AgentPersona.id
  agentName: string;
  agentRole: AgentRole;
  content: string;
  createdAt: string;
  turnIndex: number;           // 所属轮次
};

/** 状态机状态 */
export type OrchestratorState = 
  | 'idle'                    
  | 'teacher-lecturing'        // 教师主讲中
  | 'discussion-open'          // 讨论：自由发言
  | 'discussion-nominate'      // 讨论：点名回答
  | 'discussion-wrapup'        // 讨论：教师收尾
  | 'debate-opening'           // 辩论：立论阶段
  | 'debate-statements'        // 辩论：轮流陈词
  | 'debate-free'              // 辩论：自由辩论
  | 'debate-summary'           // 辩论：总结
  | 'qa-answering'             // 问答：解答中
  | 'qa-followup';             // 问答：追问

/** 辩论立场 */
export type DebateStance = 'affirmative' | 'negative' | 'neutral';

/** 智能体绑定信息（含运行时可变的立场） */
export type AgentBinding = {
  persona: AgentPersona;
  stance?: DebateStance;       // 辩论模式下绑定，其余模式 undefined
};

/** 单次轮次记录 */
export type AgentTurn = {
  turnIndex: number;
  speakerId: string;           // 发言者 AgentPersona.id
  speeches: AgentSpeech[];     // 该轮次可以有多条发言（含学生插话）
  completed: boolean;
};

/** 智能体会话 */
export type AgentSession = {
  sessionId: string;
  projectId: string;
  mode: InteractionMode;
  state: OrchestratorState;
  agents: AgentBinding[];      // 参与会话的所有智能体
  turns: AgentTurn[];          // 历史轮次
  currentTurn: number;
  courseContext: string;       // 课程背景
  chapterContext: string;      // 当前章节背景
  studentInputQueue: string[]; // 学生输入队列
  createdAt: string;
  updatedAt: string;
};

/** 会话操作输入 */
export type SessionAction = {
  type: 'start-discussion' | 'start-debate' | 'student-ask' | 'student-join' | 
        'teacher-nominate' | 'teacher-wrapup' | 'next-turn' | 'switch-mode';
  payload?: {
    topic?: string;            // 讨论/辩论议题
    question?: string;         // 学生问题
    nomineeId?: string;        // 被点名智能体 ID
    targetMode?: InteractionMode;
    studentStance?: DebateStance; // 学生选择的辩论立场
  };
};

/** 预置的默认智能体角色模板 */
export const defaultAgentPersonas: AgentPersona[] = [
  {
    id: 'agent-teacher',
    role: 'teacher',
    name: '张老师',
    avatar: '👨‍🏫',
    description: '经验丰富的主讲教师，善于深入浅出',
    systemPrompt: '你是课程主讲教师。负责讲解知识点、发起讨论、点评学生发言、总结归纳。教学风格通俗易懂，善用比喻和案例。',
    teachingStyle: '通俗',
    activityLevel: 'high'
  },
  {
    id: 'agent-assistant',
    role: 'assistant',
    name: '小助',
    avatar: '🤖',
    description: 'AI 助教，负责答疑和整理资料',
    systemPrompt: '你是课程助教。负责辅助答疑、整理课堂笔记、推送学习资料，回答学生基础问题。',
    activityLevel: 'medium'
  },
  {
    id: 'agent-student-a',
    role: 'student',
    name: '小明',
    avatar: '🧑‍🎓',
    description: '勤奋好学的学生，基础扎实',
    systemPrompt: '你是一名勤奋好学的学生，基础知识扎实但偶尔有困惑。课堂上积极提问，喜欢追问为什么。',
    knowledgeBase: '基础扎实，对概念理解较深',
    activityLevel: 'high'
  },
  {
    id: 'agent-student-b',
    role: 'student',
    name: '小红',
    avatar: '👩‍🎓',
    description: '思维活跃的学生，擅长发散思考',
    systemPrompt: '你是一名思维活跃的学生，喜欢从不同角度思考问题，经常提出独特的见解和联想。',
    knowledgeBase: '知识面广，联想能力强',
    activityLevel: 'medium'
  },
  {
    id: 'agent-student-c',
    role: 'student',
    name: '小刚',
    avatar: '🧑‍💻',
    description: '实践型学生，动手能力强',
    systemPrompt: '你是一名实践型学生，喜欢从应用角度理解知识。经常问"这个怎么用"和"实际场景中怎么处理"。',
    knowledgeBase: '动手能力强，关注实际应用',
    activityLevel: 'medium'
  }
];

// ================================================================
// Phase 3: 交互模式增强类型
// ================================================================

/** 思维导图节点 */
export type MindMapNode = {
  id: string;
  label: string;
  children: MindMapNode[];
  color?: string; // 节点颜色
};

/** 辩论反驳记录 */
export type Rebuttal = {
  id: string;
  fromAgentId: string;  // 反驳者
  toAgentId: string;    // 被反驳者
  content: string;      // 反驳内容
  turnIndex: number;
  createdAt: string;
};

// ================================================================
// Phase 4: 多模态前端类型
// ================================================================

/** 统一动作协议 */
export type ClassroomAction =
  | { type: 'speech-play'; text: string }
  | { type: 'speech-pause' }
  | { type: 'slide-next' }
  | { type: 'slide-prev' }
  | { type: 'slide-goto'; index: number }
  | { type: 'spotlight-on'; x: number; y: number; width: number; height: number }
  | { type: 'spotlight-off' }
  | { type: 'laser-move'; x: number; y: number }
  | { type: 'bullet-reveal'; index: number }
  | { type: 'whiteboard-draw'; element: WhiteboardElement }
  | { type: 'whiteboard-clear' }
  | { type: 'quiz-show' }
  | { type: 'quiz-submit' }
  | { type: 'effect-highlight'; selector: string }
  | { type: 'effect-transition'; direction: 'fade' | 'slide' };

/** 白板元素 */
export type WhiteboardElement = {
  id: string;
  type: 'line' | 'rect' | 'circle' | 'text' | 'arrow' | 'freehand';
  x: number; y: number;
  width?: number; height?: number;
  endX?: number; endY?: number;
  text?: string;
  color: string;
  strokeWidth: number;
};

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