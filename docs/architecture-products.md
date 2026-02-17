# Product Architecture: Template + Showcase in One Repository

## Purpose

This document defines a product architecture for `moonvst` that keeps a single shared plugin layer while supporting two product experiences in one repository:

- `template`: minimal starter plugin (Gain + Level Meter only)
- `showcase`: interactive node-based multi-effect demo

The design prioritizes the project principle: keep C++ changes minimal and avoid duplicate maintenance.

## Goals

- Keep one shared JUCE/WAMR plugin implementation (`plugin/`) for both products.
- Avoid forcing template users to remove or edit showcase-specific code.
- Reuse common DSP/UI logic from shared core packages.
- Keep existing default commands focused on template behavior.

## Non-Goals

- No runtime mode toggle inside the shipped plugin UI.
- No separate plugin source trees per product.
- No broad refactor of unrelated parts.

## High-Level Model

- Single plugin host layer:
  - `plugin/` remains shared and product-agnostic.
- Product differences are expressed by build inputs:
  - DSP entrypoint selection (`template` vs `showcase`)
  - UI entrypoint selection (`template` vs `showcase`)
- Plugin consumes generated artifacts only:
  - AOT DSP binary in `plugin/resources/*.aot`
  - Built UI bundle in `packages/ui-core/dist/*`

In short: one plugin codebase, two product build pipelines.

## Repository Structure (Target)

```text
moonvst/
  plugin/                     # shared JUCE + WAMR host (single implementation)

  packages/
    dsp-core/
      src/
        api/
          exports.mbt
          params.mbt
        engine/
          graph_executor.mbt
          meter.mbt
        effects/
          gain.mbt
          chorus.mbt
          compressor.mbt
          delay.mbt
          distortion.mbt
          eq.mbt
          filter.mbt
          reverb_dattorro.mbt

    ui-core/
      src/
        runtime/
        bridge/
        components/
          LevelMeter.tsx
          GainSlider.tsx
          Knob.tsx
        node_editor/
          GraphCanvas.tsx
          NodePalette.tsx
          EdgeLayer.tsx
          Inspector.tsx

  products/
    template/
      dsp-entry/
        lib.mbt               # Input -> Gain -> Output + meter tap
      ui-entry/
        App.tsx               # Gain + Level Meter only

    showcase/
      dsp-entry/
        lib.mbt               # node-graph execution entry
        default_graph.json
      ui-entry/
        App.tsx               # node-based editor UI

  scripts/
    build-dsp-template.*
    build-dsp-showcase.*
    build-ui-template.*
    build-ui-showcase.*
```

Notes:
- `plugin/` stays in root and shared.
- `products/*` contains only wiring/entrypoints, not duplicated core logic.
- `packages/*` is the main maintenance surface.

## Product Requirements

### Template Product

Required behavior:
- DSP: Gain processing only.
- UI: one Gain control and one Level Meter.
- Public parameter surface: only `gain`.

Design intent:
- Fastest path for users who want to start a custom plugin.
- No exposure to graph editor or advanced effect modules.

### Showcase Product

Required behavior:
- Node-based interactive graph editor.
- Rewire effects freely in UI (within graph constraints).
- Include basic effects:
  - Chorus
  - Compressor
  - Delay
  - Distortion
  - EQ
  - Filter
  - Reverb (Dattorro)

Initial constraints (for scope control):
- Stereo processing only.
- DAG graph (no cycles) for first implementation.
- Node count limit (for predictable performance).

Incremental baseline for first delivery:
- Migrate current Dattorro-based implementation as the only showcase DSP feature.
- Keep showcase UI minimal (no full node editor in the first delivery).
- Reach end-to-end deployable state before starting full showcase UI/DSP expansion.

## Plugin Layer Strategy (C++ Minimal)

`plugin/` remains product-agnostic:
- Keep generic parameter API contract from WASM:
  - `get_param_count`
  - `get_param_name`
  - `get_param_default`
  - `get_param_min`
  - `get_param_max`
  - `set_param`
  - `get_param`
  - `process_block`
- Do not encode product-specific behavior in C++.
- Product selection happens before plugin build by choosing DSP/UI artifacts.

Expected C++ impact:
- None or minimal (build script integration only).

## Build and Command Model

Default commands remain template-first:
- `npm run dev`
- `npm run build:dsp`
- `npm run build:ui`
- `npm run release:vst`

Add showcase-specific commands:
- `npm run dev:showcase`
- `npm run build:dsp:showcase`
- `npm run build:ui:showcase`
- `npm run release:vst:showcase`

Artifact flow:
1. Build selected product DSP entry -> AOT -> `plugin/resources/`.
2. Build selected product UI entry -> `packages/ui-core/dist/`.
3. Run shared plugin build from `plugin/`.

## Product Scaffolding

To make product expansion easy inside one repository, provide a product scaffolder script.

Proposed command:
- `npm run scaffold:product -- --name <product-name> --from template`
- `npm run scaffold:product -- --name <product-name> --from showcase`

Minimum generated files:
- `products/<product-name>/dsp-entry/lib.mbt`
- `products/<product-name>/ui-entry/App.tsx`
- `products/<product-name>/product.config.json`
- `products/<product-name>/README.md`
- `tests/dsp/<product-name>/...` (starter test)
- `tests/ui/<product-name>/...` (starter test)

Script responsibilities:
1. Create product wiring files only (no core duplication).
2. Add product-specific scripts to root `package.json`:
   - `dev:<product-name>`
   - `build:dsp:<product-name>`
   - `build:ui:<product-name>`
   - `release:vst:<product-name>`
3. Optionally update CI matrix product list when enabled by flag.

Scaffolder constraints:
- Do not modify `plugin/` sources.
- Generated product code must import from `packages/*` only.
- Keep template-first defaults unchanged (`dev`, `build:*`, `release:vst` stay mapped to template).
- Fail fast if product name already exists or includes invalid characters.

## Parameter and Compatibility Policy

- Keep shared parameter metadata centralized in `packages/dsp-core/src/api/params.mbt`.
- Template exposes only the subset it needs (`gain`).
- Showcase can expose broader parameter set.
- Preserve stable parameter identity for host automation compatibility.

## Testing Strategy

Follow TDD per AGENTS rules for behavior changes.

Minimum validation per product:

- Template:
  - DSP test: gain behavior
  - UI test: gain control + level meter rendering and updates
  - Plugin smoke build

- Showcase:
  - DSP test: graph execution and effect node processing
  - UI test: node add/connect/remove and inspector parameter edits
  - Plugin smoke build

Cross-check:
- CI should run template pipeline always.
- CI should also run showcase pipeline to prevent drift.

## Implementation Phases

### Phase 1: Refactor Completion + Deployable Baseline

Scope:
- Complete architecture refactor into shared core + product wiring.
- Template: Gain + Level Meter only.
- Showcase: current Dattorro-only implementation migrated to new structure.
- Keep plugin layer shared and unchanged except minimal build integration.

Exit criteria:
- Template and showcase both build and run.
- Native plugin pipeline is deployable for both products.
- Default commands remain template-first and stable.

### Phase 2: Showcase Expansion

Scope:
- Build node-based interactive showcase UI.
- Add and validate additional effect modules:
  - Chorus
  - Compressor
  - Delay
  - Distortion
  - EQ
  - Filter
  - Reverb (Dattorro remains supported)

Exit criteria:
- Node-based routing works with graph constraints.
- Showcase feature set reaches target demo scope.

## Migration Plan (No Implementation in This Document)

1. Keep reusable DSP logic in `packages/dsp-core/src`.
2. Extract reusable UI runtime/components into `packages/ui-core`.
3. Create `products/template` entrypoints (Gain + Meter only) and map existing default scripts to them.
4. Create `products/showcase` entrypoints and migrate current Dattorro-only behavior.
5. Keep `plugin/` shared; verify both product pipelines build, run, and can be deployed.
6. Add `scaffold:product` script for repeatable product creation.
7. Add product-specific tests and CI matrix jobs.
8. After Phase 1 stabilization, start Phase 2 showcase UI and DSP expansion.

## Risk and Mitigation

Risk: product drift.
- Mitigation: shared core packages + CI matrix for both products.

Risk: accidental C++ product branching.
- Mitigation: enforce plugin agnostic rule in review checklist.

Risk: parameter incompatibility between products.
- Mitigation: central parameter definitions and stable IDs.

Risk: showcase scope delays delivery.
- Mitigation: phase-gate work. Finish Phase 1 (refactor + Dattorro migration + deployable state) before full node UI/effect expansion.

## Done Criteria for This Architecture

- Single shared plugin layer (`plugin/`) is retained.
- Template default workflow remains minimal and unchanged for users.
- Showcase workflow exists as a separate build target without requiring user cleanup.
- Shared logic lives in core packages; product folders only wire composition.
- New product skeletons can be added via `scaffold:product` without touching C++ plugin code.
