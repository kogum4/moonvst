$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "=== MoonVST Windows Setup ==="

# 1. Check MoonBit
$moonCmd = Get-Command moon -ErrorAction SilentlyContinue
if (-not $moonCmd) {
    Write-Host "Installing MoonBit..."
    irm https://cli.moonbitlang.com/install/powershell.ps1 | iex
    $MoonBin = "$env:USERPROFILE\.moon\bin"
    if ($env:GITHUB_PATH) {
        $MoonBin | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
        $env:PATH = "$MoonBin;$env:PATH"
    }
    $moonCmd = Get-Command moon -ErrorAction SilentlyContinue
    if (-not $moonCmd) {
        throw "MoonBit installation completed, but 'moon' command is still unavailable."
    }
    if (-not $env:GITHUB_ACTIONS) {
        Write-Host "Please restart your terminal after MoonBit installation, then re-run this script."
        exit 0
    }
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
$LlvmCmakeDir = "$LlvmBuildDir/lib/cmake/llvm"

function Patch-LlvmCmakeConfig {
    param (
        [string]$LlvmCmakeDirPath
    )

    if (-not (Test-Path $LlvmCmakeDirPath)) {
        return
    }

    $DiaGuids = Get-ChildItem -Path "C:/Program Files (x86)/Microsoft Visual Studio" -Recurse -Filter "diaguids.lib" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "amd64" } | Select-Object -First 1
    $DiaPath = if ($DiaGuids) { $DiaGuids.FullName.Replace('\', '/') } else { $null }

    $patchedFiles = 0
    $cmakeFiles = Get-ChildItem -Path $LlvmCmakeDirPath -Filter "*.cmake" -File
    foreach ($file in $cmakeFiles) {
        $content = Get-Content $file.FullName -Raw
        $updated = $content
        $updated = $updated.Replace('"LibXml2::LibXml2;LLVMSupport"', '"LLVMSupport"')
        $updated = $updated.Replace('set(LLVM_ENABLE_LIBXML2 1)', 'set(LLVM_ENABLE_LIBXML2 0)')

        if ($DiaPath) {
            $updated = $updated -replace 'C:/Program Files \(x86\)/Microsoft Visual Studio/[^;"]*/DIA SDK/lib/amd64/diaguids\.lib', $DiaPath
        } else {
            $updated = $updated -replace 'C:/Program Files \(x86\)/Microsoft Visual Studio/[^;"]*/DIA SDK/lib/amd64/diaguids\.lib;?', ''
        }

        if ($updated -ne $content) {
            Set-Content $file.FullName $updated -NoNewline
            $patchedFiles++
        }
    }

    if ($DiaPath) {
        Write-Host "Patched LLVM CMake config files: $patchedFiles (DIA path: $DiaPath)"
    } else {
        Write-Warning "diaguids.lib was not found. Removed hardcoded DIA SDK references from LLVM CMake config files."
    }
}

if (-not (Test-Path "$LlvmCmakeDir/LLVMConfig.cmake")) {
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

    Write-Host "LLVM $LlvmVersion installed."
} else {
    Write-Host "LLVM already available at $LlvmBuildDir"
}

Patch-LlvmCmakeConfig -LlvmCmakeDirPath $LlvmCmakeDir

# 4. Build wamrc (AOT compiler)
Write-Host "=== Building wamrc ==="
$WamrcDir = "$RootDir/libs/wamr/wamr-compiler"
New-Item -ItemType Directory -Force -Path "$WamrcDir/build" | Out-Null
Set-Location "$WamrcDir/build"
cmake ..
cmake --build . --config Release

$WamrcCandidates = @(
    "$WamrcDir/build/Release/wamrc.exe",
    "$WamrcDir/build/wamrc.exe"
)
$BuiltWamrc = $WamrcCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $BuiltWamrc) {
    throw "wamrc build completed but executable not found. Checked: $($WamrcCandidates -join ', ')"
}

# 5. Install Edge WebView2 Runtime (required at runtime for WebView UI on Windows)
Write-Host "=== Checking Edge WebView2 Runtime ==="
$WebView2RuntimeId = "Microsoft.EdgeWebView2Runtime"
$WingetCmd = Get-Command winget -ErrorAction SilentlyContinue
if (-not $WingetCmd) {
    throw "winget is required to install $WebView2RuntimeId. Please install App Installer (winget) and re-run this script."
}

$RuntimeInstalled = winget list --id $WebView2RuntimeId -e | Select-String -SimpleMatch $WebView2RuntimeId
if (-not $RuntimeInstalled) {
    Write-Host "Installing Edge WebView2 Runtime..."
    winget install --id $WebView2RuntimeId -e --accept-package-agreements --accept-source-agreements
    Write-Host "Edge WebView2 Runtime installed."
} else {
    Write-Host "Edge WebView2 Runtime already installed."
}

# 6. Install WebView2 NuGet package (required by JUCE for WebView build on Windows)
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

# 7. Install UI dependencies
Write-Host "=== Installing UI dependencies ==="
Set-Location "$RootDir/ui"
npm install

# 8. Install root dependencies
Write-Host "=== Installing root dependencies ==="
Set-Location "$RootDir"
npm install

Write-Host ""
Write-Host "=== Setup complete! ==="
Write-Host "Next steps:"
Write-Host "  npm run dev          # Web development mode (hot reload)"
Write-Host "  npm run release:vst  # Full VST3 build"
