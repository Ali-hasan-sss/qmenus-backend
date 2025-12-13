# 🐳 Docker Setup - ملخص سريع

## ✨ الميزات الجديدة

### التهيئة التلقائية لقاعدة البيانات

عند أول تشغيل للـ container، سيتم تلقائياً:

1. ✅ **تشغيل Migrations** - إنشاء جميع الجداول
2. ✅ **إنشاء Admin User** - حساب مسؤول جاهز للاستخدام
3. ✅ **إنشاء جميع الخطط** - Free, Basic, Premium, Enterprise

### معلومات Admin الافتراضية

```
📧 Email: admin@gmail.com
🔐 Password: admin123
```

⚠️ **مهم:** يُنصح بشدة بتغيير كلمة المرور بعد أول تسجيل دخول!

### الخطط المُنشأة تلقائياً

- **Free Trial** - خطة مجانية (1 فئة، 5 أصناف، 5 طاولات)
- **Basic Plan** - خطة أساسية (20 فئة، 30 صنف، 30 طاولة)
- **Premium Plan** - خطة مميزة (30 فئة، 30 صنف، 50 طاولة، تخصيص الثيم)
- **Enterprise Plan** - خطة مؤسسية (غير محدود + تخصيص الثيم)

---

## 🚀 التشغيل السريع

```bash
# 1. إعداد ملف .env
cp env.example .env

# 2. بناء وتشغيل
make build
make up

# 3. انتظر قليلاً... سيتم تلقائياً:
#    - تشغيل migrations
#    - إنشاء admin user
#    - إنشاء جميع الخطط

# 4. عرض السجلات لرؤية التقدم
make logs
```

---

## ⚙️ التحكم في التهيئة التلقائية

### تفعيل التهيئة التلقائية (افتراضي)

في ملف `.env`:

```env
RUN_DB_INIT=true
```

أو في `docker-compose.yml`:

```yaml
environment:
  RUN_DB_INIT: "true"
```

### تعطيل التهيئة التلقائية

إذا كنت لا تريد تشغيل seeding تلقائياً:

```env
RUN_DB_INIT=false
```

ثم يمكنك تشغيلها يدوياً:

```bash
make init-db
# أو
docker-compose exec backend npm run db:init
```

---

## 📋 الأوامر المفيدة

```bash
# تهيئة قاعدة البيانات يدوياً
make init-db

# تشغيل migrations فقط
make migrate

# تشغيل seeding فقط
make seed

# عرض حالة PM2
make status

# عرض السجلات
make logs
```

---

## 🔍 التحقق من التهيئة

بعد التشغيل، يمكنك التحقق من:

1. **Admin User:**

   ```bash
   docker-compose exec backend node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findFirst({where: {role: 'ADMIN'}}).then(u => console.log('Admin:', u?.email)).finally(() => prisma.\$disconnect())"
   ```

2. **الخطط:**
   ```bash
   docker-compose exec backend node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.plan.findMany().then(plans => console.log('Plans:', plans.map(p => p.name))).finally(() => prisma.\$disconnect())"
   ```

---

## 📚 للمزيد من التفاصيل

- `DOCKER.md` - دليل شامل
- `DOCKER_QUICK_START.md` - دليل سريع
