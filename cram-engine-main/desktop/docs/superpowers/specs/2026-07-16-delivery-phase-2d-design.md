# Delivery Phase 2D Design

## Goal

Turn the `交付` workspace tab from a placeholder into a project-scoped delivery package module. It should organize the project outputs into a clear, saveable, exportable package manifest.

## Scope

This phase includes:

- Project-local persistence for one current delivery package.
- A bounded DeliveryAgent flow that builds a package checklist from resources, reports, questions, knowledge base, learning path, progress, and project metadata.
- Electron IPC and preload bridge methods for getting, generating, saving, and exporting the delivery package.
- A focused delivery page inside the existing project workspace.
- Markdown/JSON export files for the package.

It does not implement ZIP compression, cloud upload, or external submission APIs.

## Data Model

Project-local file:

```text
delivery/
└── package.json
```

Export files:

```text
generated/
├── <project>-delivery.md
└── <project>-delivery.json
```

## Electron API

- `delivery:get(projectId)` returns `DeliveryPackage | null`.
- `delivery:generate(projectId)` returns `DeliveryPackage`.
- `delivery:save(projectId, package)` returns `DeliveryPackage`.
- `delivery:export(projectId)` returns `ExportResult`.

## UX

The page shows:

- Package summary.
- Delivery item cards for resources, reports, question bank, knowledge base, path, and archive.
- Status badges: ready / needs-review / missing.
- Checklist.
- Save and export actions.

The page stays project-scoped and does not add home-page shortcuts.
