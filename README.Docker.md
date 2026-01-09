# Docker Setup Guide

هذا الدليل يشرح كيفية تشغيل المشروع بالكامل باستخدام Docker.

## حل مشكلة نفاد مساحة القرص

إذا واجهت خطأ `no space left on device`:

### Windows PowerShell:

```powershell
# تشغيل script التنظيف
.\clean-docker.ps1

# أو يدوياً:
docker system prune -a --volumes -f
```

### Linux/Mac:

```bash
# تشغيل script التنظيف
chmod +x clean-docker.sh
./clean-docker.sh

# أو باستخدام Makefile:
make clean-docker

# أو يدوياً:
docker system prune -a --volumes -f
```

### تنظيف شامل (يحذف كل شيء):

```bash
# احذر: هذا سيحذف كل صور وحاويات Docker!
docker system prune -a --volumes -f

# تنظيف build cache أيضاً
docker builder prune -a -f
```

### فحص حجم build context:

```powershell
# Windows
.\check-build-context.ps1
```

### إذا استمرت المشكلة:

1. **تحقق من مساحة القرص**:

   ```powershell
   Get-PSDrive C | Select-Object Used,Free
   ```

2. **تنظيف شامل لـ Docker**:

   ```powershell
   docker system prune -a --volumes -f
   docker builder prune -a -f
   ```

3. **حذف صور محددة**:
   ```powershell
   docker images
   docker rmi <image-id>
   ```

## المتطلبات

- Docker Desktop (أو Docker Engine + Docker Compose)
- Git

## التشغيل السريع

### 1. إعداد ملف البيئة

انسخ ملف `.env.example` إلى `.env` وقم بتعديل القيم حسب الحاجة:

```bash
cp .env.example .env
```

### 2. تشغيل المشروع (Production)

```bash
docker-compose up -d
```

هذا الأمر سيقوم بـ:

- بناء صورة Docker للخدمات الثلاثة
- تشغيل PostgreSQL
- تشغيل جميع الخدمات (API, Socket, Jobs)
- تنفيذ migrations تلقائياً
- تشغيل seed إذا لزم الأمر

### 3. تشغيل المشروع (Development)

```bash
docker-compose -f docker-compose.dev.yml up
```

هذا سيشغل الخدمات في وضع التطوير مع hot reload.

## الأوامر المفيدة

### عرض Logs

```bash
# جميع الخدمات
docker-compose logs -f

# خدمة محددة
docker-compose logs -f backend
docker-compose logs -f postgres
```

### إيقاف الخدمات

```bash
docker-compose down
```

### إيقاف الخدمات مع حذف البيانات

```bash
docker-compose down -v
```

### إعادة بناء الصور

```bash
docker-compose build --no-cache
docker-compose up -d
```

### الدخول إلى الحاوية

```bash
# الدخول إلى حاوية backend
docker exec -it qmenus-backend sh

# الدخول إلى قاعدة البيانات
docker exec -it qmenus-postgres psql -U postgres -d qmenus
```

### تشغيل Prisma Commands

```bash
# Migration
docker exec -it qmenus-backend sh -c "cd /app/api-service && npm run migrate:deploy"

# Prisma Studio
docker exec -it qmenus-backend sh -c "cd /app/api-service && npx prisma studio --schema ../shared/prisma/schema.prisma"
```

## المنافذ

- **API Service**: `http://localhost:5000`
- **Socket Service**: `http://localhost:5001`
- **Jobs Service**: `http://localhost:5002`
- **PostgreSQL**: `localhost:5432`

## متغيرات البيئة

قم بتعديل ملف `.env` لتغيير الإعدادات:

- `POSTGRES_USER`: اسم مستخدم قاعدة البيانات
- `POSTGRES_PASSWORD`: كلمة مرور قاعدة البيانات
- `POSTGRES_DB`: اسم قاعدة البيانات
- `JWT_SECRET`: مفتاح JWT (يجب تغييره في الإنتاج!)
- `FRONTEND_URL`: رابط الواجهة الأمامية
- `RESEND_API_KEY`: مفتاح API لخدمة البريد الإلكتروني

## استكشاف الأخطاء

### المشكلة: الخدمات لا تبدأ

```bash
# تحقق من حالة الخدمات
docker-compose ps

# تحقق من logs
docker-compose logs
```

### المشكلة: قاعدة البيانات لا تتصل

```bash
# تحقق من حالة PostgreSQL
docker-compose logs postgres

# تحقق من الاتصال
docker exec -it qmenus-postgres pg_isready -U postgres
```

### المشكلة: Migrations لا تعمل

```bash
# تنفيذ migrations يدوياً
docker exec -it qmenus-backend sh -c "cd /app/api-service && npm run migrate:deploy"
```

## Production Deployment

للتشغيل في الإنتاج:

1. قم بتغيير `JWT_SECRET` إلى قيمة آمنة
2. قم بتغيير `POSTGRES_PASSWORD` إلى كلمة مرور قوية
3. قم بإزالة المنافذ المكشوفة أو استخدام reverse proxy
4. استخدم SSL/TLS للاتصالات

```bash
# Build للـ production
docker-compose build

# Run
docker-compose up -d
```

## ملاحظات

- البيانات في PostgreSQL تُحفظ في volume اسمه `postgres_data`
- Logs تُحفظ في مجلدات `logs` داخل كل خدمة
- في وضع Development، يتم استخدام volume mounts للـ hot reload
