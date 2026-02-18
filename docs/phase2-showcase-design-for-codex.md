# Phase 2 Showcase Design Doc (for Codex Implementation)

## 1. Document Purpose

This document defines the implementation design for Phase 2 (`Showcase Expansion`) in `docs/architecture-products.md`, assuming Codex executes the implementation directly.

Primary goals:

- Deliver a node-based showcase UI based on Pencil design.
- Extend showcase DSP from single reverb to graph-based multi-effect processing.
- Keep `plugin/` product-agnostic and unchanged in behavior.
- Keep reusable shared logic in `packages/*`, and keep showcase-specific composition/state/wiring in `products/showcase/*`.

## 2. Design Inputs and Constraints

## 2.1 Source of Truth

- Architecture policy: `docs/architecture-products.md`
- Phase plan baseline: `docs/phase2-implementation-plan.md`
- Visual source: Pencil canvas `VST Plugin - Node Graph Editor` (`kvMK5`)

## 2.2 Hard Constraints

- No product branching logic in `plugin/`.
- Showcase graph must be DAG-only (no cycles).
- Stereo processing only.
- Node count limit enforced (default 8, configurable to 16).
- TDD-first for behavior changes (red -> green -> refactor).

## 3. Target Architecture (Phase 2)

## 3.1 UI Layer

- Product entry:
  - `products/showcase/ui-entry/App.tsx`
  - Responsibility: composition only (thin wiring).
- Showcase-specific node editor implementation:
  - `products/showcase/ui-entry/components/*`
  - `products/showcase/ui-entry/state/*`
  - Responsibility: showcase layout, graph state, interactions, inspector wiring.
- Shared UI building blocks:
  - `packages/ui-core/src/components/*`
  - `packages/ui-core/src/styles/*`
  - Responsibility: reusable primitives/tokens with no showcase-only branching.

## 3.2 DSP Layer

- Product entry:
  - `products/showcase/dsp-entry/lib.mbt`
  - Responsibility: showcase wiring only.
- Shared DSP graph engine and effects:
  - `packages/dsp-core/src/engine/graph_executor.mbt`
  - `packages/dsp-core/src/effects/*.mbt`

## 3.3 Plugin Layer

- `plugin/` remains generic host bridge.
- Uses existing exported WASM API only:
  - `get_param_count`
  - `get_param_name`
  - `get_param_default`
  - `get_param_min`
  - `get_param_max`
  - `set_param`
  - `get_param`
  - `process_block`

## 4. UI Design Mapping (Pencil -> Code)

## 4.1 Layout Regions

- Root `kvMK5`
  - Top Bar (`FMWVd`)
  - Content Area (`PdXfK`)
    - Node Library (`XQtg4`)
    - Graph Canvas (`jJBPL`)
    - Properties Panel (`P0JNl`)
  - Status Bar (`gkrb8`)

## 4.2 Reusable Component Mapping

- `TLTED` -> `EffectNode`
- `3w2LY` -> `IONode`
- `T4R15` -> `LibItem`
- `UQsji` -> `ParamSlider`
- `zGscn` -> `PortIn`
- `VLHGQ` -> `PortOut`
- `n7CSX` -> `ParamRow`

## 4.3 Token Mapping

Create shared CSS variables in `packages/ui-core` and consume/override in showcase UI (`products/showcase/ui-entry`):

- Surface: `bg-primary`, `bg-inset`, `bg-surface`, `border`, `border-subtle`
- Text: `text-primary`, `text-secondary`, `text-tertiary`, `text-muted`
- Accent: `accent`, `accent-dim`, `accent-glow`
- Node colors: `node-input`, `node-output`, `node-chorus`, `node-compressor`, `node-delay`, `node-distortion`, `node-eq`, `node-filter`, `node-reverb`
- Fonts: `font-sans`, `font-mono`

## 5. Data Model Design

## 5.1 UI Graph Model (TypeScript)

Recommended location:
- `products/showcase/ui-entry/state/graphTypes.ts`

Suggested model:

```ts
export type NodeKind =
  | 'input'
  | 'output'
  | 'chorus'
  | 'compressor'
  | 'delay'
  | 'distortion'
  | 'eq'
  | 'filter'
  | 'reverb'

export type NodeId = string
export type EdgeId = string

export interface GraphNode {
  id: NodeId
  kind: NodeKind
  x: number
  y: number
  bypass: boolean
  params: Record<string, number>
}

export interface GraphEdge {
  id: EdgeId
  fromNodeId: NodeId
  toNodeId: NodeId
}

export interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: NodeId | null
  nodeLimit: number
}
```

## 5.2 DSP Graph Model (MoonBit)

Recommended location:
- `packages/dsp-core/src/engine/graph_executor.mbt`

Required behavior:
- Build runtime execution order from DAG.
- Process stereo block node-by-node.
- Skip node processing when bypass=true.
- Safe fallback for invalid graph input (bypass to dry path).

## 6. UI-DSP Contract Design

Because plugin API must remain generic, Phase 2 uses a serialized graph contract over parameter surface.

Design decision:
- Keep existing generic host contract.
- Add showcase-specific graph transport on top of current parameter strategy.
- Graph serialization/deserialization must be deterministic and versioned.

Recommended additions:

- Graph schema version field (example: `graphSchemaVersion: 1`)
- Strict node kind enum validation
- Max nodes and max edges validation before apply

## 7. Implementation Units (Codex Execution Order)

## U1: Replace showcase app shell

Files:
- `products/showcase/ui-entry/App.tsx`
- `products/showcase/ui-entry/App.component.test.tsx`
- `products/showcase/ui-entry/components/*` (initial shell)
- `packages/ui-core/src/components/*` (only if reusable primitives are needed)

Done when:
- Pencil-structured shell renders.
- Existing six-slider expectations are removed from showcase tests.

## U2: Add graph state and DAG rules

Files:
- `products/showcase/ui-entry/state/graphTypes.ts`
- `products/showcase/ui-entry/state/graphReducer.ts`
- `products/showcase/ui-entry/state/graphReducer.unit.test.ts`

Done when:
- Cycle creation is rejected.
- Node limit is enforced.
- Input/output nodes cannot be removed.

## U3: Add interactions (add/connect/remove/select/edit)

Files:
- `products/showcase/ui-entry/components/GraphCanvas.tsx`
- `products/showcase/ui-entry/components/EdgeLayer.tsx`
- `products/showcase/ui-entry/components/NodePalette.tsx`
- `products/showcase/ui-entry/components/Inspector.tsx`
- `products/showcase/ui-entry/components/*.component.test.tsx`
- `products/showcase/ui-entry/e2e/*.spec.ts` (showcase flows)

Done when:
- Add/connect/remove/edit flows pass component tests and e2e.

## U4: Add DSP graph executor base

Files:
- `packages/dsp-core/src/engine/graph_executor.mbt`
- `products/showcase/dsp-entry/lib.mbt`
- `products/showcase/dsp-entry/lib_test.mbt`

Done when:
- Topological processing works for stereo chains.
- Bypass semantics are stable in tests.

## U5: Add effect modules

Files:
- `packages/dsp-core/src/effects/chorus.mbt`
- `packages/dsp-core/src/effects/compressor.mbt`
- `packages/dsp-core/src/effects/delay.mbt`
- `packages/dsp-core/src/effects/distortion.mbt`
- `packages/dsp-core/src/effects/eq.mbt`
- `packages/dsp-core/src/effects/filter.mbt`
- `packages/dsp-core/src/effects/reverb_dattorro.mbt`

Done when:
- Per-effect tests pass.
- Mixed-chain graph tests pass.

## U6: Integrate UI-DSP graph transport and release gate

Files:
- UI bridge/runtime files in `products/showcase/ui-entry/runtime/*`
- showcase wiring in `products/showcase/*`

Done when:
- UI graph actions are reflected in DSP behavior.
- Showcase release command succeeds.

## 8. Test Strategy

## 8.1 UI

- Unit: state/reducer and utility logic.
- Component: render + interaction flows.
- E2E: user-level scenario:
  - add node -> connect -> edit param -> verify reflected state.

Commands:
- `npm run build:ui`
- `npm run test:ui:unit`
- `npm run test:ui:component`
- `npm run test:ui:e2e`

## 8.2 DSP

- Unit/integration in MoonBit tests for:
  - graph execution ordering
  - bypass behavior
  - per-effect boundary behavior

Commands:
- `npm run build:dsp`
- `npm run test:dsp`

## 8.3 Release Gate

- `npm run release:vst:showcase`

## 9. Acceptance Criteria (Phase 2)

- Node-based UI matches Pencil design intent and structure.
- DAG constraints are enforced in UI interactions.
- Added effects process in graph pipeline with stable behavior.
- Showcase builds/tests pass without product-specific logic in `plugin/`.
- Template workflow remains unaffected.

## 10. Codex Execution Guardrails

Codex implementation must follow these rules:

- Keep edits focused and incremental by unit (`U1` -> `U6`).
- Write or update failing tests before behavior implementation.
- Do not copy shared logic into `products/*`.
- Keep `App.tsx` in `products/showcase` as composition only.
- If graph contract changes, update both UI and DSP tests in the same change set.
