#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Building MoonBit DSP ==="
cd "$ROOT_DIR/dsp"
moon build --target wasm

echo "=== Copying WASM to UI public ==="
mkdir -p "$ROOT_DIR/ui/public/wasm"
cp _build/wasm/debug/build/src/src.wasm "$ROOT_DIR/ui/public/wasm/webvst_dsp.wasm"

echo "=== AOT Compiling ==="
WAMRC="$ROOT_DIR/libs/wamr/wamr-compiler/build/wamrc"
if [ ! -f "$WAMRC" ]; then
    echo "Error: wamrc not found at $WAMRC"
    echo "Run setup-macos.sh first to build wamrc."
    exit 1
fi

mkdir -p "$ROOT_DIR/plugin/resources"
$WAMRC --opt-level=3 \
    -o "$ROOT_DIR/plugin/resources/webvst_dsp.aot" \
    _build/wasm/release/build/src/src.wasm

echo "=== DSP build complete ==="
