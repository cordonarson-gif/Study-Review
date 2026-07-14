/**
 * agent-orchestrator.cts — 多智能体编排系统
 *
 * Phase 2 / OpenMAIC: 实现 AI 教师/助教/同学三种角色的调度、状态机、轮次控制和 LLM 发言生成。
 */

import {
  buildChatRequest,
  parseChatResponse,
  type ProviderId
} from './provider-api.cjs';

// ---- 类型（与前端对齐） ----

export type AgentRole = 'teacher' | 'assistant' | 'student';
export type InteractionMode = 'discussion' | 'debate' | 'qa';

export type AgentPersona = {
  id: string;
  role: AgentRole;
  name: string;
  avatar: string;
  description: string;
  systemPrompt: string;
  teachingStyle?: string;
  knowledgeBase?: string;
  viewpoint?: string;
  activityLevel: 'high' | 'medium' | 'low';
};

export type AgentSpeech = {
  id: string;
  agentId: string;
  agentName: string;
  agentRole: AgentRole;
  content: string;
  createdAt: string;
  turnIndex: number;
};

export type OrchestratorState =
  | 'idle'
  | 'teacher-lecturing'
  | 'discussion-open'
  | 'discussion-nominate'
  | 'discussion-wrapup'
  | 'debate-opening'
  | 'debate-statements'
  | 'debate-free'
  | 'debate-summary'
  | 'qa-answering'
  | 'qa-followup';

export type DebateStance = 'affirmative' | 'negative' | 'neutral';

export type AgentBinding = {
  persona: AgentPersona;
  stance?: DebateStance;
};

export type AgentTurn = {
  turnIndex: number;
  speakerId: string;
  speeches: AgentSpeech[];
  completed: boolean;
};

export type AgentSession = {
  sessionId: string;
  projectId: string;
  mode: InteractionMode;
  state: OrchestratorState;
  agents: AgentBinding[];
  turns: AgentTurn[];
  currentTurn: number;
  courseContext: string;
  chapterContext: string;
  studentInputQueue: string[];
  createdAt: string;
  updatedAt: string;
};

export type SessionAction = {
  type: 'start-discussion' | 'start-debate' | 'student-ask' | 'student-join' |
        'teacher-nominate' | 'teacher-wrapup' | 'next-turn' | 'switch-mode';
  payload?: {
    topic?: string;
    question?: string;
    nomineeId?: string;
    targetMode?: InteractionMode;
    studentStance?: DebateStance;
  };
};

// ---- LLM 上下文 ----

type LlmContext = {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

// ---- 预置角色 ----

export const defaultPersonas: AgentPersona[] = [
  {
    id: 'agent-teacher',
    role: 'teacher',
    name: '张老师',
    avatar: '👨‍🏫',
    description: '经验丰富的主讲教师',
    systemPrompt: '你是课程主讲教师。负责讲解知识点、发起讨论、点评学生发言、总结归纳。教学风格通俗易懂，善用比喻和案例。',
    teachingStyle: '通俗',
    activityLevel: 'high'
  },
  {
    id: 'agent-assistant',
    role: 'assistant',
    name: '小助',
    avatar: '🤖',
    description: 'AI 助教',
    systemPrompt: '你是课程助教。负责辅助答疑、整理课堂笔记、推送学习资料，回答学生基础问题。',
    activityLevel: 'medium'
  },
  {
    id: 'agent-student-a',
    role: 'student',
    name: '小明',
    avatar: '🧑‍🎓',
    description: '勤奋好学的学生',
    systemPrompt: '你是一名勤奋好学的学生，基础知识扎实但偶尔有困惑。课堂上积极提问，喜欢追问为什么。',
    knowledgeBase: '基础扎实，对概念理解较深',
    activityLevel: 'high'
  },
  {
    id: 'agent-student-b',
    role: 'student',
    name: '小红',
    avatar: '👩‍🎓',
    description: '思维活跃的学生',
    systemPrompt: '你是一名思维活跃的学生，喜欢从不同角度思考问题，经常提出独特的见解和联想。',
    knowledgeBase: '知识面广，联想能力强',
    activityLevel: 'medium'
  },
  {
    id: 'agent-student-c',
    role: 'student',
    name: '小刚',
    avatar: '🧑‍💻',
    description: '实践型学生',
    systemPrompt: '你是一名实践型学生，喜欢从应用角度理解知识。经常问"这个怎么用"和"实际场景中怎么处理"。',
    knowledgeBase: '动手能力强，关注实际应用',
    activityLevel: 'medium'
  }
];

// ---- 工具函数 ----

function speechId(agentId: string, turnIndex: number) {
  return `${agentId}-t${turnIndex}-${Date.now()}`;
}

function buildSessionContext(session: AgentSession, action: SessionAction): string {
  const lines: string[] = [];

  lines.push(`【课堂背景】${session.courseContext}`);
  if (session.chapterContext) {
    lines.push(`【当前章节】${session.chapterContext}`);
  }
  lines.push(`【交互模式】${session.mode === 'discussion' ? '课堂讨论' : session.mode === 'debate' ? '圆桌辩论' : '自由问答'}`);

  if (action.payload?.topic) {
    lines.push(`【议题/提问】${action.payload.topic}`);
  }
  if (action.payload?.question) {
    lines.push(`【学生提问】${action.payload.question}`);
  }

  // 历史轮次摘要（最近 3 轮）
  const recentTurns = session.turns.slice(-3);
  if (recentTurns.length > 0) {
    lines.push('【对话历史】');
    for (const turn of recentTurns) {
      for (const speech of turn.speeches) {
        lines.push(`  ${speech.agentName}(${speech.agentRole}): ${speech.content.slice(0, 120)}`);
      }
    }
  }

  return lines.join('\n');
}

async function callLlm(context: LlmContext, systemPrompt: string, userPrompt: string): Promise<string> {
  const request = buildChatRequest({
    provider: context.provider,
    baseUrl: context.baseUrl,
    apiKey: context.apiKey,
    model: context.model,
    temperature: context.temperature,
    maxTokens: context.maxTokens,
    systemPrompt,
    userPrompt
  });

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    throw new Error(`LLM 请求失败：${response.status}`);
  }

  const payload = await response.json() as {
    content?: Array<{ type?: string; text?: string }>;
    choices?: Array<{ message?: { content?: string } }>;
  };

  return parseChatResponse(context.provider, payload);
}

// ---- 本地模拟发言（无 LLM 时代用） ----

function localSpeech(agent: AgentBinding, context: string, action: SessionAction, turnIndex: number): string {
  const p = agent.persona;
  const topic = action.payload?.topic || '当前话题';
  const mode = action.type;

  switch (p.role) {
    case 'teacher':
      if (mode === 'start-discussion')
        return `大家好，今天我们来讨论"${topic}"。这是一个很有意思的话题，希望大家畅所欲言。先请小明谈谈你的看法吧。`;
      if (mode === 'teacher-wrapup')
        return `好的，经过刚才的讨论，我来总结一下：关于"${topic}"，大家提出了几个关键观点。首先要明确核心概念，其次要理解应用场景。如有疑问可以继续向小助提问。`;
      if (mode === 'start-debate')
        return `今天我们进行一场辩论，辩题是"${topic}"。正方立场是赞同，反方立场是反对。先请正方同学陈述观点。`;
      return `关于"${topic}"，这里需要强调几个重点：首先理解基本概念，然后掌握核心原理，最后通过练习巩固。`;

    case 'assistant':
      if (action.payload?.question)
        return `关于"${action.payload.question}"，我来整理一下相关资料：这个问题涉及的知识点已经在讲义第三章中详细讲解过，建议先回顾基本定义，再结合例题理解。`;
      return `我整理了关于"${topic}"的课堂笔记要点，大家可以参考：1）概念定义 2）关键公式 3）常见题型。`;

    case 'student':
      if (agent.stance === 'affirmative')
        return `我赞同这个观点。"${topic}"确实很重要，从理论角度来看有充分依据。`;
      if (agent.stance === 'negative')
        return `我有不同看法。"${topic}"可能存在一些问题，比如在实际应用中会遇到困难。`;
      return `老师，关于"${topic}"，我有一个问题：这个知识点在实际中怎么应用呢？能举一个具体例子吗？`;
  }
  return `...`;
}

// ---- 核心函数：生成智能体发言 ----

export async function generateAgentSpeech(
  session: AgentSession,
  agent: AgentBinding,
  action: SessionAction,
  llm?: LlmContext | null
): Promise<AgentSpeech> {
  const turnIndex = session.currentTurn;

  if (!llm?.apiKey) {
    return {
      id: speechId(agent.persona.id, turnIndex),
      agentId: agent.persona.id,
      agentName: agent.persona.name,
      agentRole: agent.persona.role,
      content: localSpeech(agent, '', action, turnIndex),
      createdAt: new Date().toISOString(),
      turnIndex
    };
  }

  try {
    const context = buildSessionContext(session, action);
    const systemPrompt = agent.persona.systemPrompt;

    let userPrompt = context;

    // 根据角色和模式定制 prompt
    if (agent.persona.role === 'teacher') {
      if (action.type === 'start-discussion') {
        userPrompt = `${context}\n\n请以教师身份发起课堂讨论，抛出议题并邀请一位同学先发言。`;
      } else if (action.type === 'teacher-wrapup') {
        userPrompt = `${context}\n\n请以教师身份总结讨论要点，梳理各方观点并给出总结性评价。`;
      } else if (action.type === 'start-debate') {
        userPrompt = `${context}\n\n请以教师身份主持辩论，公布辩题、分配立场，邀请各方发言。`;
      }
    } else if (agent.persona.role === 'student' && agent.stance) {
      userPrompt = `${context}\n\n你现在是辩论的${agent.stance === 'affirmative' ? '正方' : agent.stance === 'negative' ? '反方' : '中立方'}。请从你的立场出发发表观点。`;
    } else if (agent.persona.role === 'assistant' && action.payload?.question) {
      userPrompt = `${context}\n\n请以助教身份回答学生提问，提供清晰的知识点梳理和建议。`;
    }

    const content = await callLlm(llm, systemPrompt, userPrompt);

    return {
      id: speechId(agent.persona.id, turnIndex),
      agentId: agent.persona.id,
      agentName: agent.persona.name,
      agentRole: agent.persona.role,
      content,
      createdAt: new Date().toISOString(),
      turnIndex
    };
  } catch {
    return {
      id: speechId(agent.persona.id, turnIndex),
      agentId: agent.persona.id,
      agentName: agent.persona.name,
      agentRole: agent.persona.role,
      content: localSpeech(agent, '', action, turnIndex),
      createdAt: new Date().toISOString(),
      turnIndex
    };
  }
}

// ---- 状态机转换 ----

function transitionState(current: OrchestratorState, action: SessionAction): OrchestratorState {
  switch (action.type) {
    case 'start-discussion':
      return 'discussion-open';
    case 'start-debate':
      return 'debate-opening';
    case 'student-ask':
      return 'qa-answering';
    case 'student-join':
      return current; // 维持当前状态
    case 'teacher-nominate':
      return 'discussion-nominate';
    case 'teacher-wrapup':
      if (current.startsWith('discussion')) return 'discussion-wrapup';
      if (current.startsWith('debate')) return 'debate-summary';
      return 'idle';
    case 'next-turn':
      if (current === 'debate-opening') return 'debate-statements';
      if (current === 'debate-statements') return 'debate-free';
      if (current === 'debate-free') return 'debate-summary';
      if (current.startsWith('discussion')) return 'discussion-open';
      if (current === 'qa-answering') return 'qa-followup';
      return current;
    case 'switch-mode':
      return 'idle';
    default:
      return current;
  }
}

// ---- 确定下一个发言者 ----

function nextSpeaker(session: AgentSession, action: SessionAction): string | null {
  // 被点名优先
  if (action.payload?.nomineeId) return action.payload.nomineeId;

  const { mode, state, agents, turns } = session;
  const teachers = agents.filter(a => a.persona.role === 'teacher');
  const assistants = agents.filter(a => a.persona.role === 'assistant');
  const students = agents.filter(a => a.persona.role === 'student');

  switch (state) {
    case 'idle':
      return teachers[0]?.persona.id ?? null;

    case 'discussion-open':
    case 'discussion-nominate':
      // 轮流让学生发言，优先活跃度高的
      const activeStudents = students.filter(s => s.persona.activityLevel !== 'low');
      const lastSpeakers = turns.slice(-3).map(t => t.speakerId);
      const nextStudent = activeStudents.find(s => !lastSpeakers.includes(s.persona.id)) || activeStudents[0];
      return nextStudent?.persona.id ?? null;

    case 'discussion-wrapup':
      return teachers[0]?.persona.id ?? null;

    case 'debate-opening':
      return teachers[0]?.persona.id ?? null;
    case 'debate-statements':
    case 'debate-free': {
      // 辩论中轮流发言：正方 → 反方 → 正方 → ...
      const debateTurns = turns.filter(t => t.speakerId !== teachers[0]?.persona.id);
      const lastDebater = debateTurns.at(-1)?.speakerId;
      const lastStance = agents.find(a => a.persona.id === lastDebater)?.stance;
      const nextStance: DebateStance = lastStance === 'affirmative' ? 'negative' : 'affirmative';
      const candidate = students.find(s => s.stance === nextStance);
      return candidate?.persona.id ?? students[0]?.persona.id ?? null;
    }
    case 'debate-summary':
      return teachers[0]?.persona.id ?? null;

    case 'qa-answering':
    case 'qa-followup':
      // 助教或教师回答
      return assistants[0]?.persona.id ?? teachers[0]?.persona.id ?? null;

    default:
      return null;
  }
}

// ---- 核心编排函数 ----

/** 创建新的智能体会话 */
export function createSession(
  projectId: string,
  courseContext: string,
  personas?: AgentPersona[]
): AgentSession {
  const now = new Date().toISOString();
  const agents = (personas ?? defaultPersonas).map(p => ({
    persona: p,
    stance: undefined as DebateStance | undefined
  }));

  return {
    sessionId: `session-${Date.now()}`,
    projectId,
    mode: 'discussion',
    state: 'idle',
    agents,
    turns: [],
    currentTurn: 0,
    courseContext,
    chapterContext: '',
    studentInputQueue: [],
    createdAt: now,
    updatedAt: now
  };
}

/** 执行一次会话操作，返回更新后的会话和新生成的发言 */
export async function executeAction(
  session: AgentSession,
  action: SessionAction,
  llm?: LlmContext | null
): Promise<{ session: AgentSession; speech: AgentSpeech | null }> {
  const now = new Date().toISOString();

  // 更新交互模式
  let nextMode = session.mode;
  if (action.type === 'switch-mode' && action.payload?.targetMode) {
    nextMode = action.payload.targetMode;
  } else if (action.type === 'start-discussion') {
    nextMode = 'discussion';
  } else if (action.type === 'start-debate') {
    nextMode = 'debate';
  } else if (action.type === 'student-ask') {
    nextMode = 'qa';
  }

  // 转换状态
  const nextState = transitionState(session.state, action);

  // 确定发言者
  const speakerId = nextSpeaker(session, action);
  if (!speakerId) {
    return {
      session: { ...session, state: nextState, mode: nextMode, updatedAt: now },
      speech: null
    };
  }

  const speaker = session.agents.find(a => a.persona.id === speakerId);
  if (!speaker) {
    return {
      session: { ...session, state: nextState, mode: nextMode, updatedAt: now },
      speech: null
    };
  }

  // 分配辩论立场（立论阶段）
  if (action.type === 'start-debate') {
    const students = session.agents.filter(a => a.persona.role === 'student');
    const halfIdx = Math.ceil(students.length / 2);
    students.forEach((a, i) => {
      a.stance = i < halfIdx ? 'affirmative' : 'negative';
    });
    // 教师保持中立
    session.agents.forEach(a => {
      if (a.persona.role === 'teacher') a.stance = 'neutral';
    });
  }

  // 处理学生加入辩论
  if (action.type === 'student-join' && action.payload?.studentStance) {
    speaker.stance = action.payload.studentStance;
  }

  // 生成发言
  const turnIndex = session.currentTurn;
  const speech = await generateAgentSpeech(session, speaker, action, llm);

  // 更新轮次
  let nextTurns = [...session.turns];
  const currentTurnObj = nextTurns.find(t => t.turnIndex === turnIndex);
  if (currentTurnObj) {
    currentTurnObj.speeches.push(speech);
    currentTurnObj.completed = (action.type === 'teacher-wrapup');
  } else {
    nextTurns.push({
      turnIndex,
      speakerId,
      speeches: [speech],
      completed: (action.type === 'teacher-wrapup')
    });
  }

  return {
    session: {
      ...session,
      mode: nextMode,
      state: nextState,
      turns: nextTurns,
      currentTurn: action.type === 'teacher-wrapup' ? turnIndex + 1 : turnIndex,
      updatedAt: now
    },
    speech
  };
}
