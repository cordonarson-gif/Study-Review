import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n';
import type { StageReport } from '../../lib/types';

type StageReportPageProps = {
  reports: StageReport[];
  onGenerate: () => Promise<StageReport[]>;
  onSave: (report: StageReport) => Promise<StageReport[]>;
  onChange: (reports: StageReport[]) => void;
  onStatus?: (message: string) => void;
};

export function StageReportPage({
  reports,
  onGenerate,
  onSave,
  onChange,
  onStatus
}: StageReportPageProps) {
  const { t } = useT();
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? '');
  const [draft, setDraft] = useState<StageReport | null>(reports[0] ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = reports.find((report) => report.id === selectedId) ?? reports[0] ?? null;
    setSelectedId(next?.id ?? '');
    setDraft(next);
  }, [reports, selectedId]);

  const selectedIndex = useMemo(() => reports.findIndex((report) => report.id === draft?.id), [reports, draft?.id]);

  async function generateReport() {
    setBusy(true);
    try {
      const next = await onGenerate();
      onChange(next);
      onStatus?.(t('report.reportGenerated'));
    } finally {
      setBusy(false);
    }
  }

  async function saveReport() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onSave(draft);
      onChange(next);
      onStatus?.(t('report.reportSaved'));
    } finally {
      setBusy(false);
    }
  }

  function patchDraft(patch: Partial<StageReport>) {
    if (!draft) return;
    const nextDraft = { ...draft, ...patch };
    setDraft(nextDraft);
    if (selectedIndex >= 0) {
      onChange(reports.map((report, index) => index === selectedIndex ? nextDraft : report));
    }
  }

  return (
    <section className="panel stage-report-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('report.title')}</div>
          <h3>{t('report.subtitle')}</h3>
          <p className="muted">{t('report.desc')}</p>
        </div>
        <button className="primary" onClick={() => void generateReport()} disabled={busy}>
          {busy ? t('report.generating') : t('report.generateReport')}
        </button>
      </div>

      <div className="stage-report-grid">
        <aside className="stage-report-list">
          <div className="resource-library-header">
            <div>
              <div className="subsection-title">{t('report.historyReports')}</div>
              <span className="muted">{reports.length} {t('report.reportCount', { count: reports.length }).replace(`${reports.length} `, '')}</span>
            </div>
          </div>
          {reports.length ? reports.map((report) => (
            <button
              key={report.id}
              className={report.id === draft?.id ? 'resource-library-card active' : 'resource-library-card'}
              onClick={() => {
                setSelectedId(report.id);
                setDraft(report);
              }}
            >
              <strong>{report.title}</strong>
              <small>{report.summary}</small>
              <em>{new Date(report.updatedAt).toLocaleString('zh-CN')}</em>
            </button>
          )) : <div className="empty-slim">{t('report.emptyHint')}</div>}
        </aside>

        <div className="stage-report-editor">
          {draft ? (
            <>
              <label>
                {t('report.reportTitle')}
                <input value={draft.title} onChange={(event) => patchDraft({ title: event.target.value })} />
              </label>
              <label>
                {t('report.summary')}
                <textarea value={draft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} />
              </label>

              <div className="stage-report-section-list">
                {draft.sections.map((section, index) => (
                  <article className="stage-report-section" key={`${section.title}-${index}`}>
                    <div className="subsection-title">{section.title}</div>
                    <pre>{section.contentMarkdown}</pre>
                  </article>
                ))}
              </div>

              <div className="learning-path-bottom-grid">
                <div className="mini-section">
                  <div className="subsection-title">{t('report.nextActions')}</div>
                  <ul>
                    {draft.nextActions.map((action) => <li key={action}>{action}</li>)}
                  </ul>
                </div>
                <div className="mini-section">
                  <div className="subsection-title">{t('report.riskReminder')}</div>
                  <ul>
                    {draft.risks.map((risk) => <li key={risk}>{risk}</li>)}
                  </ul>
                </div>
              </div>

              <div className="panel-actions horizontal">
                <button className="primary" onClick={() => void saveReport()} disabled={busy}>{t('report.saveReport')}</button>
              </div>
            </>
          ) : (
            <div className="empty-slim">{t('report.firstReportHint')}</div>
          )}
        </div>
      </div>
    </section>
  );
}
