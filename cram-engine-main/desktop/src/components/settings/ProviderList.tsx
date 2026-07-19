import { useMemo, useState } from 'react';
import type { ProviderKind, ProviderProfile } from '../../lib/types';
import { filterProviders } from '../../lib/providerSettings.js';
import { useT } from '../../i18n';

type ProviderListProps = {
  providers: ProviderProfile[];
  selectedProviderId: string;
  onSelectProvider: (providerId: string) => void;
  onAddProvider: (profile: ProviderProfile) => void;
  onRemoveProvider: (providerId: string) => void;
  onToggleProvider: (providerId: string, enabled: boolean) => void;
};

const providerKinds: Array<{ id: ProviderKind; label: string }> = [
  { id: 'openai-compatible', label: 'OpenAI Compatible' },
  { id: 'aliyun', label: 'Qwen Compatible' },
  { id: 'anthropic', label: 'Anthropic' }
];

function makeProviderId(label: string) {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `custom-${slug || Date.now()}`;
}

export default function ProviderList({
  providers,
  selectedProviderId,
  onSelectProvider,
  onAddProvider,
  onRemoveProvider,
  onToggleProvider
}: ProviderListProps) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [provider, setProvider] = useState<ProviderKind>('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const filteredProviders = useMemo(() => filterProviders(providers, query), [providers, query]);
  const enabledCount = providers.filter((item) => item.enabled).length;

  function resetForm() {
    setLabel('');
    setProvider('openai-compatible');
    setBaseUrl('');
    setApiKey('');
    setError('');
  }

  function submitProvider() {
    const trimmedLabel = label.trim();
    const trimmedBaseUrl = baseUrl.trim();
    if (!trimmedLabel || !trimmedBaseUrl) {
      setError(t('settings.fillNameAndUrl'));
      return;
    }
    if (providers.some((item) => item.label.toLowerCase() === trimmedLabel.toLowerCase())) {
      setError(t('settings.nameExists'));
      return;
    }

    const id = makeProviderId(trimmedLabel);
    onAddProvider({
      id,
      label: trimmedLabel,
      provider,
      baseUrl: trimmedBaseUrl,
      apiKey,
      enabled: true,
      isCustom: true,
      selectedModelId: '',
      models: []
    });
    resetForm();
    setAdding(false);
    onSelectProvider(id);
  }

  return (
    <section className="provider-list-panel" aria-label={t('settings.providersTitle')}>
      <div className="settings-column-heading">
        <span>{t('settings.providersSubtitle')}</span>
        <strong>{t('settings.providersTitle')}</strong>
      </div>
      <div className="provider-list-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('settings.searchProvider')}
          aria-label={t('settings.searchProvider')}
        />
        <button type="button" className="settings-icon-button" onClick={() => setAdding(true)} aria-label={t('settings.addProvider')}>
          +
        </button>
      </div>

      <div className="provider-list">
        {filteredProviders.map((item) => {
          const isSelected = item.id === selectedProviderId;
          const canDisable = !item.enabled || enabledCount > 1;
          return (
            <div key={item.id} className={isSelected ? 'provider-row active' : 'provider-row'}>
              <button type="button" className="provider-row-main" onClick={() => onSelectProvider(item.id)}>
                <strong>{item.label}</strong>
                <span>{item.provider}</span>
              </button>
              <span className={item.enabled ? 'provider-badge on' : 'provider-badge'}>{item.enabled ? t('common.enabled') : t('common.disabled')}</span>
              <label className="settings-switch" title={canDisable ? t('settings.enableToggle') : t('settings.enableToggleMin')}>
                <input
                  type="checkbox"
                  checked={item.enabled}
                  disabled={!canDisable}
                  onChange={(event) => onToggleProvider(item.id, event.target.checked)}
                />
                <span />
              </label>
              {item.isCustom && (
                <button
                  type="button"
                  className="provider-remove"
                  aria-label={t('settings.removeProviderAria', { name: item.label })}
                  onClick={() => {
                    if (window.confirm(t('settings.confirmDeleteProvider', { name: item.label }))) onRemoveProvider(item.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {adding && (
        <div className="settings-dialog-backdrop" role="presentation">
          <div className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="add-provider-title">
            <h3 id="add-provider-title">{t('settings.addProviderTitle')}</h3>
            <label>
              {t('settings.providerName')}
              <input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
            </label>
            <label>
              {t('settings.providerProtocol')}
              <select value={provider} onChange={(event) => setProvider(event.target.value as ProviderKind)}>
                {providerKinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
              </select>
            </label>
            <label>
              {t('settings.providerApiUrl')}
              <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" />
            </label>
            <label>
              {t('settings.providerApiKey')}
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" />
            </label>
            {error && <div className="settings-inline-error" role="alert">{error}</div>}
            <div className="settings-dialog-actions">
              <button type="button" onClick={() => { resetForm(); setAdding(false); }}>{t('common.cancel')}</button>
              <button type="button" className="primary" onClick={submitProvider}>{t('common.add')}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
