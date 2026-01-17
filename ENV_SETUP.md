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

# Email (SMTP Configuration)
# SMTP Host - عنوان خادم البريد الصادر
SMTP_HOST=mail.qmenussy.com

# SMTP Port - منفذ SMTP (465 مع SSL موصى به، أو 587 مع STARTTLS)
# البورت 465 مع SSL هو الأكثر استقراراً ويجنب مشاكل STARTTLS
SMTP_PORT=465

# SMTP Secure - true للبورت 465 (SSL), false للبورت 587 (STARTTLS)
# يجب أن يكون true عند استخدام البورت 465
SMTP_SECURE=true

# SMTP Require TLS - هل يتطلب TLS/STARTTLS (افتراضي: true)
# إذا كان الخادم لا يدعم STARTTLS، ضع: SMTP_REQUIRE_TLS=false
SMTP_REQUIRE_TLS=true

# SMTP Ignore TLS - تجاهل TLS بالكامل (غير موصى به إلا إذا كان ضرورياً)
# استخدم فقط إذا كان الخادم لا يدعم TLS على الإطلاق
SMTP_IGNORE_TLS=false

# SMTP Debug - تفعيل وضع التصحيح (اختياري، للمساعدة في حل المشاكل)
SMTP_DEBUG=false

# SMTP User - اسم المستخدم (البريد الإلكتروني الكامل)
SMTP_USER=info@qmenussy.com

# SMTP Password - كلمة مرور البريد الإلكتروني
SMTP_PASS=your_email_password_here

# Email From - البريد الإلكتروني المرسل (يمكن أن يكون نفس SMTP_USER)
EMAIL_FROM=info@qmenussy.com

# Email From Name - اسم المرسل الذي يظهر في صندوق الوارد (افتراضي: Q-menus)
EMAIL_FROM_NAME=Q-menus

# Email Logo URL - رابط اللوجو الذي يظهر في رسائل البريد الإلكتروني
# يمكن استخدام رابط مطلق أو نسبي (افتراضي: https://www.qmenussy.com/images/logo.png)
EMAIL_LOGO_URL=https://www.qmenussy.com/images/logo.png

# Contact Email - البريد الإلكتروني المستقبل لرسائل "اتصل بنا" (اختياري)
# يمكن استخدامه كـ fallback إذا لم يتم تعيين CONTACT_RECIPIENT_EMAIL
CONTACT_EMAIL=info@qmenussy.com

# Contact Recipient Email - البريد الإلكتروني المستقبل لرسائل "اتصل بنا" (أولوية عالية)
# هذا البريد سيستقبل جميع رسائل "اتصل بنا" (مثل بريد الجيميل الشخصي)
# إذا تم تعيينه، سيتم تجاهل CONTACT_EMAIL وقاعدة البيانات
CONTACT_RECIPIENT_EMAIL=your-email@gmail.com

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
