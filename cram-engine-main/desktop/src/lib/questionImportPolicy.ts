import type { QuestionDraft, QuestionImportPreviewResult } from './types';

export function shouldPromptForAnswerlessImport(
  drafts: QuestionDraft[],
  aiStatus: QuestionImportPreviewResult['aiStatus']
) {
  return aiStatus === 'not-configured'
    && drafts.some((draft) => !draft.answer.trim())
    && drafts.every((draft) => draft.answerSource !== 'question-bank');
}
