import { useEffect, useMemo, useState } from 'react';
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
};

function cloneSettings(settings: AppSettings): AppSettings {
  return JSON.parse(JSON.stringify(settings)) as AppSettings;
}

function settingsChanged(left: AppSettings, right: AppSettings) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

export default function ProviderSettingsPage({ initialSettings, onSave, onDiscard }: ProviderSettingsPageProps) {
  const [draft, setDraft] = useState(() => cloneSettings(initialSettings));
  const [baseline, setBaseline] = useState(() => cloneSettings(initialSettings));
  const [category, setCategory] = useState<SettingsCategory>('services');
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
      <div className="provider-settings-shell">
        <SettingsCategoryNav activeCategory={category} onSelectCategory={setCategory} />
        <ProviderList
          providers={draft.providers}
          selectedProviderId={selectedProvider.id}
          onSelectProvider={setSelectedProviderId}
          onAddProvider={addProvider}
          onRemoveProvider={removeProvider}
          onToggleProvider={toggleProvider}
        />
        {category === 'services' && (
          <ProviderDetail
            profile={selectedProvider}
            onChange={updateProvider}
            canDisableProvider={!selectedProvider.enabled || enabledProviderCount > 1}
          />
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
