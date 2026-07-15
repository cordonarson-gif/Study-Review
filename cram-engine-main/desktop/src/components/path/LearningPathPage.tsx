import { useEffect, useMemo, useState } from 'react';
import type { GenerateLearningPathInput, LearningPathPlan, LearningPathTaskStatus, PersonalizedResource } from '../../lib/types';

type LearningPathPageProps = {
  plan: LearningPathPlan | null;
  resources: PersonalizedResource[];
  onGenerate: (input: GenerateLearningPathInput) => Promise<LearningPathPlan>;
  onSave: (plan: LearningPathPlan) => Promise<LearningPathPlan>;
  onChange: (plan: LearningPathPlan) => void;
  onStatus?: (message: string) => void;
};

const statusLabels: Record<LearningPathTaskStatus, string> = {
  todo: '待开始',
  doing: '进行中',
  done: '已完成'
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
      onStatus?.('学习路径已生成');
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
      onStatus?.('学习路径已保存');
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
          <div className="section-title">学习路径</div>
          <h3>把画像、资源和题库变成可执行阶段计划</h3>
          <p className="muted">PathAgent 会综合薄弱点、每日时间、目标日期和已生成资源，安排阶段计划与风险提醒。</p>
        </div>
      </div>

      <div className="learning-path-generation-panel">
        <label>
          目标日期
          <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </label>
        <label>
          每日学习分钟
          <input type="number" min={15} max={480} value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))} />
        </label>
        <label>
          聚焦方向
          <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="例如：算法薄弱点、错题补漏、赛题文档" />
        </label>
        <button className="primary" onClick={() => void generatePath()} disabled={busy}>
          {busy ? '生成中…' : '生成路径'}
        </button>
      </div>

      {draft ? (
        <>
          <div className="learning-path-summary-grid">
            <div className="mini-section">
              <span className="muted">路径目标</span>
              <input value={draft.goal} onChange={(event) => patchDraft({ goal: event.target.value })} />
            </div>
            <div className="mini-section">
              <span className="muted">目标日期</span>
              <strong>{draft.targetDate || '未设定'}</strong>
            </div>
            <div className="mini-section">
              <span className="muted">每日学习</span>
              <strong>{draft.dailyMinutes} 分钟</strong>
            </div>
            <div className="mini-section">
              <span className="muted">完成度</span>
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
                            关联资源：{task.resourceIds.map((id) => resourceTitleById.get(id) || id).join('、')}
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
              <div className="subsection-title">复习节奏</div>
              <ul>
                {draft.reviewCadence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="mini-section">
              <div className="subsection-title">风险提醒</div>
              <ul>
                {draft.risks.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="panel-actions horizontal">
            <button className="primary" onClick={() => void savePath()} disabled={busy}>保存路径</button>
          </div>
        </>
      ) : (
        <div className="empty-slim">还没有路径计划。先填写目标日期和每日学习分钟，然后点击“生成路径”。</div>
      )}
    </section>
  );
}
