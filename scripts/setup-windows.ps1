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

# 3. Download LLVM libraries (required for wamrc AOT compiler)
$LlvmBuildDir = "$RootDir/libs/wamr/core/deps/llvm/build"
$LlvmVersion = "18.1.8"
$LlvmArchive = "clang+llvm-$LlvmVersion-x86_64-pc-windows-msvc.tar.xz"
$LlvmUrl = "https://github.com/llvm/llvm-project/releases/download/llvmorg-$LlvmVersion/$LlvmArchive"

if (-not (Test-Path "$LlvmBuildDir/lib/cmake/llvm/LLVMConfig.cmake")) {
    Write-Host "=== Downloading LLVM $LlvmVersion development libraries ==="
    $LlvmDepsDir = "$RootDir/libs/wamr/core/deps"
    New-Item -ItemType Directory -Force -Path $LlvmDepsDir | Out-Null
    $ArchivePath = "$LlvmDepsDir/$LlvmArchive"

    if (-not (Test-Path $ArchivePath)) {
        Write-Host "Downloading $LlvmArchive (~936MB, this may take several minutes)..."
        Invoke-WebRequest -Uri $LlvmUrl -OutFile $ArchivePath -UseBasicParsing
    }

    Write-Host "Extracting LLVM..."
    Set-Location $LlvmDepsDir
    tar xf $LlvmArchive

    $ExtractedDir = "$LlvmDepsDir/clang+llvm-$LlvmVersion-x86_64-pc-windows-msvc"
    if (Test-Path $LlvmBuildDir) { Remove-Item -Recurse -Force $LlvmBuildDir }
    New-Item -ItemType Directory -Force -Path "$LlvmDepsDir/llvm" | Out-Null
    Move-Item $ExtractedDir $LlvmBuildDir

    Remove-Item $ArchivePath -Force

    # Patch LLVM cmake config for local environment
    $ExportsFile = "$LlvmBuildDir/lib/cmake/llvm/LLVMExports.cmake"
    $content = (Get-Content $ExportsFile -Raw)
    # Remove LibXml2 dependency (not bundled with LLVM, not needed for wamrc)
    $content = $content.Replace('"LibXml2::LibXml2;LLVMSupport"', '"LLVMSupport"')
    # Fix DIA SDK path (pre-built LLVM hardcodes VS 2019 path)
    $DiaGuids = Get-ChildItem -Path "C:/Program Files (x86)/Microsoft Visual Studio" -Recurse -Filter "diaguids.lib" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "amd64" } | Select-Object -First 1
    if ($DiaGuids) {
        $DiaPath = $DiaGuids.FullName.Replace('\', '/')
        $content = $content -replace 'C:/Program Files \(x86\)/Microsoft Visual Studio/[^;"]*/DIA SDK/lib/amd64/diaguids\.lib', $DiaPath
    }
    Set-Content $ExportsFile $content -NoNewline
    $ConfigFile = "$LlvmBuildDir/lib/cmake/llvm/LLVMConfig.cmake"
    $content = (Get-Content $ConfigFile -Raw)
    $content = $content.Replace('set(LLVM_ENABLE_LIBXML2 1)', 'set(LLVM_ENABLE_LIBXML2 0)')
    Set-Content $ConfigFile $content -NoNewline

    Write-Host "LLVM $LlvmVersion installed."
} else {
    Write-Host "LLVM already available at $LlvmBuildDir"
}

# 4. Build wamrc (AOT compiler)
Write-Host "=== Building wamrc ==="
$WamrcDir = "$RootDir/libs/wamr/wamr-compiler"
New-Item -ItemType Directory -Force -Path "$WamrcDir/build" | Out-Null
Set-Location "$WamrcDir/build"
cmake ..
cmake --build . --config Release

# 5. Install WebView2 NuGet package (required by JUCE for WebView on Windows)
Write-Host "=== Installing WebView2 NuGet package ==="
$WebView2Dir = "$env:USERPROFILE/AppData/Local/PackageManagement/NuGet/Packages/Microsoft.Web.WebView2*"
if (-not (Test-Path $WebView2Dir)) {
    $NugetSource = Get-PackageSource -Name nugetRepository -ErrorAction SilentlyContinue
    if (-not $NugetSource) {
        Register-PackageSource -provider NuGet -name nugetRepository -location https://www.nuget.org/api/v2
    }
    Install-Package Microsoft.Web.WebView2 -Scope CurrentUser -RequiredVersion 1.0.3485.44 -Source nugetRepository -Force
    Write-Host "WebView2 NuGet package installed."
} else {
    Write-Host "WebView2 NuGet package already installed."
}

# 6. Install UI dependencies
Write-Host "=== Installing UI dependencies ==="
Set-Location "$RootDir/ui"
npm install

# 7. Install root dependencies
Write-Host "=== Installing root dependencies ==="
Set-Location "$RootDir"
npm install

Write-Host ""
Write-Host "=== Setup complete! ==="
Write-Host "Next steps:"
Write-Host "  npm run dev          # Web development mode (hot reload)"
Write-Host "  npm run release:vst  # Full VST3 build"
