# AGENTS.md

Working rules for AI agents in the `moonvst` repository.

## Repository Map

- `packages/dsp-core/`: MoonBit DSP source (WASM-first)
- `packages/ui-core/`: React + Vite frontend
- `plugin/`: JUCE plugin and host bridge (shared, product-agnostic)
- `products/`: product-specific wiring (dsp-entry, ui-entry)
- `contracts/`: cross-layer contract definitions (JSON → code generation)
- `scripts/`: setup, build, and code generation helpers
- `tests/cpp/`: C++ integration tests
- `libs/`: git submodules (JUCE/WAMR) — do not edit

## Workflow

Work is tracked as GitHub Issues. Each issue gets its own branch and PR.

1. Read the issue (`gh issue view <number>`).
2. Create a branch from `main`: `<type>/#<issue-number>-<short-description>`
   - Types: `feat/`, `fix/`, `chore/`, `docs/`, `test/`
   - Example: `fix/#25-sample-rate`, `feat/#26-memory-layout-codegen`
3. Write a failing test first (TDD: red → green → refactor).
4. Implement with focused edits. Run validation for the touched area.
5. **Stop and ask the user to review** before committing. Show changes and test results.
6. After approval: commit, push, open a PR (`Closes #<number>` in body).
7. After CI passes and user confirms: merge via `gh pr merge --squash --delete-branch`.

## Commands

| Area | Build | Test |
|---|---|---|
| DSP | `npm run build:dsp` | `npm run test:dsp` |
| UI | `npm run build:ui` | `npm run test:ui:unit` / `test:ui:component` / `test:ui:e2e` |
| Plugin | `npm run configure:plugin && npm run build:plugin` | `ctest --test-dir build -C Release --output-on-failure` |
| Contracts | `node scripts/gen-memory-layout.js` / `gen-showcase-layout.js` | `--check` flag for CI staleness |
| Full | `npm run release:vst` | — |
| Dev | `npm run dev` | — |

## Architecture Rules

### Product Structure

- `packages/*` = shared implementation, `products/*` = product wiring only
- `plugin/` is product-agnostic — no product branching in C++
- Product registration is automatic via `import.meta.glob` in `main.tsx` — do not add manual imports
- Keep `App.tsx` thin (composition only). Product-specific UI goes in `products/<name>/ui-entry/components/`
- Shared styles in `packages/ui-core`, theme overrides in `products/*/ui-entry`
- Do not duplicate core logic into `products/*`; extract shared behavior back to `packages/*`

### Cross-Layer Contracts

Constants shared across MoonBit, C++, TypeScript, and JS are defined once in `contracts/*.json` and code-generated. Never hand-edit files marked `// AUTO-GENERATED`.

- `contracts/memory-layout.json` → WASM linear memory offsets (DSP, plugin, worklet)
- `contracts/showcase-graph-layout.json` → showcase parameter bank layout (offsets, strides, counts)
- After changing a contract JSON, regenerate and commit the generated files

### DSP Rules

- Keep `exports.mbt` host API compatible unless bridge changes are intentional
- Use `@utils.get_sample_rate()` for sample rate — never hardcode `48000.0`
- When changing params in `products/*/dsp-entry/params.mbt`, verify matching UI references

## Release

- Keep `main` releasable at all times
- Release tags: `v*` (e.g. `v0.1.0`) on `main` only
- Prefer `git revert` for rollback; do not rewrite `main` history

## Ground Rules

- No unrelated refactors — change only what the issue requires
- No speculative changes without explicit user approval
- No committing or pushing without user approval
- No committing generated outputs (`build/`, `node_modules/`)
- Follow existing naming, file layout, and code style
