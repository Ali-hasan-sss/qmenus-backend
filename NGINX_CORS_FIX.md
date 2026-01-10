# إصلاح مشكلة CORS و Cookies في Nginx

## المشكلة

الـ response headers (`Set-Cookie`, `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`) لا تصل إلى Frontend، مما يعني أن Nginx يمنع تمريرها أو أن Backend لا يرسلها.

## الحل

### 1. التحقق من إعدادات Nginx

على السيرفر، افتح ملف Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/qmenus-backend
```

### 2. التأكد من أن location block للـ API يحتوي على:

```nginx
location /api {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;

    # Important: Preserve original host and scheme
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # CRITICAL: Pass all headers from backend
    proxy_pass_header Set-Cookie;
    proxy_pass_header Access-Control-Allow-Origin;
    proxy_pass_header Access-Control-Allow-Credentials;
    proxy_pass_header Access-Control-Allow-Methods;
    proxy_pass_header Access-Control-Allow-Headers;

    # Don't buffer responses (important for streaming)
    proxy_buffering off;

    # CORS headers - let backend handle CORS, but ensure headers pass through
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;

    # Handle OPTIONS requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

**⚠️ مهم**: لكن الأفضل هو **ترك Backend يتعامل مع CORS** بدلاً من Nginx، لأن Backend يمكنه التحقق من origin بشكل ديناميكي.

### 3. الحل الأفضل: Nginx يمرر جميع Headers فقط

```nginx
server {
    listen 443 ssl http2;
    server_name api.qmenussy.com;

    ssl_certificate /etc/letsencrypt/live/api.qmenussy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.qmenussy.com/privkey.pem;

    # API routes
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # Preserve client information
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # CRITICAL: Preserve ALL headers from backend, especially Set-Cookie
        proxy_pass_header Set-Cookie;
        proxy_hide_header Set-Cookie;
        proxy_cookie_path / /;

        # Don't buffer - let backend handle everything
        proxy_buffering off;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

**⚠️ تنبيه**: `proxy_hide_header Set-Cookie;` ثم `proxy_pass_header Set-Cookie;` - هذا يبدو متناقضاً لكنه يضمن تمرير header.

### 4. الحل الأصح: إزالة proxy_hide_header

```nginx
location /api {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;

    # CRITICAL: Don't hide Set-Cookie, let it pass through
    # Remove any proxy_hide_header Set-Cookie if exists

    # Don't buffer
    proxy_buffering off;
}
```

### 5. التحقق من Backend logs

بعد تحديث Nginx:

```bash
# إعادة تحميل Nginx
sudo nginx -t
sudo systemctl reload nginx

# تحقق من Backend logs
pm2 logs api-service --lines 50

# يجب أن ترى:
# 🌐 CORS allowed origins: [ 'https://www.qmenussy.com', 'https://qmenussy.com' ]
# ✅ CORS allowed for origin: https://www.qmenussy.com
# 🌐 Login request origin: https://www.qmenussy.com
# 🍪 Login cookie set: { secure: true, sameSite: 'none', ... }
```

### 6. التحقق من Response Headers

```bash
# من السيرفر
curl -I -X POST https://api.qmenussy.com/api/auth/login \
  -H "Origin: https://www.qmenussy.com" \
  -H "Content-Type: application/json"

# يجب أن ترى:
# Set-Cookie: auth-token=...
# Access-Control-Allow-Origin: https://www.qmenussy.com
# Access-Control-Allow-Credentials: true
```

## المشاكل الشائعة

### 1. Nginx يخفي Set-Cookie header

**الحل**: تأكد من عدم وجود `proxy_hide_header Set-Cookie;` أو `proxy_cookie_path` خاطئ.

### 2. CORS headers غير موجودة

**الحل**:

- تأكد من أن `ALLOWED_ORIGINS` في `.env` يحتوي على `https://www.qmenussy.com`
- تأكد من أن Backend يعمل (`pm2 status`)
- تحقق من logs في Backend

### 3. Cookie لا يتم حفظه في Browser

**الحل**:

- تأكد من أن `sameSite: "none"` و `secure: true` في Backend
- تأكد من أن Frontend يستخدم `withCredentials: true`
- تأكد من أن SSL يعمل على `api.qmenussy.com`
