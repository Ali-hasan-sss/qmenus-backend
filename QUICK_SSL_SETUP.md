# إعداد SSL السريع - Certbot التلقائي

## خطوات سريعة

### 1. التأكد من أن Domain يشير إلى السيرفر

```bash
# تحقق من DNS
dig api.qmenussy.com +short
# يجب أن يظهر IP السيرفر
```

### 2. تشغيل Script التهيئة

```bash
cd /opt/qmenus/qmenus-backend

# جعل scripts قابلة للتنفيذ (على Linux/Mac)
chmod +x nginx/init-letsencrypt.sh
chmod +x scripts/setup-ssl-auto.sh

# تشغيل الإعداد (يعمل تلقائياً بدون أي إدخال)
./nginx/init-letsencrypt.sh
```

**ملاحظة:** Script يعمل بشكل تلقائي تماماً:

- ✅ Email: emonate8@gmail.com (مضبوط مسبقاً)
- ✅ Domain: api.qmenussy.com (مضبوط مسبقاً)
- ✅ بدون إدخال يدوي
- ✅ بدون موافقات تفاعلية

### 3. التحقق من النجاح

```bash
# تحقق من وجود الشهادات
ls -la nginx/certbot/conf/live/api.qmenussy.com/

# تحقق من حالة الخدمات
docker compose ps

# اختبار HTTPS
curl https://api.qmenussy.com/health
```

## التجديد التلقائي

✅ **مضبوط تلقائياً!** Certbot service يجدد الشهادات:

- كل 12 ساعة (مرتين يومياً)
- قبل انتهاء الصلاحية بـ 30 يوم
- إعادة تحميل Nginx تلقائياً بعد التجديد

**لا حاجة لإجراء أي شيء** - يعمل في الخلفية!

## استكشاف الأخطاء

### إذا فشل Script:

```bash
# عرض سجلات Certbot
docker compose logs certbot

# التحقق من Nginx
docker compose logs nginx
docker compose exec nginx nginx -t

# التحقق من DNS
dig api.qmenussy.com
```

### إعادة المحاولة:

```bash
# حذف الشهادات القديمة (إن وجدت)
rm -rf nginx/certbot/conf/live/api.qmenussy.com

# إعادة التشغيل
./nginx/init-letsencrypt.sh
```

## الملفات

- `nginx/init-letsencrypt.sh` - Script التهيئة الرئيسي
- `nginx/nginx-certs.conf` - تكوين Nginx (يدعم HTTP و HTTPS)
- `docker-compose.yml` - إعدادات Certbot service
- `SSL_SETUP.md` - دليل تفصيلي كامل

## معلومات إضافية

- 📧 Email: emonate8@gmail.com
- 🌐 Domain: api.qmenussy.com
- 🔄 التجديد: تلقائي كل 12 ساعة
- 📁 الشهادات: `nginx/certbot/conf/live/api.qmenussy.com/`
