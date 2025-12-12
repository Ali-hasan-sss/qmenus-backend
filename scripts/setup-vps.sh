#!/bin/bash

# سكريبت إعداد VPS للمشروع
# الاستخدام: ./scripts/setup-vps.sh
# ملاحظة: يجب تشغيله كـ root أو sudo

set -e

echo "🔧 بدء إعداد VPS..."

# الألوان
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# التحقق من صلاحيات root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ يرجى تشغيل السكريبت كـ root أو sudo${NC}"
    exit 1
fi

# تحديث النظام
echo -e "${BLUE}📦 تحديث النظام...${NC}"
if command -v apt &> /dev/null; then
    apt update && apt upgrade -y
elif command -v yum &> /dev/null; then
    yum update -y
else
    echo -e "${YELLOW}⚠️  لم يتم العثور على مدير حزم معروف${NC}"
fi

# تثبيت Node.js
if ! command -v node &> /dev/null; then
    echo -e "${BLUE}📦 تثبيت Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    echo -e "${GREEN}✅ Node.js مثبت بالفعل: $(node --version)${NC}"
fi

# تثبيت PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${BLUE}📦 تثبيت PM2...${NC}"
    npm install -g pm2
    pm2 startup
    echo -e "${YELLOW}⚠️  اتبع التعليمات التي تظهر أعلاه لإعداد PM2 startup${NC}"
else
    echo -e "${GREEN}✅ PM2 مثبت بالفعل${NC}"
fi

# تثبيت PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${BLUE}📦 تثبيت PostgreSQL...${NC}"
    apt install postgresql postgresql-contrib -y
    systemctl start postgresql
    systemctl enable postgresql
    echo -e "${GREEN}✅ تم تثبيت PostgreSQL${NC}"
    echo -e "${YELLOW}⚠️  يرجى إعداد قاعدة البيانات يدوياً:${NC}"
    echo "   sudo -u postgres psql"
    echo "   CREATE DATABASE mymenus;"
    echo "   CREATE USER mymenus_user WITH PASSWORD 'your_password';"
    echo "   GRANT ALL PRIVILEGES ON DATABASE mymenus TO mymenus_user;"
else
    echo -e "${GREEN}✅ PostgreSQL مثبت بالفعل${NC}"
fi

# تثبيت Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${BLUE}📦 تثبيت Nginx...${NC}"
    apt install nginx -y
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✅ تم تثبيت Nginx${NC}"
else
    echo -e "${GREEN}✅ Nginx مثبت بالفعل${NC}"
fi

# إعداد جدار الحماية
echo -e "${BLUE}🔥 إعداد جدار الحماية...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${YELLOW}⚠️  سيتم تفعيل UFW. تأكد من أن SSH يعمل قبل المتابعة.${NC}"
    read -p "هل تريد تفعيل UFW الآن؟ (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ufw --force enable
        echo -e "${GREEN}✅ تم تفعيل UFW${NC}"
    fi
fi

echo -e "${GREEN}✅ تم إعداد VPS بنجاح!${NC}"
echo ""
echo "الخطوات التالية:"
echo "1. استنساخ المشروع أو رفعه إلى السيرفر"
echo "2. إعداد ملف .env"
echo "3. تشغيل: npm run build:all"
echo "4. تشغيل: npm run start:prod"

