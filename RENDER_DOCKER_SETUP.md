# 🐳 نشر Docker Image على Render

## نظرة عامة

يتم نشر المشروع على Render كخدمة Docker واحدة تحتوي على جميع الخدمات (API, Socket, Jobs) باستخدام PM2.

---

## 📋 المتطلبات

1. حساب على [Render](https://render.com)
2. خطة Render التي تدعم Docker (Starter أو أعلى)
3. قاعدة بيانات PostgreSQL على Render

---

## 🗄️ الخطوة 1: إنشاء قاعدة بيانات PostgreSQL

1. اذهب إلى [Render Dashboard](https://dashboard.render.com)
2. اضغط على **"New +"** → **"PostgreSQL"**
3. املأ المعلومات واختر الخطة المناسبة
4. بعد الإنشاء، انسخ **Internal Database URL**

---

## 🔧 الخطوة 2: إضافة متغيرات البيئة على Render

### 2.1 من Dashboard

1. اذهب إلى خدمة **mymenus-backend** في Render Dashboard
2. اضغط على **"Environment"** في القائمة الجانبية
3. أضف المتغيرات التالية:

#### متغيرات مطلوبة:

```env
# Database - ضع Internal Database URL من Render
DATABASE_URL=postgresql://user:password@hostname:5432/database?sslmode=require

# JWT Secret - أنشئ مفتاح سري قوي
JWT_SECRET=your-super-secret-jwt-key-change-this

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# Email (اختياري)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=QMenus <noreply@yourdomain.com>

# Cloudinary (اختياري)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### متغيرات موجودة في render.yaml:

هذه المتغيرات موجودة بالفعل في `render.yaml`:

- `WAIT_FOR_POSTGRES=false` - لا تنتظر postgres (قاعدة بيانات خارجية)
- `RUN_DB_INIT=true` - تشغيل migrations و seeding تلقائياً
- `NODE_ENV=production`
- جميع المنافذ والإعدادات الأخرى

---

## 🚀 الخطوة 3: النشر

### 3.1 ربط Repository

1. في Render Dashboard، اضغط **"New +"** → **"Blueprint"**
2. اختر مستودع Git الخاص بك
3. Render سيكتشف `render.yaml` تلقائياً
4. سيتم إنشاء خدمة Docker واحدة باسم `mymenus-backend`

### 3.2 إضافة DATABASE_URL

**مهم:** بعد إنشاء الخدمة، يجب إضافة `DATABASE_URL` من Dashboard:

1. اذهب إلى خدمة `mymenus-backend`
2. اضغط **"Environment"**
3. اضغط **"Add Environment Variable"**
4. أدخل:
   - **Key**: `DATABASE_URL`
   - **Value**: الصق **Internal Database URL** من قاعدة البيانات
5. اضغط **"Save Changes"**

### 3.3 النشر التلقائي

Render سيقوم تلقائياً بـ:

1. ✅ بناء Docker image
2. ✅ تشغيل migrations (إذا كان `RUN_DB_INIT=true`)
3. ✅ إنشاء admin user وخطط (إذا كان `RUN_DB_INIT=true`)
4. ✅ تشغيل جميع الخدمات باستخدام PM2

---

## ✅ التحقق من النشر

### 1. فحص السجلات

في Render Dashboard:

1. اذهب إلى خدمة `mymenus-backend`
2. اضغط على **"Logs"**
3. ابحث عن:
   ```
   ✅ All services started successfully!
   ✅ Database initialization completed!
   ```

### 2. معلومات Admin

بعد النشر الناجح:

- 📧 Email: `admin@gmail.com`
- 🔐 Password: `admin123`
- ⚠️ **غيّر كلمة المرور فوراً!**

### 3. Health Check

Render يفحص `/health` endpoint تلقائياً على المنفذ 5000.

---

## 🔍 استكشاف الأخطاء

### المشكلة: "No open ports detected"

**الحل:**

- Render يحتاج إلى منفذ واحد فقط
- تأكد من أن `API_PORT=5000` مضبوط
- Health check يجب أن يكون على `/health`

### المشكلة: "Services are not built"

**الحل:**

- تأكد من أن Dockerfile يبني المشروع بشكل صحيح
- تحقق من السجلات أثناء البناء
- تأكد من أن جميع الملفات المطلوبة موجودة

### المشكلة: "PostgreSQL is unavailable"

**الحل:**

- تأكد من `WAIT_FOR_POSTGRES=false` في Environment Variables
- تأكد من `DATABASE_URL` صحيح ومضاف

### المشكلة: "Database initialization failed"

**الحل:**

- تحقق من `DATABASE_URL` صحيح
- تأكد من أن قاعدة البيانات تعمل
- تحقق من السجلات في Render

---

## 📝 ملاحظات مهمة

1. **خدمة واحدة:** جميع الخدمات (API, Socket, Jobs) تعمل في container واحد
2. **PM2:** يدير جميع الخدمات داخل الـ container
3. **المنافذ:** جميع الخدمات تعمل داخلياً، Render يعرض فقط المنفذ الرئيسي (5000)
4. **DATABASE_URL:** يجب إضافته من Dashboard (لا يرفع إلى Git)
5. **Internal Database URL:** استخدم Internal وليس External للخدمات على Render

---

## 🎉 بعد النشر

بعد النشر الناجح، سيكون لديك:

- ✅ جميع الخدمات تعمل (API, Socket, Jobs)
- ✅ Admin user جاهز: `admin@gmail.com` / `admin123`
- ✅ جميع الخطط: Free, Basic, Premium, Enterprise

⚠️ **تذكير:** غيّر كلمة مرور Admin فوراً!
