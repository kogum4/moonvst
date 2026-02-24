# Studio One Crash Root-Cause / Fix Note

## Status (2026-02-25)

- Temporary module pin workaround was removed.
- Crash is fixed by WAMR-side VEH lifecycle handling changes.
- UI slowdown/blank symptoms observed with module pin are no longer reproduced.

## Root Cause

- On Windows, crash occurred after plugin unload in `ntdll.dll` (`RtlpCallVectoredHandlers` path).
- Dump analysis showed references into unloaded VST3 image (`showcase.vst3_unloaded` / `template.vst3_unloaded`).
- WAMR runtime signal lifecycle could register VEH multiple times (runtime init + thread env init paths), and handler removal lifecycle was not robust enough for repeated init/destroy host flows.

## Permanent Fix Implemented

File: `libs/wamr/core/iwasm/common/wasm_runtime_common.c`

- Keep VEH handle (`AddVectoredExceptionHandler` return value) and remove with that handle.
- Add Windows-only VEH reference count to avoid duplicate registration.
- Guard init/destroy with mutex.
- Remove VEH only when ref count reaches zero.
- If `RemoveVectoredExceptionHandler` fails, keep handle and keep ref count alive (retry-able on next destroy cycle), instead of losing ownership by clearing handle.

## Product-Side Changes

- Removed temporary plugin module pin (`GetModuleHandleEx(...PIN...)`) from `plugin/src/PluginProcessor.cpp`.
- Added regression coverage in `tests/cpp/plugin_smoke_test.cpp`:
  - worker-thread lifetime overlap test
  - repeated create/process/destroy cycles

## Validation

- `cmake --build libs/wamr/product-mini/platforms/windows/build --config Release`
- `npm run build:plugin`
- `ctest --test-dir build -C Release --output-on-failure`

All passed on 2026-02-25.

## Repro Scenario (for regression check)

- Remove VST from track
- Open/close DAW top menu repeatedly
- Re-add plugin multiple times

## Related Dumps

- `C:\Dumps\StudioOne\Studio One.exe_260224_232000.dmp`
- `C:\Dumps\StudioOne\Studio One.exe_260224_232642.dmp`
- `C:\Dumps\StudioOne\Studio One.exe_260225_003150.dmp`

## Operational Plan for WAMR Submodule

Submodule is third-party, so keep local divergence explicit and reproducible.

Detailed runbook: `docs/wamr-submodule-operations.md`

Recommended options (in order):

1. **Fork-and-pin (recommended)**
- Create `moonvst`-managed WAMR fork.
- Open PR upstream to WAMR.
- Until upstream merge, pin submodule to fork commit containing the fix.
- When upstream includes the fix, repoint submodule back to upstream official commit.

2. **Patch-at-setup (fallback)**
- Keep upstream submodule commit unchanged.
- Store patch under repository (e.g. `patches/wamr/*.patch`).
- Apply patch automatically in setup/build script before WAMR build.
- Verify patch application in CI to avoid silent drift.

3. **Do not keep hidden local-only edits**
- Avoid manual ad-hoc edits inside `libs/wamr` without tracked procedure.
- If local edit is unavoidable, require:
  - patch file update
  - document update
  - CI validation on clean checkout
