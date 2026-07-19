import { useEffect, useMemo, useRef, useState } from 'react';
import type { GenerateModeArtifactInput, ModeArtifact } from '../../lib/types';
import { parseCoursewareSlides } from '../../lib/advancedModeWorkspaces.js';
import { useT } from '../../i18n';

type CoursewareStudioPageProps = {
  artifacts: ModeArtifact[];
  onGenerate: (input: GenerateModeArtifactInput) => Promise<ModeArtifact[]>;
  onSave: (artifact: ModeArtifact) => Promise<ModeArtifact[]>;
  onChange: (artifacts: ModeArtifact[]) => void;
  onStatus?: (message: string) => void;
};

const sourceTabs = new Set(['courseware-content', 'courseware-outline', 'courseware-preview']);
function listCoursewareArtifacts(artifacts: ModeArtifact[]) {
  return artifacts
    .filter((artifact) => sourceTabs.has(artifact.tabId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function CoursewareStudioPage({ artifacts, onGenerate, onSave, onChange, onStatus }: CoursewareStudioPageProps) {
  const { t } = useT();
  const defaultCourseware = t('courseware.defaultContent');
  const artifactSourceLabel = (source: ModeArtifact['source']) => t(
    `mode.${source === 'agent' ? 'aiGenerated' : source === 'fallback' ? 'localTemplate' : 'manualEdit'}`
  );
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
        statusMessage = t('courseware.saved');
      } else {
        next = await onGenerate({
          tabId: 'courseware-preview',
          artifactKind: t('courseware.title'),
          prompt: submittedSource
        });
        const newestArtifact = next[0];
        statusMessage = newestArtifact?.source === 'agent' ? t('courseware.generated') : t('courseware.localGenerated');
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
        <div><div className="section-title">{t('courseware.title')}</div><h3>{t('courseware.studio')}</h3><p className="muted">{t('courseware.desc')}</p></div>
        <button className="primary" onClick={() => void saveCourseware()} disabled={busy || !draft.trim()}>{busy ? t('common.saving') : t('courseware.saveCourseware')}</button>
      </div>

      <div className="courseware-studio-layout">
        <label className="courseware-source-editor mode-form-field wide">
          {t('courseware.source')}
          <select value={selectedArtifactId} onChange={(event) => selectArtifact(event.target.value)} disabled={busy}>
            <option value="">{t('courseware.newCourseware')}</option>
            {coursewareArtifacts.map((artifact) => (
              <option key={artifact.id} value={artifact.id}>{artifact.title} · {artifactSourceLabel(artifact.source)}</option>
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
            <button aria-label={t('courseware.prevPage')} onClick={() => setSlideIndex((index) => Math.max(0, index - 1))} disabled={busy || slideIndex === 0}>{t('courseware.prevPage')}</button>
            <strong>{slideIndex + 1} / {slides.length}</strong>
            <button aria-label={t('courseware.nextPage')} onClick={() => setSlideIndex((index) => Math.min(slides.length - 1, index + 1))} disabled={busy || slideIndex >= slides.length - 1}>{t('courseware.nextPage')}</button>
          </div>
          <article className="courseware-slide-preview" aria-live="polite">
            <div>
              <span>{t('courseware.pageNum', { num: slideIndex + 1 })}</span>
              <h4>{currentSlide.title}</h4>
              <pre>{currentSlide.content || t('courseware.noContent')}</pre>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
