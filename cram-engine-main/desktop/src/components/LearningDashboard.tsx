/**
 * LearningDashboard — 学习分析仪表盘
 *
 * Phase 5 / OpenMAIC: 展示学习进度、知识点掌握度、薄弱环节和学习建议。
 */

import { useMemo } from 'react';
import type { ReviewQuestion } from '../lib/types';

type Props = {
  questions: ReviewQuestion[];
  /** 从项目知识库条目数量推断知识广度 */
  knowledgeBaseCount: number;
};

type KPStats = {
  name: string;
  total: number;
  correct: number;
  wrong: number;
  mastery: number; // 0-100
};

export default function LearningDashboard({ questions, knowledgeBaseCount }: Props) {
  // 知识点统计
  const kpStats = useMemo<KPStats[]>(() => {
    const map = new Map<string, { total: number; correct: number; wrong: number }>();
    for (const q of questions) {
      const kp = q.knowledgePoint || '未分类';
      const entry = map.get(kp) || { total: 0, correct: 0, wrong: 0 };
      entry.total++;
      if (q.wrong) entry.wrong++;
      else if (q.attempts > 0) entry.correct++;
      map.set(kp, entry);
    }
    return [...map.entries()]
      .map(([name, stats]) => ({
        name,
        ...stats,
        mastery: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      }))
      .sort((a, b) => a.mastery - b.mastery); // 薄弱优先
  }, [questions]);

  const overallMastery = questions.length > 0
    ? Math.round((questions.filter(q => q.attempts > 0 && !q.wrong).length / questions.length) * 100)
    : 0;

  const wrongCount = questions.filter(q => q.wrong).length;
  const practicedCount = questions.filter(q => q.attempts > 0).length;

  return (
    <div className="learning-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="section-title">📊 学习分析仪表盘</div>

      {/* 总览卡片 */}
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)' }}>{overallMastery}%</div>
          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>总体掌握度</span>
        </div>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700 }}>{questions.length}</div>
          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>题库总量</span>
        </div>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#ba1a1a' }}>{wrongCount}</div>
          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>错题数</span>
        </div>
        <div className="panel" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#28c840' }}>{practicedCount}</div>
          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>已练习</span>
        </div>
      </div>

      {/* 总体进度条 */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <strong style={{ fontSize: '13px' }}>学习进度</strong>
          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
            {practicedCount}/{questions.length} 题已练习
          </span>
        </div>
        <div className="progress-bar-fill" style={{ height: '8px' }}>
          <i style={{ width: `${questions.length > 0 ? (practicedCount / questions.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* 知识点掌握度 */}
      <div className="panel">
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>📌 知识点掌握度</h4>
        {kpStats.length === 0 ? (
          <p className="muted" style={{ fontSize: '12px' }}>暂无练习数据</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {kpStats.slice(0, 8).map(kp => (
              <div key={kp.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span>{kp.name}</span>
                  <span style={{ fontWeight: 600, color: kp.mastery >= 80 ? '#28c840' : kp.mastery >= 50 ? '#f5a623' : '#ba1a1a' }}>
                    {kp.mastery}% ({kp.correct}/{kp.total})
                  </span>
                </div>
                <div className="progress-bar-fill" style={{ height: '6px' }}>
                  <i style={{
                    width: `${kp.mastery}%`,
                    background: kp.mastery >= 80 ? '#28c840' : kp.mastery >= 50 ? '#f5a623' : '#ba1a1a'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 学习建议 */}
      <div className="panel" style={{ background: '#f8f9ff' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>💡 智能学习建议</h4>
        <ul style={{ fontSize: '12px', lineHeight: 1.8, color: 'var(--color-on-surface-variant)' }}>
          {overallMastery < 30 && <li>📖 建议系统学习基础知识，使用课程生成功能创建学习计划</li>}
          {wrongCount > 0 && (
            <li>🔄 有 {wrongCount} 道错题待复习，使用"错题重练"模式巩固薄弱环节</li>
          )}
          {kpStats.filter(k => k.mastery < 50).slice(0, 3).map(k => (
            <li key={k.name}>⚠️ 重点攻克：<strong>{k.name}</strong>（掌握度 {k.mastery}%）</li>
          ))}
          {overallMastery >= 80 && <li>🎉 掌握度良好，建议进入下一章节或挑战模拟考试</li>}
          {questions.length === 0 && <li>📝 尚未导入题目，请先在工作台录入或生成练习题</li>}
          <li>📚 知识库已收录 <strong>{knowledgeBaseCount}</strong> 条知识点笔记</li>
        </ul>
      </div>
    </div>
  );
}
