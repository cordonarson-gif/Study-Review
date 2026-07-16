export type DeliveryEvidenceKind = 'playable-questions' | 'wrong-questions' | 'knowledge-sources';
export type DeliveryEvidenceStatus = 'missing' | 'needs-review' | 'ready';

export type ModeDeliveryEvidenceAssessment = {
  sourceIds: string[];
  status: DeliveryEvidenceStatus;
};

type EvidenceQuestion = {
  id: string;
  stem?: unknown;
  answer?: unknown;
  options?: Array<{ key?: unknown; text?: unknown }>;
  explanation?: unknown;
  knowledgePoint?: unknown;
  wrong?: boolean;
};

type EvidenceKnowledgeEntry = {
  id: string;
  title?: unknown;
  summary?: unknown;
  tags?: unknown[];
  source?: unknown;
  updatedAt?: unknown;
};

type EvidenceProject = {
  questions: EvidenceQuestion[];
  knowledgeBase: EvidenceKnowledgeEntry[];
};

type DeliveryPackageEvidenceSources = {
  items: Array<{ sourceIds: string[] }>;
};

export type DeliveryEvidencePayload = {
  questions: Array<{
    id: string;
    stem: string;
    options: Array<{ key: string; text: string }>;
    answer: string;
    explanation: string;
    knowledgePoint: string;
    wrong: boolean;
  }>;
  knowledgeBase: Array<{
    id: string;
    title: string;
    summary: string;
    tags: string[];
    source: string;
    updatedAt: string;
  }>;
};

function cleanText(value: unknown) {
  return String(value ?? '').trim();
}

function stablePrefixedIds(prefix: string, items: Array<{ id: string }>) {
  const ids = new Set<string>();
  for (const item of items) {
    const id = cleanText(item.id);
    if (id) ids.add(`${prefix}:${id}`);
  }
  return [...ids];
}

function isPlayableQuestion(question: EvidenceQuestion) {
  const answer = cleanText(question.answer).toUpperCase();
  const options = Array.isArray(question.options)
    ? question.options
        .map((option) => ({
          key: cleanText(option?.key).toUpperCase(),
          text: cleanText(option?.text)
        }))
        .filter((option) => option.key && option.text)
    : [];
  const optionKeys = new Set(options.map((option) => option.key));
  return options.length >= 2 && optionKeys.size === options.length && optionKeys.has(answer);
}

export function assessModeDeliveryEvidence(
  project: EvidenceProject,
  evidence: DeliveryEvidenceKind
): ModeDeliveryEvidenceAssessment {
  if (evidence === 'playable-questions') {
    const sourceIds = stablePrefixedIds('question', project.questions.filter(isPlayableQuestion));
    return { sourceIds, status: sourceIds.length ? 'ready' : 'missing' };
  }
  if (evidence === 'wrong-questions') {
    const wrongQuestions = project.questions.filter((question) => question.wrong);
    const sourceIds = stablePrefixedIds('wrong-question', wrongQuestions);
    if (!sourceIds.length) return { sourceIds, status: 'missing' };
    const complete = wrongQuestions.every((question) =>
      cleanText(question.stem) && cleanText(question.answer) && cleanText(question.explanation)
    );
    return { sourceIds, status: complete ? 'ready' : 'needs-review' };
  }
  const sourceIds = [
      ...stablePrefixedIds('knowledge', project.knowledgeBase),
      ...stablePrefixedIds('question', project.questions)
    ];
  return { sourceIds, status: sourceIds.length ? 'ready' : 'missing' };
}

export function selectDeliveryEvidence(
  project: EvidenceProject,
  deliveryPackage: DeliveryPackageEvidenceSources
): DeliveryEvidencePayload {
  const referencedIds = new Set(deliveryPackage.items.flatMap((item) => item.sourceIds));
  const seenQuestionIds = new Set<string>();
  const seenKnowledgeIds = new Set<string>();

  const questions = project.questions.flatMap((question) => {
    const id = cleanText(question.id);
    const referenced = referencedIds.has(`question:${id}`) || referencedIds.has(`wrong-question:${id}`);
    if (!id || !referenced || seenQuestionIds.has(id)) return [];
    seenQuestionIds.add(id);
    return [{
      id,
      stem: cleanText(question.stem),
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({ key: cleanText(option?.key), text: cleanText(option?.text) }))
        : [],
      answer: cleanText(question.answer),
      explanation: cleanText(question.explanation),
      knowledgePoint: cleanText(question.knowledgePoint),
      wrong: Boolean(question.wrong)
    }];
  });

  const knowledgeBase = project.knowledgeBase.flatMap((entry) => {
    const id = cleanText(entry.id);
    if (!id || !referencedIds.has(`knowledge:${id}`) || seenKnowledgeIds.has(id)) return [];
    seenKnowledgeIds.add(id);
    return [{
      id,
      title: cleanText(entry.title),
      summary: cleanText(entry.summary),
      tags: Array.isArray(entry.tags) ? entry.tags.map(cleanText).filter(Boolean) : [],
      source: cleanText(entry.source),
      updatedAt: cleanText(entry.updatedAt)
    }];
  });

  return { questions, knowledgeBase };
}
