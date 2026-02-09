# Simple helper to serve this project over HTTP on Windows (PowerShell)
# Tries Python's http.server first, then falls back to npx http-server.

$port = 8000
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path) | Out-Null
Set-Location ..

if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Starting Python http.server on port $port..."
    python -m http.server $port
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    Write-Host "Starting npx http-server on port $port..."
    npx http-server -p $port
} else {
    Write-Host "Neither 'python' nor 'npx' found in PATH."
    Write-Host "Options:"
    Write-Host "  1) Install Python and run: python -m http.server 8000"
    Write-Host "  2) Install Node.js and run: npx http-server -p 8000"
    Write-Host "  3) Run via npm script: npm run start (uses npx) or npm run start:python"
}
