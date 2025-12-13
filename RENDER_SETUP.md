# 🚀 إعداد المشروع على Render (Docker)

## 📋 المتطلبات

1. حساب على [Render](https://render.com)
2. قاعدة بيانات PostgreSQL (يمكن إنشاؤها على Render)
3. خطة Render التي تدعم Docker (Starter أو أعلى)

---

## 🐳 النشر كخدمة Docker واحدة

هذا المشروع يُنشر كخدمة Docker واحدة تحتوي على جميع الخدمات (API, Socket, Jobs) باستخدام PM2.

---

## 🗄️ الخطوة 1: إنشاء قاعدة بيانات PostgreSQL

### 1.1 إنشاء Database على Render

1. اذهب إلى [Render Dashboard](https://dashboard.render.com)
2. اضغط على **"New +"** → **"PostgreSQL"**
3. املأ المعلومات:

   - **Name**: `mymenus-db` (أو أي اسم تفضله)
   - **Database**: `mymenus`
   - **User**: سيتم إنشاؤه تلقائياً
   - **Region**: اختر أقرب منطقة
   - **PostgreSQL Version**: 15 (أو أحدث)
   - **Plan**: اختر الخطة المناسبة

4. اضغط **"Create Database"**

### 1.2 نسخ رابط قاعدة البيانات

بعد إنشاء قاعدة البيانات:

1. اذهب إلى صفحة قاعدة البيانات
2. في قسم **"Connections"** ستجد **"Internal Database URL"**
3. انسخ الرابط (سيبدو هكذا):
   ```
   postgresql://user:password@hostname:5432/database?sslmode=require
   ```

⚠️ **مهم:** استخدم **"Internal Database URL"** للخدمات على Render، و **"External Database URL"** للاتصال من خارج Render.

---

## 🔧 الخطوة 2: إعداد متغيرات البيئة

### 2.1 للخدمة Docker (mymenus-backend)

1. اذهب إلى خدمة **mymenus-backend** في Render Dashboard
2. اضغط على **"Environment"** في القائمة الجانبية
3. أضف المتغيرات التالية:

#### متغيرات مطلوبة:

```env
# Database - ضع رابط قاعدة البيانات من Render
DATABASE_URL=postgresql://user:password@hostname:5432/database?sslmode=require

# JWT Secret - أنشئ مفتاح سري قوي
JWT_SECRET=your-super-secret-jwt-key-change-this

# Frontend URL - رابط الواجهة الأمامية
FRONTEND_URL=https://your-frontend-domain.com

# Email (اختياري)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=QMenus <noreply@yourdomain.com>

# Cloudinary (اختياري)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### متغيرات إضافية (موجودة في render.yaml):

```env
# هذه المتغيرات موجودة بالفعل في render.yaml
WAIT_FOR_POSTGRES=false          # لا تنتظر postgres (قاعدة بيانات خارجية)
RUN_DB_INIT=true                 # تشغيل migrations و seeding تلقائياً
NODE_ENV=production
```

### 2.2 للخدمات الأخرى

كرر نفس الخطوات لـ:

- **qmenus-socket**
- **qmenus-jobs**

لكن هذه الخدمات تحتاج فقط:

- `DATABASE_URL`
- `FRONTEND_URL`
- `WAIT_FOR_POSTGRES=false`
- `RUN_DB_INIT=true` (للخدمة الأولى فقط)

---

## 📝 الخطوة 3: إضافة DATABASE_URL على Render

### الطريقة 1: من Dashboard (موصى به)

1. اذهب إلى خدمة **mymenus-backend** في Render Dashboard
2. اضغط على **"Environment"** في القائمة الجانبية
3. اضغط **"Add Environment Variable"**
4. أدخل:
   - **Key**: `DATABASE_URL`
   - **Value**: الصق **Internal Database URL** من قاعدة البيانات
     ```
     postgresql://user:password@hostname:5432/database?sslmode=require
     ```
5. اضغط **"Save Changes"**

⚠️ **مهم:** استخدم **Internal Database URL** وليس External!

### الطريقة 2: من render.yaml

⚠️ **تحذير:** لا ترفع `DATABASE_URL` مع كلمة المرور إلى Git!

في `render.yaml`، `DATABASE_URL` موجود مع `sync: false`، مما يعني أنك يجب أن تضيفه من Dashboard فقط.

---

## 🚀 الخطوة 4: النشر

### 4.1 ربط Repository

1. في Render Dashboard، اضغط **"New +"** → **"Blueprint"**
2. اختر مستودع Git الخاص بك
3. Render سيكتشف `render.yaml` تلقائياً

### 4.2 التحقق من الإعدادات

تأكد من:

- ✅ `DATABASE_URL` موجود في Environment Variables (أضفه من Dashboard)
- ✅ `WAIT_FOR_POSTGRES=false` موجود (موجود في render.yaml)
- ✅ `RUN_DB_INIT=true` موجود (موجود في render.yaml)
- ✅ `JWT_SECRET` موجود (أضفه من Dashboard)
- ✅ `FRONTEND_URL` موجود (أضفه من Dashboard)

### 4.3 النشر

Render سيقوم تلقائياً بـ:

1. ✅ بناء المشروع
2. ✅ تشغيل migrations
3. ✅ إنشاء admin user وخطط (إذا كان `RUN_DB_INIT=true`)

---

## ✅ التحقق من النشر

### 1. فحص السجلات

في Render Dashboard:

1. اذهب إلى خدمتك
2. اضغط على **"Logs"**
3. ابحث عن:
   ```
   ✅ PostgreSQL is ready!
   ✅ Database initialization completed!
   ✅ All services started successfully!
   ```

### 2. فحص Health Check

Render يفحص `/health` endpoint تلقائياً. تأكد من أن الخدمة تعمل.

### 3. اختبار Admin Login

بعد النشر، جرب تسجيل الدخول:

- 📧 Email: `admin@gmail.com`
- 🔐 Password: `admin123`

---

## 🔐 الأمان

### 1. تغيير كلمة مرور Admin

بعد أول تسجيل دخول، غيّر كلمة المرور فوراً!

### 2. JWT Secret

استخدم مفتاح JWT قوي وعشوائي:

```bash
# إنشاء مفتاح عشوائي
openssl rand -base64 32
```

### 3. Database URL

- ✅ استخدم **Internal Database URL** للخدمات على Render
- ✅ لا ترفع `DATABASE_URL` إلى Git
- ✅ استخدم `sync: false` في render.yaml

---

## 🐛 استكشاف الأخطاء

### المشكلة: "PostgreSQL is unavailable"

**الحل:** تأكد من:

- ✅ `WAIT_FOR_POSTGRES=false` في Environment Variables
- ✅ `DATABASE_URL` صحيح ومضاف

### المشكلة: "Database initialization failed"

**الحل:**

1. تحقق من `DATABASE_URL` صحيح
2. تأكد من أن قاعدة البيانات تعمل
3. تحقق من السجلات في Render

### المشكلة: "Connection refused"

**الحل:**

- استخدم **Internal Database URL** وليس External
- تأكد من أن الخدمة في نفس Region

---

## 📚 ملاحظات مهمة

1. **Internal vs External URL:**

   - **Internal**: للخدمات على Render (أسرع وأكثر أماناً)
   - **External**: للاتصال من خارج Render

2. **RUN_DB_INIT:**

   - اضبطه `true` فقط للخدمة الأولى (API Service)
   - اضبطه `false` للخدمات الأخرى

3. **WAIT_FOR_POSTGRES:**
   - دائماً `false` على Render (قاعدة بيانات خارجية)

---

## 🎉 بعد النشر

بعد النشر الناجح، سيكون لديك:

- ✅ Admin user: `admin@gmail.com` / `admin123`
- ✅ جميع الخطط: Free, Basic, Premium, Enterprise
- ✅ جميع الخدمات تعمل

⚠️ **تذكير:** غيّر كلمة مرور Admin فوراً!
