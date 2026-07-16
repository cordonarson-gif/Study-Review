import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('workspace splits dense project content into focused project pages', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /type EditorTab = WorkspaceTabId/);
  assert.match(app, /activeWorkspaceTabs\.map/);
  assert.match(app, /editorTab === 'materials'/);
  assert.match(app, /setEditorTab\('materials'\)/);
  assert.match(app, /editorTab === 'resources'/);
  assert.match(app, /editorTab === 'path'/);
  assert.match(app, /editorTab === 'report'/);
  assert.match(app, /editorTab === 'delivery'/);
  assert.match(app, /className="project-page-shell"/);
  assert.match(app, /className="workspace-jump-grid"/);
  assert.match(app, /className="[^"]*\bmaterials-page-grid\b[^"]*"/);
  assert.doesNotMatch(app, /<div className="workspace-grid app-grid">/);
  assert.doesNotMatch(app, /<section className="panel right-pane">/);

  assert.match(workspaceCss, /\.project-page-shell\b/);
  assert.match(workspaceCss, /\.workspace-jump-grid\b/);
  assert.match(workspaceCss, /\.materials-page-grid\b/);
});

test('exam review workspace keeps only project workflow tabs and moves global panels out', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const registry = await import('../../lib/projectModes.js');
  const examTabs = registry.getWorkspaceTabsForMode('exam-review').map((tab) => tab.id);

  assert.deepEqual(examTabs, [
    'overview',
    'materials',
    'resources',
    'path',
    'practice',
    'import',
    'report',
    'delivery'
  ]);

  for (const globalTab of ['profile', 'agents', 'config', 'progress']) {
    assert.ok(!examTabs.includes(globalTab), `${globalTab} should not be an exam-review workspace tab`);
  }

  assert.doesNotMatch(app, /editorTab === 'profile' && \(/);
  assert.doesNotMatch(app, /editorTab === 'agents' && \(/);
  assert.doesNotMatch(app, /onClick=\{\(\) => setEditorTab\('progress'\)\}/);
  assert.match(app, /setViewMode\('settings'\)/);
  assert.match(app, /workspaceOverview=/);
  assert.match(app, /workspaceProfile=/);
  assert.match(app, /workspaceAgents=/);
  assert.doesNotMatch(app, /workspaceGovernance=/);
});

test('home page presents the upgraded multi-mode product surface', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /projectModeTemplates/);
  assert.match(app, /const homeModeHighlights = projectModeTemplates/);
  assert.match(app, /16 类项目模式/);
  assert.match(app, /学习、科研、教学与测评的一体化工作台/);
  assert.match(app, /论文助手/);
  assert.match(app, /科研数据分析/);
  assert.match(app, /教学设计/);
  assert.match(app, /互动课件/);
  assert.match(app, /知识图谱/);
  assert.match(app, /错题集/);
  assert.match(app, /配置服务/);
  assert.match(app, /选择模式/);
  assert.match(app, /生成成果/);
  assert.match(app, /交付导出/);
  assert.match(app, /home-mode-grid/);
  assert.match(app, /home-capability-grid/);
  assert.match(app, /home-workflow-grid/);
  assert.match(app, /setViewMode\('help'\)/);
  assert.doesNotMatch(app, /把每一门课/);
  assert.doesNotMatch(app, /烤成一炉好题/);

  assert.match(workspaceCss, /\.home-hero\b/);
  assert.match(workspaceCss, /\.home-mode-grid\b/);
  assert.match(workspaceCss, /\.home-capability-grid\b/);
  assert.match(workspaceCss, /\.home-workflow-grid\b/);
});

test('project cards show mode-specific icons and labels instead of always showing exam type', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const projectList = await readFile(new URL('../ProjectListPanel.tsx', import.meta.url), 'utf8');
  const componentsCss = await readFile(new URL('../../styles/components.css', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');
  const recentProjectSnippet = app.slice(
    app.indexOf('className="home-recent-grid"'),
    app.indexOf('{projects.length < 3', app.indexOf('className="home-recent-grid"'))
  );
  const listCardSnippet = projectList.slice(
    projectList.indexOf('className="project-card-main"'),
    projectList.indexOf('className="project-card-actions"')
  );

  assert.match(projectList, /import \{ getProjectModeDisplay \} from '\.\.\/lib\/projectDisplay'/);
  assert.match(projectList, /const display = getProjectModeDisplay\(project\)/);
  assert.match(listCardSnippet, /project-card-badge/);
  assert.match(listCardSnippet, /display\.icon/);
  assert.match(listCardSnippet, /display\.subtitle/);
  assert.doesNotMatch(listCardSnippet, /project\.examType/);

  assert.match(app, /import \{ getProjectModeDisplay \} from '\.\.\/lib\/projectDisplay'/);
  assert.match(recentProjectSnippet, /const display = getProjectModeDisplay\(project\)/);
  assert.match(recentProjectSnippet, /home-project-mode-icon/);
  assert.match(recentProjectSnippet, /display\.icon/);
  assert.match(recentProjectSnippet, /display\.subtitle/);
  assert.doesNotMatch(recentProjectSnippet, /project\.examType/);

  assert.match(componentsCss, /\.project-card-badge\b/);
  assert.match(workspaceCss, /\.home-project-mode-icon\b/);
});

test('settings includes a global learning profile entry instead of a project profile tab', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const settingsPage = await readFile(new URL('ProviderSettingsPage.tsx', import.meta.url), 'utf8');
  const settingsNav = await readFile(new URL('SettingsCategoryNav.tsx', import.meta.url), 'utf8');
  const profilePage = await readFile(new URL('../profile/LearningProfilePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ LearningProfilePage \} from '\.\.\/components\/profile\/LearningProfilePage'/);
  assert.match(app, /<LearningProfilePage\b/);
  assert.match(app, /workspaceProfile=/);
  assert.match(app, /workspaceOverview=/);
  assert.doesNotMatch(app, /workspaceGovernance/);
  assert.match(settingsPage, /category === 'workspace'/);
  assert.match(settingsPage, /workspaceProfile/);
  assert.match(settingsPage, /workspace-hub-tabs/);
  assert.match(settingsNav, /workspace/);
  assert.match(settingsNav, /全局能力/);
  assert.match(app, /getLearningProfile/);
  assert.match(app, /saveLearningProfile/);
  assert.match(app, /analyzeLearningProfile/);

  for (const dimension of ['知识水平', '学习目标', '认知风格', '薄弱点', '错题模式', '资源偏好', '可用时间', '学习动机']) {
    assert.match(profilePage, new RegExp(dimension));
  }

  assert.match(profilePage, /saveLearningProfile/);
  assert.match(profilePage, /analyzeLearningProfile/);
  assert.match(profilePage, /profile-events/);
  assert.match(workspaceCss, /\.global-workspace-settings\b/);
  assert.match(workspaceCss, /\.learning-profile-page\b/);
  assert.match(workspaceCss, /\.future-module-grid\b/);
});

test('learning profile editor keeps lower form fields aligned in a card grid', async () => {
  const profilePage = await readFile(new URL('../profile/LearningProfilePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(profilePage, /className="profile-field"/);
  assert.match(profilePage, /className="profile-field wide"/);
  assert.match(profilePage, /className="profile-field compact"/);
  assert.match(workspaceCss, /\.profile-editor-main\s*\{\s*display:\s*grid/);
  assert.match(workspaceCss, /\.profile-field\b/);
  assert.match(workspaceCss, /\.profile-field\.wide\b/);
  assert.match(workspaceCss, /\.profile-field textarea\b/);
  assert.match(workspaceCss, /\.profile-inline-fields\b/);
});

test('resources tab renders the personalized resources page instead of a placeholder', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const resourcesPage = await readFile(new URL('../resources/PersonalizedResourcesPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ PersonalizedResourcesPage \} from '\.\.\/components\/resources\/PersonalizedResourcesPage'/);
  assert.match(app, /editorTab === 'resources' && \(/);
  assert.match(app, /<PersonalizedResourcesPage\b/);
  assert.match(app, /listPersonalizedResources/);
  assert.match(app, /generatePersonalizedResources/);
  assert.match(app, /savePersonalizedResource/);
  assert.match(app, /deletePersonalizedResource/);
  assert.doesNotMatch(app, /title="个性化资源"\s+description="围绕学习画像生成讲义、例题、速记卡和补漏资料"/);

  for (const text of ['生成资源', '资源类型', '资源库', 'Markdown 预览', '保存资源', '删除资源']) {
    assert.match(resourcesPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.personalized-resources-page\b/);
  assert.match(workspaceCss, /\.resource-library-grid\b/);
});

test('path tab renders the learning path page instead of a placeholder', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const pathPage = await readFile(new URL('../path/LearningPathPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ LearningPathPage \} from '\.\.\/components\/path\/LearningPathPage'/);
  assert.match(app, /editorTab === 'path' && \(/);
  assert.match(app, /<LearningPathPage\b/);
  assert.match(app, /getLearningPathPlan/);
  assert.match(app, /generateLearningPathPlan/);
  assert.match(app, /saveLearningPathPlan/);
  assert.doesNotMatch(app, /title="学习路径"\s+description="按剩余时间、薄弱点和目标自动排阶段计划"/);

  for (const text of ['生成路径', '目标日期', '每日学习分钟', '阶段计划', '风险提醒', '保存路径']) {
    assert.match(pathPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.learning-path-page\b/);
  assert.match(workspaceCss, /\.learning-path-stage-grid\b/);
});

test('report tab renders the stage report page instead of a placeholder', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const reportPage = await readFile(new URL('../report/StageReportPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ StageReportPage \} from '\.\.\/components\/report\/StageReportPage'/);
  assert.match(app, /editorTab === 'report' && \(/);
  assert.match(app, /<StageReportPage\b/);
  assert.match(app, /listStageReports/);
  assert.match(app, /generateStageReport/);
  assert.match(app, /saveStageReport/);
  assert.doesNotMatch(app, /title="阶段报告"\s+description="汇总画像变化、练习表现、知识库沉淀和下一步建议"/);

  for (const text of ['生成报告', '阶段报告', '下一步动作', '风险提醒', '保存报告']) {
    assert.match(reportPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.stage-report-page\b/);
  assert.match(workspaceCss, /\.stage-report-grid\b/);
});

test('settings renders the global agent orchestration page instead of a project tab', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const settingsPage = await readFile(new URL('ProviderSettingsPage.tsx', import.meta.url), 'utf8');
  const agentsPage = await readFile(new URL('../agents/AgentOrchestrationPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ AgentOrchestrationPage \} from '\.\.\/components\/agents\/AgentOrchestrationPage'/);
  assert.match(app, /<AgentOrchestrationPage\b/);
  assert.match(app, /openAgentTarget/);
  assert.doesNotMatch(app, /editorTab === 'agents' && \(/);
  assert.doesNotMatch(app, /title="多智能体编排"\s+description="把画像、资料、题目和目标拆给不同 Agent 协同处理"/);

  for (const text of ['ProfileAgent', 'ResourceAgent', 'PathAgent', 'ReportAgent', '推荐执行顺序']) {
    assert.match(agentsPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.agent-orchestration-page\b/);
  assert.match(workspaceCss, /\.agent-flow-grid\b/);
  assert.match(app, /workspaceAgents=/);
  assert.match(settingsPage, /workspaceAgents/);
});

test('delivery tab renders the delivery package page instead of a placeholder', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const deliveryPage = await readFile(new URL('../delivery/DeliveryPackagePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ DeliveryPackagePage \} from '\.\.\/components\/delivery\/DeliveryPackagePage'/);
  assert.match(app, /editorTab === 'delivery' && \(/);
  assert.match(app, /<DeliveryPackagePage\b/);
  assert.match(app, /getDeliveryPackage/);
  assert.match(app, /generateDeliveryPackage/);
  assert.match(app, /saveDeliveryPackage/);
  assert.match(app, /exportDeliveryPackage/);
  assert.doesNotMatch(app, /title="成果交付"\s+description="把最终材料组织为可导出、可复用、可检查的交付包"/);

  for (const text of ['生成交付包', '交付清单', '资料包', '报告包', '题库包', '导出交付包']) {
    assert.match(deliveryPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.delivery-package-page\b/);
  assert.match(workspaceCss, /\.delivery-item-grid\b/);
});

test('materials and delivery pages use dedicated layout primitives instead of recycled inline forms', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const deliveryPage = await readFile(new URL('../delivery/DeliveryPackagePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  const knowledgeResourceList = app.match(/function KnowledgeResourceList[\s\S]*?function FutureModulePage/)?.[0] ?? '';

  assert.match(app, /className="[^"]*\bmaterials-library-grid\b[^"]*"/);
  assert.match(app, /className="[^"]*\bmaterials-section-card\b[^"]*"/);
  assert.match(app, /className="materials-card-title"/);
  assert.match(knowledgeResourceList, /className="materials-resource-panel"/);
  assert.match(knowledgeResourceList, /className=\{resource\.read \? 'materials-resource-card read' : 'materials-resource-card'\}/);
  assert.doesNotMatch(knowledgeResourceList, /className="resource-panel"/);
  assert.doesNotMatch(knowledgeResourceList, /className=\{resource\.read \? 'resource-item read' : 'resource-item'\}/);

  assert.match(deliveryPage, /className="delivery-field-grid"/);
  assert.match(deliveryPage, /className="delivery-field"/);
  assert.match(deliveryPage, /className="delivery-field wide"/);
  assert.match(deliveryPage, /className="delivery-checklist-card"/);
  assert.doesNotMatch(deliveryPage, /className="profile-inline-fields"/);

  for (const selector of [
    '.materials-library-grid',
    '.materials-section-card',
    '.materials-resource-panel',
    '.materials-resource-card',
    '.delivery-field-grid',
    '.delivery-field',
    '.delivery-field.wide',
    '.delivery-checklist-card'
  ]) {
    assert.match(workspaceCss, new RegExp(selector.replace('.', '\\.') + '\\b'));
  }
});

test('delivery export saves the current draft before exporting and reloading persisted state', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const deliveryPage = await readFile(new URL('../delivery/DeliveryPackagePage.tsx', import.meta.url), 'utf8');
  const exportHandler = deliveryPage.match(/async function exportPackage\(\)[\s\S]*?\n  \}/)?.[0] ?? '';
  const appExportHandler = app.match(/async function exportDeliveryPackage\(\)[\s\S]*?\n  \}/)?.[0] ?? '';

  assert.match(exportHandler, /const saved = await onSave\(draft\)/);
  assert.match(exportHandler, /setDraft\(saved\)/);
  assert.match(exportHandler, /onChange\(saved\)/);
  assert.match(exportHandler, /const result = await onExport\(\)/);
  assert.ok(exportHandler.indexOf('await onSave(draft)') < exportHandler.indexOf('await onExport()'));

  assert.match(appExportHandler, /await ce\.exportDeliveryPackage\(activeProject\.meta\.id\)/);
  assert.match(appExportHandler, /await ce\.getDeliveryPackage\(activeProject\.meta\.id\)/);
  assert.ok(appExportHandler.indexOf('exportDeliveryPackage') < appExportHandler.indexOf('getDeliveryPackage'));
});

test('closed AI assistant does not reserve a blank right rail and removes unused avatar', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const layoutCss = await readFile(new URL('../../styles/layout.css', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /\{aiDrawerOpen && \(/);
  assert.doesNotMatch(app, /className=\{`ai-drawer \$\{aiDrawerOpen \? '' : 'collapsed'\}`\}/);
  assert.doesNotMatch(app, /topnav-avatar/);
  assert.doesNotMatch(app, />S<\/div>/);

  assert.match(layoutCss, /\.main\.ai-open\b/);
  assert.doesNotMatch(layoutCss, /\.topnav-avatar\b/);
  assert.match(workspaceCss, /max-width: min\(1480px, 100%\)/);
});

test('top navigation shortcuts match upgraded product workflows and are actionable', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const layoutCss = await readFile(new URL('../../styles/layout.css', import.meta.url), 'utf8');
  const topnavSnippet = app.slice(
    app.indexOf('<div className="topnav-center">'),
    app.indexOf('<div className="topnav-right">')
  );

  assert.match(app, /type TopnavShortcutId = 'modes' \| 'materials' \| 'workspace' \| 'delivery'/);
  assert.match(app, /const topnavShortcuts/);
  assert.match(app, /label: '项目模式'/);
  assert.match(app, /label: '资料识别'/);
  assert.match(app, /label: '智能工作台'/);
  assert.match(app, /label: '交付中心'/);
  assert.match(app, /function handleTopnavShortcut/);
  assert.match(app, /case 'modes':/);
  assert.match(app, /setViewMode\('home'\)/);
  assert.match(app, /case 'materials':/);
  assert.match(app, /setEditorTab\('materials'\)/);
  assert.match(app, /case 'delivery':/);
  assert.match(app, /setEditorTab\('delivery'\)/);
  assert.match(topnavSnippet, /topnavShortcuts\.map/);
  assert.doesNotMatch(topnavSnippet, /stageOrder\.map/);
  assert.doesNotMatch(topnavSnippet, /拆解|讲授|检题|补漏/);
  assert.match(layoutCss, /\.topnav-shortcuts\b/);
});

test('materials page renders image upload previews from a safe Electron data URL', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const preload = await readFile(new URL('../../../electron/preload.cts', import.meta.url), 'utf8');
  const main = await readFile(new URL('../../../electron/main.cts', import.meta.url), 'utf8');

  assert.match(app, /function UploadImagePreview/);
  assert.match(app, /getUploadDataUrl/);
  assert.match(app, /<img\b/);
  assert.match(preload, /getUploadDataUrl/);
  assert.match(main, /project:getUploadDataUrl/);
});

test('new project wizard starts with a mode selector and mode-specific fields', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const selector = await readFile(new URL('../modes/ProjectModeSelector.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');
  const registry = await import('../../lib/projectModes.js');

  assert.match(app, /import \{ ProjectModeSelector \} from '\.\.\/components\/modes\/ProjectModeSelector'/);
  assert.match(app, /getProjectModeTemplate/);
  assert.match(app, /modeConfig/);
  assert.match(app, /renderModeField/);
  assert.match(app, /<ProjectModeSelector\b/);
  assert.equal(registry.projectModeTemplates.length, 16);

  for (const text of ['期末复习', '论文助手', '科研数据分析', '教学设计', '作业出题批改']) {
    assert.match(selector, new RegExp(text));
  }

  assert.match(workspaceCss, /\.project-mode-grid\b/);
  assert.match(workspaceCss, /\.project-mode-card\b/);
});

test('all project template forms use aligned field cards instead of inline input styling', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const simulation = await readFile(new URL('../modes/SimulationWorkbenchPage.tsx', import.meta.url), 'utf8');
  const courseware = await readFile(new URL('../modes/CoursewareStudioPage.tsx', import.meta.url), 'utf8');
  const modeModule = await readFile(new URL('../modes/ModeModulePage.tsx', import.meta.url), 'utf8');
  const questionImport = await readFile(new URL('../QuestionImportPanel.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');
  const componentsCss = await readFile(new URL('../../styles/components.css', import.meta.url), 'utf8');

  assert.match(app, /className="wizard-form-stack"/);
  assert.match(app, /className="wizard-mode-field wide"/);
  assert.match(app, /className="wizard-action-row"/);
  assert.doesNotMatch(app, /placeholder="例如：计算机系统结构 101" style=/);
  assert.doesNotMatch(app, /wizard\.linkedFolder[\s\S]{0,160}style=\{\{/);
  assert.doesNotMatch(app, /wizard\.requirements[\s\S]{0,220}style=\{\{/);
  assert.doesNotMatch(app, /wizard\.notes[\s\S]{0,220}style=\{\{/);
  assert.doesNotMatch(app, /wizard\.initialQuestionText[\s\S]{0,220}style=\{\{/);

  assert.match(simulation, /className="simulation-field"/);
  assert.match(courseware, /className="courseware-source-editor mode-form-field wide"/);
  assert.match(modeModule, /className="mode-form-field wide"/);
  assert.match(modeModule, /className="mode-form-field"/);
  assert.match(questionImport, /className="question-draft-field wide"/);
  assert.match(questionImport, /className="question-draft-field"/);
  assert.doesNotMatch(questionImport, /<label style=\{\{ display: 'flex', flexDirection: 'column'/);

  assert.match(workspaceCss, /\.wizard-form-stack\b/);
  assert.match(workspaceCss, /\.wizard-mode-field\.wide\b/);
  assert.match(workspaceCss, /\.wizard-action-row\b/);
  assert.match(workspaceCss, /\.mode-form-field\b/);
  assert.match(workspaceCss, /\.simulation-field\b/);
  assert.match(componentsCss, /\.question-draft-field\b/);
});

test('practice workspace uses question-bank first navigation and AI question generation', async () => {
  const practicePanel = await readFile(new URL('../PracticePanel.tsx', import.meta.url), 'utf8');
  const questionImport = await readFile(new URL('../QuestionImportPanel.tsx', import.meta.url), 'utf8');
  const componentsCss = await readFile(new URL('../../styles/components.css', import.meta.url), 'utf8');

  assert.match(practicePanel, /buildQuestionBanks/);
  assert.match(practicePanel, /selectedQuestionBank/);
  assert.match(practicePanel, /className="[^"]*question-bank-sidebar/);
  assert.match(practicePanel, /AI 出题/);
  assert.match(practicePanel, /generateQuestions/);
  assert.match(practicePanel, /referenceQuestionIds/);

  assert.match(questionImport, /questionBankName/);
  assert.match(questionImport, /题库名称/);
  assert.match(questionImport, /questionBankName:/);

  assert.match(componentsCss, /\.question-bank-sidebar\b/);
  assert.match(componentsCss, /\.ai-question-generator\b/);
});

test('practice workspace keeps AI generation in a focused configuration page', async () => {
  const practicePanel = await readFile(new URL('../PracticePanel.tsx', import.meta.url), 'utf8');
  const componentsCss = await readFile(new URL('../../styles/components.css', import.meta.url), 'utf8');

  assert.match(practicePanel, /type PracticeView = 'practice' \| 'ai-generator'/);
  assert.match(practicePanel, /setPracticeView\('ai-generator'\)/);
  assert.match(practicePanel, /className="practice-ai-config-page"/);
  assert.match(practicePanel, /返回刷题/);
  assert.match(practicePanel, /setPracticeView\('practice'\)/);

  const mainPracticeSnippet = practicePanel.slice(
    practicePanel.indexOf('<div className="practice-stats-bar">'),
    practicePanel.indexOf('{currentQuestion ?', practicePanel.indexOf('<div className="practice-stats-bar">'))
  );
  assert.doesNotMatch(mainPracticeSnippet, /ai-question-generator/);

  assert.match(componentsCss, /\.practice-ai-config-page\b/);
  assert.match(componentsCss, /\.practice-toolbar-spacer\b/);
});

test('new project wizard adapts steps, fields, and imports to the selected mode', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /function isQuestionOrientedMode\(mode: ProjectMode\)/);
  for (const mode of ['exam-review', 'assignment-quiz', 'teaching-game', 'mistake-collection']) {
    assert.match(app, new RegExp(`'${mode}'`));
  }

  assert.match(app, /function getWizardStepLabels\(mode: ProjectMode\)/);
  assert.match(app, /\['项目信息', '出题要求', '题目导入'\]/);
  assert.match(app, /\['项目信息', '工作目标', '素材导入'\]/);
  assert.match(app, /const wizardStepLabels = getWizardStepLabels\(wizard\.mode\)/);
  assert.match(app, /\{wizardStepLabels\[step - 1\]\}/);

  assert.match(app, /const handledWizardFieldKeys = new Set\(\['name', 'requirements', 'notes', 'textbook'\]\)/);
  assert.match(app, /selectedWizardTemplate\.wizardFields\.filter\(\(field\) => !handledWizardFieldKeys\.has\(field\.key\)\)\.map\(renderModeField\)/);
  assert.match(app, /type WizardStringField = 'name' \| 'courseName' \| 'examType' \| 'textbook' \| 'requirements'/);
  assert.match(app, /function isWizardStringField\(key: string\): key is WizardStringField/);
  const stringFieldHelper = app.match(/function isWizardStringField[\s\S]*?\n\}/)?.[0] ?? '';
  assert.doesNotMatch(stringFieldHelper, /initialWizardState|modeConfig|provider|model/);
  assert.match(app, /isWizardStringField\(field\.key\)/);
  assert.match(app, /wizard\[field\.key\]/);
  assert.match(app, /updateWizard\(field\.key, value\)/);
  assert.match(app, /wizard\.modeConfig\[field\.key\]/);
  assert.match(app, /updateModeConfig\(field\.key, value\)/);
  assert.match(
    app,
    /wizard\.mode === 'exam-review'[\s\S]*?value=\{wizard\.textbook\}[\s\S]*?appendWizardFiles\('textbook', '; '\)/
  );
  assert.match(
    app,
    /wizardStep === 2[\s\S]*?isQuestionOrientedMode\(wizard\.mode\) && \([\s\S]*?value=\{wizard\.notes\}[\s\S]*?appendWizardFiles\('notes'\)[\s\S]*?wizardStep === 3/
  );
  assert.equal(app.match(/value=\{wizard\.notes\}/g)?.length, 2);

  assert.match(
    app,
    /isQuestionOrientedMode\(wizard\.mode\)\s*\?\s*\([\s\S]*?value=\{wizard\.initialQuestionText\}[\s\S]*?appendWizardQuestionFiles\(\)[\s\S]*?\)\s*:\s*\([\s\S]*?value=\{wizard\.notes\}[\s\S]*?appendWizardFiles\('notes'\)/
  );
});

test('workspace renders mode-specific module pages with persistent artifacts', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const modePage = await readFile(new URL('../modes/ModeModulePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /getWorkspaceTabsForMode/);
  assert.match(app, /isModeTab/);
  assert.match(app, /<ModeModulePage\b/);
  assert.match(app, /modeArtifacts/);
  assert.match(app, /generateModeArtifact/);
  assert.match(app, /saveModeArtifact/);
  assert.match(app, /deleteModeArtifact/);

  assert.match(modePage, /const newestArtifact = next\[0\]/);
  assert.match(modePage, /newestArtifact\?\.source === 'agent'/);
  assert.match(modePage, /AI 成果已生成/);
  assert.match(modePage, /模型不可用，已生成本地模板/);
  assert.match(modePage, /agent: 'AI生成'/);
  assert.match(modePage, /fallback: '本地模板'/);
  assert.match(modePage, /manual: '手动编辑'/);
  assert.match(modePage, /artifactSourceLabels\[artifact\.source\]/);
  assert.doesNotMatch(modePage, /error\.(?:message|stack)|String\(error\)/);

  for (const text of ['生成成果', '保存成果', '删除成果', '成果库']) {
    assert.match(modePage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.mode-module-page\b/);
  assert.match(workspaceCss, /\.mode-artifact-grid\b/);
});

test('workspace routes advanced modes to interactive specialized pages', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /import \{ SimulationWorkbenchPage \} from '\.\.\/components\/modes\/SimulationWorkbenchPage'/);
  assert.match(app, /import \{ KnowledgeGraphPage \} from '\.\.\/components\/modes\/KnowledgeGraphPage'/);
  assert.match(app, /import \{ CoursewareStudioPage \} from '\.\.\/components\/modes\/CoursewareStudioPage'/);
  assert.match(app, /import \{ TeachingGamePage \} from '\.\.\/components\/modes\/TeachingGamePage'/);

  assert.match(app, /editorTab === 'simulation-run'[\s\S]*?<SimulationWorkbenchPage\b/);
  assert.match(app, /editorTab === 'graph-view'[\s\S]*?<KnowledgeGraphPage\b/);
  assert.match(app, /editorTab === 'courseware-preview'[\s\S]*?<CoursewareStudioPage\b/);
  assert.match(app, /editorTab === 'game-preview'[\s\S]*?<TeachingGamePage\b/);
  assert.match(app, /editorTab === 'game-bank'[\s\S]*?<QuestionImportPanel\b[\s\S]*?setEditorTab\('game-preview'\)/);
  assert.match(app, /editorTab === 'mistakes-import'[\s\S]*?<QuestionImportPanel\b[\s\S]*?setEditorTab\('mistakes-review'\)/);
  assert.match(app, /editorTab === 'mistakes-review'[\s\S]*?<PracticePanel\b/);
  assert.match(app, /editorTab === 'mistakes-practice'[\s\S]*?<PracticePanel\b/);
  assert.match(app, /specializedModeTabs/);
  assert.match(app, /!specializedModeTabs\.has\(editorTab\)/);
});

test('advanced workspaces preserve consistent run, selection, and draft state', async () => {
  const simulation = await readFile(new URL('../modes/SimulationWorkbenchPage.tsx', import.meta.url), 'utf8');
  const graph = await readFile(new URL('../modes/KnowledgeGraphPage.tsx', import.meta.url), 'utf8');
  const courseware = await readFile(new URL('../modes/CoursewareStudioPage.tsx', import.meta.url), 'utf8');

  assert.match(simulation, /parseParameterSweepForm/);
  assert.match(simulation, /const \[lastRunInput, setLastRunInput\]/);
  assert.match(simulation, /function invalidateRun\(\)[\s\S]*?setPoints\(\[\]\)[\s\S]*?setLastRunInput\(null\)/);
  assert.match(simulation, /function updateModel[\s\S]*?invalidateRun\(\)/);
  assert.match(simulation, /function updateNumber[\s\S]*?invalidateRun\(\)/);
  assert.match(simulation, /const input = lastRunInput/);
  assert.match(simulation, /if \(!points\.length \|\| !lastRunInput\) return/);

  assert.match(graph, /const visibleNodes = useMemo\([\s\S]*?graph\.nodes\.filter/);
  assert.match(graph, /positioned\.nodes\.find\(\(node\) => node\.id === selectedId\)/);
  assert.match(graph, /useEffect\(\(\) => \{[\s\S]*?setSelectedId\(positioned\.nodes\[0\]\?\.id \?\? ''\)/);
  assert.doesNotMatch(graph, /const selected = graph\.nodes\.find/);

  assert.match(courseware, /const \[selectedArtifactId, setSelectedArtifactId\]/);
  assert.match(courseware, /<select[\s\S]*?value=\{selectedArtifactId\}/);
  assert.match(courseware, /function selectArtifact\(artifactId: string\)/);
  assert.match(courseware, /if \(dirty\) return/);
  assert.match(courseware, /const selectedArtifact = coursewareArtifacts\.find/);
  assert.match(courseware, /const selectedArtifact = coursewareArtifacts\.find/);
});

test('specialized generators expose agent, fallback, and manual artifact sources', async () => {
  const simulation = await readFile(new URL('../modes/SimulationWorkbenchPage.tsx', import.meta.url), 'utf8');
  const courseware = await readFile(new URL('../modes/CoursewareStudioPage.tsx', import.meta.url), 'utf8');

  assert.match(simulation, /const newestArtifact = next\[0\]/);
  assert.match(simulation, /newestArtifact\?\.source === 'agent'/);
  assert.match(simulation, /AI 仿真报告已生成/);
  assert.match(simulation, /模型不可用，已生成本地模板/);

  assert.match(courseware, /const newestArtifact = next\[0\]/);
  assert.match(courseware, /newestArtifact\?\.source === 'agent'/);
  assert.match(courseware, /AI 课件已生成/);
  assert.match(courseware, /模型不可用，已生成本地模板/);
  assert.match(courseware, /课件已保存/);
  assert.match(courseware, /agent: 'AI生成'/);
  assert.match(courseware, /fallback: '本地模板'/);
  assert.match(courseware, /manual: '手动编辑'/);
  assert.match(courseware, /artifactSourceLabels\[artifact\.source\]/);
});

test('advanced workspaces guard asynchronous and shrinking runtime state', async () => {
  const simulation = await readFile(new URL('../modes/SimulationWorkbenchPage.tsx', import.meta.url), 'utf8');
  const graph = await readFile(new URL('../modes/KnowledgeGraphPage.tsx', import.meta.url), 'utf8');
  const courseware = await readFile(new URL('../modes/CoursewareStudioPage.tsx', import.meta.url), 'utf8');
  const game = await readFile(new URL('../modes/TeachingGamePage.tsx', import.meta.url), 'utf8');

  assert.match(game, /const safeQuestionIndex = Math\.min\(questionIndex, Math\.max\(0, playableQuestions\.length - 1\)\)/);
  assert.match(game, /const question = playableQuestions\[safeQuestionIndex\] \?\? null/);
  assert.match(game, /\}, \[playableQuestions\]\)/);
  assert.doesNotMatch(game, /playableQuestions\[questionIndex\]/);

  assert.match(courseware, /useRef/);
  assert.match(courseware, /const submittedSource = draftRef\.current/);
  assert.match(courseware, /const submittedArtifactId = selectedArtifactIdRef\.current/);
  assert.match(courseware, /draftRef\.current === submittedSource[\s\S]*?selectedArtifactIdRef\.current === submittedArtifactId/);
  assert.match(courseware, /<select[\s\S]*?disabled=\{busy\}/);
  assert.match(courseware, /<textarea[\s\S]*?disabled=\{busy\}/);

  assert.match(graph, /<svg[\s\S]*?role="group"/);
  assert.doesNotMatch(graph, /<svg[^>]*role="img"/);

  assert.match(simulation, /formatSimulationNumber/);
  assert.match(simulation, /maxY === minY \? 0\.5/);
});

test('help and support opens a full handbook page with section navigation', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const helpPage = await readFile(new URL('../help/HelpCenterPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ HelpCenterPage \} from '\.\.\/components\/help\/HelpCenterPage'/);
  assert.match(app, /type ViewMode = 'home' \| 'wizard' \| 'workspace' \| 'settings' \| 'export' \| 'help'/);
  assert.match(app, /viewMode === 'help' \? 'active' : ''/);
  assert.match(app, /setViewMode\('help'\)/);
  assert.match(app, /viewMode === 'help' && \(/);
  assert.match(app, /<HelpCenterPage\b/);
  assert.doesNotMatch(app, /setShowHelp\(true\)/);
  assert.doesNotMatch(app, /帮助面板已打开/);
  assert.doesNotMatch(app, /帮助 · Cram Engine/);

  for (const text of [
    'help-center-page',
    'help-center-toc',
    'href="#help-api"',
    'href="#help-mineru"',
    'href="#help-create-project"',
    'href="#help-project-modes"',
    'href="#help-workspace"',
    'href="#help-specialized"',
    'href="#help-assistant"',
    'href="#help-delivery"',
    'href="#help-troubleshooting"',
    '从配置到交付的完整流程',
    '配置 API 与模型服务',
    'MinerU 文档识别',
    '新建项目向导',
    '所有项目模式',
    '工作台通用功能',
    '专用功能工作台',
    'AI 助教与内容生成',
    '成果交付与导出',
    '常见问题排查'
  ]) {
    assert.match(helpPage, new RegExp(text));
  }

  assert.match(helpPage, /projectModeTemplates\.map/);
  for (const text of ['期末复习', '论文助手', '科研数据分析', '教学游戏', '知识图谱', '错题集']) {
    assert.match(helpPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.help-center-page\b/);
  assert.match(workspaceCss, /\.help-center-layout\b/);
  assert.match(workspaceCss, /\.help-center-toc\b/);
  assert.match(workspaceCss, /scroll-margin-top/);
});

test('help center documents the full workflow in detailed handbook sections', async () => {
  const helpPage = await readFile(new URL('../help/HelpCenterPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  for (const text of [
    'href="#help-quickstart"',
    'href="#help-latex"',
    'href="#help-practice"',
    'href="#help-import-export"',
    'href="#help-selection-ai"',
    'href="#help-data"',
    '十分钟上手路线',
    'LaTeX 与公式环境',
    '刷题、错题与 AI 出题',
    '项目导入、导出与迁移',
    '框选内容问 AI',
    '本地数据与隐私边界',
    '推荐操作顺序',
    '适用场景',
    '关键入口',
    '容易踩坑'
  ]) {
    assert.match(helpPage, new RegExp(text));
  }

  const sectionCount = helpPage.match(/className="help-center-section"/g)?.length ?? 0;
  assert.ok(sectionCount >= 14, `expected at least 14 help sections, got ${sectionCount}`);
  assert.match(workspaceCss, /\.help-detail-grid\b/);
  assert.match(workspaceCss, /\.help-step-list\b/);
});

test('AI drawer keeps project-scoped chat history searchable and resumable', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const layoutCss = await readFile(new URL('../../styles/layout.css', import.meta.url), 'utf8');
  const main = await readFile(new URL('../../../electron/main.cts', import.meta.url), 'utf8');

  assert.match(main, /function projectChatPath\(projectId: string\)[\s\S]*?projectDir\(projectId\)[\s\S]*?'chat'[\s\S]*?'history\.json'/);
  assert.match(main, /await readJson<ChatTurn\[\]>\(projectChatPath\(projectId\), \[\]\)/);
  assert.match(main, /await appendChatHistory\(projectId, \[userTurn, assistantTurn\]\)/);

  assert.match(app, /const \[chatSearchQuery, setChatSearchQuery\]/);
  assert.match(app, /const filteredChatHistory = useMemo/);
  assert.match(app, /activeProject\?\.chatHistory/);
  assert.match(app, /type AiTab = 'chat' \| 'history' \| 'reference'/);
  assert.match(app, /aiTab === 'history'/);
  assert.match(app, /placeholder="搜索当前项目历史对话"/);
  assert.match(app, /function continueFromHistory/);
  assert.match(app, /继续追问/);
  assert.match(app, /setAgentInput\(`继续基于这条历史对话追问/);
  assert.match(app, /setChatMessages\(toAgentMessages\(detail\)\)/);

  assert.match(layoutCss, /\.ai-history-search\b/);
  assert.match(layoutCss, /\.ai-history-list\b/);
  assert.match(layoutCss, /\.ai-history-card\b/);
});

test('selected project text can open an internal ask AI popover', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const layoutCss = await readFile(new URL('../../styles/layout.css', import.meta.url), 'utf8');

  assert.match(app, /const \[selectionAsk, setSelectionAsk\]/);
  assert.match(app, /function captureInternalSelection/);
  assert.match(app, /window\.getSelection\(\)/);
  assert.match(app, /closest\('\.main-scroll, \.ai-drawer-body'\)/);
  assert.match(app, /function askAiAboutSelection/);
  assert.match(app, /问一问 AI/);
  assert.match(app, /请结合当前项目解释这段内容/);
  assert.match(app, /setAiDrawerOpen\(true\)/);
  assert.match(app, /setAiTab\('chat'\)/);
  assert.match(app, /className="selection-ask-popover"/);

  assert.match(layoutCss, /\.selection-ask-popover\b/);
  assert.match(layoutCss, /\.selection-ask-popover button\b/);
});
