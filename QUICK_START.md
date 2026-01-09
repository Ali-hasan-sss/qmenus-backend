# دليل البدء السريع - QMenus Backend

## للنشر على السيرفر (Production)

### 1. إعداد المتغيرات البيئية

```bash
cd backend
cp .env.example .env
nano .env  # أو استخدم محرر النصوص المفضل
```

**ملاحظة**: ملف `.env` واحد في `backend/.env` يستخدم لجميع الخدمات.

قم بتعديل القيم التالية في `.env`:

- `POSTGRES_PASSWORD` - كلمة مرور قوية لقاعدة البيانات
- `JWT_SECRET` - مفتاح JWT عشوائي قوي
- `FRONTEND_URL` - رابط الفرونت إند (مثال: https://qmenussy.com)
- `RESEND_API_KEY` - مفتاح Resend API (إذا كنت تستخدمه)

### 2. إعداد SSL

#### باستخدام Let's Encrypt (مجاني):

```bash
# تثبيت certbot
sudo apt-get update
sudo apt-get install certbot

# إنشاء الشهادات
sudo certbot certonly --standalone -d api.qmenussy.com

# نسخ الشهادات
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/api.qmenussy.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.qmenussy.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem
```

### 3. النشر

```bash
# بناء الصور
docker-compose build

# تشغيل الخدمات
docker-compose up -d

# عرض السجلات
docker-compose logs -f
```

### 4. التحقق

```bash
# التحقق من الحالة
docker-compose ps

# اختبار API
curl https://api.qmenussy.com/api/public/health
```

## للاختبار المحلي (Local Development)

### 1. إعداد .env للمحلي

```bash
cp .env.example .env
# قم بتعديل FRONTEND_URL إلى http://localhost:3000
```

### 2. استخدام nginx.local.conf (بدون SSL)

```bash
# نسخ ملف nginx المحلي
cp nginx/nginx.local.conf nginx/nginx.conf
```

### 3. تشغيل

```bash
docker-compose up -d
```

### 4. الوصول

- API: http://localhost:8080/api
- Socket.IO: http://localhost:8080/socket.io
- Database: localhost:5432
- Redis: localhost:6379

## الأوامر المفيدة

```bash
# عرض السجلات
docker-compose logs -f

# إعادة تشغيل خدمة
docker-compose restart backend

# إيقاف كل شيء
docker-compose down

# حذف كل شيء (بما في ذلك البيانات)
docker-compose down -v

# الدخول إلى الحاوية
docker-compose exec backend sh

# الدخول إلى قاعدة البيانات
docker-compose exec postgres psql -U postgres qmenus
```

## استكشاف الأخطاء

### المشكلة: Nginx لا يبدأ

```bash
# تحقق من وجود شهادات SSL
ls -la nginx/ssl/

# للاختبار المحلي، استخدم nginx.local.conf
```

### المشكلة: قاعدة البيانات لا تتصل

```bash
# تحقق من DATABASE_URL في .env
# يجب أن يكون: postgresql://postgres:password@postgres:5432/qmenus
```

### المشكلة: الخدمات لا تبدأ

```bash
# عرض السجلات
docker-compose logs

# إعادة بناء من الصفر
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```
