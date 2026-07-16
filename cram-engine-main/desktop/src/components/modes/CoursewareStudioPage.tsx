import { useEffect, useMemo, useRef, useState } from 'react';
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
const artifactSourceLabels: Record<ModeArtifact['source'], string> = {
  agent: 'AI生成',
  fallback: '本地模板',
  manual: '手动编辑'
};
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

function listCoursewareArtifacts(artifacts: ModeArtifact[]) {
  return artifacts
    .filter((artifact) => sourceTabs.has(artifact.tabId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function CoursewareStudioPage({ artifacts, onGenerate, onSave, onChange, onStatus }: CoursewareStudioPageProps) {
  const coursewareArtifacts = useMemo(() => listCoursewareArtifacts(artifacts), [artifacts]);
  const [selectedArtifactId, setSelectedArtifactId] = useState(coursewareArtifacts[0]?.id ?? '');
  const selectedArtifact = coursewareArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null;
  const sourceIdentity = selectedArtifact ? `${selectedArtifact.id}:${selectedArtifact.updatedAt}` : 'default';
  const [draft, setDraft] = useState(selectedArtifact?.contentMarkdown ?? defaultCourseware);
  const selectedArtifactIdRef = useRef(selectedArtifactId);
  const draftRef = useRef(draft);
  const [draftSourceIdentity, setDraftSourceIdentity] = useState(sourceIdentity);
  const [dirty, setDirty] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const slides = useMemo(() => parseCoursewareSlides(draft), [draft]);
  const currentSlide = slides[Math.min(slideIndex, slides.length - 1)] ?? slides[0];

  useEffect(() => {
    if (dirty) return;
    if (selectedArtifactId && !selectedArtifact) {
      const nextId = coursewareArtifacts[0]?.id ?? '';
      selectedArtifactIdRef.current = nextId;
      setSelectedArtifactId(nextId);
      return;
    }
    if (!selectedArtifactId && coursewareArtifacts.length && draftSourceIdentity === 'default') {
      selectedArtifactIdRef.current = coursewareArtifacts[0].id;
      setSelectedArtifactId(coursewareArtifacts[0].id);
      return;
    }
    if (sourceIdentity === draftSourceIdentity) return;
    const nextDraft = selectedArtifact?.contentMarkdown ?? defaultCourseware;
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setDraftSourceIdentity(sourceIdentity);
    setSlideIndex(0);
  }, [coursewareArtifacts, dirty, draftSourceIdentity, selectedArtifact, selectedArtifactId, sourceIdentity]);

  useEffect(() => {
    if (slideIndex >= slides.length) setSlideIndex(Math.max(0, slides.length - 1));
  }, [slideIndex, slides.length]);

  function selectArtifact(artifactId: string) {
    const artifact = coursewareArtifacts.find((item) => item.id === artifactId) ?? null;
    selectedArtifactIdRef.current = artifactId;
    draftRef.current = artifact?.contentMarkdown ?? defaultCourseware;
    setSelectedArtifactId(artifactId);
    setDraft(draftRef.current);
    setDraftSourceIdentity(artifact ? `${artifact.id}:${artifact.updatedAt}` : 'default');
    setDirty(false);
    setSlideIndex(0);
  }

  async function saveCourseware() {
    const submittedSource = draftRef.current;
    const submittedArtifactId = selectedArtifactIdRef.current;
    const submittedArtifact = coursewareArtifacts.find((artifact) => artifact.id === submittedArtifactId) ?? null;
    setBusy(true);
    try {
      let next: ModeArtifact[];
      let statusMessage: string;
      if (submittedArtifact) {
        next = await onSave({ ...submittedArtifact, contentMarkdown: submittedSource });
        statusMessage = '课件已保存';
      } else {
        next = await onGenerate({
          tabId: 'courseware-preview',
          artifactKind: '互动课件',
          prompt: submittedSource
        });
        const newestArtifact = next[0];
        statusMessage = newestArtifact?.source === 'agent' ? 'AI 课件已生成' : '模型不可用，已生成本地模板';
      }
      onChange(next);
      if (draftRef.current === submittedSource && selectedArtifactIdRef.current === submittedArtifactId) {
        setDirty(false);
      }
      onStatus?.(statusMessage);
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
          <select value={selectedArtifactId} onChange={(event) => selectArtifact(event.target.value)} disabled={busy}>
            <option value="">新建课件</option>
            {coursewareArtifacts.map((artifact) => (
              <option key={artifact.id} value={artifact.id}>{artifact.title} · {artifactSourceLabels[artifact.source]}</option>
            ))}
          </select>
          <textarea
            value={draft}
            disabled={busy}
            onChange={(event) => {
              draftRef.current = event.target.value;
              setDraft(event.target.value);
              setDirty(true);
            }}
          />
        </label>

        <div className="courseware-preview-column">
          <div className="courseware-preview-toolbar">
            <button aria-label="上一页" onClick={() => setSlideIndex((index) => Math.max(0, index - 1))} disabled={busy || slideIndex === 0}>上一页</button>
            <strong>{slideIndex + 1} / {slides.length}</strong>
            <button aria-label="下一页" onClick={() => setSlideIndex((index) => Math.min(slides.length - 1, index + 1))} disabled={busy || slideIndex >= slides.length - 1}>下一页</button>
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
