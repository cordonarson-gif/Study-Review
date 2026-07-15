# Personalized Resources Phase 2A Design

## Goal

Turn the `资源` workspace tab from a placeholder into a real personalized learning-resource module powered by the Phase 1 learning profile.

## Scope

This phase includes:

- Project-local persistence for generated personalized resources.
- A bounded ResourceAgent flow that can generate four resource types:
  - structured handout
  - worked example
  - flashcard set
  - remediation checklist
- Electron IPC and preload bridge methods for listing, generating, saving, and deleting generated resources.
- A focused resource page inside the existing project workspace.
- Deterministic local generation when API credentials are missing.

This phase does not implement full learning-path scheduling, report analytics, or final delivery packaging. Those modules will consume this resource data in later phases.

## User Experience

The `资源` tab becomes a working page with:

- A compact header showing the current project and profile-driven generation intent.
- A generation panel:
  - topic input
  - resource type selector
  - generate button
- A resource library:
  - filter by type
  - resource cards with title, knowledge point, profile signal, and updated time
  - selected resource markdown preview
- Actions:
  - save edits to a generated resource
  - delete a generated resource

The page stays project-scoped and does not add shortcuts to the home page.

## Data Model

Project-local file:

```text
resources/
└─ generated.json
```

Resource shape:

```ts
type PersonalizedResourceType = 'handout' | 'example' | 'flashcard' | 'remediation';

type PersonalizedResource = {
  id: string;
  type: PersonalizedResourceType;
  title: string;
  knowledgePoint: string;
  profileSignal: string;
  contentMarkdown: string;
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};
```

## Electron API

New IPC methods:

- `personalizedResources:list(projectId)` returns `PersonalizedResource[]`.
- `personalizedResources:generate(projectId, input)` returns `PersonalizedResource[]`.
- `personalizedResources:save(projectId, resource)` returns `PersonalizedResource[]`.
- `personalizedResources:delete(projectId, resourceId)` returns `PersonalizedResource[]`.

`generate` accepts:

```ts
type GeneratePersonalizedResourcesInput = {
  topic: string;
  type: PersonalizedResourceType | 'all';
};
```

## ResourceAgent Behavior

The ResourceAgent reads:

- project metadata
- current learning profile
- question knowledge points
- knowledge-base entries
- current generated resources

If provider credentials exist, it asks the configured model for JSON resources and normalizes the result. If credentials are absent or parsing fails, it generates deterministic local resources from profile weak points, selected topic, and project questions.

## Error Handling

- Missing `generated.json` returns an empty list.
- Blank topic falls back to the strongest weak point or the first project knowledge point.
- Invalid model JSON falls back to deterministic generation.
- Save normalizes required fields and updates timestamps.
- Delete is idempotent.

## Testing

Tests must cover:

- Resource types and generated-resource model are declared globally and in renderer types.
- Electron main has project-local generated-resource persistence helpers.
- IPC/preload exposes list/generate/save/delete methods.
- ResourceAgent has deterministic fallback generation.
- App replaces the `resources` placeholder with `PersonalizedResourcesPage`.
- The page includes type filters, generation controls, library cards, save/delete actions, and markdown preview.
