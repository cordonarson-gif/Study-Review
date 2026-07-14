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
  source: 'text' | 'file' | 'image' | 'manual';
  sourceName?: string;
  favorite: boolean;
  wrong: boolean;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type QuestionDraft = Omit<ReviewQuestion, 'id' | 'favorite' | 'wrong' | 'attempts' | 'createdAt' | 'updatedAt'>;

const optionPattern = /^([A-Ha-h])[\.\uff0e\u3001\)]\s*(.+)$/;
const answerPattern = /(?:答案|参考答案|正确答案|answer|ans)[:：\s]*([A-Ha-h]|[^。\n]+)/i;
const explanationPattern = /(?:解析|说明|理由|explanation)[:：\s]*(.+)$/i;

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

export function inferKnowledgePoint(stem: string, fallback = '综合复习') {
  const clean = stem.replace(/^[\s\d第题題\.\uff0e\u3001)]+/, '').trim();
  const bracket = clean.match(/[【\[]([^】\]]{2,24})[】\]]/);
  if (bracket) return bracket[1].trim();

  const keywordRules: Array<[RegExp, string]> = [
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

  return clean.slice(0, 18) || fallback;
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

  return {
    stem,
    options,
    answer,
    explanation,
    category: `${knowledgePoint} / ${questionType}`,
    knowledgePoint,
    questionType,
    source,
    sourceName
  };
}

export function parseQuestionDrafts(text: string, source: QuestionDraft['source'], sourceName?: string) {
  return splitQuestionBlocks(text).map((block) => parseQuestionBlock(block, source, sourceName));
}

export function groupCategories(questions: ReviewQuestion[]) {
  return Array.from(new Set(questions.map((question) => question.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN'));
}
