# إعداد SSL مباشرة من السيرفر (بدون Docker)

## المميزات

✅ **أسرع** - لا حاجة لبدء Docker container  
✅ **أكثر وضوحاً** - يمكنك رؤية التقدم مباشرة  
✅ **أسهل في التشخيص** - سجلات مباشرة على السيرفر

## المتطلبات

1. **certbot مثبت على السيرفر:**

   ```bash
   apt-get update
   apt-get install -y certbot
   ```

2. **DNS مضبوط:**

   - `api.qmenussy.com` → `72.62.157.251`
   - `socket.qmenussy.com` → `72.62.157.251`

3. **Nginx يعمل على Docker:**
   - يجب أن يكون nginx container يعمل
   - Webroot path متاح: `nginx/certbot/www`

## الاستخدام

### 1. التأكد من تثبيت certbot

```bash
# تحقق من تثبيت certbot
which certbot
certbot --version

# إذا لم يكن مثبتاً
apt-get update
apt-get install -y certbot
```

### 2. تشغيل Script

```bash
cd /opt/qmenus/qmenus-backend

# جعل script قابلاً للتنفيذ
chmod +x nginx/init-letsencrypt-server.sh

# تشغيل
./nginx/init-letsencrypt-server.sh
```

**الفرق عن Docker version:**

- ✅ يعمل مباشرة من السيرفر (أسرع)
- ✅ يمكنك رؤية التقدم خطوة بخطوة
- ✅ السجلات مباشرة في `nginx/certbot/logs/`

## التجديد التلقائي

### Option 1: استخدام Cron Job

```bash
# فتح crontab
crontab -e

# إضافة السطر التالي (يجدد كل يوم الساعة 3 صباحاً)
0 3 * * * certbot renew --quiet --config-dir /opt/qmenus/qmenus-backend/nginx/certbot/conf --work-dir /opt/qmenus/qmenus-backend/nginx/certbot/work --logs-dir /opt/qmenus/qmenus-backend/nginx/certbot/logs && docker compose -f /opt/qmenus/qmenus-backend/docker-compose.yml exec nginx nginx -s reload

# أو استخدام script
0 3 * * * /opt/qmenus/qmenus-backend/nginx/renew-ssl.sh
```

### Option 2: استخدام Certbot service (الدائم)

يمكنك إيقاف certbot container في docker-compose.yml واستخدام systemd service بدلاً منه.

## الملفات

- `nginx/init-letsencrypt-server.sh` - Script التهيئة (يعمل من السيرفر)
- `nginx/certbot/conf/` - شهادات SSL
- `nginx/certbot/logs/` - سجلات certbot
- `nginx/certbot/work/` - ملفات عمل certbot

## استكشاف الأخطاء

### الخطأ: "certbot: command not found"

```bash
apt-get update
apt-get install -y certbot
```

### الخطأ: "Failed to obtain certificate"

```bash
# عرض السجلات
cat nginx/certbot/logs/letsencrypt.log

# التحقق من HTTP challenge
curl http://api.qmenussy.com/.well-known/acme-challenge/test

# التحقق من DNS
dig api.qmenussy.com +short
dig socket.qmenussy.com +short
```

### التحقق من الشهادات

```bash
# عرض معلومات الشهادات
certbot certificates --config-dir nginx/certbot/conf

# التحقق من تاريخ الانتهاء
openssl x509 -in nginx/certbot/conf/live/api.qmenussy.com/fullchain.pem -noout -dates
```

## التجديد اليدوي

```bash
cd /opt/qmenus/qmenus-backend

# تجديد الشهادات
certbot renew \
  --config-dir nginx/certbot/conf \
  --work-dir nginx/certbot/work \
  --logs-dir nginx/certbot/logs \
  --verbose

# إعادة تحميل nginx
docker compose exec nginx nginx -s reload
```

## ملاحظات

1. **الشهادات محفوظة في:** `nginx/certbot/conf/live/api.qmenussy.com/`
2. **Docker volume يربط هذا المجلد** - لا حاجة لتغيير docker-compose.yml
3. **التجديد:** يمكن استخدام cron job أو certbot service الدائم
