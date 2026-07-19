import { useEffect, useMemo, useState } from 'react';
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
import { renderRichContent } from '../lib/richContent.js';
import { createEmptyChatGreeting, formatDate, getActiveProviderProfile } from '../lib/utils';
import { findConfiguredProvider, getSelectableModels } from '../lib/providerSettings.js';
import { applyTheme, watchSystemTheme } from '../lib/themeManager';
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
import { I18nProvider, useLocale, useT } from '../i18n';
import type { Locale } from '../i18n/types';
import { localizeProjectModeTemplate, localizeProjectModeTemplates } from '../i18n/projectModes';

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

const wizardFieldLabelKeys: Partial<Record<keyof WizardState, string>> = {
  textbook: 'wizard.textbook',
  notes: 'wizard.notes',
  requirements: 'wizard.requirementsLabel',
  mustKnow: 'wizard.mustKnow',
  keyPoints: 'wizard.keyPoints',
  initialQuestionText: 'wizard.initialQuestions'
};

function isQuestionOrientedMode(mode: ProjectMode) {
  return ['exam-review', 'assignment-quiz', 'teaching-game', 'mistake-collection'].includes(mode);
}

function getWizardStepLabels(mode: ProjectMode, t: (key: string, params?: Record<string, string | number>) => string) {
  return isQuestionOrientedMode(mode)
    ? [t('wizard.projectInfo'), t('wizard.requirements'), t('wizard.questionImport')]
    : [t('wizard.projectInfo'), t('wizard.workGoal'), t('wizard.materialImport')];
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

function isWizardStringField(key: string): key is WizardStringField {
  return wizardStringFields.has(key as WizardStringField);
}

function toAgentMessages(project: ProjectDetail | null, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!project?.chatHistory?.length) {
    return createEmptyChatGreeting(project?.meta.name, t);
  }
  return project.chatHistory.map((turn) => ({
    role: turn.role,
    content: turn.content,
    createdAt: turn.createdAt,
    model: turn.model
  }));
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
  const { t } = useT();
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
  if (failed) return <div className="upload-image-fallback">{t('workspace.imageLoadFailed')}</div>;
  if (!dataUrl) return <div className="upload-image-fallback">{t('workspace.imageLoading')}</div>;

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
  const { t } = useT();
  return (
    <div className="materials-resource-panel">
      <div className="materials-resource-header">
        <div>
          <div className="subsection-title">{t('workspace.knowledgeExpand')}</div>
          <span className="muted">{t('workspace.knowledgeResourceDesc')}</span>
        </div>
        <span className="upload-kind">{resources.length} {t('mode.countUnit')}</span>
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
              {resource.read && <em>{t('mode.viewed')}</em>}
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
  const { t } = useT();
  return (
    <section className="panel project-single-page future-module-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{title}</div>
          <h3>{description}</h3>
          <p className="muted">{t('mode.futureModuleDesc')}</p>
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

function formatLatexStatusLabel(t: (key: string) => string, latexStatus: {
  available: boolean;
  engine: string;
  path: string | null;
  distribution?: string;
  message?: string;
} | null) {
  if (!latexStatus) return t('workspace.latexDetecting');
  if (!latexStatus.available) return latexStatus.message || t('workspace.latexNotInstalled');
  const engineLabel = latexStatus.distribution && latexStatus.distribution !== 'LaTeX'
    ? latexStatus.distribution
    : latexStatus.engine;
  return `${latexStatus.message || t('workspace.latexConfigured')} · ${engineLabel}`;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>(defaultSettings.locale);

  return (
    <I18nProvider locale={locale} onLocaleChange={setLocale}>
      <AppContent />
    </I18nProvider>
  );
}

function AppContent() {
  const { t } = useT();
  const { locale, setLocale } = useLocale();
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
  const [status, setStatus] = useState('');
  const [wizard, setWizard] = useState<WizardState>(initialWizardState);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>(() => createEmptyChatGreeting(undefined, t));
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
  const [selectedCategory, setSelectedCategory] = useState('ALL_CATEGORIES');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [knowledgeResources, setKnowledgeResources] = useState<KnowledgeResource[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ type: 'upload' | 'knowledge'; id: string; label: string } | null>(null);
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

  // 主题模式初始化与系统变化监听
  useEffect(() => {
    applyTheme(settings.themeMode);
    const unwatch = watchSystemTheme(() => {
      if (settings.themeMode === 'auto') applyTheme('auto');
    });
    return unwatch;
  }, [settings.themeMode]);

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
    setLocale(loadedSettings.locale);
    setProjects(loadedProjects);
    setLatexStatus(loadedLatex);
    const activeProfile = getActiveProviderProfile(loadedSettings);
    setStatus(activeProfile.apiKey ? t('workspace.modelConnected') : t('workspace.configApiKey'));
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
    return model?.label || provider.selectedModelId || t('common.none');
  }, [configuredProvider, currentProvider]);
  const settingsHasApiKey = Boolean(configuredProvider);
  const apiStatusLabel = configuredProvider ? configuredProvider.label : t('workspace.apiKeyMissing');
  const latexStatusLabel = useMemo(() => formatLatexStatusLabel(t, latexStatus), [latexStatus, t]);
  const localizedProjectModeTemplates = useMemo(() => localizeProjectModeTemplates(projectModeTemplates, t), [t]);
  const homeModeHighlights = localizedProjectModeTemplates;
  const selectedWizardTemplate = useMemo(
    () => localizeProjectModeTemplate(getProjectModeTemplate(wizard.mode), t),
    [wizard.mode, t]
  );
  const wizardStepLabels = getWizardStepLabels(wizard.mode, t);

  const homeCapabilities = [
    { title: t('home.studyReview'), detail: t('home.studyReviewDetail') },
    { title: t('home.research'), detail: t('home.researchDetail') },
    { title: t('home.teaching'), detail: t('home.teachingDetail') },
    { title: t('home.assessment'), detail: t('home.assessmentDetail') }
  ];

  const homeWorkflow = [
    { title: t('home.configServices'), detail: t('home.configServicesDetail') },
    { title: t('home.selectMode'), detail: t('home.selectModeDetail') },
    { title: t('home.generateResults'), detail: t('home.generateResultsDetail') },
    { title: t('home.delivery'), detail: t('home.deliveryDetail') }
  ];

  const topnavShortcuts: Array<{ id: TopnavShortcutId; label: string; title: string }> = [
    { id: 'modes', label: t('modes.projectModes'), title: t('modes.projectModesTitle') },
    { id: 'materials', label: t('modes.materials'), title: t('modes.materialsTitle') },
    { id: 'workspace', label: t('modes.smartWorkspace'), title: t('modes.smartWorkspaceTitle') },
    { id: 'delivery', label: t('modes.deliveryCenter'), title: t('modes.deliveryCenterTitle') }
  ];
  const activeWorkspaceTabs = useMemo(
    () => localizeProjectModeTemplate(getProjectModeTemplate(activeProject?.meta.mode), t).tabs,
    [activeProject?.meta.mode, t]
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
        label: t('project.currentProjectModel')
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
    if (!activeProject) return ['ALL_CATEGORIES'];
    return ['ALL_CATEGORIES', ...Array.from(new Set(activeProject.questions.map((question) => question.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'))];
  }, [activeProject]);

  const practiceQuestions = useMemo<ReviewQuestion[]>(() => {
    if (!activeProject) return [];
    const questions = practiceMode === 'wrong'
      ? activeProject.questions.filter((question) => question.wrong)
      : selectedCategory === 'ALL_CATEGORIES'
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
    setChatMessages(toAgentMessages(detail, t));
    setChatSearchQuery('');
    setStatus(t('project.entered', { name: detail.meta.name }));
    setViewMode('workspace');
    setExportResult(null);
    setEditorTab(getWorkspaceTabsForMode(detail.meta.mode)[0]?.id ?? 'overview');
    setProjects(await ce.listProjects());
  }

  async function renameProject(project: ProjectMeta) {
    const nextName = window.prompt(t('project.renamePrompt'), project.name);
    if (!nextName?.trim()) return;
    const updatedMeta = await ce.renameProject(project.id, nextName.trim());
    setProjects(await ce.listProjects());
    if (activeProject?.meta.id === project.id) {
      setActiveProject({ ...activeProject, meta: updatedMeta });
    }
    setStatus(t('project.renamed', { name: updatedMeta.name }));
  }

  async function deleteProject(project: ProjectMeta) {
    const confirmed = window.confirm(t('project.confirmDelete', { name: project.name }));
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
      setChatMessages(createEmptyChatGreeting(undefined, t));
      setChatSearchQuery('');
      setViewMode('home');
    }
    setStatus(t('project.deleted', { name: project.name }));
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
      setChatMessages(toAgentMessages(detail, t));
      setChatSearchQuery('');
      setWizard(initialWizardState);
      setWizardStep(1);
      setViewMode('workspace');
      setEditorTab(getWorkspaceTabsForMode(detail.meta.mode)[0]?.id ?? 'overview');
      setStatus(t('project.created', { name: detail.meta.name }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('project.createFailed'));
    } finally {
      setIsCreatingProject(false);
    }
  }

  async function chooseLinkedFolder() {
    setIsChoosingLinkedFolder(true);
    try {
      const folder = await ce.selectProjectFolder();
      if (!folder) {
        setStatus(t('workspace.folderNotSelected'));
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        linkedFolder: folder,
        courseName: current.courseName || folder.split(/[\/]/).filter(Boolean).at(-1) || ''
      }));
      setStatus(t('workspace.folderSelected', { folder }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('project.createFailed'));
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
    setStatus(t('workspace.settingsSaved'));
    return saved;
  }

  async function discardSettings() {
    const loaded = await ce.getSettings();
    setSettings(loaded);
    setStatus(t('workspace.changesDiscarded'));
    return loaded;
  }

  async function updateActiveProjectModel(model: string) {
    if (!activeProject) return;
    const updatedMeta = await ce.updateProjectModel(activeProject.meta.id, model);
    setActiveProject({ ...activeProject, meta: updatedMeta });
    setProjects((current: ProjectMeta[]) => current.map((project) => project.id === updatedMeta.id ? updatedMeta : project));
    setStatus(t('project.switchedModel', { model }));
  }

  async function saveProjectConfig() {
    if (!activeProject) return;
    await ce.saveProjectConfig(activeProject.meta.id, configText);
    setStatus(t('project.configSaved', { name: activeProject.meta.name }));
  }

  async function saveProjectProgress() {
    if (!activeProject) return;
    await ce.saveProjectProgress(activeProject.meta.id, progressText);
    setStatus(t('project.progressSaved', { name: activeProject.meta.name }));
  }

  async function saveLearningProfile(profile: LearningProfile) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.saveLearningProfile(activeProject.meta.id, profile);
    setLearningProfileState(next);
    setActiveProject({ ...activeProject, learningProfile: next });
    return next;
  }

  async function analyzeLearningProfile(input: string) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.analyzeLearningProfile(activeProject.meta.id, input);
    setLearningProfileState(next);
    setActiveProject({ ...activeProject, learningProfile: next });
    return next;
  }

  async function generatePersonalizedResources(input: GeneratePersonalizedResourcesInput) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.generatePersonalizedResources(activeProject.meta.id, input);
    setPersonalizedResources(next);
    setActiveProject({ ...activeProject, personalizedResources: next });
    return next;
  }

  async function savePersonalizedResource(resource: PersonalizedResource) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.savePersonalizedResource(activeProject.meta.id, resource);
    setPersonalizedResources(next);
    setActiveProject({ ...activeProject, personalizedResources: next });
    return next;
  }

  async function deletePersonalizedResource(resourceId: string) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.deletePersonalizedResource(activeProject.meta.id, resourceId);
    setPersonalizedResources(next);
    setActiveProject({ ...activeProject, personalizedResources: next });
    return next;
  }

  async function generateLearningPathPlan(input: GenerateLearningPathInput) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.generateLearningPathPlan(activeProject.meta.id, input);
    setLearningPathPlan(next);
    setActiveProject({ ...activeProject, learningPathPlan: next });
    return next;
  }

  async function saveLearningPathPlan(plan: LearningPathPlan) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.saveLearningPathPlan(activeProject.meta.id, plan);
    setLearningPathPlan(next);
    setActiveProject({ ...activeProject, learningPathPlan: next });
    return next;
  }

  async function generateStageReport() {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.generateStageReport(activeProject.meta.id);
    setStageReports(next);
    setActiveProject({ ...activeProject, stageReports: next });
    return next;
  }

  async function saveStageReport(report: StageReport) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.saveStageReport(activeProject.meta.id, report);
    setStageReports(next);
    setActiveProject({ ...activeProject, stageReports: next });
    return next;
  }

  async function generateDeliveryPackage() {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.generateDeliveryPackage(activeProject.meta.id);
    setDeliveryPackage(next);
    setActiveProject({ ...activeProject, deliveryPackage: next });
    return next;
  }

  async function saveDeliveryPackage(deliveryPackage: DeliveryPackage) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.saveDeliveryPackage(activeProject.meta.id, deliveryPackage);
    setDeliveryPackage(next);
    setActiveProject({ ...activeProject, deliveryPackage: next });
    return next;
  }

  async function exportDeliveryPackage() {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const result = await ce.exportDeliveryPackage(activeProject.meta.id);
    const next = await ce.getDeliveryPackage(activeProject.meta.id);
    setDeliveryPackage(next);
    setActiveProject({ ...activeProject, deliveryPackage: next });
    setExportResult(result);
    setStatus(t('project.deliveryExported', { path: result.markdownPath }));
    return result;
  }

  async function generateModeArtifact(input: GenerateModeArtifactInput) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.generateModeArtifact(activeProject.meta.id, input);
    setModeArtifacts(next);
    setActiveProject({ ...activeProject, modeArtifacts: next });
    return next;
  }

  async function saveModeArtifact(artifact: ModeArtifact) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
    const next = await ce.saveModeArtifact(activeProject.meta.id, artifact);
    setModeArtifacts(next);
    setActiveProject({ ...activeProject, modeArtifacts: next });
    return next;
  }

  async function deleteModeArtifact(artifactId: string) {
    if (!activeProject) throw new Error(t('common.openProjectFirst'));
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
    setStatus(t('project.filesImported', { selected: String(selected.length), total: String(uploads.length), images: String(imageCount) }));
  }

  async function previewTextQuestions() {
    if (!questionText.trim()) return;
    setIsParsingQuestions(true);
    try {
      const drafts = await ce.previewQuestionsFromText(questionText, 'text', t('project.textPasteSource'));
      setQuestionDrafts(drafts);
      setImportSource('text');
      setStatus(t('project.textQuestionsParsed', { count: String(drafts.length) }));
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
      setStatus(t('project.fileQuestionsParsed', { files: String(selected.length), count: String(drafts.length) }));
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
    setStatus(t('project.questionsWritten', { count: String(questions.length) }));
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

  async function confirmDelete() {
    if (!activeProject || !pendingDelete) return;
    if (pendingDelete.type === 'upload') {
      const uploads = await ce.deleteUpload(activeProject.meta.id, pendingDelete.id);
      setActiveProject({ ...activeProject, uploads });
    } else {
      const knowledgeBase = await ce.deleteKnowledgeBaseEntry(activeProject.meta.id, pendingDelete.id);
      setActiveProject({ ...activeProject, knowledgeBase });
    }
    setStatus(t('project.deletedItem', { label: pendingDelete.label }));
    setPendingDelete(null);
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
      showToast(t('project.openProjectFirstAsk'));
      clearSelectionAsk();
      return;
    }
    setAgentInput(t('project.selectionAskPrompt', { text: selectionAsk.text }));
    setAiDrawerOpen(true);
    setAiTab('chat');
    clearSelectionAsk();
    window.getSelection()?.removeAllRanges();
  }

  function continueFromHistory(turn: AgentMessage | ChatTurn) {
    setAgentInput(t('project.continueFromHistory', { content: turn.content }));
    setAiDrawerOpen(true);
    setAiTab('chat');
    showToast(t('project.historyLoaded'));
  }

  async function exportProject() {
    if (!activeProject) return;
    const result = await ce.exportProject(activeProject.meta.id);
    setExportResult(result);
    setViewMode('export');
    setStatus(t('project.exported', { name: activeProject.meta.name }));
  }

  async function importProjectArchive() {
    const detail = await ce.importProjectArchive();
    if (!detail) {
      showToast(t('project.importCancelled'));
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
    setChatMessages(toAgentMessages(detail, t));
    setChatSearchQuery('');
    setProjects(nextProjects);
    setExportResult(null);
    setEditorTab(getWorkspaceTabsForMode(detail.meta.mode)[0]?.id ?? 'overview');
    setViewMode('workspace');
    setStatus(t('project.imported', { name: detail.meta.name }));
    showToast(t('project.importComplete'));
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
      setStatus(t('project.chatCompleted', { model: activeProject.meta.model }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('project.chatFailed'));
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
      fallbackTags: [t('project.chatArchiveTag')]
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
    setStatus(t('project.chatSavedToKb', { count: String(activeProject.knowledgeBase.length + 1) }));
  }

  async function saveUploadToKnowledgeBase(upload: ProjectSourceFile) {
    if (!activeProject || !upload.parsed) return;
    const draft = await ce.draftKnowledgeBaseEntry(activeProject.meta.id, 'upload', {
      title: upload.parsed.title,
      content: upload.parsed.extractedText,
      fallbackTags: [upload.kind === 'image' ? t('project.imageParseTag') : t('project.fileParseTag'), t('project.uploadArchiveTag')]
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
    setStatus(t('project.uploadSavedToKb', { name: upload.name, count: String(activeProject.knowledgeBase.length + 1) }));
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
            <option value="">{t('wizard.selectPlaceholder')}</option>
            {(field.options ?? []).map((option, index) => (
              <option key={option} value={option}>{field.optionLabels?.[index] ?? option}</option>
            ))}
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
    const actionLabel = t(wizardFieldLabelKeys[key] || 'wizard.textbook') || t('wizard.defaultFile');
    setWizardFileAction(String(key));
    try {
      const files = await selectWizardFiles();
      if (!files.length) {
        setStatus(t('wizard.cancelUploadFile', { label: actionLabel }));
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        [key]: appendWizardFileList(String(current[key] ?? ''), files, separator)
      }));
      setStatus(t('wizard.filesAdded', { label: actionLabel, count: String(files.length) }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('wizard.uploadFailed', { label: actionLabel }));
    } finally {
      setWizardFileAction(null);
    }
  }

  async function appendWizardTextFiles<K extends keyof WizardState>(key: K, separator = '\n') {
    const actionLabel = t(wizardFieldLabelKeys[key] || 'wizard.notes') || t('wizard.defaultText');
    setWizardFileAction(String(key));
    try {
      const files = await selectWizardFiles();
      if (!files.length) {
        setStatus(t('wizard.cancelImportText', { label: actionLabel }));
        return;
      }
      const texts = await Promise.all(files.map((filePath: string) => ce.extractFileText(filePath)));
      const importedText = texts.filter(Boolean).join(separator);
      if (!importedText.trim()) {
        setStatus(t('wizard.textFileEmpty', { label: actionLabel }));
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        [key]: appendWizardValue(String(current[key] ?? ''), importedText, separator)
      }));
      setStatus(t('wizard.textFilesImported', { label: actionLabel, count: String(files.length) }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('wizard.importTextFailed', { label: actionLabel }));
    } finally {
      setWizardFileAction(null);
    }
  }

  async function appendWizardQuestionFiles() {
    setWizardFileAction('initialQuestionText');
    try {
      const files = await selectWizardFiles();
      if (!files.length) {
        setStatus(t('wizard.cancelImportQuestions'));
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
        setStatus(t('wizard.questionFileEmpty'));
        return;
      }
      setWizard((current: WizardState) => ({
        ...current,
        initialQuestionText: appendWizardValue(current.initialQuestionText, importedText, '\n\n')
      }));
      setStatus(t('wizard.questionFilesImported', { count: String(files.length) }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t('wizard.importQuestionFailed'));
    } finally {
      setWizardFileAction(null);
    }
  }

  function syncChatToQuestions() {
    if (!activeProject) return;
    const latestAssistant = [...chatMessages].reverse().find(m => m.role === 'assistant');
    if (!latestAssistant?.content?.trim()) {
      showToast(t('project.noAiReply'));
      return;
    }
    void (async () => {
      try {
        const drafts = await ce.previewQuestionsFromText(latestAssistant.content, 'text', t('project.aiChatExtract'));
        if (!drafts.length) {
          showToast(t('project.noQuestionsFound'));
          return;
        }
        const questions = await ce.addQuestions(activeProject.meta.id, drafts);
        setActiveProject({ ...activeProject, questions });
        showToast(t('project.questionsExtracted', { count: String(questions.length) }));
      } catch (e) {
        showToast(e instanceof Error ? e.message : t('project.extractFailed'));
      }
    })();
  }

  async function openSystemStatus() {
    try {
      const latex = await ce.checkLatex();
      const settingsData = await ce.getSettings();
      const msg = [
        `LaTeX: ${formatLatexStatusLabel(t, latex)}`,
        `API: ${findConfiguredProvider(settingsData.providers, settingsData.activeProviderId) ? t('settings.enabled') : t('workspace.apiKeyMissing')}`,
        `${t('workspace.model')}: ${settingsData.model}`,
        `${t('project.modelCount')}: ${settingsData.availableModels.length}`,
        `${t('project.projectCount')}: ${projects.length}`,
      ].join('\n');
      window.alert(t('workspace.systemStatus') + '\n' + msg);
    } catch {
      window.alert(t('project.statusUnavailable'));
    }
  }

  function openApiReference() {
    window.alert(t('project.apiRefTitle') + '\n\n' + t('project.apiRefBody'));
  }

  function openDocumentation() {
    setViewMode('help');
    showToast(t('project.helpCenterOpened'));
  }

  function openAgentTarget(tab: 'profile' | 'resources' | 'path' | 'report' | 'delivery') {
    if (tab === 'profile') {
      setViewMode('settings');
      showToast(t('project.profileMovedToSettings'));
      return;
    }
    setViewMode('workspace');
    setEditorTab(tab);
  }

  function handleTopnavShortcut(shortcutId: TopnavShortcutId) {
    switch (shortcutId) {
      case 'modes':
        setViewMode('home');
        showToast(t('project.modesOpened'));
        return;
      case 'materials':
        if (!activeProject) {
          setViewMode('wizard');
          setWizardStep(1);
          showToast(t('project.createProjectFirst'));
          return;
        }
        setViewMode('workspace');
        setEditorTab('materials');
        showToast(t('project.materialsOpened'));
        return;
      case 'workspace':
        if (!activeProject) {
          setViewMode('wizard');
          setWizardStep(1);
          showToast(t('project.createProjectFirstWorkspace'));
          return;
        }
        setViewMode('workspace');
        setEditorTab('overview');
        showToast(t('project.workspaceOpened'));
        return;
      case 'delivery':
        if (!activeProject) {
          setViewMode('wizard');
          setWizardStep(1);
          showToast(t('project.createProjectFirstDelivery'));
          return;
        }
        setViewMode('workspace');
        setEditorTab('delivery');
        showToast(t('project.deliveryOpened'));
        return;
      default:
        setViewMode('home');
    }
  }

  /* ================================================================
     RENDER — Scholar's Study 布局
     ================================================================ */

  function handleLocaleChange(newLocale: Locale) {
    setLocale(newLocale);
    setSettings((current) => {
      const nextSettings = { ...current, locale: newLocale };
      void ce.saveSettings(nextSettings)
        .then((saved: AppSettings) => {
          setSettings((latest) => latest.locale === newLocale ? saved : latest);
        })
        .catch(() => {
          setStatus(t('settings.saveFailed'));
        });
      return nextSettings;
    });
  }

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
              placeholder={t('project.globalSearchPlaceholder')}
            />
          </div>
          <nav className="topnav-shortcuts" aria-label={t('project.globalNavAria')}>
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
          <button onClick={() => setAiDrawerOpen((v) => !v)} title={t('project.aiAssistant')}>
            {aiDrawerOpen ? '▶' : '◀'}
          </button>
          <button onClick={() => { setNotificationCount(0); showToast(t('project.notificationsCleared', { projects: String(projects.length), questions: String(activeProject ? activeProject.questions.length : 0) })); }} title={t('project.notifications')} style={{ position: 'relative' }}>
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
              {t('nav.newProject')}
            </button>
            <button
              className="sidebar-secondary-action"
              onClick={() => void importProjectArchive()}
            >
              {t('nav.importProject')}
            </button>
          </div>

          <nav className="sidebar-nav">
            <a className={viewMode === 'home' ? 'active' : ''} onClick={() => setViewMode('home')}>
              <span className="nav-icon">&#x2302;</span> {t('nav.home')}
            </a>
            <a className={viewMode === 'workspace' ? 'active' : ''} onClick={() => activeProject && setViewMode('workspace')}>
              <span className="nav-icon">&#x270E;</span> {t('nav.workspace')}
            </a>
            <a className={viewMode === 'export' ? 'active' : ''} onClick={() => activeProject && setViewMode('export')}>
              <span className="nav-icon">&#x21AA;</span> {t('nav.export')}
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
                <span className="nav-icon">&#x2699;</span> {t('nav.settings')}
              </a>
              <a className={viewMode === 'help' ? 'active' : ''} onClick={() => setViewMode('help')}>
                <span className="nav-icon">?</span> {t('nav.helpSupport')}
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
                    <h1>{t('home.heroTitle')}</h1>
                    <p>
                      {t('home.heroDesc')}
                    </p>
                    <div className="home-hero-actions">
                      <button className="primary" onClick={() => { setViewMode('wizard'); setWizardStep(1); }}>
                        {t('home.newProjectCta')}
                      </button>
                      <button onClick={() => setViewMode('help')}>
                        {t('home.viewGuide')}
                      </button>
                    </div>
                  </div>
                  <div className="home-hero-panel" aria-label={t('home.platformAria')}>
                    <strong>{t('home.modeHighlights')}</strong>
                    <span>{t('home.modeCategories')}</span>
                    <div className="home-hero-metrics">
                      <div><b>{projectModeTemplates.length}</b><small>{t('home.modeCount')}</small></div>
                      <div><b>39</b><small>{t('home.deliveryCount')}</small></div>
                      <div><b>{projects.length}</b><small>{t('home.localProjectCount')}</small></div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="section-header">
                    <h3>{t('home.fromConfigToDelivery')}</h3>
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
                    <h3>{t('home.coreCapabilities')}</h3>
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
                    <h3>{t('home.selectProjectMode')}</h3>
                    <span className="view-all">{t('home.clickToPreselect')}</span>
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
                    <h3>{t('home.recentProjects')}</h3>
                    <span className="view-all" onClick={() => { setShowAllProjects(!showAllProjects); showToast(showAllProjects ? t('home.collapseProjectList') : t('home.expandProjectList')); }} style={{ cursor: 'pointer' }}>
                      {showAllProjects ? t('home.collapseList') : t('home.viewAllArchives')}
                    </span>
                  </div>
                  <div className="home-recent-grid">
                    {projects.slice(0, showAllProjects ? projects.length : 3).map((project) => {
                      const summary = projectSummaries[project.id];
                      const display = getProjectModeDisplay(project, t);
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
                                  <span>{t('app.mastery')}</span>
                                  <span>{summary.progressPercent}%</span>
                                </div>
                                <div className="progress-bar-fill" style={{ height: '4px' }}>
                                  <i style={{ width: `${summary.progressPercent}%` }} />
                                </div>
                              </>
                            )}
                            {summary && summary.questionCount === 0 && (
                              <p style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                                {t('app.noQuestionsImported')}
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
                            {t('app.startNewTopic')}
                          </h5>
                          <p style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', opacity: 0.5 }}>
                            {t('app.startNewTopicDesc')}
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
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '4px' }}>{t('settings.title')}</h2>
                  <p className="muted">{t('app.settingsDesc')}</p>
                </div>
                <ProviderSettingsPage
                  initialSettings={settings}
                  onSave={saveSettings}
                  onDiscard={discardSettings}
                  workspaceOverview={activeProject ? (
                    <div className="settings-governance-content">
                      <div className="settings-governance-note">
                        <strong>{t('app.currentProjectNamed', { name: activeProject.meta.name })}</strong>
                        <span>{t('app.workspaceSummary')}</span>
                      </div>
                      <div className="workspace-governance-summary">
                        <div><span>{t('app.uploads')}</span><strong>{activeProject.uploads.length}</strong></div>
                        <div><span>{t('app.questionBank')}</span><strong>{activeProject.questions.length}</strong></div>
                        <div><span>{t('app.personalizedResources')}</span><strong>{personalizedResources.length}</strong></div>
                        <div><span>{t('app.stageReports')}</span><strong>{stageReports.length}</strong></div>
                        <div><span>{t('app.learningPath')}</span><strong>{learningPathPlan ? t('app.generated') : t('app.notGenerated')}</strong></div>
                        <div><span>{t('app.profileStatus')}</span><strong>{learningProfileState?.profile.updatedAt ? t('app.updated') : t('app.incomplete')}</strong></div>
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
                    {t('app.newProjectWizard')}
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
                        {t('app.projectName')}
                        <input value={wizard.name} onChange={(e) => updateWizard('name', e.target.value)} placeholder={t('app.projectNamePlaceholder')} />
                      </label>
                      <div className="wizard-common-field-grid">
                        <label className="wizard-mode-field wide">
                          {t('app.providerModel')}
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
                          {t('app.textbookRange')}
                          <div className="wizard-input-row align-start">
                            <textarea
                              rows={4}
                              value={wizard.textbook}
                              onChange={(e) => updateWizard('textbook', e.target.value)}
                              placeholder={t('app.textbookRangePlaceholder')}
                            />
                            <button disabled={wizardFileAction === 'textbook'} onClick={() => void appendWizardFiles('textbook', '; ')} title={t('app.uploadTextbook')}>📎 {t('app.uploadFile')}</button>
                          </div>
                        </label>
                      )}
                      <label className="wizard-mode-field wide">
                        {t('app.linkedFolder')}
                        <div className="wizard-input-row">
                          <input value={wizard.linkedFolder} onChange={(e) => updateWizard('linkedFolder', e.target.value)} placeholder={t('app.linkedFolderPlaceholder')} />
                          <button className="wizard-secondary-action" disabled={isChoosingLinkedFolder} onClick={() => void chooseLinkedFolder()}>📁 {t('app.selectFolder')}</button>
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
                        {wizard.mode === 'exam-review' ? t('app.additionalRequirements') : t('app.projectGoalsRequirements')}
                        <div className="wizard-input-row align-start">
                          <textarea rows={5} value={wizard.requirements} onChange={(e) => updateWizard('requirements', e.target.value)} placeholder={wizard.mode === 'exam-review' ? t('app.examRequirementsPlaceholder') : t('app.projectGoalsPlaceholder')} />
                          <button className="wizard-icon-action" disabled={wizardFileAction === 'requirements'} onClick={() => void appendWizardTextFiles('requirements')} title={t('app.importTextFile')}>📎</button>
                        </div>
                      </label>
                      {isQuestionOrientedMode(wizard.mode) && (
                        <label className="wizard-mode-field wide">
                          {t('app.classMaterials')}
                          <div className="wizard-input-row align-start">
                            <textarea rows={5} value={wizard.notes} onChange={(e) => updateWizard('notes', e.target.value)} placeholder={t('app.classMaterialsPlaceholder')} />
                            <button className="wizard-icon-action" disabled={wizardFileAction === 'notes'} onClick={() => void appendWizardFiles('notes')} title={t('app.uploadClassMaterials')}>📎</button>
                          </div>
                        </label>
                      )}
                      {wizard.mode === 'exam-review' && (
                        <>
                          <label className="wizard-mode-field wide">
                            {t('app.mustKnowLines')}
                            <div className="wizard-input-row align-start">
                              <textarea rows={4} value={wizard.mustKnow} onChange={(e) => updateWizard('mustKnow', e.target.value)} placeholder={t('app.mustKnowPlaceholder')} />
                              <button className="wizard-icon-action" disabled={wizardFileAction === 'mustKnow'} onClick={() => void appendWizardTextFiles('mustKnow')} title={t('app.importMustKnow')}>📎</button>
                            </div>
                          </label>
                          <label className="wizard-mode-field wide">
                            {t('app.keyKnowledgeLines')}
                            <div className="wizard-input-row align-start">
                              <textarea rows={4} value={wizard.keyPoints} onChange={(e) => updateWizard('keyPoints', e.target.value)} placeholder={t('app.keyKnowledgePlaceholder')} />
                              <button className="wizard-icon-action" disabled={wizardFileAction === 'keyPoints'} onClick={() => void appendWizardTextFiles('keyPoints')} title={t('app.importKeyKnowledge')}>📎</button>
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
                            {t('app.initialQuestionsPaste')}
                            <textarea
                              rows={10}
                              value={wizard.initialQuestionText}
                              onChange={(e) => updateWizard('initialQuestionText', e.target.value)}
                              placeholder={t('app.initialQuestionsPlaceholder')}
                            />
                          </label>
                          <div className="wizard-action-row">
                            <button className="wizard-secondary-action" disabled={wizardFileAction === 'initialQuestionText'} onClick={() => void appendWizardQuestionFiles()}>📁 {t('app.importQuestionsFile')}</button>
                            <span className="muted wizard-helper-text">
                              {t('app.supportedQuestionFiles')}
                            </span>
                          </div>
                          <p className="muted wizard-helper-text center">
                            {t('app.importMoreLater')}
                          </p>
                        </>
                      ) : (
                        <>
                          <label className="wizard-mode-field wide">
                            {t('app.materialNotes')}
                            <textarea
                              rows={8}
                              value={wizard.notes}
                              onChange={(e) => updateWizard('notes', e.target.value)}
                              placeholder={t('app.materialNotesPlaceholder', { name: selectedWizardTemplate.title })}
                            />
                          </label>
                          <div className="wizard-action-row">
                            <button className="wizard-secondary-action" disabled={wizardFileAction === 'notes'} onClick={() => void appendWizardFiles('notes')}>📁 {t('app.importMaterials')}</button>
                            <span className="muted wizard-helper-text">
                              {t('app.materialPathHint')}
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
                    &larr; {t('app.previousStep')}
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
                        {t('app.nextStep')} &rarr;
                      </button>
                    ) : (
                      <button className="primary" onClick={() => void createProject()} disabled={!canSubmitWizardProject}>
                        {isCreatingProject ? t('app.creating') : `🚀 ${t('app.createProject')}`}
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
                    <span className="upload-kind">{t('app.currentProject')}</span>
                    <h2>{activeProject.meta.name}</h2>
                    <p className="muted">
                      {activeProject.meta.courseName} &middot; {activeProject.meta.examType} &middot; {activeProject.meta.model}
                    </p>
                  </div>
                  <div className="project-hero-actions">
                    <label>
                      {t('app.projectModel')}
                      <select value={activeProject.meta.model} onChange={(e) => void updateActiveProjectModel(e.target.value)}>
                        {availableProjectModels.map((m) => (
                          <option key={`${m.providerId}:${m.id}`} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </label>
                    <button onClick={() => { setAiTab('chat'); setAiDrawerOpen(true); }}>{t('app.openTutor')}</button>
                    <button onClick={() => setViewMode('export')}>{t('app.exportResults')}</button>
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
                      onOpenProviderSettings={() => setViewMode('settings')}
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
                      onOpenProviderSettings={() => setViewMode('settings')}
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
                    <div className="section-title">{t('app.projectOverview')}</div>
                    <div className="summary-grid workspace-summary-grid">
                      <div><span>{t('app.uploads')}</span><strong>{activeProject.uploads.length}</strong></div>
                      <div><span>{t('app.knowledgeBase')}</span><strong>{activeProject.knowledgeBase.length}</strong></div>
                      <div><span>{t('app.questionBank')}</span><strong>{activeProject.questions.length}</strong></div>
                      <div><span>{t('app.conversation')}</span><strong>{activeProject.chatHistory.length}</strong></div>
                    </div>

                    <div className="workspace-jump-grid">
                      <button className="workspace-jump-card" onClick={() => setEditorTab('materials')}>
                        <span>01</span>
                        <strong>{t('app.organizeMaterials')}</strong>
                        <small>{t('app.organizeMaterialsDesc')}</small>
                      </button>
                      <button className="workspace-jump-card" onClick={() => setAiDrawerOpen(true)}>
                        <span>02</span>
                        <strong>{t('app.letAiTeach')}</strong>
                        <small>{t('app.letAiTeachDesc')}</small>
                      </button>
                      <button className="workspace-jump-card" onClick={() => setEditorTab('practice')}>
                        <span>03</span>
                        <strong>{t('app.startPractice')}</strong>
                        <small>{t('app.startPracticeDesc')}</small>
                      </button>
                      <button className="workspace-jump-card" onClick={() => setEditorTab('report')}>
                        <span>04</span>
                        <strong>{t('app.reviewGaps')}</strong>
                        <small>{t('app.reviewGapsDesc')}</small>
                      </button>
                    </div>

                    <div className="document-view compact-context">
                      <h3>{t('app.currentContext')}</h3>
                      <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichContent(activeProject.meta.requirements || activeProject.meta.textbook || t('app.noProjectDescription')) }} />
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
                    mode={activeProject.meta.mode}
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
                        <div className="section-title">{t('app.materialsKnowledge')}</div>
                        <h3>{t('app.materialsKnowledgeTitle')}</h3>
                        <p className="muted">{t('app.materialsKnowledgeDesc')}</p>
                      </div>
                      <button className="primary" onClick={() => void importFiles()}>
                        + {t('app.uploadMaterials')}
                      </button>
                    </div>

                    <div className="materials-page-grid materials-library-grid">
                      <div className="mini-section materials-section-card">
                        <div className="subsection-title">{t('app.importedMaterials')}</div>
                        <div className="stack-list">
                          {activeProject.uploads.length ? activeProject.uploads.map((upload) => (
                            <div key={upload.storedPath} className="upload-card material-card">
                              <div className="upload-kind">{upload.kind === 'image' ? t('app.image') : t('app.file')}</div>
                              <UploadImagePreview projectId={activeProject.meta.id} upload={upload} />
                              <div className="materials-card-title">{upload.name}</div>
                              <div className="muted">{upload.parsed?.summary || t('app.importedAwaitingParse')}</div>
                              {upload.parsed?.extractedText && (
                                <div className="parsed-preview">{upload.parsed.extractedText}</div>
                              )}
                              {upload.parsed && (
                                <button className="materials-card-action" onClick={() => void saveUploadToKnowledgeBase(upload)}>
                                  {t('app.distillToKnowledge')}
                                </button>
                              )}
                              <button
                                className="card-delete-btn"
                                title={t('app.deleteMaterial')}
                                onClick={() => setPendingDelete({ type: 'upload', id: upload.storedPath, label: upload.name })}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          )) : <div className="empty-slim">{t('app.noUploads')}</div>}
                        </div>
                      </div>

                      <div className="mini-section materials-section-card">
                        <div className="subsection-title">{t('app.projectKnowledgeBase')}</div>
                        <input
                          value={knowledgeQuery}
                          onChange={(e) => setKnowledgeQuery(e.target.value)}
                          placeholder={t('app.knowledgeFilterPlaceholder')}
                        />
                        <div className="muted">{t('app.knowledgeCount', { total: activeProject.knowledgeBase.length, shown: filteredKnowledgeBase.length })}</div>
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
                              <button className="materials-card-action" onClick={() => void loadKnowledgeResources(entry.title)}>
                                {t('app.knowledgeExpansion')}
                              </button>
                              <button
                                className="card-delete-btn"
                                title={t('app.deleteEntry')}
                                onClick={() => setPendingDelete({ type: 'knowledge', id: entry.id, label: entry.title })}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          )) : <div className="empty-slim">{t('app.noKnowledge')}</div>}
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
                      onOpenProviderSettings={() => setViewMode('settings')}
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
                    <div className="section-title">{t('app.courseConfig')}</div>
                    <textarea value={configText} onChange={(e) => setConfigText(e.target.value)} />
                    <div className="panel-actions horizontal">
                      <button className="primary" onClick={() => void saveProjectConfig()}>{t('app.saveYaml')}</button>
                    </div>
                  </section>
                )}

                {editorTab === 'progress' && (
                  <section className="panel project-single-page">
                    <div className="section-title">{t('app.projectProgress')}</div>
                    <textarea value={progressText} onChange={(e) => setProgressText(e.target.value)} />
                    <div className="document-view markdown-preview">
                      <div className="section-title">{t('app.markdownPreview')}</div>
                      <div className="rich-content" dangerouslySetInnerHTML={{ __html: renderRichContent(progressText || t('app.noProgress')) }} />
                    </div>
                    <div className="panel-actions horizontal">
                      <button className="primary" onClick={() => void saveProjectProgress()}>{t('app.saveProgress')}</button>
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ======== 导出页 ======== */}
            {viewMode === 'export' && activeProject && (
              <div className="page-stack">
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', marginBottom: '4px' }}>{t('app.export')}</h2>
                  <p className="muted">{t('app.exportDesc')}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  {/* 左：摘要 + 格式 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="panel">
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>{t('app.currentProject')}</span>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--color-primary)', marginTop: '4px' }}>
                          {activeProject.meta.name}
                        </h2>
                      </div>
                      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                        <div><span>{t('app.knowledgePoints')}</span><strong>{activeProject.knowledgeBase.length}</strong></div>
                        <div><span>{t('app.practiceQuestions')}</span><strong>{activeProject.questions.length}</strong></div>
                        <div><span>{t('app.uploads')}</span><strong>{activeProject.uploads.length}</strong></div>
                        <div><span>{t('app.chatRounds')}</span><strong>{activeProject.chatHistory.length}</strong></div>
                      </div>
                    </div>

                    <div className="panel">
                      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{t('app.exportFormat')}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                        <label className="checkbox-row" style={{ padding: '12px', border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}>
                          <input type="checkbox" defaultChecked />
                          <div>
                            <span style={{ display: 'block', fontWeight: 600 }}>Markdown (.md)</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{t('app.obsidianOptimized')}</span>
                          </div>
                        </label>
                        <label className="checkbox-row" style={{ padding: '12px', border: '1px solid var(--color-outline-variant)', borderRadius: '8px' }}>
                          <input type="checkbox" defaultChecked />
                          <div>
                            <span style={{ display: 'block', fontWeight: 600 }}>JSON (.json)</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>{t('app.structuredData')}</span>
                          </div>
                        </label>
                      </div>
                      <button className="primary" onClick={() => void exportProject()} style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
                        &#x1F4E5; {t('app.generateExport')}
                      </button>
                    </div>
                  </div>

                  {/* 右：最近导出 */}
                  <div className="panel" style={{ height: 'fit-content' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{t('app.recentExports')}</h3>
                    {exportResult ? (
                      <div className="upload-card">
                        <p style={{ fontWeight: 600, fontSize: '13px' }}>{t('app.exportComplete')}</p>
                        <p className="muted">Markdown：{exportResult.markdownPath}</p>
                        <p className="muted">JSON：{exportResult.jsonPath}</p>
                      </div>
                    ) : (
                      <p className="muted">{t('app.noExports')}</p>
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
              <h2>{t('app.aiTutor')}</h2>
              <p>{t('app.liveConsulting')}</p>
              <div style={{ marginTop: '4px', fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}>
                {currentProvider.label} &bull; {currentModelLabel}
              </div>
            </div>
            <button onClick={() => setAiDrawerOpen(false)}>&times;</button>
          </div>
          <div className="ai-drawer-tabs">
            <button className={aiTab === 'chat' ? 'active' : ''} onClick={() => setAiTab('chat')}>
              &#x1F4AC; {t('app.chat')}
            </button>
            <button className={aiTab === 'history' ? 'active' : ''} onClick={() => setAiTab('history')}>
              &#x23F1; {t('app.history')}
            </button>
            <button className={aiTab === 'reference' ? 'active' : ''} onClick={() => setAiTab('reference')}>
              &#x1F4DA; {t('app.references')}
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
                    <div className="chat-time">{formatDate(msg.createdAt, locale)}</div>
                  </div>
                ))}
              </>
            )}
            {aiTab === 'history' && (
              <div className="ai-history-panel">
                <div className="ai-history-summary">
                  <strong>{activeProject?.meta.name ?? t('app.noProjectSelected')}</strong>
                  <span>{t('app.projectHistoryCount', { count: activeProject?.chatHistory.length ?? 0 })}</span>
                </div>
                <input
                  className="ai-history-search"
                  value={chatSearchQuery}
                  onChange={(event) => setChatSearchQuery(event.target.value)}
                  placeholder={t('app.searchProjectHistory')}
                />
                <div className="ai-history-list">
                  {filteredChatHistory.length ? filteredChatHistory.map((turn, index) => (
                    <button
                      key={`history-${turn.createdAt}-${index}`}
                      className={turn.role === 'assistant' ? 'ai-history-card assistant' : 'ai-history-card user'}
                      onClick={() => continueFromHistory(turn)}
                    >
                      <span>{turn.role === 'assistant' ? t('app.aiTutor') : t('app.me')} · {formatDate(turn.createdAt, locale)}</span>
                      <strong>{turn.content.slice(0, 64) || t('app.emptyContent')}</strong>
                      <small>{turn.content.slice(64, 180)}</small>
                      <em>{t('app.continueAsking')}</em>
                    </button>
                  )) : (
                    <div className="empty-slim">{t('app.noMatchingHistory')}</div>
                  )}
                </div>
              </div>
            )}
            {aiTab === 'reference' && (
              <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic' }}>
                {t('app.selectKnowledgeForResources')}
              </div>
            )}
          </div>
          <div className="ai-drawer-footer">
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => void saveChatToKnowledgeBase()} style={{ flex: 1, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                &#x1F4DA; {t('app.syncToKnowledge')}
              </button>
              <button onClick={syncChatToQuestions} style={{ flex: 1, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} disabled={!activeProject}>
                &#x270E; {t('app.syncToQuestions')}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                placeholder={t('app.askTutorPlaceholder')}
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
          <span>{settingsHasApiKey ? `${t('workspace.model')}: ${currentModelLabel} | ${t('workspace.connected')}` : t('workspace.apiKeyMissing')}</span>
        </div>
        <div className="statusbar-right">
          <a onClick={openSystemStatus} style={{ cursor: 'pointer' }}>{t('workspace.systemStatus')}</a>
          <a onClick={openApiReference} style={{ cursor: 'pointer' }}>API</a>
          <a onClick={openDocumentation} style={{ cursor: 'pointer' }}>{t('workspace.docs')}</a>
        </div>
      </footer>

      {/* ---- 浮动 AI 按钮（抽屉关闭时显示） ---- */}
      {!aiDrawerOpen && (
        <button className="ai-fab" onClick={() => setAiDrawerOpen(true)} title={t('project.aiAssistant')}>
          &#x1F4AC;
        </button>
      )}

      {selectionAsk && (
        <div
          className="selection-ask-popover"
          style={{ left: selectionAsk.x, top: selectionAsk.y }}
        >
          <button onClick={askAiAboutSelection}>
            {t('app.askAiSelection')}
          </button>
        </div>
      )}

      {/* ---- 删除确认模态框 ---- */}
      {pendingDelete && (
        <div className="modal-overlay" onClick={() => setPendingDelete(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>{t('app.confirmDelete')}</h3>
            <p>{t('app.confirmDeleteNamed', { name: pendingDelete.label })}</p>
            <div className="modal-actions">
              <button onClick={() => setPendingDelete(null)}>{t('common.cancel')}</button>
              <button className="danger" onClick={() => void confirmDelete()}>{t('app.confirmDelete')}</button>
            </div>
          </div>
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
