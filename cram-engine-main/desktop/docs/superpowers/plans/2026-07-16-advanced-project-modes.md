# Advanced Project Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add eight advanced project modes, a truly mode-aware creation wizard, and dedicated local workspaces for simulation, knowledge graph, courseware, teaching games, and mistake review.

**Architecture:** Extend the shared mode registry and duplicated Electron bridge unions, keep document workflows on the existing persistent `ModeModulePage`, and route interaction-heavy tabs to focused React components. Put deterministic simulation, graph, slide, and game transformations in one browser-independent library with Node tests.

**Tech Stack:** Electron, React 19, TypeScript, local JSON persistence, Node test runner, SVG, existing project question and mode-artifact IPC.

---

## File Structure

- Modify `src/lib/types.ts`, `src/global.d.ts`, `electron/preload.cts`, and `electron/main.cts` for new modes and tab ids.
- Modify `src/lib/projectModes.ts` and `src/lib/projectModes.js` to register the advanced templates.
- Modify `src/lib/projectModes.test.mjs` and `electron/project-modes.test.cjs` to verify registry and normalization coverage.
- Create `src/lib/advancedModeWorkspaces.js`, `src/lib/advancedModeWorkspaces.d.ts`, and `src/lib/advancedModeWorkspaces.test.mjs` for deterministic workbench logic.
- Create `src/components/modes/SimulationWorkbenchPage.tsx`, `KnowledgeGraphPage.tsx`, `CoursewareStudioPage.tsx`, and `TeachingGamePage.tsx` for interactive workspaces.
- Modify `src/app/App.tsx` for mode-aware wizard rendering and specialized page routing.
- Modify `src/components/settings/workspace-layout.test.mjs` for source-level UI contracts.
- Modify `src/styles/workspace.css` for stable responsive layouts.

### Task 1: Advanced Registry and Electron Contracts

**Files:** `src/lib/projectModes.test.mjs`, `electron/project-modes.test.cjs`, `src/lib/types.ts`, `src/global.d.ts`, `electron/preload.cts`, `electron/main.cts`, `src/lib/projectModes.ts`, `src/lib/projectModes.js`

- [ ] Add failing registry assertions for `research-innovation`, `lab-simulation`, `virtual-teacher`, `student-development`, `interactive-courseware`, `teaching-game`, `knowledge-graph`, and `mistake-collection` and assert the specialized tab ids `simulation-run`, `graph-view`, `courseware-preview`, `game-preview`, and `mistakes-review`.
- [ ] Run `node --test src/lib/projectModes.test.mjs` and verify failure because the new modes are missing.
- [ ] Add failing Electron source assertions that every new mode and specialized tab appears in the main-process allowlists.
- [ ] Run `node --test electron/project-modes.test.cjs` and verify failure because normalization does not yet accept the new values.
- [ ] Extend all four `ProjectMode` unions and all four `WorkspaceTabId` unions with the exact new ids.
- [ ] Register eight templates. Each template must contain at least four wizard fields, five focused tabs plus `delivery`, one agent, three deliverables, and relevant upload extensions.
- [ ] Extend `projectModes`, `workspaceTabs`, and `modeLabel` in `electron/main.cts` so artifacts retain the selected mode and tab.
- [ ] Run both focused tests and `npm run typecheck`; verify all pass.
- [ ] Commit with `feat: register advanced project modes`.

### Task 2: Mode-Aware Wizard

**Files:** `src/components/settings/workspace-layout.test.mjs`, `src/app/App.tsx`, `src/styles/workspace.css`

- [ ] Add failing source tests for `isQuestionOrientedMode`, `getWizardStepLabels`, a single template-driven field renderer, and conditional initial-question import.
- [ ] Run `npm run test:settings-ui` and verify the new assertions fail.
- [ ] Add helpers that return `['项目信息', '工作目标', '素材导入']` for document modes and `['项目信息', '出题要求', '题目导入']` for question modes.
- [ ] Replace the unconditional exam-type/textbook blocks with a common project-name field, provider/model selection, and `selectedWizardTemplate.wizardFields.map(renderModeField)`. Route known common keys to `WizardState` and all other keys to `modeConfig`.
- [ ] Show question import only for `exam-review`, `assignment-quiz`, `teaching-game`, and `mistake-collection`; show source-file notes for other modes.
- [ ] Update wizard CSS so field grids collapse to one column on narrow screens and no control overflows.
- [ ] Run `npm run test:settings-ui`, `npm run test:renderer`, and `npm run typecheck`; verify all pass.
- [ ] Commit with `feat: make project wizard mode aware`.

### Task 3: Deterministic Advanced Workbench Library

**Files:** `src/lib/advancedModeWorkspaces.test.mjs`, `src/lib/advancedModeWorkspaces.js`, `src/lib/advancedModeWorkspaces.d.ts`

- [ ] Write failing tests for a six-point linear sweep, exponential decay output, invalid range rejection, graph extraction from two knowledge entries and one question, empty graph input, Markdown slide parsing, and filtering playable multiple-choice questions.
- [ ] Run `node --test src/lib/advancedModeWorkspaces.test.mjs` and verify module-not-found failure.
- [ ] Implement `runParameterSweep({ model, start, end, steps, coefficient, initialValue })` for `linear`, `decay`, and `saturation`, returning finite `{ x, y }` points and throwing Chinese validation errors for non-finite inputs or `steps` outside 2..50.
- [ ] Implement `buildKnowledgeGraph({ knowledgeBase, questions, artifacts })` with stable ids, typed nodes, tag/knowledge-point edges, and an empty-array fallback.
- [ ] Implement `layoutKnowledgeGraph(graph, width, height)` using deterministic concentric placement without random values.
- [ ] Implement `parseCoursewareSlides(markdown)` by splitting level-one/two headings and `---`, always returning one slide.
- [ ] Implement `getPlayableQuestions(questions)` to keep questions with at least two non-empty options and an answer.
- [ ] Add complete TypeScript declarations for all exports.
- [ ] Run the focused test and `npm run typecheck`; verify all pass.
- [ ] Commit with `feat: add advanced mode workbench logic`.

### Task 4: Specialized Interactive Pages

**Files:** `src/components/settings/workspace-layout.test.mjs`, `src/components/modes/SimulationWorkbenchPage.tsx`, `src/components/modes/KnowledgeGraphPage.tsx`, `src/components/modes/CoursewareStudioPage.tsx`, `src/components/modes/TeachingGamePage.tsx`, `src/app/App.tsx`, `src/styles/workspace.css`

- [ ] Add failing source tests that import and route all four pages, reuse `QuestionImportPanel` for `mistakes-import`, and reuse `PracticePanel` for `mistakes-review`.
- [ ] Run `npm run test:settings-ui` and verify failure.
- [ ] Build `SimulationWorkbenchPage` with model segmented control, numeric inputs, run button, table, SVG polyline chart, and `onGenerate` report action using `simulation-report`.
- [ ] Build `KnowledgeGraphPage` with graph source counters, type filters, deterministic SVG nodes/edges, node selection, and evidence details.
- [ ] Build `CoursewareStudioPage` with editable Markdown source from the selected artifact, previous/next controls, slide position, and stable 16:9 preview.
- [ ] Build `TeachingGamePage` with playable question filtering, progress, option selection, immediate correctness feedback, score, restart, and an empty state linking users to question import.
- [ ] Route specialized tab ids before the generic `ModeModulePage` branch. Route mistake import/review to existing components so changes persist.
- [ ] Add responsive layouts, fixed preview dimensions, accessible button states, and no nested decorative cards.
- [ ] Run `npm run test:settings-ui`, `npm run test:renderer`, and `npm run typecheck`; verify all pass.
- [ ] Commit with `feat: add interactive advanced mode workspaces`.

### Task 5: Provider-Backed Domain Artifact Generation

**Files:** `electron/project-modes.test.cjs`, `electron/main.cts`

- [ ] Add failing source tests for a `buildModeArtifactPrompt` helper, project `modeConfig`, upload summaries, current artifacts, `buildChatRequest`, `parseChatResponse`, and a catch path that returns `buildFallbackModeArtifact`.
- [ ] Run `node --test electron/project-modes.test.cjs` and verify the new assertions fail because generation is fallback-only.
- [ ] Replace the single fallback body with a per-tab contract map covering research evidence, hypotheses, virtual-teacher sessions, student milestones, simulation reports, courseware storyboards, game mechanics, graph insights, and mistake patterns.
- [ ] Implement `buildModeArtifactPrompt(project, input, currentArtifacts)` with project metadata, serialized `modeConfig`, the three most recent parsed uploads, titles of existing artifacts, the current tab contract, and the user's prompt.
- [ ] In `generateModeArtifact`, resolve the exact project provider before the active fallback. If API key/base URL are configured, call `buildChatRequest`, parse the response, and persist an `agent` artifact. On missing configuration, non-OK response, invalid empty content, timeout, or transport failure, persist the tab-specific `fallback` artifact.
- [ ] Ensure generated content never includes API keys or raw response bodies and artifact titles remain deterministic.
- [ ] Run `node --test electron/project-modes.test.cjs`, `npm run test:electron`, and `npm run typecheck`; verify all pass.
- [ ] Commit with `feat: generate mode-specific project artifacts`.

### Task 6: Mode-Aware Delivery Content Export

**Files:** `electron/delivery-package.test.cjs`, `electron/main.cts`

- [ ] Add failing tests that delivery generation reads template-equivalent deliverables for every mode and `exportDeliveryPackage` embeds mode artifact titles and Markdown content.
- [ ] Run `node --test electron/delivery-package.test.cjs` and verify the new assertions fail because export currently contains only source counts.
- [ ] Add an Electron-side deliverable registry keyed by `ProjectMode`, with mode-specific item titles and checklists matching the renderer templates.
- [ ] Replace the generic non-exam archive item with mode-aware items whose statuses and source ids are derived from matching artifact tabs.
- [ ] Extend `renderDeliveryPackageMarkdown(project, deliveryPackage, modeArtifacts)` with a `## 模式成果正文` section and one heading/content block per artifact.
- [ ] Extend delivery JSON export to `{ deliveryPackage, modeArtifacts }` so the exported content is self-contained.
- [ ] Run `node --test electron/delivery-package.test.cjs`, `npm run test:electron`, and `npm run typecheck`; verify all pass.
- [ ] Commit with `feat: export complete mode delivery content`.

### Task 7: Requirements and Quality Review

**Files:** all files changed by Tasks 1-4

- [ ] Review each of the fourteen original scenarios against the registry and workspace routes; record any missing selectable entry or non-functional tab as a defect.
- [ ] Review error states for empty project data, invalid simulation input, missing game questions, and missing artifacts.
- [ ] Review keyboard focus, button labels, input labels, text overflow, and responsive rules.
- [ ] Fix defects with a failing regression test before production changes.
- [ ] Run focused tests after every fix and commit with `fix: complete advanced mode workflows` if changes are required.

### Task 8: Full Verification and Debug Run

**Files:** no source edits unless verification exposes a defect

- [ ] Run `npm run typecheck` and require exit code 0.
- [ ] Run `npm test` and require zero failed tests across Electron, renderer, and settings UI suites.
- [ ] Stop only dev processes whose command line contains the exact worktree path.
- [ ] Remove only `.codex-dev.log`, then start `npm run dev` hidden with output redirected to that file.
- [ ] Request `http://127.0.0.1:5173` and require HTTP 200.
- [ ] Inspect the log and require Vite ready, TypeScript `Found 0 errors`, and Electron loading the local URL.
- [ ] Ensure `git status --short` contains no generated build output and never stage `.codex-dev.log`.

## Self-Review

- Spec coverage: every original scenario maps to an existing or new mode, every interaction-heavy scenario has a dedicated implementation task, and cross-mode generation/export gaps found by the audit have explicit tasks.
- Scope: public quiz hosting, arbitrary code execution, general-purpose game engines, and guaranteed scientific novelty are explicitly excluded.
- Type consistency: new mode and tab ids use the same literals in renderer, preload, global declarations, Electron normalization, registry, and routing.
- No placeholders: every planned page has inputs, state transitions, visible output, empty/error states, and a persistence path where output is generated.
