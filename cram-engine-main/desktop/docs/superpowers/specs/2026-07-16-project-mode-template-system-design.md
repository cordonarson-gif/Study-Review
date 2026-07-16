# Project Mode Template System Design

## Goal

Upgrade the current exam-review-focused desktop app into an extensible education and research AI workspace. When creating a new project, users first choose a project mode. The selected mode controls the creation wizard, workspace tabs, AI agents, accepted files, generated assets, and final deliverables.

The first implementation batch focuses on four high-value modes that can be implemented deeply and reliably on the current architecture:

1. Paper Assistant
2. Research Data Analysis
3. Teaching Design / Lesson Plan
4. Assignment Authoring, Grading, and Online Quiz

The existing final-exam review workflow remains the default `exam-review` mode and must not regress.

## Why a Template System

The current app already has strong project primitives: project metadata, uploads, question parsing, AI chat, learning profile, resources, path planning, reports, delivery packages, provider settings, MinerU document recognition, LaTeX detection, and rich workspace pages.

Adding many independent features directly to the current wizard and tab list would make the interface crowded. A project mode template system keeps the app coherent:

- each mode gets only the wizard fields it needs;
- each mode gets only relevant workspace tabs;
- common infrastructure stays shared;
- future modes can be added by registering templates instead of rewriting the app;
- old projects can be migrated safely by defaulting to `exam-review`.

## Supported Modes

### Phase 1 Modes

#### 1. Exam Review

Existing mode. It keeps the current pages:

- Overview
- Learning Profile
- Materials
- Agents
- Resources
- Learning Path
- Practice
- Import Questions
- Stage Report
- Delivery
- Config
- Progress

This mode continues to support question recognition, wrong-question review, resources, reports, and delivery packages.

#### 2. Paper Assistant

Purpose: help users complete academic writing workflows from topic clarification to outline, chapter drafting, methods, innovation points, formatting checks, and defense preparation.

Wizard fields:

- paper title
- discipline
- paper type
- research object
- target stage: proposal, outline, first draft, revision, defense
- formatting requirements
- existing materials

Workspace tabs:

- Paper Overview
- Literature
- Outline
- Chapter Drafting
- Methods
- Innovation
- Format Check
- Defense
- Delivery

Deliverables:

- paper outline
- chapter draft notes
- innovation-point matrix
- formatting checklist
- defense Q&A
- export package

#### 3. Research Data Analysis

Purpose: help users upload CSV/Excel/text data, understand fields, run descriptive analysis, generate visual summaries, explain results, and produce research reports.

Wizard fields:

- research topic
- discipline
- dataset description
- target analysis
- expected output: charts, report, conclusion, methods
- data files

Workspace tabs:

- Data Overview
- Dataset
- Analysis Plan
- Statistics
- Charts
- Findings
- Report
- Delivery

Deliverables:

- data dictionary
- analysis plan
- chart set
- findings summary
- research report
- export package

#### 4. Teaching Design / Lesson Plan

Purpose: help teachers generate and refine teaching objectives, key and difficult points, classroom activities, assessment design, homework, blackboard design, lesson plans, and teaching reflection.

Wizard fields:

- course name
- grade or learner stage
- textbook chapter
- lesson duration
- learner profile
- teaching goals
- available resources

Workspace tabs:

- Teaching Overview
- Objectives
- Key Points
- Activities
- Assessment
- Lesson Plan
- Courseware Draft
- Delivery

Deliverables:

- teaching objective table
- teaching process design
- activity plan
- assessment plan
- lesson plan
- courseware outline

#### 5. Assignment / Quiz

Purpose: help users generate assignments, create quizzes, set answer keys and rubrics, grade submissions, analyze wrong answers, and produce learning feedback.

Wizard fields:

- subject
- knowledge points
- difficulty
- question types
- question count
- grading rubric
- target learners

Workspace tabs:

- Assignment Overview
- Question Bank
- Paper Builder
- Online Quiz
- Grading
- Wrong Answers
- Learning Feedback
- Delivery

Deliverables:

- assignment sheet
- answer key
- grading rubric
- quiz package
- wrong-answer report
- feedback report

### Later Modes

These should be registered after the template system is stable:

- Virtual Teacher
- Student Development
- Knowledge Graph
- Interactive Courseware
- Research Innovation Assistant
- Experiment Simulation
- Teaching Game Development

Experiment simulation and teaching game development should not be implemented as simple placeholder pages. They need preview/runtime support, templates, and safe execution boundaries, so they belong in later phases.

## Data Model

Add a project mode field to project metadata:

```ts
type ProjectMode =
  | 'exam-review'
  | 'paper-assistant'
  | 'research-analysis'
  | 'teaching-design'
  | 'assignment-quiz';
```

`ProjectMeta` gains:

```ts
mode: ProjectMode;
modeConfig?: Record<string, unknown>;
```

Migration rule:

- if an existing project has no `mode`, treat it as `exam-review`;
- do not rewrite old project files unless the project is saved or opened and persisted by normal project flows.

## Template Registry

Create a renderer-side registry:

```ts
type ProjectModeTemplate = {
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
```

Initial registry file:

```txt
src/lib/projectModes.ts
```

This registry is the single source of truth for:

- the project-mode cards shown at project creation;
- which wizard fields appear after mode selection;
- which workspace tabs are visible for that project;
- mode-specific empty states and quick actions;
- mode-specific delivery package labels.

## Creation Flow

The new project wizard becomes mode-first:

1. Select project mode.
2. Fill mode-specific project information.
3. Select provider/model.
4. Review and create.

For `exam-review`, the existing wizard fields are preserved as much as possible.

For new modes, the wizard should avoid showing exam-specific labels such as exam type, textbook, must-know points, and initial question text unless the selected template requires them.

## Workspace Routing

`EditorTab` should be replaced or extended so tabs can be generated from templates. Existing pages can remain hard-coded during the first phase, but the rendering branch should support mode-specific tab groups.

Recommended path:

1. Introduce `WorkspaceTabId`.
2. Keep existing exam-review tabs.
3. Add mode-specific tab IDs.
4. Render a generic `ModeModulePage` for first-pass pages where the feature is document-generation oriented.
5. Promote important pages to dedicated components as they mature.

This avoids creating dozens of incomplete custom components at once.

## First-Pass Page Behavior

Each new mode-specific page should be useful immediately:

- show a focused purpose;
- display relevant project context;
- accept notes or uploaded text;
- generate structured Markdown through the active provider when configured;
- fall back to deterministic local templates when no provider is configured;
- save generated content locally under the project directory;
- include clear next actions.

No page should be a decorative placeholder.

## Storage Layout

Mode outputs should be stored under a project-local directory:

```txt
mode/
  artifacts.json
  notes.json
  generated/
```

Each artifact:

```ts
type ModeArtifact = {
  id: string;
  mode: ProjectMode;
  tabId: string;
  title: string;
  kind: string;
  contentMarkdown: string;
  source: 'agent' | 'manual' | 'fallback';
  createdAt: string;
  updatedAt: string;
};
```

This keeps artifacts separate from existing question resources and delivery packages while still allowing delivery export to include them later.

## AI Agent Pattern

Use lightweight mode agents rather than one large generic agent:

- PaperAgent
- ResearchAnalysisAgent
- TeachingDesignAgent
- AssignmentQuizAgent

Each agent gets:

- project metadata;
- mode configuration;
- uploaded material summaries;
- current artifacts;
- user prompt;
- requested output kind.

Agents must use deterministic fallback templates if no provider is configured or the model call fails.

## Delivery Integration

The existing delivery package should be mode-aware.

For example:

- paper mode exports outline, chapter notes, innovation matrix, defense Q&A;
- research mode exports data dictionary, analysis plan, charts, findings, report;
- teaching mode exports objectives, activities, lesson plan, courseware outline;
- assignment mode exports question bank, quiz, rubric, grading report, wrong-answer report.

The delivery page should keep the same UI but use template-specific labels and checklist items.

## UI Direction

The mode selector should be visually polished because it becomes the front door of the whole app.

Recommended design:

- large card grid;
- each card has a short title, description, recommended scenarios, and output chips;
- `exam-review` remains first and marked as current mature workflow;
- new modes are marked as supported AI workflows, not experimental placeholders;
- after selecting a card, the wizard changes labels and fields.

The app should feel like a multi-scenario professional workspace, not a menu of unrelated tools.

## Testing Requirements

Add tests for:

- project mode types and default migration;
- template registry contains all Phase 1 modes;
- wizard renders mode selector;
- selecting a mode changes the wizard fields;
- created projects persist `mode`;
- opening old projects without `mode` treats them as `exam-review`;
- workspace tabs vary by mode;
- mode artifacts can be generated, saved, listed, and deleted;
- delivery package generation includes mode artifacts.

Existing tests must continue to pass:

- Electron tests
- renderer tests
- settings UI tests

## Implementation Phases

### Phase A: Foundation

- Add `ProjectMode` type.
- Add `mode` and `modeConfig` to project metadata.
- Add migration default to `exam-review`.
- Add `projectModes.ts` template registry.
- Add tests for registry and migration.

### Phase B: Mode-First Wizard

- Add project mode selection step.
- Keep exam-review behavior compatible.
- Add mode-specific wizard field rendering.
- Persist selected mode during project creation.

### Phase C: Mode-Aware Workspace

- Derive visible tabs from the selected mode template.
- Add first-pass useful pages for Paper, Research, Teaching, and Assignment modes.
- Avoid empty placeholders.

### Phase D: Mode Artifacts

- Add project-local mode artifact storage.
- Add IPC/preload methods for list/generate/save/delete artifacts.
- Add deterministic fallback generation.

### Phase E: Delivery Package Integration

- Include mode artifacts in delivery package generation.
- Add mode-specific delivery item labels and checklists.

## Non-Goals for First Implementation

- Full physics/chemistry simulation runtime.
- Full teaching game engine.
- Real-time multi-user online quiz hosting.
- External database or cloud sync.
- Guaranteed scientific novelty claims.
- Automatic plagiarism detection.

These can be added later with separate design specs.

## Success Criteria

The feature is successful when:

- users can choose a project mode at creation;
- exam-review projects continue to behave as before;
- the four Phase 1 modes create projects with relevant fields and tabs;
- each new mode has at least one useful generation/save workflow;
- outputs persist locally and survive reopening;
- delivery export reflects the selected mode;
- all tests pass.
