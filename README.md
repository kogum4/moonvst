# MoonVST

**Build native audio plugins at web-dev speed.**

Write DSP in [MoonBit](https://www.moonbitlang.com/), build UI in React, ship VST3 / AU / Standalone -- all without touching C++.

[MoonBit](https://docs.moonbitlang.com/) is a type-safe language that compiles to compact WebAssembly. MoonVST uses it as the DSP source of truth because the WASM output runs both in the browser (dev) and natively via AOT (release).

**[Try it in your browser](https://kogum4.github.io/moonvst/)** -- no install needed.

## Why MoonVST?

- **Instant iteration** -- `npm run dev` starts a browser-based dev environment with hot reload. Change DSP or UI, see results immediately.
- **No C++ in your daily loop** -- DSP lives in MoonBit, UI lives in React. C++ is handled once by the template.
- **Native output** -- the same code that runs in your browser compiles to a production plugin via WAMR AOT. Produces VST3 + Standalone on Windows, VST3 + AU + Standalone on macOS.
- **Multi-product, one repo** -- [scaffold new plugins](#scaffold-a-new-plugin) from a shared core. Each product is just a thin wiring layer.

## How It Works

```text
You write:          MoonBit DSP + React UI
                          |
  Dev mode:     Browser + WebAudio (hot reload, no build wait)
  Release:      WASM -> AOT (wamrc) -> JUCE plugin (WAMR runtime)
                                       + React UI in WebView
```

## Setup

**First-time setup takes 15-30 minutes** (downloads LLVM for AOT compilation, compiles WAMR from source).

```bash
git clone --recursive https://github.com/kogum4/moonvst.git
cd moonvst

./scripts/setup-windows.ps1   # Windows (PowerShell)
./scripts/setup-macos.sh      # macOS
```

The setup script installs MoonBit, builds WAMR/wamrc, and runs `npm install`.

## Dev Loop

```bash
npm run dev                   # -> http://localhost:5173
```

Edit DSP in `products/template/dsp-entry/`, edit UI in `products/template/ui-entry/` -- changes reflect instantly in the browser.

## Build a Plugin

```bash
npm run release:vst
```

Output: `build/plugin/MoonVST_<product>_artefacts/Release/VST3/`

## Scaffold a New Plugin

```bash
npm run scaffold:product -- --name my-effect --from template
npm run dev:my-effect           # develop
npm run release:vst:my-effect   # build VST3
```

Each product gets its own DSP entry + UI entry, sharing the core engine and plugin host. The scaffold script auto-generates all per-product npm scripts (`dev:`, `build:dsp:`, `release:vst:`, etc.).

## Customize Your Plugin

Most work happens in two places -- no C++ required:

**1. Define parameters** (`products/<name>/dsp-entry/params.mbt`)

```moonbit
let param_defs : Array[ParamDef] = [
  { name: "gain", min: 0.0, max: 1.5, default_val: 1.0 },
]

// One default value per param — must stay in sync with param_defs order
let param_values : Array[Float] = [1.0]
```

**2. Implement DSP** (`products/<name>/dsp-entry/lib.mbt`)

```moonbit
fn process_audio(num_samples : Int) -> Unit {
  let gain = param_values[0]
  for i = 0; i < num_samples; i = i + 1 {
    let offset = i * 4
    // Input/output offsets are framework-provided constants into shared WASM memory
    let out_l = @utils.load_f32(@utils.input_left_offset + offset) * gain
    let out_r = @utils.load_f32(@utils.input_right_offset + offset) * gain
    @utils.store_f32(@utils.output_left_offset + offset, out_l)
    @utils.store_f32(@utils.output_right_offset + offset, out_r)
  }
}
```

Audio I/O uses shared WASM linear memory. The `@utils` helpers handle buffer layout so you can focus on the signal math.

**3. Build UI controls** (`products/<name>/ui-entry/App.tsx`)

UI controls bind to DSP parameters by name via the `useParam` hook. See `products/template/ui-entry/App.tsx` for a working example with `GainSlider` and `LevelMeter`.

The parameter system auto-syncs across MoonBit DSP, the JUCE host bridge, and the React UI.

**4. Set vendor metadata** (`plugin/CMakeLists.txt`)

Plugin name is derived from the product name automatically. Vendor name and manufacturer code are shared across all products:

```cmake
COMPANY_NAME "MoonVST"                # your vendor name
PLUGIN_MANUFACTURER_CODE Wvst         # 4-char unique ID
```

## Testing

```bash
npm run test:dsp          # MoonBit unit tests
npm run test:ui:unit      # React unit tests
npm run test:ui:component # Component tests (Testing Library)
npm run test:ui:e2e       # E2E tests (Playwright)
```

CI runs all tests on every PR.

## Project Layout

```text
products/           Product-specific wiring (DSP entry + UI entry)
packages/dsp-core/  Shared MoonBit DSP engine
packages/ui-core/   Shared React components and hooks
plugin/             JUCE plugin host (shared, product-agnostic)
scripts/            Setup and build helpers
libs/               Submodules (JUCE, WAMR)
```

## Requirements

|                  | Windows                          | macOS                     |
|------------------|----------------------------------|---------------------------|
| **Toolchain**    | Visual Studio 2022 (MSVC)        | Xcode Command Line Tools  |
| **Package mgr**  | winget                           | Homebrew                  |
| **Common**       | Node.js 20+, CMake 3.22+, Git                                 |

MoonBit CLI is installed automatically by the setup script. Linux is not currently supported.

Windows is fully verified. macOS builds but has not been extensively tested in DAW hosts.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `WAMR runtime library not found` | Re-run the setup script |
| `wamrc not found` | Re-run the setup script |
| UI shows `JUCE bridge not available` | Start Vite dev server (`npm run dev`) or run `npm run build:ui` before `npm run build:plugin` |
| JUCE/WAMR build issues | Run `git submodule update --init --recursive` |

## Additional Targets

```bash
npm run release:vst:showcase  # Showcase product (Dattorro reverb demo)
npm run release:unity         # Unity Native Audio Plugin (template product)
```

<details>
<summary>Unity and advanced build options</summary>

```bash
npm run configure:plugin:unity    # Enable Unity output
npm run configure:plugin -- -DMOONVST_ENABLE_UNITY=ON   # or via flag
```

Artifacts: `build/plugin/MoonVST_<product>_artefacts/Release/Unity/`

Plugin metadata (vendor name, manufacturer code) is configured in `plugin/CMakeLists.txt`.

</details>

## Acknowledgements

Built on [JUCE](https://github.com/juce-framework/JUCE), [WAMR](https://github.com/bytecodealliance/wasm-micro-runtime), and [MoonBit](https://www.moonbitlang.com/). Inspired by [suna](https://github.com/yuichkun/suna).

## License

Apache-2.0
