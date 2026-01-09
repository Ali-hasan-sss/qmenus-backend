# إعداد DNS لـ Subdomains

## Domains المطلوبة

1. **API Domain**: `api.qmenussy.com` → `72.62.157.251`
2. **Socket Domain**: `socket.qmenussy.com` → `72.62.157.251`

## إضافة A Records في DNS

### في لوحة تحكم DNS:

#### 1. A Record للـ API:

```
النوع (Type): A
الاسم (Name): api
القيمة (Value/Address): 72.62.157.251
TTL: 3600 (أو الافتراضي)
```

#### 2. A Record للـ Socket:

```
النوع (Type): A
الاسم (Name): socket
القيمة (Value/Address): 72.62.157.251
TTL: 3600 (أو الافتراضي)
```

**ملاحظة:** يمكن استخدام نفس IP لكلا domainين.

## التحقق من DNS

### بعد إضافة A Records:

```bash
# انتظر 5-30 دقيقة لانتشار DNS

# تحقق من API domain
dig api.qmenussy.com +short
# يجب أن يظهر: 72.62.157.251

# تحقق من Socket domain
dig socket.qmenussy.com +short
# يجب أن يظهر: 72.62.157.251
```

### أو استخدام أدوات عبر الإنترنت:

- https://dnschecker.org - أدخل `api.qmenussy.com` و `socket.qmenussy.com`
- https://mxtoolbox.com/DNSLookup.aspx

## بعد إعداد DNS

1. **تحقق من DNS:**

   ```bash
   dig api.qmenussy.com +short
   dig socket.qmenussy.com +short
   ```

2. **تحقق من الوصول:**

   ```bash
   curl http://api.qmenussy.com/health
   curl http://socket.qmenussy.com
   ```

3. **توليد شهادات SSL:**
   ```bash
   cd /opt/qmenus/qmenus-backend
   chmod +x nginx/init-letsencrypt.sh
   ./nginx/init-letsencrypt.sh
   ```

## الروابط النهائية

بعد توليد الشهادات:

```
API:    https://api.qmenussy.com
Socket: https://socket.qmenussy.com
```

## إعدادات Frontend

في `frontend/.env.local` أو `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://api.qmenussy.com
NEXT_PUBLIC_SOCKET_URL=https://socket.qmenussy.com
```
