import type { KnowledgeBaseEntry, ModeArtifact, ReviewQuestion } from './types';

export type ParameterSweepModel = 'linear' | 'decay' | 'saturation';

export type ParameterSweepInput = {
  model: ParameterSweepModel;
  start: number;
  end: number;
  steps: number;
  coefficient: number;
  initialValue: number;
};

export type ParameterSweepPoint = {
  x: number;
  y: number;
};

export type ParameterSweepResult = {
  points: ParameterSweepPoint[];
};

export type KnowledgeGraphNodeType =
  | 'knowledge'
  | 'tag'
  | 'knowledge-point'
  | 'question'
  | 'artifact';

export type KnowledgeGraphEdgeType = 'tag' | 'knowledge-point';

export type KnowledgeGraphNode = {
  id: string;
  type: KnowledgeGraphNodeType;
  label: string;
  description: string;
  sourceId?: string;
};

export type PositionedKnowledgeGraphNode = KnowledgeGraphNode & {
  x: number;
  y: number;
};

export type KnowledgeGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: KnowledgeGraphEdgeType;
};

export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

export type PositionedKnowledgeGraph = {
  nodes: PositionedKnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};

export type KnowledgeGraphInput = {
  knowledgeBase?: readonly KnowledgeBaseEntry[];
  questions?: readonly ReviewQuestion[];
  artifacts?: readonly ModeArtifact[];
};

export type CoursewareSlide = {
  id: string;
  title: string;
  content: string;
};

export function runParameterSweep(input: ParameterSweepInput): ParameterSweepResult;
export function buildKnowledgeGraph(input?: KnowledgeGraphInput): KnowledgeGraph;
export function layoutKnowledgeGraph(graph: KnowledgeGraph, width: number, height: number): PositionedKnowledgeGraph;
export function parseCoursewareSlides(markdown: string): CoursewareSlide[];
export function getPlayableQuestions(questions: readonly ReviewQuestion[]): ReviewQuestion[];
