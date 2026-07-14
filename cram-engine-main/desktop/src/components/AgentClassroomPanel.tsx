/**
 * AgentClassroomPanel — 多智能体课堂交互面板 v2
 *
 * Phase 3 / OpenMAIC: 增强版，支持思维导图、辩论阵营、知识点匹配。
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import type {
  AgentSession,
  AgentSpeech,
  AgentBinding,
  SessionAction,
  InteractionMode,
  MindMapNode
} from '../lib/types';
import MindMapViewer, { parseMindMapFromText } from './MindMapViewer';

type Props = {
  activeProjectId: string;
  courseContext: string;
  chapterContext?: string;
  onStatus: (msg: string) => void;
};

const roleColors: Record<string, { bg: string; border: string }> = {
  teacher: { bg: '#fff0e6', border: '#f5a623' },
  assistant: { bg: '#e8f0fe', border: '#4285f4' },
  student: { bg: '#f0faf0', border: '#34a853' }
};

export default function AgentClassroomPanel({ activeProjectId, courseContext, chapterContext, onStatus }: Props) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [mode, setMode] = useState<InteractionMode>('discussion');
  const [topic, setTopic] = useState('');
  const [studentInput, setStudentInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [myStance, setMyStance] = useState<'affirmative' | 'negative' | null>(null);
  const [showMindMap, setShowMindMap] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 扁平化所有发言
  const allSpeeches: AgentSpeech[] = session ? session.turns.flatMap(t => t.speeches) : [];

  // ---- Phase 3: 思维导图 ----
  const mindMap = useMemo<MindMapNode | null>(() => {
    if (!topic || allSpeeches.length === 0) return null;
    const points = allSpeeches
      .filter(s => s.agentRole !== 'teacher')
      .slice(-4)
      .map(s => s.content.slice(0, 40) + (s.content.length > 40 ? '…' : ''));
    return parseMindMapFromText(topic, points.length ? points : ['等待讨论展开…']);
  }, [topic, allSpeeches.length]);

  // ---- Phase 3: 知识点匹配 (QA 模式) ----
  const matchedKnowledge = useMemo<string[]>(() => {
    if (mode !== 'qa' || !session) return [];
    const qText = studentInput || topic;
    if (!qText) return [];
    // 简单关键词匹配
    const keywords = ['定义', '概念', '公式', '原理', '应用', '例子', '方法', '步骤'];
    return keywords.filter(k => qText.includes(k)).map(k => `📌 ${k}相关`);
  }, [mode, studentInput, topic]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.turns]);

  // 自动推进
  useEffect(() => {
    if (!autoPlay || !session || isProcessing) return;
    const timer = setTimeout(() => handleNextTurn(), 2000);
    return () => clearTimeout(timer);
  }, [autoPlay, session?.currentTurn, isProcessing]);

  async function initSession() {
    setIsProcessing(true);
    try {
      const ctx = [courseContext, chapterContext].filter(Boolean).join('\n');
      const sess = await window.cramEngine.createAgentSession(activeProjectId, ctx);
      setSession(sess);
      onStatus(`智能体就位：${sess.agents.length} 个角色`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '创建失败');
    } finally { setIsProcessing(false); }
  }

  async function doAction(action: SessionAction) {
    if (!session) return;
    setIsProcessing(true);
    try {
      const result = await window.cramEngine.executeAgentAction(activeProjectId, session.sessionId, action);
      setSession(result.session);
      if (result.speech) onStatus(`${result.speech.agentName}: ${result.speech.content.slice(0, 60)}...`);
    } catch (err) {
      onStatus(err instanceof Error ? err.message : '操作失败');
    } finally { setIsProcessing(false); }
  }

  function handleStartDiscussion() {
    if (!topic.trim()) return;
    setMode('discussion');
    doAction({ type: 'start-discussion', payload: { topic: topic.trim() } });
  }

  function handleStartDebate() {
    if (!topic.trim()) return;
    setMode('debate');
    setMyStance(null);
    doAction({ type: 'start-debate', payload: { topic: topic.trim() } });
  }

  function handleStudentAsk() {
    if (!studentInput.trim()) return;
    setMode('qa');
    doAction({ type: 'student-ask', payload: { question: studentInput.trim(), topic: studentInput.trim() } });
    setStudentInput('');
  }

  function handleJoinDebate(stance: 'affirmative' | 'negative') {
    setMyStance(stance);
    doAction({ type: 'student-join', payload: { studentStance: stance } });
    onStatus(`你已加入${stance === 'affirmative' ? '正方' : '反方'}阵营`);
  }

  function handleNextTurn() { doAction({ type: 'next-turn' }); }
  function handleTeacherWrapup() { doAction({ type: 'teacher-wrapup' }); }

  function handleSwitchMode(targetMode: InteractionMode) {
    setMode(targetMode);
    if (targetMode !== 'debate') setMyStance(null);
    doAction({ type: 'switch-mode', payload: { targetMode } });
  }

  // 辩论统计
  const debateStats = useMemo(() => {
    if (mode !== 'debate' || !session) return null;
    const affSpeakers = new Set<string>();
    const negSpeakers = new Set<string>();
    session.turns.forEach(t => {
      const agent = session.agents.find(a => a.persona.id === t.speakerId);
      if (agent?.stance === 'affirmative') affSpeakers.add(t.speakerId);
      if (agent?.stance === 'negative') negSpeakers.add(t.speakerId);
    });
    return { affirmative: affSpeakers.size, negative: negSpeakers.size };
  }, [session, mode]);

  // ---- 未初始化 ----
  if (!session) {
    return (
      <div className="agent-classroom">
        <div className="section-title">🎭 多智能体课堂</div>
        <p className="muted" style={{ marginBottom: '16px' }}>
          三种交互模式：课堂讨论（含思维导图）· 圆桌辩论（含阵营选择）· 自由问答（含知识点匹配）
        </p>
        <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎭</div>
          <h3>启动智能体课堂</h3>
          <p className="muted" style={{ maxWidth: '400px', margin: '0 auto 20px' }}>
            将创建 AI 教师、助教和 3 位 AI 同学，支持讨论/辩论/问答三种交互模式。
          </p>
          <button className="primary" onClick={initSession} disabled={isProcessing}>
            {isProcessing ? '创建中...' : '🚀 启动智能体课堂'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-classroom" style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* 工具栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div className="section-title" style={{ margin: 0 }}>🎭 智能体课堂</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['discussion', 'debate', 'qa'] as InteractionMode[]).map(m => (
            <button key={m}
              className={mode === m ? 'active-tab' : ''}
              onClick={() => handleSwitchMode(m)}
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              {m === 'discussion' ? '💬 讨论' : m === 'debate' ? '⚔️ 辩论' : '🙋 问答'}
            </button>
          ))}
        </div>
      </div>

      {/* 角色行 */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {session.agents.map((agent) => (
          <div key={agent.persona.id} style={{
            display: 'flex', alignItems: 'center', gap: '3px',
            padding: '3px 8px', borderRadius: '14px', fontSize: '11px',
            background: roleColors[agent.persona.role]?.bg || '#f5f5f5',
            border: `1px solid ${roleColors[agent.persona.role]?.border || '#ccc'}`
          }}>
            <span>{agent.persona.avatar}</span>
            <span style={{ fontWeight: 600 }}>{agent.persona.name}</span>
            {agent.stance && (
              <span className="upload-kind" style={{ fontSize: '9px', padding: '1px 4px' }}>
                {agent.stance === 'affirmative' ? '🟢正方' : agent.stance === 'negative' ? '🔴反方' : '中立'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ---- Phase 3: 辩论阵营选择 ---- */}
      {mode === 'debate' && !myStance && allSpeeches.length > 0 && (
        <div style={{
          display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 12px',
          background: '#fff8e1', borderRadius: '8px', fontSize: '13px'
        }}>
          <span>⚔️ 选择你的阵营：</span>
          <button className="primary" onClick={() => handleJoinDebate('affirmative')} style={{ fontSize: '12px', padding: '6px 14px' }}>
            🟢 加入正方
          </button>
          <button className="primary" onClick={() => handleJoinDebate('negative')} style={{ fontSize: '12px', padding: '6px 14px', background: '#ba1a1a' }}>
            🔴 加入反方
          </button>
        </div>
      )}

      {/* ---- Phase 3: 思维导图面板 ---- */}
      {mode === 'discussion' && allSpeeches.length > 0 && (
        <div>
          <button onClick={() => setShowMindMap(!showMindMap)} style={{ fontSize: '11px', padding: '4px 10px' }}>
            {showMindMap ? '🔼 收起导图' : '🧠 思维导图'}
          </button>
          {showMindMap && mindMap && <MindMapViewer root={mindMap} title={`讨论：${topic}`} />}
        </div>
      )}

      {/* ---- Phase 3: 知识点匹配 ---- */}
      {mode === 'qa' && matchedKnowledge.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '6px 0' }}>
          {matchedKnowledge.map((kp, i) => (
            <span key={i} className="upload-kind" style={{ fontSize: '11px' }}>{kp}</span>
          ))}
        </div>
      )}

      {/* ---- Phase 3: 辩论比分 ---- */}
      {mode === 'debate' && debateStats && myStance && (
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px', justifyContent: 'center' }}>
          <span>🟢 正方发言 {debateStats.affirmative} 次</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            {myStance === 'affirmative' ? '👈 你' : ''}
          </span>
          <span>VS</span>
          <span style={{ fontWeight: 700, color: '#ba1a1a' }}>
            {myStance === 'negative' ? '👉 你' : ''}
          </span>
          <span>🔴 反方发言 {debateStats.negative} 次</span>
        </div>
      )}

      {/* 消息流 */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px',
        background: 'var(--color-surface-container-low)', borderRadius: '8px',
        minHeight: '250px', maxHeight: '450px'
      }}>
        {allSpeeches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-on-surface-variant)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
            <p>输入议题发起讨论/辩论，或直接提问。</p>
          </div>
        ) : (
          allSpeeches.map((speech) => {
            const agent = session.agents.find(a => a.persona.id === speech.agentId);
            return (
              <div key={speech.id} style={{
                marginBottom: '10px', padding: '10px 14px', borderRadius: '8px',
                background: roleColors[speech.agentRole]?.bg || '#f5f5f5',
                borderLeft: `3px solid ${roleColors[speech.agentRole]?.border || '#ccc'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span>{agent?.persona.avatar || '🤖'}</span>
                  <strong style={{ fontSize: '12px' }}>{speech.agentName}</strong>
                  <span style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)' }}>
                    {speech.agentRole === 'teacher' ? '教师' : speech.agentRole === 'assistant' ? '助教' : ''}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--color-on-surface-variant)', marginLeft: 'auto' }}>
                    {new Date(speech.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{speech.content}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 控制区 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {(mode === 'discussion' || mode === 'debate') && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={mode === 'discussion' ? '输入讨论议题...' : '输入辩论题目...'}
              style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '8px' }}
            />
            <button className="primary" onClick={mode === 'discussion' ? handleStartDiscussion : handleStartDebate}
              disabled={isProcessing || !topic.trim()}
              style={{ fontSize: '12px', whiteSpace: 'nowrap', padding: '8px 14px' }}>
              {mode === 'discussion' ? '💬 发起' : '⚔️ 发起'}
            </button>
          </div>
        )}

        {mode === 'qa' && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <input value={studentInput} onChange={(e) => setStudentInput(e.target.value)}
              placeholder="输入你的问题..." style={{ flex: 1, fontSize: '12px', padding: '8px 12px', borderRadius: '8px' }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleStudentAsk(); }} />
            <button className="primary" onClick={handleStudentAsk}
              disabled={isProcessing || !studentInput.trim()}
              style={{ fontSize: '12px', padding: '8px 14px' }}>🙋 提问</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={handleNextTurn} disabled={isProcessing} style={{ fontSize: '11px' }}>▶ 下一轮</button>
          <button onClick={handleTeacherWrapup} disabled={isProcessing} style={{ fontSize: '11px' }}>👨‍🏫 总结</button>
          <button onClick={() => setAutoPlay(!autoPlay)}
            className={autoPlay ? 'active-tab' : ''} style={{ fontSize: '11px' }}>
            {autoPlay ? '⏸ 自动' : '▶ 自动'}
          </button>
          <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', alignSelf: 'center', marginLeft: 'auto' }}>
            {session.state} · 轮 {session.currentTurn}
          </span>
        </div>
      </div>
    </div>
  );
}
