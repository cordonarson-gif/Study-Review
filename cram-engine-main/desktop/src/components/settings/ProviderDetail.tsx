import { useMemo, useState } from 'react';
import type { ConnectionCheckResult, ProviderProfile } from '../../lib/types';
import { defaultProviderProfiles } from '../../lib/types';
import ModelManager from './ModelManager';
import { useT } from '../../i18n';

type ProviderDetailProps = {
  profile: ProviderProfile;
  onChange: (profile: ProviderProfile) => void;
  canDisableProvider: boolean;
};

function endpointPreview(profile: ProviderProfile) {
  const base = profile.baseUrl.trim().replace(/\/+$/, '');
  if (!base) return '';
  return `${base}${profile.provider === 'anthropic' ? '/v1/models' : '/models'}`;
}

function defaultBaseUrl(profile: ProviderProfile) {
  return defaultProviderProfiles.find((item) => item.provider === profile.provider)?.baseUrl ?? profile.baseUrl;
}

export default function ProviderDetail({ profile, onChange, canDisableProvider }: ProviderDetailProps) {
  const { t } = useT();
  const [keyVisible, setKeyVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<ConnectionCheckResult | null>(null);

  const validation = useMemo(() => {
    if (!profile.label.trim()) return t('settings.nameEmpty');
    if (!profile.baseUrl.trim()) return t('settings.apiUrlEmpty');
    return '';
  }, [profile.label, profile.baseUrl, t]);

  async function handleTest() {
    setChecking(true);
    setConnection(null);
    try {
      if (!window.cramEngine?.testProviderConnection) {
        setConnection({
          ok: false,
          kind: 'network',
          message: t('settings.electronBridgeMissing')
        });
        return;
      }
      const result = await window.cramEngine.testProviderConnection(profile);
      setConnection(result);
    } catch (error) {
      setConnection({
        ok: false,
        kind: 'network',
        message: error instanceof Error ? error.message : t('settings.testFailed')
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="provider-detail-panel" aria-label={t('settings.providerSettingsAria', { name: profile.label })}>
      <div className="provider-detail-header">
        <div>
          <span>{profile.provider}</span>
          <h2>{profile.label}</h2>
        </div>
        <label
          className="settings-switch detail-switch"
          title={canDisableProvider ? t('settings.enableToggle') : t('settings.enableToggleMin')}
        >
          <input
            type="checkbox"
            checked={profile.enabled}
            disabled={profile.enabled && !canDisableProvider}
            onChange={(event) => onChange({ ...profile, enabled: event.target.checked })}
          />
          <span />
          <em>{profile.enabled ? t('common.enabled') : t('common.disabled')}</em>
        </label>
      </div>

      <div className="settings-form-grid">
        <label>
          {t('settings.nameLabel')}
          <input value={profile.label} onChange={(event) => onChange({ ...profile, label: event.target.value })} />
        </label>
        <label>
          API Key
          <div className="api-key-row">
            <input
              type={keyVisible ? 'text' : 'password'}
              value={profile.apiKey}
              onChange={(event) => onChange({ ...profile, apiKey: event.target.value })}
              placeholder="sk-..."
            />
            <button
              type="button"
              aria-label={t('settings.toggleKeyAria')}
              onClick={() => setKeyVisible((value) => !value)}
            >
              {keyVisible ? t('settings.hideKey') : t('settings.showKey')}
            </button>
          </div>
        </label>
        <label className="settings-wide-field">
          {t('settings.apiUrlLabel')}
          <div className="endpoint-row">
            <input value={profile.baseUrl} onChange={(event) => onChange({ ...profile, baseUrl: event.target.value })} />
            <button type="button" onClick={() => onChange({ ...profile, baseUrl: defaultBaseUrl(profile) })}>{t('settings.resetUrl')}</button>
          </div>
        </label>
      </div>

      <div className="endpoint-preview">
        <span>{t('settings.requestUrl')}</span>
        <code>{endpointPreview(profile) || t('settings.fillApiUrl')}</code>
      </div>

      {validation && <div className="settings-inline-error" role="alert">{validation}</div>}

      <div className="connection-actions">
        <button type="button" className="primary" onClick={() => void handleTest()} disabled={checking || Boolean(validation)}>
          {checking ? t('common.testing') : t('settings.testConnection')}
        </button>
        {connection && (
          <div className={connection.ok ? 'settings-inline-success' : 'settings-inline-error'} role={connection.ok ? 'status' : 'alert'}>
            {connection.message}
          </div>
        )}
      </div>

      <ModelManager profile={profile} onChange={onChange} />
    </section>
  );
}
