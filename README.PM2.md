# PM2 Setup Guide

## تشغيل الخدمات باستخدام PM2

### البناء والتشغيل

```bash
# بناء جميع الخدمات ثم تشغيلها
npm start

# أو بشكل منفصل:
npm run build:all
npm start
```

### إعادة التشغيل مع التحديثات

```bash
# إعادة بناء وإعادة تشغيل جميع الخدمات
npm run restart

# أو إعادة تحميل بدون توقف (zero-downtime)
npm run reload
```

### إدارة الخدمات

```bash
# إيقاف جميع الخدمات
npm run stop

# عرض حالة الخدمات
npm run status

# عرض السجلات
npm run logs

# حذف جميع الخدمات من PM2
npm run delete
```

## ملاحظات مهمة

1. **قبل التشغيل**: يتم البناء تلقائياً عبر `prestart` script
2. **بعد التعديلات**: استخدم `npm run restart` أو `npm run reload` لتطبيق التحديثات
3. **الملفات المترجمة**: PM2 يعمل من ملفات `dist/` في كل خدمة
4. **السجلات**: موجودة في `{service}/logs/` لكل خدمة

## استكشاف الأخطاء

إذا واجهت مشكلة 404 أو راوت غير موجود:

1. تأكد من البناء:

   ```bash
   npm run build:all
   ```

2. تحقق من وجود الملفات المترجمة:

   ```bash
   # Windows PowerShell
   Test-Path api-service/dist/api-service/src/routes/restaurant.js

   # Linux/Mac
   ls api-service/dist/api-service/src/routes/restaurant.js
   ```

3. أعد تشغيل الخدمات:

   ```bash
   npm run restart
   ```

4. تحقق من السجلات:
   ```bash
   npm run logs
   ```
