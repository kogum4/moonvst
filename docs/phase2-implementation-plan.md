# Phase 2 Implementation Plan (Showcase Expansion)

## Objective

Define an executable plan for Phase 2 in `docs/architecture-products.md`.
Use the Pencil design `VST Plugin - Node Graph Editor` (`kvMK5`) as the UI source of truth.
Keep reusable shared logic in `packages/*` and showcase-specific composition/state/wiring in `products/showcase/*`.

## Scope

- Replace the current showcase slider UI with a node-based editor UI.
- Add graph-based DSP execution for showcase.
- Add and validate effect modules:
  - Chorus
  - Compressor
  - Delay
  - Distortion
  - EQ
  - Filter
  - Reverb (Dattorro stays supported)
- Enforce DAG-only routing, stereo processing, and node count limit.

## Out of Scope

- Product branching logic in `plugin/`.
- Changes to template product behavior.
- Cyclic graphs, multi-bus routing, MIDI routing.

## Pencil Mapping

### Screen Structure

- Root: `kvMK5`
  - Top Bar: `FMWVd`
  - Content Area: `PdXfK`
    - Node Library: `XQtg4`
    - Graph Canvas: `jJBPL`
    - Properties Panel: `P0JNl`
  - Status Bar: `gkrb8`

### Reusable Component Mapping

- `TLTED` -> `EffectNode`
- `3w2LY` -> `IONode`
- `T4R15` -> `LibItem`
- `UQsji` -> `ParamSlider`
- `zGscn` -> `PortIn`
- `VLHGQ` -> `PortOut`
- `n7CSX` -> `ParamRow`

### Design Tokens

Expose shared design tokens as CSS variables in `packages/ui-core`, then consume/override them in showcase UI (`products/showcase/ui-entry`).

- Surface: `bg-primary`, `bg-inset`, `bg-surface`, `border`, `border-subtle`
- Text: `text-primary`, `text-secondary`, `text-tertiary`, `text-muted`
- Accent: `accent`, `accent-dim`, `accent-glow`
- Node colors: `node-input`, `node-output`, `node-chorus`, `node-compressor`, `node-delay`, `node-distortion`, `node-eq`, `node-filter`, `node-reverb`
- Fonts: `font-sans`, `font-mono`

## Milestones

## M1: UI Shell Replacement (Pencil-accurate)

- Keep `products/showcase/ui-entry/App.tsx` thin.
- Add showcase node editor implementation under `products/showcase/ui-entry/components/*` and `products/showcase/ui-entry/state/*`.
- Keep reusable primitives/styles in `packages/ui-core/src/components/*` and `packages/ui-core/src/styles/*`.
- Remove six-slider showcase layout and render Pencil-based shell.

TDD:
- Update `products/showcase/ui-entry/App.component.test.tsx` first to fail.
- Assert Top/Library/Canvas/Inspector/Status rendering.

Exit checks:
- `npm run build:ui`
- `npm run test:ui:component`

## M2: Graph State + DAG Rules

- Add `products/showcase/ui-entry/state/*`.
- Implement graph model (`Node`, `Edge`, `Graph`) and reducer/actions.
- Rules:
  - Reject edge creation that introduces a cycle.
  - Prevent deletion of required I/O nodes.
  - Enforce node limit (default 8, configurable to 16).

TDD:
- Add state unit tests first.
- Cover DAG validation, node limit, connect/disconnect semantics.

Exit checks:
- `npm run test:ui:unit`

## M3: Canvas Interactions + Inspector

- `NodePalette`: add node from library.
- `GraphCanvas` + `EdgeLayer`: connect/disconnect/select nodes.
- `Inspector`: edit selected node params, bypass, and connection info.

TDD:
- Component tests for add/connect/remove/edit flows.

Exit checks:
- `npm run test:ui:component`
- `npm run test:ui:e2e`

## M4: DSP Graph Executor Foundation

- Implement `packages/dsp-core/src/engine/graph_executor.mbt`.
- Refactor `products/showcase/dsp-entry/lib.mbt` into product wiring.
- Add topological execution for stereo graph pipeline.

TDD:
- Unit tests for execution order, bypass handling, unconnected node tolerance.
- Keep current reverb regression coverage.

Exit checks:
- `npm run build:dsp`
- `npm run test:dsp`

## M5: Effect Module Expansion

- Add:
  - `packages/dsp-core/src/effects/chorus.mbt`
  - `packages/dsp-core/src/effects/compressor.mbt`
  - `packages/dsp-core/src/effects/delay.mbt`
  - `packages/dsp-core/src/effects/distortion.mbt`
  - `packages/dsp-core/src/effects/eq.mbt`
  - `packages/dsp-core/src/effects/filter.mbt`
  - `packages/dsp-core/src/effects/reverb_dattorro.mbt` (extract current implementation)

TDD:
- Minimal per-effect tests (core behavior + boundary values).
- Integration tests through graph executor with mixed chains.

Exit checks:
- `npm run build:dsp`
- `npm run test:dsp`

## M6: UI-DSP Integration + Showcase Release Gate

- Bridge UI graph actions into DSP execution state.
- Preserve plugin API contract in `plugin/` (`get_param_*`, `set_param`, `process_block`).
- Validate showcase release pipeline.

TDD:
- E2E: add node -> connect -> edit params -> reflected audio behavior.

Exit checks:
- `npm run build:ui`
- `npm run test:ui`
- `npm run build:dsp`
- `npm run test:dsp`
- `npm run release:vst:showcase`

## File Ownership Plan

- Shared implementation:
  - `packages/ui-core/src/components/*`
  - `packages/ui-core/src/styles/*`
  - `packages/dsp-core/src/engine/*`
  - `packages/dsp-core/src/effects/*`
- Showcase wiring only:
  - `products/showcase/ui-entry/App.tsx`
  - `products/showcase/ui-entry/components/*`
  - `products/showcase/ui-entry/state/*`
  - `products/showcase/ui-entry/runtime/*`
  - `products/showcase/dsp-entry/lib.mbt`

## Risks and Mitigations

- Risk: UI and DSP graph contracts drift.
  - Mitigation: freeze graph schema after M2 and treat changes as explicit migrations.

- Risk: regressions from multiple new effects.
  - Mitigation: add per-effect tests before integration, then incremental integration tests.

- Risk: showcase changes leak into template behavior.
  - Mitigation: run template test/build checks in CI continuously.

## Phase 2 Done Criteria

- Pencil-based node UI supports add/connect/remove/edit workflows.
- DAG rules and node limit are enforced.
- Added effects work in node routing pipeline.
- Showcase builds and releases without adding product-specific branching to `plugin/`.
