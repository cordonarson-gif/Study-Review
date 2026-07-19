import { useEffect, useMemo, useState } from 'react';
import type { DeliveryPackage, ExportResult, ProjectMode } from '../../lib/types';
import { useT } from '../../i18n';

type DeliveryPackagePageProps = {
  mode: ProjectMode;
  deliveryPackage: DeliveryPackage | null;
  onGenerate: () => Promise<DeliveryPackage>;
  onSave: (deliveryPackage: DeliveryPackage) => Promise<DeliveryPackage>;
  onExport: () => Promise<ExportResult>;
  onChange: (deliveryPackage: DeliveryPackage) => void;
  onStatus?: (message: string) => void;
};

const descriptionKeys: Partial<Record<ProjectMode, string>> = {
  'paper-assistant': 'delivery.paperAssistantDesc',
  'assignment-quiz': 'delivery.assignmentQuizDesc'
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

function createManualFallbackPackage(t: TFn): DeliveryPackage {
  const now = new Date().toISOString();
  return {
    version: 1,
    title: t('delivery.defaultTitle'),
    summary: t('delivery.defaultSummary'),
    items: [],
    checklist: [
      t('delivery.defaultChecklistMaterials'),
      t('delivery.defaultChecklistReports'),
      t('delivery.defaultChecklistQuestions'),
      t('delivery.defaultChecklistKnowledge'),
      t('delivery.defaultChecklistExports'),
    ],
    exportNotes: t('delivery.defaultNotes'),
    source: 'manual',
    createdAt: now,
    updatedAt: now
  };
}

export function DeliveryPackagePage({
  mode,
  deliveryPackage,
  onGenerate,
  onSave,
  onExport,
  onChange,
  onStatus
}: DeliveryPackagePageProps) {
  const { t } = useT();
  const descriptionKey = descriptionKeys[mode] ?? 'delivery.desc';
  const [draft, setDraft] = useState<DeliveryPackage>(() => deliveryPackage ?? createManualFallbackPackage(t));
  const [busyAction, setBusyAction] = useState<'generate' | 'save' | 'export' | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  useEffect(() => {
    setDraft(deliveryPackage ?? createManualFallbackPackage(t));
  }, [deliveryPackage, t]);

  const summaryStats = useMemo(() => {
    const ready = draft.items.filter((item) => item.status === 'ready').length;
    const review = draft.items.filter((item) => item.status === 'needs-review').length;
    const missing = draft.items.filter((item) => item.status === 'missing').length;
    return { ready, review, missing, total: draft.items.length };
  }, [draft.items]);

  function patchDraft(patch: Partial<DeliveryPackage>) {
    const next = { ...draft, ...patch, updatedAt: new Date().toISOString() };
    setDraft(next);
    onChange(next);
  }

  async function generatePackage() {
    setBusyAction('generate');
    try {
      const next = await onGenerate();
      setDraft(next);
      onChange(next);
      onStatus?.(t('delivery.generated'));
    } finally {
      setBusyAction(null);
    }
  }

  async function savePackage() {
    setBusyAction('save');
    try {
      const next = await onSave(draft);
      setDraft(next);
      onChange(next);
      onStatus?.(t('delivery.saved'));
    } finally {
      setBusyAction(null);
    }
  }

  async function exportPackage() {
    setBusyAction('export');
    try {
      const saved = await onSave(draft);
      setDraft(saved);
      onChange(saved);
      const result = await onExport();
      setLastExport(result);
      onStatus?.(t('delivery.exportedMsg', { path: result.markdownPath }));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="panel delivery-package-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('delivery.title')}</div>
          <h3>{t('delivery.subtitle')}</h3>
          <p className="muted">{t(descriptionKey)}</p>
        </div>
        <div className="panel-actions horizontal">
          <button className="primary" onClick={() => void generatePackage()} disabled={Boolean(busyAction)}>
            {busyAction === 'generate' ? t('common.generating') : t('delivery.generate')}
          </button>
          <button onClick={() => void exportPackage()} disabled={Boolean(busyAction)}>
            {busyAction === 'export' ? t('common.processing') : t('delivery.export')}
          </button>
        </div>
      </div>

      <div className="delivery-summary-grid">
        <div className="metric-card">
          <strong>{summaryStats.ready}</strong>
          <span>{t('delivery.readyCount')}</span>
        </div>
        <div className="metric-card">
          <strong>{summaryStats.review}</strong>
          <span>{t('delivery.reviewCount')}</span>
        </div>
        <div className="metric-card">
          <strong>{summaryStats.missing}</strong>
          <span>{t('delivery.missingCount')}</span>
        </div>
        <div className="metric-card">
          <strong>{summaryStats.total}</strong>
          <span>{t('delivery.totalCount')}</span>
        </div>
      </div>

      <div className="delivery-editor-grid">
        <div className="delivery-main-panel">
          <div className="delivery-field-grid">
            <label className="delivery-field">
              {t('delivery.packageTitle')}
              <input value={draft.title} onChange={(event) => patchDraft({ title: event.target.value })} />
            </label>
            <label className="delivery-field">
              {t('delivery.source')}
              <input value={draft.source === 'agent' ? t('delivery.autoGenerated') : t('delivery.manualEdit')} readOnly />
            </label>
            <label className="delivery-field wide">
              {t('delivery.summaryLabel')}
              <textarea value={draft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} />
            </label>
          </div>

          <div className="subsection-title">{t('delivery.checklist')}</div>
          <div className="delivery-item-grid">
            {draft.items.length ? draft.items.map((item) => (
              <article className={`delivery-item-card ${item.status}`} key={item.id}>
                <div className="delivery-item-card-header">
                  <div>
                    <span className="upload-kind">{item.type}</span>
                    <h4>{item.title}</h4>
                  </div>
                  <span className="delivery-status-pill">{t(`delivery.${item.status === 'ready' ? 'ready' : item.status === 'needs-review' ? 'needsReview' : 'missing'}`)}</span>
                </div>
                <p>{item.description}</p>
                <small>{t(`delivery.${item.status === 'ready' ? 'readyHint' : item.status === 'needs-review' ? 'needsReviewHint' : 'missingHint'}`)} · {t('delivery.sourceCount', { count: item.sourceIds.length })}</small>
                <ul>
                  {item.checklist.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              </article>
            )) : (
              <div className="empty-slim">{t('delivery.emptyChecklist')}</div>
            )}
          </div>
        </div>

        <aside className="delivery-checklist-panel">
          <div className="subsection-title">{t('delivery.checklistReview')}</div>
          <div className="delivery-checklist-card">
            <ul>
              {draft.checklist.map((entry) => <li key={entry}>{entry}</li>)}
            </ul>
          </div>

          <label className="delivery-field wide">
            {t('delivery.exportNotes')}
            <textarea value={draft.exportNotes} onChange={(event) => patchDraft({ exportNotes: event.target.value })} />
          </label>

          <div className="panel-actions">
            <button className="primary" onClick={() => void savePackage()} disabled={Boolean(busyAction)}>
              {busyAction === 'save' ? t('common.saving') : t('delivery.savePackage')}
            </button>
          </div>

          {lastExport && (
            <div className="export-result-card">
              <strong>{t('delivery.exported')}</strong>
              <small>Markdown：{lastExport.markdownPath}</small>
              <small>JSON：{lastExport.jsonPath}</small>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
