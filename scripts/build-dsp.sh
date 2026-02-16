#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Building MoonBit DSP ==="
cd "$ROOT_DIR/packages/dsp-core"
moon build --target wasm

WASM_PATH="_build/wasm/debug/build/src/src.wasm"

echo "=== Copying WASM to UI public ==="
mkdir -p "$ROOT_DIR/packages/ui-core/public/wasm"
cp "$WASM_PATH" "$ROOT_DIR/packages/ui-core/public/wasm/moonvst_dsp.wasm"

echo "=== AOT Compiling ==="
WAMRC="$ROOT_DIR/libs/wamr/wamr-compiler/build/wamrc"
if [ ! -f "$WAMRC" ]; then
    echo "Error: wamrc not found at $WAMRC"
    echo "Run setup-macos.sh first to build wamrc."
    exit 1
fi

mkdir -p "$ROOT_DIR/plugin/resources"
$WAMRC --opt-level=3 \
    -o "$ROOT_DIR/plugin/resources/moonvst_dsp.aot" \
    "$WASM_PATH"

echo "=== DSP build complete ==="
