# Stage Report Phase 2C Design

## Goal

Turn the `报告` workspace tab from a placeholder into a project-scoped stage report module. It should summarize learning profile changes, practice performance, knowledge-base sedimentation, path progress, risks, and next actions.

## Scope

This phase includes:

- Project-local persistence for generated stage reports.
- A bounded ReportAgent flow that can generate a current report from existing project data.
- Electron IPC and preload bridge methods for listing, generating, and saving reports.
- A focused report page inside the existing project workspace.
- Deterministic local generation when API credentials are missing.

It does not implement PDF/DOCX export or final package delivery. Those remain for the delivery module.

## Data Model

Project-local file:

```text
reports/
└── index.json
```

Report shape:

```ts
type StageReportSection = {
  title: string;
  contentMarkdown: string;
};

type StageReport = {
  id: string;
  title: string;
  summary: string;
  sections: StageReportSection[];
  nextActions: string[];
  risks: string[];
  source: 'agent' | 'manual';
  createdAt: string;
  updatedAt: string;
};
```

## Electron API

- `stageReports:list(projectId)` returns `StageReport[]`.
- `stageReports:generate(projectId)` returns `StageReport[]`.
- `stageReports:save(projectId, report)` returns `StageReport[]`.

## ReportAgent Behavior

The ReportAgent reads project metadata, learning profile, learning path, questions, knowledge base, generated resources, and progress markdown. With credentials, it asks the configured model for strict JSON. Without credentials or when parsing fails, it creates a deterministic report.

## Testing

Tests must cover the type declarations, persistence helpers, IPC/preload methods, fallback generation, and App replacement of the report placeholder with a real `StageReportPage`.
