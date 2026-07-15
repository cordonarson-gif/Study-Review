# Personalized Resources Phase 2A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `资源` placeholder with a real project-scoped personalized resource generation page.

**Architecture:** Store generated resources in `resources/generated.json`, expose a typed Electron IPC bridge, and render a dedicated React page. ResourceAgent generation uses model-backed JSON when available and deterministic local fallback when credentials or parsing fail.

**Tech Stack:** Electron IPC, TypeScript, React, project-local JSON persistence, existing provider API helpers, Node test runner.

---

### Task 1: Resource data model and bridge contract

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/global.d.ts`
- Modify: `electron/preload.cts`
- Test: `electron/startup.test.cjs`

- [x] Write failing source tests asserting `PersonalizedResource`, `PersonalizedResourceType`, and four preload methods exist.
- [x] Add the resource types to renderer and global declarations.
- [x] Add preload methods for list, generate, save, and delete.

### Task 2: Electron ResourceAgent persistence and generation

**Files:**
- Modify: `electron/main.cts`
- Test: `electron/resource-agent.test.cjs`

- [x] Write failing source tests asserting project-local generated resource helpers and deterministic fallback generation exist.
- [x] Add `projectGeneratedResourcesPath(projectId)`.
- [x] Add read/write/normalize helpers for generated resources.
- [x] Add deterministic ResourceAgent fallback generation.
- [x] Add model-backed generation with safe JSON parsing.
- [x] Register IPC handlers.

### Task 3: Personalized resources page

**Files:**
- Create: `src/components/resources/PersonalizedResourcesPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/workspace.css`
- Test: `src/components/settings/workspace-layout.test.mjs`

- [x] Write failing source tests asserting App imports and renders `PersonalizedResourcesPage` for `editorTab === 'resources'`.
- [x] Implement page generation controls, type filter, library cards, markdown preview, save, and delete.
- [x] Load generated resources when opening or creating a project.
- [x] Wire App callbacks to preload bridge.
- [x] Replace the resources placeholder page.

### Verification

- [x] Run `npm run test:electron`.
- [x] Run `npm run test:settings-ui`.
- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Restart the project and confirm `http://127.0.0.1:5173` is ready.
