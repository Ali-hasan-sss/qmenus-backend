# 🚀 دليل نشر المشروع على VPS باستخدام PM2

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:

- Node.js (v18 أو أحدث)
- npm أو yarn
- PostgreSQL
- PM2 (سيتم تثبيته تلقائياً)

---

## الخطوة 1: إعداد السيرفر

### 1.1 الاتصال بالسيرفر

```bash
ssh root@your-server-ip
```

### 1.2 تحديث النظام

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 1.3 تثبيت Node.js

```bash
# باستخدام NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# أو باستخدام nvm (موصى به)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 1.4 تثبيت PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# إنشاء قاعدة بيانات
sudo -u postgres psql
CREATE DATABASE mymenus;
CREATE USER mymenus_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE mymenus TO mymenus_user;
\q
```

### 1.5 تثبيت PM2 عالمياً

```bash
sudo npm install -g pm2
pm2 startup
# اتبع التعليمات التي تظهر
```

---

## الخطوة 2: رفع المشروع إلى السيرفر

### 2.1 استنساخ المشروع من Git

```bash
cd /var/www  # أو أي مجلد تفضله
git clone https://github.com/your-username/mymenus.git
cd mymenus/backend
```

### 2.2 أو رفع الملفات يدوياً

```bash
# على جهازك المحلي
scp -r backend/ root@your-server-ip:/var/www/mymenus/
```

---

## الخطوة 3: إعداد المتغيرات البيئية

### 3.1 نسخ ملف env.example

```bash
cd /var/www/mymenus/backend
cp env.example .env
```

### 3.2 تعديل ملف .env

```bash
nano .env
```

تأكد من تعديل القيم التالية:

```env
# Database
DATABASE_URL="postgresql://mymenus_user:your_secure_password@localhost:5432/mymenus?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Microservices Ports
API_PORT=5000
SOCKET_PORT=5001
JOBS_PORT=5002
NODE_ENV="production"

# CORS - ضع رابط الـ domain الخاص بك
FRONTEND_URL="https://yourdomain.com"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Socket service URL
SOCKET_SERVICE_URL="http://localhost:5001"

# Resend email API key
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="QMenus <noreply@yourdomain.com>"
```

---

## الخطوة 4: تثبيت التبعيات وبناء المشروع

### 4.1 تثبيت التبعيات

```bash
cd /var/www/mymenus/backend
npm install --production
```

### 4.2 توليد Prisma Client

```bash
npm run db:generate
```

### 4.3 تشغيل Migrations

```bash
npm run db:deploy
```

### 4.4 بناء جميع الخدمات

```bash
npm run build:all
```

---

## الخطوة 5: تشغيل المشروع باستخدام PM2

### 5.1 تشغيل جميع الخدمات

```bash
npm run start:prod
```

### 5.2 التحقق من حالة الخدمات

```bash
pm2 status
```

يجب أن ترى 3 خدمات تعمل:

- api-service
- socket-service
- jobs-service

### 5.3 حفظ قائمة PM2

```bash
pm2 save
```

هذا يضمن أن الخدمات ستعود للعمل بعد إعادة تشغيل السيرفر.

---

## الخطوة 6: إعداد Nginx كـ Reverse Proxy (اختياري لكن موصى به)

### 6.1 تثبيت Nginx

```bash
sudo apt install nginx -y
```

### 6.2 إنشاء ملف إعدادات

```bash
sudo nano /etc/nginx/sites-available/mymenus
```

أضف التالي:

```nginx
# API Service
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Socket Service
server {
    listen 80;
    server_name socket.yourdomain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.3 تفعيل الإعدادات

```bash
sudo ln -s /etc/nginx/sites-available/mymenus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## الخطوة 7: إعداد SSL باستخدام Let's Encrypt (موصى به)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com -d socket.yourdomain.com
```

---

## أوامر PM2 المفيدة

```bash
# عرض حالة جميع الخدمات
pm2 status

# عرض السجلات
pm2 logs

# عرض سجلات خدمة محددة
pm2 logs api-service

# إعادة تشغيل جميع الخدمات
pm2 restart ecosystem.config.js

# إعادة تشغيل خدمة محددة
pm2 restart api-service

# إيقاف جميع الخدمات
pm2 stop ecosystem.config.js

# حذف جميع الخدمات
pm2 delete ecosystem.config.js

# مراقبة الأداء
pm2 monit

# حفظ قائمة الخدمات
pm2 save

# إعادة تحميل PM2 بعد إعادة تشغيل السيرفر
pm2 resurrect
```

---

## التحديثات المستقبلية

عند تحديث المشروع:

```bash
# 1. سحب التحديثات
cd /var/www/mymenus/backend
git pull

# 2. تثبيت التبعيات الجديدة (إن وجدت)
npm install --production

# 3. تشغيل migrations الجديدة
npm run db:deploy

# 4. بناء المشروع
npm run build:all

# 5. إعادة تشغيل الخدمات
pm2 restart ecosystem.config.js
```

---

## استكشاف الأخطاء

### فحص السجلات

```bash
# سجلات PM2
pm2 logs

# سجلات Nginx
sudo tail -f /var/log/nginx/error.log

# سجلات النظام
sudo journalctl -u nginx -f
```

### التحقق من المنافذ

```bash
# التحقق من المنافذ المستخدمة
sudo netstat -tlnp | grep -E '5000|5001|5002'

# أو
sudo ss -tlnp | grep -E '5000|5001|5002'
```

### إعادة تشغيل الخدمات

```bash
# إعادة تشغيل PM2
pm2 restart ecosystem.config.js

# إعادة تشغيل Nginx
sudo systemctl restart nginx

# إعادة تشغيل PostgreSQL
sudo systemctl restart postgresql
```

---

## الأمان

1. **جدار الحماية (Firewall)**

   ```bash
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **تأكد من تغيير كلمات المرور الافتراضية**
3. **استخدم SSL/HTTPS دائماً**
4. **راجع ملف .env ولا ترفعه إلى Git**

---

## الدعم

إذا واجهت مشاكل:

1. راجع السجلات: `pm2 logs`
2. تحقق من حالة الخدمات: `pm2 status`
3. تأكد من أن قاعدة البيانات تعمل
4. تحقق من ملف .env
