# WAMR Submodule Operations

This document defines the operational flow for maintaining `libs/wamr` with a project fork while upstreaming fixes.

## Goal

- Keep `main` reproducible with no hidden local edits in submodules.
- Allow fast shipping of urgent WAMR fixes.
- Converge back to upstream WAMR when fixes are merged.

## Current Submodule

- Path: `libs/wamr`
- Upstream URL: `https://github.com/bytecodealliance/wasm-micro-runtime.git`

## One-Time: Switch to Project Fork

1. Create a WAMR fork (example: `https://github.com/<org>/wasm-micro-runtime.git`).
2. Update `.gitmodules` and local submodule URL:
```powershell
pwsh -File scripts/wamr-set-fork-url.ps1 -ForkUrl "https://github.com/<org>/wasm-micro-runtime.git"
```
3. Commit `.gitmodules` update.
4. In `libs/wamr`, push the fix branch/commit to fork.
5. Update superproject submodule pointer and commit:
```powershell
git add libs/wamr
git commit -m "chore(wamr): pin fork commit with VEH lifecycle fix"
```

## Day-to-Day Update Flow

When changing WAMR behavior:

1. Create/fetch branch inside submodule:
```powershell
git -C libs/wamr checkout -B moonvst/<topic>
```
2. Apply and test fix.
3. Push to fork remote.
4. Update submodule pointer in superproject (`git add libs/wamr` + commit).
5. Record rationale in docs (`docs/studioone-crash-workaround-note.md`).

## Upstream PR Flow

1. Open PR from fork branch to upstream WAMR.
2. Use `.github/PULL_REQUEST_TEMPLATE/wamr-upstream-sync.md`.
3. In superproject PR, include:
- Upstream PR URL
- Fork commit hash pinned in submodule
- Removal plan once upstream is merged

## Sync Back to Upstream

After upstream merge/release contains the fix:

1. Repoint submodule URL back to upstream:
```powershell
pwsh -File scripts/wamr-set-fork-url.ps1 -ForkUrl "https://github.com/bytecodealliance/wasm-micro-runtime.git"
```
2. Checkout upstream commit/tag in `libs/wamr`.
3. Commit submodule pointer update in superproject.
4. Close tracking issue for temporary fork divergence.

## Safety Rules

- Never leave uncommitted/manual-only changes in `libs/wamr`.
- Every WAMR fix must have:
- submodule commit hash
- superproject pointer commit
- documented validation command set
- If emergency local change is required, convert it into a fork commit before merge.

## Validation Commands

- WAMR rebuild: `cmake --build libs/wamr/product-mini/platforms/windows/build --config Release`
- Plugin rebuild: `npm run build:plugin`
- C++ tests: `ctest --test-dir build -C Release --output-on-failure`
