/**
 * SceneRenderers — 场景内容渲染组件集合
 *
 * Phase 1 / OpenMAIC: 渲染四种场景类型的内容。
 * - SlidePlayer: 幻灯片授课播放器
 * - QuizPlayer: 互动测验答题器
 * - SimLabViewer: HTML 模拟实验查看器
 * - PBLViewer: PBL 项目查看器
 * - SceneRenderer: 自动分发到对应渲染器
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import katex from 'katex';
import type {
  CourseScene,
  SlideLectureScene,
  QuizScene,
  SimLabScene,
  PBLScene,
  SlidePage,
  QuizItem
} from '../lib/types';

// ================================================================
// SlidePlayer — 幻灯片授课播放器
// ================================================================

type SlidePlayerProps = {
  scene: SlideLectureScene;
};

function SlidePlayer({ scene }: SlidePlayerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [revealedBullets, setRevealedBullets] = useState(1);
  const [spotlightOn, setSpotlightOn] = useState(false);
  const [laserIdx, setLaserIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const slide = scene.slides[currentSlide];
  if (!slide) return <div className="muted">该章节暂无幻灯片内容</div>;
  const hasPrev = currentSlide > 0, hasNext = currentSlide < scene.slides.length - 1;

  useEffect(() => {
    if (!autoPlay) return;
    const t = setTimeout(() => {
      if (revealedBullets < (slide.bulletPoints.length || 1)) setRevealedBullets(r => r + 1);
      else if (hasNext) { setCurrentSlide(c => c + 1); setRevealedBullets(1); setSpotlightOn(false); }
    }, 1500);
    return () => clearTimeout(t);
  }, [autoPlay, revealedBullets, currentSlide, hasNext]);

  useEffect(() => {
    if (!slide.laserPath || !spotlightOn) return;
    const i = setInterval(() => setLaserIdx(x => (x + 1) % 5), 800);
    return () => clearInterval(i);
  }, [spotlightOn, slide.laserPath]);

  const laserPos = spotlightOn && slide.laserPath
    ? { x: 30 + (laserIdx * 12), y: 25 + ((laserIdx % 3) * 15) }
    : null;

  return (
    <div className="slide-player">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="muted" style={{ fontSize: '12px' }}>{currentSlide + 1}/{scene.slides.length}</span>
        <div className="progress-bar-fill" style={{ flex: 1, margin: '0 10px', height: '3px' }}>
          <i style={{ width: `${((currentSlide + 1) / scene.slides.length) * 100}%` }} />
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {slide.spotlight && <button onClick={() => setSpotlightOn(!spotlightOn)} style={{ fontSize: '11px', padding: '3px 8px' }}>{spotlightOn ? '🔦' : '💡'}</button>}
          <button onClick={() => setAutoPlay(!autoPlay)} style={{ fontSize: '11px', padding: '3px 8px' }}>{autoPlay ? '⏸' : '▶'}</button>
        </div>
      </div>

      <div className="slide-card" style={{ background: '#fff', border: '1px solid var(--color-outline-variant)', borderRadius: '12px', padding: '32px', minHeight: '280px', position: 'relative', overflow: 'hidden' }}>
        {spotlightOn && slide.spotlight && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10, pointerEvents: 'none', clipPath: 'circle(100px at 50% 45%)' }} />
        )}
        {laserPos && (
          <div style={{ position: 'absolute', left: `${laserPos.x}%`, top: `${laserPos.y}%`, zIndex: 20, width: '12px', height: '12px', borderRadius: '50%', background: '#ff2020', boxShadow: '0 0 18px 6px rgba(255,32,32,0.7)', transition: 'all 0.6s ease' }} />
        )}
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '20px', position: 'relative', zIndex: 1 }}>{slide.title}</h2>
        <ul style={{ fontSize: '15px', lineHeight: 2.1, paddingLeft: '20px', position: 'relative', zIndex: 1 }}>
          {slide.bulletPoints.slice(0, revealedBullets).map((point, i) => (
            <li key={i} style={{ animation: 'fadeInUp 0.4s both' }}>{point}</li>
          ))}
          {revealedBullets < slide.bulletPoints.length && (
            <li style={{ color: 'var(--color-outline-variant)', fontStyle: 'italic', cursor: 'pointer' }} onClick={() => setRevealedBullets(r => r + 1)}>... 展开下一条</li>
          )}
        </ul>
        {slide.latexFormulas && slide.latexFormulas.length > 0 && (
          <div style={{ marginTop: '12px', padding: '10px', background: '#f5f5f5', borderRadius: '8px', position: 'relative', zIndex: 1 }}>
            {slide.latexFormulas.map((f, i) => <div key={i} className="latex-block" dangerouslySetInnerHTML={{ __html: katex.renderToString(f, { displayMode: true, throwOnError: false, trust: true }) }} />)}
          </div>
        )}
        <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--color-surface-container-low)', borderRadius: '8px', fontSize: '13px', fontStyle: 'italic', color: 'var(--color-on-surface-variant)', borderLeft: '3px solid var(--color-primary)', position: 'relative', zIndex: 1 }}>🎤 {slide.voiceScript}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
        <button onClick={() => { setCurrentSlide(c => Math.max(0, c - 1)); setRevealedBullets(1); }} disabled={!hasPrev}>◀ 上一页</button>
        <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>已展示 {revealedBullets}/{slide.bulletPoints.length} 条</span>
        <button onClick={() => { setCurrentSlide(c => Math.min(scene.slides.length - 1, c + 1)); setRevealedBullets(1); }} disabled={!hasNext}>下一页 ▶</button>
      </div>
    </div>
  );
}

// ================================================================
// QuizPlayer — 互动测验答题器
// ================================================================

type QuizPlayerProps = {
  scene: QuizScene;
  onStatus?: (msg: string) => void;
};

function QuizPlayer({ scene, onStatus }: QuizPlayerProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number; details: { q: QuizItem; userAnswer: string; correct: boolean; score: number }[] } | null>(null);

  const question = scene.questions[currentQ];
  if (!question) return <div className="muted">该章节暂无测验题目</div>;

  function handleAnswer(answer: string) {
    setUserAnswers(prev => ({ ...prev, [question!.id]: answer }));
  }

  function scoreShortAnswer(userAnswer: string, expected: string, keywords?: string[]): number {
    if (!userAnswer.trim()) return 0;
    const ua = userAnswer.toLowerCase().trim();
    const ex = expected.toLowerCase().trim();
    // 完全匹配
    if (ua === ex) return 1;
    // 关键词匹配
    if (keywords && keywords.length > 0) {
      const matched = keywords.filter(k => ua.includes(k.toLowerCase())).length;
      return Math.min(1, matched / Math.max(keywords.length, 1));
    }
    // 部分语义重叠
    const uaWords = new Set(ua.split(/\s+/));
    const exWords = new Set(ex.split(/\s+/));
    const overlap = [...uaWords].filter(w => exWords.has(w) && w.length > 1).length;
    return Math.min(0.8, overlap / Math.max(exWords.size, 1));
  }

  function handleSubmitQuiz() {
    let correct = 0;
    const details = scene.questions.map(q => {
      const ua = userAnswers[q.id] || '';
      let isCorrect = false;
      let itemScore = 0;
      if (q.type === 'short-answer') {
        itemScore = scoreShortAnswer(ua, q.answer, q.scoringRule?.keywords);
        isCorrect = itemScore >= 0.6;
      } else {
        isCorrect = ua.trim().toUpperCase() === q.answer.trim().toUpperCase();
        itemScore = isCorrect ? 1 : 0;
      }
      if (isCorrect) correct++;
      return { q, userAnswer: ua, correct: isCorrect, score: itemScore };
    });
    setScore({ correct, total: scene.questions.length, details });
    setShowResults(true);
    onStatus?.(`测验完成：${correct}/${scene.questions.length} 正确`);
  }

  // 薄弱知识点分析
  const weakPoints = useMemo(() => {
    if (!score) return [];
    return score.details
      .filter(d => !d.correct)
      .map(d => d.q.knowledgePoint)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [score]);

  const answeredCount = Object.keys(userAnswers).length;
  const allAnswered = answeredCount === scene.questions.length;

  return (
    <div className="quiz-player">
      {/* 进度 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span className="muted">{currentQ + 1} / {scene.questions.length}</span>
        <span className="muted">已答 {answeredCount}/{scene.questions.length}</span>
      </div>

      {/* 题目卡片 */}
      <div className="panel" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <span className="upload-kind">{question.type === 'single-choice' ? '单选' : question.type === 'multi-choice' ? '多选' : '简答'}</span>
          <span className="upload-kind">{question.difficulty}</span>
          <span className="upload-kind">{question.knowledgePoint}</span>
        </div>

        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', lineHeight: 1.6 }}>
          {question.stem}
        </h3>

        {/* 选项 */}
        {question.options && question.options.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {question.options.map((opt) => {
              const isSelected = userAnswers[question.id] === opt.key;
              const isCorrect = showResults && opt.key === question.answer;
              const isWrong = showResults && isSelected && opt.key !== question.answer;

              return (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={showResults}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    border: `1.5px solid ${
                      isCorrect ? '#28c840' : isWrong ? '#ba1a1a' : isSelected ? 'var(--color-primary)' : 'var(--color-outline-variant)'
                    }`,
                    borderRadius: '8px',
                    background: isCorrect ? '#e8f5e9' : isWrong ? '#fef2f2' : isSelected ? 'rgba(94,57,224,0.06)' : '#fff',
                    cursor: showResults ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                >
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: isCorrect ? '#28c840' : isWrong ? '#ba1a1a' : isSelected ? 'var(--color-primary)' : 'var(--color-surface-container-low)',
                    color: isCorrect || isWrong || isSelected ? '#fff' : 'var(--color-on-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                    flexShrink: 0
                  }}>
                    {opt.key}
                  </span>
                  {opt.text}
                  {isCorrect && ' ✅'}
                  {isWrong && ' ❌'}
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            value={userAnswers[question.id] || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            disabled={showResults}
            placeholder="输入你的答案..."
            rows={3}
            style={{ width: '100%', fontSize: '14px' }}
          />
        )}

        {/* 解析 */}
        {showResults && (
          <div style={{ marginTop: '12px', padding: '12px', background: '#e8f5e9', borderRadius: '8px', fontSize: '13px' }}>
            <strong>✅ 正确答案：{question.answer}</strong>
            <p style={{ marginTop: '4px' }}>{question.explanation}</p>
          </div>
        )}
      </div>

      {/* 导航 */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0}>
          ◀ 上一题
        </button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!showResults && allAnswered && (
            <button className="primary" onClick={handleSubmitQuiz}>
              📝 提交测验
            </button>
          )}
          {showResults && score && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: score.correct === score.total ? '#28c840' : 'var(--color-primary)' }}>
                得分：{score.correct}/{score.total} ({Math.round((score.correct / score.total) * 100)}%)
              </span>
              {weakPoints.length > 0 && (
                <div style={{ padding: '8px 12px', background: '#fff3cd', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>⚠️ 薄弱知识点：</strong>
                  {weakPoints.map((wp: string, i: number) => (
                    <span key={i} className="upload-kind" style={{ margin: '2px 4px', background: '#ffe69c' }}>{wp}</span>
                  ))}
                  <div style={{ marginTop: '4px', color: '#856404' }}>📖 建议复习：{weakPoints.join(' → ')} → 重测</div>
                </div>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setCurrentQ(c => Math.min(scene.questions.length - 1, c + 1))} disabled={currentQ >= scene.questions.length - 1}>
          下一题 ▶
        </button>
      </div>
    </div>
  );
}

// ================================================================
// SimLabViewer — HTML 模拟实验查看器
// ================================================================

type SimLabViewerProps = {
  scene: SimLabScene;
};

function SimLabViewer({ scene }: SimLabViewerProps) {
  const [showHtml, setShowHtml] = useState(false);

  return (
    <div className="sim-lab-viewer">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{scene.title}</h3>
        <p className="muted">{scene.description}</p>
        <span className="upload-kind" style={{ marginTop: '8px', display: 'inline-block' }}>
          {scene.experimentType === 'physics' ? '⚛️ 物理模拟' :
           scene.experimentType === 'algorithm' ? '🔢 算法可视化' :
           scene.experimentType === 'flowchart' ? '📊 流程图' : '🔧 自定义实验'}
        </span>
      </div>

      {/* 实验引导 */}
      <div className="panel" style={{ marginBottom: '16px', background: '#f8f9ff' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>📋 实验引导</h4>
        <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
          <p><strong>实验目的：</strong>{scene.guide.objective}</p>
          <div style={{ marginTop: '8px' }}>
            <strong>操作指引：</strong>
            <ol style={{ margin: '4px 0 0 16px' }}>
              {scene.guide.instructions.map((inst, i) => (
                <li key={i}>{inst}</li>
              ))}
            </ol>
          </div>
          <div style={{ marginTop: '8px' }}>
            <strong>思考题：</strong>
            <ul style={{ margin: '4px 0 0 16px' }}>
              {scene.guide.reflectionQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* AI 讲解旁白 */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--color-surface-container-low)',
        borderRadius: '8px',
        fontSize: '13px',
        fontStyle: 'italic',
        color: 'var(--color-on-surface-variant)',
        borderLeft: '3px solid var(--color-primary)',
        marginBottom: '16px'
      }}>
        🎤 {scene.guide.aiNarration}
      </div>

      {/* HTML 实验 */}
      <div style={{ marginBottom: '12px' }}>
        <button onClick={() => setShowHtml(!showHtml)} className="primary">
          {showHtml ? '🔽 收起实验' : '▶ 运行模拟实验'}
        </button>
      </div>

      {showHtml && (
        <div style={{
          border: '1px solid var(--color-outline-variant)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <iframe
            srcDoc={scene.htmlCode}
            sandbox="allow-scripts allow-same-origin"
            style={{
              width: '100%',
              height: '500px',
              border: 'none'
            }}
            title="模拟实验"
          />
        </div>
      )}
    </div>
  );
}

// ================================================================
// PBLViewer — PBL 项目查看器
// ================================================================

type PBLViewerProps = {
  scene: PBLScene;
};

function PBLViewer({ scene }: PBLViewerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'roles' | 'flow' | 'progress'>('overview');
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());

  function toggleMilestone(id: string) {
    setCompletedMilestones(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const progressPercent = scene.milestones.length > 0
    ? Math.round((completedMilestones.size / scene.milestones.length) * 100)
    : 0;

  return (
    <div className="pbl-viewer">
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{scene.title}</h3>
        <p className="muted">{scene.background}</p>
      </div>

      {/* 进度条 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
          <span>项目进度</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{progressPercent}%</span>
        </div>
        <div className="progress-bar-fill" style={{ height: '6px' }}>
          <i style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="segmented-control" style={{ marginBottom: '16px' }}>
        {(['overview', 'milestones', 'roles', 'flow', 'progress'] as const).map(t => (
          <button key={t} className={activeTab === t ? 'active' : ''} onClick={() => setActiveTab(t)} style={{ fontSize: '12px' }}>
            {t === 'overview' ? '概览' : t === 'milestones' ? '里程碑' : t === 'roles' ? '角色' : t === 'flow' ? '流程' : '📋 进度'}
          </button>
        ))}
      </div>

      {/* 项目概览 */}
      {activeTab === 'overview' && (
        <div className="panel">
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>最终交付物</h4>
          <ul style={{ fontSize: '13px', lineHeight: 1.8 }}>
            {scene.finalDeliverables.map((d, i) => (
              <li key={i}>📦 {d}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 里程碑 */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scene.milestones.map((ms, i) => (
            <div key={ms.id} className="panel" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  flexShrink: 0
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleMilestone(ms.id)}>
                    <input type="checkbox" checked={completedMilestones.has(ms.id)} readOnly style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{ms.title}</h4>
                    {completedMilestones.has(ms.id) && <span style={{ fontSize: '11px', color: '#28c840' }}>✅ 已完成</span>}
                  </div>
                  <p className="muted" style={{ fontSize: '12px' }}>{ms.description} · ⏰ {ms.deadline}</p>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    <strong>交付物：</strong>
                    <ul style={{ margin: '4px 0 0 16px' }}>
                      {ms.deliverables.map((d, j) => <li key={j}>{d}</li>)}
                    </ul>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '12px' }}>
                    <strong>验收标准：</strong>
                    <ul style={{ margin: '4px 0 0 16px' }}>
                      {ms.acceptanceCriteria.map((ac, j) => <li key={j}>{ac}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 角色体系 */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {scene.roles.map((role) => (
            <div key={role.id} className="panel" style={{ textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--color-surface-container-high)',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                👤
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{role.name}</h4>
              <p className="muted" style={{ fontSize: '11px', marginBottom: '8px' }}>{role.persona}</p>
              <div style={{ fontSize: '12px', textAlign: 'left' }}>
                <strong>职责：</strong>
                <ul style={{ margin: '4px 0 0 16px' }}>
                  {role.responsibilities.map((r, j) => <li key={j}>{r}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 协作流程 */}
      {activeTab === 'flow' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {scene.collaborationFlow.phases.map((phase, i) => (
            <div key={i} className="panel">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  background: 'var(--color-primary)',
                  color: '#fff',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {i + 1}
                </span>
                <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{phase.name}</h4>
              </div>
              <div style={{ fontSize: '13px' }}>
                <p><strong>任务：</strong>{phase.tasks.join('、')}</p>
                <p style={{ marginTop: '4px' }}><strong>AI 互动：</strong>{phase.aiInteractions.join('、')}</p>
              </div>
            </div>
          ))}
          <div className="panel" style={{ background: '#f8f9ff' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>✅ 进度检查点</h4>
            <ul style={{ fontSize: '13px', lineHeight: 1.8 }}>
              {scene.collaborationFlow.checkpoints.map((cp, i) => (
                <li key={i}>{cp}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Phase 5: 进度检查 */}
      {activeTab === 'progress' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="panel">
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>📋 里程碑进度</h4>
            {scene.milestones.map(ms => (
              <div key={ms.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--color-outline-variant)', cursor: 'pointer' }}
                   onClick={() => toggleMilestone(ms.id)}>
                <span style={{ fontSize: '18px' }}>{completedMilestones.has(ms.id) ? '✅' : '⬜'}</span>
                <span style={{ flex: 1, fontSize: '13px', textDecoration: completedMilestones.has(ms.id) ? 'line-through' : 'none' }}>
                  {ms.title}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>⏰ {ms.deadline}</span>
              </div>
            ))}
          </div>
          <div className="panel" style={{ background: '#f8f9ff' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>交付物清单</h4>
            {scene.milestones.flatMap(ms => ms.deliverables).map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: '6px', padding: '4px 0', fontSize: '13px' }}>
                <span>📦</span><span>{d}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// SceneRenderer — 自动分发
// ================================================================

type SceneRendererProps = {
  scene: CourseScene | null;
  onStatus?: (msg: string) => void;
};

export { SlidePlayer, QuizPlayer, SimLabViewer, PBLViewer };

export default function SceneRenderer({ scene, onStatus }: SceneRendererProps) {
  if (!scene) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-on-surface-variant)' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📖</div>
        <p>请先生成该章节的场景内容</p>
      </div>
    );
  }

  switch (scene.sceneType) {
    case 'slide-lecture':
      return <SlidePlayer scene={scene} />;
    case 'interactive-quiz':
      return <QuizPlayer scene={scene} onStatus={onStatus} />;
    case 'sim-lab':
      return <SimLabViewer scene={scene} />;
    case 'pbl-project':
      return <PBLViewer scene={scene} />;
    default:
      return <div className="muted">未知场景类型</div>;
  }
}