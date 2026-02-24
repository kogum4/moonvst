# Studio One Crash Workaround Note

## Status

Current fix on branch `fix/studioone-crash-unloaded-vst3` includes a **temporary workaround**.

## Temporary Workaround Implemented

- Windows only: plugin module is pinned with `GetModuleHandleEx(...GET_MODULE_HANDLE_EX_FLAG_PIN...)` in `PluginProcessor`.
- Purpose: avoid calling vectored exception handlers from an unloaded VST3 module.

## Why This Is Temporary

- Crash dumps indicate repeated calls through `RtlpCallVectoredHandlers` into:
  - `<Unloaded_showcase.vst3>`
  - `<Unloaded_template.vst3>`
- This suggests handler lifetime interaction with WAMR/Windows VEH behavior.
- Pinning prevents unload, but does not solve root ownership/lifecycle in runtime integration.

## Observed Side Effects

- UI can become slow on 2nd+ plugin re-open.
- UI can become blank after repeated remove/add cycles.

## Permanent Fix Direction (Next Session)

1. Root-cause the VEH registration/removal lifecycle around WAMR on Windows.
2. Remove module pin workaround after lifecycle fix is verified.
3. Add regression test scenario for repeated open/close/remove cycles in host-like flow.

## Repro Summary

- Remove VST from track.
- Open/close DAW top menu repeatedly.
- Re-add plugin multiple times.

## Related Dumps

- `C:\Dumps\StudioOne\Studio One.exe_260224_232000.dmp`
- `C:\Dumps\StudioOne\Studio One.exe_260224_232642.dmp`

