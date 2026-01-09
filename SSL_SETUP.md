# دليل إعداد SSL التلقائي مع Certbot

## نظرة عامة

تم إعداد Certbot لتوليد وتجديد شهادات SSL من Let's Encrypt تلقائياً بدون تدخل يدوي.

## المتطلبات

1. Domain يجب أن يشير إلى عنوان IP السيرفر
2. المنفذ 80 و 443 مفتوحان
3. Email: emonate8@gmail.com (يستخدم لإشعارات Let's Encrypt)

## الإعداد الأولي

### الخطوة 1: التأكد من أن Domain يشير إلى السيرفر

```bash
# على جهازك، تحقق من أن api.qmenussy.com يشير إلى IP السيرفر
nslookup api.qmenussy.com
# أو
dig api.qmenussy.com
```

يجب أن ترى عنوان IP السيرفر.

### الخطوة 2: تشغيل Script التهيئة

```bash
cd /opt/qmenus/qmenus-backend

# جعل script قابلاً للتنفيذ
chmod +x nginx/init-letsencrypt.sh
chmod +x scripts/setup-ssl-auto.sh

# تشغيل الإعداد التلقائي
./scripts/setup-ssl-auto.sh
# أو مباشرة:
./nginx/init-letsencrypt.sh
```

**ملاحظة:** Script يعمل بشكل تلقائي تماماً بدون أي إدخال يدوي.

## ما يقوم به Script

1. ✅ تحميل معاملات TLS الموصى بها
2. ✅ التحقق من وجود شهادات سابقة
3. ✅ بدء خدمات Nginx
4. ✅ طلب شهادة SSL من Let's Encrypt
5. ✅ تكوين Nginx لاستخدام الشهادات
6. ✅ إعادة تحميل Nginx

## التجديد التلقائي

تم إعداد Certbot في `docker-compose.yml` لتجديد الشهادات تلقائياً:

- **التجديد**: مرتين يومياً (كل 12 ساعة)
- **إعادة تحميل Nginx**: تلقائياً بعد كل تجديد
- **الإشعارات**: يتم إرسالها إلى emonate8@gmail.com

```yaml
certbot:
  entrypoint: '/bin/sh -c ''trap exit TERM; while :; do certbot renew --quiet --deploy-hook "docker exec qmenus-nginx nginx -s reload"; sleep 12h & wait $${!}; done;'''
```

## التحقق من الشهادات

```bash
# عرض معلومات الشهادة
docker compose exec certbot certbot certificates

# التحقق من تاريخ انتهاء الشهادة
openssl x509 -in nginx/certbot/conf/live/api.qmenussy.com/fullchain.pem -noout -dates

# اختبار التجديد (لا يجدّد فعلياً)
docker compose exec certbot certbot renew --dry-run
```

## استكشاف الأخطاء

### الخطأ: "Failed to obtain certificate"

**التحقق من:**

1. Domain يشير إلى IP السيرفر:

   ```bash
   dig api.qmenussy.com +short
   ```

2. المنفذ 80 مفتوح:

   ```bash
   curl http://api.qmenussy.com/.well-known/acme-challenge/test
   ```

3. Nginx يعمل:

   ```bash
   docker compose ps nginx
   docker compose logs nginx
   ```

4. Certbot logs:
   ```bash
   docker compose logs certbot
   ```

### الخطأ: "Address already in use"

**الحل:**

```bash
# إيقاف أي خدمة تستخدم المنفذ 80 أو 443
sudo netstat -tulpn | grep ':80\|:443'
# أو
sudo lsof -i :80 -i :443
```

### إعادة توليد الشهادة

```bash
# حذف الشهادات القديمة
rm -rf nginx/certbot/conf/live/api.qmenussy.com
rm -rf nginx/certbot/conf/archive/api.qmenussy.com
rm -rf nginx/certbot/conf/renewal/api.qmenussy.com.conf

# إعادة التشغيل
./nginx/init-letsencrypt.sh
```

## الملفات المهمة

- `nginx/init-letsencrypt.sh` - Script التهيئة الأولي
- `nginx/nginx-init.conf` - تكوين Nginx للتهيئة (يدعم HTTP challenge)
- `nginx/nginx-certs.conf` - تكوين Nginx النهائي (يدعم HTTPS)
- `nginx/certbot/conf/` - مجلد شهادات SSL
- `docker-compose.yml` - إعدادات Certbot service

## الأمان

✅ الشهادات تُجدّد تلقائياً قبل انتهاء صلاحيتها بـ 30 يوم
✅ Nginx يُعاد تحميله تلقائياً بعد كل تجديد
✅ Email notifications لإشعارات Let's Encrypt

## اختبار Production vs Staging

للتجربة بدون استهلاك حد Let's Encrypt:

```bash
# في nginx/init-letsencrypt.sh، غيّر:
staging=1  # بدلاً من 0
```

الشهادات من staging لن تكون موثوقة من المتصفحات، لكنها مفيدة للاختبار.

## مراقبة التجديد

```bash
# عرض سجلات Certbot
docker compose logs -f certbot

# التحقق من حالة Certbot
docker compose ps certbot
```

## ملاحظات مهمة

- ⚠️ Let's Encrypt لديه حد 5 شهادات لكل domain في الأسبوع
- ⚠️ لا تستخدم `--force-renewal` إلا عند الحاجة
- ✅ Script التهيئة يتحقق تلقائياً من وجود شهادات قبل الطلب
- ✅ التجديد التلقائي يعمل في الخلفية بشكل مستمر
