# GitHub Actions Deployment - Backend

## موقع ملفات GitHub Actions

ملفات GitHub Actions موجودة في `.github/workflows/` في **جذر المشروع** (root repository)، وليس داخل `backend/`.

هذا هو الموقع الصحيح لأن GitHub Actions يبحث عن ملفات workflow في `.github/workflows/` في جذر المستودع فقط.

```
mymenus/                          # جذر المشروع
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml    # ملف workflow للنشر
│       └── README.md
├── backend/                      # مشروع Backend
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── ...
└── frontend/                     # مشروع Frontend (لا يتأثر)
```

## كيف يعمل Workflow

Workflow محدد لـ **backend فقط** من خلال:

1. **Paths Filter**: يعمل فقط عند تغييرات في `backend/**`

   ```yaml
   paths:
     - "backend/**"
   ```

2. **SERVER_PATH**: يجب أن يشير مباشرة إلى مجلد backend على السيرفر
   - مثال: `/opt/qmenus/qmenus-backend`
   - يجب أن يحتوي هذا المسار على `docker-compose.yml`

## الإعداد

### 1. GitHub Secrets

أضف في GitHub Repository → Settings → Secrets and variables → Actions:

- `SERVER_PASSWORD` - كلمة مرور المستخدم على السيرفر
- `SERVER_HOST` - عنوان IP أو domain (مثال: `123.45.67.89`)
- `SERVER_USER` - اسم المستخدم (مثال: `root`)
- `SERVER_PATH` - **مسار backend على السيرفر** (مثال: `/opt/qmenus/qmenus-backend`)

### 2. على السيرفر

```bash
# على السيرفر، يجب أن يكون SERVER_PATH يشير إلى مجلد backend
# الذي يحتوي على docker-compose.yml

cd /opt/qmenus/qmenus-backend
ls -la
# يجب أن ترى:
# - docker-compose.yml
# - Dockerfile
# - .env
# - api-service/
# - socket-service/
# - ...
```

## الاستخدام

### النشر التلقائي

عند إجراء push إلى `backend/`:

```bash
git add backend/
git commit -m "Update backend"
git push origin main
```

سيتم تشغيل workflow تلقائياً.

### النشر اليدوي

1. اذهب إلى GitHub → Actions
2. اختر "Deploy Backend to Server"
3. اضغط "Run workflow"
4. اختر branch
5. اضغط "Run workflow"

## ما يقوم به Workflow

1. ✅ سحب التغييرات من Git (فقط backend/)
2. 💾 نسخ احتياطي لملف `.env`
3. 🔨 بناء Docker images
4. 🛑 إيقاف الحاويات القديمة
5. 🚀 تشغيل الحاويات الجديدة
6. 🗄️ تشغيل migrations
7. 🌱 فحص وتشغيل seed
8. 🧹 تنظيف الصور القديمة

## ملاحظات

- ✅ Workflow يستهدف **backend فقط** - تغييرات frontend لن تطلق النشر
- ✅ الملف موجود في `.github/workflows/` في الجذر (هذا ضروري لـ GitHub Actions)
- ✅ SERVER_PATH يجب أن يشير مباشرة لمجلد backend على السيرفر
- ⚠️ تأكد من أن `SERVER_PATH` يحتوي على `docker-compose.yml`

## استكشاف الأخطاء

### الخطأ: "docker-compose.yml not found"

**السبب**: `SERVER_PATH` لا يشير إلى المجلد الصحيح

**الحل**: تأكد من أن `SERVER_PATH` في GitHub Secrets يشير إلى:

- المجلد الذي يحتوي على `docker-compose.yml`
- على سبيل المثال: `/opt/qmenus/qmenus-backend` وليس `/opt/qmenus`

### الخطأ: "Workflow لا يعمل عند تغييرات frontend"

**هذا متوقع!** ✅ Workflow مصمم ليعمل فقط مع backend.

## المزيد من المعلومات

- راجع `.github/workflows/README.md` للتفاصيل الكاملة
- راجع `DEPLOYMENT_GITHUB_ACTIONS.md` لدليل الإعداد المفصل
