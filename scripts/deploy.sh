#!/bin/bash

# سكريبت نشر المشروع على VPS
# الاستخدام: ./scripts/deploy.sh

set -e  # إيقاف عند حدوث خطأ

echo "🚀 بدء عملية النشر..."

# الألوان للرسائل
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js غير مثبت. يرجى تثبيته أولاً.${NC}"
    exit 1
fi

# التحقق من وجود PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 غير مثبت. جاري التثبيت...${NC}"
    npm install -g pm2
fi

# التحقق من وجود ملف .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  ملف .env غير موجود. جاري نسخه من env.example...${NC}"
    if [ -f env.example ]; then
        cp env.example .env
        echo -e "${YELLOW}⚠️  يرجى تعديل ملف .env قبل المتابعة!${NC}"
        exit 1
    else
        echo -e "${RED}❌ ملف env.example غير موجود!${NC}"
        exit 1
    fi
fi

# الانتقال إلى مجلد المشروع
cd "$(dirname "$0")/.."

echo -e "${GREEN}📦 تثبيت التبعيات...${NC}"
npm install --production

echo -e "${GREEN}🔧 توليد Prisma Client...${NC}"
npm run db:generate

echo -e "${GREEN}🗄️  تشغيل Migrations...${NC}"
npm run db:deploy

echo -e "${GREEN}🔨 بناء جميع الخدمات...${NC}"
npm run build:all

echo -e "${GREEN}🛑 إيقاف الخدمات السابقة (إن وجدت)...${NC}"
pm2 delete ecosystem.config.js 2>/dev/null || true

echo -e "${GREEN}🚀 تشغيل جميع الخدمات...${NC}"
npm run start:prod

echo -e "${GREEN}💾 حفظ قائمة PM2...${NC}"
pm2 save

echo -e "${GREEN}✅ تم النشر بنجاح!${NC}"
echo ""
echo "📊 عرض حالة الخدمات: pm2 status"
echo "📋 عرض السجلات: pm2 logs"
echo "🔄 إعادة التشغيل: pm2 restart ecosystem.config.js"

