# Paper Assistant End-to-End Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `paper-assistant` project type buildable and prove its complete user workflow, including one controlled real-provider generation per paper workspace module.

**Architecture:** First restore the shared settings UI and delivery-suite baseline without changing paper behavior. Then add paper-assistant-specific automated coverage around project creation, artifacts, persistence, delivery eligibility, and export. Finally run a controlled Electron user-acceptance scenario using a preconfigured provider; each generated artifact is edited, saved, reloaded, and included in the delivery package.

**Tech Stack:** Electron 36, React 19, TypeScript 5.8, Vite 7, Node `node:test`, existing provider IPC, project-local JSON persistence, Markdown/JSON delivery export.

---

## Acceptance Scenario

Use a non-sensitive fixture paper project:

- Title: `生成式人工智能辅助本科论文写作的学习支持研究`
- Discipline: `教育技术学`
- Type: `本科论文`
- Research object: `某高校本科生使用生成式人工智能辅助论文写作的学习过程`
- Format requirements: `学校本科毕业论文模板；GB/T 7714；中文摘要；三级标题`
- Sources: one short local `.txt` or `.md` literature note and one `.bib` or `.ris` citation fixture with public/sample metadata only.

The acceptance record must identify the provider profile and model label, but never log, export, paste, or screenshot API keys.

### Task 1: Restore the Build and Test Baseline

**Files:**
- Modify: `cram-engine-main/desktop/src/components/settings/SettingsCategoryNav.tsx`
- Modify: `cram-engine-main/desktop/src/components/settings/ProviderSettingsPage.tsx`
- Modify: `cram-engine-main/desktop/electron/delivery-package.test.cjs`
- Test: `cram-engine-main/desktop/src/components/settings/settings-layout.test.mjs`

- [ ] **Step 1: Add regression assertions for the settings navigation contract**

In `settings-layout.test.mjs`, import the rendered source or its extracted categories and assert exactly one exported `SettingsCategory` union and one default navigation component. Assert the category IDs are `services`, `workspace`, `document`, `default`, `generation`, `display`, and `language`.

- [ ] **Step 2: Run the focused settings test and confirm it fails**

Run: `npm.cmd run test:settings-ui`

Expected: FAIL while `SettingsCategoryNav.tsx` contains duplicate declarations or the new assertions are absent.

- [ ] **Step 3: Keep one navigation component and complete its category data**

Remove the stale duplicate half of `SettingsCategoryNav.tsx`. Keep the i18n-aware implementation and its exported `SettingsCategory` type. In `ProviderSettingsPage.tsx`, make `scopeSummary` contain a `language` tuple matching the other entries so it satisfies `Record<SettingsCategory, [string, string]>`.

- [ ] **Step 4: Repair delivery tests to inspect behavior, not formatting**

In `delivery-package.test.cjs`, replace the brittle end marker `\n};\n\nfunction selectLatestModeArtifactsByTab` with a matcher that locates the registry closing boundary irrespective of the whitespace or helper placement. Preserve the assertions that compare every renderer deliverable to `modeDeliveryDefinitions`.

- [ ] **Step 5: Run baseline verification**

Run: `npm.cmd run typecheck`

Expected: exit code 0 for both renderer and Electron TypeScript projects.

Run: `npm.cmd run test:settings-ui; npm.cmd run test:electron`

Expected: all settings and Electron tests pass, including the three delivery-package tests that currently fail only on a missing source marker.

### Task 2: Add Paper-Assistant Contract Coverage

**Files:**
- Modify: `cram-engine-main/desktop/src/lib/projectModes.test.mjs`
- Modify: `cram-engine-main/desktop/src/lib/wizardProject.test.mjs`
- Modify: `cram-engine-main/desktop/electron/project-modes.test.cjs`
- Modify: `cram-engine-main/desktop/electron/delivery-package.test.cjs`

- [ ] **Step 1: Add a renderer project-mode regression test**

Assert `getProjectModeTemplate('paper-assistant')` has this exact ordered tab sequence:

```js
[
  'paper-overview', 'paper-literature', 'paper-outline', 'paper-chapters',
  'paper-methods', 'paper-innovation', 'paper-format', 'paper-defense', 'delivery'
]
```

Also assert the upload allowlist includes `pdf`, `docx`, `txt`, `md`, `ris`, and `bib`, and the three deliverables are `outline`, `innovation`, and `defense`.

- [ ] **Step 2: Add a wizard payload test for a paper project**

Build a payload with the Acceptance Scenario values and assert that `mode === 'paper-assistant'`, `modeConfiguration.paperType`, `researchObject`, and `formatRequirements` survive normalization and project creation.

- [ ] **Step 3: Add Electron persistence and delivery tests**

Create a paper project, save non-empty `agent` artifacts for `paper-outline`, `paper-chapters`, `paper-methods`, `paper-innovation`, and `paper-defense`, reopen it, and assert all artifacts retain their mode, tab IDs, Markdown, and updates. Assert `getDeliveryPackage()` reports all three paper deliverables as `ready`; removing any required artifact must make only its corresponding delivery item `needs-review` or `missing`.

- [ ] **Step 4: Run the focused paper contract tests**

Run: `npm.cmd run test:renderer -- --test-name-pattern="paper|wizard"`

Run: `npm.cmd run test:electron -- --test-name-pattern="paper|mode delivery|project model"`

Expected: the test output explicitly reports all added paper tests as passing.

### Task 3: Verify Real-Provider Artifact Generation Safely

**Files:**
- Verify only; no credentials or provider configuration files are committed.

- [ ] **Step 1: Verify a usable configured provider without revealing secrets**

Open Settings in the desktop app and confirm one enabled profile has a selected model and an API key according to the UI status. Do not inspect its value. If none is configured, stop this task and request the user to enter it locally.

- [ ] **Step 2: Start the development app after the build baseline passes**

Run: `npm.cmd run dev`

Expected: Vite listens on `http://127.0.0.1:5173`, Electron opens, and no renderer or main-process compile errors appear.

- [ ] **Step 3: Create the acceptance project through the new-project wizard**

Choose `论文助手`, fill all Acceptance Scenario fields, select the configured model, create the project, then close and reopen it. Expected: all nine paper workspace tabs are present and the values persist.

- [ ] **Step 4: Upload and retain source material**

Upload the public/sample note and citation fixture. Confirm each item is retained in the project material list after reopening the project. Where the UI offers knowledge extraction, save at least one extracted entry and confirm it remains project-local.

- [ ] **Step 5: Generate, review, edit, and persist every business artifact**

For each tab below, enter a tab-specific prompt, generate once using the configured provider, edit the generated Markdown with a unique marker, and click save:

| Tab | Prompt focus | Required evidence |
| --- | --- | --- |
| `paper-literature` | Search dimensions, inclusion criteria, and literature matrix | Citation/source traceability and synthesis structure |
| `paper-outline` | Research questions and chapter hierarchy | Chapters, research questions, and logical flow |
| `paper-chapters` | Chapter draft for the chosen outline | A substantive section tied to the outline |
| `paper-methods` | Participants, data collection, analysis, ethics | Feasible method and limitations |
| `paper-innovation` | Conservative contribution versus prior work | Comparison target and evidence path |
| `paper-format` | GB/T 7714 and institutional formatting checklist | Actionable formatting checks |
| `paper-defense` | Defense questions on background, methods, limitations | Questions plus evidence-based responses |

For `paper-overview`, confirm the project status and next-step guidance render. Reopen the project after all saves and confirm every unique marker remains. A provider error, timeout, empty response, or fallback artifact is a failed online-generation acceptance item and must be recorded with its user-visible message.

- [ ] **Step 6: Verify the project AI drawer**

Ask one paper-scoped question, save the response to the knowledge base, reopen the project, and confirm the chat turn and resulting knowledge entry remain available. Do not synchronize the chat to a question bank because it is outside the paper-assistant acceptance scope.

### Task 4: Validate Delivery and Export as a User

**Files:**
- Verify only; generated artifacts stay in local project storage and exported files are test outputs, not repository source.

- [ ] **Step 1: Inspect delivery readiness**

Open `交付`. Confirm the three paper deliverables resolve as follows:

| Delivery item | Required source tabs |
| --- | --- |
| 论文大纲 | `paper-outline`, `paper-chapters` |
| 创新点矩阵 | `paper-methods`, `paper-innovation` |
| 答辩 Q&A | `paper-defense` |

Expected: all are `ready` only after their saved non-fallback artifacts exist.

- [ ] **Step 2: Export and inspect both artifacts**

Generate the delivery export. Open the `.md` and `.json` outputs and verify they contain the project metadata, the three delivery items, and the saved unique markers from the five source tabs. Verify no API key appears by searching both files for the configured key only locally, without printing it to logs.

- [ ] **Step 3: Prove project portability**

Use the project archive export/import flow if exposed by the UI. Import into the local project list, reopen it, and verify the paper metadata, uploads, knowledge entry, chat history, five delivery-source artifacts, and delivery statuses are restored.

### Task 5: Final Verification and Report

**Files:**
- Modify: `docs/superpowers/plans/2026-07-17-paper-assistant-end-to-end.md` only to mark completed evidence during execution.

- [ ] **Step 1: Run all automated verification from a clean stopped-dev-server state**

Run: `npm.cmd run typecheck`

Run: `npm.cmd test`

Run: `npx.cmd vite build; npx.cmd tsc -p electron/tsconfig.json`

Expected: each command exits 0. Record exact passing test counts and build output in the execution report.

- [ ] **Step 2: Inspect the final diff**

Run: `git diff --check`

Run: `git status --short`

Expected: no whitespace errors; only intentional source, test, and documentation changes plus explicitly identified user-owned pre-existing changes.

- [ ] **Step 3: Publish a requirement-by-requirement acceptance record**

Report: build status; test status; provider/model label; each paper tab's generation/save/reopen outcome; material ingestion; chat-to-knowledge result; each delivery status; export content check; portability check; and any residual issue with reproduction steps. Never include secrets, raw provider request headers, or private document content.
