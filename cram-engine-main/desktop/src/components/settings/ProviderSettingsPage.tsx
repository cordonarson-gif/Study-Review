import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings, ProviderProfile } from '../../lib/types';
import { getSelectableModels, replaceProvider } from '../../lib/providerSettings.js';
import { getActiveProviderProfile } from '../../lib/utils';
import ProviderDetail from './ProviderDetail';
import ProviderList from './ProviderList';
import SettingsCategoryNav, { type SettingsCategory } from './SettingsCategoryNav';

type ProviderSettingsPageProps = {
  initialSettings: AppSettings;
  onSave: (settings: AppSettings) => Promise<AppSettings>;
  onDiscard: () => Promise<AppSettings>;
  workspaceOverview?: ReactNode;
  workspaceProfile?: ReactNode;
  workspaceAgents?: ReactNode;
};

function cloneSettings(settings: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(settings)) as AppSettings;
}

function settingsChanged(left: AppSettings, right: AppSettings) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

type WorkspaceSection = 'overview' | 'profile' | 'agents';

const workspaceSections: Array<{
  id: WorkspaceSection;
  label: string;
  description: string;
}> = [
  { id: 'overview', label: '总览', description: '先看当前项目与全局能力状态' },
  { id: 'profile', label: '学习画像', description: '维护长期用户画像和偏好' },
  { id: 'agents', label: '智能体中心', description: '查看全局智能体协作链路' }
];

export default function ProviderSettingsPage({
  initialSettings,
  onSave,
  onDiscard,
  workspaceOverview,
  workspaceProfile,
  workspaceAgents
}: ProviderSettingsPageProps) {
  const [draft, setDraft] = useState(() => cloneSettings(initialSettings));
  const [baseline, setBaseline] = useState(() => cloneSettings(initialSettings));
  const [category, setCategory] = useState<SettingsCategory>('services');
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('overview');
  const [selectedProviderId, setSelectedProviderId] = useState(initialSettings.activeProviderId);
  const [busy, setBusy] = useState<'save' | 'discard' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(cloneSettings(initialSettings));
    setBaseline(cloneSettings(initialSettings));
    setSelectedProviderId(initialSettings.activeProviderId);
  }, [initialSettings]);

  const selectedProvider = useMemo(() => (
    draft.providers.find((profile) => profile.id === selectedProviderId)
    ?? getActiveProviderProfile(draft)
  ), [draft, selectedProviderId]);
  const selectableModels = useMemo(() => getSelectableModels(draft.providers), [draft.providers]);
  const enabledProviderCount = useMemo(() => draft.providers.filter((profile) => profile.enabled).length, [draft.providers]);
  const dirty = useMemo(() => settingsChanged(draft, baseline), [draft, baseline]);
  const scopeSummary = {
    workspace: ['全局能力', '把用户画像、智能体编排和布局规则集中管理。'],
    document: ['文档识别', '配置 MinerU 与上传文件解析策略。'],
    default: ['默认模型', '设置新项目默认使用的服务商与模型。'],
    generation: ['生成参数', '控制温度、最大输出长度等生成偏好。'],
    display: ['显示偏好', '配置 LaTeX 预览和文档显示体验。'],
    services: ['模型服务', '管理服务商、密钥、端点与模型列表。']
  } satisfies Record<SettingsCategory, [string, string]>;

  function updateProvider(profile: ProviderProfile) {
    setDraft((current) => ({
      ...current,
      activeProviderId: current.activeProviderId || profile.id,
      providers: replaceProvider(current.providers, profile) as ProviderProfile[]
    }));
  }

  function addProvider(profile: ProviderProfile) {
    setDraft((current) => ({
      ...current,
      activeProviderId: profile.id,
      providers: [...current.providers, profile]
    }));
  }

  function removeProvider(providerId: string) {
    setDraft((current) => {
      const providers = current.providers.filter((profile) => profile.id !== providerId);
      const activeProviderId = current.activeProviderId === providerId
        ? (providers.find((profile) => profile.enabled)?.id ?? providers[0]?.id ?? '')
        : current.activeProviderId;
      return { ...current, activeProviderId, providers };
    });
  }

  function toggleProvider(providerId: string, enabled: boolean) {
    setDraft((current) => {
      const providers = current.providers.map((profile) => profile.id === providerId ? { ...profile, enabled } : profile);
      const activeProviderId = providers.some((profile) => profile.id === current.activeProviderId && profile.enabled)
        ? current.activeProviderId
        : (providers.find((profile) => profile.enabled)?.id ?? providers[0]?.id ?? '');
      return { ...current, activeProviderId, providers };
    });
  }

  function updateMinerU(patch: Partial<AppSettings['mineru']>) {
    setDraft((current) => ({
      ...current,
      mineru: {
        ...current.mineru,
        ...patch
      }
    }));
  }

  async function saveDraft() {
    setBusy('save');
    setError('');
    try {
      const saved = await onSave(draft);
      setDraft(cloneSettings(saved));
      setBaseline(cloneSettings(saved));
      setMessage('已保存所有更改');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    } finally {
      setBusy(null);
    }
  }

  async function discardDraft() {
    setBusy('discard');
    setError('');
    try {
      const reloaded = await onDiscard();
      setDraft(cloneSettings(reloaded));
      setBaseline(cloneSettings(reloaded));
      setSelectedProviderId(reloaded.activeProviderId);
      setMessage('已放弃未保存更改');
    } catch (discardError) {
      setError(discardError instanceof Error ? discardError.message : '放弃更改失败');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="provider-settings-page">
      <div className={category === 'workspace' ? 'provider-settings-shell workspace-settings-shell' : 'provider-settings-shell'}>
        <SettingsCategoryNav activeCategory={category} onSelectCategory={setCategory} />
        {category === 'services' && (
          <ProviderList
            providers={draft.providers}
            selectedProviderId={selectedProvider.id}
            onSelectProvider={setSelectedProviderId}
            onAddProvider={addProvider}
            onRemoveProvider={removeProvider}
            onToggleProvider={toggleProvider}
          />
        )}
        {category !== 'services' && category !== 'workspace' && (
          <aside className="provider-list-panel settings-scope-panel">
            <div className="settings-column-heading">
              <span>Scope</span>
              <strong>{scopeSummary[category][0]}</strong>
              <small>{scopeSummary[category][1]}</small>
            </div>
            <div className="settings-scope-card">
              <strong>当前配置状态</strong>
              <span>{dirty ? '有未保存更改' : '所有更改已保存'}</span>
            </div>
            <div className="settings-scope-card">
              <strong>启用服务商</strong>
              <span>{enabledProviderCount} 个</span>
            </div>
          </aside>
        )}
        {category === 'services' && (
          <ProviderDetail
            profile={selectedProvider}
            onChange={updateProvider}
            canDisableProvider={!selectedProvider.enabled || enabledProviderCount > 1}
          />
        )}
        {category === 'workspace' && (
          <section className="provider-detail-panel global-workspace-settings workspace-hub-panel">
            <div className="workspace-hub-header">
              <div>
                <span>Workspace governance</span>
                <h2>全局能力工作台</h2>
                <p>
                  用户画像、智能体编排和系统级布局规则集中放在这里；项目工作台只保留资料、资源、路径、刷题、报告和交付动作。
                </p>
              </div>
              <div className="workspace-hub-status">
                <strong>{enabledProviderCount}</strong>
                <span>启用服务商</span>
              </div>
            </div>

            <nav className="workspace-hub-tabs" aria-label="全局能力设置分区">
              {workspaceSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={workspaceSection === section.id ? 'active' : ''}
                  onClick={() => setWorkspaceSection(section.id)}
                >
                  <strong>{section.label}</strong>
                  <span>{section.description}</span>
                </button>
              ))}
            </nav>

            <div className="workspace-hub-content">
              {workspaceSection === 'overview' && (
                <div className="workspace-hub-overview">
                  <div className="settings-governance-grid">
                    <article>
                      <strong>全局学习画像</strong>
                      <span>统一维护学习基础、薄弱点、资源偏好和可用时间，供资源、路径、报告等模块调用。</span>
                      <button type="button" onClick={() => setWorkspaceSection('profile')}>进入画像</button>
                    </article>
                    <article>
                      <strong>智能体中心</strong>
                      <span>集中查看 ProfileAgent、ResourceAgent、PathAgent、ReportAgent 和 DeliveryAgent 的协作链路。</span>
                      <button type="button" onClick={() => setWorkspaceSection('agents')}>查看智能体</button>
                    </article>
                    <article>
                      <strong>项目页布局规则</strong>
                      <span>工作台只放当前项目的执行动作；系统级、管理级和策略级能力集中放在设置。</span>
                    </article>
                  </div>
                  {workspaceOverview ?? (
                    <div className="settings-empty">打开一个项目后，可以在这里查看当前项目与全局能力的联动状态。</div>
                  )}
                </div>
              )}

              {workspaceSection === 'profile' && (
                <div className="workspace-hub-module">
                  {workspaceProfile ?? (
                    <div className="settings-empty">打开一个项目后，可以维护学习画像。</div>
                  )}
                </div>
              )}

              {workspaceSection === 'agents' && (
                <div className="workspace-hub-module">
                  {workspaceAgents ?? (
                    <div className="settings-empty">打开一个项目后，可以查看智能体协作状态。</div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
        {category === 'document' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>Document OCR</span>
                <h2>MinerU 文档识别</h2>
                <p>用于 PDF、图片、Office、表格等资料的文字提取；未启用时继续使用本地 OCR / 文本读取。</p>
              </div>
            </div>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draft.mineru.enabled}
                onChange={(event) => updateMinerU({ enabled: event.target.checked })}
              />
              启用 MinerU 解析服务
            </label>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draft.mineru.preferForUploads}
                onChange={(event) => updateMinerU({ preferForUploads: event.target.checked })}
              />
              上传素材和导入题目时优先使用 MinerU
            </label>
            <div className="settings-form-grid">
              <label>
                解析模式
                <select
                  value={draft.mineru.mode}
                  onChange={(event) => updateMinerU({ mode: event.target.value === 'agent' ? 'agent' : 'precise' })}
                >
                  <option value="precise">精准解析（API Token）</option>
                  <option value="agent">轻量 Agent（快速预览）</option>
                </select>
              </label>
              <label>
                Base URL
                <input
                  value={draft.mineru.baseUrl}
                  onChange={(event) => updateMinerU({ baseUrl: event.target.value })}
                  placeholder="https://mineru.net"
                />
              </label>
            </div>
            <label className="settings-wide-field">
              MinerU API Key
              <input
                type="password"
                value={draft.mineru.apiKey}
                onChange={(event) => updateMinerU({ apiKey: event.target.value })}
                placeholder="用于精准解析；不会显示在页面其他位置"
              />
            </label>
            <p className="settings-help-text">
              支持上传识别 PDF、PNG、JPG、WEBP、BMP、TIFF、TXT、Markdown、JSON、CSV、YAML、Word、PPT 和 Excel。没有配置 MinerU 时，非文本文件会保留文件本体并给出可读提示。
            </p>
          </section>
        )}
        {category === 'default' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>Default</span>
                <h2>默认模型</h2>
              </div>
            </div>
            <label className="settings-wide-field">
              新项目默认模型
              <select
                value={`${draft.activeProviderId}:${getActiveProviderProfile(draft).selectedModelId}`}
                onChange={(event) => {
                  const [providerId, modelId] = event.target.value.split(':');
                  setDraft((current) => ({
                    ...current,
                    activeProviderId: providerId,
                    providers: current.providers.map((profile) => profile.id === providerId
                      ? { ...profile, selectedModelId: modelId }
                      : profile)
                  }));
                  setSelectedProviderId(providerId);
                }}
              >
                {selectableModels.map((model) => (
                  <option key={`${model.providerId}:${model.id}`} value={`${model.providerId}:${model.id}`}>
                    {model.label} · {model.providerId}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}
        {category === 'generation' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>Generation</span>
                <h2>生成参数</h2>
              </div>
            </div>
            <div className="settings-form-grid">
              <label>
                温度
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={draft.temperature}
                  onChange={(event) => setDraft((current) => ({ ...current, temperature: Number(event.target.value) }))}
                />
              </label>
              <label>
                最大输出 Token
                <input
                  type="number"
                  min="256"
                  step="256"
                  value={draft.maxTokens}
                  onChange={(event) => setDraft((current) => ({ ...current, maxTokens: Number(event.target.value) }))}
                />
              </label>
            </div>
          </section>
        )}
        {category === 'display' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>Display</span>
                <h2>显示</h2>
              </div>
            </div>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draft.enableLatexPreview}
                onChange={(event) => setDraft((current) => ({ ...current, enableLatexPreview: event.target.checked }))}
              />
              启用 LaTeX 预览
            </label>
          </section>
        )}
      </div>

      <div className="settings-savebar">
        <div>
          {dirty ? <span className="settings-dirty">有未保存更改</span> : <span>所有更改已保存</span>}
          {message && <small role="status">{message}</small>}
          {error && <small className="settings-inline-error" role="alert">{error}</small>}
        </div>
        <div className="settings-savebar-actions">
          <button type="button" onClick={() => void discardDraft()} disabled={!dirty || busy !== null}>
            {busy === 'discard' ? '放弃中...' : '放弃更改'}
          </button>
          <button type="button" className="primary" onClick={() => void saveDraft()} disabled={!dirty || busy !== null}>
            {busy === 'save' ? '保存中...' : '保存所有更改'}
          </button>
        </div>
      </div>
    </section>
  );
}
