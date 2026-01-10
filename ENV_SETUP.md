# إعدادات متغيرات البيئة (Environment Variables)

## متغيرات البيئة المطلوبة على السيرفر

### 1. ملف `.env` في مجلد `backend/`

يجب التأكد من وجود المتغيرات التالية:

```env
# Database
DATABASE_URL=postgresql://qmenus_user:your_password@localhost:5432/qmenus?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# Application Ports
API_PORT=5000
SOCKET_PORT=5001
JOBS_PORT=5002

# JWT Secret
JWT_SECRET=your_very_secure_jwt_secret_key_change_this_in_production

# Environment
NODE_ENV=production

# Frontend URL (المسار الأساسي للفرونت إند)
FRONTEND_URL=https://www.qmenussy.com

# ALLOWED_ORIGINS (قائمة مسموحة للأصول - مهم جداً!)
# يجب أن تحتوي على جميع domians التي سترسل طلبات إلى API
# مهم: يجب إضافة https://www.qmenussy.com و https://qmenussy.com
ALLOWED_ORIGINS=https://www.qmenussy.com,https://qmenussy.com

# Socket Service URL
SOCKET_SERVICE_URL=http://localhost:5001

# Email (Resend API Key)
RESEND_API_KEY=your_resend_api_key_here

# Other settings
SKIP_EMAIL_VERIFICATION=false
```

## ⚠️ مهم جداً: إعدادات CORS

### المشكلة:

- Backend على: `https://api.qmenussy.com`
- Frontend على: `https://www.qmenussy.com` (Vercel)

هذان domain مختلفان، لذلك نحتاج إلى:

1. **ALLOWED_ORIGINS** يجب أن يحتوي على:

   ```
   https://www.qmenussy.com,https://qmenussy.com
   ```

2. **Cookie Settings** (في الكود):

   - `secure: true` (مطلوب في production)
   - `sameSite: "none"` (للسماح بـ cross-origin cookies)
   - لا يتم تعيين `domain` (سيتم تعيينه تلقائياً إلى `api.qmenussy.com`)

3. **CORS Settings** (في الكود):
   - `credentials: true` ✅ (مفعّل)
   - `origin: getAllowedOrigins()` ✅ (يستخدم ALLOWED_ORIGINS)

## التحقق من الإعدادات

بعد تحديث ملف `.env`:

```bash
# إعادة بناء المشروع
cd /opt/qmenus/qmenus-backend/backend
npm run build:all

# إعادة تشغيل الخدمات
pm2 restart all

# التحقق من logs
pm2 logs api-service --lines 50

# في logs يجب أن ترى:
# 🌐 CORS allowed origins: [ 'https://www.qmenussy.com', 'https://qmenussy.com' ]
# 🔒 CORS configuration: { isProduction: true, allowedOrigins: [...], credentials: true }
```

## التحقق من Cookie في Browser

بعد تسجيل الدخول، افتح Developer Tools (F12):

1. **Application Tab** → **Cookies**
2. تحقق من وجود cookie باسم `auth-token` من `api.qmenussy.com`
3. يجب أن تكون الإعدادات:
   - `HttpOnly`: ✅
   - `Secure`: ✅
   - `SameSite`: `None`
   - `Path`: `/`

## التحقق من CORS

في Network Tab:

1. افتح طلب POST إلى `/api/auth/login`
2. تحقق من Response Headers:
   - `Access-Control-Allow-Origin: https://www.qmenussy.com` ✅
   - `Access-Control-Allow-Credentials: true` ✅
   - `Set-Cookie: auth-token=...; HttpOnly; Secure; SameSite=None` ✅

## استكشاف الأخطاء

### المشكلة: Cookie لا يتم حفظه بعد تسجيل الدخول

**الحلول:**

1. تحقق من أن `ALLOWED_ORIGINS` يحتوي على `https://www.qmenussy.com`
2. تحقق من أن `NODE_ENV=production`
3. تحقق من أن SSL يعمل على `api.qmenussy.com` (مطلوب لـ `secure: true`)
4. تحقق من logs في Backend لرؤية Set-Cookie header

### المشكلة: CORS Error

**الحل:**

- تأكد من أن `ALLOWED_ORIGINS` يحتوي على domain الصحيح
- تأكد من أن `credentials: true` في CORS config

### المشكلة: Middleware يعيد التوجيه دائماً

**الحل:**

- الـ middleware في Next.js Edge Runtime قد لا يقرأ cookies من domain مختلف
- الحل الحالي: Middleware يتحقق من authentication عبر Backend API
- إذا استمرت المشكلة: يمكن الاعتماد على AuthContext للتحقق من authentication
