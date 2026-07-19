import { useMemo, useState } from 'react';
import type { ProviderProfile } from '../../lib/types';
import { addCustomModel, hideOrShowModel, removeCustomModel } from '../../lib/providerSettings.js';
import { useT } from '../../i18n';

type ModelManagerProps = {
  profile: ProviderProfile;
  onChange: (profile: ProviderProfile) => void;
};

export default function ModelManager({ profile, onChange }: ModelManagerProps) {
  const { t } = useT();
  const [modelId, setModelId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const visibleCount = useMemo(() => profile.models.filter((model) => model.enabled).length, [profile.models]);

  async function fetchModels() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!window.cramEngine?.fetchProviderModels) {
        setError(t('settings.electronBridgeMissing'));
        return;
      }
      const nextProfile = await window.cramEngine.fetchProviderModels(profile);
      onChange(nextProfile);
      setMessage(t('settings.fetchedCount', { count: nextProfile.models.length }));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t('settings.fetchModelsFailed'));
    } finally {
      setBusy(false);
    }
  }

  function addModel() {
    const id = modelId.trim();
    if (!id) {
      setError(t('settings.modelIdEmpty'));
      return;
    }
    if (profile.models.some((model) => model.id === id)) {
      setError(t('settings.modelIdExists'));
      return;
    }
    onChange(addCustomModel(profile, id, id) as ProviderProfile);
    setModelId('');
    setError('');
  }

  function setModelEnabled(id: string, enabled: boolean) {
    onChange(hideOrShowModel(profile, id, enabled) as ProviderProfile);
  }

  function handleModelAction(id: string) {
    const model = profile.models.find((item) => item.id === id);
    if (!model) return;
    if (model.source === 'custom') {
      onChange(removeCustomModel(profile, id) as ProviderProfile);
      return;
    }
    setModelEnabled(model.id, !model.enabled);
  }

  return (
    <section className="model-manager">
      <div className="settings-section-header">
        <div>
          <h3>{t('settings.modelList')}</h3>
          <p>{t('settings.modelAvailableCount', { visible: visibleCount, total: profile.models.length })}</p>
        </div>
        <button type="button" onClick={() => void fetchModels()} disabled={busy}>
          {busy ? t('settings.fetching') : t('settings.fetchModels')}
        </button>
      </div>

      <div className="manual-model-row">
        <input
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          placeholder={t('settings.manualModelId')}
          aria-label={t('settings.manualModelIdAria')}
        />
        <button type="button" onClick={addModel}>{t('settings.addModelManual')}</button>
      </div>

      {message && <div className="settings-inline-success" role="status">{message}</div>}
      {error && <div className="settings-inline-error" role="alert">{error}</div>}

      <div className="model-list">
        {profile.models.length === 0 ? (
          <div className="settings-empty">{t('settings.noModels')}</div>
        ) : profile.models.map((model) => (
          <div key={model.id} className={model.enabled ? 'model-row' : 'model-row hidden'}>
            <div className="model-row-main">
              <strong>{model.label || model.id}</strong>
              <span>{model.id} · {model.source}</span>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={model.enabled}
                onChange={(event) => setModelEnabled(model.id, event.target.checked)}
              />
              <span />
            </label>
            <button type="button" onClick={() => handleModelAction(model.id)}>
              {model.source === 'custom'
                ? t('settings.deleteModel')
                : model.enabled ? t('settings.hideModel') : t('settings.showModel')}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
