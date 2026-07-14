const ALL_CATEGORY = '全部';
const CATEGORY_SEPARATOR = ' / ';

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
    return question.knowledgePoint === knowledgePoint && question.questionType === questionType;
  }

  return question.knowledgePoint === selectedCategory || question.category === selectedCategory;
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
