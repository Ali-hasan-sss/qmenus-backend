#!/bin/bash

# Script to clean old log files
# This script removes log files older than 30 days and compresses logs older than 7 days

echo "🧹 Starting log cleanup..."

# Define log directories
LOG_DIRS=(
  "./api-service/logs"
  "./socket-service/logs"
  "./jobs-service/logs"
)

# Days to keep logs (30 days)
DAYS_TO_KEEP=30

# Days to compress logs (7 days)
DAYS_TO_COMPRESS=7

for LOG_DIR in "${LOG_DIRS[@]}"; do
  if [ -d "$LOG_DIR" ]; then
    echo ""
    echo "📁 Processing: $LOG_DIR"
    
    # Count files before cleanup
    FILE_COUNT_BEFORE=$(find "$LOG_DIR" -name "*.log*" -type f | wc -l)
    SIZE_BEFORE=$(du -sh "$LOG_DIR" | cut -f1)
    
    echo "   Files before: $FILE_COUNT_BEFORE"
    echo "   Size before: $SIZE_BEFORE"
    
    # Compress logs older than 7 days (if not already compressed)
    echo "   📦 Compressing logs older than $DAYS_TO_COMPRESS days..."
    find "$LOG_DIR" -name "*.log" -type f -mtime +$DAYS_TO_COMPRESS ! -name "*.gz" -exec gzip {} \;
    
    # Remove compressed logs older than 30 days
    echo "   🗑️  Removing logs older than $DAYS_TO_KEEP days..."
    find "$LOG_DIR" -name "*.log.gz" -type f -mtime +$DAYS_TO_KEEP -delete
    
    # Remove uncompressed logs older than 30 days (shouldn't happen if compression works)
    find "$LOG_DIR" -name "*.log" -type f -mtime +$DAYS_TO_KEEP -delete
    
    # Count files after cleanup
    FILE_COUNT_AFTER=$(find "$LOG_DIR" -name "*.log*" -type f | wc -l)
    SIZE_AFTER=$(du -sh "$LOG_DIR" | cut -f1)
    
    echo "   Files after: $FILE_COUNT_AFTER"
    echo "   Size after: $SIZE_AFTER"
    
    # Calculate space saved
    if [ "$FILE_COUNT_BEFORE" -gt "$FILE_COUNT_AFTER" ]; then
      FILES_REMOVED=$((FILE_COUNT_BEFORE - FILE_COUNT_AFTER))
      echo "   ✅ Removed $FILES_REMOVED old log file(s)"
    fi
  else
    echo "   ⚠️  Directory not found: $LOG_DIR"
  fi
done

echo ""
echo "✅ Log cleanup completed!"
echo ""
echo "💡 To automate this, add to crontab:"
echo "   0 2 * * * cd /path/to/backend && ./scripts/cleanup-logs.sh >> ./logs/cleanup.log 2>&1"
