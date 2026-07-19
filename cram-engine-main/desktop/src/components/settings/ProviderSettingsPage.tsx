import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppSettings, ProviderProfile, ThemeMode } from '../../lib/types';
import type { Locale } from '../../i18n/types';
import { getSelectableModels, replaceProvider } from '../../lib/providerSettings.js';
import { applyTheme } from '../../lib/themeManager';
import { getActiveProviderProfile } from '../../lib/utils';
import { useT, useLocale } from '../../i18n';
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

function settingsChangedExceptLocale(left: AppSettings, right: AppSettings) {
  const { locale: _leftLocale, ...leftRest } = left;
  const { locale: _rightLocale, ...rightRest } = right;
  return JSON.stringify(leftRest) !== JSON.stringify(rightRest);
}

function applyLocaleToDraft(settings: AppSettings, locale: Locale): AppSettings {
  return { ...settings, locale };
}

type WorkspaceSection = 'overview' | 'profile' | 'agents';

function useWorkspaceSections() {
  const { t } = useT();
  return [
    { id: 'overview' as const, label: t('settings.workspaceOverview'), description: t('settings.workspaceOverviewDesc') },
    { id: 'profile' as const, label: t('settings.workspaceProfile'), description: t('settings.workspaceProfileDesc') },
    { id: 'agents' as const, label: t('settings.workspaceAgents'), description: t('settings.workspaceAgentsDesc') }
  ];
}

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
  const baselineRef = useRef(cloneSettings(initialSettings));
  const [category, setCategory] = useState<SettingsCategory>('services');
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('overview');
  const [selectedProviderId, setSelectedProviderId] = useState(initialSettings.activeProviderId);
  const [busy, setBusy] = useState<'save' | 'discard' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { t } = useT();
  const { locale, setLocale } = useLocale();
  const workspaceSections = useWorkspaceSections();

  useEffect(() => {
    const nextSettings = cloneSettings(initialSettings);
    if (!settingsChangedExceptLocale(baselineRef.current, nextSettings)) {
      setDraft((current) => applyLocaleToDraft(current, nextSettings.locale));
      setBaseline((current) => applyLocaleToDraft(current, nextSettings.locale));
      baselineRef.current = applyLocaleToDraft(baselineRef.current, nextSettings.locale);
      return;
    }
    setDraft(nextSettings);
    setBaseline(nextSettings);
    baselineRef.current = nextSettings;
    setSelectedProviderId(initialSettings.activeProviderId);
  }, [initialSettings]);

  const selectedProvider = useMemo(() => (
    draft.providers.find((profile) => profile.id === selectedProviderId)
    ?? getActiveProviderProfile(draft)
  ), [draft, selectedProviderId]);
  const selectableModels = useMemo(() => getSelectableModels(draft.providers), [draft.providers]);
  const selectedDefaultModelValue = useMemo(() => {
    const activeProfile = draft.providers.find((profile) => profile.id === draft.activeProviderId);
    const value = activeProfile?.selectedModelId
      ? `${activeProfile.id}:${activeProfile.selectedModelId}`
      : '';
    return selectableModels.some((model) => `${model.providerId}:${model.id}` === value) ? value : '';
  }, [draft.activeProviderId, draft.providers, selectableModels]);
  const enabledProviderCount = useMemo(() => draft.providers.filter((profile) => profile.enabled).length, [draft.providers]);
  const dirty = useMemo(() => settingsChanged(draft, baseline), [draft, baseline]);
  const scopeSummary: Record<SettingsCategory, [string, string]> = {
    workspace: [t('settings.categoryWorkspace'), t('workspaceHubSubtitle')],
    document: [t('settings.categoryDocument'), t('settings.documentDesc')],
    default: [t('settings.categoryDefault'), t('settings.categoryDefaultDesc')],
    generation: [t('settings.categoryGeneration'), t('settings.categoryGenerationDesc')],
    display: [t('settings.categoryDisplay'), t('settings.categoryDisplayDesc')],
    services: [t('settings.categoryServices'), t('settings.categoryServicesDesc')],
    language: [t('settings.categoryLanguage'), t('settings.categoryLanguageDesc')]
  };

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
      baselineRef.current = cloneSettings(saved);
      setMessage(t('settings.savedAll'));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('settings.saveFailed'));
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
      baselineRef.current = cloneSettings(reloaded);
      setSelectedProviderId(reloaded.activeProviderId);
      applyTheme(reloaded.themeMode);
      setMessage(t('settings.discarded'));
    } catch (discardError) {
      setError(discardError instanceof Error ? discardError.message : t('settings.discardFailed'));
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
              <span>{t('settings.scopeTitle')}</span>
              <strong>{scopeSummary[category][0]}</strong>
              <small>{scopeSummary[category][1]}</small>
            </div>
            <div className="settings-scope-card">
              <strong>{t('settings.configStatus')}</strong>
              <span>{dirty ? t('settings.unsavedChanges') : t('settings.allSaved')}</span>
            </div>
            <div className="settings-scope-card">
              <strong>{t('settings.enabledProviders')}</strong>
              <span>{enabledProviderCount}{t('settings.countUnit')}</span>
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
                <span>{t('settings.categoryWorkspace')}</span>
                <h2>{t('settings.workspaceHub')}</h2>
                <p>
                  {t('settings.workspaceHubSubtitle')}
                </p>
              </div>
              <div className="workspace-hub-status">
                <strong>{enabledProviderCount}</strong>
                <span>{t('settings.workspaceEnabledProviders')}</span>
              </div>
            </div>

            <nav className="workspace-hub-tabs" aria-label={t('settings.categoryWorkspaceDesc')}>
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
                      <strong>{t('settings.workspaceLearningProfile')}</strong>
                      <span>{t('settings.workspaceLearningProfileDesc')}</span>
                      <button type="button" onClick={() => setWorkspaceSection('profile')}>{t('settings.workspaceEnterProfile')}</button>
                    </article>
                    <article>
                      <strong>{t('settings.workspaceAgentCenter')}</strong>
                      <span>{t('settings.workspaceAgentCenterDesc')}</span>
                      <button type="button" onClick={() => setWorkspaceSection('agents')}>{t('settings.workspaceViewAgents')}</button>
                    </article>
                    <article>
                      <strong>{t('settings.workspaceLayoutRules')}</strong>
                      <span>{t('settings.workspaceLayoutRulesDesc')}</span>
                    </article>
                  </div>
                  {workspaceOverview ?? (
                    <div className="settings-empty">{t('settings.workspaceEmptyOverview')}</div>
                  )}
                </div>
              )}

              {workspaceSection === 'profile' && (
                <div className="workspace-hub-module">
                  {workspaceProfile ?? (
                    <div className="settings-empty">{t('settings.workspaceEmptyProfile')}</div>
                  )}
                </div>
              )}

              {workspaceSection === 'agents' && (
                <div className="workspace-hub-module">
                  {workspaceAgents ?? (
                    <div className="settings-empty">{t('settings.workspaceEmptyAgents')}</div>
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
                <span>{t('settings.categoryDocument')}</span>
                <h2>{t('settings.documentTitle')}</h2>
                <p>{t('settings.documentDesc')}</p>
              </div>
            </div>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draft.mineru.enabled}
                onChange={(event) => updateMinerU({ enabled: event.target.checked })}
              />
              {t('settings.enableMineru')}
            </label>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draft.mineru.preferForUploads}
                onChange={(event) => updateMinerU({ preferForUploads: event.target.checked })}
              />
              {t('settings.preferMineru')}
            </label>
            <div className="settings-form-grid">
              <label>
                {t('settings.parseMode')}
                <select
                  value={draft.mineru.mode}
                  onChange={(event) => updateMinerU({ mode: event.target.value === 'agent' ? 'agent' : 'precise' })}
                >
                  <option value="precise">{t('settings.preciseMode')}</option>
                  <option value="agent">{t('settings.agentMode')}</option>
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
                placeholder={t('settings.mineruApiKeyPlaceholder')}
              />
            </label>
            <p className="settings-help-text">
              {t('settings.mineruHelp')}
            </p>
          </section>
        )}
        {category === 'default' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>{t('settings.categoryDefault')}</span>
                <h2>{t('settings.defaultModelTitle')}</h2>
              </div>
            </div>
            <label className="settings-wide-field">
              {t('settings.defaultModelForNew')}
              <select
                value={selectedDefaultModelValue}
                onChange={(event) => {
                  if (!event.target.value) return;
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
                <option value="" disabled={selectableModels.length > 0}>{t('settings.noDefaultModel')}</option>
                {selectableModels.map((model) => (
                  <option key={`${model.providerId}:${model.id}`} value={`${model.providerId}:${model.id}`}>
                    {model.label} · {model.providerId}
                  </option>
                ))}
              </select>
            </label>
            {selectableModels.length === 0 && (
              <div className="settings-empty">{t('settings.noSelectableModels')}</div>
            )}
          </section>
        )}
        {category === 'generation' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>{t('settings.categoryGeneration')}</span>
                <h2>{t('settings.generationTitle')}</h2>
              </div>
            </div>
            <div className="settings-form-grid">
              <label>
                {t('settings.temperature')}
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
                {t('settings.maxOutputToken')}
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
                <span>{t('settings.categoryDisplay')}</span>
                <h2>{t('settings.displayTitle')}</h2>
              </div>
            </div>
            <fieldset className="settings-theme-mode">
              <legend>{t('settings.themeMode')}</legend>
              <div className="theme-mode-options">
                {([
                  { value: 'light', labelKey: 'settings.light', icon: '☀' },
                  { value: 'dark', labelKey: 'settings.dark', icon: '☾' },
                  { value: 'auto', labelKey: 'settings.auto', icon: '◐' }
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={draft.themeMode === opt.value ? 'active' : ''}
                    onClick={() => {
                      setDraft((current) => ({ ...current, themeMode: opt.value as ThemeMode }));
                      applyTheme(opt.value as ThemeMode);
                    }}
                  >
                    <span className="theme-icon">{opt.icon}</span>
                    <span>{t(opt.labelKey)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="settings-check-row">
              <input
                type="checkbox"
                checked={draft.enableLatexPreview}
                onChange={(event) => setDraft((current) => ({ ...current, enableLatexPreview: event.target.checked }))}
              />
              {t('settings.latexPreview')}
            </label>
          </section>
        )}
        {category === 'language' && (
          <section className="provider-detail-panel">
            <div className="provider-detail-header">
              <div>
                <span>{t('settings.categoryLanguage')}</span>
                <h2>{t('settings.languageTitle')}</h2>
                <p>{t('settings.languageDesc')}</p>
              </div>
            </div>
            <div className="theme-mode-options">
              {([
                { value: 'zh-CN' as Locale, label: t('settings.zhCN') },
                { value: 'zh-TW' as Locale, label: t('settings.zhTW') },
                { value: 'en' as Locale, label: t('settings.en') }
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={locale === opt.value ? 'active' : ''}
                  onClick={() => {
                    setDraft((current) => applyLocaleToDraft(current, opt.value));
                    setBaseline((current) => applyLocaleToDraft(current, opt.value));
                    baselineRef.current = applyLocaleToDraft(baselineRef.current, opt.value);
                    setLocale(opt.value);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="settings-savebar">
        <div>
          {dirty ? <span className="settings-dirty">{t('settings.unsavedChanges')}</span> : <span>{t('settings.allSaved')}</span>}
          {message && <small role="status">{message}</small>}
          {error && <small className="settings-inline-error" role="alert">{error}</small>}
        </div>
        <div className="settings-savebar-actions">
          <button type="button" onClick={() => void discardDraft()} disabled={!dirty || busy !== null}>
            {busy === 'discard' ? t('settings.discarding') : t('settings.discard')}
          </button>
          <button type="button" className="primary" onClick={() => void saveDraft()} disabled={!dirty || busy !== null}>
            {busy === 'save' ? t('settings.saving') : t('settings.saveAll')}
          </button>
        </div>
      </div>
    </section>
  );
}
