# PowerShell script to check Docker build context size

Write-Host "📊 Checking Docker build context size..." -ForegroundColor Yellow

# Calculate size of files that would be included in build context
$excludePatterns = @(
    "node_modules",
    "dist",
    ".git",
    "logs",
    "*.log",
    ".env*",
    "*.md",
    "Dockerfile*",
    "docker-compose*.yml"
)

Write-Host "`n📁 Calculating size of files that would be sent to Docker..." -ForegroundColor Cyan

$totalSize = 0
$fileCount = 0

Get-ChildItem -Path . -Recurse -File | Where-Object {
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($_.FullName -like "*\$pattern*" -or $_.Name -like $pattern) {
            $shouldExclude = $true
            break
        }
    }
    return -not $shouldExclude
} | ForEach-Object {
    $totalSize += $_.Length
    $fileCount++
}

$sizeMB = [math]::Round($totalSize / 1MB, 2)
$sizeGB = [math]::Round($totalSize / 1GB, 2)

Write-Host "`n📊 Results:" -ForegroundColor Green
Write-Host "  Files: $fileCount" -ForegroundColor White
Write-Host "  Size: $sizeMB MB ($sizeGB GB)" -ForegroundColor White

if ($sizeMB -gt 100) {
    Write-Host "`n⚠️  Warning: Build context is large (>100MB). Consider:" -ForegroundColor Yellow
    Write-Host "  1. Running: .\clean-docker.ps1" -ForegroundColor Cyan
    Write-Host "  2. Checking .dockerignore file" -ForegroundColor Cyan
    Write-Host "  3. Removing large files from project" -ForegroundColor Cyan
} else {
    Write-Host "`n✅ Build context size is reasonable" -ForegroundColor Green
}

