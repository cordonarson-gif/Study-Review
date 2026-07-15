import { useMemo, useState } from 'react';
import type { ProviderProfile } from '../../lib/types';
import { addCustomModel, hideOrShowModel, removeCustomModel } from '../../lib/providerSettings.js';

type ModelManagerProps = {
  profile: ProviderProfile;
  onChange: (profile: ProviderProfile) => void;
};

export default function ModelManager({ profile, onChange }: ModelManagerProps) {
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
        setError('Electron 桥接未加载，请在桌面应用窗口中使用此功能。');
        return;
      }
      const nextProfile = await window.cramEngine.fetchProviderModels(profile);
      onChange(nextProfile);
      setMessage(`已获取 ${nextProfile.models.length} 个模型`);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取模型列表失败');
    } finally {
      setBusy(false);
    }
  }

  function addModel() {
    const id = modelId.trim();
    if (!id) {
      setError('模型 ID 不能为空');
      return;
    }
    if (profile.models.some((model) => model.id === id)) {
      setError('模型 ID 已存在');
      return;
    }
    onChange(addCustomModel(profile, id, id) as ProviderProfile);
    setModelId('');
    setError('');
  }

  function removeModel(id: string) {
    const model = profile.models.find((item) => item.id === id);
    if (!model) return;
    onChange(model.source === 'custom'
      ? removeCustomModel(profile, id) as ProviderProfile
      : hideOrShowModel(profile, id, false) as ProviderProfile);
  }

  return (
    <section className="model-manager">
      <div className="settings-section-header">
        <div>
          <h3>模型列表</h3>
          <p>{visibleCount} 个可用，{profile.models.length} 个已保存</p>
        </div>
        <button type="button" onClick={() => void fetchModels()} disabled={busy}>
          {busy ? '获取中...' : '获取模型列表'}
        </button>
      </div>

      <div className="manual-model-row">
        <input
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          placeholder="手动添加模型 ID"
          aria-label="手动添加模型 ID"
        />
        <button type="button" onClick={addModel}>手动添加模型</button>
      </div>

      {message && <div className="settings-inline-success" role="status">{message}</div>}
      {error && <div className="settings-inline-error" role="alert">{error}</div>}

      <div className="model-list">
        {profile.models.length === 0 ? (
          <div className="settings-empty">还没有模型。可以先手动添加，或从服务商获取模型列表。</div>
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
                onChange={(event) => onChange(hideOrShowModel(profile, model.id, event.target.checked) as ProviderProfile)}
              />
              <span />
            </label>
            <button type="button" onClick={() => removeModel(model.id)}>
              {model.source === 'custom' ? '删除' : '隐藏'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
