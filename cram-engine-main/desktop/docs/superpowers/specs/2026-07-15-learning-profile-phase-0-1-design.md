# Phase 0+1 Learning Profile Design

## Goal

Upgrade the existing project workspace from a resource-and-practice tool into the first slice of a profile-driven personalized learning system. This phase adds the page skeleton required by the A3 contest direction and implements the student learning profile system with a first ProfileAgent.

## Scope

This phase includes:

- Add workspace tabs for future contest modules: learning profile, agents, resources, learning path, report, and delivery.
- Implement the learning profile page.
- Persist a project-local profile file.
- Provide Electron IPC methods to get, save, and analyze the profile.
- Add a ProfileAgent-style analysis flow that can build or refresh a profile from natural language, project metadata, uploads, questions, and chat history.
- Include the saved profile in AI tutor context.

This phase does not include full multi-agent orchestration, resource generation, learning path execution, effect reports, task queues, or delivery package generation. Those remain Phase 2+.

## User Experience

The workspace gains a `学习画像` tab near the beginning of the project tabs. It shows:

- A profile completeness summary.
- At least eight dimension cards:
  - knowledge level
  - learning goal
  - cognitive style
  - weak points
  - mistake patterns
  - resource preferences
  - available time
  - motivation
- A profile builder textarea where the student can describe themselves in natural language.
- An AI analysis button.
- A profile draft preview.
- Save and reset actions.
- An activity/update log.

Future tabs are visible as disabled or lightweight placeholder pages so the product direction is clear without pretending Phase 2+ already exists.

## Data Model

Project-local files:

```text
profile/
├─ profile.json
└─ events.json
```

Profile shape:

```ts
type LearningProfile = {
  version: 1;
  knowledgeLevel: '基础薄弱' | '中等' | '较好' | '未评估';
  learningGoal: string;
  cognitiveStyle: string;
  weakPoints: string[];
  mistakePatterns: string[];
  resourcePreferences: string[];
  availableTime: string;
  motivation: string;
  notes: string;
  confidence: 'low' | 'medium' | 'high';
  updatedAt: string;
};
```

Profile events shape:

```ts
type LearningProfileEvent = {
  id: string;
  type: 'created' | 'manual-save' | 'agent-analysis' | 'activity-refresh';
  summary: string;
  createdAt: string;
};
```

## Electron API

New IPC methods:

- `profile:get(projectId)` returns `{ profile, events }`.
- `profile:save(projectId, profile)` saves and returns `{ profile, events }`.
- `profile:analyze(projectId, input)` returns `{ profile, events, draftText }`.

The analysis method uses configured model credentials when available. If the model is not configured, it returns a deterministic local draft instead of failing. This keeps the page usable during local demos.

## AI Tutor Integration

`runProjectChat` reads the current profile and appends a compact profile context to the prompt. The tutor should adapt answer style based on:

- knowledge level
- weak points
- cognitive style
- preferred resources
- learning goal

## Error Handling

- Missing profile files are treated as an empty default profile.
- Invalid profile input is normalized rather than crashing.
- AI JSON parsing failures fall back to a safe deterministic profile draft.
- Save operations always append an event so the user can see that changes persisted.

## Testing

Tests must cover:

- Default profile creation and persistence shape.
- Profile analysis fallback without API credentials.
- Preload exposes the new profile methods.
- App workspace declares the new Phase 0+1 tabs.
- Profile page source contains the expected dimension cards and actions.
- AI tutor prompt includes learning profile context.

