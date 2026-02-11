# Deploy to GitHub Pages
# Copies /dist folder contents to /docs for GitHub Pages deployment

Write-Host "🚀 Deploying Entropic Noise to /docs folder..." -ForegroundColor Cyan

# Create docs folder if it doesn't exist
if (-not (Test-Path "docs")) {
    Write-Host "📁 Creating docs folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "docs" | Out-Null
}

# Clear docs folder contents (but keep the folder)
Write-Host "🧹 Clearing docs folder..." -ForegroundColor Yellow
Get-ChildItem -Path "docs" -Recurse | Remove-Item -Force -Recurse

# Copy all dist contents to docs
Write-Host "📦 Copying dist contents to docs..." -ForegroundColor Yellow
Copy-Item -Path "dist\*" -Destination "docs\" -Recurse -Force

# Exclude files that shouldn't be deployed
Write-Host "🗑️  Removing files not needed for deployment..." -ForegroundColor Yellow
$excludePatterns = @(
    "docs\_oldStuff",
    "docs\tweakpane_test.html",
    "docs\mic-test.html"
)

foreach ($pattern in $excludePatterns) {
    if (Test-Path $pattern) {
        Remove-Item -Path $pattern -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   Removed: $pattern" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Deployment ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Review changes in /docs folder"
Write-Host "   2. Commit and push to GitHub:"
Write-Host "      git add docs/"
Write-Host "      git commit -m ""Deploy to GitHub Pages"""
Write-Host "      git push"
Write-Host ""
Write-Host "   Your site will be live at:" -ForegroundColor Yellow
Write-Host "   https://YOURUSERNAME.github.io/entropic_noise/" -ForegroundColor White
Write-Host ""
