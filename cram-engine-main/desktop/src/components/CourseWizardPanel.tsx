/**
 * CourseWizardPanel — 课程生成向导
 *
 * Phase 1 / OpenMAIC: 两阶段课程生成管线的前端界面。
 * 阶段1：输入主题/上传文档 → 生成结构化大纲
 * 阶段2：按大纲章节逐一生成场景内容
 */

import { useState } from 'react';
import type {
  CourseGenerationInput,
  CourseOutline,
  Chapter,
  CourseScene,
  GeneratedCourse,
  SceneType
} from '../lib/types';

type Props = {
  activeProjectId: string;
  projectCourseName: string;
  onCourseGenerated: (course: GeneratedCourse) => void;
  onStatus: (msg: string) => void;
};

const sceneTypeLabels: Record<SceneType, string> = {
  'slide-lecture': '📊 幻灯片授课',
  'interactive-quiz': '📝 互动测验',
  'sim-lab': '🔬 模拟实验',
  'pbl-project': '🚀 PBL 项目'
};

const sceneTypeOptions: { value: SceneType; label: string; desc: string }[] = [
  { value: 'slide-lecture', label: '幻灯片授课', desc: '概念讲解、理论介绍' },
  { value: 'interactive-quiz', label: '互动测验', desc: '即时检测理解程度' },
  { value: 'sim-lab', label: '模拟实验', desc: '可视化原理/算法/流程' },
  { value: 'pbl-project', label: 'PBL 项目', desc: '综合应用、项目实战' }
];

export default function CourseWizardPanel({ activeProjectId, projectCourseName, onCourseGenerated, onStatus }: Props) {
  // 输入状态
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [audience, setAudience] = useState('大学生');
  const [totalDuration, setTotalDuration] = useState('30分钟');
  const [focus, setFocus] = useState('');

  // 生成状态
  const [outline, setOutline] = useState<CourseOutline | null>(null);
  const [scenes, setScenes] = useState<CourseScene[]>([]);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [generatingChapterIndex, setGeneratingChapterIndex] = useState(-1);

  /** 阶段1：生成大纲 */
  async function handleGenerateOutline() {
    if (!topic.trim()) {
      onStatus('请先输入课程主题');
      return;
    }

    setIsGeneratingOutline(true);
    try {
      const input: CourseGenerationInput = {
        sourceType: 'text',
        topic: topic.trim(),
        options: {
          totalDuration,
          difficulty,
          audience: audience.trim() || undefined,
          focus: focus.trim() || undefined
        }
      };

      const result = await window.cramEngine.generateCourseOutline(input);
      setOutline(result);
      setScenes([]);
      onStatus(`大纲生成完成：${result.chapters.length} 个章节`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '大纲生成失败');
    } finally {
      setIsGeneratingOutline(false);
    }
  }

  /** 阶段2：逐章生成场景内容 */
  async function handleGenerateAllScenes() {
    if (!outline) return;
    setIsGeneratingScenes(true);
    setScenes([]);

    const generatedScenes: CourseScene[] = [];
    for (let i = 0; i < outline.chapters.length; i++) {
      setGeneratingChapterIndex(i);
      onStatus(`正在生成第 ${i + 1}/${outline.chapters.length} 章：${outline.chapters[i].title}...`);

      try {
        const scene = await window.cramEngine.generateChapterScene(
          activeProjectId,
          outline.chapters[i]
        );
        generatedScenes.push(scene);
      } catch (err) {
        onStatus(`第 ${i + 1} 章生成失败：${err instanceof Error ? err.message : '未知错误'}`);
      }

      // 逐章更新场景列表
      setScenes([...generatedScenes]);
    }

    setGeneratingChapterIndex(-1);

    // 保存到项目
    if (generatedScenes.length > 0) {
      const course: GeneratedCourse = {
        outline,
        scenes: generatedScenes,
        generatedAt: new Date().toISOString()
      };
      try {
        await window.cramEngine.saveGeneratedCourse(activeProjectId, course);
        onStatus(`课程生成完成并已保存！共 ${generatedScenes.length} 个场景`);
        onCourseGenerated(course);
      } catch (err) {
        onStatus(`保存失败：${err instanceof Error ? err.message : '未知错误'}，但场景已生成可预览`);
      }
    }

    setIsGeneratingScenes(false);
  }

  /** 更新章节的场景类型 */
  function updateChapterSceneType(chapterId: string, sceneType: SceneType) {
    if (!outline) return;
    setOutline({
      ...outline,
      chapters: outline.chapters.map((ch) =>
        ch.id === chapterId ? { ...ch, sceneType } : ch
      )
    });
  }

  /** 编辑章节知识点 */
  function updateChapterKP(chapterId: string, knowledgePoints: string) {
    if (!outline) return;
    setOutline({
      ...outline,
      chapters: outline.chapters.map((ch) =>
        ch.id === chapterId
          ? { ...ch, knowledgePoints: knowledgePoints.split('\n').filter(Boolean) }
          : ch
      )
    });
  }

  return (
    <div className="course-wizard">
      <div className="section-title">📚 课程生成向导</div>
      <p className="muted" style={{ marginBottom: '20px' }}>
        基于 goal.md 两阶段课程生成管线：输入主题 → AI 拆解大纲 → 逐章生成场景内容
      </p>

      {/* ---- 阶段1：输入与大纲生成 ---- */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
          阶段一：课程大纲生成
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 课程主题 */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
            课程主题 *
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：30分钟从零入门Python / 高等数学极限章节速成"
              style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '8px' }}
            />
          </label>

          {/* 选项行 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              难度等级
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '8px' }}
              >
                <option value="beginner">入门 (beginner)</option>
                <option value="intermediate">进阶 (intermediate)</option>
                <option value="advanced">高级 (advanced)</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              课程总时长
              <input
                value={totalDuration}
                onChange={(e) => setTotalDuration(e.target.value)}
                placeholder="30分钟"
                style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '8px' }}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              目标受众
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="大学生 / 考研 / 零基础"
                style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '8px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
              侧重方向（选填）
              <input
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="重点讲简答题套路 / 侧重实战"
                style={{ padding: '12px 14px', fontSize: '14px', borderRadius: '8px' }}
              />
            </label>
          </div>

          <button
            className="primary"
            onClick={handleGenerateOutline}
            disabled={isGeneratingOutline || !topic.trim()}
            style={{ padding: '12px 24px', fontSize: '15px', fontWeight: 600, alignSelf: 'flex-start' }}
          >
            {isGeneratingOutline ? '🔄 AI 正在拆解知识点...' : '🚀 生成课程大纲'}
          </button>
        </div>
      </div>

      {/* ---- 大纲预览与编辑 ---- */}
      {outline && (
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                📋 {outline.meta.title}
              </h3>
              <span className="muted" style={{ fontSize: '12px' }}>
                {outline.meta.totalDuration} · {outline.meta.difficulty} · {outline.meta.audience} · {outline.chapters.length} 个章节
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="primary"
                onClick={handleGenerateAllScenes}
                disabled={isGeneratingScenes}
                style={{ fontSize: '13px', fontWeight: 600 }}
              >
                {isGeneratingScenes
                  ? `🔄 生成场景中 (${generatingChapterIndex + 1}/${outline.chapters.length})...`
                  : '🎬 阶段二：生成全部场景内容'}
              </button>
            </div>
          </div>

          {/* 学习目标 */}
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--color-surface-container-low)', borderRadius: '8px' }}>
            <strong style={{ fontSize: '13px' }}>学习目标：</strong>
            <ul style={{ margin: '4px 0 0 16px', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
              {outline.meta.objectives.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>

          {/* 章节卡片 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {outline.chapters.map((chapter, idx) => (
              <div
                key={chapter.id}
                className="chapter-card"
                style={{
                  border: '1px solid var(--color-outline-variant)',
                  borderRadius: '8px',
                  padding: '12px',
                  background: generatingChapterIndex === idx ? 'rgba(94,57,224,0.04)' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>
                      第 {idx + 1} 章：{chapter.title}
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                      ⏱ {chapter.duration}
                      {generatingChapterIndex === idx && ' · 生成中...'}
                      {scenes[idx] && ' · ✅ 已生成'}
                    </div>
                  </div>

                  {/* 场景类型选择 */}
                  <select
                    value={chapter.sceneType}
                    onChange={(e) => updateChapterSceneType(chapter.id, e.target.value as SceneType)}
                    style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}
                  >
                    {sceneTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 知识点编辑 */}
                <div style={{ fontSize: '13px' }}>
                  <span style={{ fontWeight: 600 }}>知识点：</span>
                  <textarea
                    value={chapter.knowledgePoints.join('\n')}
                    onChange={(e) => updateChapterKP(chapter.id, e.target.value)}
                    rows={2}
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      padding: '6px 8px',
                      marginTop: '4px',
                      borderRadius: '6px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* 已生成场景预览 */}
                {scenes[idx] && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#e8f5e9', borderRadius: '6px', fontSize: '12px' }}>
                    {scenes[idx].sceneType === 'slide-lecture' && (
                      <>✅ 幻灯片已生成：{(scenes[idx] as any).slides?.length || 0} 页</>
                    )}
                    {scenes[idx].sceneType === 'interactive-quiz' && (
                      <>✅ 测验已生成：{(scenes[idx] as any).questions?.length || 0} 题</>
                    )}
                    {scenes[idx].sceneType === 'sim-lab' && (
                      <>✅ 模拟实验已生成：{(scenes[idx] as any).title || '交互式演示'}</>
                    )}
                    {scenes[idx].sceneType === 'pbl-project' && (
                      <>✅ PBL 项目已生成：{(scenes[idx] as any).title || '项目实战'}</>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 进度条 */}
          {isGeneratingScenes && (
            <div style={{ marginTop: '12px' }}>
              <div className="progress-bar-fill" style={{ height: '6px' }}>
                <i style={{ width: `${((generatingChapterIndex + 1) / outline.chapters.length) * 100}%` }} />
              </div>
              <div className="muted" style={{ fontSize: '11px', textAlign: 'center', marginTop: '4px' }}>
                {generatingChapterIndex + 1} / {outline.chapters.length} 章节
              </div>
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!outline && !isGeneratingOutline && (
        <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📝</div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>输入课程主题开始</h3>
          <p className="muted" style={{ fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>
            AI 将自动分析主题，拆解知识点，匹配最优教学场景（幻灯片/测验/实验/PBL），生成完整的互动课程。
          </p>
        </div>
      )}
    </div>
  );
}
