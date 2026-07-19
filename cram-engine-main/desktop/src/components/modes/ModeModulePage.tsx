import { useEffect, useMemo, useState } from 'react';
import type { GenerateModeArtifactInput, ModeArtifact, WorkspaceTabId, WorkspaceTabTemplate } from '../../lib/types';
import { useT } from '../../i18n';
import { RichMathContent } from '../RichMathContent';

type ArtifactView = 'preview' | 'edit';

type ModeModulePageProps = {
  tab: WorkspaceTabTemplate;
  artifacts: ModeArtifact[];
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onSave: (artifact: ModeArtifact) => Promise<ModeArtifact[]>;
  onDelete: (artifactId: string) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

// 从成果标题中提取关键字（取 trim 后最后一个字符），用于卡片左侧色块图标。
// 例："大纲草稿" -> "稿"、"组卷" -> "卷"、"批改建议" -> "议"。
function extractKeyChar(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '稿';
  return trimmed[trimmed.length - 1];
}

const generatePromptKeys: Partial<Record<WorkspaceTabId, string>> = {
  'paper-overview': 'mode.paperOverviewPrompt',
  'paper-literature': 'mode.paperLiteraturePrompt',
  'paper-outline': 'mode.paperOutlinePrompt',
  'paper-chapters': 'mode.paperChaptersPrompt',
  'paper-methods': 'mode.paperMethodsPrompt',
  'paper-innovation': 'mode.paperInnovationPrompt',
  'paper-format': 'mode.paperFormatPrompt',
  'paper-defense': 'mode.paperDefensePrompt',
  'assignment-overview': 'mode.assignmentOverviewPrompt',
  'assignment-bank': 'mode.assignmentBankPrompt',
  'assignment-paper': 'mode.assignmentPaperPrompt',
  'assignment-online-quiz': 'mode.assignmentOnlineQuizPrompt',
  'assignment-grading': 'mode.assignmentGradingPrompt',
  'assignment-wrong-answers': 'mode.assignmentWrongAnswersPrompt',
  'assignment-feedback': 'mode.assignmentFeedbackPrompt'
};

export function ModeModulePage({ tab, artifacts, onGenerate, onSave, onDelete, onChange, onStatus }: ModeModulePageProps) {
  const { t } = useT();
  const generatePromptKey = generatePromptKeys[tab.id] ?? 'mode.generatePrompt';
  const tabArtifacts = useMemo(() => artifacts.filter((artifact) => artifact.tabId === tab.id), [artifacts, tab.id]);
  const [selectedId, setSelectedId] = useState(tabArtifacts[0]?.id ?? '');
  const [draft, setDraft] = useState<ModeArtifact | null>(tabArtifacts[0] ?? null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [artifactView, setArtifactView] = useState<ArtifactView>('preview');

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
      if (newestArtifact) {
        setSelectedId(newestArtifact.id);
        setDraft(newestArtifact);
        setArtifactView('preview');
      }
      onStatus?.(newestArtifact?.source === 'agent' ? t('mode.generated') : t('mode.localGenerated'));
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
      onStatus?.(t('mode.saved'));
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
      onStatus?.(t('mode.deleted'));
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
          <p className="muted">{t(generatePromptKey)}</p>
        </div>
        <button className="primary" onClick={() => void generateArtifact()} disabled={busy}>
          {busy ? t('common.generating') : t('mode.generateResult')}
        </button>
      </div>

      <div className="mode-generation-panel">
        <label className="mode-form-field wide">
          {t('mode.generateRequirements')}
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={t('mode.generatePlaceholder')}
          />
        </label>
      </div>

      <div className="mode-artifact-grid">
        <aside className="mode-artifact-list">
          <div className="subsection-title">{t('mode.resultLibrary')}</div>
          {tabArtifacts.length ? tabArtifacts.map((artifact) => (
            <button
              key={artifact.id}
              className={`resource-library-card mode-artifact-card${artifact.id === draft?.id ? ' active' : ''}`}
              onClick={() => {
                setSelectedId(artifact.id);
                setDraft(artifact);
                setArtifactView('preview');
              }}
            >
              <span className="mode-artifact-icon" aria-hidden="true">{extractKeyChar(artifact.title)}</span>
              <span className="mode-artifact-text">
                <strong>{artifact.title}</strong>
                <small>{artifact.kind} · {t(`mode.${artifact.source === 'agent' ? 'aiGenerated' : artifact.source === 'fallback' ? 'localTemplate' : 'manualEdit'}`)} · {new Date(artifact.updatedAt).toLocaleString('zh-CN')}</small>
              </span>
            </button>
          )) : <div className="empty-slim">{t('mode.noResults')}</div>}
        </aside>

        <div className="mode-artifact-editor">
          {draft ? (
            <>
              <div className="mode-artifact-toolbar">
                <strong>{draft.title}</strong>
                <div className="segmented-control" aria-label={t('mode.contentView')}>
                  <button className={artifactView === 'preview' ? 'active' : ''} onClick={() => setArtifactView('preview')}>
                    {t('common.preview')}
                  </button>
                  <button className={artifactView === 'edit' ? 'active' : ''} onClick={() => setArtifactView('edit')}>
                    {t('common.edit')}
                  </button>
                </div>
              </div>
              {artifactView === 'edit' ? (
                <>
                  <label className="mode-form-field">
                    {t('mode.titleField')}
                    <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                  </label>
                  <label className="mode-form-field wide">
                    {t('mode.markdownContent')}
                    <textarea value={draft.contentMarkdown} onChange={(event) => setDraft({ ...draft, contentMarkdown: event.target.value })} />
                  </label>
                </>
              ) : (
                <div className="mode-artifact-preview">
                  <RichMathContent content={draft.contentMarkdown} className="rich-math-content" />
                </div>
              )}
              <div className="panel-actions horizontal">
                <button className="primary" onClick={() => void saveArtifact()} disabled={busy}>{t('mode.saveResult')}</button>
                <button onClick={() => void deleteArtifact()} disabled={busy}>{t('mode.deleteResult')}</button>
              </div>
            </>
          ) : <div className="empty-slim">{t('mode.selectOrGenerate')}</div>}
        </div>
      </div>
    </section>
  );
}
