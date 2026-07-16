import type { ReviewQuestion } from './types';

export type PracticeMode = 'category' | 'random' | 'wrong';

export type PracticeFilterOptions = {
  mode: PracticeMode;
  selectedCategory: string;
  selectedQuestionBank?: string;
  shuffleSeed: number;
};

export type QuestionBankSummary = {
  id: string;
  name: string;
  count: number;
};

export function seededQuestionWeight(value: string, seed: number): number;
export function normalizePracticeKnowledgePoint(question: ReviewQuestion): string;
export function getPracticeQuestionBankId(question: ReviewQuestion): string;
export function buildQuestionBanks(questions: ReviewQuestion[]): QuestionBankSummary[];
export function getPracticeCategoryLabel(question: ReviewQuestion): string;
export function matchesPracticeCategory(question: ReviewQuestion, selectedCategory: string): boolean;
export function filterPracticeQuestions(
  questions: ReviewQuestion[],
  options: PracticeFilterOptions
): ReviewQuestion[];
