import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import type {
  AgentMessage,
  AppSettings,
  ChatTurn,
  CreateProjectInput,
  DeliveryPackage,
  ExportResult,
  ProjectDetail,
  ProjectMeta,
  ProjectSourceFile,
  KnowledgeBaseEntry,
  KnowledgeResource,
  LearningProfile,
  LearningProfileState,
  GeneratePersonalizedResourcesInput,
  GenerateLearningPathInput,
  LearningPathPlan,
  PersonalizedResource,
  StageReport,
  QuestionDraft,
  ReviewQuestion,
  ProjectSortKey,
  ProjectMode,
  WizardField,
  ModeArtifact,
  GenerateModeArtifactInput,
  WorkspaceTabId
} from '../lib/types';
import { defaultSettings, examOptions } from '../lib/types';
import { sanitizeRichHtml } from '../lib/richContent.js';
import { createEmptyChatGreeting, formatDate, getActiveProviderProfile } from '../lib/utils';
import { findConfiguredProvider, getSelectableModels } from '../lib/providerSettings.js';
import { getProjectModeDisplay } from '../lib/projectDisplay';
import { appendWizardFileList, appendWizardValue, resolveWizardQuestionImportText } from '../lib/wizardImports.js';
import { buildWizardProjectPayload, canCreateWizardProject, getWizardStepError, validateWizardProject } from '../lib/wizardProject.js';
import { getProjectModeTemplate, getWorkspaceTabsForMode, isModeTab, projectModeTemplates } from '../lib/projectModes';
import ProjectListPanel from '../components/ProjectListPanel';
import QuestionImportPanel from '../components/QuestionImportPanel';
import PracticePanel from '../components/PracticePanel';
import { AgentOrchestrationPage } from '../components/agents/AgentOrchestrationPage';
import { LearningProfilePage } from '../components/profile/LearningProfilePage';
import { LearningPathPage } from '../components/path/LearningPathPage';
import { StageReportPage } from '../components/report/StageReportPage';
import { PersonalizedResourcesPage } from '../components/resources/PersonalizedResourcesPage';
import { DeliveryPackagePage } from '../components/delivery/DeliveryPackagePage';
import { SimulationWorkbenchPage } from '../components/modes/SimulationWorkbenchPage';
import { KnowledgeGraphPage } from '../components/modes/KnowledgeGraphPage';
import { CoursewareStudioPage } from '../components/modes/CoursewareStudioPage';
import { TeachingGamePage } from '../components/modes/TeachingGamePage';
import { ModeModulePage } from '../components/modes/ModeModulePage';
import { ProjectModeSelector } from '../components/modes/ProjectModeSelector';
import { HelpCenterPage } from '../components/help/HelpCenterPage';
import ProviderSettingsPage from '../components/settings/ProviderSettingsPage';

type ViewMode = 'home' | 'wizard' | 'workspace' | 'settings' | 'export' | 'help';
type EditorTab = WorkspaceTabId;
type WizardStep = 1 | 2 | 3;
type TopnavShortcutId = 'modes' | 'materials' | 'workspace' | 'delivery';
type AiTab = 'chat' | 'history' | 'reference';
type SelectionAskState = { text: string; x: number; y: number } | null;

type WizardState = {
  mode: ProjectMode;
  modeConfig: Record<string, string>;
  name: string;
  courseName: string;
  linkedFolder: string;
  examType: string;
  textbook: string;
  notes: string;
  requirements: string;
  mustKnow: string;
  keyPoints: string;
  initialQuestionText: string;
  provider: string;
  model: string;
};

const initialWizardState: WizardState = {
  mode: 'exam-review',
  modeConfig: {},
  name: '',
  courseName: '',
  linkedFolder: '',
  examType: examOptions[0],
  textbook: '',
  notes: '',
  requirements: '',
  mustKnow: '',
  keyPoints: '',
  initialQuestionText: '',
  provider: defaultSettings.activeProviderId,
  model: getActiveProviderProfile(defaultSettings).selectedModelId
};

const wizardFieldLabels: Partial<Record<keyof WizardState, string>> = {
  textbook: '教材',
  notes: '备注',
  requirements: '补充要求',
  mustKnow: '必考点',
  keyPoints: '重点知识',
  initialQuestionText: '初始题目'
};

function isQuestionOrientedMode(mode: ProjectMode) {
  return ['exam-review', 'assignment-quiz', 'teaching-game', 'mistake-collection'].includes(mode);
}

function getWizardStepLabels(mode: ProjectMode) {
  return isQuestionOrientedMode(mode)
    ? ['项目信息', '出题要求', '题目导入']
    : ['项目信息', '工作目标', '素材导入'];
}

type WizardStringField = 'name' | 'courseName' | 'examType' | 'textbook' | 'requirements';

const wizardStringFields = new Set<WizardStringField>(['name', 'courseName', 'examType', 'textbook', 'requirements']);
const handledWizardFieldKeys = new Set(['name', 'requirements', 'notes', 'textbook']);
const specializedModeTabs = new Set<WorkspaceTabId>([
  'simulation-run',
  'graph-view',
  'courseware-preview',
  'game-bank',
  'game-preview',
  'mistakes-import',
  'mistakes-review',
  'mistakes-practice'
]);

const homeModeHighlights = projectModeTemplates;

const homeCapabilities = [
  {
    title: '学习复习',
    detail: '期末复习、错题集、个性化资源、学习路径和阶段报告形成复习闭环。'
  },
  {
    title: '论文与科研',
    detail: '论文助手、科研数据分析、科研创新工作台覆盖选题、文献、数据、创新点和报告。'
  },
  {
    title: '教学设计',
    detail: '教学设计、互动课件、虚拟教师和学生发展规划支持备课、辅导和培养方案。'
  },
  {
    title: '测评与活动',
    detail: '作业出题批改、在线测验、教学游戏和知识图谱帮助构建可复用课堂活动。'
  }
];

const homeWorkflow = [
  { title: '配置服务', detail: '先配置 API、模型、MinerU 和 LaTeX 环境。' },
  { title: '选择模式', detail: '从 16 类项目模式中选择学习、科研、教学或测评方向。' },
  { title: '生成成果', detail: '在工作台生成资料、题库、课件、图谱、仿真或研究成果。' },
  { title: '交付导出', detail: '检查交付清单，导出 Markdown 和 JSON 成果包。' }
];

const topnavShortcuts: Array<{ id: TopnavShortcutId; label: string; title: string }> = [
  { id: 'modes', label: '项目模式', title: '查看 16 类项目模板并创建新项目' },
  { id: 'materials', label: '资料识别', title: '进入当前项目的资料上传、图片预览和文档识别' },
  { id: 'workspace', label: '智能工作台', title: '进入当前项目的核心工作台' },
  { id: 'delivery', label: '交付中心', title: '检查成果清单并导出交付包' }
];

function isWizardStringField(key: string): key is WizardStringField {
  return wizardStringFields.has(key as WizardStringField);
}

function toAgentMessages(project: ProjectDetail | null) {
  if (!project?.chatHistory?.length) {
    return createEmptyChatGreeting(project?.meta.name);
  }
  return project.chatHistory.map((turn) => ({
    role: turn.role,
    content: turn.content,
    createdAt: turn.createdAt,
    model: turn.model
  }));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkdown(content: string) {
  return marked.parse(content, { breaks: true, gfm: true }) as string;
}

function renderLatexBlocks(content: string) {
  const withBlockLatex = content.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => {
    return `<div class="latex-block"><code>${escapeHtml(formula.trim())}</code></div>`;
  });
  return withBlockLatex.replace(/\$([^$\n]+?)\$/g, (_match, formula: string) => {
    return `<span class="latex-inline"><code>${escapeHtml(formula.trim())}</code></span>`;
  });
}

function renderRichContent(content: string) {
  return renderLatexBlocks(sanitizeRichHtml(renderMarkdown(content)));
}

function ChatBubble({ content }: { content: string }) {
  return (
    <div
      className="chat-bubble chat-rich-content"
      dangerouslySetInnerHTML={{ __html: renderRichContent(content) }}
    />
  );
}

function UploadImagePreview({ projectId, upload }: { projectId: string; upload: ProjectSourceFile }) {
  const [dataUrl, setDataUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setDataUrl('');
    setFailed(false);

    if (upload.kind !== 'image') return () => {
      active = false;
    };

    const ce = window.cramEngine;
    ce.getUploadDataUrl(projectId, upload.storedPath)
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [projectId, upload.kind, upload.storedPath]);

  if (upload.kind !== 'image') return null;
  if (failed) return <div className="upload-image-fallback">图片预览加载失败</div>;
  if (!dataUrl) return <div className="upload-image-fallback">图片预览加载中...</div>;

  return <img className="upload-image-preview" src={dataUrl} alt={upload.name} loading="lazy" />;
}

function seededQuestionWeight(value: string, seed: number) {
  let hash = seed || 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function KnowledgeResourceList({
  resources,
  onOpen
}: {
  resources: KnowledgeResource[];
  onOpen: (resource: KnowledgeResource) => void;
}) {
  return (
    <div className="materials-resource-panel">
      <div className="materials-resource-header">
        <div>
          <div className="subsection-title">知识点拓展</div>
          <span className="muted">按当前知识库标签推荐外部资源</span>
        </div>
        <span className="upload-kind">{resources.length} 条</span>
      </div>
      <div className="materials-resource-list">
        {resources.map((resource) => (
          <button
            key={resource.id}
            className={resource.read ? 'materials-resource-card read' : 'materials-resource-card'}
            onClick={() => onOpen(resource)}
          >
            <div className="materials-resource-card-top">
              <span className="upload-kind">{resource.platform}</span>
              {resource.read && <em>已读</em>}
            </div>
            <strong className="materials-card-title">{resource.title}</strong>
            <small>{resource.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function FutureModulePage({
  title,
  description,
  items
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <section className="panel project-single-page future-module-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{title}</div>
          <h3>{description}</h3>
          <p className="muted">该模块已预留为独立页面，后续阶段会接入真实数据流和可执行动作。</p>
        </div>
      </div>
      <div className="future-module-grid">
        {items.map((item, index) => (
          <div className="future-module-card" key={item}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatLatexStatusLabel(latexStatus: {
  available: boolean;
  engine: string;
  path: string | null;
  distribution?: string;
  message?: string;
} | null) {
  if (!latexStatus) return '检测中';
  if (!latexStatus.available) return latexStatus.message || '未安装';
  const engineLabel = latexStatus.distribution && latexStatus.distribution !== 'LaTeX'
    ? latexStatus.distribution
    : latexStatus.engine;
  return `${latexStatus.message || '配置成功'} · ${engineLabel}`;
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null);
  const [learningProfileState, setLearningProfileState] = useState<LearningProfileState | null>(null);
  const [personalizedResources, setPersonalizedResources] = useState<PersonalizedResource[]>([]);
  const [learningPathPlan, setLearningPathPlan] = useState<LearningPathPlan | null>(null);
  const [stageReports, setStageReports] = useState<StageReport[]>([]);
  const [deliveryPackage, setDeliveryPackage] = useState<DeliveryPackage | null>(null);
  const [modeArtifacts, setModeArtifacts] = useState<ModeArtifact[]>([]);
  const [editorTab, setEditorTab] = useState<EditorTab>('overview');
  const [configText, setConfigText] = useState('');
  const [progressText, setProgressText] = useState('');
  const [status, setStatus] = useState('模型已连接');
  const [wizard, setWizard] = useState<WizardState>(initialWizardState);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>(createEmptyChatGreeting());
  const [agentInput, setAgentInput] = useState('');
  const [latexStatus, setLatexStatus] = useState<{
    available: boolean;
    engine: string;
    path: string | null;
    distribution?: string;
    message?: string;
    installRequired?: boolean;
  } | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isChatSending, setIsChatSending] = useState(false);
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionDrafts, setQuestionDrafts] = useState<QuestionDraft[]>([]);
  const [importSource, setImportSource] = useState<'text' | 'file'>('text');
  const [isParsingQuestions, setIsParsingQuestions] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'category' | 'random' | 'wrong'>('category');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [knowledgeResources, setKnowledgeResources] = useState<KnowledgeResource[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isChoosingLinkedFolder, setIsChoosingLinkedFolder] = useState(false);
  const [wizardFileAction, setWizardFileAction] = useState<string | null>(null);
  const [projectSortKey, setProjectSortKey] = useState<ProjectSortKey>('lastOpened');
  const [projectSummaries, setProjectSummaries] = useState<Record<string, { questionCount: number; knowledgeBaseCount: number; progressPercent: number }>>({});
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiTab, setAiTab] = useState<AiTab>('chat');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [selectionAsk, setSelectionAsk] = useState<SelectionAskState>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const ce = (window as any).cramEngine;

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', captureInternalSelection);
    document.addEventListener('keyup', captureInternalSelection);
    document.addEventListener('scroll', clearSelectionAsk, true);
    return () => {
      document.removeEventListener('mouseup', captureInternalSelection);
      document.removeEventListener('keyup', captureInternalSelection);
      document.removeEventListener('scroll', clearSelectionAsk, true);
    };
  }, [activeProject?.meta.id]);

  /** 加载项目统计摘要（用于侧边栏展示） */
  useEffect(() => {
    void (async () => {
      const map: Record<string, { questionCount: number; knowledgeBaseCount: number; progressPercent: number }> = {};
      for (const p of projects) {
        try {
          map[p.id] = await ce.getProjectSummary(p.id);
        } catch {
          map[p.id] = { questionCount: 0, knowledgeBaseCount: 0, progressPercent: 0 };
        }
      }
      setProjectSummaries(map);
    })();
  }, [projects]);

  async function bootstrap() {
    const [loadedSettings, loadedProjects, loadedLatex] = await Promise.all([
      ce.getSettings(),
      ce.listProjects(),
      ce.checkLatex()
    ]);
    setSettings(loadedSettings);
    setProjects(loadedProjects);
    setLatexStatus(loadedLatex);
    const activeProfile = getActiveProviderProfile(loadedSettings);
    setStatus(activeProfile.apiKey ? '模型已连接' : '请先在设置中配置 API Key');
  }

  const currentProvider = useMemo(() => getActiveProviderProfile(settings), [settings]);
  const selectableModels = useMemo(() => getSelectableModels(settings.providers), [settings.providers]);
  const configuredProvider = useMemo(
    () => findConfiguredProvider(settings.providers, settings.activeProviderId),
    [settings.providers, settings.activeProviderId]
  );
  const currentModelLabel = useMemo(() => {
    const provider = configuredProvider ?? currentProvider;
    const model = provider.models.find((item) => item.id === provider.selectedModelId);
    return model?.label || provider.selectedModelId || '未选择模型';
  }, [configuredProvider, currentProvider]);
  const settingsHasApiKey = Boolean(configuredProvider);
  const apiStatusLabel = configuredProvider ? configuredProvider.label : 'API Key 未填写';
  const latexStatusLabel = useMemo(() => formatLatexStatusLabel(latexStatus), [latexStatus]);
  const selectedWizardTemplate = useMemo(() => getProjectModeTemplate(wizard.mode), [wizard.mode]);
  const wizardStepLabels = getWizardStepLabels(wizard.mode);
  const activeProjectTemplate = useMemo(() => getProjectModeTemplate(activeProject?.meta.mode), [activeProject?.meta.mode]);
  const activeWorkspaceTabs = useMemo(
    () => getWorkspaceTabsForMode(activeProject?.meta.mode),
    [activeProject?.meta.mode]
  );

  const availableProjectModels = useMemo(() => {
    if (!activeProject) return selectableModels;
    const projectProfiles = settings.providers.filter((profile) =>
      profile.id === activeProject.meta.provider || profile.provider === activeProject.meta.provider
    );
    const allowedProviderIds = new Set(projectProfiles.map((profile) => profile.id));
    const options = selectableModels.filter((model) => allowedProviderIds.has(model.providerId));
    if (options.some((model) => model.id === activeProject.meta.model)) return options;
    return [
      ...options,
      {
        providerId: activeProject.meta.provider,
        id: activeProject.meta.model,
        label: '当前项目模型（已隐藏）'
      }
    ];
  }, [settings.providers, selectableModels, activeProject]);

  const filteredKnowledgeBase = useMemo<KnowledgeBaseEntry[]>(() => {
    if (!activeProject) return [];
    const query = knowledgeQuery.trim().toLowerCase();
    if (!query) return activeProject.knowledgeBase;
    return activeProject.knowledgeBase.filter((entry) => {
      const haystacks = [entry.title, entry.summary, entry.source, ...(entry.tags ?? [])]
        .join('\n')
        .toLowerCase();
      return haystacks.includes(query);
    });
  }, [activeProject, knowledgeQuery]);

  const filteredChatHistory = useMemo(() => {
    const history = activeProject?.chatHistory ?? [];
    const query = chatSearchQuery.trim().toLowerCase();
    if (!query) return history;
    return history.filter((turn) => {
      return [turn.role, turn.content, turn.model ?? '', turn.createdAt]
        .join('\n')
        .toLowerCase()
        .includes(query);
    });
  }, [activeProject?.chatHistory, chatSearchQuery]);

  const canSubmitWizardProject = useMemo(() => {
    return canCreateWizardProject(wizard) && !isCreatingProject;
  }, [wizard, isCreatingProject]);

  const questionCategories = useMemo(() => {
    if (!activeProject) return ['全部'];
    return ['全部', ...Array.from(new Set(activeProject.questions.map((question) => question.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
  }, [activeProject]);

  const practiceQuestions = useMemo<ReviewQuestion[]>(() => {
    if (!activeProject) return [];
    const questions = practiceMode === 'wrong'
      ? activeProject.questions.filter((question) => question.wrong)
      : selectedCategory === '全部'
        ? activeProject.questions
        : activeProject.questions.filter((question) => question.category === selectedCategory);
    if (practiceMode !== 'random') return questions;
    return [...questions].sort((left, right) => {
      return seededQuestionWeight(left.id, shuffleSeed) - seededQuestionWeight(right.id, shuffleSeed);
    });
  }, [activeProject, practiceMode, selectedCategory, shuffleSeed]);

  const activeQuestion = practiceQuestions[practiceIndex] ?? null;

  useEffect(() => {
    setPracticeIndex(0);
    setAnswerVisible(false);
  }, [practiceMode, selectedCategory, activeProject?.meta.id]);

  useEffect(() => {
    if (!activeQuestion || !activeProject) {
      setKnowledgeResources([]);
      return;
    }
    void loadKnowledgeResources(activeQuestion.knowledgePoint);
  }, [activeQuestion?.id, activeProject?.meta.id]);

  // ---- 所有业务逻辑函数保持不变 ----

  async function openProject(projectId: string) {
    const detail = await ce.openProject(projectId);
    const profileState = detail.learningProfile ?? await ce.getLearningProfile(projectId);
    const generatedResources = detail.personalizedResources ?? await ce.listPersonalizedResources(projectId);
    const pathPlan = detail.learningPathPlan ?? await ce.getLearningPathPlan(projectId);
    const reports = detail.stageReports ?? await ce.listStageReports(projectId);
    const delivery = detail.deliveryPackage ?? await ce.getDeliveryPackage(projectId);
    const artifacts = detail.modeArtifacts ?? await ce.listModeArtifacts(projectId);
    setActiveProject({ ...detail, deliveryPackage: delivery, modeArtifacts: artifacts });
    setLearningProfileState(profileState);
    setPersonalizedResources(generatedResources);
    setLearningPathPlan(pathPlan);
    setStageReports(reports);
    setDeliveryPackage(delivery);
    setModeArtifacts(artifacts);
    setConfigText(detail.configYaml);
    setProgressText(detail.progressMarkdown);
    setChatMessages(toAgentMessages(detail));
    setChatSearchQuery('');
    setStatus(`已进入项目：${detail.meta.name}`);
    setViewMode('workspace');
    setExportResult(null);
    setEditorTab(getWorkspaceTabsForMode(detail.meta.mode)[0]?.id ?? 'overview');
    setProjects(await ce.listProjects());
  }

  async function renameProject(project: ProjectMeta) {
    const nextName = window.prompt('请输入新的项目名称', project.name);
    if (!nextName?.trim()) return;
    const updatedMeta = await ce.renameProject(project.id, nextName.trim());
    setProjects(await ce.listProjects());
    if (activeProject?.meta.id === project.id) {
      setActiveProject({ ...activeProject, meta: updatedMeta });
    }
    setStatus(`项目已重命名为：${updatedMeta.name}`);
  }

  async function deleteProject(project: ProjectMeta) {
    const confirmed = window.confirm(`确定删除项目「${project.name}」吗？项目内题目、分类、进度和知识库都会移除。`);
    if (!confirmed) return;
    await ce.deleteProject(project.id);
    setProjects(await ce.listProjects());
    if (activeProject?.meta.id === project.id) {
      setActiveProject(null);
      setLearningProfileState(null);
      setPersonalizedResources([]);
      setLearningPathPlan(null);
      setStageReports([]);
      setDeliveryPackage(null);
      setModeArtifacts([]);
      setChatMessages(createEmptyChatGreeting());
      setChatSearchQuery('');
      setViewMode('home');
    }
    setStatus(`已删除项目：${project.name}`);
  }

  async function createProject() {
    const validationError = validateWizardProject(wizard);
    if (validationError) {
      setWizardStep(1);
      setStatus(validationError);
      showToast(validationError);
      return;
    }

    setIsCreatingProject(true);
    try {
      const initialQuestions = isQuestionOrientedMode(wizard.mode) && wizard.initialQuestionText.trim()
        ? await ce.previewQuestionsFromText(wizard.initialQuestionText, 'text', '????????')
        : [];
      const payload: CreateProjectInput = buildWizardProjectPayload(wizard, initialQuestions);
      const detail = await ce.createProject(payload);
      const nextProjects = await ce.listProjects();
      setProjects(nextProjects);
      const delivery = detail.deliveryPackage ?? await ce.getDeliveryPackage(detail.meta.id);
      const artifacts = detail.modeArtifacts ?? await ce.listModeArtifacts(detail.meta.id);
      setActiveProject({ ...detail, deliveryPackage: delivery, modeArtifacts: artifacts });
      setLearningProfileState(detail.learningProfile ?? await ce.getLearningProfile(detail.meta.id));
      setPersonalizedResources(detail.personalizedResources ?? await ce.listPersonalizedResources(detail.meta.id));
      setLearningPathPlan(detail.learningPathPlan ?? await ce.getLearningPathPlan(detail.meta.id));
      setStageReports(detail.stageReports ?? await ce.listStageReports(detail.meta.id));
      setDeliveryPackage(delivery);
      setModeArtifacts(artifacts);
      setConfigText(detail.configYaml);
      setProgressText(detail.progressMarkdown);
      setChatMessages(toAgentMessages(detail));
      setChatSearchQuery('');
      setWizard(initialWizardState);
      setWizardStep(1);
      setViewMode('workspace');
      setEditorTab(getWorkspaceTabsForMode(detail.meta.mode)[0]?.id ?? 'overview');
      setStatus(`??????${detail.meta.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '??????');
    } finally {
      setIsCreatingProject(false);
    }
  }

  async function chooseLinkedFolder() {
    setIsChoosingLinkedFolder(true);
    try {
      const folder = await ce.selectProjectFolder();
      if (!folder) {
        setStatus('???????');
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        linkedFolder: folder,
        courseName: current.courseName || folder.split(/[\/]/).filter(Boolean).at(-1) || ''
      }));
      setStatus(`??????${folder}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '??????');
    } finally {
      setIsChoosingLinkedFolder(false);
    }
  }

  async function saveSettings(nextSettings: AppSettings) {
    const saved = await ce.saveSettings(nextSettings);
    setSettings(saved);
    const activeProfile = getActiveProviderProfile(saved);
    setWizard((current: WizardState) => ({
      ...current,
      provider: activeProfile.id,
      model: activeProfile.selectedModelId || current.model
    }));
    setStatus('???????');
    return saved;
  }

  async function discardSettings() {
    const loaded = await ce.getSettings();
    setSettings(loaded);
    setStatus('??????????');
    return loaded;
  }

  async function updateActiveProjectModel(model: string) {
    if (!activeProject) return;
    const updatedMeta = await ce.updateProjectModel(activeProject.meta.id, model);
    setActiveProject({ ...activeProject, meta: updatedMeta });
    setProjects((current: ProjectMeta[]) => current.map((project) => project.id === updatedMeta.id ? updatedMeta : project));
    setStatus(`已切换项目聊天模型：${model}`);
  }

  async function saveProjectConfig() {
    if (!activeProject) return;
    await ce.saveProjectConfig(activeProject.meta.id, configText);
    setStatus(`已保存 ${activeProject.meta.name} 的课程配置`);
  }

  async function saveProjectProgress() {
    if (!activeProject) return;
    await ce.saveProjectProgress(activeProject.meta.id, progressText);
    setStatus(`已保存 ${activeProject.meta.name} 的学习进度`);
  }

  async function saveLearningProfile(profile: LearningProfile) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.saveLearningProfile(activeProject.meta.id, profile);
    setLearningProfileState(next);
    setActiveProject({ ...activeProject, learningProfile: next });
    return next;
  }

  async function analyzeLearningProfile(input: string) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.analyzeLearningProfile(activeProject.meta.id, input);
    setLearningProfileState(next);
    setActiveProject({ ...activeProject, learningProfile: next });
    return next;
  }

  async function generatePersonalizedResources(input: GeneratePersonalizedResourcesInput) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.generatePersonalizedResources(activeProject.meta.id, input);
    setPersonalizedResources(next);
    setActiveProject({ ...activeProject, personalizedResources: next });
    return next;
  }

  async function savePersonalizedResource(resource: PersonalizedResource) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.savePersonalizedResource(activeProject.meta.id, resource);
    setPersonalizedResources(next);
    setActiveProject({ ...activeProject, personalizedResources: next });
    return next;
  }

  async function deletePersonalizedResource(resourceId: string) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.deletePersonalizedResource(activeProject.meta.id, resourceId);
    setPersonalizedResources(next);
    setActiveProject({ ...activeProject, personalizedResources: next });
    return next;
  }

  async function generateLearningPathPlan(input: GenerateLearningPathInput) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.generateLearningPathPlan(activeProject.meta.id, input);
    setLearningPathPlan(next);
    setActiveProject({ ...activeProject, learningPathPlan: next });
    return next;
  }

  async function saveLearningPathPlan(plan: LearningPathPlan) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.saveLearningPathPlan(activeProject.meta.id, plan);
    setLearningPathPlan(next);
    setActiveProject({ ...activeProject, learningPathPlan: next });
    return next;
  }

  async function generateStageReport() {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.generateStageReport(activeProject.meta.id);
    setStageReports(next);
    setActiveProject({ ...activeProject, stageReports: next });
    return next;
  }

  async function saveStageReport(report: StageReport) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.saveStageReport(activeProject.meta.id, report);
    setStageReports(next);
    setActiveProject({ ...activeProject, stageReports: next });
    return next;
  }

  async function generateDeliveryPackage() {
    if (!activeProject) throw new Error('璇峰厛鎵撳紑椤圭洰');
    const next = await ce.generateDeliveryPackage(activeProject.meta.id);
    setDeliveryPackage(next);
    setActiveProject({ ...activeProject, deliveryPackage: next });
    return next;
  }

  async function saveDeliveryPackage(deliveryPackage: DeliveryPackage) {
    if (!activeProject) throw new Error('璇峰厛鎵撳紑椤圭洰');
    const next = await ce.saveDeliveryPackage(activeProject.meta.id, deliveryPackage);
    setDeliveryPackage(next);
    setActiveProject({ ...activeProject, deliveryPackage: next });
    return next;
  }

  async function exportDeliveryPackage() {
    if (!activeProject) throw new Error('璇峰厛鎵撳紑椤圭洰');
    const result = await ce.exportDeliveryPackage(activeProject.meta.id);
    const next = await ce.getDeliveryPackage(activeProject.meta.id);
    setDeliveryPackage(next);
    setActiveProject({ ...activeProject, deliveryPackage: next });
    setExportResult(result);
    setStatus(`成果交付包已导出：${result.markdownPath}`);
    return result;
  }

  async function generateModeArtifact(input: GenerateModeArtifactInput) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.generateModeArtifact(activeProject.meta.id, input);
    setModeArtifacts(next);
    setActiveProject({ ...activeProject, modeArtifacts: next });
    return next;
  }

  async function saveModeArtifact(artifact: ModeArtifact) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.saveModeArtifact(activeProject.meta.id, artifact);
    setModeArtifacts(next);
    setActiveProject({ ...activeProject, modeArtifacts: next });
    return next;
  }

  async function deleteModeArtifact(artifactId: string) {
    if (!activeProject) throw new Error('请先打开项目');
    const next = await ce.deleteModeArtifact(activeProject.meta.id, artifactId);
    setModeArtifacts(next);
    setActiveProject({ ...activeProject, modeArtifacts: next });
    return next;
  }

  async function importFiles() {
    if (!activeProject) return;
    const selected = await ce.selectUploadFiles();
    if (!selected.length) return;
    const uploads = await ce.importProjectFiles(activeProject.meta.id, selected);
    setActiveProject({ ...activeProject, uploads });
    const imageCount = uploads.filter((upload: ProjectSourceFile) => upload.kind === 'image').length;
    setStatus(`已导入 ${selected.length} 个素材；当前共 ${uploads.length} 条，其中图片 ${imageCount} 条。`);
  }

  async function previewTextQuestions() {
    if (!questionText.trim()) return;
    setIsParsingQuestions(true);
    try {
      const drafts = await ce.previewQuestionsFromText(questionText, 'text', '文本粘贴');
      setQuestionDrafts(drafts);
      setImportSource('text');
      setStatus(`已识别 ${drafts.length} 道题目，可在预览区修正后入库。`);
    } finally {
      setIsParsingQuestions(false);
    }
  }

  async function previewFileQuestions() {
    const selected = await ce.selectUploadFiles();
    if (!selected.length) return;
    setIsParsingQuestions(true);
    try {
      const drafts = await ce.previewQuestionsFromFiles(selected);
      setQuestionDrafts(drafts);
      setImportSource('file');
      setStatus(`已从 ${selected.length} 个文件/图片中识别 ${drafts.length} 道题目，可修正后入库。`);
    } finally {
      setIsParsingQuestions(false);
    }
  }

  async function confirmQuestionDrafts() {
    if (!activeProject || !questionDrafts.length) return;
    const questions = await ce.addQuestions(activeProject.meta.id, questionDrafts);
    setActiveProject({ ...activeProject, questions });
    setQuestionDrafts([]);
    setQuestionText('');
    setEditorTab('practice');
    setStatus(`已写入 ${questions.length} 道题目，题库按知识点和题型自动归档。`);
  }

  function updateQuestionDraft(index: number, patch: Partial<QuestionDraft>) {
    setQuestionDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...patch } : draft));
  }

  async function saveQuestionState(question: ReviewQuestion, patch: Partial<ReviewQuestion>) {
    if (!activeProject) return;
    const questions = await ce.updateQuestion(activeProject.meta.id, { ...question, ...patch });
    setActiveProject({ ...activeProject, questions });
  }

  async function loadKnowledgeResources(knowledgePoint: string) {
    if (!activeProject) return;
    const resources = await ce.getKnowledgeResources(activeProject.meta.id, knowledgePoint);
    setKnowledgeResources(resources);
  }

  async function openResource(resource: KnowledgeResource) {
    if (!activeProject) return;
    const resources = await ce.openKnowledgeResource(activeProject.meta.id, resource);
    setActiveProject({ ...activeProject, resources });
    setKnowledgeResources((current) => current.map((item) => item.id === resource.id ? { ...item, read: true } : item));
  }

  function clearSelectionAsk() {
    setSelectionAsk(null);
  }

  function captureInternalSelection(event?: Event) {
    if (!activeProject) {
      clearSelectionAsk();
      return;
    }

    const target = event?.target instanceof Element ? event.target : document.activeElement;
    if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) {
      clearSelectionAsk();
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, ' ').trim() ?? '';
    if (!selection || text.length < 2) {
      clearSelectionAsk();
      return;
    }

    const anchorElement = selection.anchorNode instanceof Element
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
    const internalSurface = anchorElement?.closest('.main-scroll, .ai-drawer-body');
    if (!internalSurface) {
      clearSelectionAsk();
      return;
    }

    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      clearSelectionAsk();
      return;
    }

    setSelectionAsk({
      text: text.slice(0, 1200),
      x: Math.min(Math.max(rect.right - 142, 12), window.innerWidth - 174),
      y: Math.max(rect.top - 44, 72)
    });
  }

  function askAiAboutSelection() {
    if (!activeProject || !selectionAsk?.text) {
      showToast('请先打开项目，再框选内容提问');
      clearSelectionAsk();
      return;
    }
    setAgentInput(`请结合当前项目解释这段内容，并给出可以继续追问的方向：\n\n${selectionAsk.text}`);
    setAiDrawerOpen(true);
    setAiTab('chat');
    clearSelectionAsk();
    window.getSelection()?.removeAllRanges();
  }

  function continueFromHistory(turn: AgentMessage | ChatTurn) {
    setAgentInput(`继续基于这条历史对话追问：\n\n${turn.content}\n\n我的新问题是：`);
    setAiDrawerOpen(true);
    setAiTab('chat');
    showToast('已载入历史内容，可继续追问');
  }

  async function exportProject() {
    if (!activeProject) return;
    const result = await ce.exportProject(activeProject.meta.id);
    setExportResult(result);
    setViewMode('export');
    setStatus(`已导出 ${activeProject.meta.name}`);
  }

  async function importProjectArchive() {
    const detail = await ce.importProjectArchive();
    if (!detail) {
      showToast('已取消导入项目');
      return;
    }
    const profileState = detail.learningProfile ?? await ce.getLearningProfile(detail.meta.id);
    const generatedResources = detail.personalizedResources ?? await ce.listPersonalizedResources(detail.meta.id);
    const pathPlan = detail.learningPathPlan ?? await ce.getLearningPathPlan(detail.meta.id);
    const reports = detail.stageReports ?? await ce.listStageReports(detail.meta.id);
    const delivery = detail.deliveryPackage ?? await ce.getDeliveryPackage(detail.meta.id);
    const artifacts = detail.modeArtifacts ?? await ce.listModeArtifacts(detail.meta.id);
    const nextProjects = await ce.listProjects();
    const enrichedDetail = { ...detail, deliveryPackage: delivery, modeArtifacts: artifacts };
    setActiveProject(enrichedDetail);
    setLearningProfileState(profileState);
    setPersonalizedResources(generatedResources);
    setLearningPathPlan(pathPlan);
    setStageReports(reports);
    setDeliveryPackage(delivery);
    setModeArtifacts(artifacts);
    setConfigText(detail.configYaml);
    setProgressText(detail.progressMarkdown);
    setChatMessages(toAgentMessages(detail));
    setChatSearchQuery('');
    setProjects(nextProjects);
    setExportResult(null);
    setEditorTab(getWorkspaceTabsForMode(detail.meta.mode)[0]?.id ?? 'overview');
    setViewMode('workspace');
    setStatus(`已导入项目：${detail.meta.name}`);
    showToast('项目导入完成，已恢复到本机项目列表');
  }

  async function runProjectChat() {
    if (!activeProject || !agentInput.trim() || isChatSending) return;
    setIsChatSending(true);
    try {
      const input = agentInput.trim();
      const result = await ce.runProjectChat(activeProject.meta.id, input);
      setChatMessages(result.history.map((turn: any) => ({
        role: turn.role,
        content: turn.content,
        createdAt: turn.createdAt,
        model: turn.model
      })));
      setActiveProject({ ...activeProject, chatHistory: result.history });
      setAgentInput('');
      if (!aiDrawerOpen) setAiDrawerOpen(true);
      setStatus(`已使用 ${activeProject.meta.model} 完成一轮项目对话`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '项目对话失败');
    } finally {
      setIsChatSending(false);
    }
  }

  async function saveChatToKnowledgeBase() {
    if (!activeProject) return;
    const latestAssistant = [...chatMessages].reverse().find((message) => message.role === 'assistant');
    const sourceContent = latestAssistant?.content?.trim() || agentInput.trim();
    if (!sourceContent) return;
    const draft = await ce.draftKnowledgeBaseEntry(activeProject.meta.id, 'chat', {
      title: agentInput.trim().slice(0, 24) || latestAssistant?.content.slice(0, 24),
      content: sourceContent,
      fallbackTags: ['聊天沉淀']
    });
    const entry = await ce.addKnowledgeBaseEntry(activeProject.meta.id, {
      title: draft.title,
      summary: draft.summary,
      source: 'chat',
      tags: draft.tags,
      content: draft.content
    });
    setActiveProject({
      ...activeProject,
      knowledgeBase: [entry, ...activeProject.knowledgeBase]
    });
    setKnowledgeQuery('');
    setStatus(`已将聊天结论整理后写入当前项目独立知识库；当前共 ${activeProject.knowledgeBase.length + 1} 条。`);
  }

  async function saveUploadToKnowledgeBase(upload: ProjectSourceFile) {
    if (!activeProject || !upload.parsed) return;
    const draft = await ce.draftKnowledgeBaseEntry(activeProject.meta.id, 'upload', {
      title: upload.parsed.title,
      content: upload.parsed.extractedText,
      fallbackTags: [upload.kind === 'image' ? '图片解析' : '文件解析', '上传沉淀']
    });
    const entry = await ce.addKnowledgeBaseEntry(activeProject.meta.id, {
      title: draft.title,
      summary: draft.summary,
      source: 'upload',
      tags: draft.tags,
      content: draft.content
    });
    setActiveProject({
      ...activeProject,
      knowledgeBase: [entry, ...activeProject.knowledgeBase]
    });
    setKnowledgeQuery('');
    setStatus(`已将 ${upload.name} 的解析内容整理后写入项目知识库；当前共 ${activeProject.knowledgeBase.length + 1} 条。`);
  }

  function updateWizard<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setWizard((current: WizardState) => ({ ...current, [key]: value }));
  }

  function selectProjectMode(mode: ProjectMode) {
    const template = getProjectModeTemplate(mode);
    setWizard((current: WizardState) => ({
      ...current,
      mode,
      modeConfig: {},
      examType: template.wizardFields.find((field) => field.key === 'examType')?.options?.[0] ?? current.examType
    }));
  }

  function updateModeConfig(key: string, value: string) {
    setWizard((current: WizardState) => ({
      ...current,
      modeConfig: {
        ...current.modeConfig,
        [key]: value
      }
    }));
  }

  function renderModeField(field: WizardField) {
    const value = isWizardStringField(field.key)
      ? String(wizard[field.key] ?? '')
      : wizard.modeConfig[field.key] ?? '';
    const setFieldValue = (value: string) => {
      if (isWizardStringField(field.key)) {
        updateWizard(field.key, value);
        return;
      }
      updateModeConfig(field.key, value);
    };
    if (field.type === 'select') {
      return (
        <label key={field.key} className="wizard-mode-field">
          {field.label}
          <select value={value} onChange={(event) => setFieldValue(event.target.value)}>
            <option value="">请选择</option>
            {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      );
    }
    if (field.type === 'textarea') {
      return (
        <label key={field.key} className="wizard-mode-field">
          {field.label}
          <textarea value={value} placeholder={field.placeholder} onChange={(event) => setFieldValue(event.target.value)} />
        </label>
      );
    }
    return (
      <label key={field.key} className="wizard-mode-field">
        {field.label}
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => setFieldValue(event.target.value)}
        />
      </label>
    );
  }

  async function selectWizardFiles() {
    return ce.selectUploadFiles();
  }

  async function appendWizardFiles<K extends keyof WizardState>(key: K, separator = '\n') {
    const actionLabel = wizardFieldLabels[key] || '文件';
    setWizardFileAction(String(key));
    try {
      const files = await selectWizardFiles();
      if (!files.length) {
        setStatus(`已取消上传${actionLabel}`);
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        [key]: appendWizardFileList(String(current[key] ?? ''), files, separator)
      }));
      setStatus(`已为${actionLabel}添加 ${files.length} 个文件`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `上传${actionLabel}失败`);
    } finally {
      setWizardFileAction(null);
    }
  }

  async function appendWizardTextFiles<K extends keyof WizardState>(key: K, separator = '\n') {
    const actionLabel = wizardFieldLabels[key] || '文本';
    setWizardFileAction(String(key));
    try {
      const files = await selectWizardFiles();
      if (!files.length) {
        setStatus(`已取消导入${actionLabel}`);
        return;
      }
      const texts = await Promise.all(files.map((filePath: string) => ce.extractFileText(filePath)));
      const importedText = texts.filter(Boolean).join(separator);
      if (!importedText.trim()) {
        setStatus(`${actionLabel}文件内容为空`);
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        [key]: appendWizardValue(String(current[key] ?? ''), importedText, separator)
      }));
      setStatus(`已为${actionLabel}导入 ${files.length} 个文件`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : `导入${actionLabel}失败`);
    } finally {
      setWizardFileAction(null);
    }
  }

  async function appendWizardQuestionFiles() {
    setWizardFileAction('initialQuestionText');
    try {
      const files = await selectWizardFiles();
      if (!files.length) {
        setStatus('已取消导入题目文件');
        return;
      }

      let importedText = '';
      const fallbackTexts = await Promise.all(files.map((filePath: string) => ce.extractFileText(filePath).catch(() => '')));
      const fallbackText = fallbackTexts.filter(Boolean).join('\n\n');
      try {
        const drafts = await ce.previewQuestionsFromFileContent(files);
        importedText = resolveWizardQuestionImportText(drafts, fallbackText);
      } catch {
        importedText = fallbackText;
      }

      if (!importedText.trim()) {
        setStatus('题目文件为空或暂时无法读取');
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        initialQuestionText: appendWizardValue(current.initialQuestionText, importedText, '\n\n')
      }));
      setStatus(`已导入 ${files.length} 个题目文件`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '导入题目文件失败');
    } finally {
      setWizardFileAction(null);
    }
  }

  function syncChatToQuestions() {
    if (!activeProject) return;
    const latestAssistant = [...chatMessages].reverse().find(m => m.role === 'assistant');
    if (!latestAssistant?.content?.trim()) {
      showToast('没有可用的 AI 回复来提取题目');
      return;
    }
    void (async () => {
      try {
        const drafts = await ce.previewQuestionsFromText(latestAssistant.content, 'text', 'AI 对话提取');
        if (!drafts.length) {
          showToast('未能从对话中识别出题目格式');
          return;
        }
        const questions = await ce.addQuestions(activeProject.meta.id, drafts);
        setActiveProject({ ...activeProject, questions });
        showToast(`已从对话中提取 ${questions.length} 道题目到题库`);
      } catch (e) {
        showToast(e instanceof Error ? e.message : '提取题目失败');
      }
    })();
  }

  async function openSystemStatus() {
    try {
      const latex = await ce.checkLatex();
      const settingsData = await ce.getSettings();
      const msg = [
        `LaTeX: ${formatLatexStatusLabel(latex)}`,
        `API 配置: ${findConfiguredProvider(settingsData.providers, settingsData.activeProviderId) ? '已配置' : 'API Key 未填写'}`,
        `模型: ${settingsData.model}`,
        `可用模型数: ${settingsData.availableModels.length}`,
        `项目数: ${projects.length}`,
      ].join('\n');
      window.alert('系统状态\n' + msg);
    } catch {
      window.alert('系统状态\n无法获取完整状态信息');
    }
  }

  function openApiReference() {
    window.alert('API 接口\n\nCram Engine 使用本地 Electron IPC 通信，不暴露外部 HTTP API。\n\n所有数据存储在应用本地数据目录。\n\n如需集成外部模型服务，请在设置中配置 Provider。');
  }

  function openDocumentation() {
    setViewMode('help');
    showToast('已打开帮助中心');
  }

  function openAgentTarget(tab: 'profile' | 'resources' | 'path' | 'report' | 'delivery') {
    if (tab === 'profile') {
      setViewMode('settings');
      showToast('用户画像已迁移到 设置 → 全局能力');
      return;
    }
    setViewMode('workspace');
    setEditorTab(tab);
  }

  function handleTopnavShortcut(shortcutId: TopnavShortcutId) {
    switch (shortcutId) {
      case 'modes':
        setViewMode('home');
        showToast('已打开 16 类项目模式');
        return;
      case 'materials':
        if (!activeProject) {
          setViewMode('wizard');
          setWizardStep(1);
          showToast('请先创建项目，再上传和识别资料');
          return;
        }
        setViewMode('workspace');
        setEditorTab('materials');
        showToast('已打开资料识别与素材页');
        return;
      case 'workspace':
        if (!activeProject) {
          setViewMode('wizard');
          setWizardStep(1);
          showToast('请先创建项目，再进入智能工作台');
          return;
        }
        setViewMode('workspace');
        setEditorTab('overview');
        showToast('已打开智能工作台');
        return;
      case 'delivery':
        if (!activeProject) {
          setViewMode('wizard');
          setWizardStep(1);
          showToast('请先创建项目，再进入交付中心');
          return;
        }
        setViewMode('workspace');
        setEditorTab('delivery');
        showToast('已打开交付中心');
        return;
      default:
        setViewMode('home');
    }
  }

  /* ================================================================
     RENDER — Scholar's Study 布局
     ================================================================ */
  return (
    <div className="shell">
      {/* ---- 顶部导航栏 ---- */}
      <header className="topnav">
        <div className="topnav-brand">
          <span className="topnav-brand-icon">&#x2666;</span>
          <span>Cram Engine</span>
        </div>
        <div className="topnav-center">
          <div className="topnav-search">
            <span style={{ fontSize: '16px', opacity: 0.4 }}>&#x1F50D;</span>
            <input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="搜索资源、笔记、题目..."
            />
          </div>
          <nav className="topnav-shortcuts" aria-label="全局快捷入口">
            {topnavShortcuts.map((shortcut) => {
              const active =
                (shortcut.id === 'modes' && viewMode === 'home') ||
                (shortcut.id === 'materials' && viewMode === 'workspace' && editorTab === 'materials') ||
                (shortcut.id === 'workspace' && viewMode === 'workspace' && editorTab === 'overview') ||
                (shortcut.id === 'delivery' && viewMode === 'workspace' && editorTab === 'delivery');
              return (
                <button
                  key={shortcut.id}
                  type="button"
                  className={active ? 'active' : ''}
                  onClick={() => handleTopnavShortcut(shortcut.id)}
                  title={shortcut.title}
                >
                  {shortcut.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="topnav-right">
          <button onClick={() => setAiDrawerOpen((v) => !v)} title="AI 助手">
            {aiDrawerOpen ? '▶' : '◀'}
          </button>
          <button onClick={() => { setNotificationCount(0); showToast(`已清空通知 | 共 ${projects.length} 个项目，${activeProject ? activeProject.questions.length : 0} 道活跃题目`); }} title="通知" style={{ position: 'relative' }}>
            &#x1F514;
            {notificationCount > 0 && (
              <span style={{ position: 'absolute', top: '2px', right: '2px', width: '8px', height: '8px', borderRadius: '50%', background: '#ba1a1a' }} />
            )}
          </button>
        </div>
      </header>

      {/* ---- 主体布局（侧边栏 + 主内容 + AI 抽屉） ---- */}
      <div className="app-body">
        {/* ---- 侧边栏 ---- */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <button
              className="primary"
              onClick={() => { setViewMode('wizard'); setWizardStep(1); }}
              style={{ width: '100%', padding: '10px', fontSize: '14px' }}
            >
              + 新建项目
            </button>
            <button
              className="sidebar-secondary-action"
              onClick={() => void importProjectArchive()}
            >
              导入项目
            </button>
          </div>

          <nav className="sidebar-nav">
            <a className={viewMode === 'home' ? 'active' : ''} onClick={() => setViewMode('home')}>
              <span className="nav-icon">&#x2302;</span> 首页
            </a>
            <a className={viewMode === 'workspace' ? 'active' : ''} onClick={() => activeProject && setViewMode('workspace')}>
              <span className="nav-icon">&#x270E;</span> 工作台
            </a>
            <a className={viewMode === 'export' ? 'active' : ''} onClick={() => activeProject && setViewMode('export')}>
              <span className="nav-icon">&#x21AA;</span> 导出
            </a>
          </nav>

          <div className="sidebar-section">
            <ProjectListPanel
              projects={projects}
              activeProjectId={activeProject?.meta.id ?? null}
              summaries={projectSummaries}
              onOpen={(id) => void openProject(id)}
              onRename={(project) => void renameProject(project)}
              onDelete={(project) => void deleteProject(project)}
            />
          </div>

          <div className="sidebar-section" style={{ marginTop: 'auto' }}>
            <nav className="sidebar-nav">
              <a className={viewMode === 'settings' ? 'active' : ''} onClick={() => setViewMode('settings')}>
                <span className="nav-icon">&#x2699;</span> 设置
              </a>
              <a className={viewMode === 'help' ? 'active' : ''} onClick={() => setViewMode('help')}>
                <span className="nav-icon">?</span> 帮助与支持
              </a>
            </nav>
            <div className="status-card" style={{ padding: '10px', fontSize: '11px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: settingsHasApiKey ? '#28c840' : '#ff5f57', display: 'inline-block' }} />
                <span style={{ fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' }}>
                  {apiStatusLabel}
                </span>
              </div>
              <div className="muted" style={{ fontSize: '10px' }}>
                LaTeX: {latexStatusLabel}
              </div>
            </div>
          </div>
        </aside>

        {/* ---- 主内容区 ---- */}
        <main className={aiDrawerOpen ? 'main ai-open' : 'main'}>
          <div className="main-scroll">
            {/* ======== 首页 ======== */}
            {viewMode === 'home' && (
              <div className="home-page">
                <section className="home-hero">
                  <div className="home-hero-copy">
                    <span className="upload-kind">Cram Engine Desktop</span>
                    <h1>学习、科研、教学与测评的一体化工作台</h1>
                    <p>
                      从 API 配置、资料识别和项目创建开始，到论文助手、实验仿真、教学设计、在线测验、
                      知识图谱、错题整理和成果交付，所有功能都围绕真实项目流转。
                    </p>
                    <div className="home-hero-actions">
                      <button className="primary" onClick={() => { setViewMode('wizard'); setWizardStep(1); }}>
                        新建项目
                      </button>
                      <button onClick={() => setViewMode('help')}>
                        查看完整指南
                      </button>
                    </div>
                  </div>
                  <div className="home-hero-panel" aria-label="平台能力摘要">
                    <strong>16 类项目模式</strong>
                    <span>学习复习 / 论文科研 / 教学设计 / 测评活动 / 成果交付</span>
                    <div className="home-hero-metrics">
                      <div><b>{projectModeTemplates.length}</b><small>项目模式</small></div>
                      <div><b>39</b><small>交付定义</small></div>
                      <div><b>{projects.length}</b><small>本地项目</small></div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="section-header">
                    <h3>从配置到交付</h3>
                    <span className="view-all">WORKFLOW</span>
                  </div>
                  <div className="home-workflow-grid">
                    {homeWorkflow.map((item, index) => (
                      <article key={item.title} className="home-workflow-card">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="section-header">
                    <h3>核心能力</h3>
                    <span className="view-all">CAPABILITIES</span>
                  </div>
                  <div className="home-capability-grid">
                    {homeCapabilities.map((item) => (
                      <article key={item.title} className="home-capability-card">
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="section-header">
                    <h3>选择项目模式</h3>
                    <span className="view-all">点击即可预选模式</span>
                  </div>
                  <div className="home-mode-grid">
                    {homeModeHighlights.map((template) => (
                      <button
                        key={template.mode}
                        className="home-mode-card"
                        onClick={() => {
                          selectProjectMode(template.mode);
                          setViewMode('wizard');
                          setWizardStep(1);
                        }}
                      >
                        <span>{template.icon}</span>
                        <strong>{template.title}</strong>
                        <small>{template.description}</small>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="section-header">
                    <h3>最近项目</h3>
                    <span className="view-all" onClick={() => { setShowAllProjects(!showAllProjects); showToast(showAllProjects ? '收起项目列表' : '展开全部项目'); }} style={{ cursor: 'pointer' }}>
                      {showAllProjects ? '收起列表 &uarr;' : '查看全部存档 &rarr;'}
                    </span>
                  </div>
                  <div className="home-recent-grid">
                    {projects.slice(0, showAllProjects ? projects.length : 3).map((project) => {
                      const summary = projectSummaries[project.id];
                      const display = getProjectModeDisplay(project);
                      return (
                        <div
                          key={project.id}
                          className="scholar-card"
                          style={{
                            padding: '0',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                          onClick={() => void openProject(project.id)}
                        >
                          {/* 封面色块 */}
                          <div className="home-project-mode-cover">
                            <span className="home-project-mode-icon" title={display.subtitle}>{display.icon}</span>
                          </div>
                          <div style={{ padding: '14px', flex: 1 }}>
                            <h5 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                              {project.name}
                            </h5>
                            <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginBottom: '10px' }}>
                              {display.title} &middot; {display.subtitle}
                            </p>
                            {summary && summary.questionCount > 0 && (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: 'var(--color-on-surface-variant)', marginBottom: '4px' }}>
                                  <span>掌握度</span>
                                  <span>{summary.progressPercent}%</span>
                                </div>
                                <div className="progress-bar-fill" style={{ height: '4px' }}>
                                  <i style={{ width: `${summary.progressPercent}%` }} />
                                </div>
                              </>
                            )}
                            {summary && summary.questionCount === 0 && (
                              <p style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                                暂未导入题目
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {projects.length < 3 && (
                      <div
                        className="scholar-card"
                        style={{
                          padding: '0',
                          overflow: 'hidden',
                          border: '2px dashed var(--color-outline-variant)',
                          background: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                        onClick={() => { setViewMode('wizard'); setWizardStep(1); }}
                      >
                        <div style={{
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '48px',
                          color: 'var(--color-outline-variant)'
                        }}>
                          +
                        </div>
                        <div style={{ padding: '14px', textAlign: 'center' }}>
                          <h5 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-on-surface-variant)' }}>
                            开始新课题
                          </h5>
                          <p style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>
                            上传资料或从知识库选择
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ======== 设置页 ======== */}
            {viewMode === 'settings' && (
              <div className="page-stack">
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '4px' }}>设置</h2>
                  <p className="muted">配置模型服务、默认模型和生成偏好。</p>
                </div>
                <ProviderSettingsPage
                  initialSettings={settings}
                  onSave={saveSettings}
                  onDiscard={discardSettings}
                  workspaceOverview={activeProject ? (
                    <div className="settings-governance-content">
                      <div className="settings-governance-note">
                        <strong>当前项目：{activeProject.meta.name}</strong>
                        <span>这里仅展示全局能力与当前项目的联动摘要；详细编辑请切换到“学习画像”或“智能体中心”。</span>
                      </div>
                      <div className="workspace-governance-summary">
                        <div><span>上传素材</span><strong>{activeProject.uploads.length}</strong></div>
                        <div><span>题库</span><strong>{activeProject.questions.length}</strong></div>
                        <div><span>个性化资源</span><strong>{personalizedResources.length}</strong></div>
                        <div><span>阶段报告</span><strong>{stageReports.length}</strong></div>
                        <div><span>学习路径</span><strong>{learningPathPlan ? '已生成' : '未生成'}</strong></div>
                        <div><span>画像状态</span><strong>{learningProfileState?.profile.updatedAt ? '已更新' : '待完善'}</strong></div>
                      </div>
                    </div>
                  ) : undefined}
                  workspaceProfile={activeProject ? (
                    <LearningProfilePage
                      projectId={activeProject.meta.id}
                      state={learningProfileState ?? activeProject.learningProfile ?? null}
                      onChange={(next) => {
                        setLearningProfileState(next);
                        setActiveProject({ ...activeProject, learningProfile: next });
                      }}
                      onSave={saveLearningProfile}
                      onAnalyze={analyzeLearningProfile}
                      onStatus={setStatus}
                    />
                  ) : undefined}
                  workspaceAgents={activeProject ? (
                    <AgentOrchestrationPage
                      profileReady={Boolean(learningProfileState?.profile.updatedAt)}
                      resourceCount={personalizedResources.length}
                      hasPathPlan={Boolean(learningPathPlan)}
                      reportCount={stageReports.length}
                      onOpenTab={openAgentTarget}
                    />
                  ) : undefined}
                />
              </div>
            )}

            {viewMode === 'help' && (
              <HelpCenterPage
                apiStatusLabel={apiStatusLabel}
                latexStatusLabel={latexStatusLabel}
                projectCount={projects.length}
                hasApiKey={settingsHasApiKey}
              />
            )}

            {viewMode === 'wizard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '16px' }}>
                    新建项目向导
                  </h2>
                  {/* Step 指示器 */}
                  <div className="wizard-stepper">
                    {([1, 2, 3] as WizardStep[]).map((step) => (
                      <div key={step} className={`wizard-step ${wizardStep === step ? 'active' : wizardStep > step ? 'done' : ''}`}>
                        <div className="step-circle">
                          {wizardStep > step ? '✓' : step}
                        </div>
                        <span className="step-label">
                          {wizardStepLabels[step - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step 1: 基本信息 */}
                {wizardStep === 1 && (
                  <div className="panel" style={{ width: '100%' }}>
                    <div className="wizard-form-stack">
                      <ProjectModeSelector selectedMode={wizard.mode} onSelect={selectProjectMode} />
                      <label className="wizard-mode-field wide">
                        项目名称
                        <input value={wizard.name} onChange={(e) => updateWizard('name', e.target.value)} placeholder="例如：计算机系统结构 101" />
                      </label>
                      <div className="wizard-common-field-grid">
                        <label className="wizard-mode-field wide">
                          AI Provider / 模型
                          <select
                            value={`${wizard.provider}:${wizard.model}`}
                            onChange={(e) => {
                              const [providerId, modelId] = e.target.value.split(':');
                              setWizard((current) => ({ ...current, provider: providerId, model: modelId }));
                            }}
                          >
                            {selectableModels.map((m) => (
                              <option key={`${m.providerId}:${m.id}`} value={`${m.providerId}:${m.id}`}>{m.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="wizard-mode-field-grid">
                        {selectedWizardTemplate.wizardFields.filter((field) => !handledWizardFieldKeys.has(field.key)).map(renderModeField)}
                      </div>
                      {wizard.mode === 'exam-review' && (
                        <label className="wizard-mode-field wide">
                          教材 / 范围
                          <div className="wizard-input-row align-start">
                            <textarea
                              rows={4}
                              value={wizard.textbook}
                              onChange={(e) => updateWizard('textbook', e.target.value)}
                              placeholder="填写教材、章节或考试范围"
                            />
                            <button disabled={wizardFileAction === 'textbook'} onClick={() => void appendWizardFiles('textbook', '; ')} title="上传教材或范围文件">📎 上传文件</button>
                          </div>
                        </label>
                      )}
                      <label className="wizard-mode-field wide">
                        链接现有项目目录（可选）
                        <div className="wizard-input-row">
                          <input value={wizard.linkedFolder} onChange={(e) => updateWizard('linkedFolder', e.target.value)} placeholder="已有 stages/configs/progress 资料" />
                          <button className="wizard-secondary-action" disabled={isChoosingLinkedFolder} onClick={() => void chooseLinkedFolder()}>📁 选择目录</button>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Step 2: 工作目标 / 出题要求 */}
                {wizardStep === 2 && (
                  <div className="panel" style={{ width: '100%' }}>
                    <div className="wizard-form-stack">
                      <label className="wizard-mode-field wide">
                        {wizard.mode === 'exam-review' ? '补充要求' : '项目目标 / 补充要求'}
                        <div className="wizard-input-row align-start">
                          <textarea rows={5} value={wizard.requirements} onChange={(e) => updateWizard('requirements', e.target.value)} placeholder={wizard.mode === 'exam-review' ? '例如：多用中文例子；重点讲简答题套路' : '说明项目目标、期望成果和其他约束'} />
                          <button className="wizard-icon-action" disabled={wizardFileAction === 'requirements'} onClick={() => void appendWizardTextFiles('requirements')} title="从文本文件导入">📎</button>
                        </div>
                      </label>
                      {isQuestionOrientedMode(wizard.mode) && (
                        <label className="wizard-mode-field wide">
                          课堂材料 / 参考资料
                          <div className="wizard-input-row align-start">
                            <textarea rows={5} value={wizard.notes} onChange={(e) => updateWizard('notes', e.target.value)} placeholder="说明已有讲义、题库、参考文件和资料来源" />
                            <button className="wizard-icon-action" disabled={wizardFileAction === 'notes'} onClick={() => void appendWizardFiles('notes')} title="上传课堂材料或参考资料">📎</button>
                          </div>
                        </label>
                      )}
                      {wizard.mode === 'exam-review' && (
                        <>
                          <label className="wizard-mode-field wide">
                            必考点（每行一个）
                            <div className="wizard-input-row align-start">
                              <textarea rows={4} value={wizard.mustKnow} onChange={(e) => updateWizard('mustKnow', e.target.value)} placeholder="老师明确强调的必考点" />
                              <button className="wizard-icon-action" disabled={wizardFileAction === 'mustKnow'} onClick={() => void appendWizardTextFiles('mustKnow')} title="从文本文件导入必考点">📎</button>
                            </div>
                          </label>
                          <label className="wizard-mode-field wide">
                            重点知识（每行一个）
                            <div className="wizard-input-row align-start">
                              <textarea rows={4} value={wizard.keyPoints} onChange={(e) => updateWizard('keyPoints', e.target.value)} placeholder="需要逐步拆解讲透的重点内容" />
                              <button className="wizard-icon-action" disabled={wizardFileAction === 'keyPoints'} onClick={() => void appendWizardTextFiles('keyPoints')} title="从文本文件导入重点知识">📎</button>
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: 题目或素材导入 */}
                {wizardStep === 3 && (
                  <div className="panel" style={{ width: '100%' }}>
                    <div className="wizard-form-stack">
                      {isQuestionOrientedMode(wizard.mode) ? (
                        <>
                          <label className="wizard-mode-field wide">
                            初始题目批量粘贴（可选）
                            <textarea
                              rows={10}
                              value={wizard.initialQuestionText}
                              onChange={(e) => updateWizard('initialQuestionText', e.target.value)}
                              placeholder="可粘贴多道题，系统会自动拆分题干、选项、答案并归类"
                            />
                          </label>
                          <div className="wizard-action-row">
                            <button className="wizard-secondary-action" disabled={wizardFileAction === 'initialQuestionText'} onClick={() => void appendWizardQuestionFiles()}>📁 从文件导入题目</button>
                            <span className="muted wizard-helper-text">
                              支持 txt / md / json / csv，自动识别拆分
                            </span>
                          </div>
                          <p className="muted wizard-helper-text center">
                            也可以在项目创建后通过工作台的题目功能导入更多内容
                          </p>
                        </>
                      ) : (
                        <>
                          <label className="wizard-mode-field wide">
                            素材 / 参考文件说明（可选）
                            <textarea
                              rows={8}
                              value={wizard.notes}
                              onChange={(e) => updateWizard('notes', e.target.value)}
                              placeholder={`说明要用于${selectedWizardTemplate.title}的素材、数据或参考文件`}
                            />
                          </label>
                          <div className="wizard-action-row">
                            <button className="wizard-secondary-action" disabled={wizardFileAction === 'notes'} onClick={() => void appendWizardFiles('notes')}>📁 导入素材 / 参考文件</button>
                            <span className="muted wizard-helper-text">
                              文件路径会写入资料说明，创建项目后仍可继续补充
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 底部操作栏 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingTop: '16px' }}>
                  <button
                    onClick={() => setWizardStep((s) => Math.max(1, s - 1) as WizardStep)}
                    disabled={wizardStep === 1}
                    style={{ visibility: wizardStep === 1 ? 'hidden' : 'visible' }}
                  >
                    &larr; 上一步
                  </button>
                  <div>
                    {wizardStep < 3 ? (
                      <button
                        className="primary"
                        onClick={() => {
                          const stepError = getWizardStepError(wizard, wizardStep);
                          if (stepError) {
                            setStatus(stepError);
                            showToast(stepError);
                            return;
                          }
                          setWizardStep((s) => (s + 1) as WizardStep);
                        }}
                      >
                        下一步 &rarr;
                      </button>
                    ) : (
                      <button className="primary" onClick={() => void createProject()} disabled={!canSubmitWizardProject}>
                        {isCreatingProject ? '创建中…' : '🚀 创建项目'}
                      </button>
                    )}
                  </div>
                </div>
                {/* 进度条 */}
                <div style={{ width: '100%' }}>
                  <div className="progress-bar-fill">
                    <i style={{ width: `${(wizardStep / 3) * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* ======== 工作台 ======== */}
            {viewMode === 'workspace' && activeProject && (
              <div className="project-page-shell">
                <section className="panel project-hero">
                  <div className="project-hero-main">
                    <span className="upload-kind">当前项目</span>
                    <h2>{activeProject.meta.name}</h2>
                    <p className="muted">
                      {activeProject.meta.courseName} &middot; {activeProject.meta.examType} &middot; {activeProject.meta.model}
                    </p>
                  </div>
                  <div className="project-hero-actions">
                    <label>
                      项目模型
                      <select value={activeProject.meta.model} onChange={(e) => void updateActiveProjectModel(e.target.value)}>
                        {availableProjectModels.map((m) => (
                          <option key={`${m.providerId}:${m.id}`} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </label>
                    <button onClick={() => { setAiTab('chat'); setAiDrawerOpen(true); }}>打开 AI 助教</button>
                    <button onClick={() => setViewMode('export')}>导出成果</button>
                  </div>
                </section>

                <nav className="project-page-tabs segmented-control">
                  {activeWorkspaceTabs.map((tab) => (
                    <button key={tab.id} className={editorTab === tab.id ? 'active' : ''} onClick={() => setEditorTab(tab.id)}>
                      {tab.label}
                    </button>
                  ))}
                </nav>

                {editorTab === 'simulation-run' && (
                  <SimulationWorkbenchPage
                    onGenerate={generateModeArtifact}
                    onChange={(next) => {
                      setModeArtifacts(next);
                      setActiveProject({ ...activeProject, modeArtifacts: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'graph-view' && (
                  <KnowledgeGraphPage
                    knowledgeBase={activeProject.knowledgeBase}
                    questions={activeProject.questions}
                    artifacts={modeArtifacts}
                  />
                )}

                {editorTab === 'courseware-preview' && (
                  <CoursewareStudioPage
                    artifacts={modeArtifacts}
                    onGenerate={generateModeArtifact}
                    onSave={saveModeArtifact}
                    onChange={(next) => {
                      setModeArtifacts(next);
                      setActiveProject({ ...activeProject, modeArtifacts: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'game-bank' && (
                  <section className="panel project-single-page">
                    <QuestionImportPanel
                      activeProjectId={activeProject.meta.id}
                      onQuestionsAdded={(questions) => {
                        setActiveProject({ ...activeProject, questions });
                        setEditorTab('game-preview');
                      }}
                      onStatus={setStatus}
                    />
                  </section>
                )}

                {editorTab === 'game-preview' && (
                  <TeachingGamePage questions={activeProject.questions} onGoToBank={() => setEditorTab('game-bank')} />
                )}

                {editorTab === 'mistakes-import' && (
                  <section className="panel project-single-page">
                    <QuestionImportPanel
                      activeProjectId={activeProject.meta.id}
                      onQuestionsAdded={(questions) => {
                        setActiveProject({ ...activeProject, questions });
                        setEditorTab('mistakes-review');
                      }}
                      onStatus={setStatus}
                    />
                  </section>
                )}

                {editorTab === 'mistakes-review' && (
                  <section className="panel project-single-page">
                    <PracticePanel
                      questions={activeProject.questions}
                      activeProjectId={activeProject.meta.id}
                      onQuestionsUpdated={(questions) => setActiveProject({ ...activeProject, questions })}
                      onStatus={setStatus}
                    />
                  </section>
                )}

                {editorTab === 'mistakes-practice' && (
                  <section className="panel project-single-page">
                    <PracticePanel
                      questions={activeProject.questions}
                      activeProjectId={activeProject.meta.id}
                      onQuestionsUpdated={(questions) => setActiveProject({ ...activeProject, questions })}
                      onStatus={setStatus}
                    />
                  </section>
                )}

                {isModeTab(editorTab) && !specializedModeTabs.has(editorTab) && editorTab !== 'delivery' && activeProject.meta.mode !== 'exam-review' && (
                  <ModeModulePage
                    tab={activeWorkspaceTabs.find((tab) => tab.id === editorTab) ?? activeWorkspaceTabs[0]}
                    artifacts={modeArtifacts}
                    onGenerate={generateModeArtifact}
                    onSave={saveModeArtifact}
                    onDelete={deleteModeArtifact}
                    onChange={(next) => {
                      setModeArtifacts(next);
                      setActiveProject({ ...activeProject, modeArtifacts: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'overview' && (
                  <section className="panel workspace-overview-card">
                    <div className="section-title">项目概览</div>
                    <div className="summary-grid workspace-summary-grid">
                      <div><span>上传素材</span><strong>{activeProject.uploads.length}</strong></div>
                      <div><span>知识库</span><strong>{activeProject.knowledgeBase.length}</strong></div>
                      <div><span>题库</span><strong>{activeProject.questions.length}</strong></div>
                      <div><span>对话</span><strong>{activeProject.chatHistory.length}</strong></div>
                    </div>

                    <div className="workspace-jump-grid">
                      <button className="workspace-jump-card" onClick={() => setEditorTab('materials')}>
                        <span>01</span>
                        <strong>整理素材</strong>
                        <small>上传课件、提炼知识库、查看拓展资源</small>
                      </button>
                      <button className="workspace-jump-card" onClick={() => setAiDrawerOpen(true)}>
                        <span>02</span>
                        <strong>让 AI 讲授</strong>
                        <small>打开右侧助教，围绕当前项目追问</small>
                      </button>
                      <button className="workspace-jump-card" onClick={() => setEditorTab('practice')}>
                        <span>03</span>
                        <strong>开始检题</strong>
                        <small>进入练习页刷题、标错和复盘</small>
                      </button>
                      <button className="workspace-jump-card" onClick={() => setEditorTab('report')}>
                        <span>04</span>
                        <strong>复盘补漏</strong>
                        <small>进入报告页汇总薄弱点、风险和下一步建议</small>
                      </button>
                    </div>

                    <div className="document-view compact-context">
                      <h3>当前上下文</h3>
                      <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichContent(activeProject.meta.requirements || activeProject.meta.textbook || '暂无项目说明，建议先进入素材页上传资料。') }} />
                    </div>
                  </section>
                )}

                {editorTab === 'resources' && (
                  <PersonalizedResourcesPage
                    resources={personalizedResources}
                    onGenerate={generatePersonalizedResources}
                    onSave={savePersonalizedResource}
                    onDelete={deletePersonalizedResource}
                    onChange={(next) => {
                      setPersonalizedResources(next);
                      setActiveProject({ ...activeProject, personalizedResources: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'path' && (
                  <LearningPathPage
                    plan={learningPathPlan}
                    resources={personalizedResources}
                    onGenerate={generateLearningPathPlan}
                    onSave={saveLearningPathPlan}
                    onChange={(next) => {
                      setLearningPathPlan(next);
                      setActiveProject({ ...activeProject, learningPathPlan: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'report' && (
                  <StageReportPage
                    reports={stageReports}
                    onGenerate={generateStageReport}
                    onSave={saveStageReport}
                    onChange={(next) => {
                      setStageReports(next);
                      setActiveProject({ ...activeProject, stageReports: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'delivery' && (
                  <DeliveryPackagePage
                    deliveryPackage={deliveryPackage ?? activeProject.deliveryPackage ?? null}
                    onGenerate={generateDeliveryPackage}
                    onSave={saveDeliveryPackage}
                    onExport={exportDeliveryPackage}
                    onChange={(next) => {
                      setDeliveryPackage(next);
                      setActiveProject({ ...activeProject, deliveryPackage: next });
                    }}
                    onStatus={setStatus}
                  />
                )}

                {editorTab === 'materials' && (
                  <section className="panel workspace-materials-page">
                    <div className="page-section-header">
                      <div>
                        <div className="section-title">素材与知识库</div>
                        <h3>先把资料放清楚，再让 AI 讲清楚</h3>
                        <p className="muted">这一页只处理上传素材、项目知识库和外部拓展资源。</p>
                      </div>
                      <button className="primary" onClick={() => void importFiles()}>
                        + 上传素材（文件 / 图片）
                      </button>
                    </div>

                    <div className="materials-page-grid materials-library-grid">
                      <div className="mini-section materials-section-card">
                        <div className="subsection-title">已导入素材</div>
                        <div className="stack-list">
                          {activeProject.uploads.length ? activeProject.uploads.map((upload) => (
                            <div key={upload.storedPath} className="upload-card material-card">
                              <div className="upload-kind">{upload.kind === 'image' ? '图片' : '文件'}</div>
                              <UploadImagePreview projectId={activeProject.meta.id} upload={upload} />
                              <div className="materials-card-title">{upload.name}</div>
                              <div className="muted">{upload.parsed?.summary || '已导入，等待解析'}</div>
                              {upload.parsed?.extractedText && (
                                <div className="parsed-preview">{upload.parsed.extractedText}</div>
                              )}
                              {upload.parsed && (
                                <button className="materials-card-action" onClick={() => void saveUploadToKnowledgeBase(upload)}>
                                  提炼到知识库
                                </button>
                              )}
                            </div>
                          )) : <div className="empty-slim">还没有上传资料，先点右上角上传。</div>}
                        </div>
                      </div>

                      <div className="mini-section materials-section-card">
                        <div className="subsection-title">项目知识库</div>
                        <input
                          value={knowledgeQuery}
                          onChange={(e) => setKnowledgeQuery(e.target.value)}
                          placeholder="按标题 / 摘要 / 标签筛选..."
                        />
                        <div className="muted">共 {activeProject.knowledgeBase.length} 条 &middot; 显示 {filteredKnowledgeBase.length} 条</div>
                        <div className="stack-list">
                          {filteredKnowledgeBase.length ? filteredKnowledgeBase.map((entry) => (
                            <div key={entry.id} className="stack-item knowledge-entry material-card">
                              <div className="knowledge-header">
                                <strong>{entry.title}</strong>
                                <span className="upload-kind">{entry.source}</span>
                              </div>
                              <div className="knowledge-tags">
                                {entry.tags.map((tag) => <span key={`${entry.id}-${tag}`} className="upload-kind">{tag}</span>)}
                              </div>
                              <button className="materials-card-action" onClick={() => void loadKnowledgeResources(entry.tags[0] || entry.title)}>
                                知识点拓展
                              </button>
                            </div>
                          )) : <div className="empty-slim">暂无知识库条目，可先把素材提炼进来。</div>}
                        </div>
                      </div>
                    </div>

                    {knowledgeResources.length > 0 && (
                      <KnowledgeResourceList resources={knowledgeResources} onOpen={(r) => void openResource(r)} />
                    )}
                  </section>
                )}

                {editorTab === 'import' && (
                  <section className="panel project-single-page">
                    <QuestionImportPanel
                      activeProjectId={activeProject.meta.id}
                      onQuestionsAdded={(questions) => {
                        setActiveProject({ ...activeProject, questions });
                        setEditorTab('practice');
                      }}
                      onStatus={setStatus}
                    />
                  </section>
                )}

                {editorTab === 'practice' && (
                  <section className="panel project-single-page">
                    <PracticePanel
                      questions={activeProject.questions}
                      activeProjectId={activeProject.meta.id}
                      onQuestionsUpdated={(questions) => setActiveProject({ ...activeProject, questions })}
                      onStatus={setStatus}
                    />
                  </section>
                )}

                {editorTab === 'config' && (
                  <section className="panel project-single-page">
                    <div className="section-title">课程配置</div>
                    <textarea value={configText} onChange={(e) => setConfigText(e.target.value)} />
                    <div className="panel-actions horizontal">
                      <button className="primary" onClick={() => void saveProjectConfig()}>保存 YAML</button>
                    </div>
                  </section>
                )}

                {editorTab === 'progress' && (
                  <section className="panel project-single-page">
                    <div className="section-title">项目进度</div>
                    <textarea value={progressText} onChange={(e) => setProgressText(e.target.value)} />
                    <div className="document-view markdown-preview">
                      <div className="section-title">Markdown 预览</div>
                      <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichContent(progressText || '暂无进度内容。') }} />
                    </div>
                    <div className="panel-actions horizontal">
                      <button className="primary" onClick={() => void saveProjectProgress()}>保存进度</button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ======== 导出页 ======== */}
            {viewMode === 'export' && activeProject && (
              <div className="page-stack">
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '4px' }}>导出</h2>
                  <p className="muted">完成并打包您的知识拆解成果。</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  {/* 左：摘要 + 格式 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="panel">
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>当前项目</span>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--color-primary)', marginTop: '4px' }}>
                          {activeProject.meta.name}
                        </h2>
                      </div>
                      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                        <div><span>知识点</span><strong>{activeProject.knowledgeBase.length}</strong></div>
                        <div><span>练习题</span><strong>{activeProject.questions.length}</strong></div>
                        <div><span>上传素材</span><strong>{activeProject.uploads.length}</strong></div>
                        <div><span>聊天轮次</span><strong>{activeProject.chatHistory.length}</strong></div>
                      </div>
                    </div>

                    <div className="panel">
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>导出格式</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        <label className="checkbox-row" style={{ padding: '12px', border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}>
                          <input type="checkbox" defaultChecked />
                          <div>
                            <span style={{ display: 'block', fontWeight: 600 }}>Markdown (.md)</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>为 Obsidian 优化</span>
                          </div>
                        </label>
                        <label className="checkbox-row" style={{ padding: '12px', border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}>
                          <input type="checkbox" defaultChecked />
                          <div>
                            <span style={{ display: 'block', fontWeight: 600 }}>JSON (.json)</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>结构化原始数据</span>
                          </div>
                        </label>
                      </div>
                      <button className="primary" onClick={() => void exportProject()} style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
                        &#x1F4E5; 生成导出包
                      </button>
                    </div>
                  </div>

                  {/* 右：最近导出 */}
                  <div className="panel" style={{ height: 'fit-content' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>最近导出</h3>
                    {exportResult ? (
                      <div className="upload-card">
                        <p style={{ fontWeight: 600, fontSize: '13px' }}>导出完成</p>
                        <p className="muted">Markdown：{exportResult.markdownPath}</p>
                        <p className="muted">JSON：{exportResult.jsonPath}</p>
                      </div>
                    ) : (
                      <p className="muted">暂无导出记录</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ---- AI 抽屉（右侧可折叠聊天面板） ---- */}
        {aiDrawerOpen && (
        <aside className="ai-drawer">
          <div className="ai-drawer-header">
            <div>
              <h2>AI 助教</h2>
              <p>实时学习咨询中</p>
              <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}>
                {currentProvider.label} &bull; {currentModelLabel}
              </div>
            </div>
            <button onClick={() => setAiDrawerOpen(false)}>&times;</button>
          </div>
          <div className="ai-drawer-tabs">
            <button className={aiTab === 'chat' ? 'active' : ''} onClick={() => setAiTab('chat')}>
              &#x1F4AC; 对话
            </button>
            <button className={aiTab === 'history' ? 'active' : ''} onClick={() => setAiTab('history')}>
              &#x23F1; 历史
            </button>
            <button className={aiTab === 'reference' ? 'active' : ''} onClick={() => setAiTab('reference')}>
              &#x1F4DA; 参考资料
            </button>
          </div>
          <div className="ai-drawer-body">
            {aiTab === 'chat' && chatMessages.length > 0 && (
              <>
                {chatMessages.map((msg, i) => (
                  <div key={`drawer-${msg.role}-${i}`} className={msg.role === 'assistant' ? 'chat-msg assistant' : 'chat-msg user'}>
                    {msg.role === 'assistant' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1a1c1b', color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          AI
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>
                          CRAM BOT
                        </span>
                      </div>
                    )}
                    <ChatBubble content={msg.content} />
                    <div className="chat-time">{formatDate(msg.createdAt)}</div>
                  </div>
                ))}
              </>
            )}
            {aiTab === 'history' && (
              <div className="ai-history-panel">
                <div className="ai-history-summary">
                  <strong>{activeProject?.meta.name ?? '未选择项目'}</strong>
                  <span>{activeProject?.chatHistory.length ?? 0} 条项目独立历史记录</span>
                </div>
                <input
                  className="ai-history-search"
                  value={chatSearchQuery}
                  onChange={(event) => setChatSearchQuery(event.target.value)}
                  placeholder="搜索当前项目历史对话"
                />
                <div className="ai-history-list">
                  {filteredChatHistory.length ? filteredChatHistory.map((turn, index) => (
                    <button
                      key={`history-${turn.createdAt}-${index}`}
                      className={turn.role === 'assistant' ? 'ai-history-card assistant' : 'ai-history-card user'}
                      onClick={() => continueFromHistory(turn)}
                    >
                      <span>{turn.role === 'assistant' ? 'AI 助教' : '我'} · {formatDate(turn.createdAt)}</span>
                      <strong>{turn.content.slice(0, 64) || '空内容'}</strong>
                      <small>{turn.content.slice(64, 180)}</small>
                      <em>继续追问</em>
                    </button>
                  )) : (
                    <div className="empty-slim">没有匹配的项目历史对话。清空搜索词后可查看全部记录。</div>
                  )}
                </div>
              </div>
            )}
            {aiTab === 'reference' && (
              <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                选择一个活跃知识点来查看外部学习资源。
              </div>
            )}
          </div>
          <div className="ai-drawer-footer">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => void saveChatToKnowledgeBase()} style={{ flex: 1, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                &#x1F4DA; 同步到知识
              </button>
              <button onClick={syncChatToQuestions} style={{ flex: 1, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} disabled={!activeProject}>
                &#x270E; 同步到题库
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                placeholder="向 AI 导师提问..."
                rows={2}
                style={{ width: '100%', borderRadius: '12px', padding: '12px 40px 12px 12px', fontSize: '13px', minHeight: '60px', resize: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runProjectChat(); } }}
              />
              <button
                onClick={() => void runProjectChat()}
                disabled={isChatSending}
                style={{ position: 'absolute', right: '6px', bottom: '6px', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              >
                &#x27A4;
              </button>
            </div>
          </div>
        </aside>
        )}
      </div>

      {/* ---- 底部状态栏 ---- */}
      <footer className="statusbar">
        <div className="statusbar-left">
          <span>Cram Engine v1.0</span>
          <div className="statusbar-dot" style={{ background: settingsHasApiKey ? '#28c840' : '#ff5f57' }} />
          <span>{settingsHasApiKey ? `模型: ${currentModelLabel} | 已连接` : 'API Key 未填写'}</span>
        </div>
        <div className="statusbar-right">
          <a onClick={openSystemStatus} style={{ cursor: 'pointer' }}>系统状态</a>
          <a onClick={openApiReference} style={{ cursor: 'pointer' }}>API 接口</a>
          <a onClick={openDocumentation} style={{ cursor: 'pointer' }}>文档</a>
        </div>
      </footer>

      {/* ---- 浮动 AI 按钮（抽屉关闭时显示） ---- */}
      {!aiDrawerOpen && (
        <button className="ai-fab" onClick={() => setAiDrawerOpen(true)} title="打开 AI 助手">
          &#x1F4AC;
        </button>
      )}

      {selectionAsk && (
        <div
          className="selection-ask-popover"
          style={{ left: selectionAsk.x, top: selectionAsk.y }}
        >
          <button onClick={askAiAboutSelection}>
            问一问 AI
          </button>
        </div>
      )}

      {/* ---- Toast 消息提示 ---- */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-on-surface)',
          color: 'var(--color-surface)',
          padding: '10px 24px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-ambient)',
          zIndex: 999,
          whiteSpace: 'nowrap'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
