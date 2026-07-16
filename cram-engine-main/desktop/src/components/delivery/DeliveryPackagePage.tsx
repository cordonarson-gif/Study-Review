import { useEffect, useMemo, useState } from 'react';
import type { DeliveryPackage, DeliveryPackageItemStatus, ExportResult } from '../../lib/types';

type DeliveryPackagePageProps = {
  deliveryPackage: DeliveryPackage | null;
  onGenerate: () => Promise<DeliveryPackage>;
  onSave: (deliveryPackage: DeliveryPackage) => Promise<DeliveryPackage>;
  onExport: () => Promise<ExportResult>;
  onChange: (deliveryPackage: DeliveryPackage) => void;
  onStatus?: (message: string) => void;
};

const statusLabels: Record<DeliveryPackageItemStatus, string> = {
  ready: '可交付',
  'needs-review': '待复核',
  missing: '待补充'
};

const statusHints: Record<DeliveryPackageItemStatus, string> = {
  ready: '内容已具备导出条件',
  'needs-review': '建议人工确认后再导出',
  missing: '需要回到对应页面补充'
};

function createManualFallbackPackage(): DeliveryPackage {
  const now = new Date().toISOString();
  return {
    version: 1,
    title: '项目成果交付包',
    summary: '点击“生成交付包”后，系统会根据当前项目资料自动建立交付清单。',
    items: [],
    checklist: ['资料包已复核', '报告包已复核', '题库包已复核', '知识库已复核', '导出文件已生成'],
    exportNotes: '生成后可在此补充备注，再导出 Markdown 和 JSON。',
    source: 'manual',
    createdAt: now,
    updatedAt: now
  };
}

export function DeliveryPackagePage({
  deliveryPackage,
  onGenerate,
  onSave,
  onExport,
  onChange,
  onStatus
}: DeliveryPackagePageProps) {
  const [draft, setDraft] = useState<DeliveryPackage>(deliveryPackage ?? createManualFallbackPackage());
  const [busyAction, setBusyAction] = useState<'generate' | 'save' | 'export' | null>(null);
  const [lastExport, setLastExport] = useState<ExportResult | null>(null);

  useEffect(() => {
    setDraft(deliveryPackage ?? createManualFallbackPackage());
  }, [deliveryPackage]);

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
      onStatus?.('成果交付包已生成');
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
      onStatus?.('成果交付包已保存');
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
      onStatus?.(`成果交付包已导出：${result.markdownPath}`);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="panel delivery-package-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">成果交付</div>
          <h3>把资料、报告、题库、知识库和学习路径整理成可导出的交付包</h3>
          <p className="muted">DeliveryAgent 会读取当前项目状态，生成一份可编辑、可复核、可导出的交付清单。</p>
        </div>
        <div className="panel-actions horizontal">
          <button className="primary" onClick={() => void generatePackage()} disabled={Boolean(busyAction)}>
            {busyAction === 'generate' ? '生成中…' : '生成交付包'}
          </button>
          <button onClick={() => void exportPackage()} disabled={Boolean(busyAction)}>
            {busyAction === 'export' ? '导出中…' : '导出交付包'}
          </button>
        </div>
      </div>

      <div className="delivery-summary-grid">
        <div className="metric-card">
          <strong>{summaryStats.ready}</strong>
          <span>可交付</span>
        </div>
        <div className="metric-card">
          <strong>{summaryStats.review}</strong>
          <span>待复核</span>
        </div>
        <div className="metric-card">
          <strong>{summaryStats.missing}</strong>
          <span>待补充</span>
        </div>
        <div className="metric-card">
          <strong>{summaryStats.total}</strong>
          <span>交付项</span>
        </div>
      </div>

      <div className="delivery-editor-grid">
        <div className="delivery-main-panel">
          <div className="profile-inline-fields">
            <label>
              交付包标题
              <input value={draft.title} onChange={(event) => patchDraft({ title: event.target.value })} />
            </label>
            <label>
              来源
              <input value={draft.source === 'agent' ? 'DeliveryAgent 自动生成' : '手动编辑'} readOnly />
            </label>
          </div>
          <label>
            摘要
            <textarea value={draft.summary} onChange={(event) => patchDraft({ summary: event.target.value })} />
          </label>

          <div className="subsection-title">交付清单</div>
          <div className="delivery-item-grid">
            {draft.items.length ? draft.items.map((item) => (
              <article className={`delivery-item-card ${item.status}`} key={item.id}>
                <div className="delivery-item-card-header">
                  <div>
                    <span className="upload-kind">{item.type}</span>
                    <h4>{item.title}</h4>
                  </div>
                  <span className="delivery-status-pill">{statusLabels[item.status]}</span>
                </div>
                <p>{item.description}</p>
                <small>{statusHints[item.status]} · 来源 {item.sourceIds.length} 项</small>
                <ul>
                  {item.checklist.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              </article>
            )) : (
              <div className="empty-slim">暂无交付清单，点击“生成交付包”后会自动整理资料包、报告包、题库包等内容。</div>
            )}
          </div>
        </div>

        <aside className="delivery-checklist-panel">
          <div className="subsection-title">交付清单复核</div>
          <ul>
            {draft.checklist.map((entry) => <li key={entry}>{entry}</li>)}
          </ul>

          <label>
            导出备注
            <textarea value={draft.exportNotes} onChange={(event) => patchDraft({ exportNotes: event.target.value })} />
          </label>

          <div className="panel-actions">
            <button className="primary" onClick={() => void savePackage()} disabled={Boolean(busyAction)}>
              {busyAction === 'save' ? '保存中…' : '保存交付包'}
            </button>
          </div>

          {lastExport && (
            <div className="export-result-card">
              <strong>已导出</strong>
              <small>Markdown：{lastExport.markdownPath}</small>
              <small>JSON：{lastExport.jsonPath}</small>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
