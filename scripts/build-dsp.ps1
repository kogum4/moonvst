$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "=== Building MoonBit DSP ==="
Set-Location "$RootDir/dsp"
moon build --target wasm

Write-Host "=== Copying WASM to UI public ==="
New-Item -ItemType Directory -Force -Path "$RootDir/ui/public/wasm" | Out-Null
Copy-Item "_build/wasm/debug/build/src/src.wasm" "$RootDir/ui/public/wasm/webvst_dsp.wasm"

Write-Host "=== AOT Compiling ==="
$wamrc = "$RootDir/libs/wamr/wamr-compiler/build/Release/wamrc.exe"
if (-not (Test-Path $wamrc)) {
    Write-Error "wamrc not found at $wamrc. Run setup-windows.ps1 first to build wamrc."
    exit 1
}

New-Item -ItemType Directory -Force -Path "$RootDir/plugin/resources" | Out-Null
& $wamrc --opt-level=3 `
    -o "$RootDir/plugin/resources/webvst_dsp.aot" `
    "_build/wasm/debug/build/src/src.wasm"

Write-Host "=== DSP build complete ==="
