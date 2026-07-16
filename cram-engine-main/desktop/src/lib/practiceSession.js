const ALL_CATEGORY = '全部';
const ALL_BANK_ID = 'all';
const CATEGORY_SEPARATOR = ' / ';

function isPlaceholderLabel(value) {
  const clean = String(value || '').trim();
  if (!clean) return true;
  if (/\?{2,}|�|□{2,}|_{3,}/.test(clean)) return true;
  const visible = clean.replace(/\s/g, '');
  const questionMarks = (visible.match(/\?/g) ?? []).length;
  return visible.length > 0 && questionMarks / visible.length > 0.35;
}

function cleanFallbackSource(value) {
  const cleaned = (value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_()[\]（）【】]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (isPlaceholderLabel(cleaned)) return '综合复习';
  if (/计算机组成|组成原理|计组/i.test(cleaned)) return '计算机组成原理';
  return cleaned || '综合复习';
}

function isNoisyKnowledgePoint(value) {
  const clean = String(value || '').trim();
  if (!clean) return true;
  if (isPlaceholderLabel(clean)) return true;
  if (/^(?:答|答案|参考答案|正确答案|解析)[:：\s]/.test(clean)) return true;
  if (/^[=\-+*/\\]/.test(clean)) return true;
  const cjkCount = (clean.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const alphaCount = (clean.match(/[A-Za-z]/g) ?? []).length;
  const symbolCount = (clean.match(/[=\-+*/\\|<>^~]/g) ?? []).length;
  if (cjkCount + alphaCount < 2 || symbolCount > cjkCount + alphaCount) return true;
  if (clean.length > 24) return true;
  if (/[？?]/.test(clean)) return true;
  if (/下列|采用|称为|通常|主要|描述|关于|正确|错误|是|为|____|（|）|\(|\)/.test(clean) && clean.length > 12) return true;
  return false;
}

function normalizeQuestionBankName(question) {
  const raw = question.questionBankName || question.sourceName || '默认题库';
  const cleaned = String(raw)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_()[\]（）【】]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (isPlaceholderLabel(cleaned)) return '导入题库';
  return cleaned || '默认题库';
}

function createQuestionBankId(value) {
  const name = String(value || '默认题库');
  let hash = 2166136261;
  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `question-bank-${(hash >>> 0).toString(36)}`;
}

export function getPracticeQuestionBankId(question) {
  return question.questionBankId || createQuestionBankId(normalizeQuestionBankName(question));
}

export function buildQuestionBanks(questions) {
  const byId = new Map();
  for (const question of questions) {
    const name = normalizeQuestionBankName(question);
    const id = getPracticeQuestionBankId(question);
    const current = byId.get(id);
    byId.set(id, {
      id,
      name: current?.name || name,
      count: (current?.count ?? 0) + 1
    });
  }
  return [
    { id: ALL_BANK_ID, name: '全部题库', count: questions.length },
    ...Array.from(byId.values()).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'))
  ];
}

export function normalizePracticeKnowledgePoint(question) {
  const raw = question.knowledgePoint || question.category?.split(CATEGORY_SEPARATOR)[0] || '';
  if (!isNoisyKnowledgePoint(raw)) return String(raw).trim();
  if (/程序计数器|地址寄存器|\bPC\b|\bMAR\b|CPU|指令|微程序/i.test(question.stem || '')) return 'CPU 与指令系统';
  if (/存储器|Cache|SRAM|DRAM|磁盘|主存/i.test(question.stem || '')) return '存储系统';
  if (/补码|浮点|定点|阶码|尾数|二进制|进制/i.test(question.stem || '')) return '数据表示与运算';
  return cleanFallbackSource(question.sourceName);
}

export function getPracticeCategoryLabel(question) {
  const questionType = isPlaceholderLabel(question.questionType) ? '通用题型' : (question.questionType || '通用题型');
  return `${normalizePracticeKnowledgePoint(question)}${CATEGORY_SEPARATOR}${questionType}`;
}

export function seededQuestionWeight(value, seed) {
  let hash = seed || 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function matchesPracticeCategory(question, selectedCategory) {
  if (!selectedCategory || selectedCategory === ALL_CATEGORY) {
    return true;
  }

  const dividerIndex = selectedCategory.indexOf(CATEGORY_SEPARATOR);
  if (dividerIndex >= 0) {
    const knowledgePoint = selectedCategory.slice(0, dividerIndex);
    const questionType = selectedCategory.slice(dividerIndex + CATEGORY_SEPARATOR.length);
    const normalizedQuestionType = isPlaceholderLabel(question.questionType) ? '通用题型' : question.questionType;
    return normalizePracticeKnowledgePoint(question) === knowledgePoint && normalizedQuestionType === questionType;
  }

  return normalizePracticeKnowledgePoint(question) === selectedCategory || getPracticeCategoryLabel(question) === selectedCategory;
}

export function filterPracticeQuestions(questions, options) {
  const { mode, selectedCategory, selectedQuestionBank = ALL_BANK_ID, shuffleSeed } = options;
  const bankPool = !selectedQuestionBank || selectedQuestionBank === ALL_BANK_ID
    ? questions
    : questions.filter((question) => getPracticeQuestionBankId(question) === selectedQuestionBank);
  const pool = mode === 'wrong'
    ? bankPool.filter((question) => question.wrong)
    : bankPool.filter((question) => matchesPracticeCategory(question, selectedCategory));

  if (mode !== 'random') {
    return pool;
  }

  return [...pool].sort((left, right) => {
    return seededQuestionWeight(left.id, shuffleSeed) - seededQuestionWeight(right.id, shuffleSeed);
  });
}
