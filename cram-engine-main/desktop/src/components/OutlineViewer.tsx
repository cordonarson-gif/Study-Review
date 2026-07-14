/**
 * OutlineViewer — 课程大纲浏览器
 *
 * Phase 1 / OpenMAIC: 在课堂视图中浏览课程大纲和场景内容。
 * 侧边栏展示章节树，主区域渲染当前章节对应场景。
 */

import { useState } from 'react';
import type {
  CourseOutline,
  Chapter,
  CourseScene,
  SceneType
} from '../lib/types';

const sceneIcons: Record<SceneType, string> = {
  'slide-lecture': '📊',
  'interactive-quiz': '📝',
  'sim-lab': '🔬',
  'pbl-project': '🚀'
};

type Props = {
  outline: CourseOutline;
  scenes: CourseScene[];
  /** 当用户点击章节时回调 */
  onChapterSelect: (chapterIndex: number) => void;
  /** 当前选中章节索引 */
  selectedChapterIndex: number;
  /** 当前章节的场景内容（由父组件管理渲染） */
  children?: React.ReactNode;
};

export default function OutlineViewer({
  outline,
  scenes,
  onChapterSelect,
  selectedChapterIndex,
  children
}: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: '16px', height: '100%' }}>
      {/* 左侧章节导航 */}
      <aside style={{
        borderRight: '1px solid var(--color-outline-variant)',
        paddingRight: '12px',
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
            {outline.meta.title}
          </h3>
          <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
            {outline.meta.totalDuration} · {outline.chapters.length} 章
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {outline.chapters.map((chapter, idx) => {
            const isActive = idx === selectedChapterIndex;
            const hasScene = !!scenes[idx];

            return (
              <button
                key={chapter.id}
                onClick={() => onChapterSelect(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? 'var(--color-surface-container-high)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                  fontSize: '13px'
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0 }}>
                  {sceneIcons[chapter.sceneType]}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    第{idx + 1}章：{chapter.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                    ⏱ {chapter.duration}
                    {hasScene ? ' · ✅' : ' · ⏳'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 学习目标 */}
        <div style={{ marginTop: '16px', padding: '10px', background: 'var(--color-surface-container-low)', borderRadius: '8px', fontSize: '11px' }}>
          <strong>学习目标</strong>
          <ul style={{ margin: '4px 0 0 14px', color: 'var(--color-on-surface-variant)' }}>
            {outline.meta.objectives.map((obj, i) => (
              <li key={i}>{obj}</li>
            ))}
          </ul>
        </div>
      </aside>

      {/* 右侧场景内容区 */}
      <main style={{ overflowY: 'auto', paddingLeft: '4px' }}>
        {children || (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-on-surface-variant)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📖</div>
            <p>从左侧选择一个章节查看场景内容</p>
          </div>
        )}
      </main>
    </div>
  );
}
