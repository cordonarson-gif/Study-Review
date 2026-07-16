import { useEffect, useMemo, useState } from 'react';
import type { GenerateModeArtifactInput, ModeArtifact } from '../../lib/types';
import { parseCoursewareSlides } from '../../lib/advancedModeWorkspaces.js';

type CoursewareStudioPageProps = {
  artifacts: ModeArtifact[];
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onSave: (artifact: ModeArtifact) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

const sourceTabs = new Set(['courseware-content', 'courseware-outline', 'courseware-preview']);
const defaultCourseware = `# 课程导入
写下本节课的主题、目标和导入问题。

## 核心概念
用简洁的例子解释关键知识点。

---

## 课堂互动
设计一个可立即回答的问题或讨论任务。

---

## 总结与检查
列出本节课的结论和离堂检测。`;

function latestCoursewareArtifact(artifacts: ModeArtifact[]) {
  return artifacts
    .filter((artifact) => sourceTabs.has(artifact.tabId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

export function CoursewareStudioPage({ artifacts, onGenerate, onSave, onChange, onStatus }: CoursewareStudioPageProps) {
  const sourceArtifact = useMemo(() => latestCoursewareArtifact(artifacts), [artifacts]);
  const sourceIdentity = sourceArtifact ? `${sourceArtifact.id}:${sourceArtifact.updatedAt}` : 'default';
  const [draft, setDraft] = useState(sourceArtifact?.contentMarkdown ?? defaultCourseware);
  const [draftSourceIdentity, setDraftSourceIdentity] = useState(sourceIdentity);
  const [dirty, setDirty] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const slides = useMemo(() => parseCoursewareSlides(draft), [draft]);
  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)] ?? slides[0];

  useEffect(() => {
    if (dirty || sourceIdentity === draftSourceIdentity) return;
    setDraft(sourceArtifact?.contentMarkdown ?? defaultCourseware);
    setDraftSourceIdentity(sourceIdentity);
    setSlideIndex(0);
  }, [dirty, draftSourceIdentity, sourceArtifact, sourceIdentity]);

  useEffect(() => {
    if (slideIndex >= slides.length) setSlideIndex(Math.max(0, slides.length - 1));
  }, [slideIndex, slides.length]);

  async function saveCourseware() {
    setBusy(true);
    try {
      let next: ModeArtifact[];
      if (sourceArtifact) {
        next = await onSave({ ...sourceArtifact, contentMarkdown: draft });
      } else {
        next = await onGenerate({
          tabId: 'courseware-preview',
          artifactKind: '互动课件',
          prompt: draft
        });
      }
      onChange(next);
      setDirty(false);
      onStatus?.('课件已保存');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel specialized-mode-page courseware-studio-page">
      <div className="page-section-header">
        <div><div className="section-title">互动课件</div><h3>课件工作室</h3><p className="muted">编辑 Markdown 源稿，并逐页检查课堂展示效果。</p></div>
        <button className="primary" onClick={() => void saveCourseware()} disabled={busy || !draft.trim()}>{busy ? '保存中...' : '保存课件'}</button>
      </div>

      <div className="courseware-studio-layout">
        <label className="courseware-source-editor">
          Markdown 源稿
          <textarea
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDirty(true);
            }}
          />
        </label>

        <div className="courseware-preview-column">
          <div className="courseware-preview-toolbar">
            <button aria-label="上一页" onClick={() => setSlideIndex((index) => Math.max(0, index - 1))} disabled={slideIndex === 0}>上一页</button>
            <strong>{slideIndex + 1} / {slides.length}</strong>
            <button aria-label="下一页" onClick={() => setSlideIndex((index) => Math.min(slides.length - 1, index + 1))} disabled={slideIndex >= slides.length - 1}>下一页</button>
          </div>
          <article className="courseware-slide-preview" aria-live="polite">
            <div>
              <span>第 {slideIndex + 1} 页</span>
              <h4>{currentSlide.title}</h4>
              <pre>{currentSlide.content || '本页暂无正文。'}</pre>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
