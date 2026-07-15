import { useEffect, useMemo, useState } from 'react';
import type { GeneratePersonalizedResourcesInput, PersonalizedResource, PersonalizedResourceType } from '../../lib/types';

type PersonalizedResourcesPageProps = {
  resources: PersonalizedResource[];
  onGenerate: (input: GeneratePersonalizedResourcesInput) => Promise<PersonalizedResource[]>;
  onSave: (resource: PersonalizedResource) => Promise<PersonalizedResource[]>;
  onDelete: (resourceId: string) => Promise<PersonalizedResource[]>;
  onChange: (resources: PersonalizedResource[]) => void;
  onStatus?: (message: string) => void;
};

const resourceTypeOptions: Array<{ value: PersonalizedResourceType | 'all'; label: string }> = [
  { value: 'all', label: '全部类型' },
  { value: 'handout', label: '讲义' },
  { value: 'example', label: '例题' },
  { value: 'flashcard', label: '速记卡' },
  { value: 'remediation', label: '补漏清单' }
];

const typeLabels: Record<PersonalizedResourceType, string> = {
  handout: '讲义',
  example: '例题',
  flashcard: '速记卡',
  remediation: '补漏'
};

export function PersonalizedResourcesPage({
  resources,
  onGenerate,
  onSave,
  onDelete,
  onChange,
  onStatus
}: PersonalizedResourcesPageProps) {
  const [topic, setTopic] = useState('');
  const [generationType, setGenerationType] = useState<GeneratePersonalizedResourcesInput['type']>('all');
  const [filterType, setFilterType] = useState<PersonalizedResourceType | 'all'>('all');
  const [selectedId, setSelectedId] = useState(resources[0]?.id ?? '');
  const [draft, setDraft] = useState<PersonalizedResource | null>(resources[0] ?? null);
  const [busy, setBusy] = useState(false);

  const filteredResources = useMemo(() => (
    filterType === 'all' ? resources : resources.filter((resource) => resource.type === filterType)
  ), [filterType, resources]);

  useEffect(() => {
    const next = resources.find((resource) => resource.id === selectedId) ?? resources[0] ?? null;
    setSelectedId(next?.id ?? '');
    setDraft(next);
  }, [resources, selectedId]);

  async function generateResources() {
    setBusy(true);
    try {
      const next = await onGenerate({ topic, type: generationType });
      onChange(next);
      setTopic('');
      onStatus?.(`已生成 ${next.length} 条个性化资源`);
    } finally {
      setBusy(false);
    }
  }

  async function saveResource() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onSave(draft);
      onChange(next);
      onStatus?.('资源已保存');
    } finally {
      setBusy(false);
    }
  }

  async function deleteResource() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onDelete(draft.id);
      onChange(next);
      onStatus?.('资源已删除');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel personalized-resources-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">个性化资源</div>
          <h3>按学习画像生成讲义、例题、速记卡和补漏材料</h3>
          <p className="muted">ResourceAgent 会优先使用学习画像的薄弱点、资源偏好和当前题库内容。</p>
        </div>
      </div>

      <div className="resource-generation-panel">
        <label>
          生成资源
          <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="输入知识点；留空则根据画像自动选择" />
        </label>
        <label>
          资源类型
          <select value={generationType} onChange={(event) => setGenerationType(event.target.value as GeneratePersonalizedResourcesInput['type'])}>
            {resourceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button className="primary" onClick={() => void generateResources()} disabled={busy}>
          {busy ? '处理中…' : '生成资源'}
        </button>
      </div>

      <div className="personalized-resource-workbench">
        <aside className="resource-library-panel">
          <div className="resource-library-header">
            <div>
              <div className="subsection-title">资源库</div>
              <span className="muted">{filteredResources.length} / {resources.length} 条</span>
            </div>
            <select value={filterType} onChange={(event) => setFilterType(event.target.value as PersonalizedResourceType | 'all')}>
              {resourceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="resource-library-grid">
            {filteredResources.length ? filteredResources.map((resource) => (
              <button
                key={resource.id}
                className={resource.id === draft?.id ? 'resource-library-card active' : 'resource-library-card'}
                onClick={() => {
                  setSelectedId(resource.id);
                  setDraft(resource);
                }}
              >
                <span className="upload-kind">{typeLabels[resource.type]}</span>
                <strong>{resource.title}</strong>
                <small>{resource.knowledgePoint}</small>
                <em>{resource.profileSignal}</em>
              </button>
            )) : <div className="empty-slim">暂无资源，先点击上方“生成资源”。</div>}
          </div>
        </aside>

        <div className="resource-editor-panel">
          {draft ? (
            <>
              <div className="profile-inline-fields">
                <label>
                  标题
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                </label>
                <label>
                  知识点
                  <input value={draft.knowledgePoint} onChange={(event) => setDraft({ ...draft, knowledgePoint: event.target.value })} />
                </label>
              </div>
              <label>
                画像信号
                <input value={draft.profileSignal} onChange={(event) => setDraft({ ...draft, profileSignal: event.target.value })} />
              </label>
              <label>
                Markdown 预览 / 内容编辑
                <textarea value={draft.contentMarkdown} onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })} />
              </label>
              <div className="resource-markdown-preview">
                <div className="subsection-title">Markdown 预览</div>
                <pre>{draft.contentMarkdown}</pre>
              </div>
              <div className="panel-actions horizontal">
                <button className="primary" onClick={() => void saveResource()} disabled={busy}>保存资源</button>
                <button onClick={() => void deleteResource()} disabled={busy}>删除资源</button>
              </div>
            </>
          ) : (
            <div className="empty-slim">选择或生成一条资源后，可在这里编辑和保存。</div>
          )}
        </div>
      </div>
    </section>
  );
}
