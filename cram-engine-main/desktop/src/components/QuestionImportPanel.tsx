/**
 * QuestionImportPanel — 多格式题目录入面板
 * 支持三个入口：文本粘贴、文件上传、图片 OCR
 * 统一汇聚到题目预览修正区，确认后入库
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { shouldPromptForAnswerlessImport } from '../lib/questionImportPolicy';
import type { ImportTab, QuestionDraft, QuestionImportPreviewResult, ReviewQuestion } from '../lib/types';
import { useT } from '../i18n';
import { RichMathContent } from './RichMathContent';

type Props = {
  activeProjectId: string;
  /** 确认入库后回调，返回更新后的题目列表 */
  onQuestionsAdded: (questions: ReviewQuestion[]) => void;
  /** 通知父组件状态变更 */
  onStatus: (msg: string) => void;
  onOpenProviderSettings: () => void;
};

type StoredImportSession = {
  textInput: string;
  questionBankName: string;
  drafts: QuestionDraft[];
  aiStatus: QuestionImportPreviewResult['aiStatus'];
  failures: QuestionImportPreviewResult['failures'];
  warnings: string[];
};

function loadImportSession(projectId: string): StoredImportSession | null {
  try {
    const value = sessionStorage.getItem(`question-import:${projectId}`);
    return value ? JSON.parse(value) as StoredImportSession : null;
  } catch {
    return null;
  }
}

export default function QuestionImportPanel({ activeProjectId, onQuestionsAdded, onStatus, onOpenProviderSettings }: Props) {
  const { t } = useT();
  const stored = useMemo(() => loadImportSession(activeProjectId), [activeProjectId]);
  const defaultBankName = t('import.defaultBankName');
  const previousDefaultBankName = useRef(defaultBankName);
  const [activeTab, setActiveTab] = useState<ImportTab>('text');
  const [textInput, setTextInput] = useState(stored?.textInput ?? '');
  const [questionBankName, setQuestionBankName] = useState(stored?.questionBankName ?? defaultBankName);
  const [drafts, setDrafts] = useState<QuestionDraft[]>(stored?.drafts ?? []);
  const [aiStatus, setAiStatus] = useState<QuestionImportPreviewResult['aiStatus']>(stored?.aiStatus ?? 'not-needed');
  const [failures, setFailures] = useState<QuestionImportPreviewResult['failures']>(stored?.failures ?? []);
  const [warnings, setWarnings] = useState<string[]>(stored?.warnings ?? []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [showMissingAnswerConfirm, setShowMissingAnswerConfirm] = useState(false);

  useEffect(() => {
    setQuestionBankName((current) => current === previousDefaultBankName.current ? defaultBankName : current);
    previousDefaultBankName.current = defaultBankName;
  }, [defaultBankName]);

  useEffect(() => {
    const session: StoredImportSession = { textInput, questionBankName, drafts, aiStatus, failures, warnings };
    sessionStorage.setItem(`question-import:${activeProjectId}`, JSON.stringify(session));
  }, [activeProjectId, aiStatus, drafts, failures, questionBankName, textInput, warnings]);

  function withQuestionBank(items: QuestionDraft[], fallbackName = questionBankName) {
    const bankName = (fallbackName || questionBankName || defaultBankName).trim();
    return items.map((draft) => ({
      ...draft,
      questionBankName: bankName,
      questionBankId: undefined,
      sourceName: draft.sourceName || bankName
    }));
  }

  function applyPreviewResult(result: QuestionImportPreviewResult, append: boolean) {
    setDrafts((previous) => append ? [...previous, ...result.drafts] : result.drafts);
    setAiStatus(result.aiStatus);
    setFailures(result.failures);
    setWarnings(result.warnings);
    onStatus(t('import.recognized', { total: result.summary.total, needsReview: result.summary.needsReview }));
  }

  /** 文本粘贴 → 解析预览 */
  async function handleTextPreview() {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    setProcessingStage(t('import.textProcessing'));
    try {
      const result = await window.cramEngine.previewQuestionImport({
        projectId: activeProjectId,
        kind: 'text',
        text: textInput,
        sourceName: t('import.sourceText'),
        questionBankName
      });
      applyPreviewResult(result, false);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t('import.parseFailed'));
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }

  /** 文件上传 → 解析预览 */
  async function handleFileImport() {
    const selected = await window.cramEngine.selectUploadFiles();
    if (!selected.length) return;
    setIsProcessing(true);
    setProcessingStage(t('import.fileProcessing'));
    try {
      const result = await window.cramEngine.previewQuestionImport({
        projectId: activeProjectId,
        kind: 'file',
        filePaths: selected,
        questionBankName
      });
      applyPreviewResult(result, true);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t('import.fileParseFailed'));
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }

  /** 图片上传 → OCR 解析 → 题目识别 */
  async function handleImageImport() {
    const selected = await window.cramEngine.selectUploadFiles();
    if (!selected.length) return;
    setIsProcessing(true);
    setProcessingStage(t('import.imageProcessing'));
    try {
      const result = await window.cramEngine.previewQuestionImport({
        projectId: activeProjectId,
        kind: 'image',
        filePaths: selected,
        questionBankName
      });
      applyPreviewResult(result, true);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t('import.imageParseFailed'));
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }

  /** 更新单道草稿 */
  function updateDraft(index: number, patch: Partial<QuestionDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<QuestionDraft['options'][number]>) {
    setDrafts((previous) => previous.map((draft, index) => index === questionIndex
      ? { ...draft, options: draft.options.map((option, current) => current === optionIndex ? { ...option, ...patch } : option) }
      : draft));
  }

  function addOption(questionIndex: number) {
    setDrafts((previous) => previous.map((draft, index) => {
      if (index !== questionIndex) return draft;
      const key = String.fromCharCode(65 + Math.min(draft.options.length, 7));
      return { ...draft, options: [...draft.options, { key, text: '' }] };
    }));
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setDrafts((previous) => previous.map((draft, index) => index === questionIndex
      ? { ...draft, options: draft.options.filter((_, current) => current !== optionIndex) }
      : draft));
  }

  /** 删除单道草稿 */
  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmImport() {
    try {
      const questions = await window.cramEngine.addQuestions(activeProjectId, withQuestionBank(drafts));
      onQuestionsAdded(questions);
      setDrafts([]);
      setTextInput('');
      setFailures([]);
      setWarnings([]);
      sessionStorage.removeItem(`question-import:${activeProjectId}`);
      onStatus(t('import.imported', { count: drafts.length, name: questionBankName || t('import.defaultBankName') }));
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t('import.importFailed'));
    }
  }

  async function retryFailedSources() {
    const filePaths = failures.map((failure) => failure.sourcePath).filter((value): value is string => Boolean(value));
    if (!filePaths.length) return;
    setIsProcessing(true);
    setProcessingStage(t('import.retrying'));
    try {
      const result = await window.cramEngine.previewQuestionImport({
        projectId: activeProjectId,
        kind: activeTab === 'image' ? 'image' : 'file',
        filePaths,
        questionBankName
      });
      applyPreviewResult(result, true);
    } catch (error) {
      onStatus(error instanceof Error ? error.message : t('import.retryFailedMsg'));
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  }

  function handleConfirm() {
    if (!drafts.length) return;
    if (shouldPromptForAnswerlessImport(drafts, aiStatus)) {
      setShowMissingAnswerConfirm(true);
      return;
    }
    void confirmImport();
  }

  function handleOpenProviderSettings() {
    setShowMissingAnswerConfirm(false);
    onOpenProviderSettings();
  }

  const tabConfig: { key: ImportTab; label: string; icon: string; desc: string }[] = [
    { key: 'text', label: t('import.textPaste'), icon: '📝', desc: t('import.textDesc') },
    { key: 'file', label: t('import.fileUpload'), icon: '📁', desc: t('import.fileDesc') },
    { key: 'image', label: t('import.imageOCR'), icon: '🖼️', desc: t('import.imageDesc') }
  ];

  return (
    <div className="import-page">
      <div className="section-title">{t('import.title')}</div>
      {isProcessing && <div className="import-processing" role="status">{processingStage}</div>}

      {/* Tab 切换 */}
      <div className="import-tabs">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <label className="question-draft-field wide">
        {t('import.bankName')}
        <input
          value={questionBankName}
          onChange={(e) => setQuestionBankName(e.target.value)}
          placeholder={t('import.bankNamePlaceholder')}
        />
      </label>

      <div className="import-content">
        {activeTab === 'text' && (
          <div className="import-text-panel">
            <p className="muted">{tabConfig[0].desc}</p>
            <textarea
              className="import-textarea"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t('import.textPlaceholder')}
            />
            <button
              className="primary"
              onClick={handleTextPreview}
              disabled={isProcessing || !textInput.trim()}
            >
              {isProcessing ? t('import.recognizing') : t('import.recognizeAndPreview')}
            </button>
          </div>
        )}

        {activeTab === 'file' && (
          <div className="file-drop-zone" onClick={handleFileImport}>
            <span style={{ fontSize: '40px' }}>📁</span>
            <strong>{t('import.selectFile')}</strong>
            <p className="muted">{tabConfig[1].desc}</p>
            <button disabled={isProcessing}>
              {isProcessing ? t('import.parsingFile') : t('import.selectFileBtn')}
            </button>
          </div>
        )}

        {activeTab === 'image' && (
          <div className="file-drop-zone" onClick={handleImageImport}>
            <span style={{ fontSize: '40px' }}>🖼️</span>
            <strong>{t('import.selectImage')}</strong>
            <p className="muted">{tabConfig[2].desc}</p>
            <button disabled={isProcessing}>
              {isProcessing ? t('import.ocrRecognizing') : t('import.selectImageBtn')}
            </button>
          </div>
        )}
      </div>

      {(failures.length > 0 || warnings.length > 0) && (
        <div className="import-result-notice">
          <strong>{t('import.resultNotice')}</strong>
          {failures.map((failure) => <div key={failure.sourceName}>{failure.sourceName}：{failure.message}</div>)}
          {warnings.slice(0, 6).map((warning) => <div key={warning}>{warning}</div>)}
          {failures.some((failure) => failure.sourcePath) && (
            <button type="button" onClick={() => void retryFailedSources()} disabled={isProcessing}>{t('import.retryFailed')}</button>
          )}
        </div>
      )}

      {/* 题目预览与修正区 */}
      <div className="draft-preview-stack">
        <div className="draft-preview-header">
          <div className="draft-preview-header-left">
            <strong>{t('import.previewTitle')}</strong>
            <span className="muted">{t('import.pendingImport', { count: drafts.length })}</span>
          </div>
          {drafts.length > 0 && (
            <div className="draft-actions">
              <button onClick={() => setDrafts([])}>{t('import.clearAll')}</button>
              <button className="primary" onClick={handleConfirm}>
                {t('import.confirmImport', { count: drafts.length })}
              </button>
            </div>
          )}
        </div>

        {drafts.length ? (
          drafts.map((draft, index) => (
            <div key={`draft-${index}`} className="draft-card">
              <div className="draft-card-header">
                <span className="draft-card-number">
                  {t('import.questionNum', { num: index + 1 })} · {draft.source === 'image' ? t('import.imageSource') : draft.source === 'file' ? t('import.fileSource') : t('import.textSource')}
                </span>
                <div className="draft-status-badges">
                  <span className={`draft-status ${draft.reviewStatus === 'needs-review' ? 'warning' : ''}`}>
                    {draft.reviewStatus === 'needs-review' ? t('import.needsReview') : t('import.ready')}
                  </span>
                  <span className="draft-status">
                    {draft.answerSource === 'question-bank' ? t('import.bankAnswer') : draft.answerSource === 'ai-inferred' ? t('import.aiInferred') : draft.answerSource === 'manual' ? t('import.manualFixed') : t('import.noAnswer')}
                  </span>
                </div>
                <button className="draft-remove-button" onClick={() => removeDraft(index)}>
                  {t('import.removeDraft')}
                </button>
              </div>

              <label className="question-draft-field wide">
                {t('import.stem')}
                <textarea
                  rows={2}
                  value={draft.stem}
                  onChange={(e) => updateDraft(index, { stem: e.target.value })}
                />
              </label>

              {(draft.questionType === '单选题' || draft.questionType === '多选题' || draft.options.length > 0) && (
                <div className="draft-options-editor">
                  <div className="draft-options-header">
                    <strong>{t('import.options')}</strong>
                    <button type="button" onClick={() => addOption(index)}>{t('import.addOption')}</button>
                  </div>
                  {draft.options.map((option, optionIndex) => (
                    <div className="draft-option-row" key={`${index}-${optionIndex}`}>
                      <input
                        className="draft-option-key"
                        aria-label={t('import.optionKeyAria', { num: index + 1 })}
                        value={option.key}
                        maxLength={1}
                        onChange={(event) => updateOption(index, optionIndex, { key: event.target.value.toUpperCase() })}
                      />
                      <input
                        aria-label={t('import.optionTextAria', { num: index + 1, key: option.key })}
                        value={option.text}
                        onChange={(event) => updateOption(index, optionIndex, { text: event.target.value })}
                      />
                      <button type="button" title={t('import.deleteOption')} onClick={() => removeOption(index, optionIndex)}>{t('common.delete')}</button>
                    </div>
                  ))}
                </div>
              )}

              {draft.parseWarnings?.length ? (
                <div className="draft-warning-list">
                  {draft.parseWarnings.map((warning) => <span key={warning}>{warning}</span>)}
                </div>
              ) : null}

              <div className="draft-card-row">
                <label className="question-draft-field">
                  {t('import.questionBank')}
                  <input value={draft.questionBankName || questionBankName} onChange={(e) => updateDraft(index, { questionBankName: e.target.value })} />
                </label>
                <label className="question-draft-field">
                  {t('import.knowledgePoint')}
                  <input value={draft.knowledgePoint} onChange={(e) => updateDraft(index, { knowledgePoint: e.target.value, category: `${e.target.value} / ${draft.questionType}` })} />
                </label>
                <label className="question-draft-field">
                  {t('import.questionType')}
                  <input value={draft.questionType} onChange={(e) => updateDraft(index, { questionType: e.target.value, category: `${draft.knowledgePoint} / ${e.target.value}` })} />
                </label>
                <label className="question-draft-field">
                  {t('import.category')}
                  <input value={draft.category} onChange={(e) => updateDraft(index, { category: e.target.value })} />
                </label>
                <label className="question-draft-field">
                  {t('import.answer')}
                  <input value={draft.answer} onChange={(e) => updateDraft(index, {
                    answer: e.target.value,
                    answerSource: e.target.value.trim() ? 'manual' : 'missing',
                    reviewStatus: e.target.value.trim() ? 'ready' : 'needs-review',
                    parseWarnings: e.target.value.trim()
                      ? (draft.parseWarnings ?? []).filter((warning) => !/答案/.test(warning))
                      : Array.from(new Set([...(draft.parseWarnings ?? []), '未识别到答案']))
                  })} />
                </label>
              </div>

              <label className="question-draft-field wide">
                {t('import.explanation')}
                <textarea
                  rows={2}
                  value={draft.explanation}
                  onChange={(e) => updateDraft(index, { explanation: e.target.value })}
                />
              </label>

              <section className="draft-rendered-preview" aria-label={t('import.displayPreview')}>
                <div className="subsection-title">{t('import.displayPreview')}</div>
                <RichMathContent content={draft.stem} className="rich-math-content draft-preview-stem" />
                {draft.options.length > 0 && (
                  <div className="draft-preview-options">
                    {draft.options.map((option) => (
                      <div className="draft-preview-option" key={`preview-${index}-${option.key}`}>
                        <strong>{option.key}</strong>
                        <RichMathContent content={option.text} inline className="rich-math-content" />
                      </div>
                    ))}
                  </div>
                )}
                {draft.answer && (
                  <div className="draft-preview-answer">
                    <span>{t('import.answer')}</span>
                    <RichMathContent content={draft.answer} inline className="rich-math-content" />
                  </div>
                )}
                {draft.explanation && (
                  <RichMathContent content={draft.explanation} className="rich-math-content draft-preview-explanation" />
                )}
              </section>
            </div>
          ))
        ) : (
          <div className="muted" style={{ padding: '20px', textAlign: 'center' }}>
            {t('import.noPreview')}
          </div>
        )}

      </div>

      {showMissingAnswerConfirm && (
        <div className="import-confirm-overlay" role="presentation">
          <div className="import-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="missing-answer-title">
            <h3 id="missing-answer-title">{t('import.missingAnswerTitle')}</h3>
            <p>{t('import.missingAnswerDesc')}</p>
            <div className="import-confirm-actions">
              <button className="primary" onClick={() => { setShowMissingAnswerConfirm(false); void confirmImport(); }}>{t('common.confirm')}</button>
              <button onClick={handleOpenProviderSettings}>{t('import.connectApi')}</button>
              <button onClick={() => setShowMissingAnswerConfirm(false)}>{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
