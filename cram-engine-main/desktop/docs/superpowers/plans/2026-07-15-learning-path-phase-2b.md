# Learning Path Phase 2B Implementation Plan

**Goal:** Replace the `路径` placeholder with a real project-scoped learning path page.

**Architecture:** Store the current plan in `path/plan.json`, expose typed Electron IPC methods, and render a dedicated React page. PathAgent generation uses model-backed JSON when available and deterministic local fallback when credentials or parsing fail.

---

### Task 1: Learning path data model and bridge contract

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/global.d.ts`
- Modify: `electron/preload.cts`
- Test: `electron/learning-path.test.cjs`
- Test: `electron/startup.test.cjs`

- [x] Write failing source tests asserting learning path types and preload methods exist.
- [x] Add learning path types to renderer and global declarations.
- [x] Add preload methods for get, generate, and save.

### Task 2: Electron PathAgent persistence and generation

**Files:**
- Modify: `electron/main.cts`
- Test: `electron/learning-path.test.cjs`

- [x] Write failing source tests asserting project-local plan helpers and deterministic fallback generation exist.
- [x] Add `projectLearningPathPlanPath(projectId)`.
- [x] Add read/write/normalize helpers for plans.
- [x] Add deterministic PathAgent fallback generation.
- [x] Add model-backed generation with safe JSON parsing.
- [x] Register IPC handlers.

### Task 3: Learning path page

**Files:**
- Create: `src/components/path/LearningPathPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/workspace.css`
- Test: `src/components/settings/workspace-layout.test.mjs`

- [x] Write failing source tests asserting App imports and renders `LearningPathPage` for `editorTab === 'path'`.
- [x] Implement generation controls, plan summary, stage cards, task status controls, risks, cadence, and save action.
- [x] Load plan when opening or creating a project.
- [x] Wire App callbacks to preload bridge.
- [x] Replace the path placeholder page.

### Verification

- [x] Run `npm run test:electron`.
- [x] Run `npm run test:settings-ui`.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Restart the project and confirm `http://127.0.0.1:5173` is ready.
