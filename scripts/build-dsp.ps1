$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "=== Building MoonBit DSP ==="
Set-Location "$RootDir/build/dsp-active"
moon build --target wasm

Write-Host "=== Copying WASM to UI public ==="
New-Item -ItemType Directory -Force -Path "$RootDir/packages/ui-core/public/wasm" | Out-Null
Copy-Item "_build/wasm/debug/build/src/src.wasm" "$RootDir/packages/ui-core/public/wasm/moonvst_dsp.wasm"

Write-Host "=== AOT Compiling ==="
$wamrcCandidates = @(
    "$RootDir/libs/wamr/wamr-compiler/build/Release/wamrc.exe",
    "$RootDir/libs/wamr/wamr-compiler/build/wamrc.exe"
)
$wamrc = $wamrcCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $wamrc) {
    $searched = $wamrcCandidates -join ", "
    Write-Error "wamrc not found. Checked: $searched. Run setup-windows.ps1 first to build wamrc."
    exit 1
}

New-Item -ItemType Directory -Force -Path "$RootDir/plugin/resources" | Out-Null
$targetArgs = @("--target=x86_64", "--cpu=x86-64")
& $wamrc --opt-level=3 `
    --size-level=1 `
    $targetArgs `
    -o "$RootDir/plugin/resources/moonvst_dsp.aot" `
    "_build/wasm/debug/build/src/src.wasm"

Write-Host "=== DSP build complete ==="
