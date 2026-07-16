import { useEffect, useMemo, useState } from 'react';
import type { LearningProfile, LearningProfileState } from '../../lib/types';

type LearningProfilePageProps = {
  projectId: string;
  state: LearningProfileState | null;
  onChange: (state: LearningProfileState) => void;
  onSave: (profile: LearningProfile) => Promise<LearningProfileState>;
  onAnalyze: (input: string) => Promise<LearningProfileState>;
  onStatus?: (message: string) => void;
};

const levelOptions: LearningProfile['knowledgeLevel'][] = ['未评估', '基础薄弱', '中等', '较好'];
const confidenceOptions: Array<{ value: LearningProfile['confidence']; label: string }> = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
];

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
    { label: '知识水平', value: draft.knowledgeLevel || '未评估' },
    { label: '学习目标', value: draft.learningGoal || '待补充' },
    { label: '认知风格', value: draft.cognitiveStyle || '待分析' },
    { label: '薄弱点', value: draft.weakPoints.join('、') || '暂无' },
    { label: '错题模式', value: draft.mistakePatterns.join('、') || '暂无' },
    { label: '资源偏好', value: draft.resourcePreferences.join('、') || '暂无' },
    { label: '可用时间', value: draft.availableTime || '待填写' },
    { label: '学习动机', value: draft.motivation || '待填写' }
  ], [draft]);

  async function saveLearningProfile() {
    setSaving(true);
    try {
      const next = await onSave(draft);
      onChange(next);
      onStatus?.('学习画像已保存');
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
      onStatus?.('ProfileAgent 已刷新学习画像');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <section className="panel learning-profile-page" data-project-id={projectId}>
      <div className="page-section-header">
        <div>
          <div className="section-title">学习画像</div>
          <h3>把“学生是谁”先说清楚，再让 AI 讲得更准</h3>
          <p className="muted">Phase 1 先沉淀八维画像：后续资源生成、路径规划、报告都会围绕这里展开。</p>
        </div>
        <div className="profile-actions">
          <button onClick={() => void saveLearningProfile()} disabled={saving}>
            {saving ? '保存中…' : '保存画像'}
          </button>
          <button className="primary" onClick={() => void analyzeLearningProfile()} disabled={analyzing}>
            {analyzing ? '分析中…' : 'ProfileAgent 分析'}
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
            知识水平
            <select
              value={draft.knowledgeLevel}
              onChange={(event) => setDraft({ ...draft, knowledgeLevel: event.target.value as LearningProfile['knowledgeLevel'] })}
            >
              {levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>

          <label className="profile-field wide">
            学习目标
            <textarea value={draft.learningGoal} onChange={(event) => setDraft({ ...draft, learningGoal: event.target.value })} />
          </label>

          <label className="profile-field">
            认知风格
            <textarea value={draft.cognitiveStyle} onChange={(event) => setDraft({ ...draft, cognitiveStyle: event.target.value })} />
          </label>

          <label className="profile-field">
            薄弱点
            <textarea value={listToText(draft.weakPoints)} onChange={(event) => setDraft({ ...draft, weakPoints: textToList(event.target.value) })} />
          </label>

          <label className="profile-field">
            错题模式
            <textarea value={listToText(draft.mistakePatterns)} onChange={(event) => setDraft({ ...draft, mistakePatterns: textToList(event.target.value) })} />
          </label>

          <label className="profile-field">
            资源偏好
            <textarea value={listToText(draft.resourcePreferences)} onChange={(event) => setDraft({ ...draft, resourcePreferences: textToList(event.target.value) })} />
          </label>

          <div className="profile-inline-fields">
            <label className="profile-field">
              可用时间
              <input value={draft.availableTime} onChange={(event) => setDraft({ ...draft, availableTime: event.target.value })} />
            </label>
            <label className="profile-field compact">
              置信度
              <select
                value={draft.confidence}
                onChange={(event) => setDraft({ ...draft, confidence: event.target.value as LearningProfile['confidence'] })}
              >
                {confidenceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <label className="profile-field">
            学习动机
            <input value={draft.motivation} onChange={(event) => setDraft({ ...draft, motivation: event.target.value })} />
          </label>

          <label className="profile-field wide">
            补充备注
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
        </div>

        <aside className="profile-side-panel">
          <div className="mini-section">
            <div className="subsection-title">自然语言补充</div>
            <textarea
              value={analysisInput}
              onChange={(event) => setAnalysisInput(event.target.value)}
              placeholder="例如：学生每天晚上只有 1 小时，算法基础弱，喜欢先看例题再刷题。"
            />
            <p className="muted">不填也可以分析，ProfileAgent 会从项目资料、题目、知识库和聊天记录中提取信号。</p>
          </div>

          <div className="mini-section profile-events">
            <div className="subsection-title">画像事件</div>
            {state?.events?.length ? state.events.map((event) => (
              <div className="profile-event" key={event.id}>
                <strong>{event.summary}</strong>
                <span>{new Date(event.createdAt).toLocaleString()}</span>
              </div>
            )) : <div className="empty-slim">暂无画像事件</div>}
          </div>
        </aside>
      </div>
    </section>
  );
}
