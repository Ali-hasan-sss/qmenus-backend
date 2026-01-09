# دليل إعداد GitHub Actions للنشر التلقائي

## نظرة عامة

تم إعداد GitHub Actions workflow لنشر Backend تلقائياً إلى السيرفر عند Push إلى branch `main` أو `master`.

## الخطوات المطلوبة

### 1. إعداد GitHub Secrets

1. اذهب إلى GitHub Repository
2. Settings → Secrets and variables → Actions
3. اضغط "New repository secret"
4. أضف الـ secrets التالية:

   ⚠️ **ملاحظة**: سيتم استخدام كلمة المرور للاتصال بالسيرفر. تأكد من استخدام كلمة مرور قوية.

#### `SERVER_PASSWORD`

- **القيمة**: كلمة مرور المستخدم للاتصال بالسيرفر
- **مثال**: `MySecurePassword123!`
- ⚠️ **هام**: لا تشارك كلمة المرور أبداً. استخدم GitHub Secrets فقط.

#### `SERVER_HOST`

- **القيمة**: عنوان IP أو domain للسيرفر
- **مثال**: `123.45.67.89` أو `srv1258700.example.com`

#### `SERVER_USER`

- **القيمة**: اسم المستخدم للاتصال بالسيرفر
- **مثال**: `root` أو `ubuntu`

#### `SERVER_PATH`

- **القيمة**: المسار الكامل لمجلد المشروع على السيرفر
- **مثال**: `/opt/qmenus/qmenus-backend`

### 3. التأكد من إعداد Git على السيرفر

```bash
# على السيرفر
cd /opt/qmenus/qmenus-backend

# إذا كان المجلد موجوداً بالفعل
git remote -v  # تحقق من الـ remote

# إذا لم يكن موجوداً، استنسخ المشروع
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git qmenus-backend
cd qmenus-backend
cd backend  # إذا كان المشروع في root
```

### 4. التأكد من تثبيت Docker و Docker Compose

```bash
# على السيرفر
docker --version
docker-compose --version

# إذا لم يكن مثبتاً:
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# أو تثبيت Docker Compose منفصلاً
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 5. إعداد ملف .env على السيرفر

```bash
# على السيرفر
cd /opt/qmenus/qmenus-backend/backend
cp .env.example .env
nano .env  # قم بتعديل القيم المطلوبة
```

## كيفية الاستخدام

### النشر التلقائي

1. ادفع التغييرات إلى branch `main` أو `master`:

   ```bash
   git add .
   git commit -m "Update backend"
   git push origin main
   ```

2. سيتم تشغيل الـ workflow تلقائياً
3. راقب التقدم في: GitHub → Actions → "Deploy Backend to Server"

### النشر اليدوي

1. اذهب إلى GitHub → Actions
2. اختر "Deploy Backend to Server"
3. اضغط "Run workflow"
4. اختر الـ branch
5. اضغط "Run workflow"

## ما يقوم به الـ Workflow

1. ✅ سحب أحدث التغييرات من Git
2. 💾 نسخ احتياطي لملف `.env`
3. 📁 إنشاء المجلدات المطلوبة
4. 🔨 بناء Docker images (بدون cache)
5. 🛑 إيقاف الحاويات الحالية
6. 🚀 تشغيل الحاويات الجديدة
7. ⏳ انتظار الخدمات للبدء (15 ثانية)
8. 🏥 فحص صحة الخدمات
9. 🗄️ تشغيل migrations
10. 🌱 فحص وتشغيل seed إذا لزم الأمر
11. 🧹 تنظيف الصور القديمة

## استكشاف الأخطاء

### الخطأ: "Permission denied (publickey)"

**الحل:**

```bash
# تأكد من إضافة SERVER_PASSWORD بشكل صحيح في GitHub Secrets
# تأكد من أن كلمة المرور صحيحة
# تحقق من أن المستخدم لديه صلاحيات SSH على السيرفر

# اختبار الاتصال يدوياً بكلمة المرور
ssh root@YOUR_SERVER_IP
# أو باستخدام sshpass للتجربة
sshpass -p 'YOUR_PASSWORD' ssh root@YOUR_SERVER_IP
```

### الخطأ: "git: command not found"

**الحل:**

```bash
sudo apt-get install git
```

### الخطأ: "docker-compose: command not found"

**الحل:**

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### الخطأ: "Cannot connect to Docker daemon"

**الحل:**

```bash
# إضافة المستخدم إلى مجموعة docker
sudo usermod -aG docker $USER

# أو استخدام sudo
sudo docker-compose up -d
```

### فحص السجلات

```bash
# على السيرفر
cd /opt/qmenus/qmenus-backend/backend
docker-compose logs -f

# أو لخدمة محددة
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f nginx
```

### فحص حالة الخدمات

```bash
# على السيرفر
cd /opt/qmenus/qmenus-backend/backend
docker-compose ps
docker-compose top
```

## الأمان

⚠️ **مهم جداً:**

1. **لا تشارك `SERVER_PASSWORD` أبداً** - استخدم GitHub Secrets فقط
2. **استخدم كلمة مرور قوية** - على الأقل 12 حرفاً مع أحرف كبيرة وصغيرة وأرقام ورموز
3. **راجع الصلاحيات بانتظام** - تأكد من أن المستخدم لديه فقط الصلاحيات المطلوبة
4. **استخدم مستخدم محدود الصلاحيات** - بدلاً من `root` إذا أمكن
5. **فعّل 2FA على GitHub** - لحماية حسابك
6. **فكر في استخدام SSH Keys** - أكثر أماناً من كلمة المرور (اختياري)

## التخصيص

يمكنك تعديل `.github/workflows/deploy-backend.yml` حسب احتياجاتك:

- تغيير الـ branches التي تطلق النشر
- إضافة خطوات إضافية (مثل إرسال إشعارات)
- تغيير أوقات الانتظار
- إضافة اختبارات قبل النشر
- إضافة rollback في حالة الفشل

## مثال: إضافة إشعارات Slack

```yaml
- name: Send Slack notification
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: "Backend deployment failed!"
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## مثال: إضافة إشعارات Email

```yaml
- name: Send email notification
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: "Deployment Failed"
    body: "Backend deployment failed. Check GitHub Actions for details."
    to: admin@example.com
```

## الدعم

إذا واجهت مشاكل:

1. راجع سجلات GitHub Actions
2. راجع سجلات Docker على السيرفر
3. راجع ملف `TROUBLESHOOTING.md`
4. تحقق من إعدادات GitHub Secrets
