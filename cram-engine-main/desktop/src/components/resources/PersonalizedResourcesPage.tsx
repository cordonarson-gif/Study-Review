import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n';
import type { GeneratePersonalizedResourcesInput, PersonalizedResource, PersonalizedResourceType } from '../../lib/types';

type PersonalizedResourcesPageProps = {
  resources: PersonalizedResource[];
  onGenerate: (input: GeneratePersonalizedResourcesInput) => Promise<PersonalizedResource[]>;
  onSave: (resource: PersonalizedResource) => Promise<PersonalizedResource[]>;
  onDelete: (resourceId: string) => Promise<PersonalizedResource[]>;
  onChange: (resources: PersonalizedResource[]) => void;
  onStatus?: (message: string) => void;
};

export function PersonalizedResourcesPage({
  resources,
  onGenerate,
  onSave,
  onDelete,
  onChange,
  onStatus
}: PersonalizedResourcesPageProps) {
  const { t } = useT();

  const resourceTypeOptions: Array<{ value: PersonalizedResourceType | 'all'; label: string }> = [
    { value: 'all', label: t('resources.allTypes') },
    { value: 'handout', label: t('resources.handout') },
    { value: 'example', label: t('resources.example') },
    { value: 'flashcard', label: t('resources.flashcard') },
    { value: 'remediation', label: t('resources.remediation') }
  ];

  const typeLabels: Record<PersonalizedResourceType, string> = {
    handout: t('resources.handout'),
    example: t('resources.example'),
    flashcard: t('resources.flashcard'),
    remediation: t('resources.remediationShort')
  };

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
      onStatus?.(t('resources.generated', { count: next.length }));
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
      onStatus?.(t('resources.saved'));
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
      onStatus?.(t('resources.deleted'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel personalized-resources-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('resources.title')}</div>
          <h3>{t('resources.subtitle')}</h3>
          <p className="muted">{t('resources.desc')}</p>
        </div>
      </div>

      <div className="resource-generation-panel">
        <label>
          {t('resources.generateResources')}
          <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={t('resources.topicPlaceholder')} />
        </label>
        <label>
          {t('resources.resourceType')}
          <select value={generationType} onChange={(event) => setGenerationType(event.target.value as GeneratePersonalizedResourcesInput['type'])}>
            {resourceTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button className="primary" onClick={() => void generateResources()} disabled={busy}>
          {busy ? t('resources.processing') : t('resources.generateResources')}
        </button>
      </div>

      <div className="personalized-resource-workbench">
        <aside className="resource-library-panel">
          <div className="resource-library-header">
            <div>
              <div className="subsection-title">{t('resources.resourceLibrary')}</div>
              <span className="muted">{filteredResources.length} / {resources.length} {t('resources.countUnit')}</span>
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
            )) : <div className="empty-slim">{t('resources.emptyHint')}</div>}
          </div>
        </aside>

        <div className="resource-editor-panel">
          {draft ? (
            <>
              <div className="profile-inline-fields">
                <label>
                  {t('resources.titleLabel')}
                  <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                </label>
                <label>
                  {t('resources.knowledgePoint')}
                  <input value={draft.knowledgePoint} onChange={(event) => setDraft({ ...draft, knowledgePoint: event.target.value })} />
                </label>
              </div>
              <label>
                {t('resources.profileSignal')}
                <input value={draft.profileSignal} onChange={(event) => setDraft({ ...draft, profileSignal: event.target.value })} />
              </label>
              <label>
                {t('resources.markdownPreview')}
                <textarea value={draft.contentMarkdown} onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })} />
              </label>
              <div className="resource-markdown-preview">
                <div className="subsection-title">{t('resources.previewTitle')}</div>
                <pre>{draft.contentMarkdown}</pre>
              </div>
              <div className="panel-actions horizontal">
                <button className="primary" onClick={() => void saveResource()} disabled={busy}>{t('resources.saveResource')}</button>
                <button onClick={() => void deleteResource()} disabled={busy}>{t('resources.deleteResource')}</button>
              </div>
            </>
          ) : (
            <div className="empty-slim">{t('resources.editHint')}</div>
          )}
        </div>
      </div>
    </section>
  );
}
