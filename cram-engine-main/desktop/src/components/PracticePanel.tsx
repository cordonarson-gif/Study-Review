import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CategoryTreeNode,
  KnowledgeResource,
  PracticeStats,
  ReviewQuestion
} from '../lib/types';
import {
  buildCategoryTree,
  computePracticeStats,
  getRelatedKnowledgePoints
} from '../lib/questionClassifier';
import {
  buildQuestionBanks,
  filterPracticeQuestions,
  getPracticeCategoryLabel,
  getPracticeQuestionBankId,
  normalizePracticeKnowledgePoint
} from '../lib/practiceSession.js';
import { useT } from '../i18n';
import { RichMathContent } from './RichMathContent';

type PracticeMode = 'category' | 'random' | 'wrong';
type PracticeView = 'practice' | 'ai-generator';

type Props = {
  questions: ReviewQuestion[];
  activeProjectId: string;
  onQuestionsUpdated: (questions: ReviewQuestion[]) => void;
  onStatus: (msg: string) => void;
};

function KnowledgeResourceSection({
  resources,
  onOpen,
  relatedPoints,
  onExploreRelated
}: {
  resources: KnowledgeResource[];
  onOpen: (resource: KnowledgeResource) => void;
  relatedPoints: string[];
  onExploreRelated: (point: string) => void;
}) {
  if (!resources.length && !relatedPoints.length) return null;
  return <KnowledgeResourceInner resources={resources} onOpen={onOpen} relatedPoints={relatedPoints} onExploreRelated={onExploreRelated} />;
}

function KnowledgeResourceInner({ resources, onOpen, relatedPoints, onExploreRelated }: {
  resources: KnowledgeResource[];
  onOpen: (resource: KnowledgeResource) => void;
  relatedPoints: string[];
  onExploreRelated: (point: string) => void;
}) {
  const { t } = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{t('practice.knowledgeExpand')}</strong>
        <span className="muted">{t('practice.knowledgeResourceCount', { count: resources.length })}</span>
      </div>

      {relatedPoints.length > 0 && (
        <div>
          <span className="muted" style={{ fontSize: '12px' }}>{t('practice.relatedPoints')}</span>
          <div className="related-points" style={{ marginTop: '4px' }}>
            {relatedPoints.map((point) => (
              <button key={point} onClick={() => onExploreRelated(point)}>
                {point}
              </button>
            ))}
          </div>
        </div>
      )}

      {resources.length > 0 && (
        <div className="resource-grid">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={`resource-card ${resource.read ? 'read' : ''}`}
              onClick={() => onOpen(resource)}
            >
              <span className={`platform-badge ${resource.platform}`}>
                {resource.platform === 'bilibili' && t('practice.bilibi')}
                {resource.platform === 'douyin' && t('practice.douyin')}
                {resource.platform === 'web' && t('practice.web')}
              </span>
              <h4>{resource.title}</h4>
              <p>{resource.description}</p>
              {resource.read && <span className="read-badge">{t('practice.viewed')}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PracticePanel({ questions, activeProjectId, onQuestionsUpdated, onStatus }: Props) {
  const { t } = useT();
  const [practiceView, setPracticeView] = useState<PracticeView>('practice');
  const [mode, setMode] = useState<PracticeMode>('category');
  const [selectedQuestionBank, setSelectedQuestionBank] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('ALL_CATEGORIES');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [selectedKey, setSelectedKey] = useState('');
  const [answered, setAnswered] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [knowledgeResources, setKnowledgeResources] = useState<KnowledgeResource[]>([]);
  const [aiRequirements, setAiRequirements] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiQuestionBankName, setAiQuestionBankName] = useState('');
  const [useCurrentAsReference, setUseCurrentAsReference] = useState(true);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [bankManagementOpen, setBankManagementOpen] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<string>>(new Set());
  const [isDeletingBanks, setIsDeletingBanks] = useState(false);

  const questionBanks = useMemo(() => buildQuestionBanks(questions), [questions]);
  const bankQuestions = useMemo(() => {
    if (selectedQuestionBank === 'all') return questions;
    return questions.filter((question) => getPracticeQuestionBankId(question) === selectedQuestionBank);
  }, [questions, selectedQuestionBank]);

  const categoryTree = useMemo<CategoryTreeNode[]>(() => buildCategoryTree(bankQuestions), [bankQuestions]);

  const categoryLabels = useMemo<string[]>(() => {
    const labels = new Set<string>(['ALL_CATEGORIES']);
    for (const knowledgePoint of categoryTree) {
      labels.add(knowledgePoint.name);
      for (const questionType of knowledgePoint.children) {
        labels.add(`${knowledgePoint.name} / ${questionType.name}`);
      }
    }
    return Array.from(labels);
  }, [categoryTree]);

  const filteredQuestions = useMemo<ReviewQuestion[]>(() => {
    return filterPracticeQuestions(questions, {
      mode,
      selectedQuestionBank,
      selectedCategory,
      shuffleSeed
    });
  }, [questions, mode, selectedQuestionBank, selectedCategory, shuffleSeed]);

  const stats = useMemo<PracticeStats>(() => computePracticeStats(filteredQuestions), [filteredQuestions]);

  const relatedPoints = useMemo<string[]>(() => {
    const currentQuestion = filteredQuestions[currentIndex];
    if (!currentQuestion) return [];
    return getRelatedKnowledgePoints(normalizePracticeKnowledgePoint(currentQuestion), categoryTree);
  }, [filteredQuestions, currentIndex, categoryTree]);

  const currentQuestion = filteredQuestions[currentIndex] ?? null;

  const resetAnswerState = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSelectedKey('');
    setAnswered(false);
    setAnswerVisible(false);
  }, []);

  useEffect(() => {
    setCurrentIndex(0);
    resetAnswerState();
  }, [mode, selectedQuestionBank, selectedCategory, resetAnswerState]);

  useEffect(() => {
    if (selectedQuestionBank !== 'all' && !questionBanks.some((bank) => bank.id === selectedQuestionBank)) {
      setSelectedQuestionBank('all');
      setSelectedCategory('ALL_CATEGORIES');
    }
  }, [questionBanks, selectedQuestionBank]);

  useEffect(() => {
    resetAnswerState();
  }, [currentIndex, resetAnswerState]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentQuestion) {
      setKnowledgeResources([]);
      return;
    }

    window.cramEngine
      .getKnowledgeResources(activeProjectId, normalizePracticeKnowledgePoint(currentQuestion))
      .then(setKnowledgeResources)
      .catch(() => setKnowledgeResources([]));
  }, [currentQuestion?.id, activeProjectId]);

  const goNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
    }
  }, [currentIndex, filteredQuestions.length]);

  const goPrev = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
    }
  }, [currentIndex]);

  async function toggleWrong() {
    if (!currentQuestion) return;
    const updatedQuestion: ReviewQuestion = {
      ...currentQuestion,
      wrong: !currentQuestion.wrong,
      attempts: currentQuestion.attempts + 1
    };
    const nextQuestions = await window.cramEngine.updateQuestion(activeProjectId, updatedQuestion);
    onQuestionsUpdated(nextQuestions);
  }

  async function toggleFavorite() {
    if (!currentQuestion) return;
    const nextQuestions = await window.cramEngine.updateQuestion(activeProjectId, {
      ...currentQuestion,
      favorite: !currentQuestion.favorite
    });
    onQuestionsUpdated(nextQuestions);
  }

  async function openResource(resource: KnowledgeResource) {
    try {
      await window.cramEngine.openKnowledgeResource(activeProjectId, resource);
      setKnowledgeResources((current) =>
        current.map((item) => (item.id === resource.id ? { ...item, read: true } : item))
      );
    } catch {
      window.open(resource.url, '_blank');
    }
  }

  function handleExploreRelated(point: string) {
    setSelectedCategory(point);
    setMode('category');
    onStatus(t('practice.switchedTo', { point }));
  }

  function handleSelectQuestionBank(bankId: string) {
    setSelectedQuestionBank(bankId);
    setSelectedCategory('ALL_CATEGORIES');
    setMode('category');
    onStatus(bankId === 'all' ? t('practice.allBanks') : t('practice.switchedBank', { name: questionBanks.find((bank) => bank.id === bankId)?.name ?? bankId }));
  }

  function handleSelectOption(key: string) {
    if (!currentQuestion || answered) return;
    setSelectedKey(key);
    setAnswered(true);

    if (!currentQuestion.answer.trim()) {
      return;
    }

    const isCorrect = key === currentQuestion.answer;
    if (isCorrect) {
      autoAdvanceTimer.current = setTimeout(() => {
        autoAdvanceTimer.current = null;
        goNext();
      }, 1500);
    }
  }

  function toggleBankSelection(bankId: string) {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(bankId)) {
        next.delete(bankId);
      } else {
        next.add(bankId);
      }
      return next;
    });
  }

  async function handleDeleteBanks() {
    if (selectedBankIds.size === 0) return;
    setIsDeletingBanks(true);
    try {
      const idsToDelete = questions
        .filter((q) => selectedBankIds.has(getPracticeQuestionBankId(q)))
        .map((q) => q.id);
      const deletedCount = selectedBankIds.size;
      const deletedQuestions = idsToDelete.length;

      if (idsToDelete.length === 0) {
        setBankManagementOpen(false);
        setSelectedBankIds(new Set());
        return;
      }

      const nextQuestions = await window.cramEngine.deleteQuestions(activeProjectId, idsToDelete);
      onQuestionsUpdated(nextQuestions);
      setSelectedQuestionBank('all');
      setSelectedCategory('ALL_CATEGORIES');
      setBankManagementOpen(false);
      setSelectedBankIds(new Set());
      onStatus(t('practice.deletedBanks', { banks: deletedCount, questions: deletedQuestions }));
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t('practice.deleteBanksFailed'));
    } finally {
      setIsDeletingBanks(false);
    }
  }

  async function handleGenerateQuestions() {
    const requirements = aiRequirements.trim();
    if (!requirements && !currentQuestion) {
      onStatus(t('practice.generateFirst'));
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const targetBankName = aiQuestionBankName.trim() || t('practice.aiQuestionBankDefault');
      const nextQuestions = await window.cramEngine.generateQuestions(activeProjectId, {
        requirements,
        count: aiCount,
        questionBankName: targetBankName,
        referenceQuestionIds: useCurrentAsReference && currentQuestion ? [currentQuestion.id] : [],
        referenceText: currentQuestion ? currentQuestion.stem : ''
      });
      onQuestionsUpdated(nextQuestions);
      const generatedQuestion = nextQuestions.find((question) => question.questionBankName === targetBankName || question.source === 'ai');
      if (generatedQuestion) {
        setSelectedQuestionBank(getPracticeQuestionBankId(generatedQuestion));
      }
      setSelectedCategory('ALL_CATEGORIES');
      setMode('category');
      setCurrentIndex(0);
      setPracticeView('practice');
      onStatus(t('practice.generatedStatus', { count: Math.min(aiCount, nextQuestions.length), name: targetBankName }));
    } catch (err) {
      onStatus(err instanceof Error ? err.message : t('practice.aiGenerateFailed'));
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  const progressPercent = filteredQuestions.length
    ? Math.round(((currentIndex + 1) / filteredQuestions.length) * 100)
    : 0;

  return (
    <div className="practice-page">
      <div className="section-title">{t('practice.title')}</div>

      <div className="practice-toolbar">
        <button
          className={practiceView === 'practice' && mode === 'category' ? 'active-tab' : ''}
          onClick={() => {
            setPracticeView('practice');
            setMode('category');
          }}
        >
          {t('practice.byCategory')}
        </button>
        <button
          className={practiceView === 'practice' && mode === 'random' ? 'active-tab' : ''}
          onClick={() => {
            setPracticeView('practice');
            setMode('random');
            setShuffleSeed(Date.now());
          }}
        >
          {t('practice.random')}
        </button>
        <button
          className={practiceView === 'practice' && mode === 'wrong' ? 'active-tab' : ''}
          onClick={() => {
            setPracticeView('practice');
            setMode('wrong');
          }}
        >
          {t('practice.wrongOnly')}
        </button>
        <span className="practice-toolbar-spacer" />
        <button
          className={practiceView === 'ai-generator' ? 'active-tab' : ''}
          onClick={() => setPracticeView('ai-generator')}
        >
          {t('practice.aiGenerate')}
        </button>
        <button
          className={bankManagementOpen ? 'active-tab' : ''}
          onClick={() => setBankManagementOpen(true)}
          disabled={questionBanks.length <= 1}
        >
          {t('practice.bankManagement')}
        </button>
      </div>

      {practiceView === 'ai-generator' ? (
        <div className="practice-ai-config-page">
          <div className="ai-question-generator">
            <div className="ai-question-generator-header">
              <div>
                <strong>{t('practice.aiConfigTitle')}</strong>
                <p className="muted">{t('practice.aiConfigDesc')}</p>
              </div>
              <button onClick={() => setPracticeView('practice')}>{t('practice.backToPractice')}</button>
            </div>
            <div className="ai-question-generator-grid">
              <label className="question-draft-field wide">
                {t('practice.requirements')}
                <textarea
                  rows={5}
                  value={aiRequirements}
                  onChange={(e) => setAiRequirements(e.target.value)}
                  placeholder={t('practice.requirementsPlaceholder')}
                />
              </label>
              <label className="question-draft-field">
                {t('practice.bankName')}
                <input value={aiQuestionBankName} onChange={(e) => setAiQuestionBankName(e.target.value)} />
              </label>
              <label className="question-draft-field">
                {t('practice.questionCount')}
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={aiCount}
                  onChange={(e) => setAiCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                />
              </label>
              <label className="ai-reference-toggle">
                <input
                  type="checkbox"
                  checked={useCurrentAsReference}
                  onChange={(e) => setUseCurrentAsReference(e.target.checked)}
                />
                {t('practice.useCurrentAsRef')}
              </label>
              <button className="primary" onClick={handleGenerateQuestions} disabled={isGeneratingQuestions}>
                {isGeneratingQuestions ? t('common.generating') : t('practice.generateAndAdd')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
        <div className="question-bank-sidebar category-sidebar">
          <div className="section-title">{t('practice.questionBank')}</div>
          <div className="question-bank-list">
            {questionBanks.map((bank) => (
              <button
                key={bank.id}
                className={`question-bank-card ${selectedQuestionBank === bank.id ? 'active' : ''}`}
                onClick={() => handleSelectQuestionBank(bank.id)}
              >
                <span>{bank.id === 'all' ? '📚' : '🗂️'} {bank.name}</span>
                <strong>{bank.count}</strong>
              </button>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: '16px' }}>{t('practice.knowledgePointTitle')}</div>
          {categoryLabels.filter((label) => !label.includes(' / ')).map((knowledgePoint) => {
            const node = categoryTree.find((item) => item.name === knowledgePoint);
            const isActive = selectedCategory === knowledgePoint;
            const hasChildren = !!node?.children.length;

            return (
              <div key={knowledgePoint}>
                <div
                  className={`category-node ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCategory(knowledgePoint);
                    setMode('category');
                  }}
                >
                  <span>{knowledgePoint === 'ALL_CATEGORIES' ? '📝' : '📌'} {knowledgePoint === 'ALL_CATEGORIES' ? t('common.all') : knowledgePoint}</span>
                  <span className="badge">{knowledgePoint === 'ALL_CATEGORIES' ? bankQuestions.length : node?.count ?? 0}</span>
                </div>
                {hasChildren && isActive && (
                  <div className="category-children">
                    {node!.children.map((child) => {
                      const childLabel = `${knowledgePoint} / ${child.name}`;
                      const childActive = selectedCategory === childLabel;
                      return (
                        <div
                          key={childLabel}
                          className={`category-node ${childActive ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(childLabel)}
                        >
                          <span>🔹 {child.name}</span>
                          <span className="badge">{child.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="practice-stats-bar">
            <span>📳 {t('practice.totalQuestions')}<strong>{stats.total}</strong> {t('practice.questionUnit')}</span>
            <span>✅ <strong>{stats.correct}</strong> {t('practice.correctCount')}</span>
            <span>❌ <strong>{stats.wrong}</strong> {t('practice.wrongCount')}</span>
            <span>⭐ <strong>{stats.favorite}</strong> {t('practice.favoriteCount')}</span>
          </div>

          {filteredQuestions.length > 0 && (
            <div className="progress-bar-container">
              <span className="muted" style={{ fontSize: '13px' }}>
                {currentIndex + 1} / {filteredQuestions.length}
              </span>
              <div className="progress-bar-fill">
                <i style={{ width: `${progressPercent}%` }} />
              </div>
              <span className="muted" style={{ fontSize: '13px' }}>
                {progressPercent}%
              </span>
            </div>
          )}

          {currentQuestion ? (
            <div className="question-card">
              <div className="question-card-header">
                <span className="upload-kind">{getPracticeCategoryLabel(currentQuestion)}</span>
                <span className="upload-kind">{currentQuestion.sourceName || currentQuestion.source}</span>
                {currentQuestion.favorite && (
                  <span className="upload-kind" style={{ background: 'rgba(255,193,7,0.15)', color: '#b8860b' }}>
                    {t('practice.favorited')}
                  </span>
                )}
                {currentQuestion.wrong && (
                  <span className="upload-kind" style={{ background: 'rgba(186,26,26,0.12)', color: '#ba1a1a' }}>
                    {t('practice.wrongLabel')}
                  </span>
                )}
                {currentQuestion.attempts > 0 && (
                  <span className="upload-kind">{t('practice.attemptedTimes', { count: currentQuestion.attempts })}</span>
                )}
              </div>

              <RichMathContent content={currentQuestion.stem} className="question-stem rich-math-content" />

              {currentQuestion.options.length > 0 && (
                <div className="option-grid">
                  {currentQuestion.options.map((option) => {
                    const hasStandardAnswer = Boolean(currentQuestion.answer.trim());
                    const optionIsCorrect = hasStandardAnswer && answered && option.key === currentQuestion.answer;
                    const optionIsWrong = hasStandardAnswer && answered && option.key === selectedKey && option.key !== currentQuestion.answer;
                    const optionIsSelected = !answered && option.key === selectedKey;
                    return (
                      <button
                        key={`${currentQuestion.id}-${option.key}`}
                        className={`option-item${optionIsSelected ? ' selected' : ''}${optionIsCorrect ? ' correct' : ''}${optionIsWrong ? ' wrong' : ''}`}
                        onClick={() => handleSelectOption(option.key)}
                        disabled={answered}
                      >
                        <span className="option-key">{option.key}</span>
                        <RichMathContent content={option.text} inline className="rich-math-content option-content" />
                      </button>
                    );
                  })}
                </div>
              )}

              {answered && currentQuestion.options.length > 0 && (
                <div className={`answer-feedback ${!currentQuestion.answer.trim() ? '' : selectedKey === currentQuestion.answer ? 'correct' : 'wrong'}`}>
                  {!currentQuestion.answer.trim() ? (
                    <>
                      <span className="label">{t('practice.noStandardAnswer')}</span>
                      <strong style={{ fontSize: '16px' }}>{t('practice.noStandardAnswerDesc')}</strong>
                    </>
                  ) : selectedKey === currentQuestion.answer ? (
                    <strong>{t('practice.correct')}</strong>
                  ) : (
                    <>
                      <span className="label">{t('practice.wrong')}</span>
                      <RichMathContent
                        content={t('practice.correctAnswerIs', { answer: currentQuestion.answer || t('practice.notRecognized') })}
                        inline
                        className="rich-math-content answer-content"
                      />
                      {currentQuestion.explanation && (
                        <RichMathContent content={currentQuestion.explanation} className="rich-math-content explanation-content" />
                      )}
                    </>
                  )}
                </div>
              )}

              {currentQuestion.options.length === 0 && answerVisible && (
                <div className="answer-reveal">
                  <span className="label">
                    {currentQuestion.answerSource === 'ai-inferred'
                      ? t('practice.aiRefAnswer')
                      : currentQuestion.answerSource === 'question-bank'
                        ? t('practice.bankRefAnswer')
                        : t('practice.refAnswer')}
                  </span>
                  <RichMathContent
                    content={currentQuestion.answer || t('practice.noRefAnswer')}
                    inline
                    className="rich-math-content answer-content"
                  />
                  {currentQuestion.explanation && (
                    <>
                      <span className="label" style={{ marginTop: '4px' }}>{t('practice.explanation')}</span>
                      <RichMathContent content={currentQuestion.explanation} className="rich-math-content explanation-content" />
                    </>
                  )}
                </div>
              )}

              <div className="question-nav">
                <button onClick={goPrev} disabled={currentIndex === 0}>
                  {t('practice.prevQuestion')}
                </button>
                {currentQuestion.options.length === 0 && (
                  <button className="primary" onClick={() => setAnswerVisible((visible) => !visible)}>
                    {answerVisible ? t('practice.hideAnswer') : t('practice.showAnswer')}
                  </button>
                )}
                <button onClick={goNext} disabled={currentIndex >= filteredQuestions.length - 1}>
                  {t('practice.nextQuestion')}
                </button>
                <button onClick={toggleWrong}>
                  {currentQuestion.wrong ? t('practice.cancelWrong') : t('practice.markWrong')}
                </button>
                <button onClick={toggleFavorite}>
                  {currentQuestion.favorite ? t('practice.cancelFavorite') : t('practice.addFavorite')}
                </button>
              </div>

              <KnowledgeResourceSection
                resources={knowledgeResources}
                onOpen={openResource}
                relatedPoints={relatedPoints}
                onExploreRelated={handleExploreRelated}
              />
            </div>
          ) : (
            <div className="empty-practice">
              <strong>{t('practice.noQuestions')}</strong>
              <p className="muted">
                {mode === 'wrong'
                  ? t('practice.noWrongRecord')
                  : t('practice.goToImport')}
              </p>
              {mode !== 'wrong' && (
                <button className="primary" onClick={() => onStatus(t('practice.goToImportHint'))}>
                  {t('practice.goToImportBtn')}
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      )}

      {bankManagementOpen && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) setBankManagementOpen(false);
        }}>
          <div className="modal-dialog bank-management-dialog">
            <h3>{t('practice.bankMgmtTitle')}</h3>
            <p>{t('practice.bankMgmtDesc')}</p>
            <div className="bank-management-list">
              {questionBanks.filter((bank) => bank.id !== 'all').map((bank) => (
                <label key={bank.id} className="bank-management-item">
                  <input
                    type="checkbox"
                    checked={selectedBankIds.has(bank.id)}
                    onChange={() => toggleBankSelection(bank.id)}
                  />
                  <span className="bank-management-name">🗂️ {bank.name}</span>
                  <span className="bank-management-count">{bank.count} {t('practice.questionUnit')}</span>
                </label>
              ))}
              {questionBanks.length <= 1 && (
                <p className="muted">{t('practice.noManageableBanks')}</p>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => { setBankManagementOpen(false); setSelectedBankIds(new Set()); }}>
                {t('common.cancel')}
              </button>
              <button
                className="danger"
                onClick={handleDeleteBanks}
                disabled={selectedBankIds.size === 0 || isDeletingBanks}
              >
                {isDeletingBanks ? t('common.deleting') : t('practice.deleteSelected', { count: selectedBankIds.size })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
