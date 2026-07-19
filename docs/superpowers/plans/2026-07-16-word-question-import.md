# Word Question Import Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `.docx` question imports work locally without MinerU, correct both MinerU upload modes, and prevent parser failures from becoming bogus question drafts.

**Architecture:** Add a focused document-text router that returns a discriminated success/failure result and prefers local DOCX extraction. Move MinerU network protocol handling into a separately testable client; keep Electron `main.cts` responsible only for loading settings, OCR fallback, and converting failures into user-visible IPC errors.

**Tech Stack:** Electron 36, Node.js 22, TypeScript, `node:test`, Mammoth, AdmZip, MinerU v4 precise API and v1 Agent API.

---

### Task 1: Add Local DOCX Extraction

**Files:**
- Modify: `cram-engine-main/desktop/package.json`
- Modify: `cram-engine-main/desktop/package-lock.json`
- Create: `cram-engine-main/desktop/electron/document-text.cts`
- Create: `cram-engine-main/desktop/electron/document-text.test.cjs`

- [ ] **Step 1: Add a failing DOCX routing test**

Create a temporary `.docx` fixture with Mammoth-compatible OOXML and assert that `extractDocumentText()` returns `{ ok: true, source: 'docx-local' }` with the paragraph text. Add a second test asserting an empty DOCX returns `{ ok: false, code: 'empty-document' }` rather than placeholder text.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npm run test:electron -- --test-name-pattern="DOCX"`

Expected: FAIL because `document-text.cjs` does not exist.

- [ ] **Step 3: Install direct runtime dependencies**

Run: `npm install mammoth adm-zip && npm install --save-dev @types/adm-zip`

Expected: `package.json` and `package-lock.json` include direct entries for DOCX and ZIP parsing.

- [ ] **Step 4: Implement the discriminated document result**

Implement these public contracts in `document-text.cts`:

```ts
export type DocumentTextSuccess = {
  ok: true;
  text: string;
  source: 'text-local' | 'docx-local' | 'mineru' | 'ocr';
};

export type DocumentTextFailure = {
  ok: false;
  code: 'empty-document' | 'unsupported-format' | 'authentication' | 'network' | 'service';
  message: string;
};

export type DocumentTextResult = DocumentTextSuccess | DocumentTextFailure;
```

Route `.txt/.md/.json/.yaml/.csv` through UTF-8 reads and `.docx` through `mammoth.extractRawText({ path: filePath })`. Trim extracted text and report `empty-document` when no useful text exists.

- [ ] **Step 5: Run the focused test and confirm it passes**

Run: `npm run test:electron -- --test-name-pattern="DOCX"`

Expected: PASS.

### Task 2: Correct MinerU Precise and Agent Protocols

**Files:**
- Create: `cram-engine-main/desktop/electron/mineru-client.cts`
- Create: `cram-engine-main/desktop/electron/mineru-client.test.cjs`
- Modify: `cram-engine-main/desktop/electron/document-text.cts`

- [ ] **Step 1: Add failing MinerU protocol tests**

Add mocked-fetch tests for:

- precise mode rejecting a blank token before any request;
- HTTP 401 mapping to `authentication` and a user-readable Token message;
- precise mode reading `data.batch_id` and `data.file_urls[0]`, uploading by PUT, polling `/api/v4/extract-results/batch/{batchId}`, downloading `full_zip_url`, and extracting `full.md`;
- Agent mode posting `file_name` to `/api/v1/agent/parse/file`, uploading to `data.file_url`, polling `/api/v1/agent/parse/{taskId}`, and downloading `markdown_url` without Authorization.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `npm run test:electron -- --test-name-pattern="MinerU"`

Expected: FAIL because the new client does not exist.

- [ ] **Step 3: Implement the MinerU client**

Expose:

```ts
export type MinerUClientSettings = {
  mode: 'precise' | 'agent';
  apiKey: string;
  baseUrl: string;
};

export class MinerUParseError extends Error {
  constructor(
    public readonly code: 'authentication' | 'network' | 'service',
    message: string
  ) {
    super(message);
  }
}

export async function parseWithMinerU(
  filePath: string,
  settings: MinerUClientSettings,
  dependencies?: Partial<MinerUClientDependencies>
): Promise<string>;
```

Use the official batch upload flow for precise mode. Do not call `/api/v4/extract/task` after uploading because MinerU starts parsing automatically. Use the official signed-file flow for Agent mode. Treat nonzero API `code`, failed task states, malformed responses, timeouts, and empty Markdown as typed failures.

- [ ] **Step 4: Connect MinerU as an optional router dependency**

In `document-text.cts`, use MinerU only when enabled and preferred. For images, fall back to local OCR after any MinerU failure. For `.docx`, prefer Mammoth and call MinerU only when local extraction fails or is empty. For PDF, legacy Word, PowerPoint, and Excel, return a structured failure if MinerU is disabled or fails.

- [ ] **Step 5: Run focused tests and confirm they pass**

Run: `npm run test:electron -- --test-name-pattern="MinerU|DOCX|document text"`

Expected: PASS.

### Task 3: Integrate Without Turning Errors Into Questions

**Files:**
- Modify: `cram-engine-main/desktop/electron/main.cts`
- Modify: `cram-engine-main/desktop/electron/document-text.test.cjs`
- Modify: `cram-engine-main/desktop/src/components/settings/ProviderSettingsPage.tsx`

- [ ] **Step 1: Add failing routing/error tests**

Assert that:

- a `.docx` success returns real document text and never calls MinerU;
- an image MinerU authentication failure calls OCR and returns OCR text;
- an unsupported binary document returns `{ ok: false }` and its message is not usable as extracted text;
- a MinerU 401 failure contains a direct instruction to update the Token.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test:electron -- --test-name-pattern="document text"`

Expected: FAIL until routing behavior is complete.

- [ ] **Step 3: Replace the inline parser in `main.cts`**

Remove the old `parseWithMinerUAgent()`, `tryParseWithMinerU()`, and binary branch of `extractTextFromFile()`. Call `extractDocumentText()` instead. When it returns `{ ok: false }`, throw an `Error(result.message)` so `previewFileQuestions()` reaches its existing catch path and displays the error rather than calling `parseQuestionDrafts()`.

- [ ] **Step 4: Make settings copy accurate**

Update the document-recognition help text to say Word `.docx` is parsed locally, while MinerU enhances scanned images, PDF, legacy Word, PowerPoint, and Excel. Keep the precise/Agent mode labels aligned with their actual authentication behavior.

- [ ] **Step 5: Run integration-focused tests**

Run: `npm run test:electron -- --test-name-pattern="document text|MinerU|question"`

Expected: PASS and no draft contains `MinerU 暂未返回可用文本`.

### Task 4: Full Verification

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run type checking**

Run: `npm run typecheck`

Expected: both renderer and Electron TypeScript projects pass.

- [ ] **Step 2: Run the full automated suite**

Run: `npm test`

Expected: all Electron, renderer, and settings UI tests pass.

- [ ] **Step 3: Run a production build without packaging**

Run: `npx vite build && npx tsc -p electron/tsconfig.json`

Expected: renderer and Electron outputs build successfully.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check` and `git diff --stat`

Expected: no whitespace errors; only the planned parser, dependency, integration, test, help-copy, and plan files changed.
