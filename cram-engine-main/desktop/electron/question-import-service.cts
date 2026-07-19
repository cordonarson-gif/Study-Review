import type { QuestionDraft, QuestionOption } from './question-utils.cjs';

export type AnswerInferenceQuestion = {
  id: string;
  stem: string;
  options: QuestionOption[];
  questionType: string;
};

export type AnswerInferenceResult = {
  id: string;
  answer: string;
};

export type AnswerInference = (
  questions: AnswerInferenceQuestion[]
) => Promise<AnswerInferenceResult[]>;

const OBJECTIVE_QUESTION_TYPES = new Set(['单选题', '多选题', '判断题']);

function chunkQuestions(questions: AnswerInferenceQuestion[], size: number) {
  const batches: AnswerInferenceQuestion[][] = [];
  for (let offset = 0; offset < questions.length; offset += size) {
    batches.push(questions.slice(offset, offset + size));
  }
  return batches;
}

function isOpenQuestion(question: AnswerInferenceQuestion) {
  return !OBJECTIVE_QUESTION_TYPES.has(question.questionType);
}

export function createAnswerInferenceBatches(questions: AnswerInferenceQuestion[]) {
  const objective = questions.filter((question) => !isOpenQuestion(question));
  const open = questions.filter(isOpenQuestion);
  return [
    ...chunkQuestions(objective, 20),
    ...chunkQuestions(open, 3)
  ];
}

export async function inferAnswersInBatches(
  questions: AnswerInferenceQuestion[],
  inferBatch: AnswerInference
): Promise<AnswerInferenceResult[]> {
  const answerById = new Map<string, string>();

  async function request(batch: AnswerInferenceQuestion[]) {
    try {
      const allowedIds = new Set(batch.map((question) => question.id));
      const replies = await inferBatch(batch);
      for (const reply of replies) {
        const answer = reply.answer.trim();
        if (allowedIds.has(reply.id) && answer) answerById.set(reply.id, answer);
      }
    } catch {
      // Missing open answers are retried individually below.
    }
  }

  for (const batch of createAnswerInferenceBatches(questions)) {
    await request(batch);
  }

  const unresolvedOpen = questions.filter((question) => (
    isOpenQuestion(question) && !answerById.has(question.id)
  ));
  for (const question of unresolvedOpen) {
    await request([question]);
  }

  return questions.flatMap((question) => {
    const answer = answerById.get(question.id);
    return answer ? [{ id: question.id, answer }] : [];
  });
}

export type AnswerInferenceStatus = 'not-needed' | 'not-configured' | 'completed' | 'partial' | 'failed';

export type StructureRepairQuestion = {
  id: string;
  stem: string;
  options: QuestionOption[];
  questionType: string;
};

export type StructureRepairResult = StructureRepairQuestion;
export type StructureRepair = (questions: StructureRepairQuestion[]) => Promise<StructureRepairResult[]>;

export type AnswerEnrichmentResult = {
  drafts: QuestionDraft[];
  aiStatus: AnswerInferenceStatus;
  summary: {
    total: number;
    ready: number;
    needsReview: number;
    inferred: number;
    missing: number;
  };
};

export function parseAnswerInferenceJson(content: string): AnswerInferenceResult[] {
  const unfenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content;
  const json = unfenced.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0];
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { answers?: unknown })?.answers)
        ? (parsed as { answers: unknown[] }).answers
        : [];
    return values
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
      .map((value) => ({ id: String(value.id ?? '').trim(), answer: String(value.answer ?? '').trim() }))
      .filter((value) => Boolean(value.id && value.answer));
  } catch {
    return [];
  }
}

export function parseStructureRepairJson(content: string): StructureRepairResult[] {
  const unfenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content;
  const json = unfenced.match(/\{[\s\S]*\}|\[[\s\S]*\]/)?.[0];
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as { questions?: unknown })?.questions)
        ? (parsed as { questions: unknown[] }).questions
        : [];
    return values
      .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
      .map((value) => ({
        id: String(value.id ?? '').trim(),
        stem: String(value.stem ?? '').trim(),
        questionType: String(value.questionType ?? '').trim(),
        options: Array.isArray(value.options)
          ? value.options
            .filter((option): option is Record<string, unknown> => Boolean(option) && typeof option === 'object')
            .map((option) => ({ key: String(option.key ?? '').trim().toUpperCase(), text: String(option.text ?? '').trim() }))
            .filter((option) => Boolean(option.key && option.text))
          : []
      }))
      .filter((value) => Boolean(value.id && value.stem && value.questionType));
  } catch {
    return [];
  }
}

export async function repairLowConfidenceDrafts(
  drafts: QuestionDraft[],
  repair?: StructureRepair
): Promise<QuestionDraft[]> {
  const candidates = drafts
    .map((draft, index) => ({ draft, index }))
    .filter(({ draft }) => draft.parseConfidence === 'low');
  if (!candidates.length || !repair) return drafts;

  let replies: StructureRepairResult[];
  try {
    replies = await repair(candidates.map(({ draft, index }) => ({
      id: String(index),
      stem: draft.stem,
      options: draft.options,
      questionType: draft.questionType
    })));
  } catch {
    return drafts;
  }

  const replyById = new Map(replies.map((reply) => [reply.id, reply]));
  return drafts.map((draft, index) => {
    if (draft.parseConfidence !== 'low') return draft;
    const reply = replyById.get(String(index));
    if (!reply) return draft;
    const isChoice = reply.questionType === '单选题' || reply.questionType === '多选题';
    const keys = new Set(reply.options.map((option) => option.key));
    if (!reply.stem || (isChoice && (reply.options.length < 2 || keys.size !== reply.options.length))) return draft;
    return {
      ...draft,
      stem: reply.stem,
      options: reply.options,
      questionType: reply.questionType,
      category: `${draft.knowledgePoint} / ${reply.questionType}`,
      parseConfidence: 'medium',
      reviewStatus: 'needs-review',
      parseWarnings: [
        ...(draft.parseWarnings ?? []).filter((warning) => !warning.startsWith('选择题选项不足')),
        'AI 已修复低置信度结构，请人工确认'
      ]
    };
  });
}

function normalizeInferredAnswer(draft: QuestionDraft, value: string) {
  const answer = String(value || '').trim().replace(/[。；;，,\s]+$/g, '');
  if (!answer) return '';

  if (draft.questionType === '判断题') {
    if (/^(?:正确|对|是|true|√)$/i.test(answer)) return '正确';
    if (/^(?:错误|错|否|false|×|x)$/i.test(answer)) return '错误';
    return '';
  }

  if (draft.questionType === '单选题' || draft.questionType === '多选题') {
    const compact = answer.toUpperCase().replace(/[^A-H]/g, '');
    if (!compact || (draft.questionType === '单选题' && compact.length !== 1)) return '';
    const allowed = new Set(draft.options.map((option) => option.key.toUpperCase()));
    return Array.from(new Set(compact.split(''))).every((key) => allowed.has(key))
      ? Array.from(new Set(compact.split(''))).join('')
      : '';
  }

  return answer;
}

function summarize(drafts: QuestionDraft[]) {
  return {
    total: drafts.length,
    ready: drafts.filter((draft) => draft.reviewStatus === 'ready').length,
    needsReview: drafts.filter((draft) => draft.reviewStatus === 'needs-review').length,
    inferred: drafts.filter((draft) => draft.answerSource === 'ai-inferred').length,
    missing: drafts.filter((draft) => !draft.answer).length
  };
}

export async function enrichMissingAnswers(
  drafts: QuestionDraft[],
  inferAnswers?: AnswerInference
): Promise<AnswerEnrichmentResult> {
  const missing = drafts
    .map((draft, index) => ({ draft, index }))
    .filter(({ draft }) => !draft.answer);

  if (!missing.length) {
    return { drafts, aiStatus: 'not-needed', summary: summarize(drafts) };
  }
  if (!inferAnswers) {
    return { drafts, aiStatus: 'not-configured', summary: summarize(drafts) };
  }

  let replies: AnswerInferenceResult[];
  try {
    replies = await inferAnswers(missing.map(({ draft, index }) => ({
      id: String(index),
      stem: draft.stem,
      options: draft.options,
      questionType: draft.questionType
    })));
  } catch {
    const failed = drafts.map((draft) => !draft.answer ? {
      ...draft,
      parseWarnings: Array.from(new Set([...(draft.parseWarnings ?? []), 'AI 答案推断失败，请人工确认']))
    } : draft);
    return { drafts: failed, aiStatus: 'failed', summary: summarize(failed) };
  }

  const replyById = new Map(replies.map((reply) => [reply.id, reply.answer]));
  let inferred = 0;
  const enriched = drafts.map((draft, index) => {
    if (draft.answer) return draft;
    const normalized = normalizeInferredAnswer(draft, replyById.get(String(index)) ?? '');
    if (!normalized) {
      return {
        ...draft,
        answerSource: 'missing' as const,
        reviewStatus: 'needs-review' as const,
        parseWarnings: Array.from(new Set([...(draft.parseWarnings ?? []), 'AI 返回的答案无效，请人工确认']))
      };
    }

    inferred += 1;
    const warnings = (draft.parseWarnings ?? []).filter((warning) => warning !== '未识别到答案');
    const hasStructuralWarning = warnings.some((warning) => !warning.startsWith('AI '));
    return {
      ...draft,
      answer: normalized,
      answerSource: 'ai-inferred' as const,
      reviewStatus: hasStructuralWarning ? 'needs-review' as const : 'ready' as const,
      parseWarnings: warnings
    };
  });

  const aiStatus: AnswerInferenceStatus = inferred === missing.length
    ? 'completed'
    : inferred > 0
      ? 'partial'
      : 'failed';
  return { drafts: enriched, aiStatus, summary: summarize(enriched) };
}
