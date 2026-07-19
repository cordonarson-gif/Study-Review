import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const settingsDir = dirname(fileURLToPath(import.meta.url));

async function readComponent(name) {
  return readFile(join(settingsDir, `${name}.tsx`), 'utf8');
}

test('ProviderSettingsPage composes the three-column settings workspace', async () => {
  const source = await readComponent('ProviderSettingsPage');

  assert.match(source, /<SettingsCategoryNav\b/);
  assert.match(source, /<ProviderList\b/);
  assert.match(source, /<ProviderDetail\b/);
});

test('settings page exposes MinerU document recognition controls', async () => {
  const page = await readComponent('ProviderSettingsPage');
  const nav = await readComponent('SettingsCategoryNav');

  assert.match(nav, /document/);
  assert.match(nav, /settings\.categoryDocument/);
  assert.match(page, /category === 'document'/);
  assert.match(page, /draft\.mineru/);
  assert.match(page, /preferForUploads/);
  assert.match(page, /apiKey/);
  assert.match(page, /settings\.mineruHelp/);
});

test('settings navigation declares each category once and includes language', async () => {
  const nav = await readComponent('SettingsCategoryNav');

  assert.equal((nav.match(/export type SettingsCategory =/g) ?? []).length, 1);
  assert.equal((nav.match(/export default function SettingsCategoryNav/g) ?? []).length, 1);
  assert.deepEqual(
    [...nav.matchAll(/id: '(services|workspace|document|default|generation|display|language)'/g)].map((match) => match[1]),
    ['services', 'workspace', 'document', 'default', 'generation', 'display', 'language']
  );
});

test('settings page exposes a global workspace governance section', async () => {
  const page = await readComponent('ProviderSettingsPage');
  const nav = await readComponent('SettingsCategoryNav');

  assert.match(nav, /workspace/);
  assert.match(nav, /settings\.categoryWorkspace/);
  assert.match(page, /workspaceOverview/);
  assert.match(page, /workspaceProfile/);
  assert.match(page, /workspaceAgents/);
  assert.doesNotMatch(page, /workspaceGovernance/);
  assert.match(page, /category === 'workspace'/);
  assert.match(page, /settings\.workspaceLearningProfile/);
  assert.match(page, /settings\.workspaceAgentCenter/);
  assert.match(page, /settings\.workspaceLayoutRules/);
});

test('global workspace settings use a dedicated focused layout instead of the service split', async () => {
  const page = await readComponent('ProviderSettingsPage');
  const settingsCss = await readFile(new URL('../../styles/settings.css', import.meta.url), 'utf8');

  assert.match(page, /workspaceSection/);
  assert.match(page, /workspace-settings-shell/);
  assert.match(page, /workspace-hub-tabs/);
  assert.match(page, /workspace-hub-overview/);
  assert.match(page, /category !== 'workspace' && \(/);

  assert.match(settingsCss, /\.workspace-settings-shell\b/);
  assert.match(settingsCss, /grid-template-columns:\s*minmax\(180px,\s*260px\)\s+minmax\(0,\s*1fr\)/);
  assert.match(settingsCss, /\.workspace-hub-panel\b/);
  assert.match(settingsCss, /\.workspace-hub-content\b/);
});

test('App renders AI chat messages as rich markdown instead of raw text', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');
  const layout = await readFile(new URL('../../styles/layout.css', import.meta.url), 'utf8');

  assert.match(app, /function ChatBubble/);
  assert.match(app, /renderRichContent\(content\)/);
  assert.match(app, /className="chat-bubble chat-rich-content"/);
  assert.match(app, /<ChatBubble content=\{msg\.content\} \/>/);
  assert.doesNotMatch(app, /<div className="chat-bubble">\{msg\.content\}<\/div>/);

  assert.match(layout, /\.chat-rich-content\b/);
  assert.match(layout, /\.chat-rich-content strong\b/);
  assert.match(layout, /\.chat-rich-content ul\b/);
});

test('ProviderDetail exposes connection testing and model management', async () => {
  const source = await readComponent('ProviderDetail');
  const models = await readComponent('ModelManager');

  assert.match(source, /testProviderConnection/);
  assert.match(source, /<ModelManager\b/);
  assert.match(source, /settings\.testConnection/);
  assert.match(source, /settings\.electronBridgeMissing/);
  assert.match(models, /settings\.electronBridgeMissing/);
});

test('model visibility controls are reversible and keep disabled rows recoverable', async () => {
  const models = await readComponent('ModelManager');

  assert.match(models, /function setModelEnabled\(id: string, enabled: boolean\)/);
  assert.match(models, /setModelEnabled\(model\.id, event\.target\.checked\)/);
  assert.match(models, /setModelEnabled\(model\.id, !model\.enabled\)/);
  assert.match(models, /model\.enabled \? t\('settings\.hideModel'\) : t\('settings\.showModel'\)/);
  assert.match(models, /model-row hidden/);
});

test('settings switches contain checkbox focus within the scrolled panel', async () => {
  const settingsCss = await readFile(new URL('../../styles/settings.css', import.meta.url), 'utf8');

  assert.match(settingsCss, /\.settings-switch\s*\{[^}]*position:\s*relative/);
  assert.match(settingsCss, /\.settings-switch input\s*\{[^}]*position:\s*absolute/);
});

test('default model settings expose an explicit empty selection', async () => {
  const page = await readComponent('ProviderSettingsPage');

  assert.match(page, /const selectedDefaultModelValue = useMemo/);
  assert.match(page, /value=\{selectedDefaultModelValue\}/);
  assert.match(page, /<option value="" disabled=\{selectableModels\.length > 0\}>\{t\('settings\.noDefaultModel'\)\}<\/option>/);
  assert.match(page, /settings\.noSelectableModels/);
});

test('application and settings layout establish bounded scroll containers', async () => {
  const baseCss = await readFile(new URL('../../styles/base.css', import.meta.url), 'utf8');
  const layoutCss = await readFile(new URL('../../styles/layout.css', import.meta.url), 'utf8');
  const settingsCss = await readFile(new URL('../../styles/settings.css', import.meta.url), 'utf8');

  assert.match(baseCss, /html,\s*body,\s*#root\s*\{[\s\S]*?height:\s*100%/);
  assert.match(baseCss, /html,\s*body,\s*#root\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(layoutCss, /\.shell\s*\{[\s\S]*?height:\s*100%/);
  assert.match(layoutCss, /\.app-body[\s\S]*?min-height:\s*0/);
  assert.match(layoutCss, /\.main[\s\S]*?min-height:\s*0/);
  assert.match(layoutCss, /\.main-scroll[\s\S]*?min-height:\s*0/);
  assert.match(settingsCss, /\.provider-settings-shell\s*\{[\s\S]*?height:\s*clamp\(520px,\s*calc\(100dvh - 250px\),\s*760px\)/);
  assert.match(settingsCss, /\.settings-category-nav,[\s\S]*?\.provider-detail-panel\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(settingsCss, /overscroll-behavior:\s*contain/);
  assert.match(baseCss, /@media \(max-width: 1180px\)[\s\S]*?body\s*\{[\s\S]*?min-width:\s*0/);
});

test('App mounts ProviderSettingsPage instead of the flat settings form', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /<ProviderSettingsPage\b/);
  assert.doesNotMatch(app, /showAddProvider/);
  assert.doesNotMatch(app, /settings:fetchModels/);
  assert.match(app, /t\('settings\.title'\)/);
  assert.match(app, /t\('app\.settingsDesc'\)/);

  const providerPageIndex = app.indexOf('<ProviderSettingsPage');
  const settingsHeader = app.slice(Math.max(0, providerPageIndex - 320), providerPageIndex);
  assert.doesNotMatch(settingsHeader, />\?\?</);
  assert.doesNotMatch(settingsHeader, /\?{6,}/);
});

test('App shows a configured LaTeX status when an installed distribution is detected', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /workspace\.latexConfigured/);
  assert.match(app, /latexStatus\.distribution/);
});

test('App status card uses the configured provider instead of only the selected provider', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /findConfiguredProvider/);
  assert.match(app, /configuredProvider/);
  assert.match(app, /workspace\.apiKeyMissing/);
});
