# PowerShell script to clean Docker resources

Write-Host "🧹 Cleaning Docker resources..." -ForegroundColor Yellow

# Stop all containers
Write-Host "`n📦 Stopping all containers..." -ForegroundColor Cyan
$containers = docker ps -aq
if ($containers) {
    docker stop $containers 2>$null
}

# Remove all stopped containers
Write-Host "🗑️ Removing stopped containers..." -ForegroundColor Cyan
docker container prune -f

# Remove all unused images
Write-Host "🖼️ Removing unused images..." -ForegroundColor Cyan
docker image prune -a -f

# Remove all unused volumes
Write-Host "💾 Removing unused volumes..." -ForegroundColor Cyan
docker volume prune -f

# Remove all unused networks
Write-Host "🌐 Removing unused networks..." -ForegroundColor Cyan
docker network prune -f

# Remove build cache
Write-Host "🗂️ Removing build cache..." -ForegroundColor Cyan
docker builder prune -a -f

# Show disk space
Write-Host "`n💿 Docker disk usage:" -ForegroundColor Green
docker system df

Write-Host "`n✅ Cleanup complete!" -ForegroundColor Green
Write-Host "`n💡 Tip: If you still have space issues, run:" -ForegroundColor Yellow
Write-Host "   docker system prune -a --volumes -f" -ForegroundColor Cyan

