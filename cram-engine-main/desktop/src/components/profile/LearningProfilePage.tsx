import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n';
import type { LearningProfile, LearningProfileState } from '../../lib/types';

type LearningProfilePageProps = {
  projectId: string;
  state: LearningProfileState | null;
  onChange: (state: LearningProfileState) => void;
  onSave: (profile: LearningProfile) => Promise<LearningProfileState>;
  onAnalyze: (input: string) => Promise<LearningProfileState>;
  onStatus?: (message: string) => void;
};

function emptyProfile(): LearningProfile {
  return {
    version: 1,
    knowledgeLevel: '未评估',
    learningGoal: '',
    cognitiveStyle: '',
    weakPoints: [],
    mistakePatterns: [],
    resourcePreferences: [],
    availableTime: '',
    motivation: '',
    notes: '',
    confidence: 'low',
    updatedAt: new Date().toISOString()
  };
}

function listToText(values: string[]) {
  return values.join('\n');
}

function textToList(value: string) {
  return Array.from(new Set(value
    .split(/\n|,|，|、/)
    .map((item) => item.trim())
    .filter(Boolean)));
}

export function LearningProfilePage({ projectId, state, onChange, onSave, onAnalyze, onStatus }: LearningProfilePageProps) {
  const { t } = useT();
  const levelOptions: Array<{ value: LearningProfile['knowledgeLevel']; label: string }> = [
    { value: '未评估', label: t('profile.notEvaluated') },
    { value: '基础薄弱', label: t('profile.basicWeak') },
    { value: '中等', label: t('profile.intermediate') },
    { value: '较好', label: t('profile.good') }
  ];
  const confidenceOptions: Array<{ value: LearningProfile['confidence']; label: string }> = [
    { value: 'low', label: t('profile.low') },
    { value: 'medium', label: t('profile.medium') },
    { value: 'high', label: t('profile.high') }
  ];
  const [draft, setDraft] = useState<LearningProfile>(state?.profile ?? emptyProfile());
  const [analysisInput, setAnalysisInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (state?.profile) {
      setDraft(state.profile);
    }
  }, [state?.profile]);

  const dimensions = useMemo(() => [
    { label: t('profile.knowledgeLevel'), value: draft.knowledgeLevel || t('profile.notEvaluated') },
    { label: t('profile.learningGoal'), value: draft.learningGoal || t('profile.toSupplement') },
    { label: t('profile.cognitiveStyle'), value: draft.cognitiveStyle || t('profile.toAnalyze') },
    { label: t('profile.weakPoints'), value: draft.weakPoints.join('、') || t('profile.none') },
    { label: t('profile.mistakePatterns'), value: draft.mistakePatterns.join('、') || t('profile.none') },
    { label: t('profile.resourcePreferences'), value: draft.resourcePreferences.join('、') || t('profile.none') },
    { label: t('profile.availableTime'), value: draft.availableTime || t('profile.toFill') },
    { label: t('profile.learningMotivation'), value: draft.motivation || t('profile.toFill') }
  ], [draft, t]);

  async function saveLearningProfile() {
    setSaving(true);
    try {
      const next = await onSave(draft);
      onChange(next);
      onStatus?.(t('profile.profileSaved'));
    } finally {
      setSaving(false);
    }
  }

  async function analyzeLearningProfile() {
    setAnalyzing(true);
    try {
      const next = await onAnalyze(analysisInput);
      onChange(next);
      setAnalysisInput('');
      onStatus?.(t('profile.profileAnalyzed'));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="panel learning-profile-page" data-project-id={projectId}>
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('profile.title')}</div>
          <h3>{t('profile.subtitle')}</h3>
          <p className="muted">{t('profile.desc')}</p>
        </div>
        <div className="profile-actions">
          <button onClick={() => void saveLearningProfile()} disabled={saving}>
            {saving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
          <button className="primary" onClick={() => void analyzeLearningProfile()} disabled={analyzing}>
            {analyzing ? t('profile.analyzing') : t('profile.analyzeProfile')}
          </button>
        </div>
      </div>

      <div className="profile-dimension-grid">
        {dimensions.map((dimension) => (
          <div className="profile-dimension-card" key={dimension.label}>
            <span>{dimension.label}</span>
            <strong>{dimension.value}</strong>
          </div>
        ))}
      </div>

      <div className="profile-editor-grid">
        <div className="profile-editor-main">
          <label className="profile-field compact">
            {t('profile.knowledgeLevel')}
            <select
              value={draft.knowledgeLevel}
              onChange={(event) => setDraft({ ...draft, knowledgeLevel: event.target.value as LearningProfile['knowledgeLevel'] })}
            >
              {levelOptions.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
            </select>
          </label>

          <label className="profile-field wide">
            {t('profile.learningGoal')}
            <textarea value={draft.learningGoal} onChange={(event) => setDraft({ ...draft, learningGoal: event.target.value })} />
          </label>

          <label className="profile-field">
            {t('profile.cognitiveStyle')}
            <textarea value={draft.cognitiveStyle} onChange={(event) => setDraft({ ...draft, cognitiveStyle: event.target.value })} />
          </label>

          <label className="profile-field">
            {t('profile.weakPoints')}
            <textarea value={listToText(draft.weakPoints)} onChange={(event) => setDraft({ ...draft, weakPoints: textToList(event.target.value) })} />
          </label>

          <label className="profile-field">
            {t('profile.mistakePatterns')}
            <textarea value={listToText(draft.mistakePatterns)} onChange={(event) => setDraft({ ...draft, mistakePatterns: textToList(event.target.value) })} />
          </label>

          <label className="profile-field">
            {t('profile.resourcePreferences')}
            <textarea value={listToText(draft.resourcePreferences)} onChange={(event) => setDraft({ ...draft, resourcePreferences: textToList(event.target.value) })} />
          </label>

          <div className="profile-inline-fields">
            <label className="profile-field">
              {t('profile.availableTime')}
              <input value={draft.availableTime} onChange={(event) => setDraft({ ...draft, availableTime: event.target.value })} />
            </label>
            <label className="profile-field compact">
              {t('profile.confidence')}
              <select
                value={draft.confidence}
                onChange={(event) => setDraft({ ...draft, confidence: event.target.value as LearningProfile['confidence'] })}
              >
                {confidenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <label className="profile-field">
            {t('profile.learningMotivation')}
            <input value={draft.motivation} onChange={(event) => setDraft({ ...draft, motivation: event.target.value })} />
          </label>

          <label className="profile-field wide">
            {t('profile.notes')}
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
        </div>

        <aside className="profile-side-panel">
          <div className="mini-section">
            <div className="subsection-title">{t('profile.nlSupplement')}</div>
            <textarea
              value={analysisInput}
              onChange={(event) => setAnalysisInput(event.target.value)}
              placeholder={t('profile.nlPlaceholder')}
            />
            <p className="muted">{t('profile.nlHint')}</p>
          </div>

          <div className="mini-section profile-events">
            <div className="subsection-title">{t('profile.profileEvents')}</div>
            {state?.events?.length ? state.events.map((event) => (
              <div className="profile-event" key={event.id}>
                <strong>{event.summary}</strong>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </div>
            )) : <div className="empty-slim">{t('profile.noEvents')}</div>}
          </div>
        </aside>
      </div>
    </section>
  );
}
