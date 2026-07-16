# Advanced Project Modes Design

## Goal

Complete the project-mode system so every scenario named in the product brief can be selected when creating a project and opens a useful, focused workspace. The second phase adds research innovation, experiment simulation, virtual teacher, student development, interactive courseware, teaching game, knowledge graph, and mistake collection without regressing the five existing modes.

## Requirement Coverage

The original fourteen scenarios map to project modes as follows:

| Requested scenario | Project mode | Phase-two outcome |
| --- | --- | --- |
| Paper assistant | `paper-assistant` | Keep the existing writing workflow |
| Experiment simulation | `lab-simulation` | Add a bounded parameter-sweep simulator with chart and report output |
| Research result innovation | `research-innovation` | Add evidence, gap, hypothesis, roadmap, and risk workspaces |
| Teaching design | `teaching-design` | Keep the existing teaching workflow |
| Virtual teacher | `virtual-teacher` | Add persona, session, dialogue, and assessment workspaces |
| Assignment authoring and grading | `assignment-quiz` | Keep the existing assignment workflow |
| Lesson-plan generation | `teaching-design` | Keep the dedicated lesson-plan tab |
| Student development | `student-development` | Add profile, goals, plan, portfolio, and evaluation workspaces |
| Research data analysis | `research-analysis` | Keep the existing research workflow |
| Interactive courseware | `interactive-courseware` | Add storyboard, slide source, interaction, and live slide preview |
| Teaching game development | `teaching-game` | Add mechanics, levels, question bank, and a playable local quiz preview |
| Online quiz system | `assignment-quiz` | Keep local quiz authoring; real-time public hosting remains out of scope |
| Knowledge graph display | `knowledge-graph` | Build and display a deterministic graph from knowledge entries, questions, and artifacts |
| Mistake collection | `mistake-collection` | Reuse question import and practice engines in a focused mistake-review workflow |

## Product Boundaries

The app must not claim capabilities it cannot verify. Research innovation produces evidence matrices, falsifiable hypotheses, and validation roadmaps; it does not guarantee novelty. Experiment simulation is a safe deterministic parameter-sweep workbench, not an arbitrary physics or chemistry runtime. Teaching games run locally as question-based learning activities; they are not a general game engine. Online quizzes are authored and previewed locally; multi-user hosting needs a future server product.

These boundaries still produce complete local workflows: users can configure, run, inspect, save, reopen, and export results.

## Architecture

### Registry and persistence

Extend the existing `ProjectMode` and `WorkspaceTabId` unions in renderer, preload, global bridge, and Electron main process. Register all modes in both the TypeScript registry and its JavaScript test/runtime mirror. Existing metadata normalization remains backward compatible and unknown modes still fall back to `exam-review`.

### Mode-aware creation wizard

The first wizard page contains only the selected template's fields plus provider/model selection. The second page contains shared goals, notes, and file references. The third page becomes context aware: question-oriented modes can import initial questions, while other modes import source material. Labels and helper text come from the selected mode instead of exam-only wording.

### Specialized workspaces

Document-oriented tabs continue to use `ModeModulePage`, which already generates, edits, saves, deletes, and exports project-local artifacts. Five interactions need dedicated components:

- `SimulationWorkbenchPage`: validated numeric inputs, three deterministic models, a parameter sweep, result table, SVG chart, and Markdown report generation.
- `KnowledgeGraphPage`: deterministic node/edge extraction, source filters, SVG layout, node selection, and an evidence detail panel.
- `CoursewareStudioPage`: Markdown slide parsing, slide navigation, presenter preview, and structure summary.
- `TeachingGamePage`: question selection, playable multiple-choice rounds, score/progress state, and answer feedback.
- mistake tabs: reuse `QuestionImportPanel` and `PracticePanel` so wrong/favorite state continues to persist through the existing question IPC.

Specialized pages receive project data through props. Pure transformations live in `src/lib/advancedModeWorkspaces.js` with a declaration file so they can be tested without a browser.

### Artifact and delivery flow

All generated documents and simulation summaries use the existing mode-artifact IPC. The delivery package already includes non-exam mode artifacts, so new modes inherit persistence and export behavior. Interactive previews do not write separate opaque formats; users save the source or report as Markdown artifacts.

## Error Handling

- Numeric simulation fields are clamped and invalid ranges show an inline error instead of producing `NaN`.
- Graph extraction tolerates empty projects and shows a focused empty state.
- Slide parsing always returns at least one preview slide.
- Game preview excludes questions without options and explains how to import usable questions.
- Artifact generation keeps the existing deterministic fallback when no API provider is configured or a provider call fails.

## UI Direction

The mode selector remains a compact professional grid and gains category grouping through mode metadata, not nested cards. Tabs stay mode-specific so users never see unrelated tools. Specialized pages use one primary action per surface, stable two-column layouts, concise empty states, and responsive single-column fallbacks below tablet width.

## Testing

Automated tests cover:

- all thirteen selectable project modes and their required tabs;
- Electron normalization of every new mode and tab id;
- mode-aware wizard labels and removal of unconditional exam-only fields;
- deterministic simulation outputs and validation;
- graph node/edge generation and empty input behavior;
- slide parsing and teaching-game question selection;
- specialized page routing in `App.tsx`;
- the full existing Electron, renderer, settings UI, and typecheck suites.

## Success Criteria

- Every requested scenario is directly selectable or clearly represented by a combined mature mode.
- Each selected mode has relevant wizard fields and only relevant workspace tabs.
- No new workspace is a decorative placeholder.
- Simulation, graph, courseware, game, and mistake workflows perform real local interactions.
- Generated outputs persist in the project and appear in delivery generation.
- Existing projects and the five phase-one modes continue to work.

