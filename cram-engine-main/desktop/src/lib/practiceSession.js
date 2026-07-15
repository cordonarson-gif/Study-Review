const ALL_CATEGORY = '全部';
const CATEGORY_SEPARATOR = ' / ';

function cleanFallbackSource(value) {
  const cleaned = (value || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_()[\]（）【】]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/计算机组成|组成原理|计组/i.test(cleaned)) return '计算机组成原理';
  return cleaned || '综合复习';
}

function isNoisyKnowledgePoint(value) {
  const clean = String(value || '').trim();
  if (!clean) return true;
  if (/^(?:答|答案|参考答案|正确答案|解析)[:：\s]/.test(clean)) return true;
  if (/^[=\-+*/\\]/.test(clean)) return true;
  const cjkCount = (clean.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const alphaCount = (clean.match(/[A-Za-z]/g) ?? []).length;
  const symbolCount = (clean.match(/[=\-+*/\\|<>^~]/g) ?? []).length;
  return cjkCount + alphaCount < 2 || symbolCount > cjkCount + alphaCount;
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
  return `${normalizePracticeKnowledgePoint(question)}${CATEGORY_SEPARATOR}${question.questionType || '通用题型'}`;
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
    return normalizePracticeKnowledgePoint(question) === knowledgePoint && question.questionType === questionType;
  }

  return normalizePracticeKnowledgePoint(question) === selectedCategory || getPracticeCategoryLabel(question) === selectedCategory;
}

export function filterPracticeQuestions(questions, options) {
  const { mode, selectedCategory, shuffleSeed } = options;
  const pool = mode === 'wrong'
    ? questions.filter((question) => question.wrong)
    : questions.filter((question) => matchesPracticeCategory(question, selectedCategory));

  if (mode !== 'random') {
    return pool;
  }

  return [...pool].sort((left, right) => {
    return seededQuestionWeight(left.id, shuffleSeed) - seededQuestionWeight(right.id, shuffleSeed);
  });
}
