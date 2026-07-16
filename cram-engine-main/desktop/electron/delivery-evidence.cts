export type DeliveryEvidenceKind = 'playable-questions' | 'wrong-questions' | 'knowledge-sources';

type EvidenceQuestion = {
  id: string;
  answer?: unknown;
  options?: Array<{ key?: unknown; text?: unknown }>;
  wrong?: boolean;
};

type EvidenceProject = {
  questions: EvidenceQuestion[];
  knowledgeBase: Array<{ id: string }>;
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

export function buildModeDeliveryEvidence(
  project: EvidenceProject,
  evidence?: DeliveryEvidenceKind
) {
  if (evidence === 'playable-questions') {
    return stablePrefixedIds('question', project.questions.filter(isPlayableQuestion));
  }
  if (evidence === 'wrong-questions') {
    return stablePrefixedIds('wrong-question', project.questions.filter((question) => question.wrong));
  }
  if (evidence === 'knowledge-sources') {
    return [
      ...stablePrefixedIds('knowledge', project.knowledgeBase),
      ...stablePrefixedIds('question', project.questions)
    ];
  }
  return [];
}
