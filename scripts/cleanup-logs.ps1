# PowerShell script to clean old log files
# This script removes log files older than 30 days and compresses logs older than 7 days

Write-Host "🧹 Starting log cleanup..." -ForegroundColor Yellow

# Define log directories
$logDirs = @(
    ".\api-service\logs",
    ".\socket-service\logs",
    ".\jobs-service\logs"
)

# Days to keep logs (30 days)
$daysToKeep = 30

# Days to compress logs (7 days)
$daysToCompress = 7

foreach ($logDir in $logDirs) {
    if (Test-Path $logDir) {
        Write-Host ""
        Write-Host "📁 Processing: $logDir" -ForegroundColor Cyan
        
        # Count files before cleanup
        $filesBefore = (Get-ChildItem -Path $logDir -Filter "*.log*" -File).Count
        $sizeBefore = (Get-ChildItem -Path $logDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
        $sizeBeforeFormatted = "{0:N2} MB" -f $sizeBefore
        
        Write-Host "   Files before: $filesBefore" -ForegroundColor Gray
        Write-Host "   Size before: $sizeBeforeFormatted" -ForegroundColor Gray
        
        # Compress logs older than 7 days (if not already compressed)
        Write-Host "   📦 Compressing logs older than $daysToCompress days..." -ForegroundColor Gray
        $oldLogs = Get-ChildItem -Path $logDir -Filter "*.log" -File | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-$daysToCompress)
        }
        
        foreach ($logFile in $oldLogs) {
            if (-not (Test-Path "$($logFile.FullName).gz")) {
                try {
                    $content = Get-Content $logFile.FullName -Raw
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $compressed = [System.IO.Compression.GZipStream]::new(
                        [System.IO.File]::Create("$($logFile.FullName).gz"),
                        [System.IO.Compression.CompressionLevel]::Optimal
                    )
                    $compressed.Write($bytes, 0, $bytes.Length)
                    $compressed.Close()
                    Remove-Item $logFile.FullName
                } catch {
                    Write-Host "   ⚠️  Failed to compress $($logFile.Name): $_" -ForegroundColor Yellow
                }
            }
        }
        
        # Remove compressed logs older than 30 days
        Write-Host "   🗑️  Removing logs older than $daysToKeep days..." -ForegroundColor Gray
        Get-ChildItem -Path $logDir -Filter "*.log.gz" -File | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-$daysToKeep)
        } | Remove-Item -Force
        
        # Remove uncompressed logs older than 30 days (shouldn't happen if compression works)
        Get-ChildItem -Path $logDir -Filter "*.log" -File | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-$daysToKeep)
        } | Remove-Item -Force
        
        # Count files after cleanup
        $filesAfter = (Get-ChildItem -Path $logDir -Filter "*.log*" -File).Count
        $sizeAfter = (Get-ChildItem -Path $logDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
        $sizeAfterFormatted = "{0:N2} MB" -f $sizeAfter
        
        Write-Host "   Files after: $filesAfter" -ForegroundColor Gray
        Write-Host "   Size after: $sizeAfterFormatted" -ForegroundColor Gray
        
        # Calculate space saved
        if ($filesBefore -gt $filesAfter) {
            $filesRemoved = $filesBefore - $filesAfter
            Write-Host "   ✅ Removed $filesRemoved old log file(s)" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  Directory not found: $logDir" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Log cleanup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 To automate this on Windows, create a scheduled task:" -ForegroundColor Yellow
Write-Host "   Run daily at 2 AM: powershell.exe -File `"$PSScriptRoot\cleanup-logs.ps1`"" -ForegroundColor Cyan
