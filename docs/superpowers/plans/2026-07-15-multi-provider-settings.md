# Multi-Provider Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a Cherry Studio-inspired three-column settings workspace with persistent multi-provider profiles, draft-aware checks and model synchronization, and safe model selection throughout Cram Engine.

**Architecture:** Replace the flat settings shape with normalized ProviderProfile records inside a version-2 settings document. Electron modules perform migration, persistence, request construction, and IPC; pure renderer helpers own filtering and model-state transitions; focused React components compose the three-column screen inside the existing app shell.

**Tech Stack:** Electron 36, React 19, TypeScript 5.8, Vite 7, Node built-in test runner, existing CSS custom properties.

---

## File Map

- Create: cram-engine-main/desktop/electron/settings-schema.cts
- Create: cram-engine-main/desktop/electron/settings-schema.test.cjs
- Create: cram-engine-main/desktop/src/lib/providerSettings.js
- Create: cram-engine-main/desktop/src/lib/providerSettings.d.ts
- Create: cram-engine-main/desktop/src/lib/providerSettings.test.mjs
- Create: cram-engine-main/desktop/src/components/settings/ProviderSettingsPage.tsx
- Create: cram-engine-main/desktop/src/components/settings/SettingsCategoryNav.tsx
- Create: cram-engine-main/desktop/src/components/settings/ProviderList.tsx
- Create: cram-engine-main/desktop/src/components/settings/ProviderDetail.tsx
- Create: cram-engine-main/desktop/src/components/settings/ModelManager.tsx
- Create: cram-engine-main/desktop/src/components/settings/settings-layout.test.mjs
- Create: cram-engine-main/desktop/src/styles/settings.css
- Modify: cram-engine-main/desktop/electron/provider-api.cts
- Modify: cram-engine-main/desktop/electron/provider-api.test.cjs
- Modify: cram-engine-main/desktop/electron/main.cts
- Modify: cram-engine-main/desktop/electron/preload.cts
- Modify: cram-engine-main/desktop/src/global.d.ts
- Modify: cram-engine-main/desktop/src/lib/types.ts
- Modify: cram-engine-main/desktop/src/lib/utils.ts
- Modify: cram-engine-main/desktop/src/app/App.tsx
- Modify: cram-engine-main/desktop/src/styles.css
- Modify: cram-engine-main/desktop/package.json
- Modify: .gitignore

### Task 1: Settings Schema and Legacy Migration

**Files:**
- Create: cram-engine-main/desktop/electron/settings-schema.cts
- Create: cram-engine-main/desktop/electron/settings-schema.test.cjs
- Modify: cram-engine-main/desktop/package.json

- [ ] **Step 1: Write the failing migration test**

Create electron/settings-schema.test.cjs:

~~~js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const schemaUrl = pathToFileURL(path.join(__dirname, '..', 'dist-electron', 'settings-schema.cjs')).href;

test('migrateSettings preserves a legacy API profile and selected model', async () => {
  const { migrateSettings } = await import(schemaUrl);
  const settings = migrateSettings({
    provider: 'openai-compatible',
    baseUrl: 'https://example.test/v1',
    apiKey: 'sk-legacy',
    model: 'legacy-model',
    temperature: 0.7,
    maxTokens: 2048,
    latexEngine: 'xelatex',
    enableLatexPreview: false,
    lastModelSyncAt: '2026-07-15T00:00:00.000Z',
    availableModels: [
      { id: 'legacy-model', label: 'Legacy', provider: 'openai-compatible', source: 'fetched' },
      { id: 'manual-model', label: 'Manual', provider: 'openai-compatible', source: 'custom' }
    ]
  });

  assert.equal(settings.version, 2);
  assert.equal(settings.providers.length, 1);
  assert.equal(settings.providers[0].apiKey, 'sk-legacy');
  assert.equal(settings.providers[0].baseUrl, 'https://example.test/v1');
  assert.equal(settings.providers[0].selectedModelId, 'legacy-model');
  assert.equal(settings.providers[0].models.find((model) => model.id === 'manual-model').source, 'custom');
  assert.equal(settings.temperature, 0.7);
  assert.equal(settings.enableLatexPreview, false);
});

test('normalizeSettings selects an enabled profile and visible model', async () => {
  const { normalizeSettings } = await import(schemaUrl);
  const settings = normalizeSettings({
    version: 2, activeProviderId: 'disabled', temperature: 0.2, maxTokens: 4096,
    latexEngine: 'xelatex', enableLatexPreview: true, lastModelSyncAt: null,
    providers: [
      { id: 'disabled', label: 'Disabled', provider: 'openai-compatible', baseUrl: 'https://a.test/v1', apiKey: '', enabled: false, isCustom: false, selectedModelId: 'old', models: [{ id: 'old', label: 'Old', source: 'preset', enabled: true }] },
      { id: 'enabled', label: 'Enabled', provider: 'anthropic', baseUrl: 'https://b.test', apiKey: '', enabled: true, isCustom: false, selectedModelId: 'hidden', models: [{ id: 'hidden', label: 'Hidden', source: 'preset', enabled: false }, { id: 'shown', label: 'Shown', source: 'preset', enabled: true }] }
    ]
  });

  assert.equal(settings.activeProviderId, 'enabled');
  assert.equal(settings.providers[1].selectedModelId, 'shown');
});
~~~

- [ ] **Step 2: Run the test and verify it fails because the compiled module is absent**

Run:

~~~powershell
npm run test:electron -- electron/settings-schema.test.cjs
~~~

Expected: module-not-found error for dist-electron/settings-schema.cjs.

- [ ] **Step 3: Implement the schema**

Create electron/settings-schema.cts with these exports:

~~~ts
export type ProviderKind = 'anthropic' | 'openai-compatible' | 'aliyun';
export type ManagedModelSource = 'preset' | 'fetched' | 'custom';
export type ManagedModel = { id: string; label: string; source: ManagedModelSource; enabled: boolean };
export type ProviderProfile = {
  id: string; label: string; provider: ProviderKind; baseUrl: string; apiKey: string;
  enabled: boolean; isCustom: boolean; selectedModelId: string; models: ManagedModel[];
};
export type AppSettings = {
  version: 2; activeProviderId: string; providers: ProviderProfile[];
  temperature: number; maxTokens: number; latexEngine: 'xelatex' | 'pdflatex';
  enableLatexPreview: boolean; lastModelSyncAt: string | null;
};

export function createDefaultSettings(): AppSettings;
export function migrateSettings(input: unknown): AppSettings;
export function normalizeSettings(input: AppSettings): AppSettings;
export function normalizeProviderProfile(profile: ProviderProfile): ProviderProfile;
export function getActiveProvider(settings: AppSettings): ProviderProfile;
export function getEnabledModels(profile: ProviderProfile): ManagedModel[];
~~~

Migration must be idempotent. Version-1 data becomes one enabled profile using legacy provider, URL, key, selected model, and model list. Legacy models become enabled and preserve custom source. Normalization must deduplicate IDs, retain custom models, replace disabled active profiles, and select the first enabled model when the selected model is hidden or missing.
normalizeProviderProfile performs the same model deduplication and selected-model fallback for a single profile returned by a draft model fetch.

- [ ] **Step 4: Add the test scripts**

Update package.json:

~~~json
"test:electron": "tsc -p electron/tsconfig.json && node --test electron/*.test.cjs",
"test:renderer": "node --test src/lib/*.test.mjs",
"test": "npm run test:electron && npm run test:renderer"
~~~

- [ ] **Step 5: Verify the schema**

Run:

~~~powershell
npm run test:electron -- electron/settings-schema.test.cjs
~~~

Expected: both tests pass after Electron TypeScript compilation.

- [ ] **Step 6: Commit the schema unit**

~~~powershell
git add cram-engine-main/desktop/electron/settings-schema.cts cram-engine-main/desktop/electron/settings-schema.test.cjs cram-engine-main/desktop/package.json
git commit -m "feat: add versioned provider settings schema"
~~~

### Task 2: Draft Provider Checks and Model Merge

**Files:**
- Modify: cram-engine-main/desktop/electron/provider-api.cts
- Modify: cram-engine-main/desktop/electron/provider-api.test.cjs

- [ ] **Step 1: Write failing provider-result tests**

Append to provider-api.test.cjs:

~~~js
test('classifyProviderResponse distinguishes authentication and endpoint errors', async () => {
  const { classifyProviderResponse } = await loadProviderApi();
  assert.deepEqual(classifyProviderResponse({ ok: false, status: 401, statusText: 'Unauthorized' }), {
    ok: false, kind: 'authentication', message: 'API Key 无效或没有访问权限', status: 401
  });
  assert.deepEqual(classifyProviderResponse({ ok: false, status: 404, statusText: 'Not Found' }), {
    ok: false, kind: 'endpoint', message: 'API 地址或模型列表路径不可用', status: 404
  });
});

test('mergeManagedModels preserves custom and hidden local state', async () => {
  const { mergeManagedModels } = await loadProviderApi();
  const models = mergeManagedModels(
    [{ id: 'kept', label: 'Kept', source: 'fetched', enabled: false }, { id: 'manual', label: 'Manual', source: 'custom', enabled: true }],
    [{ id: 'kept', label: 'Kept from API' }, { id: 'new', label: 'New from API' }]
  );

  assert.equal(models.find((model) => model.id === 'kept').enabled, false);
  assert.equal(models.find((model) => model.id === 'manual').source, 'custom');
  assert.equal(models.find((model) => model.id === 'new').source, 'fetched');
});
~~~

- [ ] **Step 2: Run the test and verify it fails because the new exports do not exist**

Run:

~~~powershell
npm run test:electron -- electron/provider-api.test.cjs
~~~

Expected: failures state that classifyProviderResponse and mergeManagedModels are not functions.

- [ ] **Step 3: Implement provider result helpers**

Add these exports to provider-api.cts:

~~~ts
export type ConnectionCheckResult =
  | { ok: true; message: string; status: number }
  | { ok: false; kind: 'credentials' | 'authentication' | 'endpoint' | 'network' | 'service'; message: string; status?: number };

export function classifyProviderResponse(response: Pick<Response, 'ok' | 'status' | 'statusText'>): ConnectionCheckResult;
export function classifyProviderError(error: unknown): ConnectionCheckResult;
export function mergeManagedModels(
  existing: Array<{ id: string; label: string; source: 'preset' | 'fetched' | 'custom'; enabled: boolean }>,
  fetched: Array<{ id: string; label?: string }>
): Array<{ id: string; label: string; source: 'preset' | 'fetched' | 'custom'; enabled: boolean }>;
~~~

Map 401/403 to authentication, 404 to endpoint, other non-2xx response to service, and thrown network errors to network. Preserve matching model enabled state and custom records. Add fetched records as enabled with label fallback to ID. Keep existing Anthropic/bearer request construction unchanged.

- [ ] **Step 4: Verify provider API behavior**

Run:

~~~powershell
npm run test:electron -- electron/provider-api.test.cjs
~~~

Expected: old request tests and new response/merge tests all pass.

- [ ] **Step 5: Commit the provider helper unit**

~~~powershell
git add cram-engine-main/desktop/electron/provider-api.cts cram-engine-main/desktop/electron/provider-api.test.cjs
git commit -m "feat: support provider connection checks and model merges"
~~~

### Task 3: Electron Persistence and Profile IPC

**Files:**
- Modify: cram-engine-main/desktop/electron/main.cts
- Modify: cram-engine-main/desktop/electron/preload.cts
- Modify: cram-engine-main/desktop/src/global.d.ts
- Modify: cram-engine-main/desktop/electron/startup.test.cjs

- [ ] **Step 1: Write a failing IPC contract test**

Append to startup.test.cjs:

~~~js
test('main process exposes draft provider settings handlers', () => {
  const source = readMainSource();
  assert.match(source, /ipcMain\.handle\('settings:testProvider'/);
  assert.match(source, /ipcMain\.handle\('settings:fetchProviderModels'/);
});
~~~

- [ ] **Step 2: Run Electron tests and verify the contract fails**

Run:

~~~powershell
npm run test:electron
~~~

Expected: the new test fails because the handlers are absent.

- [ ] **Step 3: Replace flat settings use in the main process**

Import the schema and provider-result helpers. Make loadSettings migrate then normalize input; make saveSettings normalize version-2 data before writing. Delete flat AppSettings/defaultModels declarations from main.cts.

Add functions:

~~~ts
async function testProviderConnection(profile: ProviderProfile): Promise<ConnectionCheckResult> {
  if (!profile.baseUrl.trim() || !profile.apiKey.trim()) {
    return { ok: false, kind: 'credentials', message: '请填写 API 地址和 API Key' };
  }
  try {
    const request = buildModelsRequest(profile);
    const response = await fetch(request.url, { headers: request.headers });
    return classifyProviderResponse(response);
  } catch (error) {
    return classifyProviderError(error);
  }
}

async function fetchProviderModels(profile: ProviderProfile): Promise<ProviderProfile> {
  const check = await testProviderConnection(profile);
  if (!check.ok) throw new Error(check.message);
  const request = buildModelsRequest(profile);
  const response = await fetch(request.url, { headers: request.headers });
  const payload = await response.json();
  return normalizeProviderProfile({
    ...profile,
    models: mergeManagedModels(profile.models, parseModelsResponse(profile.provider, payload))
  });
}
~~~

Register:

~~~ts
ipcMain.handle('settings:testProvider', (_event, profile: ProviderProfile) => testProviderConnection(profile));
ipcMain.handle('settings:fetchProviderModels', (_event, profile: ProviderProfile) => fetchProviderModels(profile));
~~~

Resolve project chat and new-project choices through getActiveProvider(settings) and profile.selectedModelId. Existing project metadata stays readable even after a model is hidden.

- [ ] **Step 4: Expose and type the bridge**

In preload.cts replace the old fetchModels bridge with:

~~~ts
testProviderConnection: (profile: unknown) => ipcRenderer.invoke('settings:testProvider', profile),
fetchProviderModels: (profile: unknown) => ipcRenderer.invoke('settings:fetchProviderModels', profile),
~~~

Update global.d.ts for AppSettings, ProviderProfile, ManagedModel, ConnectionCheckResult, and the two bridge return types.

- [ ] **Step 5: Verify the main process unit**

Run:

~~~powershell
npm run typecheck
npm run test:electron
~~~

Expected: zero TypeScript errors and all migration/provider/IPC tests pass.

- [ ] **Step 6: Commit the IPC unit**

~~~powershell
git add cram-engine-main/desktop/electron/main.cts cram-engine-main/desktop/electron/preload.cts cram-engine-main/desktop/src/global.d.ts cram-engine-main/desktop/electron/startup.test.cjs
git commit -m "feat: persist provider profiles through Electron IPC"
~~~

### Task 4: Tested Renderer Profile Helpers

**Files:**
- Create: cram-engine-main/desktop/src/lib/providerSettings.js
- Create: cram-engine-main/desktop/src/lib/providerSettings.d.ts
- Create: cram-engine-main/desktop/src/lib/providerSettings.test.mjs
- Modify: cram-engine-main/desktop/src/lib/types.ts
- Modify: cram-engine-main/desktop/src/lib/utils.ts

- [ ] **Step 1: Write failing renderer tests**

Create providerSettings.test.mjs:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProviders, getSelectableModels, hideOrShowModel, removeCustomModel } from './providerSettings.js';

const providers = [
  { id: 'openai', label: 'OpenAI', enabled: true, models: [{ id: 'gpt', label: 'GPT', enabled: true, source: 'preset' }, { id: 'hidden', label: 'Hidden', enabled: false, source: 'fetched' }] },
  { id: 'deepseek', label: 'DeepSeek', enabled: false, models: [{ id: 'deepseek-chat', label: 'DeepSeek Chat', enabled: true, source: 'custom' }] }
];

test('filterProviders keeps source order', () => {
  assert.deepEqual(filterProviders(providers, 'seek').map((provider) => provider.id), ['deepseek']);
});

test('getSelectableModels excludes disabled profiles and hidden models', () => {
  assert.deepEqual(getSelectableModels(providers), [{ providerId: 'openai', id: 'gpt', label: 'GPT' }]);
});

test('hideOrShowModel clears a selected model without a visible fallback', () => {
  const profile = { ...providers[0], selectedModelId: 'gpt', models: [...providers[0].models] };
  const next = hideOrShowModel(profile, 'gpt', false);
  assert.equal(next.models.find((model) => model.id === 'gpt').enabled, false);
  assert.equal(next.selectedModelId, '');
});

test('removeCustomModel refuses to remove a non-custom model', () => {
  assert.equal(removeCustomModel(providers[0], 'gpt').models.length, 2);
  assert.equal(removeCustomModel(providers[1], 'deepseek-chat').models.length, 0);
});
~~~

- [ ] **Step 2: Run the test and verify it fails**

Run:

~~~powershell
npm run test:renderer -- src/lib/providerSettings.test.mjs
~~~

Expected: Node cannot resolve providerSettings.js.

- [ ] **Step 3: Implement renderer-safe helpers**

Implement providerSettings.js with no React/Electron imports and export filterProviders, getSelectableModels, hideOrShowModel, removeCustomModel, addCustomModel, and replaceProvider. Hiding the selected model chooses the first enabled fallback or empty string. Removing preset/fetched models must do nothing; custom model removal removes the matching record. getSelectableModels emits only enabled profile/model pairs.

Create matching declarations in providerSettings.d.ts. Move renderer-facing profile, model, connection-result, and AppSettings types to types.ts. Replace the flat provider default resolver in utils.ts with profile-aware selectors.

- [ ] **Step 4: Verify renderer helpers**

Run:

~~~powershell
npm run test:renderer
npm run typecheck
~~~

Expected: all renderer behavior tests pass and both TypeScript projects are clean.

- [ ] **Step 5: Commit the renderer helper unit**

~~~powershell
git add cram-engine-main/desktop/src/lib/providerSettings.js cram-engine-main/desktop/src/lib/providerSettings.d.ts cram-engine-main/desktop/src/lib/providerSettings.test.mjs cram-engine-main/desktop/src/lib/types.ts cram-engine-main/desktop/src/lib/utils.ts
git commit -m "feat: add provider profile renderer helpers"
~~~

### Task 5: Three-Column Settings UI

**Files:**
- Create: cram-engine-main/desktop/src/components/settings/ProviderSettingsPage.tsx
- Create: cram-engine-main/desktop/src/components/settings/SettingsCategoryNav.tsx
- Create: cram-engine-main/desktop/src/components/settings/ProviderList.tsx
- Create: cram-engine-main/desktop/src/components/settings/ProviderDetail.tsx
- Create: cram-engine-main/desktop/src/components/settings/ModelManager.tsx
- Create: cram-engine-main/desktop/src/components/settings/settings-layout.test.mjs
- Create: cram-engine-main/desktop/src/styles/settings.css
- Modify: cram-engine-main/desktop/src/styles.css
- Modify: cram-engine-main/desktop/package.json

- [ ] **Step 1: Write the failing layout contract**

Create settings-layout.test.mjs:

~~~js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('provider settings page composes three columns', async () => {
  const page = await readFile(new URL('./ProviderSettingsPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /SettingsCategoryNav/);
  assert.match(page, /ProviderList/);
  assert.match(page, /ProviderDetail/);
});

test('provider detail has draft testing and model controls', async () => {
  const detail = await readFile(new URL('./ProviderDetail.tsx', import.meta.url), 'utf8');
  assert.match(detail, /testProviderConnection/);
  assert.match(detail, /ModelManager/);
  assert.match(detail, /检测连接/);
});
~~~

Add this script and include it in the aggregate test script:

~~~json
"test:settings-ui": "node --test src/components/settings/*.test.mjs"
~~~

- [ ] **Step 2: Run the test and verify it fails**

Run:

~~~powershell
npm run test:settings-ui
~~~

Expected: missing component-file errors.

- [ ] **Step 3: Implement focused components**

ProviderSettingsPage owns a cloned AppSettings draft, selected category, selected provider, dirty state, and save/discard busy state. Switching provider rows never discards a draft.

SettingsCategoryNav renders Model services, Default model, Generation, and Display. ProviderList filters labels and opens an accessible add dialog requiring label, protocol, and endpoint. Built-ins can be disabled but not removed. Custom profiles can be removed after confirmation.

ProviderDetail renders provider enabled state, masked key with show/hide button, endpoint reset, endpoint preview, inline validation, and draft connection testing:

~~~tsx
<button type="button" onClick={handleTest} disabled={checking}>
  {checking ? '检测中…' : '检测连接'}
</button>
<input type={keyVisible ? 'text' : 'password'} value={profile.apiKey} onChange={handleKeyChange} />
<button type="button" aria-label="显示或隐藏 API Key" onClick={() => setKeyVisible((value) => !value)} />
~~~

Connection success uses role=status. Errors use role=alert. ModelManager calls fetchProviderModels with the current draft, offers 获取模型列表 and 手动添加模型, supports visibility and deletion, rejects blank/duplicate model IDs, hides preset/fetched records on removal, and truly deletes custom records.

- [ ] **Step 4: Implement responsive styles**

Create settings.css with a three-column grid:

~~~css
.provider-settings-shell {
  display: grid;
  grid-template-columns: minmax(168px, .78fr) minmax(238px, 1.05fr) minmax(420px, 2.4fr);
  min-height: 620px;
}
@media (max-width: 980px) {
  .provider-settings-shell { grid-template-columns: 1fr; }
}
~~~

Use the existing neutral and violet tokens, 1px dividers, 6px control radii, visible focus rings, and 200ms interaction transitions. Do not include Cherry Studio brand assets, colors, or source code. Import the stylesheet from styles.css.

- [ ] **Step 5: Verify the UI unit**

Run:

~~~powershell
npm run test:settings-ui
npm run test:renderer
npm run typecheck
~~~

Expected: component contracts, state helpers, and TypeScript checks all pass.

- [ ] **Step 6: Commit the UI unit**

~~~powershell
git add cram-engine-main/desktop/src/components/settings cram-engine-main/desktop/src/styles/settings.css cram-engine-main/desktop/src/styles.css cram-engine-main/desktop/package.json
git commit -m "feat: add three-column provider settings workspace"
~~~

### Task 6: Application Integration and Final Verification

**Files:**
- Modify: cram-engine-main/desktop/src/app/App.tsx
- Modify: cram-engine-main/desktop/src/components/settings/settings-layout.test.mjs
- Modify: .gitignore

- [ ] **Step 1: Add a failing App mount contract**

Append:

~~~js
test('App mounts ProviderSettingsPage instead of the flat settings form', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  assert.match(app, /<ProviderSettingsPage/);
  assert.doesNotMatch(app, /showAddProvider/);
  assert.doesNotMatch(app, /settings:fetchModels/);
});
~~~

- [ ] **Step 2: Run the test and verify it fails on the old panel**

Run:

~~~powershell
npm run test:settings-ui
~~~

Expected: the mount assertion fails because App.tsx still has flat settings state.

- [ ] **Step 3: Mount the new page and update all selectors**

Remove the old settings JSX plus showAddProvider, newProviderForm, applyNewProviderSettings, and direct fetchModels state. Render:

~~~tsx
<ProviderSettingsPage
  initialSettings={settings}
  onSave={async (nextSettings) => {
    const saved = await ce.saveSettings(nextSettings);
    setSettings(saved);
    setStatus('全局设置已保存');
    return saved;
  }}
  onDiscard={async () => {
    const reloaded = await ce.getSettings();
    setSettings(reloaded);
    return reloaded;
  }}
/>
~~~

Derive footer labels, wizard provider/model lists, workspace options, and status from getSelectableModels(settings.providers) plus activeProviderId. A missing key displays 未配置 API and is not reported as connected. Existing project metadata is never rewritten; a hidden current-project model appears only in that selector with label 当前项目模型（已隐藏）.

- [ ] **Step 4: Ignore visual artifacts**

Append this root .gitignore entry:

~~~gitignore
.superpowers/
~~~

- [ ] **Step 5: Run automated production verification**

Run:

~~~powershell
npm test
npm run typecheck
npm run build
~~~

Expected: each command exits 0 and build creates the unpacked Windows release.

- [ ] **Step 6: Run desktop smoke verification**

Run:

~~~powershell
npm run dev
~~~

Verify:

1. Model services renders three columns at desktop width and stacks below 980px without overlap.
2. Existing configuration migrates with API URL, masked key, model, temperature, and LaTex preference intact.
3. A custom provider can be added, edited, disabled, saved, then restored after restart.
4. Connection testing reports missing inputs and a live service result from draft values without saving.
5. Model fetch uses draft credentials, preserves a manual model, and preserves hidden state.
6. Removing/hiding a selected model chooses a safe fallback; project creation lists enabled models only while an existing project model remains readable.
7. Discard reloads persisted values; save writes profiles and generation values; errors stay inline.

- [ ] **Step 7: Inspect and commit integration**

Run:

~~~powershell
git diff --check
git status --short
git add cram-engine-main/desktop/src/app/App.tsx cram-engine-main/desktop/src/components/settings/settings-layout.test.mjs .gitignore
git commit -m "feat: integrate multi-provider settings"
~~~

Expected: no whitespace errors and .superpowers is ignored.
