# Project Mode Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mode-first project creation system so users can create exam-review, paper-assistant, research-analysis, teaching-design, and assignment-quiz projects with mode-specific wizard fields, tabs, artifacts, and delivery output.

**Architecture:** Add a shared project-mode registry in the renderer, persist `mode` and `modeConfig` on project metadata, and expose project-local mode artifacts through Electron IPC. Keep the existing exam-review flow as the default and derive new-mode workspace tabs from templates. Use deterministic fallback generation for all new mode artifact workflows so the feature works even without an API key.

**Tech Stack:** Electron main/preload, React, TypeScript, Node test runner, local JSON persistence, existing provider API helpers.

---

## File Structure

- Create `src/lib/projectModes.ts`: single source of truth for project mode templates, wizard fields, workspace tabs, agents, deliverables, and upload support.
- Create `src/lib/projectModes.test.mjs`: renderer-level tests for the template registry and mode helper functions.
- Modify `src/lib/types.ts`: add `ProjectMode`, `ModeArtifact`, `ProjectModeTemplate`, `WizardField`, `WorkspaceTabTemplate`, `AgentTemplate`, `DeliverableTemplate`, and project metadata fields.
- Modify `src/global.d.ts`: add global bridge types for mode artifacts.
- Modify `electron/main.cts`: normalize project metadata mode, persist mode artifacts, generate fallback artifacts, and include mode artifacts in delivery packages.
- Modify `electron/preload.cts`: expose `modeArtifacts:list`, `modeArtifacts:generate`, `modeArtifacts:save`, and `modeArtifacts:delete`.
- Create `electron/project-modes.test.cjs`: source tests for Electron mode persistence, IPC, and artifact functions.
- Modify `electron/startup.test.cjs`: assert preload and main process register mode artifact IPC.
- Modify `src/lib/wizardProject.js` and `src/lib/wizardProject.d.ts`: include `mode` and `modeConfig` in project creation payloads.
- Modify `src/lib/wizardProject.test.mjs`: cover mode-aware payload building.
- Modify `src/app/App.tsx`: add mode-first wizard selection, mode-specific wizard rendering, mode-aware workspace tabs, and mode artifact callbacks.
- Create `src/components/modes/ProjectModeSelector.tsx`: polished project mode selection card grid.
- Create `src/components/modes/ModeModulePage.tsx`: useful generic generation/save page for first-pass new mode tabs.
- Modify `src/styles/workspace.css` and `src/styles/layout.css`: add mode selector and mode module page styles.
- Modify `src/components/settings/workspace-layout.test.mjs`: assert wizard mode selector and mode-aware workspace behavior.
- Modify `electron/delivery-package.test.cjs`: assert delivery generation references mode artifacts.

---

### Task 1: Project Mode Types and Template Registry

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/projectModes.ts`
- Create: `src/lib/projectModes.test.mjs`

- [ ] **Step 1: Write failing registry tests**

Add `src/lib/projectModes.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProjectModeTemplate,
  projectModeTemplates,
  projectModeOptions,
  getWorkspaceTabsForMode
} from './projectModes.js';

test('project mode registry exposes all phase-one modes', () => {
  assert.deepEqual(projectModeOptions.map((mode) => mode.mode), [
    'exam-review',
    'paper-assistant',
    'research-analysis',
    'teaching-design',
    'assignment-quiz'
  ]);

  for (const template of projectModeTemplates) {
    assert.ok(template.title);
    assert.ok(template.description);
    assert.ok(template.wizardFields.length >= 4);
    assert.ok(template.tabs.length >= 4);
    assert.ok(template.deliverables.length >= 3);
  }
});

test('unknown project mode falls back to exam review', () => {
  assert.equal(getProjectModeTemplate('missing-mode').mode, 'exam-review');
});

test('mode workspace tabs are focused to the selected workflow', () => {
  assert.ok(getWorkspaceTabsForMode('paper-assistant').some((tab) => tab.id === 'paper-outline'));
  assert.ok(getWorkspaceTabsForMode('research-analysis').some((tab) => tab.id === 'research-charts'));
  assert.ok(getWorkspaceTabsForMode('teaching-design').some((tab) => tab.id === 'teaching-lesson-plan'));
  assert.ok(getWorkspaceTabsForMode('assignment-quiz').some((tab) => tab.id === 'assignment-grading'));
});
```

- [ ] **Step 2: Run registry tests to verify RED**

Run:

```powershell
node --test src/lib/projectModes.test.mjs
```

Expected: FAIL because `src/lib/projectModes.js` does not exist.

- [ ] **Step 3: Add project mode types**

In `src/lib/types.ts`, add after `StageReport`:

```ts
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
```

Also add to `ProjectMeta`:

```ts
mode: ProjectMode;
modeConfig?: Record<string, unknown>;
```

Also add to `ProjectDetail`:

```ts
modeArtifacts?: ModeArtifact[];
```

- [ ] **Step 4: Add the template registry**

Create `src/lib/projectModes.ts`:

```ts
import type { ProjectMode, ProjectModeTemplate, WorkspaceTabId, WorkspaceTabTemplate } from './types';

const examTabs: WorkspaceTabTemplate[] = [
  { id: 'overview', label: '总览', description: '查看当前复习项目状态和快捷入口' },
  { id: 'profile', label: '画像', description: '维护学习画像和薄弱点' },
  { id: 'materials', label: '资料', description: '上传资料并沉淀知识库' },
  { id: 'agents', label: '智能体', description: '查看项目智能体协作链路' },
  { id: 'resources', label: '资源', description: '生成个性化讲义、例题和补漏资料' },
  { id: 'path', label: '路径', description: '规划阶段学习路径' },
  { id: 'practice', label: '刷题', description: '练习、收藏和错题复盘' },
  { id: 'import', label: '导题', description: '从文本、文件和图片识别题目' },
  { id: 'report', label: '报告', description: '生成阶段报告' },
  { id: 'delivery', label: '交付', description: '导出最终交付包' },
  { id: 'config', label: '配置', description: '查看项目配置' },
  { id: 'progress', label: '进度', description: '维护学习进度' }
];

export const projectModeTemplates: ProjectModeTemplate[] = [
  {
    mode: 'exam-review',
    title: '期末复习项目',
    description: '围绕资料、题库、错题、路径和报告完成复习闭环。',
    icon: '复',
    recommendedFor: ['期末考试', '课程复习', '错题整理'],
    wizardFields: [
      { key: 'name', label: '项目名称', type: 'text', required: false, placeholder: '例如：数据结构期末复习' },
      { key: 'courseName', label: '课程名称', type: 'text', required: false, placeholder: '例如：数据结构' },
      { key: 'examType', label: '考试类型', type: 'select', required: true, options: ['期末卷', '开卷', '闭卷', '面试', '论文答辩'] },
      { key: 'textbook', label: '教材/范围', type: 'textarea', required: false },
      { key: 'requirements', label: '复习要求', type: 'textarea', required: false }
    ],
    tabs: examTabs,
    agents: [
      { id: 'ProfileAgent', label: '画像智能体', description: '分析学习画像和薄弱点' },
      { id: 'ResourceAgent', label: '资源智能体', description: '生成个性化资源' },
      { id: 'ReportAgent', label: '报告智能体', description: '生成阶段报告' }
    ],
    deliverables: [
      { id: 'question-bank', label: '题库包', checklist: ['题干完整', '答案完整', '解析完整'] },
      { id: 'wrong-answers', label: '错题包', checklist: ['错因明确', '知识点准确'] },
      { id: 'delivery', label: '成果交付包', checklist: ['资料齐备', '报告齐备'] }
    ],
    supportedUploads: ['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'md', 'png', 'jpg']
  },
  {
    mode: 'paper-assistant',
    title: '论文助手',
    description: '从选题、文献、大纲、章节到答辩准备的论文写作工作台。',
    icon: '论',
    recommendedFor: ['毕业论文', '课程论文', '开题报告'],
    wizardFields: [
      { key: 'name', label: '论文题目', type: 'text', required: false, placeholder: '请输入论文题目或暂定方向' },
      { key: 'courseName', label: '学科方向', type: 'text', required: false, placeholder: '例如：教育技术、计算机、管理学' },
      { key: 'paperType', label: '论文类型', type: 'select', required: true, options: ['开题报告', '课程论文', '本科论文', '硕士论文', '期刊论文'] },
      { key: 'researchObject', label: '研究对象', type: 'textarea', required: false },
      { key: 'formatRequirements', label: '格式要求', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'paper-overview', label: '总览', description: '论文项目状态和下一步建议' },
      { id: 'paper-literature', label: '文献', description: '整理文献线索和综述结构' },
      { id: 'paper-outline', label: '大纲', description: '生成和调整论文大纲' },
      { id: 'paper-chapters', label: '章节', description: '分章节生成写作草稿' },
      { id: 'paper-methods', label: '方法', description: '设计研究方法和技术路线' },
      { id: 'paper-innovation', label: '创新点', description: '提炼创新点和对比矩阵' },
      { id: 'paper-format', label: '格式', description: '检查格式和写作规范' },
      { id: 'paper-defense', label: '答辩', description: '生成答辩问题和回答建议' },
      { id: 'delivery', label: '交付', description: '导出论文成果包' }
    ],
    agents: [{ id: 'PaperAgent', label: '论文智能体', description: '生成论文结构化成果' }],
    deliverables: [
      { id: 'outline', label: '论文大纲', checklist: ['章节完整', '逻辑清楚'] },
      { id: 'innovation', label: '创新点矩阵', checklist: ['对比对象明确', '创新表述克制'] },
      { id: 'defense', label: '答辩 Q&A', checklist: ['问题覆盖研究背景', '回答简洁'] }
    ],
    supportedUploads: ['pdf', 'docx', 'txt', 'md']
  },
  {
    mode: 'research-analysis',
    title: '科研数据分析',
    description: '上传数据，生成分析计划、统计摘要、图表和研究报告。',
    icon: '研',
    recommendedFor: ['问卷数据', '实验数据', '论文结果分析'],
    wizardFields: [
      { key: 'name', label: '研究主题', type: 'text', required: false },
      { key: 'courseName', label: '学科方向', type: 'text', required: false },
      { key: 'datasetDescription', label: '数据说明', type: 'textarea', required: false },
      { key: 'analysisGoal', label: '分析目标', type: 'textarea', required: false },
      { key: 'expectedOutput', label: '期望产出', type: 'select', required: true, options: ['统计摘要', '图表', '研究报告', '全部'] }
    ],
    tabs: [
      { id: 'research-overview', label: '总览', description: '科研分析项目状态' },
      { id: 'research-dataset', label: '数据集', description: '查看数据说明和字段' },
      { id: 'research-plan', label: '分析计划', description: '生成分析路径' },
      { id: 'research-statistics', label: '统计', description: '生成统计摘要' },
      { id: 'research-charts', label: '图表', description: '规划图表和可视化说明' },
      { id: 'research-findings', label: '发现', description: '解释分析结果' },
      { id: 'research-report', label: '报告', description: '生成科研分析报告' },
      { id: 'delivery', label: '交付', description: '导出研究成果包' }
    ],
    agents: [{ id: 'ResearchAnalysisAgent', label: '科研分析智能体', description: '生成数据分析成果' }],
    deliverables: [
      { id: 'data-dictionary', label: '数据字典', checklist: ['字段解释清楚', '变量类型明确'] },
      { id: 'analysis-plan', label: '分析计划', checklist: ['方法匹配目标', '限制说明明确'] },
      { id: 'research-report', label: '研究报告', checklist: ['结论有依据', '图表解释清楚'] }
    ],
    supportedUploads: ['csv', 'xlsx', 'xls', 'txt', 'json']
  },
  {
    mode: 'teaching-design',
    title: '教学设计 / 教案生成',
    description: '生成教学目标、重难点、活动、评价、教案和课件大纲。',
    icon: '教',
    recommendedFor: ['教师备课', '说课稿', '教学比赛'],
    wizardFields: [
      { key: 'name', label: '教学主题', type: 'text', required: false },
      { key: 'courseName', label: '课程名称', type: 'text', required: false },
      { key: 'learnerStage', label: '学段/对象', type: 'text', required: false },
      { key: 'lessonDuration', label: '课时', type: 'text', required: false },
      { key: 'teachingGoals', label: '教学目标', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'teaching-overview', label: '总览', description: '教学项目状态' },
      { id: 'teaching-objectives', label: '目标', description: '生成教学目标' },
      { id: 'teaching-key-points', label: '重难点', description: '拆解重点和难点' },
      { id: 'teaching-activities', label: '活动', description: '设计课堂活动' },
      { id: 'teaching-assessment', label: '评价', description: '设计评价与作业' },
      { id: 'teaching-lesson-plan', label: '教案', description: '生成标准教案' },
      { id: 'teaching-courseware', label: '课件', description: '生成课件大纲' },
      { id: 'delivery', label: '交付', description: '导出教学成果包' }
    ],
    agents: [{ id: 'TeachingDesignAgent', label: '教学设计智能体', description: '生成教学设计成果' }],
    deliverables: [
      { id: 'objectives', label: '教学目标', checklist: ['三维目标清晰', '可评价'] },
      { id: 'lesson-plan', label: '教案', checklist: ['流程完整', '活动可执行'] },
      { id: 'courseware', label: '课件大纲', checklist: ['层次清楚', '互动明确'] }
    ],
    supportedUploads: ['pdf', 'docx', 'pptx', 'txt', 'md']
  },
  {
    mode: 'assignment-quiz',
    title: '作业出题批改 / 在线测验',
    description: '生成作业、组卷、评分规则、批改建议和错题反馈。',
    icon: '测',
    recommendedFor: ['作业设计', '随堂测验', '错题反馈'],
    wizardFields: [
      { key: 'name', label: '测验/作业名称', type: 'text', required: false },
      { key: 'courseName', label: '学科', type: 'text', required: false },
      { key: 'knowledgePoints', label: '知识点', type: 'textarea', required: false },
      { key: 'difficulty', label: '难度', type: 'select', required: true, options: ['基础', '中等', '提高', '混合'] },
      { key: 'questionTypes', label: '题型要求', type: 'textarea', required: false }
    ],
    tabs: [
      { id: 'assignment-overview', label: '总览', description: '作业测验项目状态' },
      { id: 'assignment-bank', label: '题库', description: '维护题库' },
      { id: 'assignment-paper', label: '组卷', description: '生成作业或试卷' },
      { id: 'assignment-online-quiz', label: '测验', description: '生成在线测验结构' },
      { id: 'assignment-grading', label: '批改', description: '生成评分规则和批改建议' },
      { id: 'assignment-wrong-answers', label: '错题', description: '整理错题和错因' },
      { id: 'assignment-feedback', label: '反馈', description: '生成学习反馈' },
      { id: 'delivery', label: '交付', description: '导出作业测验包' }
    ],
    agents: [{ id: 'AssignmentQuizAgent', label: '作业测验智能体', description: '生成作业和测验成果' }],
    deliverables: [
      { id: 'assignment-sheet', label: '作业卷', checklist: ['题型符合要求', '难度合理'] },
      { id: 'rubric', label: '评分规则', checklist: ['分值明确', '主观题标准清楚'] },
      { id: 'feedback', label: '学习反馈', checklist: ['错因明确', '建议可执行'] }
    ],
    supportedUploads: ['pdf', 'docx', 'txt', 'md', 'png', 'jpg']
  }
];

export const projectModeOptions = projectModeTemplates.map(({ mode, title, description, icon, recommendedFor }) => ({
  mode,
  title,
  description,
  icon,
  recommendedFor
}));

export function getProjectModeTemplate(mode: unknown): ProjectModeTemplate {
  return projectModeTemplates.find((template) => template.mode === mode) ?? projectModeTemplates[0];
}

export function getWorkspaceTabsForMode(mode: unknown): WorkspaceTabTemplate[] {
  return getProjectModeTemplate(mode).tabs;
}

export function isModeTab(tabId: WorkspaceTabId): boolean {
  return !examTabs.some((tab) => tab.id === tabId) && tabId !== 'delivery';
}
```

- [ ] **Step 5: Run registry tests to verify GREEN**

Run:

```powershell
node --test src/lib/projectModes.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```powershell
git add src/lib/types.ts src/lib/projectModes.ts src/lib/projectModes.test.mjs
git commit -m "feat: add project mode template registry"
```

---

### Task 2: Electron Metadata Migration and Mode Artifact Contracts

**Files:**
- Modify: `src/global.d.ts`
- Modify: `electron/main.cts`
- Modify: `electron/preload.cts`
- Create: `electron/project-modes.test.cjs`
- Modify: `electron/startup.test.cjs`

- [ ] **Step 1: Write failing Electron source tests**

Create `electron/project-modes.test.cjs`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const main = fs.readFileSync(path.join(__dirname, 'main.cts'), 'utf8');
const preload = fs.readFileSync(path.join(__dirname, 'preload.cts'), 'utf8');
const globalTypes = fs.readFileSync(path.join(__dirname, '..', 'src', 'global.d.ts'), 'utf8');

test('main process normalizes project modes and stores mode artifacts', () => {
  assert.match(main, /type ProjectMode =/);
  assert.match(main, /function normalizeProjectMode/);
  assert.match(main, /function projectModeArtifactsPath\(projectId: string\)/);
  assert.match(main, /async function listModeArtifacts\(projectId: string\)/);
  assert.match(main, /async function generateModeArtifact\(projectId: string, input: GenerateModeArtifactInput\)/);
  assert.match(main, /async function saveModeArtifact\(projectId: string, artifact: ModeArtifact\)/);
  assert.match(main, /async function deleteModeArtifact\(projectId: string, artifactId: string\)/);
});

test('preload and global contracts expose mode artifact bridge', () => {
  for (const source of [preload, globalTypes]) {
    assert.match(source, /listModeArtifacts/);
    assert.match(source, /generateModeArtifact/);
    assert.match(source, /saveModeArtifact/);
    assert.match(source, /deleteModeArtifact/);
  }
});
```

- [ ] **Step 2: Update startup IPC source tests**

In `electron/startup.test.cjs`, add assertions near the stage report and delivery IPC assertions:

```js
test('main process registers mode artifact IPC handlers', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');
  assert.match(main, /ipcMain\.handle\('modeArtifacts:list'/);
  assert.match(main, /ipcMain\.handle\('modeArtifacts:generate'/);
  assert.match(main, /ipcMain\.handle\('modeArtifacts:save'/);
  assert.match(main, /ipcMain\.handle\('modeArtifacts:delete'/);
});

test('preload exposes mode artifact bridge methods', () => {
  const preload = fs.readFileSync(preloadSourcePath, 'utf8');
  assert.match(preload, /listModeArtifacts: \(projectId: string\) => ipcRenderer\.invoke\('modeArtifacts:list', projectId\)/);
  assert.match(preload, /generateModeArtifact: \(projectId: string, input: GenerateModeArtifactInput\) => ipcRenderer\.invoke\('modeArtifacts:generate', projectId, input\)/);
  assert.match(preload, /saveModeArtifact: \(projectId: string, artifact: ModeArtifact\) => ipcRenderer\.invoke\('modeArtifacts:save', projectId, artifact\)/);
  assert.match(preload, /deleteModeArtifact: \(projectId: string, artifactId: string\) => ipcRenderer\.invoke\('modeArtifacts:delete', projectId, artifactId\)/);
});
```

- [ ] **Step 3: Run Electron tests to verify RED**

Run:

```powershell
npm run test:electron
```

Expected: FAIL on missing mode artifact types/functions/IPC.

- [ ] **Step 4: Add global bridge types**

In `src/global.d.ts`, mirror the `ProjectMode`, `WorkspaceTabId`, `ModeArtifact`, and `GenerateModeArtifactInput` types from `src/lib/types.ts`.

Add to `ProjectMeta`:

```ts
mode: ProjectMode;
modeConfig?: Record<string, unknown>;
```

Add to `ProjectDetail`:

```ts
modeArtifacts?: ModeArtifact[];
```

Add to `Window.cramEngine`:

```ts
listModeArtifacts: (projectId: string) => Promise<ModeArtifact[]>;
generateModeArtifact: (projectId: string, input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
saveModeArtifact: (projectId: string, artifact: ModeArtifact) => Promise<ModeArtifact[]>;
deleteModeArtifact: (projectId: string, artifactId: string) => Promise<ModeArtifact[]>;
```

- [ ] **Step 5: Add preload bridge types and methods**

In `electron/preload.cts`, add local `ProjectMode`, `WorkspaceTabId`, `ModeArtifact`, and `GenerateModeArtifactInput` types matching `src/lib/types.ts`.

Add to exposed API:

```ts
listModeArtifacts: (projectId: string) => ipcRenderer.invoke('modeArtifacts:list', projectId),
generateModeArtifact: (projectId: string, input: GenerateModeArtifactInput) => ipcRenderer.invoke('modeArtifacts:generate', projectId, input),
saveModeArtifact: (projectId: string, artifact: ModeArtifact) => ipcRenderer.invoke('modeArtifacts:save', projectId, artifact),
deleteModeArtifact: (projectId: string, artifactId: string) => ipcRenderer.invoke('modeArtifacts:delete', projectId, artifactId),
```

- [ ] **Step 6: Add Electron main mode artifact persistence**

In `electron/main.cts`, add types matching renderer types.

Add paths after `projectStageReportsPath`:

```ts
function projectModeDir(projectId: string) {
  return path.join(projectDir(projectId), 'mode');
}

function projectModeArtifactsPath(projectId: string) {
  return path.join(projectModeDir(projectId), 'artifacts.json');
}
```

Add helpers near other normalization helpers:

```ts
const projectModes: ProjectMode[] = ['exam-review', 'paper-assistant', 'research-analysis', 'teaching-design', 'assignment-quiz'];

function normalizeProjectMode(mode: unknown): ProjectMode {
  return projectModes.includes(mode as ProjectMode) ? mode as ProjectMode : 'exam-review';
}

function normalizeModeArtifact(artifact: Partial<ModeArtifact>, fallbackMode: ProjectMode, fallbackTabId: WorkspaceTabId): ModeArtifact {
  const now = new Date().toISOString();
  const title = String(artifact.title || '模式成果');
  return {
    id: String(artifact.id || `artifact-${Date.now()}`),
    mode: normalizeProjectMode(artifact.mode || fallbackMode),
    tabId: String(artifact.tabId || fallbackTabId) as WorkspaceTabId,
    title,
    kind: String(artifact.kind || 'markdown'),
    contentMarkdown: String(artifact.contentMarkdown || ''),
    source: artifact.source === 'manual' || artifact.source === 'agent' ? artifact.source : 'fallback',
    createdAt: typeof artifact.createdAt === 'string' && artifact.createdAt ? artifact.createdAt : now,
    updatedAt: typeof artifact.updatedAt === 'string' && artifact.updatedAt ? artifact.updatedAt : now
  };
}

async function listModeArtifacts(projectId: string) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const mode = normalizeProjectMode(meta?.mode);
  const artifacts = await readJson<Partial<ModeArtifact>[]>(projectModeArtifactsPath(projectId), []);
  return Array.isArray(artifacts)
    ? artifacts.map((artifact) => normalizeModeArtifact(artifact, mode, 'overview'))
    : [];
}

async function writeModeArtifacts(projectId: string, artifacts: ModeArtifact[]) {
  const meta = await readJson<ProjectMeta | null>(projectMetaPath(projectId), null);
  const mode = normalizeProjectMode(meta?.mode);
  const normalized = artifacts.map((artifact) => normalizeModeArtifact(artifact, mode, artifact.tabId));
  await writeJson(projectModeArtifactsPath(projectId), normalized);
  return normalized;
}
```

Add deterministic generation:

```ts
function buildFallbackModeArtifact(project: ProjectDetail, input: GenerateModeArtifactInput): ModeArtifact {
  const now = new Date().toISOString();
  const mode = normalizeProjectMode(project.meta.mode);
  const prompt = input.prompt.trim() || project.meta.requirements || project.meta.notes || project.meta.name;
  return normalizeModeArtifact({
    id: `artifact-${Date.now()}`,
    mode,
    tabId: input.tabId,
    title: `${project.meta.name} - ${input.artifactKind || '成果'}`,
    kind: input.artifactKind || 'markdown',
    contentMarkdown: [
      `# ${project.meta.name}`,
      '',
      `## 生成目标`,
      '',
      prompt || '围绕当前项目生成结构化成果。',
      '',
      '## 核心内容',
      '',
      '- 背景：根据项目资料、上传内容和模式配置整理。',
      '- 结构：先给出框架，再补充可执行细节。',
      '- 下一步：继续上传资料或补充要求后重新生成。',
      '',
      '## 复核清单',
      '',
      '- [ ] 内容与项目目标一致',
      '- [ ] 表述准确且可执行',
      '- [ ] 可以进入交付包'
    ].join('\n'),
    source: 'fallback',
    createdAt: now,
    updatedAt: now
  }, mode, input.tabId);
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
  }, normalizeProjectMode(artifact.mode), artifact.tabId);
  const next = current.some((item) => item.id === normalized.id)
    ? current.map((item) => item.id === normalized.id ? normalized : item)
    : [normalized, ...current];
  return writeModeArtifacts(projectId, next);
}

async function deleteModeArtifact(projectId: string, artifactId: string) {
  const current = await listModeArtifacts(projectId);
  return writeModeArtifacts(projectId, current.filter((artifact) => artifact.id !== artifactId));
}
```

- [ ] **Step 7: Normalize project meta on create/open**

In `createProject`, set:

```ts
mode: normalizeProjectMode(input.mode),
modeConfig: input.modeConfig ?? {},
```

In `openProject`, after reading metadata:

```ts
const meta = loadedMeta ? {
  ...loadedMeta,
  mode: normalizeProjectMode(loadedMeta.mode),
  modeConfig: loadedMeta.modeConfig ?? {},
  lastOpenedAt: new Date().toISOString()
} : null;
```

Return `modeArtifacts: await listModeArtifacts(projectId)` from both `createProject` and `openProject`.

- [ ] **Step 8: Register IPC handlers**

In `electron/main.cts`, add near other project-scoped handlers:

```ts
ipcMain.handle('modeArtifacts:list', (_event, projectId: string) => listModeArtifacts(projectId));
ipcMain.handle('modeArtifacts:generate', (_event, projectId: string, input: GenerateModeArtifactInput) => generateModeArtifact(projectId, input));
ipcMain.handle('modeArtifacts:save', (_event, projectId: string, artifact: ModeArtifact) => saveModeArtifact(projectId, artifact));
ipcMain.handle('modeArtifacts:delete', (_event, projectId: string, artifactId: string) => deleteModeArtifact(projectId, artifactId));
```

- [ ] **Step 9: Run Electron tests to verify GREEN**

Run:

```powershell
npm run test:electron
```

Expected: PASS.

- [ ] **Step 10: Commit Task 2**

Run:

```powershell
git add src/global.d.ts electron/main.cts electron/preload.cts electron/project-modes.test.cjs electron/startup.test.cjs
git commit -m "feat: persist mode artifacts"
```

---

### Task 3: Mode-Aware Project Creation Payload

**Files:**
- Modify: `src/lib/wizardProject.js`
- Modify: `src/lib/wizardProject.d.ts`
- Modify: `src/lib/wizardProject.test.mjs`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write failing wizard payload tests**

In `src/lib/wizardProject.test.mjs`, add:

```js
test('buildWizardProjectPayload includes selected project mode and mode config', () => {
  const payload = buildWizardProjectPayload({
    name: '论文项目',
    courseName: '教育技术',
    linkedFolder: '',
    examType: '期末卷',
    textbook: '',
    notes: '',
    requirements: '',
    mustKnow: '',
    keyPoints: '',
    initialQuestionText: '',
    provider: 'openai-compatible',
    model: 'gpt-4.1',
    mode: 'paper-assistant',
    modeConfig: {
      paperType: '本科论文',
      researchObject: '高校课堂互动'
    }
  }, []);

  assert.equal(payload.mode, 'paper-assistant');
  assert.equal(payload.modeConfig.paperType, '本科论文');
  assert.equal(payload.modeConfig.researchObject, '高校课堂互动');
});
```

- [ ] **Step 2: Run wizard tests to verify RED**

Run:

```powershell
node --test src/lib/wizardProject.test.mjs
```

Expected: FAIL because payload does not include `mode`.

- [ ] **Step 3: Add mode fields to creation types**

In `src/lib/types.ts`, add to `CreateProjectInput`:

```ts
mode?: ProjectMode;
modeConfig?: Record<string, unknown>;
```

In `src/lib/wizardProject.d.ts`, extend the wizard state input type with:

```ts
mode?: string;
modeConfig?: Record<string, unknown>;
```

- [ ] **Step 4: Include mode fields in payload builder**

In `src/lib/wizardProject.js`, inside `buildWizardProjectPayload`, add:

```js
mode: wizard.mode || 'exam-review',
modeConfig: wizard.modeConfig || {},
```

- [ ] **Step 5: Run wizard tests to verify GREEN**

Run:

```powershell
node --test src/lib/wizardProject.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```powershell
git add src/lib/types.ts src/lib/wizardProject.js src/lib/wizardProject.d.ts src/lib/wizardProject.test.mjs
git commit -m "feat: include project mode in wizard payload"
```

---

### Task 4: Mode-First Wizard UI

**Files:**
- Create: `src/components/modes/ProjectModeSelector.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/workspace.css`
- Modify: `src/components/settings/workspace-layout.test.mjs`

- [ ] **Step 1: Write failing UI source tests**

In `src/components/settings/workspace-layout.test.mjs`, add:

```js
test('project wizard starts with mode selection and includes phase-one modes', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const selector = await readFile(new URL('../modes/ProjectModeSelector.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /import \{ ProjectModeSelector \} from '\.\.\/components\/modes\/ProjectModeSelector'/);
  assert.match(app, /modeConfig/);
  assert.match(app, /setWizardStep\(1\)/);
  assert.match(app, /ProjectModeSelector/);

  for (const label of ['期末复习项目', '论文助手', '科研数据分析', '教学设计 / 教案生成', '作业出题批改 / 在线测验']) {
    assert.match(selector, new RegExp(label));
  }

  assert.match(workspaceCss, /\.project-mode-grid\b/);
  assert.match(workspaceCss, /\.project-mode-card\b/);
});
```

- [ ] **Step 2: Run settings UI tests to verify RED**

Run:

```powershell
npm run test:settings-ui
```

Expected: FAIL because `ProjectModeSelector.tsx` does not exist and App has no mode selector.

- [ ] **Step 3: Create `ProjectModeSelector`**

Create `src/components/modes/ProjectModeSelector.tsx`:

```tsx
import type { ProjectMode } from '../../lib/types';
import { projectModeOptions } from '../../lib/projectModes';

type ProjectModeSelectorProps = {
  selectedMode: ProjectMode;
  onSelect: (mode: ProjectMode) => void;
};

export function ProjectModeSelector({ selectedMode, onSelect }: ProjectModeSelectorProps) {
  return (
    <div className="project-mode-grid">
      {projectModeOptions.map((option) => (
        <button
          key={option.mode}
          type="button"
          className={option.mode === selectedMode ? 'project-mode-card active' : 'project-mode-card'}
          onClick={() => onSelect(option.mode)}
        >
          <span>{option.icon}</span>
          <strong>{option.title}</strong>
          <small>{option.description}</small>
          <div className="project-mode-chip-row">
            {option.recommendedFor.map((item) => <em key={item}>{item}</em>)}
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Extend wizard state in App**

In `src/app/App.tsx`, import:

```ts
ProjectMode,
WizardField
```

and:

```ts
import { getProjectModeTemplate } from '../lib/projectModes';
import { ProjectModeSelector } from '../components/modes/ProjectModeSelector';
```

Add to `WizardState`:

```ts
mode: ProjectMode;
modeConfig: Record<string, string>;
```

Add to `initialWizardState`:

```ts
mode: 'exam-review',
modeConfig: {},
```

- [ ] **Step 5: Add mode selection rendering**

In the wizard Step 1 section of `src/app/App.tsx`, render the selector before existing project fields:

```tsx
<ProjectModeSelector
  selectedMode={wizard.mode}
  onSelect={(mode) => {
    const template = getProjectModeTemplate(mode);
    setWizard((current) => ({
      ...current,
      mode,
      modeConfig: {},
      examType: template.wizardFields.find((field) => field.key === 'examType')?.options?.[0] ?? current.examType
    }));
  }}
/>
```

Add a helper in App:

```ts
function updateModeConfig(key: string, value: string) {
  setWizard((current) => ({
    ...current,
    modeConfig: {
      ...current.modeConfig,
      [key]: value
    }
  }));
}
```

Add a render helper:

```tsx
function renderModeField(field: WizardField) {
  const value = wizard.modeConfig[field.key] ?? '';
  if (['name', 'courseName', 'examType', 'textbook', 'requirements'].includes(field.key)) {
    return null;
  }
  if (field.type === 'select') {
    return (
      <label key={field.key}>
        {field.label}
        <select value={value} onChange={(event) => updateModeConfig(field.key, event.target.value)}>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label key={field.key}>
        {field.label}
        <textarea value={value} placeholder={field.placeholder} onChange={(event) => updateModeConfig(field.key, event.target.value)} />
      </label>
    );
  }
  return (
    <label key={field.key}>
      {field.label}
      <input value={value} placeholder={field.placeholder} onChange={(event) => updateModeConfig(field.key, event.target.value)} />
    </label>
  );
}
```

Render mode fields:

```tsx
{getProjectModeTemplate(wizard.mode).wizardFields.map(renderModeField)}
```

- [ ] **Step 6: Ensure payload receives mode fields**

Before `buildWizardProjectPayload(wizard, initialQuestions)`, ensure `wizard` already contains:

```ts
mode: wizard.mode,
modeConfig: wizard.modeConfig
```

No extra mapper is needed if Task 3 is complete.

- [ ] **Step 7: Add mode selector styles**

In `src/styles/workspace.css`, add:

```css
.project-mode-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-md);
}

.project-mode-card {
  min-height: 170px;
  padding: var(--space-md);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-lowest);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.project-mode-card.active,
.project-mode-card:hover {
  border-color: var(--color-primary);
  background: rgba(94, 57, 224, 0.08);
}

.project-mode-card span {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  background: var(--color-primary-container);
  color: var(--color-primary);
  font-weight: 800;
}

.project-mode-card small {
  color: var(--color-on-surface-variant);
  line-height: 1.55;
}

.project-mode-chip-row {
  margin-top: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.project-mode-chip-row em {
  padding: 3px 7px;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
  font-size: 11px;
  font-style: normal;
}
```

- [ ] **Step 8: Run UI tests**

Run:

```powershell
npm run test:settings-ui
```

Expected: PASS.

- [ ] **Step 9: Commit Task 4**

Run:

```powershell
git add src/app/App.tsx src/components/modes/ProjectModeSelector.tsx src/styles/workspace.css src/components/settings/workspace-layout.test.mjs
git commit -m "feat: add mode-first project wizard"
```

---

### Task 5: Mode-Aware Workspace and Generic Mode Module Page

**Files:**
- Create: `src/components/modes/ModeModulePage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/workspace.css`
- Modify: `src/components/settings/workspace-layout.test.mjs`

- [ ] **Step 1: Write failing mode workspace tests**

In `src/components/settings/workspace-layout.test.mjs`, add:

```js
test('workspace can render mode-specific module pages', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const modePage = await readFile(new URL('../modes/ModeModulePage.tsx', import.meta.url), 'utf8');
  const workspaceCss = await readFile(new URL('../../styles/workspace.css', import.meta.url), 'utf8');

  assert.match(app, /getWorkspaceTabsForMode/);
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
```

- [ ] **Step 2: Run settings UI tests to verify RED**

Run:

```powershell
npm run test:settings-ui
```

Expected: FAIL because `ModeModulePage.tsx` does not exist.

- [ ] **Step 3: Create `ModeModulePage`**

Create `src/components/modes/ModeModulePage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { GenerateModeArtifactInput, ModeArtifact, WorkspaceTabTemplate } from '../../lib/types';

type ModeModulePageProps = {
  tab: WorkspaceTabTemplate;
  artifacts: ModeArtifact[];
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onSave: (artifact: ModeArtifact) => Promise<ModeArtifact[]>;
  onDelete: (artifactId: string) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

export function ModeModulePage({ tab, artifacts, onGenerate, onSave, onDelete, onChange, onStatus }: ModeModulePageProps) {
  const tabArtifacts = useMemo(() => artifacts.filter((artifact) => artifact.tabId === tab.id), [artifacts, tab.id]);
  const [selectedId, setSelectedId] = useState(tabArtifacts[0]?.id ?? '');
  const [draft, setDraft] = useState<ModeArtifact | null>(tabArtifacts[0] ?? null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = tabArtifacts.find((artifact) => artifact.id === selectedId) ?? tabArtifacts[0] ?? null;
    setSelectedId(next?.id ?? '');
    setDraft(next);
  }, [tabArtifacts, selectedId]);

  async function generateArtifact() {
    setBusy(true);
    try {
      const next = await onGenerate({ tabId: tab.id, prompt, artifactKind: tab.label });
      onChange(next);
      setPrompt('');
      onStatus?.('模式成果已生成');
    } finally {
      setBusy(false);
    }
  }

  async function saveArtifact() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onSave(draft);
      onChange(next);
      onStatus?.('模式成果已保存');
    } finally {
      setBusy(false);
    }
  }

  async function deleteArtifact() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onDelete(draft.id);
      onChange(next);
      onStatus?.('模式成果已删除');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel mode-module-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{tab.label}</div>
          <h3>{tab.description}</h3>
          <p className="muted">输入当前页面的目标或补充要求，系统会生成可保存、可交付的结构化 Markdown 成果。</p>
        </div>
        <button className="primary" onClick={() => void generateArtifact()} disabled={busy}>
          {busy ? '生成中…' : '生成成果'}
        </button>
      </div>

      <div className="mode-generation-panel">
        <label>
          生成要求
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="例如：请围绕当前项目生成一版结构化内容，并给出复核清单" />
        </label>
      </div>

      <div className="mode-artifact-grid">
        <aside className="mode-artifact-list">
          <div className="subsection-title">成果库</div>
          {tabArtifacts.length ? tabArtifacts.map((artifact) => (
            <button
              key={artifact.id}
              className={artifact.id === draft?.id ? 'resource-library-card active' : 'resource-library-card'}
              onClick={() => {
                setSelectedId(artifact.id);
                setDraft(artifact);
              }}
            >
              <strong>{artifact.title}</strong>
              <small>{artifact.kind} · {new Date(artifact.updatedAt).toLocaleString('zh-CN')}</small>
            </button>
          )) : <div className="empty-slim">暂无成果，点击“生成成果”创建第一份内容。</div>}
        </aside>

        <div className="mode-artifact-editor">
          {draft ? (
            <>
              <label>
                标题
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label>
                Markdown 内容
                <textarea value={draft.contentMarkdown} onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })} />
              </label>
              <div className="panel-actions horizontal">
                <button className="primary" onClick={() => void saveArtifact()} disabled={busy}>保存成果</button>
                <button onClick={() => void deleteArtifact()} disabled={busy}>删除成果</button>
              </div>
            </>
          ) : <div className="empty-slim">选择或生成一份成果后，可在这里编辑。</div>}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add App mode artifact state and callbacks**

In `src/app/App.tsx`, import:

```ts
GenerateModeArtifactInput,
ModeArtifact,
WorkspaceTabId
```

and:

```ts
import { getWorkspaceTabsForMode, isModeTab } from '../lib/projectModes';
import { ModeModulePage } from '../components/modes/ModeModulePage';
```

Add state:

```ts
const [modeArtifacts, setModeArtifacts] = useState<ModeArtifact[]>([]);
```

When opening and creating projects, load:

```ts
const artifacts = detail.modeArtifacts ?? await ce.listModeArtifacts(projectId);
setModeArtifacts(artifacts);
setActiveProject({ ...detail, modeArtifacts: artifacts });
```

On delete current project:

```ts
setModeArtifacts([]);
```

Add callbacks:

```ts
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
```

- [ ] **Step 5: Render mode-aware tabs**

In the project tab strip, replace direct `EditorTab` list rendering with:

```tsx
{getWorkspaceTabsForMode(activeProject.meta.mode).map((tab) => (
  <button key={tab.id} className={editorTab === tab.id ? 'active' : ''} onClick={() => setEditorTab(tab.id as EditorTab)}>
    {tab.label}
  </button>
))}
```

Keep existing exam-review page branches.

Add a branch before materials:

```tsx
{activeProject && isModeTab(editorTab as WorkspaceTabId) && (
  <ModeModulePage
    tab={getWorkspaceTabsForMode(activeProject.meta.mode).find((tab) => tab.id === editorTab) ?? getWorkspaceTabsForMode(activeProject.meta.mode)[0]}
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
```

- [ ] **Step 6: Add mode module styles**

In `src/styles/workspace.css`, add:

```css
.mode-module-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.mode-generation-panel {
  padding: var(--space-md);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-low);
}

.mode-generation-panel textarea {
  min-height: 110px;
}

.mode-artifact-grid {
  display: grid;
  grid-template-columns: minmax(260px, 0.32fr) minmax(0, 0.68fr);
  gap: var(--space-lg);
  align-items: start;
}

.mode-artifact-list,
.mode-artifact-editor {
  min-width: 0;
  padding: var(--space-md);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-lowest);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.mode-artifact-editor textarea {
  min-height: 360px;
  font-family: var(--font-mono);
  line-height: 1.6;
}
```

- [ ] **Step 7: Run settings UI and typecheck**

Run:

```powershell
npm run test:settings-ui
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 8: Commit Task 5**

Run:

```powershell
git add src/app/App.tsx src/components/modes/ModeModulePage.tsx src/styles/workspace.css src/components/settings/workspace-layout.test.mjs
git commit -m "feat: add mode-aware workspace pages"
```

---

### Task 6: Mode-Aware Delivery Package

**Files:**
- Modify: `electron/main.cts`
- Modify: `electron/delivery-package.test.cjs`

- [ ] **Step 1: Write failing delivery source test**

In `electron/delivery-package.test.cjs`, add:

```js
test('DeliveryAgent includes mode artifacts in delivery generation', () => {
  const main = fs.readFileSync(mainSourcePath, 'utf8');

  assert.match(main, /modeArtifacts/);
  assert.match(main, /listModeArtifacts\(projectId\)/);
  assert.match(main, /buildModeDeliveryItems/);
  assert.match(main, /mode-artifacts/);
});
```

- [ ] **Step 2: Run Electron tests to verify RED**

Run:

```powershell
npm run test:electron
```

Expected: FAIL because delivery package generation does not include mode artifacts yet.

- [ ] **Step 3: Add mode delivery item builder**

In `electron/main.cts`, add before `buildFallbackDeliveryPackage`:

```ts
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
    }, 0)
  ];
}
```

- [ ] **Step 4: Include mode artifacts in delivery generation**

In `generateDeliveryPackage`, load:

```ts
const modeArtifacts = await listModeArtifacts(projectId);
```

Pass `modeArtifacts` into `buildFallbackDeliveryPackage`.

Change `buildFallbackDeliveryPackage` signature:

```ts
function buildFallbackDeliveryPackage(
  project: ProjectDetail,
  profile: LearningProfile,
  pathPlan: LearningPathPlan | null,
  resources: PersonalizedResource[],
  reports: StageReport[],
  modeArtifacts: ModeArtifact[] = []
): DeliveryPackage
```

Inside its `items` array, append:

```ts
...buildModeDeliveryItems(project, modeArtifacts)
```

Add to summary:

```ts
modeArtifacts.length ? `模式成果 ${modeArtifacts.length} 份。` : '模式成果尚未生成。'
```

- [ ] **Step 5: Run Electron tests to verify GREEN**

Run:

```powershell
npm run test:electron
```

Expected: PASS.

- [ ] **Step 6: Commit Task 6**

Run:

```powershell
git add electron/main.cts electron/delivery-package.test.cjs
git commit -m "feat: include mode artifacts in delivery packages"
```

---

### Task 7: Full Verification and Debug Run

**Files:**
- No source edits unless verification exposes a defect.

- [ ] **Step 1: Run full typecheck**

Run:

```powershell
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 2: Run full tests**

Run:

```powershell
npm test
```

Expected:

- Electron tests pass.
- Renderer tests pass.
- Settings UI tests pass.

- [ ] **Step 3: Restart debug run**

Run:

```powershell
$root = 'D:\review\.worktrees\codex-multi-provider-settings\cram-engine-main\desktop'
$escapedRoot = [Regex]::Escape($root)
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match $escapedRoot -and ($_.Name -in @('node.exe','electron.exe','cmd.exe')) } | ForEach-Object {
  try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch { }
}
$log = Join-Path $root '.codex-dev.log'
if (Test-Path -LiteralPath $log) { Remove-Item -LiteralPath $log -Force }
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "npm run dev > `"$log`" 2>&1" -WorkingDirectory $root -WindowStyle Hidden -PassThru
```

- [ ] **Step 4: Confirm dev server readiness**

Run:

```powershell
Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2
Get-Content .codex-dev.log -Tail 120 -Encoding utf8
```

Expected:

- HTTP 200.
- Vite ready.
- TypeScript watch says `Found 0 errors`.
- Electron loads `http://127.0.0.1:5173`.

- [ ] **Step 5: Final commit if verification changed files**

If verification required source fixes, commit them:

```powershell
git add <changed-source-files>
git commit -m "fix: stabilize project mode workspace"
```

Do not commit `.codex-dev.log`.

---

## Self-Review Notes

- Spec coverage: the plan covers mode types, template registry, mode-first project creation, mode-aware workspace tabs, mode artifact persistence, deterministic generation, delivery integration, testing, and debug run verification.
- Scope control: virtual teacher, student development, knowledge graph, courseware, simulation, and teaching game development remain registered as future modes in the design but are not implemented in this plan.
- Type consistency: `ProjectMode`, `WorkspaceTabId`, `ModeArtifact`, and `GenerateModeArtifactInput` are introduced in Task 1 and reused consistently in later tasks.
- Verification: every implementation task includes a failing test first, a green test command, and a commit step.
