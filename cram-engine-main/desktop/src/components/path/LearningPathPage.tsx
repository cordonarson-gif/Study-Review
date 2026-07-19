import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../i18n';
import type { GenerateLearningPathInput, LearningPathPlan, LearningPathTaskStatus, PersonalizedResource } from '../../lib/types';

type LearningPathPageProps = {
  plan: LearningPathPlan | null;
  resources: PersonalizedResource[];
  onGenerate: (input: GenerateLearningPathInput) => Promise<LearningPathPlan>;
  onSave: (plan: LearningPathPlan) => Promise<LearningPathPlan>;
  onChange: (plan: LearningPathPlan) => void;
  onStatus?: (message: string) => void;
};

function todayPlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function LearningPathPage({
  plan,
  resources,
  onGenerate,
  onSave,
  onChange,
  onStatus
}: LearningPathPageProps) {
  const { t } = useT();
  const statusLabels: Record<LearningPathTaskStatus, string> = {
    todo: t('common.todo'),
    doing: t('common.doing'),
    done: t('common.done'),
  };

  const [targetDate, setTargetDate] = useState(todayPlus(14));
  const [dailyMinutes, setDailyMinutes] = useState(60);
  const [focus, setFocus] = useState('');
  const [draft, setDraft] = useState<LearningPathPlan | null>(plan);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(plan);
    if (plan) {
      if (plan.targetDate && plan.targetDate !== '未设定') setTargetDate(plan.targetDate);
      setDailyMinutes(plan.dailyMinutes || 60);
      setFocus(plan.focus || '');
    }
  }, [plan]);

  const resourceTitleById = useMemo(() => {
    return new Map(resources.map((resource) => [resource.id, resource.title]));
  }, [resources]);

  async function generatePath() {
    setBusy(true);
    try {
      const next = await onGenerate({ targetDate, dailyMinutes, focus });
      setDraft(next);
      onChange(next);
      onStatus?.(t('path.pathGenerated'));
    } finally {
      setBusy(false);
    }
  }

  async function savePath() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = await onSave(draft);
      setDraft(next);
      onChange(next);
      onStatus?.(t('path.pathSaved'));
    } finally {
      setBusy(false);
    }
  }

  function patchDraft(patch: Partial<LearningPathPlan>) {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange(next);
  }

  function updateTaskStatus(stageId: string, taskId: string, status: LearningPathTaskStatus) {
    if (!draft) return;
    patchDraft({
      stages: draft.stages.map((stage) => stage.id === stageId ? {
        ...stage,
        tasks: stage.tasks.map((task) => task.id === taskId ? { ...task, status } : task)
      } : stage)
    });
  }

  const doneCount = draft?.stages.flatMap((stage) => stage.tasks).filter((task) => task.status === 'done').length ?? 0;
  const taskCount = draft?.stages.flatMap((stage) => stage.tasks).length ?? 0;
  const completion = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <section className="panel learning-path-page">
      <div className="page-section-header">
        <div>
          <div className="section-title">{t('path.title')}</div>
          <h3>{t('path.subtitle')}</h3>
          <p className="muted">{t('path.desc')}</p>
        </div>
      </div>

      <div className="learning-path-generation-panel">
        <label>
          {t('path.targetDate')}
          <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </label>
        <label>
          {t('path.dailyMinutes')}
          <input type="number" min={15} max={480} value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} />
        </label>
        <label>
          {t('path.focus')}
          <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder={t('path.focusPlaceholder')} />
        </label>
        <button className="primary" onClick={() => void generatePath()} disabled={busy}>
          {busy ? t('path.generating') : t('path.generatePath')}
        </button>
      </div>

      {draft ? (
        <>
          <div className="learning-path-summary-grid">
            <div className="mini-section">
              <span className="muted">{t('path.pathGoal')}</span>
              <input value={draft.goal} onChange={(event) => patchDraft({ goal: event.target.value })} />
            </div>
            <div className="mini-section">
              <span className="muted">{t('path.targetDate')}</span>
              <strong>{draft.targetDate || t('path.notSet')}</strong>
            </div>
            <div className="mini-section">
              <span className="muted">{t('path.dailyStudy')}</span>
              <strong>{draft.dailyMinutes} {t('path.minutes')}</strong>
            </div>
            <div className="mini-section">
              <span className="muted">{t('path.completion')}</span>
              <strong>{completion}%</strong>
            </div>
          </div>

          <div className="learning-path-stage-grid">
            {draft.stages.map((stage) => (
              <article className="learning-path-stage-card" key={stage.id}>
                <div className="resource-library-header">
                  <div>
                    <div className="subsection-title">{stage.title}</div>
                    <span className="muted">{stage.duration}</span>
                  </div>
                </div>
                <p>{stage.objective}</p>
                <div className="learning-path-task-list">
                  {stage.tasks.map((task) => (
                    <div className="learning-path-task" key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <small>{task.detail}</small>
                        {task.resourceIds.length ? (
                          <em>
                            {t('path.relatedResources')}{task.resourceIds.map((id) => resourceTitleById.get(id) || id).join('、')}
                          </em>
                        ) : null}
                      </div>
                      <select value={task.status} onChange={(event) => updateTaskStatus(stage.id, task.id, event.target.value as LearningPathTaskStatus)}>
                        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="learning-path-bottom-grid">
            <div className="mini-section">
              <div className="subsection-title">{t('path.reviewCadence')}</div>
              <ul>
                {draft.reviewCadence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="mini-section">
              <div className="subsection-title">{t('path.riskReminder')}</div>
              <ul>
                {draft.risks.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="panel-actions horizontal">
            <button className="primary" onClick={() => void savePath()} disabled={busy}>{t('path.savePath')}</button>
          </div>
        </>
      ) : (
        <div className="empty-slim">{t('path.emptyHint')}</div>
      )}
    </section>
  );
}
