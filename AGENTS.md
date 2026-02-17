# AGENTS.md

This file defines working rules for AI or automation agents in the `moonvst` repository.

## Goal

- Deliver the requested change with minimal, focused edits
- Preserve the current MoonBit DSP + React UI + JUCE/WAMR workflow
- Run reproducible validation for each change

## Repository Map

- `packages/dsp-core/`: MoonBit DSP source (WASM-first)
- `packages/ui-core/`: React + Vite frontend
- `plugin/`: JUCE plugin and host bridge
- `scripts/`: setup and build helpers
- `tests/cpp/`: C++ integration tests
- `libs/`: submodules (JUCE/WAMR). Do not edit unless explicitly requested.

## Core Rules

- Do not do unrelated refactors
- Follow existing naming, file layout, and code style
- Do not commit generated outputs (`build/`, `node_modules/`)
- If requirements are unclear, keep scope narrow and avoid broad speculative changes
- Do not implement speculative design changes without explicit user approval

## Product Architecture Rules

- Keep `plugin/` shared and product-agnostic. Do not add product branching in C++ unless explicitly requested.
- Treat `packages/*` as shared implementation and `products/*` as product wiring only.
- Keep DSP product-specific files in `products/*/dsp-entry/` and do not write generated entry files into tracked `packages/dsp-core/src`.
- Keep UI product-specific composition in `products/*/ui-entry/App.tsx`; keep business logic/components in `packages/ui-core`.
- Keep CSS split by responsibility: shared styles in `packages/ui-core`, product-specific theme overrides in `products/*/ui-entry`.
- Keep `App.tsx` thin (composition and wiring only). If product-specific UI grows, create `products/<name>/ui-entry/components/*` instead of moving logic into `packages/ui-core` conditionals.
- Do not duplicate core logic into `products/*`; when shared behavior appears, move it back to `packages/*`.

## TDD Rules

- Default to test-driven development for behavior changes
- Add or update a failing test first (unit/component/E2E as appropriate), then implement the code change
- Keep each change cycle small: red -> green -> refactor
- If tests cannot be written first due to tooling constraints, document the reason in the change summary and add tests immediately after implementation

## Recommended Workflow

1. Identify the smallest relevant set of files.
2. Apply focused edits.
3. Run the minimum validation required for the touched area.
4. Run extra validation when risk is high.

## Main Commands

- Dev mode: `npm run dev`
- DSP build: `npm run build:dsp`
- DSP tests: `npm run test:dsp`
- UI build: `npm run build:ui`
- UI tests (all): `npm run test:ui`
- UI unit tests: `npm run test:ui:unit`
- UI component tests: `npm run test:ui:component`
- UI E2E tests: `npm run test:ui:e2e`
- Plugin configure: `npm run configure:plugin`
- Plugin build: `npm run build:plugin`
- Full release pipeline: `npm run release:vst`

## Validation Matrix

- DSP-only changes:
  - `npm run build:dsp`
  - `npm run test:dsp`
- UI-only changes:
  - `npm run build:ui`
  - `npm run test:ui:unit`
  - `npm run test:ui:component`
  - `npm run test:ui:e2e`
- Plugin/C++ changes:
  - `npm run configure:plugin`
  - `npm run build:plugin`
  - Optional: `ctest --test-dir build -C Release --output-on-failure`
- Cross-cutting changes (DSP + UI + Plugin):
  - `npm run release:vst`
  - Add targeted tests as needed

## Branch and Release Rules

- Keep `main` in a releasable state at all times
- Use short-lived working branches: `feat/*`, `fix/*`, `chore/*`
- Merge to `main` via Pull Request (self-review is acceptable for solo development)
- Require CI (`Build` workflow) to pass before merging to `main`
- Create release tags as `v*` (example: `v0.1.0`) on `main` commits only
- On tagged pushes, publish GitHub Release assets from CI; keep Artifacts for CI/debug use
- Prefer `git revert` for rollback on shared history; avoid rewriting `main` history

### Recommended GitHub Branch Protection for `main`

- Require a pull request before merging
- Require status checks to pass before merging (`Build`)
- Require linear history
- Disallow force pushes and branch deletion

## DSP/API Compatibility Notes

- Keep `packages/dsp-core/src/exports.mbt` host API compatible unless bridge changes are intentional
- When changing parameters in `products/*/dsp-entry/params.mbt` or `packages/dsp-core/src/api/params.mbt`, verify matching behavior in `packages/ui-core/src`
- If parameter names change, update UI references accordingly

## Done Criteria

- Requested behavior is implemented
- Relevant validation completed, or skipped with clear reason
- Diff contains no unnecessary unrelated changes
