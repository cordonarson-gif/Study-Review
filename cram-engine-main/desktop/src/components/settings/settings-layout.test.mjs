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
  assert.match(nav, /MinerU/);
  assert.match(page, /category === 'document'/);
  assert.match(page, /draft\.mineru/);
  assert.match(page, /preferForUploads/);
  assert.match(page, /apiKey/);
});

test('settings page exposes a global workspace governance section', async () => {
  const page = await readComponent('ProviderSettingsPage');
  const nav = await readComponent('SettingsCategoryNav');

  assert.match(nav, /workspace/);
  assert.match(nav, /全局能力/);
  assert.match(page, /workspaceOverview/);
  assert.match(page, /workspaceProfile/);
  assert.match(page, /workspaceAgents/);
  assert.doesNotMatch(page, /workspaceGovernance/);
  assert.match(page, /category === 'workspace'/);
  assert.match(page, /全局学习画像/);
  assert.match(page, /智能体中心/);
  assert.match(page, /项目页布局规则/);
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
  assert.match(source, /测试连接/);
  assert.match(source, /Electron 桥接未加载/);
  assert.match(models, /Electron 桥接未加载/);
});

test('App mounts ProviderSettingsPage instead of the flat settings form', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /<ProviderSettingsPage\b/);
  assert.doesNotMatch(app, /showAddProvider/);
  assert.doesNotMatch(app, /settings:fetchModels/);
  assert.match(app, />设置</);
  assert.match(app, /配置模型服务、默认模型和生成偏好。/);

  const providerPageIndex = app.indexOf('<ProviderSettingsPage');
  const settingsHeader = app.slice(Math.max(0, providerPageIndex - 320), providerPageIndex);
  assert.doesNotMatch(settingsHeader, />\?\?</);
  assert.doesNotMatch(settingsHeader, /\?{6,}/);
});

test('App shows a configured LaTeX status when an installed distribution is detected', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /配置成功/);
  assert.match(app, /latexStatus\.distribution/);
});

test('App status card uses the configured provider instead of only the selected provider', async () => {
  const app = await readFile(new URL('../../app/App.tsx', import.meta.url), 'utf8');

  assert.match(app, /findConfiguredProvider/);
  assert.match(app, /configuredProvider/);
  assert.match(app, /API Key 未填写/);
});
