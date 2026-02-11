#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== WebVST macOS Setup ==="

# 1. Check MoonBit
if ! command -v moon &> /dev/null; then
    echo "Installing MoonBit..."
    curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash
    echo 'export PATH="$HOME/.moon/bin:$PATH"' >> ~/.zshrc
    export PATH="$HOME/.moon/bin:$PATH"
else
    echo "MoonBit already installed: $(moon version)"
fi

# 2. Build WAMR libiwasm
echo "=== Building WAMR libiwasm ==="
WAMR_PLATFORM="$ROOT_DIR/libs/wamr/product-mini/platforms/darwin"
mkdir -p "$WAMR_PLATFORM/build"
cd "$WAMR_PLATFORM/build"
cmake .. \
    -DWAMR_BUILD_AOT=1 \
    -DWAMR_BUILD_INTERP=0 \
    -DWAMR_BUILD_LIBC_BUILTIN=1 \
    -DWAMR_BUILD_LIBC_WASI=0
make -j$(sysctl -n hw.ncpu)

# 3. Build wamrc (AOT compiler)
echo "=== Building wamrc ==="
WAMRC_DIR="$ROOT_DIR/libs/wamr/wamr-compiler"
mkdir -p "$WAMRC_DIR/build"
cd "$WAMRC_DIR/build"
cmake ..
make -j$(sysctl -n hw.ncpu)

# 4. Install UI dependencies
echo "=== Installing UI dependencies ==="
cd "$ROOT_DIR/ui"
npm install

# 5. Install root dependencies
echo "=== Installing root dependencies ==="
cd "$ROOT_DIR"
npm install

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "  npm run dev          # Web development mode (hot reload)"
echo "  npm run release:vst  # Full VST3 build"
