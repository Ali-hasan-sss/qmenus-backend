# التحقق من إعدادات DNS

## ⚠️ مهم جداً: الفرق بين Sub-Nameserver و A Record

من الصورة التي أرسلتها، أرى أنك أنشأت **Sub-Nameserver** (خادم أسماء فرعي)، لكن هذا **غير كافي** لتوليد شهادات SSL.

### ما تحتاج إليه:

1. ✅ **Sub-Nameserver** (موجود) - `api.qmenussy.com` → `72.62.157.251`
2. ✅ **A Record** (مطلوب) - سجل DNS عادي من نوع A

## كيف تضيف A Record

في لوحة تحكم DNS الخاصة بك، ابحث عن قسم **"DNS Records"** أو **"سجلات DNS"** وأضف:

### A Record:

```
النوع (Type): A
الاسم (Name): api
القيمة (Value/Address): 72.62.157.251
TTL: 3600 (أو الافتراضي)
```

أو إذا كان الاسم يجب أن يكون كاملاً:

```
النوع (Type): A
الاسم (Name): api.qmenussy.com
القيمة (Value/Address): 72.62.157.251
TTL: 3600
```

## التحقق من DNS

### من السيرفر:

```bash
cd /opt/qmenus/qmenus-backend

# جعل script قابلاً للتنفيذ
chmod +x check-dns.sh

# تشغيل التحقق
./check-dns.sh
```

### أو يدوياً:

```bash
# تحقق من A record
dig api.qmenussy.com +short

# يجب أن يظهر: 72.62.157.251

# أو
nslookup api.qmenussy.com

# أو
host api.qmenussy.com
```

### من أي مكان آخر:

استخدم أدوات عبر الإنترنت:

- https://dnschecker.org
- https://mxtoolbox.com/DNSLookup.aspx
- https://www.whatsmydns.net

أدخل `api.qmenussy.com` وتحقق من أن النتيجة هي `72.62.157.251`.

## بعد إضافة A Record

1. **انتظر 5-30 دقيقة** حتى يتم انتشار DNS (DNS propagation)

2. **تحقق من DNS:**

   ```bash
   dig api.qmenussy.com +short
   # يجب أن يظهر: 72.62.157.251
   ```

3. **تحقق من الوصول:**

   ```bash
   curl http://api.qmenussy.com/health
   # أو
   curl http://api.qmenussy.com/.well-known/acme-challenge/test
   ```

4. **إذا كان كل شيء يعمل، قم بتوليد الشهادات:**
   ```bash
   cd /opt/qmenus/qmenus-backend
   chmod +x nginx/init-letsencrypt.sh
   ./nginx/init-letsencrypt.sh
   ```

## استكشاف الأخطاء

### الخطأ: "No A record found"

**المشكلة:** لم يتم إضافة A record بعد

**الحل:** أضف A record كما هو موضح أعلاه

### الخطأ: "IP does not match"

**المشكلة:** A record يشير إلى IP خاطئ

**الحل:** تحديث A record ليشير إلى `72.62.157.251`

### الخطأ: "Domain is not reachable"

**التحقق من:**

1. DNS propagation - انتظر 5-30 دقيقة
2. Firewall - تأكد من أن المنفذ 80 مفتوح
3. Nginx - تحقق من `docker compose ps nginx`

### التحقق من Nginx على السيرفر:

```bash
# تحقق من حالة Nginx
docker compose ps nginx

# تحقق من السجلات
docker compose logs nginx

# اختبار من داخل السيرفر
curl http://localhost/health
curl http://localhost/.well-known/acme-challenge/test
```

## ملخص

1. ✅ Sub-Nameserver موجود: `api.qmenussy.com` → `72.62.157.251`
2. ❓ **أضف A Record:** `api` → `72.62.157.251`
3. ⏳ انتظر 5-30 دقيقة لانتشار DNS
4. ✅ تحقق من DNS: `dig api.qmenussy.com +short`
5. ✅ تحقق من الوصول: `curl http://api.qmenussy.com/health`
6. ✅ قم بتوليد الشهادات: `./nginx/init-letsencrypt.sh`

## الفرق بين Sub-Nameserver و A Record

- **Sub-Nameserver (خادم أسماء فرعي):** يُستخدم عندما تريد استخدام nameservers مخصصة لـ subdomain
- **A Record:** سجل DNS أساسي يربط اسم النطاق بعنوان IP - **هذا هو المطلوب لـ Certbot**

Let's Encrypt يحتاج إلى A Record للتحقق من أن Domain يشير إلى السيرفر الصحيح.
