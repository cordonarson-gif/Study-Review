# Learning Profile Phase 0+1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Phase 0 workspace navigation skeleton and the Phase 1 learning profile system with a first ProfileAgent.

**Architecture:** Persist profile data inside each project directory, expose it through typed Electron IPC, and render a focused React profile page. The ProfileAgent is implemented as a bounded analyzer function in the Electron main process with model-backed analysis when credentials exist and deterministic fallback when they do not.

**Tech Stack:** Electron IPC, TypeScript, React, local JSON persistence, existing provider API helpers, Node test runner.

---

### Task 1: Profile data model and persistence

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/global.d.ts`
- Modify: `electron/main.cts`
- Test: `electron/profile.test.cjs`

- [ ] Write a failing Electron test that creates a project, calls profile get/save/analyze helpers through exported-compatible behavior or source assertions, and expects a default profile with eight dimensions.
- [ ] Add `LearningProfile`, `LearningProfileEvent`, and `LearningProfileState` types to renderer and global declarations.
- [ ] Add `projectProfileDir`, `projectProfilePath`, and `projectProfileEventsPath` helpers.
- [ ] Create default profile and normalization helpers.
- [ ] Add profile initialization during project creation.

### Task 2: Profile IPC and preload bridge

**Files:**
- Modify: `electron/main.cts`
- Modify: `electron/preload.cts`
- Modify: `src/global.d.ts`
- Test: `electron/startup.test.cjs`

- [ ] Write failing source tests asserting `profile:get`, `profile:save`, `profile:analyze`, and preload bridge methods exist.
- [ ] Register IPC handlers.
- [ ] Expose `getLearningProfile`, `saveLearningProfile`, and `analyzeLearningProfile` through preload.
- [ ] Ensure all methods return a full `LearningProfileState`.

### Task 3: ProfileAgent analysis

**Files:**
- Modify: `electron/main.cts`
- Test: `electron/profile.test.cjs`

- [ ] Write failing tests asserting profile analysis has a no-credentials fallback and includes weak points inferred from questions.
- [ ] Build a compact analysis context from project metadata, uploads, questions, chat history, and user input.
- [ ] If credentials are available, call the configured model and parse JSON.
- [ ] If credentials are missing or parsing fails, generate a deterministic profile draft.
- [ ] Append profile events for analysis and save.

### Task 4: Workspace navigation skeleton

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/styles/workspace.css`
- Test: `src/components/settings/workspace-layout.test.mjs`

- [ ] Write failing source test asserting `EditorTab` includes `profile`, `agents`, `resources`, `path`, `report`, and `delivery`.
- [ ] Add tab buttons.
- [ ] Add placeholder pages for Phase 2+ tabs.
- [ ] Keep existing overview/materials/practice/import/config/progress behavior unchanged.

### Task 5: Learning profile page UI

**Files:**
- Create: `src/components/profile/LearningProfilePage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/workspace.css`
- Test: `src/components/settings/workspace-layout.test.mjs`

- [ ] Write failing source test asserting the profile page has eight dimensions, analyze/save actions, and profile events.
- [ ] Implement profile page component.
- [ ] Load profile when opening a project.
- [ ] Save profile edits back through IPC.
- [ ] Analyze natural-language input through ProfileAgent.

### Task 6: AI tutor profile context

**Files:**
- Modify: `electron/main.cts`
- Test: `electron/startup.test.cjs`

- [ ] Write failing source test asserting `runProjectChat` includes learning profile context.
- [ ] Read profile state in `runProjectChat`.
- [ ] Add profile summary to prompt.
- [ ] Keep missing profile behavior safe.

### Verification

- [ ] Run `npm run test:electron`.
- [ ] Run `npm run test:settings-ui`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Restart the project and confirm `http://127.0.0.1:5173` is ready.

