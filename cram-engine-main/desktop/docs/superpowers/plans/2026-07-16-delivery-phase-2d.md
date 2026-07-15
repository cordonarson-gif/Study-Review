# Delivery Phase 2D Implementation Plan

**Goal:** Replace the `交付` placeholder with a real project-scoped delivery package page.

### Task 1: Delivery model and bridge contract

- [ ] Add delivery package types.
- [ ] Add preload methods for get, generate, save, and export.
- [ ] Add source tests.

### Task 2: Electron DeliveryAgent persistence and export

- [ ] Add `projectDeliveryPackagePath(projectId)`.
- [ ] Add normalize/get/write helpers.
- [ ] Add deterministic DeliveryAgent package generation.
- [ ] Add Markdown/JSON package export.
- [ ] Register IPC handlers.

### Task 3: Delivery page

- [ ] Create `DeliveryPackagePage`.
- [ ] Load package when opening/creating a project.
- [ ] Wire generate/save/export callbacks.
- [ ] Replace delivery placeholder page.

### Verification

- [ ] Run `npm run test:electron`.
- [ ] Run `npm run test:settings-ui`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Restart the project and confirm `http://127.0.0.1:5173` is ready.
