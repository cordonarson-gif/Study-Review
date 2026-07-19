const QUESTION_TYPE_ALIASES = new Map([
  ['单选题', 'single-choice'],
  ['单选', 'single-choice'],
  ['multiple-choice', 'multiple-choice'],
  ['多选题', 'multiple-choice'],
  ['多选', 'multiple-choice'],
  ['判断题', 'true-false'],
  ['判断', 'true-false'],
  ['填空题', 'fill-blank'],
  ['填空', 'fill-blank'],
  ['简答题', 'short-answer'],
  ['简答', 'short-answer'],
  ['计算题', 'short-answer'],
  ['single-choice', 'single-choice'],
  ['true-false', 'true-false'],
  ['fill-blank', 'fill-blank'],
  ['short-answer', 'short-answer']
]);

function inferQuestionType(question) {
  const declared = QUESTION_TYPE_ALIASES.get(String(question.questionType || '').trim());
  if (declared) return declared;
  return Array.isArray(question.options) && question.options.length > 1 ? 'single-choice' : 'short-answer';
}

function inferAcceptedAnswers(questionType, answer) {
  const value = String(answer || '').trim();
  if (!value) return [];
  if (questionType === 'multiple-choice') {
    return [[...new Set(value.toUpperCase().match(/[A-Z]/g) ?? [])].sort()];
  }
  if (questionType === 'fill-blank') {
    return value.split(/\s*[|；;]\s*/).filter(Boolean).map((item) => [item]);
  }
  return [[value]];
}

export function inferAssessmentQuestionMeta(question) {
  const questionType = inferQuestionType(question);
  return {
    questionType,
    difficulty: 'intermediate',
    defaultPoints: questionType === 'short-answer' ? 10 : 2,
    acceptedAnswers: inferAcceptedAnswers(questionType, question.answer),
    scoringPoints: [],
    readiness: 'needs-review'
  };
}

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function allocatePoints(questions, requestedTotal) {
  const weights = questions.map((question) => Math.max(0.5, Number(question.assessmentMeta.defaultPoints) || 1));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const target = Math.max(questions.length, Number(requestedTotal) || weightTotal);
  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return Number((target - allocated).toFixed(1));
    const points = Math.max(0.5, Math.round(((target * weight) / weightTotal) * 2) / 2);
    allocated += points;
    return points;
  });
}

export function createAssessmentPaper({ id, title, questions, blueprint, now = new Date().toISOString() }) {
  const requestedCount = Math.max(1, Number(blueprint.questionCount) || 1);
  const eligible = questions.filter((question) => question.assessmentMeta?.readiness === 'ready');
  if (eligible.length < requestedCount) {
    throw new Error(`可用已校订题目不足：需要 ${requestedCount} 道，当前 ${eligible.length} 道`);
  }

  const selected = eligible.slice(0, requestedCount);
  const points = allocatePoints(selected, blueprint.totalPoints);
  const items = selected.map((question, index) => ({
    id: `${id}-item-${index + 1}`,
    questionId: question.id,
    order: index + 1,
    points: points[index],
    question: clone(question)
  }));

  return {
    id,
    version: 1,
    revision: 1,
    title: String(title || '未命名试卷').trim() || '未命名试卷',
    status: 'draft',
    blueprint: clone(blueprint),
    items,
    totalPoints: points.reduce((sum, value) => sum + value, 0),
    durationMinutes: Math.max(1, Number(blueprint.durationMinutes) || 30),
    createdAt: now,
    updatedAt: now
  };
}
