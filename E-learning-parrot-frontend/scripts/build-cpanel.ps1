# Build React app for cPanel and zip dist/ for upload.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/build-cpanel.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env.production")) {
    Write-Error "Missing .env.production - set VITE_API_URL for production API."
}

Write-Host "Building production bundle..."
$env:NODE_OPTIONS = "--max-old-space-size=8192"
npm run build

if (-not (Test-Path "dist/index.html")) {
    Write-Error "Build failed - dist/index.html not found."
}

# Confirm Daily SDK landed in the bundle (bundled at build time - no npm install needed on cPanel).
$dailyHit = Get-ChildItem "dist\assets\*.js" -ErrorAction SilentlyContinue | Select-String -Pattern "daily-js|@daily-co|createCallObject" -List | Select-Object -First 1
if (-not $dailyHit) {
    Write-Warning "Daily SDK markers not found in dist assets - verify @daily-co/daily-js is installed before building."
} else {
    Write-Host "Daily SDK present in bundle: $($dailyHit.Path)"
}

$zipName = "elearning-cpanel-dist.zip"
if (Test-Path $zipName) { Remove-Item $zipName -Force }

Write-Host "Creating $zipName ..."
Compress-Archive -Path (Join-Path (Get-Location) "dist\*") -DestinationPath $zipName -Force

$apiLine = (Get-Content .env.production | Select-String "VITE_API_URL" | Select-Object -First 1).Line
Write-Host "Done. Upload and extract $zipName into your cPanel site doc root."
Write-Host "API URL baked in: $apiLine"
