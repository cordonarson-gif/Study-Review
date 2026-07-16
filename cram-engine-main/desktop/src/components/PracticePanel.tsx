import { useCallback, useEffect, useMemo, useState } from 'react';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>知识点拓展</strong>
        <span className="muted">{resources.length} 条资源</span>
      </div>

      {relatedPoints.length > 0 && (
        <div>
          <span className="muted" style={{ fontSize: '12px' }}>相关知识点：</span>
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
                {resource.platform === 'bilibili' && '📺 B站'}
                {resource.platform === 'douyin' && '🎵 抖音'}
                {resource.platform === 'web' && '🌐 网页'}
              </span>
              <h4>{resource.title}</h4>
              <p>{resource.description}</p>
              {resource.read && <span className="read-badge">已查看</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PracticePanel({ questions, activeProjectId, onQuestionsUpdated, onStatus }: Props) {
  const [practiceView, setPracticeView] = useState<PracticeView>('practice');
  const [mode, setMode] = useState<PracticeMode>('category');
  const [selectedQuestionBank, setSelectedQuestionBank] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [knowledgeResources, setKnowledgeResources] = useState<KnowledgeResource[]>([]);
  const [aiRequirements, setAiRequirements] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiQuestionBankName, setAiQuestionBankName] = useState('AI 生成题库');
  const [useCurrentAsReference, setUseCurrentAsReference] = useState(true);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const questionBanks = useMemo(() => buildQuestionBanks(questions), [questions]);
  const bankQuestions = useMemo(() => {
    if (selectedQuestionBank === 'all') return questions;
    return questions.filter((question) => getPracticeQuestionBankId(question) === selectedQuestionBank);
  }, [questions, selectedQuestionBank]);

  const categoryTree = useMemo<CategoryTreeNode[]>(() => buildCategoryTree(bankQuestions), [bankQuestions]);

  const categoryLabels = useMemo<string[]>(() => {
    const labels = new Set<string>(['全部']);
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

  useEffect(() => {
    setCurrentIndex(0);
    setAnswerVisible(false);
  }, [mode, selectedQuestionBank, selectedCategory]);

  useEffect(() => {
    if (selectedQuestionBank !== 'all' && !questionBanks.some((bank) => bank.id === selectedQuestionBank)) {
      setSelectedQuestionBank('all');
      setSelectedCategory('全部');
    }
  }, [questionBanks, selectedQuestionBank]);

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
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex((index) => index + 1);
      setAnswerVisible(false);
    }
  }, [currentIndex, filteredQuestions.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((index) => index - 1);
      setAnswerVisible(false);
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
    onStatus(`已切换到知识点：${point}`);
  }

  function handleSelectQuestionBank(bankId: string) {
    setSelectedQuestionBank(bankId);
    setSelectedCategory('全部');
    setMode('category');
    onStatus(bankId === 'all' ? '已切换到全部题库' : `已切换题库：${questionBanks.find((bank) => bank.id === bankId)?.name ?? bankId}`);
  }

  async function handleGenerateQuestions() {
    const requirements = aiRequirements.trim();
    if (!requirements && !currentQuestion) {
      onStatus('请先填写出题需求，或选择一道参考题后再生成。');
      return;
    }

    setIsGeneratingQuestions(true);
    try {
      const targetBankName = aiQuestionBankName.trim() || 'AI 生成题库';
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
      setSelectedCategory('全部');
      setMode('category');
      setCurrentIndex(0);
      setPracticeView('practice');
      onStatus(`AI 已生成 ${Math.min(aiCount, nextQuestions.length)} 道题，并写入题库「${targetBankName}」。`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'AI 出题失败');
    } finally {
      setIsGeneratingQuestions(false);
    }
  }

  const progressPercent = filteredQuestions.length
    ? Math.round(((currentIndex + 1) / filteredQuestions.length) * 100)
    : 0;

  return (
    <div className="practice-page">
      <div className="section-title">智能分类交互刷题</div>

      <div className="practice-toolbar">
        <button
          className={practiceView === 'practice' && mode === 'category' ? 'active-tab' : ''}
          onClick={() => {
            setPracticeView('practice');
            setMode('category');
          }}
        >
          🧭 按分类
        </button>
        <button
          className={practiceView === 'practice' && mode === 'random' ? 'active-tab' : ''}
          onClick={() => {
            setPracticeView('practice');
            setMode('random');
            setShuffleSeed(Date.now());
          }}
        >
          🎲 随机乱序
        </button>
        <button
          className={practiceView === 'practice' && mode === 'wrong' ? 'active-tab' : ''}
          onClick={() => {
            setPracticeView('practice');
            setMode('wrong');
          }}
        >
          ❌ 错题重练
        </button>
        <span className="practice-toolbar-spacer" />
        <button
          className={practiceView === 'ai-generator' ? 'active-tab' : ''}
          onClick={() => setPracticeView('ai-generator')}
        >
          ✨ AI 出题
        </button>
      </div>

      {practiceView === 'ai-generator' ? (
        <div className="practice-ai-config-page">
          <div className="ai-question-generator">
            <div className="ai-question-generator-header">
              <div>
                <strong>AI 出题配置</strong>
                <p className="muted">填写出题要求，可把当前题作为参考题型。生成后会自动加入指定题库，并在左侧题库中选中。</p>
              </div>
              <button onClick={() => setPracticeView('practice')}>返回刷题</button>
            </div>
            <div className="ai-question-generator-grid">
              <label className="question-draft-field wide">
                出题需求
                <textarea
                  rows={5}
                  value={aiRequirements}
                  onChange={(e) => setAiRequirements(e.target.value)}
                  placeholder="例如：围绕 CPU 指令系统生成 5 道单选题，重点考查微程序控制器、寄存器和流水线易错点"
                />
              </label>
              <label className="question-draft-field">
                题库名称
                <input value={aiQuestionBankName} onChange={(e) => setAiQuestionBankName(e.target.value)} />
              </label>
              <label className="question-draft-field">
                题目数量
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
                使用当前题作为参考题目
              </label>
              <button className="primary" onClick={handleGenerateQuestions} disabled={isGeneratingQuestions}>
                {isGeneratingQuestions ? '生成中...' : '生成题目并加入题库'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
        <div className="question-bank-sidebar category-sidebar">
          <div className="section-title">题库</div>
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

          <div className="section-title" style={{ marginTop: '16px' }}>知识点 / 题型</div>
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
                  <span>{knowledgePoint === '全部' ? '📝' : '📌'} {knowledgePoint}</span>
                  <span className="badge">{knowledgePoint === '全部' ? bankQuestions.length : node?.count ?? 0}</span>
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
            <span>📳 共<strong>{stats.total}</strong> 题</span>
            <span>✅ <strong>{stats.correct}</strong> 正确</span>
            <span>❌ <strong>{stats.wrong}</strong> 错题</span>
            <span>⭐ <strong>{stats.favorite}</strong> 收藏</span>
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
                    ⭐ 收藏
                  </span>
                )}
                {currentQuestion.wrong && (
                  <span className="upload-kind" style={{ background: 'rgba(186,26,26,0.12)', color: '#ba1a1a' }}>
                    ❌ 错题
                  </span>
                )}
                {currentQuestion.attempts > 0 && (
                  <span className="upload-kind">已作答 {currentQuestion.attempts} 次</span>
                )}
              </div>

              <div className="question-stem">{currentQuestion.stem}</div>

              {currentQuestion.options.length > 0 && (
                <div className="option-grid">
                  {currentQuestion.options.map((option) => (
                    <div key={`${currentQuestion.id}-${option.key}`} className="option-item">
                      <span className="option-key">{option.key}</span>
                      <span>{option.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {answerVisible && (
                <div className="answer-reveal">
                  <span className="label">✅ 正确答案</span>
                  <strong style={{ fontSize: '16px' }}>
                    {currentQuestion.answer || '未识别，可在题目录入页补充'}
                  </strong>
                  {currentQuestion.explanation && (
                    <>
                      <span className="label" style={{ marginTop: '4px' }}>📝 解析</span>
                      <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--color-on-surface)' }}>
                        {currentQuestion.explanation}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="question-nav">
                <button onClick={goPrev} disabled={currentIndex === 0}>
                  ◀ 上一题
                </button>
                <button className="primary" onClick={() => setAnswerVisible((visible) => !visible)}>
                  {answerVisible ? '🙈 隐藏答案' : '👀 显示答案'}
                </button>
                <button onClick={goNext} disabled={currentIndex >= filteredQuestions.length - 1}>
                  下一题 ▶
                </button>
                <button onClick={toggleWrong}>
                  {currentQuestion.wrong ? '✅ 取消错题' : '❌ 标记错题'}
                </button>
                <button onClick={toggleFavorite}>
                  {currentQuestion.favorite ? '⭐ 取消收藏' : '☆ 收藏题目'}
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
              <strong>当前模式下暂无题目</strong>
              <p className="muted">
                {mode === 'wrong'
                  ? '没有错题记录，继续保持。'
                  : '可以先进入“题目录入”从文本、文件或图片导入题目。'}
              </p>
              {mode !== 'wrong' && (
                <button className="primary" onClick={() => onStatus('请切换到“题目录入”标签页')}>
                  去录入题目
                </button>
              )}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}
