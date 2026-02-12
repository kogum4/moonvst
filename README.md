# MoonVST

MoonVST is a template for building desktop audio plugins with web technology.

It combines:
- MoonBit for DSP code (compiled to WASM)
- WAMR for native AOT execution
- JUCE for plugin hosting (VST3 / AU / Standalone)
- React + Vite for the plugin UI

The main goal is to let you iterate on DSP and UI quickly, while keeping native plugin output.

## What Is MoonBit?

MoonBit is a language/toolchain built for WebAssembly-first development.

- It compiles to WebAssembly and comes with the `moon` CLI.
- Here, it is the source of truth for DSP because the project is WASM-first and needs a lightweight DSP build loop.

If you are new to it, start here:
- Official docs: https://docs.moonbitlang.com/
- Language site: https://www.moonbitlang.com/

## Why This Template?

- Less C++ churn: most day-to-day DSP/UI work can be done without full native rebuild loops.
- MoonBit + React workflow: define DSP/parameters in MoonBit, build controls in React, and iterate quickly with `npm run dev`.
- Native output, web-like DX: ship VST3/AU/Standalone while keeping a fast web-style development experience.

## Architecture

```text
MoonBit DSP (WASM) -> AOT (wamrc) -> JUCE plugin (WAMR runtime)
                                     -> React UI in WebView

Browser dev mode:
MoonBit DSP (WASM) + React UI + WebAudio/AudioWorklet
```

## Status

- Windows: verified
- macOS: not fully verified yet

## Requirements

- Git
- Node.js 20+
- CMake 3.22+
- C++17 toolchain
- MoonBit CLI (`moon`)

### Windows

- Visual Studio 2022 (MSVC, Desktop C++)
- `winget` (used by setup script)
- Edge WebView2 Runtime (setup script installs if missing)

### macOS

- Xcode Command Line Tools
- Homebrew

## Quick Start

### 1. Clone with submodules

```bash
git clone --recursive https://github.com/kogum4/moonvst.git
cd moonvst
```

If you already cloned without submodules:

```bash
git submodule update --init --recursive
```

### 2. Run platform setup

Windows (PowerShell):

```powershell
./scripts/setup-windows.ps1
```

macOS:

```bash
./scripts/setup-macos.sh
```

These scripts install/check MoonBit, build WAMR, build `wamrc`, and install npm dependencies.

## Development Workflows

### Web development mode (fast iteration)

```bash
npm run dev
```

This runs in parallel:
- DSP watcher (`scripts/dev-dsp.js`) that rebuilds MoonBit WASM
- Vite dev server for UI at `http://localhost:5173`

Use this to iterate quickly on DSP and UI without rebuilding the native plugin each edit.

### Native plugin build

```bash
npm run build:dsp
npm run build:ui
npm run configure:plugin
npm run build:plugin
```

Or run all in one:

```bash
npm run release:vst
```

## Output Artifacts

After native build, artifacts are under:

- `build/plugin/MoonVST_artefacts/Release/VST3/`
- `build/plugin/MoonVST_artefacts/Release/Standalone/`

On macOS, AU is also built.

## First Customization Steps

The template is designed so most feature work does not require C++ edits.

### 1. Add or modify DSP parameters

Edit `dsp/src/params.mbt`:

- add parameter definitions in `param_defs`
- keep `param_values` aligned with your parameter count/defaults

### 2. Implement DSP logic

Edit `dsp/src/lib.mbt` (`process_audio`).

### 3. Keep exported DSP API available

`dsp/src/exports.mbt` contains the generic host API used by C++/UI:
- `get_param_count`
- `get_param_name`
- `get_param_default`
- `get_param_min`
- `get_param_max`
- `set_param`
- `get_param`
- `process_block`

Do not remove these unless you also update the host bridge.

### 4. Build UI controls

Edit React UI under `ui/src`.

`useParam` (`ui/src/hooks/useParam.ts`) already maps controls to DSP parameters by name.

## Project Layout

```text
dsp/                MoonBit DSP source and exports
plugin/             JUCE plugin + WAMR host bridge
ui/                 React/Vite UI
scripts/            setup/build helper scripts
libs/               submodules (JUCE, WAMR)
tests/cpp/          native WASM integration test
```

## Testing

There is a C++ integration test in `tests/cpp/wasm_dsp_test.cpp`.

Example build with tests enabled:

```bash
cmake -B build -DBUILD_TESTS=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build -C Release --output-on-failure
```

## Troubleshooting

- `WAMR runtime library not found`
  - run platform setup script again (`setup-windows.ps1` or `setup-macos.sh`)

- `wamrc not found`
  - setup script did not finish successfully; rerun it

- UI shows `JUCE bridge not available`
  - when running plugin debug mode, ensure Vite dev server is running (`npm run dev`)
  - for release build, run `npm run build:ui` before `npm run build:plugin`

- Clone/build issues around JUCE or WAMR
  - confirm submodules are initialized (`git submodule update --init --recursive`)

## License

MIT
