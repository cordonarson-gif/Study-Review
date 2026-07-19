import type { QuestionDraft } from './question-utils.cjs';

export type ExampleProjectInput = {
  mode: 'exam-review';
  name: string;
  courseName: string;
  examType: string;
  textbook: string;
  notes: string;
  requirements: string;
  mustKnow: string[];
  keyPoints: string[];
  provider: string;
  model: string;
  initialQuestions: QuestionDraft[];
};

export type ExampleProjectDependencies = {
  isInitialized: () => Promise<boolean>;
  hasProjectRegistry: () => Promise<boolean>;
  createProject: (input: ExampleProjectInput) => Promise<unknown>;
  markInitialized: () => Promise<void>;
};

export type ExampleInitializationResult = 'created' | 'existing-data' | 'already-initialized';

export function createExampleProjectInput(): ExampleProjectInput {
  const shared = {
    explanation: '',
    category: '计算机网络',
    source: 'manual' as const,
    sourceName: '内置入门示例',
    questionBankId: 'network-basics-example',
    questionBankName: '计算机网络基础题库',
    answerSource: 'question-bank' as const,
    reviewStatus: 'ready' as const,
    parseConfidence: 'high' as const
  };

  return {
    mode: 'exam-review',
    name: '示例项目：计算机网络基础',
    courseName: '计算机网络基础',
    examType: '单选题、判断题、简答题',
    textbook: '内置入门示例',
    notes: '用于了解知识点、题库和练习流程。',
    requirements: '掌握分层模型、IP 地址和可靠传输的基本概念。',
    mustKnow: ['OSI 七层模型', 'IP 地址与子网', 'TCP 可靠传输'],
    keyPoints: ['分层封装', '子网掩码', 'TCP 三次握手'],
    provider: 'openai-compatible',
    model: 'gpt-4.1',
    initialQuestions: [
      {
        ...shared,
        stem: 'OSI 参考模型中，负责端到端可靠传输的是哪一层？',
        options: [
          { key: 'A', text: '物理层' },
          { key: 'B', text: '数据链路层' },
          { key: 'C', text: '传输层' },
          { key: 'D', text: '表示层' }
        ],
        answer: 'C',
        explanation: '传输层在通信两端之间提供可靠传输、流量控制等能力。',
        knowledgePoint: 'OSI 七层模型',
        questionType: '单选题'
      },
      {
        ...shared,
        stem: 'IPv4 地址由 32 位二进制数组成。',
        options: [
          { key: 'A', text: '正确' },
          { key: 'B', text: '错误' }
        ],
        answer: '正确',
        explanation: 'IPv4 地址长度为 32 位，通常以点分十进制表示。',
        knowledgePoint: 'IPv4 地址',
        questionType: '判断题'
      },
      {
        ...shared,
        stem: '简述子网掩码的作用。',
        options: [],
        answer: '子网掩码用于区分 IP 地址中的网络位与主机位，并判断两个地址是否属于同一子网。',
        explanation: '通过 IP 地址与子网掩码按位与，可得到网络地址。',
        knowledgePoint: '子网掩码',
        questionType: '简答题'
      },
      {
        ...shared,
        stem: 'TCP 建立连接为什么需要三次握手？',
        options: [],
        answer: '三次握手能让双方确认对方的发送和接收能力，同步初始序列号，并避免历史连接请求导致错误建连。',
        explanation: '前两次交换建立了双向确认的基础，第三次确认使服务端确定客户端已收到同步信息。',
        knowledgePoint: 'TCP 三次握手',
        questionType: '简答题'
      }
    ]
  };
}

export async function initializeExampleProject(
  dependencies: ExampleProjectDependencies
): Promise<ExampleInitializationResult> {
  if (await dependencies.isInitialized()) return 'already-initialized';

  if (await dependencies.hasProjectRegistry()) {
    await dependencies.markInitialized();
    return 'existing-data';
  }

  await dependencies.createProject(createExampleProjectInput());
  await dependencies.markInitialized();
  return 'created';
}
