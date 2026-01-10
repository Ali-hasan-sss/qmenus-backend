# 🚀 إعداد سريع للسيرفر

## الأوامر الأساسية (نسخ ولصق)

### 1️⃣ تحديث النظام وفتح البورتات

```bash
# تحديث النظام
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl wget git build-essential

# فتح البورتات (UFW)
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
```

---

### 2️⃣ تثبيت Node.js و PM2

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# التحقق
node --version  # يجب أن يكون v20.x.x
pm2 --version
```

---

### 3️⃣ تثبيت PostgreSQL

```bash
# تثبيت
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# إنشاء قاعدة بيانات (استبدل 'password123' بكلمة مرور قوية)
sudo -u postgres psql <<EOF
CREATE DATABASE qmenus;
CREATE USER qmenus_user WITH ENCRYPTED PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE qmenus TO qmenus_user;
ALTER DATABASE qmenus OWNER TO qmenus_user;
\q
EOF
```

---

### 4️⃣ تثبيت Redis

```bash
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# اختبار
redis-cli ping  # يجب أن يظهر: PONG
```

---

### 5️⃣ تثبيت Nginx و Certbot

```bash
# Nginx
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# التحقق
sudo systemctl status nginx
certbot --version
```

---

### 6️⃣ إنشاء مجلد المشروع وسحب الكود

```bash
# إنشاء مجلد
sudo mkdir -p /opt/qmenus
sudo chown $USER:$USER /opt/qmenus
cd /opt/qmenus

# سحب المشروع (استبدل بـ URL مستودعك)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git qmenus-backend

# الانتقال إلى مجلد backend
cd qmenus-backend/backend
```

---

### 7️⃣ إعداد ملف .env

```bash
# إنشاء ملف .env
nano .env
```

الصق المحتوى التالي (وعدّل القيم):

```env
DATABASE_URL=postgresql://qmenus_user:password123@localhost:5432/qmenus?schema=public
REDIS_URL=redis://localhost:6379
API_PORT=5000
SOCKET_PORT=5001
JOBS_PORT=5002
JWT_SECRET=your_very_secure_jwt_secret_key_change_this
NODE_ENV=production
FRONTEND_URL=https://qmenussy.com
SOCKET_SERVICE_URL=http://localhost:5001
RESEND_API_KEY=your_resend_api_key_here
```

احفظ: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### 8️⃣ تثبيت التبعيات والبناء

```bash
# تثبيت جميع التبعيات
npm install
cd shared && npm install && cd ..
cd api-service && npm install && cd ..
cd socket-service && npm install && cd ..
cd jobs-service && npm install && cd ..

# توليد Prisma
cd shared && npx prisma@5.22.0 generate --schema ./prisma/schema.prisma && cd ..

# بناء المشروع
npm run build:all

# Migrations
cd shared && npx prisma@5.22.0 migrate deploy --schema ./prisma/schema.prisma && cd ..

# Seed
cd api-service && node scripts/check-and-seed.js && cd ..
```

**أو استخدم script التحديث:**

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

---

### 9️⃣ إعداد Nginx

```bash
# نسخ ملف الإعدادات
sudo cp nginx/nginx-init.conf /etc/nginx/sites-available/qmenus-backend

# إنشاء رابط
sudo ln -s /etc/nginx/sites-available/qmenus-backend /etc/nginx/sites-enabled/

# إزالة الملف الافتراضي
sudo rm -f /etc/nginx/sites-enabled/default

# اختبار وإعادة التحميل
sudo nginx -t && sudo systemctl reload nginx
```

---

### 🔟 تشغيل الخدمات بـ PM2

```bash
# تشغيل
pm2 start pm2.config.js

# حفظ الإعدادات
pm2 save

# إعداد auto-start عند إعادة تشغيل السيرفر
pm2 startup
# اتبع التعليمات التي تظهر (عادة أمر sudo)

# التحقق
pm2 status
pm2 logs
```

---

### 1️⃣1️⃣ إعداد SSL

```bash
# تأكد من أن DNS مضبوط:
# api.qmenussy.com -> IP السيرفر
# socket.qmenussy.com -> IP السيرفر

# التحقق من DNS
dig api.qmenussy.com +short
dig socket.qmenussy.com +short

# الحصول على SSL (سيطلب إيقاف Nginx مؤقتاً)
sudo chmod +x nginx/init-letsencrypt-server.sh
sudo systemctl stop nginx
sudo ./nginx/init-letsencrypt-server.sh
# سيتم تشغيل Nginx تلقائياً بعد الحصول على الشهادة
```

---

### 1️⃣2️⃣ إعداد Auto-Renewal للشهادات

```bash
# فتح crontab
sudo crontab -e

# إضافة السطر التالي
0 3 * * * /opt/qmenus/qmenus-backend/backend/nginx/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1
```

---

## ✅ التحقق النهائي

```bash
# 1. حالة الخدمات
pm2 status

# 2. البورتات
ss -tulpn | grep -E ':(5000|5001|5002|80|443)'

# 3. اختبار محلي
curl http://localhost:5000/health
curl http://localhost:5001/health

# 4. اختبار خارجي
curl https://api.qmenussy.com/health
curl https://socket.qmenussy.com/health
```

---

## 🔄 تحديث المشروع (بعد كل تغيير)

```bash
cd /opt/qmenus/qmenus-backend/backend
git pull origin main
./scripts/deploy.sh
```

---

## 📊 أوامر مفيدة

```bash
# عرض السجلات
pm2 logs
pm2 logs api-service --lines 50

# إعادة تشغيل
pm2 restart pm2.config.js

# إعادة بناء وتشغيل
npm run build:all && pm2 restart pm2.config.js

# حالة Nginx
sudo systemctl status nginx
sudo nginx -t

# حالة قاعدة البيانات
sudo systemctl status postgresql
psql -U qmenus_user -d qmenus -h localhost

# مراقبة الموارد
pm2 monit
htop
```

---

## 🆘 حل المشاكل الشائعة

### الخدمات لا تعمل:

```bash
pm2 logs --err
pm2 restart all
```

### مشاكل قاعدة البيانات:

```bash
sudo systemctl restart postgresql
cd shared && npx prisma@5.22.0 migrate deploy --schema ./prisma/schema.prisma
```

### مشاكل Nginx:

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
sudo systemctl restart nginx
```

### البورتات مستخدمة:

```bash
sudo lsof -i :5000
sudo kill -9 <PID>
```

---

## 📝 ملاحظات

1. **DNS**: تأكد من ضبط DNS قبل الحصول على SSL
2. **كلمات المرور**: استخدم كلمات مرور قوية
3. **Backups**: قم بعمل backup لقاعدة البيانات بانتظام
4. **Monitoring**: راقب استخدام الموارد

---

## 🎉 تم!

المشروع يعمل الآن على:

- API: `https://api.qmenussy.com`
- Socket: `https://socket.qmenussy.com`
