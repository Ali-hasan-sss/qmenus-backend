# استكشاف أخطاء Cookies و CORS

## المشكلة الحالية

من الـ console logs:

- `Set-Cookie header from response: undefined`
- `access-control-allow-origin: undefined`
- `access-control-allow-credentials: undefined`

هذا يعني أن **Backend لا يرسل الـ headers** أو أن **Nginx يمنع تمريرها**.

## خطوات التشخيص

### 1. التحقق من Backend Environment Variables

```bash
cd /opt/qmenus/qmenus-backend/backend
cat .env | grep -E "ALLOWED_ORIGINS|FRONTEND_URL|NODE_ENV"
```

**يجب أن يكون:**

```env
NODE_ENV=production
FRONTEND_URL=https://www.qmenussy.com
ALLOWED_ORIGINS=https://www.qmenussy.com,https://qmenussy.com
```

**⚠️ مهم جداً**: يجب أن يحتوي `ALLOWED_ORIGINS` على `https://www.qmenussy.com` (مع www) لأن Frontend على Vercel يستخدم `www.qmenussy.com`.

### 2. التحقق من Backend Logs

```bash
pm2 logs api-service --lines 100 | grep -E "CORS|origin|Login request origin"
```

**يجب أن ترى:**

```
🌐 CORS middleware hit: { origin: 'https://www.qmenussy.com', ... }
🔍 CORS check: { requestOrigin: 'https://www.qmenussy.com', allowedOrigins: [ 'https://www.qmenussy.com', 'https://qmenussy.com' ] }
✅ CORS allowed for origin: https://www.qmenussy.com
🌐 Login request origin: https://www.qmenussy.com
🍪 Login cookie set: { secure: true, sameSite: 'none', ... }
```

### 3. التحقق من Nginx Configuration

```bash
sudo cat /etc/nginx/sites-available/qmenus-backend | grep -A 20 "location /api"
```

**يجب أن يكون:**

```nginx
location /api {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # CRITICAL: Don't hide Set-Cookie
    # Remove any: proxy_hide_header Set-Cookie;

    proxy_buffering off;
}
```

### 4. اختبار Backend مباشرة (تجاوز Nginx)

```bash
# من السيرفر نفسه
curl -v -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Origin: https://www.qmenussy.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# يجب أن ترى في response:
# < Set-Cookie: auth-token=...
# < Access-Control-Allow-Origin: https://www.qmenussy.com
# < Access-Control-Allow-Credentials: true
```

### 5. اختبار عبر Nginx

```bash
curl -v -X POST https://api.qmenussy.com/api/auth/login \
  -H "Origin: https://www.qmenussy.com" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# يجب أن ترى نفس الـ headers
```

## الحلول المحتملة

### الحل 1: تحديث ALLOWED_ORIGINS

```bash
cd /opt/qmenus/qmenus-backend/backend
nano .env

# تأكد من:
ALLOWED_ORIGINS=https://www.qmenussy.com,https://qmenussy.com

# إعادة تشغيل
pm2 restart api-service
```

### الحل 2: إصلاح Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/qmenus-backend

# تأكد من أن location /api لا يحتوي على:
# proxy_hide_header Set-Cookie;

# إعادة تحميل
sudo nginx -t
sudo systemctl reload nginx
```

### الحل 3: التحقق من أن Backend يعمل على Port 5000

```bash
# التحقق من أن الخدمة تعمل
pm2 status

# التحقق من أن Port 5000 مفتوح
ss -tulpn | grep 5000

# يجب أن ترى:
# tcp   LISTEN 0  511  *:5000  *:*  users:(("node",pid=...))
```

### الحل 4: إعادة بناء Backend

```bash
cd /opt/qmenus/qmenus-backend/backend
npm run build:all
pm2 restart all
pm2 logs api-service --lines 50
```

## التحقق النهائي

بعد تطبيق الحلول:

1. **في Browser Console** (F12):

   - يجب أن ترى: `API URL: https://api.qmenussy.com/api`
   - يجب أن ترى: `Set-Cookie header from response: [...]` (وليس `undefined`)
   - يجب أن ترى: `✅ Cookie successfully set in browser!`

2. **في Network Tab**:

   - Response Headers يجب أن تحتوي على:
     - `Set-Cookie: auth-token=...`
     - `Access-Control-Allow-Origin: https://www.qmenussy.com`
     - `Access-Control-Allow-Credentials: true`

3. **في Application Tab → Cookies**:
   - يجب أن ترى `auth-token` cookie من `api.qmenussy.com`
