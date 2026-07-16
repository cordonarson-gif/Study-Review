export type QuestionOption = {
  key: string;
  text: string;
};

export type ReviewQuestion = {
  id: string;
  stem: string;
  options: QuestionOption[];
  answer: string;
  explanation: string;
  category: string;
  knowledgePoint: string;
  questionType: string;
  source: 'text' | 'file' | 'image' | 'manual' | 'ai';
  sourceName?: string;
  questionBankId?: string;
  questionBankName?: string;
  generatedBy?: 'import' | 'ai';
  favorite: boolean;
  wrong: boolean;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type QuestionDraft = Omit<ReviewQuestion, 'id' | 'favorite' | 'wrong' | 'attempts' | 'createdAt' | 'updatedAt'>;

const optionPattern = /^([A-Ha-h])[\.\uff0e\u3001\)]\s*(.+)$/;
const answerPattern = /(?:答案|参考答案|正确答案|答|answer|ans)[:：\s]*([A-Ha-h]|[^。\n]+)/i;
const explanationPattern = /(?:解析|说明|理由|explanation)[:：\s]*(.+)$/i;

function isPlaceholderLabel(value?: string) {
  const clean = String(value || '').trim();
  if (!clean) return true;
  if (/\?{2,}|�|□{2,}|_{3,}/.test(clean)) return true;
  const visible = clean.replace(/\s/g, '');
  const questionMarks = (visible.match(/\?/g) ?? []).length;
  return visible.length > 0 && questionMarks / visible.length > 0.35;
}

export function normalizeQuestionText(value: string) {
  return value.replace(/\r/g, '').replace(/[ \t]+$/gm, '').trim();
}

export function splitQuestionBlocks(text: string) {
  const normalized = normalizeQuestionText(text);
  if (!normalized) return [];

  const marked = normalized
    .replace(/\n(?=\s*(?:第\s*\d+\s*[题題]|[Qq]\d+[\.\uff0e\u3001)]|\d+[\.\uff0e\u3001)]))/g, '\n\n@@QUESTION@@');

  const blocks = marked
    .split(/\n{2,}|@@QUESTION@@/g)
    .map((item) => normalizeQuestionText(item))
    .filter((item) => item.length > 6);

  if (blocks.length > 1) return blocks;

  return normalized
    .split(/\n(?=\s*\d+[\.\uff0e\u3001)]\s*)/g)
    .map((item) => normalizeQuestionText(item))
    .filter((item) => item.length > 6);
}

export function inferQuestionType(options: QuestionOption[], stem: string) {
  if (options.length >= 2) return options.length > 4 ? '多选题' : '单选题';
  if (/判断|是否|对错|正确与否/.test(stem)) return '判断题';
  if (/简述|说明|分析|论述|为什么|如何/.test(stem)) return '简答题';
  return '问答题';
}

function normalizeKnowledgeFallback(value: string) {
  const base = value
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_()[\]（）【】]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (isPlaceholderLabel(base)) return '综合复习';
  if (/计算机组成|组成原理|计组/i.test(base)) return '计算机组成原理';
  if (/数据结构/.test(base)) return '数据结构';
  if (/操作系统|OS\b/i.test(base)) return '操作系统';
  if (/数据库|SQL/i.test(base)) return '数据库系统';
  return base || '综合复习';
}

export function normalizeQuestionBankName(value?: string) {
  const cleaned = (value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_()[\]（）【】]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (isPlaceholderLabel(cleaned)) return '导入题库';
  return cleaned || '默认题库';
}

export function createQuestionBankId(value?: string) {
  const name = normalizeQuestionBankName(value);
  let hash = 2166136261;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `question-bank-${(hash >>> 0).toString(36)}`;
}

function isInvalidKnowledgeCandidate(value: string) {
  const clean = value
    .replace(/^[\s\d第题題\.\uff0e、,，)）]+/, '')
    .trim();
  if (!clean) return true;
  if (isPlaceholderLabel(clean)) return true;
  if (/^(?:答|答案|参考答案|正确答案|解析|说明|理由|answer|ans)[:：\s]/i.test(clean)) return true;
  if (/^[A-Ha-h][\.\uff0e、)]/.test(clean)) return true;
  if (/^[=\-+*/\\\d.()\s]+[A-Za-z0-9=.\-+*/\\()\s]*$/.test(clean)) return true;
  if (/^[=\-+*/\\]/.test(clean)) return true;

  const cjkCount = (clean.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const alphaCount = (clean.match(/[A-Za-z]/g) ?? []).length;
  const signalCount = cjkCount + alphaCount;
  const symbolCount = (clean.match(/[=\-+*/\\|<>^~]/g) ?? []).length;
  if (signalCount < 2) return true;
  if (symbolCount > signalCount) return true;
  if (clean.length > 24) return true;
  if (/[？?]/.test(clean)) return true;
  if (/下列|采用|称为|通常|主要|描述|关于|正确|错误|是|为|____|（|）|\(|\)/.test(clean) && clean.length > 12) return true;
  return false;
}

function sanitizeKnowledgePoint(value: string, fallback: string) {
  const normalizedFallback = normalizeKnowledgeFallback(fallback);
  const clean = value
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !isInvalidKnowledgeCandidate(line))
    ?.replace(/^(?:知识点|考点|专题|分类)[:：\s]*/u, '')
    .trim() ?? '';

  if (isInvalidKnowledgeCandidate(clean)) return normalizedFallback;
  return clean.slice(0, 24);
}

export function inferKnowledgePoint(stem: string, fallback = '综合复习') {
  const clean = stem.replace(/^[\s\d第题題\.\uff0e\u3001)]+/, '').trim();
  const bracket = clean.match(/[【\[]([^】\]]{2,24})[】\]]/);
  if (bracket && !isInvalidKnowledgeCandidate(bracket[1])) return bracket[1].trim();

  const keywordRules: Array<[RegExp, string]> = [
    [/程序计数器|地址寄存器|指令寄存器|\bPC\b|\bMAR\b|\bMDR\b|\bIR\b|CPU|控制器|运算器|指令|微程序|流水线/i, 'CPU 与指令系统'],
    [/存储器|主存|内存|Cache|高速缓存|SRAM|DRAM|磁盘|外存|地址映射/i, '存储系统'],
    [/中断|I\/O|输入输出|总线|DMA|接口/i, 'I/O 与中断'],
    [/补码|原码|反码|浮点|定点|阶码|尾数|二进制|进制|规格化/i, '数据表示与运算'],
    [/计算机组成|组成原理|冯诺依曼/i, '计算机组成原理'],
    [/函数|导数|积分|极限|矩阵|概率|统计/, '数学基础'],
    [/细胞|遗传|生态|代谢|蛋白/, '生物学'],
    [/力学|电磁|热学|光学|波动/, '物理基础'],
    [/组织|管理|战略|绩效|激励/, '管理学'],
    [/法律|合同|责任|权利|义务/, '法律基础'],
    [/市场|需求|供给|成本|收益|价格/, '经济学'],
    [/语法|阅读|翻译|写作|词汇/, '语言能力']
  ];

  for (const [pattern, label] of keywordRules) {
    if (pattern.test(clean)) return label;
  }

  return sanitizeKnowledgePoint(clean, fallback);
}

export function parseQuestionBlock(block: string, source: QuestionDraft['source'], sourceName?: string): QuestionDraft {
  const lines = normalizeQuestionText(block).split('\n').map((line) => line.trim()).filter(Boolean);
  const options: QuestionOption[] = [];
  const stemLines: string[] = [];
  let answer = '';
  let explanation = '';

  for (const line of lines) {
    const option = line.match(optionPattern);
    const answerMatch = line.match(answerPattern);
    const explanationMatch = line.match(explanationPattern);

    if (option) {
      options.push({ key: option[1].toUpperCase(), text: option[2].trim() });
      continue;
    }

    if (answerMatch) {
      answer = answerMatch[1].trim();
      continue;
    }

    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
      continue;
    }

    stemLines.push(line);
  }

  const stem = stemLines.join('\n').replace(/^\s*(?:第\s*)?\d+\s*[题題]?[\.\uff0e\u3001)]?\s*/, '').trim() || block;
  const knowledgePoint = inferKnowledgePoint(stem, sourceName || '综合复习');
  const questionType = inferQuestionType(options, stem);
  const questionBankName = normalizeQuestionBankName(sourceName || '默认题库');

  return {
    stem,
    options,
    answer,
    explanation,
    category: `${knowledgePoint} / ${questionType}`,
    knowledgePoint,
    questionType,
    source,
    sourceName,
    questionBankId: createQuestionBankId(questionBankName),
    questionBankName,
    generatedBy: source === 'ai' ? 'ai' : 'import'
  };
}

export function parseQuestionDrafts(text: string, source: QuestionDraft['source'], sourceName?: string) {
  return splitQuestionBlocks(text).map((block) => parseQuestionBlock(block, source, sourceName));
}

export function groupCategories(questions: ReviewQuestion[]) {
  return Array.from(new Set(questions.map((question) => question.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
