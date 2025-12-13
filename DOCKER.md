# 🐳 دليل Docker للمشروع

## نظرة عامة

يحتوي هذا المشروع على إعداد Docker كامل لتشغيل جميع خدمات الباك اند في container واحد باستخدام PM2.

## البنية

- **Dockerfile**: بناء image واحد يحتوي على جميع الخدمات
- **docker-compose.yml**: تشغيل جميع الخدمات مع PostgreSQL و Redis
- **docker-compose.dev.yml**: إعداد للتطوير (قاعدة بيانات فقط)

## المتطلبات

- Docker 20.10+
- Docker Compose 2.0+

---

## 🚀 التشغيل السريع

### الطريقة الأسهل (باستخدام Make)

```bash
# 1. إنشاء ملف .env
cp env.example .env
# عدّل ملف .env بالقيم المطلوبة

# 2. بناء وتشغيل
make build
make up

# 3. سيتم تشغيل Migrations و Seeding تلقائياً!
#    - إنشاء admin user: admin@gmail.com / admin123
#    - إنشاء جميع الخطط (Free, Basic, Premium, Enterprise)

# 4. عرض السجلات
make logs
```

**ملاحظة:** عند أول تشغيل، سيتم تلقائياً:

- ✅ تشغيل migrations
- ✅ إنشاء admin user (admin@gmail.com / admin123)
- ✅ إنشاء جميع الخطط (Free Trial, Basic, Premium, Enterprise)

يمكنك تعطيل هذا السلوك بضبط `RUN_DB_INIT=false` في `.env`

### أو باستخدام npm

```bash
# 1. إنشاء ملف .env
cp env.example .env

# 2. بناء وتشغيل
npm run docker:build
npm run docker:up

# 3. تشغيل Migrations
npm run docker:exec -- npm run db:deploy

# 4. عرض السجلات
npm run docker:logs
```

### أو باستخدام docker-compose مباشرة

```bash
# 1. إنشاء ملف .env
cp env.example .env

# 2. بناء وتشغيل
docker-compose build
docker-compose up -d

# 3. تشغيل Migrations
docker-compose exec backend npm run db:deploy

# 4. عرض السجلات
docker-compose logs -f backend
```

---

## 📋 الأوامر الأساسية

### استخدام npm scripts (موصى به)

```bash
# بناء الصورة
npm run docker:build

# تشغيل الخدمات
npm run docker:up

# إيقاف الخدمات
npm run docker:down

# عرض السجلات
npm run docker:logs

# عرض حالة الخدمات
npm run docker:ps

# إعادة تشغيل
npm run docker:restart

# تنفيذ أمر (مثال: npm run docker:exec -- npm run db:deploy)
npm run docker:exec -- <command>
```

### استخدام Make (أسهل)

```bash
# عرض جميع الأوامر
make help

# بناء الصورة
make build

# تشغيل الخدمات
make up

# إيقاف الخدمات
make down

# عرض السجلات
make logs

# عرض حالة الخدمات
make ps

# تشغيل migrations
make migrate

# فتح shell
make shell

# عرض حالة PM2
make status
```

### استخدام docker-compose مباشرة

```bash
# بناء الصورة
docker-compose build

# تشغيل الخدمات
docker-compose up -d

# إيقاف الخدمات
docker-compose down

# إيقاف مع حذف البيانات
docker-compose down -v

# إعادة بناء وتشغيل
docker-compose up -d --build

# عرض حالة الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f backend

# تنفيذ أوامر داخل Container
docker-compose exec backend npm run db:deploy
docker-compose exec backend pm2 status
docker-compose exec backend pm2 logs
```

---

## 🔧 الإعدادات

### المنافذ (Ports)

- **API Service**: 5000
- **Socket Service**: 5001
- **Jobs Service**: 5002
- **PostgreSQL**: 5432
- **Redis**: 6379

يمكنك تغييرها في ملف `.env`:

```env
API_PORT=5000
SOCKET_PORT=5001
JOBS_PORT=5002
POSTGRES_PORT=5432
REDIS_PORT=6379
```

### متغيرات البيئة

جميع المتغيرات المطلوبة موجودة في `env.example`. انسخها إلى `.env` وعدّلها:

```bash
cp env.example .env
```

المتغيرات المهمة:

```env
# Database
DATABASE_URL=postgresql://mymenus_user:mymenus_password@postgres:5432/mymenus?schema=public
POSTGRES_USER=mymenus_user
POSTGRES_PASSWORD=mymenus_password
POSTGRES_DB=mymenus

# JWT
JWT_SECRET=your-super-secret-jwt-key

# CORS
FRONTEND_URL=http://localhost:3000

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## 🗄️ قاعدة البيانات

### التهيئة التلقائية (Automatic Initialization)

عند أول تشغيل للـ container، سيتم تلقائياً:

1. ✅ تشغيل migrations
2. ✅ إنشاء admin user
3. ✅ إنشاء جميع الخطط

**معلومات Admin:**

- 📧 Email: `admin@gmail.com`
- 🔐 Password: `admin123`
- ⚠️ **يُنصح بتغيير كلمة المرور بعد أول تسجيل دخول!**

**الخطط المُنشأة:**

- Free Trial (مجانية)
- Basic Plan
- Premium Plan
- Enterprise Plan

### تعطيل التهيئة التلقائية

إذا كنت لا تريد تشغيل seeding تلقائياً، اضبط في `.env`:

```env
RUN_DB_INIT=false
```

### تشغيل Migrations يدوياً

```bash
docker-compose exec backend npm run db:deploy
```

### تشغيل Seeding يدوياً

```bash
docker-compose exec backend npm run db:seed
```

### تشغيل التهيئة الكاملة يدوياً

```bash
docker-compose exec backend npm run db:init
```

### الوصول إلى قاعدة البيانات

```bash
# من داخل container
docker-compose exec postgres psql -U mymenus_user -d mymenus

# من خارج container
psql -h localhost -p 5432 -U mymenus_user -d mymenus
```

### نسخ احتياطي

```bash
docker-compose exec postgres pg_dump -U mymenus_user mymenus > backup.sql
```

### استعادة

```bash
docker-compose exec -T postgres psql -U mymenus_user mymenus < backup.sql
```

---

## 🔍 استكشاف الأخطاء

### فحص حالة الخدمات

```bash
# حالة Docker containers
docker-compose ps

# حالة PM2 داخل backend container
docker-compose exec backend pm2 status

# سجلات PM2
docker-compose exec backend pm2 logs
```

### فحص السجلات

```bash
# سجلات جميع الخدمات
docker-compose logs

# سجلات خدمة محددة
docker-compose logs backend
docker-compose logs postgres

# سجلات حية
docker-compose logs -f backend
```

### إعادة تشغيل خدمة

```bash
# إعادة تشغيل backend
docker-compose restart backend

# إعادة تشغيل PM2 داخل container
docker-compose exec backend pm2 restart ecosystem.config.js
```

### فحص الاتصال بقاعدة البيانات

```bash
docker-compose exec backend node -e "require('./shared/config/db').default.\$connect().then(() => console.log('Connected')).catch(e => console.error(e))"
```

---

## 🛠️ التطوير

### للتطوير المحلي (بدون Docker للباك اند)

استخدم `docker-compose.dev.yml` لتشغيل قاعدة البيانات فقط:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

ثم شغّل الخدمات محلياً:

```bash
npm run start:dev
```

### Hot Reload في Docker

لإضافة hot reload، يمكنك تعديل `docker-compose.yml` لإضافة volumes:

```yaml
backend:
  volumes:
    - ./api-service/src:/app/api-service/src
    - ./socket-service/src:/app/socket-service/src
    - ./jobs-service/src:/app/jobs-service/src
```

---

## 📦 بناء Image منفصل

### بناء Image

```bash
docker build -t mymenus-backend:latest .
```

### تشغيل Container

```bash
docker run -d \
  --name mymenus-backend \
  -p 5000:5000 \
  -p 5001:5001 \
  -p 5002:5002 \
  --env-file .env \
  --network mymenus-network \
  mymenus-backend:latest
```

---

## 🔐 الأمان

### 1. كلمات المرور

تأكد من تغيير كلمات المرور الافتراضية في `.env`:

```env
POSTGRES_PASSWORD=strong-password-here
JWT_SECRET=strong-secret-here
```

### 2. متغيرات البيئة الحساسة

لا ترفع ملف `.env` إلى Git. استخدم `.env.example` كقالب.

### 3. الشبكة

جميع الخدمات تعمل على شبكة Docker منفصلة (`mymenus-network`) لعزل أفضل.

---

## 📊 المراقبة

### PM2 Dashboard

```bash
docker-compose exec backend pm2 monit
```

### استخدام الموارد

```bash
docker stats mymenus-backend
```

### Health Checks

جميع الخدمات تحتوي على health checks:

```bash
# API Service
curl http://localhost:5000/health

# Socket Service
curl http://localhost:5001/health

# Jobs Service
curl http://localhost:5002/health
```

---

## 🚢 النشر

### بناء Image للإنتاج

```bash
docker build -t mymenus-backend:production .
```

### Tag للـ Registry

```bash
docker tag mymenus-backend:production your-registry/mymenus-backend:v1.0.0
```

### Push إلى Registry

```bash
docker push your-registry/mymenus-backend:v1.0.0
```

---

## 📝 ملاحظات

1. **البيانات**: بيانات PostgreSQL محفوظة في volume `postgres_data`
2. **السجلات**: سجلات PM2 محفوظة في `./logs` على الـ host
3. **الأداء**: PM2 يدير جميع الخدمات داخل container واحد
4. **المقياس**: يمكنك تشغيل عدة instances من container إذا لزم الأمر

---

## 🆘 الدعم

إذا واجهت مشاكل:

1. تحقق من السجلات: `docker-compose logs -f`
2. تحقق من حالة الخدمات: `docker-compose ps`
3. تحقق من PM2: `docker-compose exec backend pm2 status`
4. تأكد من أن جميع المتغيرات البيئية صحيحة في `.env`
