#!/bin/bash

# Script لإعداد السيرفر من الصفر
# Usage: sudo bash scripts/setup-server.sh

set -e

echo "=========================================="
echo "🚀 إعداد السيرفر من الصفر"
echo "=========================================="
echo

# التحقق من أن المستخدم لديه صلاحيات sudo
if [ "$EUID" -ne 0 ]; then 
  echo "❌ يجب تشغيل هذا السكريبت كـ root أو باستخدام sudo"
  exit 1
fi

# 1. تحديث النظام
echo "📦 تحديث النظام..."
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git build-essential

# 2. فتح البورتات (UFW)
echo "🔥 فتح البورتات..."
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  echo "y" | ufw enable
  echo "✅ Firewall configured"
fi

# 3. تثبيت Node.js 20
echo "📦 تثبيت Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "✅ Node.js already installed: $(node --version)"
fi

# 4. تثبيت PM2
echo "📦 تثبيت PM2..."
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
else
  echo "✅ PM2 already installed: $(pm2 --version)"
fi

# 5. تثبيت PostgreSQL
echo "📦 تثبيت PostgreSQL..."
if ! command -v psql &> /dev/null; then
  apt-get install -y postgresql postgresql-contrib
  systemctl start postgresql
  systemctl enable postgresql
  echo "✅ PostgreSQL installed"
else
  echo "✅ PostgreSQL already installed"
fi

# 6. تثبيت Redis
echo "📦 تثبيت Redis..."
if ! command -v redis-cli &> /dev/null; then
  apt-get install -y redis-server
  systemctl start redis-server
  systemctl enable redis-server
  echo "✅ Redis installed"
else
  echo "✅ Redis already installed"
fi

# 7. تثبيت Nginx
echo "📦 تثبيت Nginx..."
if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx
  systemctl start nginx
  systemctl enable nginx
  echo "✅ Nginx installed"
else
  echo "✅ Nginx already installed"
fi

# 8. تثبيت Certbot
echo "📦 تثبيت Certbot..."
if ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx
  echo "✅ Certbot installed"
else
  echo "✅ Certbot already installed"
fi

echo
echo "=========================================="
echo "✅ تم تثبيت جميع المتطلبات الأساسية!"
echo "=========================================="
echo
echo "الخطوات التالية:"
echo "1. إنشاء قاعدة بيانات PostgreSQL:"
echo "   sudo -u postgres psql"
echo "   CREATE DATABASE qmenus;"
echo "   CREATE USER qmenus_user WITH ENCRYPTED PASSWORD 'your_password';"
echo "   GRANT ALL PRIVILEGES ON DATABASE qmenus TO qmenus_user;"
echo "   \\q"
echo
echo "2. سحب المشروع:"
echo "   cd /opt"
echo "   sudo mkdir -p qmenus"
echo "   sudo chown \$USER:\$USER qmenus"
echo "   cd qmenus"
echo "   git clone YOUR_REPO_URL qmenus-backend"
echo
echo "3. إعداد .env وتشغيل المشروع:"
echo "   cd qmenus-backend/backend"
echo "   cp .env.example .env  # وعدّل القيم"
echo "   ./scripts/deploy.sh"
echo
echo "4. إعداد Nginx و SSL:"
echo "   sudo cp nginx/nginx-init.conf /etc/nginx/sites-available/qmenus-backend"
echo "   sudo ln -s /etc/nginx/sites-available/qmenus-backend /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "   sudo ./nginx/init-letsencrypt-server.sh"
echo
