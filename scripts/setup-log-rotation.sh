#!/bin/bash

# Script to setup PM2 log rotation
# This script installs and configures pm2-logrotate module

echo "📦 Setting up PM2 log rotation..."

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Please install PM2 first."
    echo "   Run: npm install -g pm2"
    exit 1
fi

# Install pm2-logrotate module
echo "📥 Installing pm2-logrotate module..."
pm2 install pm2-logrotate

# Configure pm2-logrotate
echo "⚙️  Configuring pm2-logrotate..."

# Set max file size to 10MB before rotation
pm2 set pm2-logrotate:max_size 10M

# Keep 7 rotated log files
pm2 set pm2-logrotate:retain 7

# Compress rotated logs
pm2 set pm2-logrotate:compress true

# Date format for rotated files
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss

# Rotate daily at 2 AM
pm2 set pm2-logrotate:rotateInterval "0 2 * * *"

# Worker interval (check every 30 seconds)
pm2 set pm2-logrotate:workerInterval 30

# Save PM2 configuration
pm2 save

echo ""
echo "✅ PM2 log rotation configured successfully!"
echo ""
echo "📊 Current configuration:"
pm2 conf pm2-logrotate
echo ""
echo "💡 Logs will be rotated:"
echo "   - When file size reaches 10MB"
echo "   - Daily at 2:00 AM"
echo "   - Keeping 7 rotated files"
echo "   - Compressed to save space"
echo ""
echo "🧹 To manually clean old logs, run:"
echo "   npm run cleanup-logs"
