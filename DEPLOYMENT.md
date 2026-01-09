# دليل النشر - QMenus Backend

هذا الدليل يشرح كيفية نشر مشروع QMenus Backend على السيرفر باستخدام Docker.

## المتطلبات

- Docker و Docker Compose مثبتين على السيرفر
- دومين يشير إلى IP السيرفر (api.qmenussy.com)
- شهادات SSL (Let's Encrypt أو شهادة خاصة)

## الخطوات

### 1. إعداد المتغيرات البيئية

```bash
cd backend
cp .env.example .env
```

**ملاحظة مهمة**: ملف `.env` واحد في `backend/.env` يستخدم لجميع الخدمات (API, Socket, Jobs).

قم بتعديل ملف `.env` وإضافة القيم الصحيحة:

```env
NODE_ENV=production
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
FRONTEND_URL=https://qmenussy.com
RESEND_API_KEY=your-resend-key
```

### 2. إعداد شهادات SSL

#### الطريقة الأولى: Let's Encrypt (مجاني)

```bash
# تثبيت certbot
sudo apt-get update
sudo apt-get install certbot

# إنشاء الشهادات
sudo certbot certonly --standalone -d api.qmenussy.com

# نسخ الشهادات إلى مجلد nginx
sudo mkdir -p backend/nginx/ssl
sudo cp /etc/letsencrypt/live/api.qmenussy.com/fullchain.pem backend/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.qmenussy.com/privkey.pem backend/nginx/ssl/key.pem
sudo chmod 644 backend/nginx/ssl/cert.pem
sudo chmod 600 backend/nginx/ssl/key.pem
```

#### الطريقة الثانية: شهادة خاصة

ضع ملفات الشهادة في:

- `backend/nginx/ssl/cert.pem`
- `backend/nginx/ssl/key.pem`

### 3. بناء وتشغيل الحاويات

```bash
cd backend

# بناء الصور
docker-compose build

# تشغيل الحاويات
docker-compose up -d

# عرض السجلات
docker-compose logs -f
```

### 4. التحقق من الحالة

```bash
# التحقق من حالة الحاويات
docker-compose ps

# التحقق من صحة API
curl https://api.qmenussy.com/health

# عرض سجلات خدمة معينة
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 5. إدارة قاعدة البيانات

```bash
# الدخول إلى قاعدة البيانات
docker-compose exec postgres psql -U postgres -d qmenus

# تشغيل migrations يدوياً (إذا لزم الأمر)
docker-compose exec backend npx prisma migrate deploy --schema /app/shared/prisma/schema.prisma

# Seed قاعدة البيانات (إذا لزم الأمر)
docker-compose exec backend node /app/api-service/scripts/check-and-seed.js
```

### 6. تحديث التطبيق

```bash
# إيقاف الحاويات
docker-compose down

# سحب التحديثات (إذا كنت تستخدم Git)
git pull

# إعادة بناء الصور
docker-compose build --no-cache

# تشغيل الحاويات
docker-compose up -d

# تشغيل migrations
docker-compose exec backend npx prisma migrate deploy --schema /app/shared/prisma/schema.prisma
```

### 7. مراقبة السجلات

```bash
# جميع السجلات
docker-compose logs -f

# سجلات خدمة معينة
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f postgres

# سجلات داخل الحاوية
docker-compose exec backend pm2 logs
```

### 8. النسخ الاحتياطي

#### نسخ احتياطي لقاعدة البيانات

```bash
# إنشاء نسخة احتياطية
docker-compose exec postgres pg_dump -U postgres qmenus > backup_$(date +%Y%m%d_%H%M%S).sql

# استعادة نسخة احتياطية
docker-compose exec -T postgres psql -U postgres qmenus < backup_file.sql
```

## البنية

```
backend/
├── docker-compose.yml      # إعداد Docker Compose
├── Dockerfile              # Dockerfile للخدمات
├── .env                    # المتغيرات البيئية (لا يتم رفعه)
├── .env.example            # مثال للمتغيرات البيئية
├── nginx/
│   ├── Dockerfile          # Dockerfile لـ Nginx
│   ├── nginx.conf          # إعداد Nginx
│   └── ssl/                # شهادات SSL
│       ├── cert.pem
│       └── key.pem
└── [services directories]
```

## الخدمات

1. **Nginx** (Port 80, 443): البروكسي العكسي
2. **Backend** (Internal): يحتوي على:
   - API Service (Port 5000)
   - Socket Service (Port 5001)
   - Jobs Service (Port 5002)
3. **PostgreSQL** (Port 5432): قاعدة البيانات
4. **Redis** (Port 6379): التخزين المؤقت

## الأمان

- تأكد من تغيير جميع كلمات المرور الافتراضية
- استخدم شهادات SSL صالحة
- قم بتحديث JWT_SECRET بقيمة عشوائية قوية
- راجع إعدادات Nginx للأمان
- قم بتفعيل جدار الحماية على السيرفر

## استكشاف الأخطاء

### المشكلة: الحاويات لا تبدأ

```bash
# تحقق من السجلات
docker-compose logs

# تحقق من حالة الحاويات
docker-compose ps

# إعادة بناء من الصفر
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### المشكلة: قاعدة البيانات لا تتصل

```bash
# تحقق من حالة PostgreSQL
docker-compose exec postgres pg_isready -U postgres

# تحقق من DATABASE_URL في .env
docker-compose exec backend env | grep DATABASE_URL
```

### المشكلة: SSL لا يعمل

```bash
# تحقق من وجود الشهادات
ls -la nginx/ssl/

# تحقق من سجلات Nginx
docker-compose logs nginx

# اختبار إعدادات SSL
docker-compose exec nginx nginx -t
```

## الدعم

للحصول على المساعدة، راجع:

- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
