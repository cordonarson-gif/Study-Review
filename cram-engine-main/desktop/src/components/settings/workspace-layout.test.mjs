import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('workspace splits dense project content into focused project pages', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /type EditorTab = WorkspaceTabId/);
  assert.match(app, /activeWorkspaceTabs\.map/);
  assert.match(app, /editorTab === 'profile'/);
  assert.match(app, /editorTab === 'materials'/);
  assert.match(app, /setEditorTab\('materials'\)/);
  assert.match(app, /setEditorTab\('agents'\)/);
  assert.match(app, /setEditorTab\('resources'\)/);
  assert.match(app, /setEditorTab\('path'\)/);
  assert.match(app, /setEditorTab\('report'\)/);
  assert.match(app, /setEditorTab\('delivery'\)/);
  assert.match(app, /className="project-page-shell"/);
  assert.match(app, /className="workspace-jump-grid"/);
  assert.match(app, /className="materials-page-grid"/);
  assert.doesNotMatch(app, /<div className="workspace-grid app-grid">/);
  assert.doesNotMatch(app, /<section className="panel right-pane">/);

  assert.match(workspaceCss, /\.project-page-shell\b/);
  assert.match(workspaceCss, /\.workspace-jump-grid\b/);
  assert.match(workspaceCss, /\.materials-page-grid\b/);
});

test('workspace includes a learning profile page and phase-two placeholder pages', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const profilePage = await readFile(new URL('../profile/LearningProfilePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ LearningProfilePage \} from '\.\.\/components\/profile\/LearningProfilePage'/);
  assert.match(app, /<LearningProfilePage\b/);
  assert.match(app, /getLearningProfile/);
  assert.match(app, /saveLearningProfile/);
  assert.match(app, /analyzeLearningProfile/);

  for (const dimension of ['知识水平', '学习目标', '认知风格', '薄弱点', '错题模式', '资源偏好', '可用时间', '学习动机']) {
    assert.match(profilePage, new RegExp(dimension));
  }

  assert.match(profilePage, /saveLearningProfile/);
  assert.match(profilePage, /analyzeLearningProfile/);
  assert.match(profilePage, /profile-events/);
  assert.match(workspaceCss, /\.learning-profile-page\b/);
  assert.match(workspaceCss, /\.future-module-grid\b/);
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

test('agents tab renders the orchestration page instead of a placeholder', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const agentsPage = await readFile(new URL('../agents/AgentOrchestrationPage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ AgentOrchestrationPage \} from '\.\.\/components\/agents\/AgentOrchestrationPage'/);
  assert.match(app, /editorTab === 'agents' && \(/);
  assert.match(app, /<AgentOrchestrationPage\b/);
  assert.doesNotMatch(app, /title="多智能体编排"\s+description="把画像、资料、题目和目标拆给不同 Agent 协同处理"/);

  for (const text of ['ProfileAgent', 'ResourceAgent', 'PathAgent', 'ReportAgent', '推荐执行顺序']) {
    assert.match(agentsPage, new RegExp(text));
  }

  assert.match(workspaceCss, /\.agent-orchestration-page\b/);
  assert.match(workspaceCss, /\.agent-flow-grid\b/);
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

test('stage shortcuts navigate to meaningful project pages inside workspace', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /function navigateStage/);
  assert.match(app, /case '拆解':/);
  assert.match(app, /setEditorTab\('materials'\)/);
  assert.match(app, /case '讲授':/);
  assert.match(app, /setAiDrawerOpen\(true\)/);
  assert.match(app, /case '检题':/);
  assert.match(app, /setEditorTab\('practice'\)/);
  assert.match(app, /case '补漏':/);
  assert.match(app, /setEditorTab\('progress'\)/);
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

  assert.match(app, /import \{ ProjectModeSelector \} from '\.\.\/components\/modes\/ProjectModeSelector'/);
  assert.match(app, /getProjectModeTemplate/);
  assert.match(app, /modeConfig/);
  assert.match(app, /renderModeField/);
  assert.match(app, /<ProjectModeSelector\b/);

  for (const text of ['期末复习', '论文助手', '科研数据分析', '教学设计', '作业出题批改']) {
    assert.match(selector, new RegExp(text));
  }

  assert.match(workspaceCss, /\.project-mode-grid\b/);
  assert.match(workspaceCss, /\.project-mode-card\b/);
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
