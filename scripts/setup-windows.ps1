$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "=== WebVST Windows Setup ==="

# 1. Check MoonBit
$moonCmd = Get-Command moon -ErrorAction SilentlyContinue
if (-not $moonCmd) {
    Write-Host "Installing MoonBit..."
    irm https://cli.moonbitlang.com/install/powershell.ps1 | iex
    Write-Host "Please restart your terminal after MoonBit installation, then re-run this script."
    exit 0
} else {
    Write-Host "MoonBit already installed: $(moon version)"
}

# 2. Build WAMR iwasm.lib
Write-Host "=== Building WAMR iwasm.lib ==="
$WamrPlatform = "$RootDir/libs/wamr/product-mini/platforms/windows"
New-Item -ItemType Directory -Force -Path "$WamrPlatform/build" | Out-Null
Set-Location "$WamrPlatform/build"
cmake .. `
    -DWAMR_BUILD_AOT=1 `
    -DWAMR_BUILD_INTERP=0 `
    -DWAMR_BUILD_LIBC_BUILTIN=1 `
    -DWAMR_BUILD_LIBC_WASI=0
cmake --build . --config Release

# 3. Build wamrc (AOT compiler)
# Note: Requires LLVM. Install with: choco install llvm
Write-Host "=== Building wamrc ==="
$llvmCmd = Get-Command clang -ErrorAction SilentlyContinue
if (-not $llvmCmd) {
    Write-Host "WARNING: LLVM not found. wamrc requires LLVM to build."
    Write-Host "Install LLVM with: choco install llvm"
    Write-Host "Skipping wamrc build..."
} else {
    $WamrcDir = "$RootDir/libs/wamr/wamr-compiler"
    New-Item -ItemType Directory -Force -Path "$WamrcDir/build" | Out-Null
    Set-Location "$WamrcDir/build"
    cmake ..
    cmake --build . --config Release
}

# 4. Install UI dependencies
Write-Host "=== Installing UI dependencies ==="
Set-Location "$RootDir/ui"
npm install

# 5. Install root dependencies
Write-Host "=== Installing root dependencies ==="
Set-Location "$RootDir"
npm install

Write-Host ""
Write-Host "=== Setup complete! ==="
Write-Host "Next steps:"
Write-Host "  npm run dev          # Web development mode (hot reload)"
Write-Host "  npm run release:vst  # Full VST3 build"
