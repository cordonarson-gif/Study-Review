import { useMemo, useState } from 'react';
import type { ConnectionCheckResult, ProviderProfile } from '../../lib/types';
import { defaultProviderProfiles } from '../../lib/types';
import ModelManager from './ModelManager';

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
  const [keyVisible, setKeyVisible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [connection, setConnection] = useState<ConnectionCheckResult | null>(null);

  const validation = useMemo(() => {
    if (!profile.label.trim()) return '服务商名称不能为空';
    if (!profile.baseUrl.trim()) return 'API 地址不能为空';
    return '';
  }, [profile.label, profile.baseUrl]);

  async function handleTest() {
    setChecking(true);
    setConnection(null);
    try {
      if (!window.cramEngine?.testProviderConnection) {
        setConnection({
          ok: false,
          kind: 'network',
          message: 'Electron 桥接未加载，请在桌面应用窗口中使用此功能。'
        });
        return;
      }
      const result = await window.cramEngine.testProviderConnection(profile);
      setConnection(result);
    } catch (error) {
      setConnection({
        ok: false,
        kind: 'network',
        message: error instanceof Error ? error.message : '测试连接失败'
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="provider-detail-panel" aria-label={`${profile.label} 设置`}>
      <div className="provider-detail-header">
        <div>
          <span>{profile.provider}</span>
          <h2>{profile.label}</h2>
        </div>
        <label
          className="settings-switch detail-switch"
          title={canDisableProvider ? '启用或停用服务商' : '至少保留一个启用服务商'}
        >
          <input
            type="checkbox"
            checked={profile.enabled}
            disabled={profile.enabled && !canDisableProvider}
            onChange={(event) => onChange({ ...profile, enabled: event.target.checked })}
          />
          <span />
          <em>{profile.enabled ? '已启用' : '已停用'}</em>
        </label>
      </div>

      <div className="settings-form-grid">
        <label>
          服务商名称
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
              aria-label="显示或隐藏 API Key"
              onClick={() => setKeyVisible((value) => !value)}
            >
              {keyVisible ? '隐藏' : '显示'}
            </button>
          </div>
        </label>
        <label className="settings-wide-field">
          API 地址
          <div className="endpoint-row">
            <input value={profile.baseUrl} onChange={(event) => onChange({ ...profile, baseUrl: event.target.value })} />
            <button type="button" onClick={() => onChange({ ...profile, baseUrl: defaultBaseUrl(profile) })}>重置</button>
          </div>
        </label>
      </div>

      <div className="endpoint-preview">
        <span>请求地址</span>
        <code>{endpointPreview(profile) || '请先填写 API 地址'}</code>
      </div>

      {validation && <div className="settings-inline-error" role="alert">{validation}</div>}

      <div className="connection-actions">
        <button type="button" className="primary" onClick={() => void handleTest()} disabled={checking || Boolean(validation)}>
          {checking ? '测试中...' : '测试连接'}
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
