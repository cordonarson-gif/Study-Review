# Stage Report Phase 2C Implementation Plan

**Goal:** Replace the `报告` placeholder with a real project-scoped stage report page.

---

### Task 1: Report data model and bridge contract

- [ ] Add `StageReportSection` and `StageReport` types.
- [ ] Add `stageReports:list/generate/save` preload methods.
- [ ] Add source tests.

### Task 2: Electron ReportAgent persistence and generation

- [ ] Add `projectStageReportsPath(projectId)`.
- [ ] Add list/write/normalize helpers.
- [ ] Add deterministic fallback generation.
- [ ] Add optional model-backed generation.
- [ ] Register IPC handlers.

### Task 3: Stage report page

- [ ] Create `StageReportPage`.
- [ ] Load reports when opening/creating a project.
- [ ] Wire generate/save callbacks.
- [ ] Replace report placeholder page.

### Verification

- [ ] Run `npm run test:electron`.
- [ ] Run `npm run test:settings-ui`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Restart the project and confirm `http://127.0.0.1:5173` is ready.
