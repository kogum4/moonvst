# Phase 2 Showcase Task Breakdown (TDD-First)

This checklist is strictly ordered for TDD:
1) RED (write failing test)
2) GREEN (minimal implementation to pass)
3) REFACTOR (cleanup without behavior change)

Status legend:
- `[ ]` not started
- `[~]` in progress
- `[x]` done
- `[-]` blocked

## Progress Dashboard

- Overall stories done: `2 / 10`
- Overall tasks done: `13 / 38`
- Current story: `S3`
- Last updated: `2026-02-18`

## Update Rules

1. Do not start any GREEN task before the matching RED task is failing.
2. Do not close REFACTOR before tests pass after cleanup.
3. Update checkbox states in the same PR.
4. Record evidence (test name/command) under each completed RED and GREEN.

---

## Story S0: Baseline Capture

- [ ] `P2-S0-R-01` RED: Add/confirm baseline tests describing current showcase state (slider UI, reverb-only DSP).
- [ ] `P2-S0-G-01` GREEN: Capture baseline notes/screenshots and param inventory in PR notes.
- [ ] `P2-S0-F-01` REFACTOR: Clean temporary baseline helpers if any were added.

Validation:
- `npm run test:ui:component`
- `npm run test:dsp`

---

## Story S1: Showcase UI Shell (Pencil Layout)

- [x] `P2-S1-R-01` RED: Update `packages/ui-core/src/showcaseApp.component.test.tsx` to expect node-editor shell (Top/Library/Canvas/Inspector/Status).
  - Evidence: `showcase product app > renders node editor shell regions` failed before implementation via `npm run test:ui:component -- --runInBand`.
- [x] `P2-S1-R-02` RED: Add component test for Pencil region IDs/roles (structural assertions).
  - Evidence: `node editor shell layout` suite failed pre-implementation (`Failed to resolve import "./node_editor/NodeEditorShell"`), then passed.
- [x] `P2-S1-G-01` GREEN: Implement thin `products/showcase/ui-entry/App.tsx` composition only.
  - Evidence: `products/showcase/ui-entry/App.tsx` now renders `NodeEditorShell` only.
- [x] `P2-S1-G-02` GREEN: Add `packages/ui-core/src/node_editor/*` shell components and render all five layout regions.
  - Evidence: `packages/ui-core/src/node_editor/NodeEditorShell.tsx` with `TopBar/NodeLibraryPanel/GraphCanvasRegion/InspectorPanel/StatusBar` passes component tests.
- [x] `P2-S1-G-03` GREEN: Add shared style tokens and apply Pencil color/typography variables.
  - Evidence: `packages/ui-core/src/node_editor/NodeEditorShell.module.css` defines shared CSS variables (`--bg-*`, `--text-*`, `--accent-*`, `--node-*`, `--font-*`).
- [x] `P2-S1-F-01` REFACTOR: Simplify shell component boundaries and remove duplication.
  - Evidence: Introduced `packages/ui-core/src/node_editor/RegionPane.tsx` and refactored three region components to reuse it.

Validation:
- `npm run build:ui`
- `npm run test:ui:component`

---

## Story S2: Reusable Node Components (Pencil Mapping)

- [x] `P2-S2-R-01` RED: Add component tests for `EffectNode` (`TLTED`) structure and props.
  - Evidence: `EffectNode (TLTED) > renders structure and applies props` added in `packages/ui-core/src/nodeEditorPrimitives.component.test.tsx`; suite failed pre-implementation via `npm run test:ui:component -- --runInBand` (`Failed to resolve import "./node_editor/NodePrimitives"`).
- [x] `P2-S2-R-02` RED: Add component tests for `IONode` (`3w2LY`) in/out variants.
  - Evidence: `IONode (3w2LY) > renders input variant` and `renders output variant` added in `packages/ui-core/src/nodeEditorPrimitives.component.test.tsx`; same RED failure captured before implementation.
- [x] `P2-S2-R-03` RED: Add component tests for `LibItem`, `ParamSlider`, `PortIn/Out`, `ParamRow`.
  - Evidence: `LibItem / ParamSlider / PortIn-Out / ParamRow` suite added with four tests in `packages/ui-core/src/nodeEditorPrimitives.component.test.tsx`; same RED failure captured before implementation.
- [x] `P2-S2-G-01` GREEN: Implement `EffectNode`.
  - Evidence: `packages/ui-core/src/node_editor/NodePrimitives.tsx` now exports `EffectNode` (`data-pencil-id="TLTED"`); `npm run test:ui:component -- --runInBand` passes.
- [x] `P2-S2-G-02` GREEN: Implement `IONode`.
  - Evidence: `packages/ui-core/src/node_editor/NodePrimitives.tsx` now exports `IONode` (`data-pencil-id="3w2LY"` with `input/output` variants); component tests pass.
- [x] `P2-S2-G-03` GREEN: Implement `LibItem`, `ParamSlider`, `PortIn`, `PortOut`, `ParamRow`.
  - Evidence: `packages/ui-core/src/node_editor/NodePrimitives.tsx` now exports all five components with mapped Pencil IDs (`T4R15`, `UQsji`, `zGscn`, `VLHGQ`, `n7CSX`); component tests pass.
- [x] `P2-S2-F-01` REFACTOR: Normalize props/types and extract shared primitives.
  - Evidence: Shared primitive styles extracted to `packages/ui-core/src/node_editor/NodePrimitives.module.css` and `NodeEditorShell` updated to compose `LibItem`, `ParamRow`, `EffectNode`, `IONode`.

Validation:
- `npm run test:ui:component`

---

## Story S3: Graph State Model and DAG Rules

- [ ] `P2-S3-R-01` RED: Add unit tests for graph defaults (fixed input/output nodes, initial state).
- [ ] `P2-S3-R-02` RED: Add unit tests for node limit behavior (default 8, configurable to 16).
- [ ] `P2-S3-R-03` RED: Add unit tests for connect/disconnect and cycle rejection.
- [ ] `P2-S3-R-04` RED: Add unit tests for I/O deletion guard and param update/bypass actions.
- [ ] `P2-S3-G-01` GREEN: Implement `graphTypes.ts` and default graph factory.
- [ ] `P2-S3-G-02` GREEN: Implement `graphReducer.ts` actions (add/remove/connect/disconnect/select/update/bypass).
- [ ] `P2-S3-G-03` GREEN: Implement DAG/cycle detection and deterministic invalid-edge errors.
- [ ] `P2-S3-F-01` REFACTOR: Simplify reducer logic and centralize graph utility helpers.

Validation:
- `npm run test:ui:unit`

---

## Story S4: Canvas Interaction Flow

- [ ] `P2-S4-R-01` RED: Add component test for library click -> node added.
- [ ] `P2-S4-R-02` RED: Add component test for connect flow (out port -> in port) with DAG constraints.
- [ ] `P2-S4-R-03` RED: Add component test for disconnect and selection behavior.
- [ ] `P2-S4-G-01` GREEN: Implement node creation flow from `NodePalette`.
- [ ] `P2-S4-G-02` GREEN: Implement edge connect/disconnect in `GraphCanvas` + `EdgeLayer`.
- [ ] `P2-S4-G-03` GREEN: Implement deterministic node placement and visual selection states.
- [ ] `P2-S4-F-01` REFACTOR: Extract interaction hooks/utilities and reduce view logic complexity.

Validation:
- `npm run test:ui:component`

---

## Story S5: Inspector Editing Flow

- [ ] `P2-S5-R-01` RED: Add component test for selected node metadata rendering.
- [ ] `P2-S5-R-02` RED: Add component test for parameter edit updating graph state.
- [ ] `P2-S5-R-03` RED: Add component test for bypass toggle and connection summary.
- [ ] `P2-S5-G-01` GREEN: Implement inspector metadata section.
- [ ] `P2-S5-G-02` GREEN: Implement parameter controls and state wiring.
- [ ] `P2-S5-G-03` GREEN: Implement bypass and connection summary sections.
- [ ] `P2-S5-F-01` REFACTOR: Consolidate inspector field renderers and typing.

Validation:
- `npm run test:ui:component`

---

## Story S6: DSP Graph Executor Base

- [ ] `P2-S6-R-01` RED: Add MoonBit tests for topological execution order.
- [ ] `P2-S6-R-02` RED: Add MoonBit tests for bypass pass-through behavior.
- [ ] `P2-S6-R-03` RED: Add MoonBit tests for invalid graph fallback behavior.
- [ ] `P2-S6-G-01` GREEN: Create `packages/dsp-core/src/engine/graph_executor.mbt`.
- [ ] `P2-S6-G-02` GREEN: Implement topological scheduling and stereo block execution.
- [ ] `P2-S6-G-03` GREEN: Implement bypass and invalid-graph safety fallback.
- [ ] `P2-S6-F-01` REFACTOR: Split executor into parse/plan/run helpers for readability.

Validation:
- `npm run build:dsp`
- `npm run test:dsp`

---

## Story S7: Effect Modules Expansion

- [ ] `P2-S7-R-01` RED: Add per-effect tests for chorus/compressor/delay/distortion/eq/filter minimum behavior.
- [ ] `P2-S7-R-02` RED: Add regression tests for extracted Dattorro reverb module.
- [ ] `P2-S7-R-03` RED: Add integration test for mixed effect chains through executor.
- [ ] `P2-S7-G-01` GREEN: Extract reverb to `packages/dsp-core/src/effects/reverb_dattorro.mbt`.
- [ ] `P2-S7-G-02` GREEN: Implement `chorus.mbt`, `compressor.mbt`, `delay.mbt`.
- [ ] `P2-S7-G-03` GREEN: Implement `distortion.mbt`, `eq.mbt`, `filter.mbt`.
- [ ] `P2-S7-G-04` GREEN: Wire effects into graph executor dispatch.
- [ ] `P2-S7-F-01` REFACTOR: Standardize effect interfaces and shared DSP helpers.

Validation:
- `npm run build:dsp`
- `npm run test:dsp`

---

## Story S8: UI-DSP Graph Contract and Runtime Bridge

- [ ] `P2-S8-R-01` RED: Add UI unit test for graph payload serialization format/version.
- [ ] `P2-S8-R-02` RED: Add UI/runtime test for emitting payload on graph edit.
- [ ] `P2-S8-R-03` RED: Add DSP-side test for payload validation and apply behavior.
- [ ] `P2-S8-G-01` GREEN: Implement versioned graph payload schema and validators.
- [ ] `P2-S8-G-02` GREEN: Implement runtime transport in `packages/ui-core/src/runtime/*`.
- [ ] `P2-S8-G-03` GREEN: Refactor `products/showcase/dsp-entry/lib.mbt` to wiring-only contract apply path.
- [ ] `P2-S8-F-01` REFACTOR: Consolidate contract constants and error mapping.

Validation:
- `npm run test:ui:unit`
- `npm run test:dsp`

---

## Story S9: End-to-End Showcase Behavior and Release Gate

- [ ] `P2-S9-R-01` RED: Add e2e flow test: add -> connect -> edit param -> remove.
- [ ] `P2-S9-R-02` RED: Add e2e/runtime assertion for graph edit reflecting behavior.
- [ ] `P2-S9-G-01` GREEN: Implement missing glue until all e2e passes.
- [ ] `P2-S9-G-02` GREEN: Run full showcase validation and fix release blockers.
- [ ] `P2-S9-F-01` REFACTOR: Final cleanup (naming, dead code removal, docs sync).

Validation:
- `npm run build:ui`
- `npm run test:ui:unit`
- `npm run test:ui:component`
- `npm run test:ui:e2e`
- `npm run build:dsp`
- `npm run test:dsp`
- `npm run release:vst:showcase`

---

## Regression Guard (Template)

- [ ] `P2-RG-01` Confirm template default UI and DSP commands still pass.
  - `npm run build:ui`
  - `npm run build:dsp`

---

## Blockers and Notes

- `P2-BLOCK-01`: none
- `P2-BLOCK-02`: none

## Change Log

- `2026-02-18`: Completed Story S2 (`P2-S2-R/G/F`), added reusable node primitive tests/components and refactored `NodeEditorShell` to consume primitives.
- `2026-02-18`: Rewritten to strict TDD task ordering (`RED -> GREEN -> REFACTOR` per story).
