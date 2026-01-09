# دليل حل المشاكل - QMenus Backend

## مشكلة: "no space left on device" عند بناء Docker

### الأعراض

```
failed to solve: ResourceExhausted: write D:\Docker/vfs/dir/...: no space left on device
```

### الحل

#### 1. تنظيف موارد Docker

```powershell
# تنظيف شامل لجميع الموارد غير المستخدمة
docker system prune -a -f --volumes

# تنظيف Build Cache فقط
docker builder prune -a -f

# عرض استخدام المساحة
docker system df
```

#### 2. زيادة مساحة القرص المخصصة لـ Docker Desktop (Windows)

1. افتح **Docker Desktop**
2. انتقل إلى **Settings** (⚙️) → **Resources** → **Advanced**
3. ابحث عن **Disk image size**
4. قم بزيادة المساحة إلى **64 GB** على الأقل (أو أكثر حسب الحاجة)
5. اضغط **Apply & Restart**
6. انتظر حتى يتم إعادة تشغيل Docker Desktop

#### 3. التحقق من ملف .dockerignore

تأكد من أن ملف `.dockerignore` يستبعد الملفات الكبيرة:

- `**/node_modules` - جميع مجلدات node_modules
- `**/dist` - جميع مجلدات البناء
- `**/logs` - جميع ملفات السجلات
- `*.log` - جميع ملفات السجل

#### 4. إعادة المحاولة

```powershell
cd backend
docker-compose build
docker-compose up -d
```

## مشكلة: Docker Desktop غير قيد التشغيل

### الأعراض

```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/...":
open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
```

### الحل

1. تأكد من تشغيل **Docker Desktop** من قائمة Start
2. انتظر حتى يظهر Docker Desktop في النظام (قد يستغرق بضع ثوانٍ)
3. تحقق من أن Docker يعمل:
   ```powershell
   docker ps
   ```
4. إذا كان الأمر يعمل، يجب أن ترى قائمة بالحاويات (قد تكون فارغة)

## مشكلة: لا يمكن العثور على ملف docker-compose.yml

### الأعراض

```
no configuration file provided: not found
```

### الحل

تأكد من أنك في المجلد الصحيح:

```powershell
cd backend
docker-compose up -d
```

## مشكلة: خطأ في بناء Backend Service

### الأعراض

```
ERROR [backend internal] load build context
```

### الحل

1. تحقق من أن جميع الملفات المطلوبة موجودة:

   - `Dockerfile`
   - `docker-compose.yml`
   - `.env`
   - `package.json` في كل خدمة

2. نظف Build Cache:

   ```powershell
   docker builder prune -a -f
   ```

3. أعد المحاولة بدون Cache:
   ```powershell
   docker-compose build --no-cache
   ```

## مشكلة: خطأ في الاتصال بقاعدة البيانات

### الأعراض

```
Error: P1001: Can't reach database server
```

### الحل

1. تحقق من أن خدمة PostgreSQL تعمل:

   ```powershell
   docker-compose ps
   ```

2. تحقق من متغيرات البيئة في `.env`:

   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DB`
   - `DATABASE_URL`

3. أعد تشغيل الخدمات:
   ```powershell
   docker-compose restart postgres
   docker-compose restart backend
   ```

## مشكلة: خطأ في الاتصال بـ Redis

### الأعراض

```
Error: connect ECONNREFUSED redis:6379
```

### الحل

1. تحقق من أن خدمة Redis تعمل:

   ```powershell
   docker-compose ps redis
   ```

2. تحقق من متغيرات البيئة في `.env`:

   - `REDIS_URL`
   - `REDIS_PASSWORD`

3. أعد تشغيل Redis:
   ```powershell
   docker-compose restart redis
   ```

## مشكلة: خطأ في SSL Certificates لـ Nginx

### الأعراض

```
nginx: [emerg] SSL_CTX_use_PrivateKey_file("/etc/nginx/ssl/key.pem") failed
```

### الحل

1. تأكد من وجود ملفات الشهادات:

   ```powershell
   ls backend/nginx/ssl/
   ```

2. يجب أن تحتوي على:

   - `cert.pem`
   - `key.pem`

3. إذا لم تكن موجودة، استخدم `docker-compose.local.yml` للتطوير المحلي:
   ```powershell
   docker-compose -f docker-compose.local.yml up -d
   ```

## مشكلة: Ports مخصصة بالفعل

### الأعراض

```
Error: bind: address already in use
```

### الحل

1. اكتشف العملية التي تستخدم المنفذ:

   ```powershell
   # Windows
   netstat -ano | findstr :5000
   ```

2. أو غير المنافذ في `docker-compose.yml`:
   ```yaml
   ports:
     - "5001:5000" # استخدم منفذ مختلف
   ```

## الحصول على المساعدة

إذا استمرت المشكلة:

1. تحقق من السجلات:

   ```powershell
   docker-compose logs backend
   docker-compose logs postgres
   docker-compose logs redis
   docker-compose logs nginx
   ```

2. تحقق من حالة الخدمات:

   ```powershell
   docker-compose ps
   ```

3. راجع ملفات التوثيق:
   - `DEPLOYMENT.md`
   - `QUICK_START.md`
   - `ENV_SETUP.md`
