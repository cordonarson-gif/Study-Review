import type { CreateProjectInput, QuestionDraft } from './types';

type WizardProjectState = {
  name: string;
  courseName: string;
  linkedFolder: string;
  examType: string;
  textbook: string;
  notes: string;
  requirements: string;
  mustKnow: string;
  keyPoints: string;
  initialQuestionText: string;
  provider: string;
  model: string;
};

export function validateWizardProject(wizard: WizardProjectState): string | null;
export function canCreateWizardProject(wizard: WizardProjectState): boolean;
export function getWizardStepError(wizard: WizardProjectState, step: number): string | null;
export function buildWizardProjectPayload(
  wizard: WizardProjectState,
  initialQuestions?: QuestionDraft[]
): CreateProjectInput;
