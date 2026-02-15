#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== MoonVST macOS Setup ==="

# 1. Check MoonBit
if ! command -v moon &> /dev/null; then
    echo "Installing MoonBit..."
    curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash
    echo 'export PATH="$HOME/.moon/bin:$PATH"' >> ~/.zshrc
    export PATH="$HOME/.moon/bin:$PATH"
    if [ -n "${GITHUB_PATH:-}" ]; then
        echo "$HOME/.moon/bin" >> "$GITHUB_PATH"
    fi
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

# 3. Install LLVM (required for wamrc AOT compiler)
if ! brew list llvm@18 &>/dev/null; then
    echo "=== Installing LLVM 18 via Homebrew ==="
    brew install llvm@18
else
    echo "LLVM 18 already installed via Homebrew"
fi
LLVM_DIR="$(brew --prefix llvm@18)/lib/cmake/llvm"

# 4. Build wamrc (AOT compiler)
echo "=== Building wamrc ==="
WAMRC_DIR="$ROOT_DIR/libs/wamr/wamr-compiler"
mkdir -p "$WAMRC_DIR/build"
cd "$WAMRC_DIR/build"
cmake .. -DWAMR_BUILD_WITH_CUSTOM_LLVM=1 -DLLVM_DIR="$LLVM_DIR"
make -j$(sysctl -n hw.ncpu)

# 5. Install UI dependencies
echo "=== Installing UI dependencies ==="
cd "$ROOT_DIR/ui"
npm install

# 6. Install root dependencies
echo "=== Installing root dependencies ==="
cd "$ROOT_DIR"
npm install

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "  npm run dev          # Web development mode (hot reload)"
echo "  npm run release:vst  # Full VST3 build"
