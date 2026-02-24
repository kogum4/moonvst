param(
    [Parameter(Mandatory = $true)]
    [string]$ForkUrl
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

if (-not (Test-Path ".gitmodules")) {
    throw ".gitmodules not found. Run from repository root."
}

git config -f .gitmodules submodule.libs/wamr.url $ForkUrl
git submodule sync -- libs/wamr
git -C libs/wamr remote set-url origin $ForkUrl

Write-Host "Updated WAMR submodule URL to: $ForkUrl"
Write-Host 'Next: git add .gitmodules && git commit -m "chore(wamr): update submodule url"'
