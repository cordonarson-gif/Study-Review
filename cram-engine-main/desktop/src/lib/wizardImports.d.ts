import type { QuestionDraft } from './types';

export function appendWizardValue(currentValue: string, incomingValue: string, separator?: string): string;
export function appendWizardFileList(currentValue: string, filePaths: string[], separator?: string): string;
export function formatQuestionDraftsForWizard(drafts: QuestionDraft[]): string;
export function resolveWizardQuestionImportText(drafts: QuestionDraft[], fallbackText?: string): string;
