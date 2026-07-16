import { useEffect, useMemo, useState } from 'react';
import type { GenerateModeArtifactInput, ModeArtifact, WorkspaceTabTemplate } from '../../lib/types';

type ModeModulePageProps = {
  tab: WorkspaceTabTemplate;
  artifacts: ModeArtifact[];
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onSave: (artifact: ModeArtifact) => Promise<ModeArtifact[]>;
  onDelete: (artifactId: string) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

const artifactSourceLabels: Record<ModeArtifact['source'], string> = {
  agent: 'AI生成',
  fallback: '本地模板',
  manual: '手动编辑'
};

export function ModeModulePage({ tab, artifacts, onGenerate, onSave, onDelete, onChange, onStatus }: ModeModulePageProps) {
  const tabArtifacts = useMemo(() => artifacts.filter((artifact) => artifact.tabId === tab.id), [artifacts, tab.id]);
  const [selectedId, setSelectedId] = useState(tabArtifacts[0]?.id ?? '');
  const [draft, setDraft] = useState<ModeArtifact | null>(tabArtifacts[0] ?? null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = tabArtifacts.find((artifact) => artifact.id === selectedId) ?? tabArtifacts[0] ?? null;
    setSelectedId(next?.id ?? '');
    setDraft(next);
  }, [tabArtifacts, selectedId]);

  async function generateArtifact() {
    setBusy(true);
    try {
      const next = await onGenerate({ tabId: tab.id, prompt, artifactKind: tab.label });
      onChange(next);
      setPrompt('');
      const newestArtifact = next[0];
      onStatus?.(newestArtifact?.source === 'agent' ? 'AI 成果已生成' : '模型不可用，已生成本地模板');
    } finally {
      setBusy(false);
    }
  }

  async function saveArtifact() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onSave(draft);
      onChange(next);
      onStatus?.('模式成果已保存');
    } finally {
      setBusy(false);
    }
  }

  async function deleteArtifact() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onDelete(draft.id);
      onChange(next);
      onStatus?.('模式成果已删除');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel mode-module-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{tab.label}</div>
          <h3>{tab.description}</h3>
          <p className="muted">输入当前页面的目标或补充要求，系统会生成可保存、可编辑、可交付的 Markdown 成果。</p>
        </div>
        <button className="primary" onClick={() => void generateArtifact()} disabled={busy}>
          {busy ? '生成中...' : '生成成果'}
        </button>
      </div>

      <div className="mode-generation-panel">
        <label className="mode-form-field wide">
          生成要求
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例如：请围绕当前项目生成一版结构化内容，并给出复核清单"
          />
        </label>
      </div>

      <div className="mode-artifact-grid">
        <aside className="mode-artifact-list">
          <div className="subsection-title">成果库</div>
          {tabArtifacts.length ? tabArtifacts.map((artifact) => (
            <button
              key={artifact.id}
              className={artifact.id === draft?.id ? 'resource-library-card active' : 'resource-library-card'}
              onClick={() => {
                setSelectedId(artifact.id);
                setDraft(artifact);
              }}
            >
              <strong>{artifact.title}</strong>
              <small>{artifact.kind} · {artifactSourceLabels[artifact.source]} · {new Date(artifact.updatedAt).toLocaleString('zh-CN')}</small>
            </button>
          )) : <div className="empty-slim">暂无成果，点击“生成成果”创建第一份内容。</div>}
        </aside>

        <div className="mode-artifact-editor">
          {draft ? (
            <>
              <label className="mode-form-field">
                标题
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label className="mode-form-field wide">
                Markdown 内容
                <textarea value={draft.contentMarkdown} onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })} />
              </label>
              <div className="panel-actions horizontal">
                <button className="primary" onClick={() => void saveArtifact()} disabled={busy}>保存成果</button>
                <button onClick={() => void deleteArtifact()} disabled={busy}>删除成果</button>
              </div>
            </>
          ) : <div className="empty-slim">选择或生成一份成果后，可在这里编辑。</div>}
        </div>
      </div>
    </section>
  );
}
