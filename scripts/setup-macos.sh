#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== MoonVST macOS Setup ==="

# Ensure Homebrew is available in this shell (especially when running via bash).
if ! command -v brew &> /dev/null; then
    if [ -x /opt/homebrew/bin/brew ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
        eval "$(/usr/local/bin/brew shellenv)"
    else
        echo "Homebrew is required but was not found."
        echo "Install Homebrew from https://brew.sh and re-run this script."
        exit 1
    fi
fi

# 1. Check MoonBit
if ! command -v moon &> /dev/null; then
    echo "Installing MoonBit..."
    curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash
    MOON_PATH_LINE='export PATH="$HOME/.moon/bin:$PATH"'
    if [ -f "$HOME/.zshrc" ]; then
        if ! grep -Fqx "$MOON_PATH_LINE" "$HOME/.zshrc"; then
            printf "\n# moonbit\n%s\n" "$MOON_PATH_LINE" >> "$HOME/.zshrc"
        fi
    else
        printf "# moonbit\n%s\n" "$MOON_PATH_LINE" > "$HOME/.zshrc"
    fi

    # Apply for this setup process only. Parent shell still needs source/restart.
    export PATH="$HOME/.moon/bin:$PATH"
    if [ -n "${GITHUB_PATH:-}" ]; then
        echo "$HOME/.moon/bin" >> "$GITHUB_PATH"
    fi
else
    echo "MoonBit already installed: $(moon version)"
fi

# 2. Install build tools
if ! command -v cmake &> /dev/null; then
    echo "=== Installing CMake via Homebrew ==="
    brew install cmake
else
    echo "CMake already installed: $(cmake --version | head -n 1)"
fi

# 3. Build WAMR libiwasm
echo "=== Building WAMR libiwasm ==="
WAMR_PLATFORM="$ROOT_DIR/libs/wamr/product-mini/platforms/darwin"
mkdir -p "$WAMR_PLATFORM/build"
cd "$WAMR_PLATFORM/build"
cmake .. \
    -DWAMR_BUILD_AOT=1 \
    -DWAMR_BUILD_INTERP=0 \
    -DWAMR_BUILD_LIBC_BUILTIN=1 \
    -DWAMR_BUILD_LIBC_WASI=0 \
    -DWAMR_DISABLE_HW_BOUND_CHECK=1
make -j$(sysctl -n hw.ncpu)

# 4. Install LLVM (required for wamrc AOT compiler)
if ! brew list llvm@18 &>/dev/null; then
    echo "=== Installing LLVM 18 via Homebrew ==="
    brew install llvm@18
else
    echo "LLVM 18 already installed via Homebrew"
fi
LLVM_DIR="$(brew --prefix llvm@18)/lib/cmake/llvm"

# 5. Build wamrc (AOT compiler)
echo "=== Building wamrc ==="
WAMRC_DIR="$ROOT_DIR/libs/wamr/wamr-compiler"
mkdir -p "$WAMRC_DIR/build"
cd "$WAMRC_DIR/build"
cmake .. -DWAMR_BUILD_WITH_CUSTOM_LLVM=1 -DLLVM_DIR="$LLVM_DIR"
make -j$(sysctl -n hw.ncpu)

# 6. Install UI dependencies
echo "=== Installing UI dependencies ==="
cd "$ROOT_DIR/packages/ui-core"
npm install

# 7. Install root dependencies
echo "=== Installing root dependencies ==="
cd "$ROOT_DIR"
npm install

echo ""
echo "=== Setup complete! ==="
echo "If 'moon' is not found in your current terminal, run:"
echo "  source ~/.zshrc"
echo "or reopen the terminal."
echo "Next steps:"
echo "  npm run dev          # Web development mode (hot reload)"
echo "  npm run release:vst  # Full VST3 build"
