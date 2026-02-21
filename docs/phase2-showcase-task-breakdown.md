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

- Overall stories done: `8 / 10`
- Overall tasks done: `57 / 63`
- Current story: `S8`
- Last updated: `2026-02-21`

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

- [x] `P2-S1-R-01` RED: Update `products/showcase/ui-entry/App.component.test.tsx` to expect node-editor shell (Top/Library/Canvas/Inspector/Status).
  - Evidence: `showcase product app > renders node editor shell regions` failed before implementation via `npm run test:ui:component -- --runInBand`.
- [x] `P2-S1-R-02` RED: Add component test for Pencil region IDs/roles (structural assertions).
  - Evidence: `node editor shell layout` suite failed pre-implementation (`Failed to resolve import "./components/NodeEditorShell"`), then passed.
- [x] `P2-S1-G-01` GREEN: Implement thin `products/showcase/ui-entry/App.tsx` composition only.
  - Evidence: `products/showcase/ui-entry/App.tsx` now renders `NodeEditorShell` only.
- [x] `P2-S1-G-02` GREEN: Add `products/showcase/ui-entry/components/*` shell components and render all five layout regions.
  - Evidence: `products/showcase/ui-entry/components/NodeEditorShell.tsx` with `TopBar/NodeLibraryPanel/GraphCanvasRegion/InspectorPanel/StatusBar` passes component tests.
- [x] `P2-S1-G-03` GREEN: Add shared style tokens and apply Pencil color/typography variables.
  - Evidence: `products/showcase/ui-entry/components/NodeEditorShell.module.css` defines shared CSS variables (`--bg-*`, `--text-*`, `--accent-*`, `--node-*`, `--font-*`).
- [x] `P2-S1-F-01` REFACTOR: Simplify shell component boundaries and remove duplication.
  - Evidence: `products/showcase/ui-entry/components/NodeEditorShell.tsx` maintains thin showcase composition with region components while preserving the same shell behavior.

Validation:
- `npm run build:ui`
- `npm run test:ui:component`

---

## Story S2: Reusable Node Components (Pencil Mapping)

- [x] `P2-S2-R-01` RED: Add component tests for `EffectNode` (`TLTED`) structure and props.
  - Evidence: `EffectNode (TLTED) > renders structure and applies props` added in `products/showcase/ui-entry/components/NodePrimitives.component.test.tsx`; suite failed pre-implementation via `npm run test:ui:component -- --runInBand` (`Failed to resolve import "./NodePrimitives"`).
- [x] `P2-S2-R-02` RED: Add component tests for `IONode` (`3w2LY`) in/out variants.
  - Evidence: `IONode (3w2LY) > renders input variant` and `renders output variant` added in `products/showcase/ui-entry/components/NodePrimitives.component.test.tsx`; same RED failure captured before implementation.
- [x] `P2-S2-R-03` RED: Add component tests for `LibItem`, `ParamSlider`, `PortIn/Out`, `ParamRow`.
  - Evidence: `LibItem / ParamSlider / PortIn-Out / ParamRow` suite added with four tests in `products/showcase/ui-entry/components/NodePrimitives.component.test.tsx`; same RED failure captured before implementation.
- [x] `P2-S2-G-01` GREEN: Implement `EffectNode`.
  - Evidence: `products/showcase/ui-entry/components/NodePrimitives.tsx` now exports `EffectNode` (`data-pencil-id="TLTED"`); `npm run test:ui:component -- --runInBand` passes.
- [x] `P2-S2-G-02` GREEN: Implement `IONode`.
  - Evidence: `products/showcase/ui-entry/components/NodePrimitives.tsx` now exports `IONode` (`data-pencil-id="3w2LY"` with `input/output` variants); component tests pass.
- [x] `P2-S2-G-03` GREEN: Implement `LibItem`, `ParamSlider`, `PortIn`, `PortOut`, `ParamRow`.
  - Evidence: `products/showcase/ui-entry/components/NodePrimitives.tsx` now exports all five components with mapped Pencil IDs (`T4R15`, `UQsji`, `zGscn`, `VLHGQ`, `n7CSX`); component tests pass.
- [x] `P2-S2-F-01` REFACTOR: Normalize props/types and extract shared primitives.
  - Evidence: Shared primitive styles are defined in `products/showcase/ui-entry/components/NodePrimitives.module.css`, and `NodeEditorShell` composes `LibItem`, `ParamRow`, `EffectNode`, `IONode` from the same showcase component set.

Validation:
- `npm run test:ui:component`

---

## Story S3: Graph State Model and DAG Rules

- [x] `P2-S3-R-01` RED: Add unit tests for graph defaults (fixed input/output nodes, initial state).
  - Evidence: `products/showcase/ui-entry/state/graphReducer.unit.test.ts` added and failed pre-implementation with `Failed to resolve import "./graphReducer"` via `npm run test:ui:unit -- --runInBand ../../products/showcase/ui-entry/state/graphReducer.unit.test.ts`.
- [x] `P2-S3-R-02` RED: Add unit tests for node limit behavior (default 8, configurable to 16).
  - Evidence: `supports configurable node limit and enforces default/additional limits` added in `products/showcase/ui-entry/state/graphReducer.unit.test.ts`; failed in RED run before `graphReducer.ts` existed.
- [x] `P2-S3-R-03` RED: Add unit tests for connect/disconnect and cycle rejection.
  - Evidence: `connects and disconnects edges and rejects connections that create cycles` added in `products/showcase/ui-entry/state/graphReducer.unit.test.ts`; failed in RED run before `graphReducer.ts` existed.
- [x] `P2-S3-R-04` RED: Add unit tests for I/O deletion guard and param update/bypass actions.
  - Evidence: `guards fixed I/O nodes from deletion, and supports select/update-param/toggle-bypass actions` added in `products/showcase/ui-entry/state/graphReducer.unit.test.ts`; failed in RED run before `graphReducer.ts` existed.
- [x] `P2-S3-G-01` GREEN: Implement `products/showcase/ui-entry/state/graphTypes.ts` and default graph factory.
  - Evidence: `products/showcase/ui-entry/state/graphTypes.ts` and `createDefaultGraphState` in `products/showcase/ui-entry/state/graphReducer.ts` now define fixed `input/output` nodes, initial passthrough edge, `nodeLimit`, and error state.
- [x] `P2-S3-G-02` GREEN: Implement `products/showcase/ui-entry/state/graphReducer.ts` actions (add/remove/connect/disconnect/select/update/bypass).
  - Evidence: `graphReducer` now supports `addNode/removeNode/connect/disconnect/selectNode/updateNodeParam/toggleNodeBypass`; targeted and full unit suites pass.
- [x] `P2-S3-G-03` GREEN: Implement DAG/cycle detection and deterministic invalid-edge errors.
  - Evidence: `graphReducer.ts` includes cycle detection (`wouldCreateCycle`) and deterministic error codes (`ERR_CYCLE_DETECTED`, `ERR_EDGE_ALREADY_EXISTS`, `ERR_NODE_NOT_FOUND`, etc.).
- [x] `P2-S3-F-01` REFACTOR: Simplify reducer logic and centralize graph utility helpers.
  - Evidence: Shared reducer helpers (`clearError`, `withError`, `nodeExists`, `hasEdge`, `createEdgeId`, `wouldCreateCycle`) extracted and reused inside `graphReducer.ts` without behavior changes.

Validation:
- `npm run test:ui:unit`

---

## Story S4: Canvas Interaction Flow

- [x] `P2-S4-R-01` RED: Add component test for library click -> node added.
  - Evidence: `products/showcase/ui-entry/components/CanvasInteraction.component.test.tsx` (`adds a node when clicking library item`) failed before implementation because `Effect Node Delay` was already statically rendered in the legacy canvas.
- [x] `P2-S4-R-02` RED: Add component test for connect flow (out port -> in port) with DAG constraints.
  - Evidence: `connects out->in and rejects cycle-producing connection` failed in RED (`Unable to find role "button" with name "Output OUT port"`), confirming connect affordances were missing.
- [x] `P2-S4-R-03` RED: Add component test for disconnect and selection behavior.
  - Evidence: `disconnects edge and updates selection state` failed in RED (`Unable to find role "button" with name "Input OUT port"`), confirming disconnect/selection flow was unimplemented.
- [x] `P2-S4-G-01` GREEN: Implement node creation flow from `products/showcase/ui-entry/components/NodePalette`.
  - Evidence: Added `products/showcase/ui-entry/components/NodePalette.tsx` and wired add-node actions via reducer-backed `NodeEditorShell`; `CanvasInteraction.component.test.tsx` add-node test now passes.
- [x] `P2-S4-G-02` GREEN: Implement edge connect/disconnect in `products/showcase/ui-entry/components/GraphCanvas` + `EdgeLayer`.
  - Evidence: Added `GraphCanvas.tsx` and `EdgeLayer.tsx` with OUT->IN connect and edge disconnect controls; DAG error path now surfaces `ERR_CYCLE_DETECTED` and disconnect button removal is verified by component tests.
- [x] `P2-S4-G-03` GREEN: Implement deterministic node placement and visual selection states.
  - Evidence: Deterministic placement grid (`x/y`) and `data-selected` visual state are applied through graph state; selection assertion in `CanvasInteraction.component.test.tsx` now passes.
- [x] `P2-S4-F-01` REFACTOR: Extract interaction hooks/utilities and reduce view logic complexity.
  - Evidence: Added `products/showcase/ui-entry/components/useGraphInteraction.ts` and `graphUi.tsx`, with `NodeEditorShell.tsx` reduced to composition/wiring.

Validation:
- `npm run test:ui:component`

---

## Story S5: Inspector Editing Flow

- [x] `P2-S5-R-01` RED: Add component test for selected node metadata rendering.
  - Evidence: `products/showcase/ui-entry/components/InspectorEditing.component.test.tsx` (`renders selected node metadata`) failed before implementation (`Unable to find an element with the text: METADATA`) via `npm run test:ui:component -- --runInBand ../../products/showcase/ui-entry/components/InspectorEditing.component.test.tsx`.
- [x] `P2-S5-R-02` RED: Add component test for parameter edit updating graph state.
  - Evidence: `products/showcase/ui-entry/components/InspectorEditing.component.test.tsx` (`updates parameter value in graph state via inspector control`) failed before implementation (`Unable to find an accessible element with the role "slider" and name "Mix"`).
- [x] `P2-S5-R-03` RED: Add component test for bypass toggle and connection summary.
  - Evidence: `products/showcase/ui-entry/components/InspectorEditing.component.test.tsx` (`toggles bypass and renders connection summary for selected node`) failed before implementation (`Unable to find an accessible element with the role "button" and name "Bypass Delay"`).
- [x] `P2-S5-G-01` GREEN: Implement inspector metadata section.
  - Evidence: `products/showcase/ui-entry/components/NodeEditorShell.tsx` adds METADATA section (`inspector-meta-id/type/position`) bound to selected graph node; RED metadata test now passes.
- [x] `P2-S5-G-02` GREEN: Implement parameter controls and state wiring.
  - Evidence: `products/showcase/ui-entry/state/nodeParamSchema.ts` + `graphReducer.ts` + `NodeEditorShell.tsx` + `useGraphInteraction.ts` wire range controls to `updateNodeParam`; parameter edits persist across selection changes in component tests.
- [x] `P2-S5-G-03` GREEN: Implement bypass and connection summary sections.
  - Evidence: Inspector bypass toggle dispatches `toggleNodeBypass`, `GraphCanvas` reflects `data-bypassed`, and selected-node IN/OUT summaries render from graph edges; S5 bypass/connection test passes.
- [x] `P2-S5-F-01` REFACTOR: Consolidate inspector field renderers and typing.
  - Evidence: Parameter schema/formatting/defaults centralized in `products/showcase/ui-entry/state/nodeParamSchema.ts` and reused by both `NodeEditorShell.tsx` and `GraphCanvas.tsx`.

Validation:
- `npm run test:ui:component`

---

## Story S6: DSP Graph Executor Base

- [x] `P2-S6-R-01` RED: Add MoonBit tests for topological execution order.
  - Evidence: Added `graph executor schedules nodes topologically and processes stereo block` to `products/showcase/dsp-entry/lib_test.mbt`; confirmed RED failure via `npm run test:dsp:showcase` with missing `execute_graph_block` / `ExecEdge`.
- [x] `P2-S6-R-02` RED: Add MoonBit tests for bypass pass-through behavior.
  - Evidence: Added `graph executor bypass keeps pass-through behavior` to `products/showcase/dsp-entry/lib_test.mbt`; confirmed RED failure in the same run before implementation.
- [x] `P2-S6-R-03` RED: Add MoonBit tests for invalid graph fallback behavior.
  - Evidence: Added `graph executor falls back to dry path for invalid graph` to `products/showcase/dsp-entry/lib_test.mbt`; confirmed RED failure in the same run before implementation.
- [x] `P2-S6-G-01` GREEN: Create `packages/dsp-core/src/engine/graph_executor.mbt`.
  - Evidence: Added `packages/dsp-core/src/engine/graph_executor.mbt` and `packages/dsp-core/src/engine/moon.pkg.json`, implementing `ExecEdge` / `ExecResult` and `execute_graph_block`.
- [x] `P2-S6-G-02` GREEN: Implement topological scheduling and stereo block execution.
  - Evidence: `execute_graph_block` builds a DAG topological order and processes stereo blocks node-by-node; `npm run test:dsp:showcase` passes (7/7).
- [x] `P2-S6-G-03` GREEN: Implement bypass and invalid-graph safety fallback.
  - Evidence: Implemented bypass pass-through and cycle/invalid-edge dry-path fallback via `invalid_result`; corresponding tests pass.
- [x] `P2-S6-F-01` REFACTOR: Split executor into parse/plan/run helpers for readability.
  - Evidence: Split responsibilities into `validate_shapes` / `build_topological_order` / `copy_dry_path` / `invalid_result` for readability.

Validation:
- `npm run build:dsp`
- `npm run test:dsp`

---

## Story S7: Effect Modules Expansion

- [x] `P2-S7-R-01` RED: Add per-effect tests for chorus/compressor/delay/distortion/eq/filter minimum behavior.
  - Evidence: Added per-effect tests in `packages/dsp-core/src/effects/{chorus,compressor,delay,distortion,eq,filter}_test.mbt`; confirmed RED failure via `npm run test:dsp:showcase` (`Package "effects" not found in the loaded packages`).
- [x] `P2-S7-R-02` RED: Add regression tests for extracted Dattorro reverb module.
  - Evidence: Added helper regression tests in `packages/dsp-core/src/effects/reverb_dattorro_test.mbt`; same RED run failed before extraction (`Value reverb_predelay_ms_to_samples not found` path via missing `effects` package).
- [x] `P2-S7-R-03` RED: Add integration test for mixed effect chains through executor.
  - Evidence: Added executor integration coverage in `packages/dsp-core/src/engine/graph_executor_test.mbt` (`graph executor mixed effect chain dispatches through modules`); same RED run failed pre-implementation (`ExecNode` / `execute_graph_block_fx` undefined in `@engine`).
- [x] `P2-S7-G-01` GREEN: Extract reverb to `packages/dsp-core/src/effects/reverb_dattorro.mbt`.
  - Evidence: Moved Dattorro reverb processing into `packages/dsp-core/src/effects/reverb_dattorro.mbt` and reduced `products/showcase/dsp-entry/lib.mbt` to thin wrapper calls; `npm run test:dsp:showcase` passes.
- [x] `P2-S7-G-02` GREEN: Implement `chorus.mbt`, `compressor.mbt`, `delay.mbt`.
  - Evidence: Added `packages/dsp-core/src/effects/chorus.mbt`, `packages/dsp-core/src/effects/compressor.mbt`, and `packages/dsp-core/src/effects/delay.mbt`; per-effect RED test now passes.
- [x] `P2-S7-G-03` GREEN: Implement `distortion.mbt`, `eq.mbt`, `filter.mbt`.
  - Evidence: Added `packages/dsp-core/src/effects/distortion.mbt`, `packages/dsp-core/src/effects/eq.mbt`, and `packages/dsp-core/src/effects/filter.mbt`; per-effect RED test now passes.
- [x] `P2-S7-G-04` GREEN: Wire effects into graph executor dispatch.
  - Evidence: Added `ExecNode` and `execute_graph_block_fx` to `packages/dsp-core/src/engine/graph_executor.mbt` with effect-type dispatch; mixed-chain integration test passes.
- [x] `P2-S7-F-01` REFACTOR: Standardize effect interfaces and shared DSP helpers.
  - Evidence: Standardized effect function signatures and shared math/mix helpers in `packages/dsp-core/src/effects/common.mbt`; executor now routes through a centralized `execute_node_effect` helper.

Validation:
- `npm run build:dsp`
- `npm run test:dsp`

---

## Story S8: UI-DSP Graph Contract and Runtime Bridge

- [x] `P2-S8-R-01` RED: Add UI unit test for graph payload serialization format/version.
  - Evidence: Added `products/showcase/ui-entry/runtime/graphContract.unit.test.ts` and confirmed RED failure via `npm run test:ui:unit -- ../../products/showcase/ui-entry/runtime/graphContract.unit.test.ts ../../products/showcase/ui-entry/runtime/graphRuntimeBridge.unit.test.ts` (`Failed to resolve import "./graphContract"`).
- [x] `P2-S8-R-02` RED: Add UI/runtime test for emitting payload on graph edit.
  - Evidence: Added `products/showcase/ui-entry/runtime/graphRuntimeBridge.unit.test.ts` and confirmed RED failure in the same run (`Failed to resolve import "./graphRuntimeBridge"`).
- [x] `P2-S8-R-03` RED: Add DSP-side test for payload validation and apply behavior.
  - Evidence: Added graph-contract apply tests in `products/showcase/dsp-entry/lib_test.mbt`; confirmed RED failure via `npm run test:dsp:showcase` with missing `apply_graph_contract` / contract error getter exports.
- [x] `P2-S8-G-01` GREEN: Implement versioned graph payload schema and validators.
  - Evidence: Added `products/showcase/ui-entry/runtime/graphContract.ts` with deterministic serialization, `graphSchemaVersion: 1`, strict node-kind/edge/param validation, and deserialize guards; new unit tests pass.
- [x] `P2-S8-G-02` GREEN: Implement runtime transport in `products/showcase/ui-entry/runtime/*`.
  - Evidence: Added `products/showcase/ui-entry/runtime/graphRuntimeBridge.ts` + `graphContractConstants.ts`, wired bridge sync in `NodeEditorShell` and runtime propagation from `App.tsx`; `graphRuntimeBridge.unit.test.ts` passes.
- [x] `P2-S8-G-03` GREEN: Refactor `products/showcase/dsp-entry/lib.mbt` to wiring-only contract apply path.
  - Evidence: Added `apply_graph_contract` and contract-state/error exports in `products/showcase/dsp-entry/lib.mbt`; `products/showcase/dsp-entry/lib_test.mbt` new apply/validation tests pass.
- [x] `P2-S8-F-01` REFACTOR: Consolidate contract constants and error mapping.
  - Evidence: Contract constants/error codes centralized in `products/showcase/ui-entry/runtime/graphContractConstants.ts` and reused by serializer/runtime bridge.

Validation:
- `npm run test:ui:unit`
- `npm run test:dsp`

---

## Story S8.5: Graph-to-Audio Runtime Wiring

- [ ] `P2-S85-R-01` RED: Add DSP test proving `process_audio` output changes according to applied graph (not fixed reverb-only path).
- [ ] `P2-S85-R-02` RED: Add DSP test for invalid/unsupported applied graph falling back to deterministic dry-safe behavior.
- [ ] `P2-S85-G-01` GREEN: Wire `products/showcase/dsp-entry/lib.mbt` contract apply state to executor input and route `process_audio` through graph execution path.
- [ ] `P2-S85-G-02` GREEN: Ensure graph state changes are reflected in block processing on subsequent calls.
- [ ] `P2-S85-F-01` REFACTOR: Consolidate graph-apply -> executor mapping helpers and fallback/error handling.

Validation:
- `npm run test:dsp:showcase`
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

- `2026-02-20`: Completed Story S6 (`P2-S6-R/G/F`), added MoonBit RED tests for topological order, bypass pass-through, and invalid-graph dry fallback; implemented shared `packages/dsp-core/src/engine/graph_executor.mbt` with topological scheduling/stereo block execution/fallback safety and updated `scripts/select-product.js` to copy full `packages/dsp-core/src` (including new subpackages) into `build/dsp-active`.
- `2026-02-20`: Completed Story S7 (`P2-S7-R/G/F`), added showcase RED tests for per-effect minimum behavior, extracted Dattorro reverb, and mixed-chain executor integration; implemented shared effect modules under `packages/dsp-core/src/effects/*`, added effect-node dispatch API (`ExecNode` / `execute_graph_block_fx`) in `graph_executor`, and kept showcase `lib.mbt` as thin reverb wiring.
- `2026-02-21`: Completed Story S8 (`P2-S8-R/G/F`), added RED tests for versioned graph payload serialization/runtime emission and DSP-side apply validation; implemented deterministic UI graph contract serializer + validators, runtime bridge transport wiring (`runtime/*` + `App.tsx`/`NodeEditorShell.tsx`), and showcase DSP contract apply/error state exports in `products/showcase/dsp-entry/lib.mbt`.
- `2026-02-20`: Completed Story S5 (`P2-S5-R/G/F`), added inspector editing component tests and implemented selected-node metadata, schema-driven parameter controls, bypass toggle wiring, and connection summaries using shared node parameter schema utilities.
- `2026-02-18`: Completed Story S4 (`P2-S4-R/G/F`), added showcase canvas interaction component tests and implemented reducer-driven `NodePalette`/`GraphCanvas`/`EdgeLayer` flows (add/connect/disconnect/select) with deterministic placement and extracted interaction hook/utilities.
- `2026-02-18`: Completed Story S3 (`P2-S3-R/G/F`), added showcase graph reducer unit tests and implemented graph state model/reducer with node limit, I/O guard, connect/disconnect, param updates, bypass, and DAG cycle rejection.
- `2026-02-18`: Completed Story S2 (`P2-S2-R/G/F`), added reusable node primitive tests/components and refactored `NodeEditorShell` to consume primitives.
- `2026-02-18`: Rewritten to strict TDD task ordering (`RED -> GREEN -> REFACTOR` per story).
