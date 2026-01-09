# إعداد SSL لـ Subdomains - API و Socket

## الخطوات المطلوبة

### 1. إضافة A Records في DNS

في لوحة تحكم DNS، أضف A Records التالية:

#### API Domain:

```
Type: A
Name: api
Value: 72.62.157.251
TTL: 3600
```

#### Socket Domain:

```
Type: A
Name: socket
Value: 72.62.157.251
TTL: 3600
```

### 2. انتظار DNS Propagation

انتظر **5-30 دقيقة** حتى يتم انتشار DNS.

### 3. التحقق من DNS

```bash
# على السيرفر أو من أي مكان
dig api.qmenussy.com +short
# يجب أن يظهر: 72.62.157.251

dig socket.qmenussy.com +short
# يجب أن يظهر: 72.62.157.251
```

### 4. تشغيل Script توليد الشهادات

```bash
cd /opt/qmenus/qmenus-backend

# جعل script قابلاً للتنفيذ
chmod +x nginx/init-letsencrypt.sh

# تشغيل الإعداد (يعمل تلقائياً بدون أي إدخال)
./nginx/init-letsencrypt.sh
```

**ملاحظة:** Script سيقوم تلقائياً بـ:

- ✅ توليد شهادة واحدة لـ domainين (`api.qmenussy.com` و `socket.qmenussy.com`)
- ✅ Email: emonate8@gmail.com (مضبوط مسبقاً)
- ✅ بدون أي إدخال يدوي
- ✅ التبديل التلقائي إلى SSL config بعد الحصول على الشهادات

### 5. التحقق من النجاح

```bash
# اختبار API
curl https://api.qmenussy.com/health
curl https://api.qmenussy.com/api/public/health

# اختبار Socket (سيظهر connection أو socket info)
curl https://socket.qmenussy.com
```

## الروابط النهائية

بعد توليد الشهادات بنجاح:

```
📡 API:    https://api.qmenussy.com
🔌 Socket: https://socket.qmenussy.com
```

## إعدادات Frontend

في `frontend/.env.local` أو `.env.production`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.qmenussy.com

# Socket.IO Configuration
NEXT_PUBLIC_SOCKET_URL=https://socket.qmenussy.com

# Disable proxy if using direct URLs
NEXT_PUBLIC_PROXY_API=false
```

## استكشاف الأخطاء

### الخطأ: "Failed to obtain certificate"

**التحقق من:**

1. A Records موجودة في DNS:

   ```bash
   dig api.qmenussy.com +short
   dig socket.qmenussy.com +short
   ```

2. DNS propagation اكتمل (انتظر 30 دقيقة)

3. Backend يعمل:

   ```bash
   docker compose ps backend
   docker compose logs backend
   ```

4. Nginx يعمل:
   ```bash
   docker compose ps nginx
   docker compose logs nginx
   ```

### الخطأ: "nginx: [emerg] host not found in upstream"

**الحل:**

```bash
# تأكد من أن backend يعمل أولاً
docker compose up -d backend
sleep 10

# ثم أعد تشغيل nginx
docker compose restart nginx
```

### الخطأ: "Unable to find deploy-hook command docker"

**تم إصلاحه!** ✅ تم إزالة deploy-hook من certbot service.

## التجديد التلقائي

✅ **مضبوط تلقائياً!**

- Certbot يجدد الشهادات كل 12 ساعة
- Nginx يعيد التحميل كل 6 ساعات
- الشهادات تُجدّد قبل انتهاء الصلاحية بـ 30 يوم

## ملاحظات مهمة

1. **شهادة واحدة لـ domainين**: Let's Encrypt يولد شهادة واحدة (SAN certificate) تحتوي على كلا domainين
2. **نفس IP**: كلا domainين يشيران إلى نفس IP (`72.62.157.251`)
3. **التجديد التلقائي**: لا حاجة لأي تدخل يدوي
4. **Email notifications**: سيتم إرسال إشعارات إلى emonate8@gmail.com
