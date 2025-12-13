# 🐳 دليل سريع لـ Docker

## البدء السريع

```bash
# 1. إعداد ملف .env
cp env.example .env
# عدّل القيم المطلوبة في .env

# 2. بناء وتشغيل
make build && make up

# 3. سيتم تلقائياً:
#    ✅ تشغيل migrations
#    ✅ إنشاء admin user: admin@gmail.com / admin123
#    ✅ إنشاء جميع الخطط (Free, Basic, Premium, Enterprise)

# 4. عرض السجلات
make logs
```

**ملاحظة:** عند أول تشغيل، سيتم تلقائياً إنشاء:

- 👤 Admin user: `admin@gmail.com` / `admin123`
- 📋 جميع الخطط: Free Trial, Basic, Premium, Enterprise

## الأوامر الأساسية

```bash
make help      # عرض جميع الأوامر
make build     # بناء الصورة
make up        # تشغيل الخدمات
make down      # إيقاف الخدمات
make logs      # عرض السجلات
make ps        # عرض الحالة
make migrate   # تشغيل migrations
make shell     # فتح shell
make status    # حالة PM2
```

## أو باستخدام npm

```bash
npm run docker:build    # بناء
npm run docker:up        # تشغيل
npm run docker:down      # إيقاف
npm run docker:logs      # سجلات
npm run docker:ps        # الحالة
```

## المنافذ

- API: http://localhost:5000
- Socket: http://localhost:5001
- Jobs: http://localhost:5002
- PostgreSQL: localhost:5432

## استكشاف الأخطاء

```bash
# فحص السجلات
make logs

# فحص الحالة
make ps
make status

# فتح shell للتحقق
make shell
```

للمزيد من التفاصيل، راجع `DOCKER.md`
