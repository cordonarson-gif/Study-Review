# Learning Path Phase 2B Design

## Goal

Turn the `路径` workspace tab from a placeholder into a project-scoped learning path module. It should use the learning profile, questions, knowledge base, generated resources, and project metadata to produce a practical staged plan.

## Scope

This phase includes:

- Project-local persistence for one current learning path plan.
- A bounded PathAgent flow that can generate staged goals, daily tasks, review cadence, and risk reminders.
- Electron IPC and preload bridge methods for getting, generating, and saving the plan.
- A focused learning path page inside the existing project workspace.
- Deterministic local generation when API credentials are missing.

This phase does not implement stage reports, delivery package generation, calendar sync, notifications, or full multi-agent orchestration.

## User Experience

The `路径` tab becomes a working page with:

- A compact generation panel:
  - target date input
  - daily minutes input
  - focus input
  - generate button
- Plan summary:
  - goal
  - target date
  - daily minutes
  - confidence
- Stage cards:
  - stage name
  - objective
  - duration
  - tasks with status
  - linked resource ids
- Risk reminders and review cadence.
- Save button for manual edits.

The page stays project-scoped and does not add home-page shortcuts.

## Data Model

Project-local file:

```text
path/
└── plan.json
```

Plan shape:

```ts
type LearningPathTaskStatus = 'todo' | 'doing' | 'done';

type LearningPathTask = {
  id: string;
  title: string;
  detail: string;
  status: LearningPathTaskStatus;
  resourceIds: string[];
};

type LearningPathStage = {
  id: string;
  title: string;
  objective: string;
  duration: string;
  tasks: LearningPathTask[];
};

type LearningPathPlan = {
  version: 1;
  goal: string;
  targetDate: string;
  dailyMinutes: number;
  focus: string;
  stages: LearningPathStage[];
  reviewCadence: string[];
  risks: string[];
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};
```

Generation accepts:

```ts
type GenerateLearningPathInput = {
  targetDate: string;
  dailyMinutes: number;
  focus: string;
};
```

## Electron API

New IPC methods:

- `learningPath:get(projectId)` returns `LearningPathPlan | null`.
- `learningPath:generate(projectId, input)` returns `LearningPathPlan`.
- `learningPath:save(projectId, plan)` returns `LearningPathPlan`.

## PathAgent Behavior

The PathAgent reads:

- project metadata
- learning profile
- questions and weak knowledge points
- knowledge-base entries
- generated personalized resources

If provider credentials exist, it asks the configured model for a strict JSON plan and normalizes the result. If credentials are absent or parsing fails, it generates a deterministic local plan from profile weak points, question categories, resource availability, and the requested schedule.

## Error Handling

- Missing `plan.json` returns `null`.
- Invalid or partial saved plans are normalized.
- Blank target date becomes “未设定”.
- Invalid daily minutes fall back to 60.
- Model JSON parsing failures fall back to deterministic generation.
- Save updates `updatedAt` and preserves stable ids when possible.

## Testing

Tests must cover:

- Learning path types are declared globally and in renderer types.
- Electron main has project-local plan persistence helpers.
- IPC/preload exposes get/generate/save methods.
- PathAgent has deterministic fallback generation.
- App replaces the `path` placeholder with `LearningPathPage`.
- The page includes generation controls, stage cards, task status controls, risk reminders, and save action.
