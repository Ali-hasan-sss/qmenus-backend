# دليل إعداد السيرفر من الصفر

## المتطلبات الأساسية

- Ubuntu/Debian Server
- وصول root أو sudo
- Server IP: يجب أن يكون DNS مضبوط (api.qmenussy.com و socket.qmenussy.com)

---

## 1. تحديث النظام

```bash
# تحديث النظام
sudo apt-get update
sudo apt-get upgrade -y

# تثبيت أدوات أساسية
sudo apt-get install -y curl wget git build-essential
```

---

## 2. فتح البورتات (Firewall)

### إذا كنت تستخدم UFW:

```bash
# فتح البورتات المطلوبة
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 5432/tcp    # PostgreSQL (اختياري - للإدارة فقط)
sudo ufw allow 6379/tcp    # Redis (اختياري - للإدارة فقط)

# تفعيل Firewall
sudo ufw enable

# التحقق من حالة Firewall
sudo ufw status
```

### إذا كنت تستخدم iptables:

```bash
# فتح البورتات
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# حفظ القواعد
sudo iptables-save > /etc/iptables/rules.v4
```

### إذا كنت تستخدم cloud provider (AWS, DigitalOcean, etc.):

- افتح البورتات من لوحة التحكم:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)

---

## 3. تثبيت Node.js 20

```bash
# تثبيت Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# التحقق من التثبيت
node --version
npm --version

# يجب أن يظهر:
# v20.x.x
# 10.x.x
```

---

## 4. تثبيت PM2

```bash
# تثبيت PM2 بشكل عام (Global)
sudo npm install -g pm2

# التحقق من التثبيت
pm2 --version

# إعداد PM2 لبدء التشغيل تلقائياً عند إعادة تشغيل السيرفر
pm2 startup

# اتبع التعليمات التي تظهر لك (عادة تكون أمر sudo)
# مثال: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your_username --hp /home/your_username
```

---

## 5. تثبيت PostgreSQL

```bash
# تثبيت PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# بدء خدمة PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# التحقق من حالة PostgreSQL
sudo systemctl status postgresql

# إنشاء قاعدة بيانات
sudo -u postgres psql <<EOF
CREATE DATABASE qmenus;
CREATE USER qmenus_user WITH ENCRYPTED PASSWORD Molazem1992;
GRANT ALL PRIVILEGES ON DATABASE qmenus TO qmenus_user;
ALTER DATABASE qmenus OWNER TO qmenus_user;
\q
EOF

# ملاحظة: استبدل 'your_secure_password_here' بكلمة مرور قوية
```

---

## 6. تثبيت Redis (اختياري ولكن موصى به)

```bash
# تثبيت Redis
sudo apt-get install -y redis-server

# تحرير ملف الإعدادات (اختياري - لإضافة كلمة مرور)
sudo nano /etc/redis/redis.conf
# ابحث عن: # requirepass foobared
# أزل التعليق وأضف كلمة مرور: requirepass your_redis_password

# بدء خدمة Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# التحقق من حالة Redis
sudo systemctl status redis-server

# اختبار Redis
redis-cli ping
# يجب أن يظهر: PONG
```

---

## 7. تثبيت Nginx

```bash
# تثبيت Nginx
sudo apt-get install -y nginx

# بدء خدمة Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# التحقق من حالة Nginx
sudo systemctl status nginx

# التحقق من أن Nginx يعمل
curl http://localhost
# يجب أن يظهر HTML لصفحة Nginx الافتراضية
```

---

## 8. تثبيت Certbot (للحصول على SSL)

```bash
# تثبيت Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# التحقق من التثبيت
certbot --version
```

---

## 9. إنشاء مستخدم للتطبيق (اختياري ولكن موصى به)

```bash
# إنشاء مستخدم جديد
sudo adduser qmenus --disabled-password --gecos ""

# إضافة المستخدم إلى مجموعة sudo (إذا لزم الأمر)
sudo usermod -aG sudo qmenus

# التبديل إلى المستخدم الجديد
su - qmenus
```

---

## 10. إعداد Git

```bash
# تثبيت Git (إذا لم يكن مثبتاً)
sudo apt-get install -y git

# إعداد Git (استبدل بالقيم الحقيقية)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# التحقق من إعداد Git
git config --list
```

---

## 11. إنشاء مجلد المشروع وسحب الكود

```bash
# إنشاء مجلد للمشروع
sudo mkdir -p /opt/qmenus
sudo chown $USER:$USER /opt/qmenus

# الانتقال إلى المجلد
cd /opt/qmenus

# سحب المشروع (استبدل بـ URL مستودعك الحقيقي)
git clone https://github.com/your-username/your-repo.git qmenus-backend

# أو إذا كان المستودع خاصاً وتستخدم SSH:
# git clone git@github.com:your-username/your-repo.git qmenus-backend

# الانتقال إلى مجلد المشروع
cd qmenus-backend

# إذا كان المشروع في مجلد backend داخل المستودع:
cd backend
```

---

## 12. إعداد ملف .env

```bash
# إنشاء ملف .env من مثال (إذا كان موجوداً)
cp .env.example .env

# أو إنشاء ملف .env جديد
nano .env
```

### محتوى ملف .env المقترح:

```env
# Database
DATABASE_URL=postgresql://qmenus_user:your_secure_password_here@localhost:5432/qmenus?schema=public

# Redis (إذا كان لديك كلمة مرور)
REDIS_URL=redis://localhost:6379
# أو إذا كان لديك كلمة مرور:
# REDIS_URL=redis://:your_redis_password@localhost:6379

# Application Ports
API_PORT=5000
SOCKET_PORT=5001
JOBS_PORT=5002

# JWT Secret (استخدم مفتاح قوي)
JWT_SECRET=your_very_secure_jwt_secret_key_change_this_in_production

# Environment
NODE_ENV=production

# Frontend URL
FRONTEND_URL=https://qmenussy.com

# Socket Service URL
SOCKET_SERVICE_URL=http://localhost:5001

# Email (Resend API Key)
RESEND_API_KEY=your_resend_api_key_here

# Other environment variables as needed
```

احفظ الملف: `Ctrl+O`, ثم `Enter`, ثم `Ctrl+X`

---

## 13. تثبيت التبعيات وبناء المشروع

```bash
# التأكد أنك في مجلد backend
cd /opt/qmenus/qmenus-backend/backend

# تثبيت تبعيات الجذر
npm install

# تثبيت تبعيات shared
cd shared
npm install
cd ..

# تثبيت تبعيات api-service
cd api-service
npm install
cd ..

# تثبيت تبعيات socket-service
cd socket-service
npm install
cd ..

# تثبيت تبعيات jobs-service
cd jobs-service
npm install
cd ..

# توليد Prisma Client
cd shared
npx prisma@5.22.0 generate --schema ./prisma/schema.prisma
cd ..

# بناء جميع الخدمات
npm run build:all

# يجب أن ترى:
# ✔ api-service built
# ✔ socket-service built
# ✔ jobs-service built
```

---

## 14. تشغيل Migrations و Seed

```bash
# الانتقال إلى مجلد shared
cd shared

# تشغيل Migrations
npx prisma@5.22.0 migrate deploy --schema ./prisma/schema.prisma

# يجب أن ترى:
# ✅ Applied X migrations

# العودة إلى مجلد backend
cd ..

# تشغيل Seed (إنشاء بيانات أولية)
cd api-service
node scripts/check-and-seed.js
cd ..
```

---

## 15. إعداد Nginx

```bash
# الانتقال إلى مجلد backend
cd /opt/qmenus/qmenus-backend/backend

# نسخ ملف إعدادات Nginx
sudo cp nginx/nginx-init.conf /etc/nginx/sites-available/qmenus-backend

# إنشاء رابط رمزي
sudo ln -s /etc/nginx/sites-available/qmenus-backend /etc/nginx/sites-enabled/

# إزالة ملف Nginx الافتراضي (اختياري)
sudo rm -f /etc/nginx/sites-enabled/default

# اختبار إعدادات Nginx
sudo nginx -t

# يجب أن ترى:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# إعادة تحميل Nginx
sudo systemctl reload nginx
```

---

## 16. تشغيل الخدمات باستخدام PM2

```bash
# التأكد أنك في مجلد backend
cd /opt/qmenus/qmenus-backend/backend

# تشغيل الخدمات
pm2 start pm2.config.js

# يجب أن ترى:
# [PM2] Starting processes
# [PM2] Successfully started

# حفظ إعدادات PM2
pm2 save

# عرض حالة الخدمات
pm2 status

# يجب أن ترى:
# ┌─────┬─────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name            │ status  │ ...     │ ...      │
# ├─────┼─────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ api-service     │ online  │ ...     │ ...      │
# │ 1   │ socket-service  │ online  │ ...     │ ...      │
# │ 2   │ jobs-service    │ online  │ ...     │ ...      │
# └─────┴─────────────────┴─────────┴─────────┴──────────┘
```

---

## 17. التحقق من تشغيل الخدمات

```bash
# التحقق من أن الخدمات تعمل على البورتات
sudo netstat -tulpn | grep -E ':(5000|5001|5002)'

# أو باستخدام ss
ss -tulpn | grep -E ':(5000|5001|5002)'

# اختبار API
curl http://localhost:5000/health

# اختبار Socket
curl http://localhost:5001/health

# عرض سجلات PM2
pm2 logs

# عرض سجلات خدمة محددة
pm2 logs api-service
```

---

## 18. إعداد SSL (Let's Encrypt)

```bash
# الانتقال إلى مجلد backend
cd /opt/qmenus/qmenus-backend/backend

# التأكد من أن DNS مضبوط بشكل صحيح
# api.qmenussy.com -> يجب أن يشير إلى IP السيرفر
# socket.qmenussy.com -> يجب أن يشير إلى IP السيرفر

# التحقق من DNS
dig api.qmenussy.com +short
dig socket.qmenussy.com +short

# إيقاف Nginx مؤقتاً (للحصول على الشهادة)
sudo systemctl stop nginx

# تشغيل script الحصول على SSL
sudo chmod +x nginx/init-letsencrypt-server.sh
sudo ./nginx/init-letsencrypt-server.sh

# بعد الحصول على الشهادة، سيتم تشغيل Nginx تلقائياً

# التحقق من SSL
curl https://api.qmenussy.com/health
curl https://socket.qmenussy.com/health
```

---

## 19. إعداد Auto-Renewal للشهادات

```bash
# فتح crontab
sudo crontab -e

# إضافة السطر التالي (يتجدد كل يوم في الساعة 3 صباحاً)
0 3 * * * /opt/qmenus/qmenus-backend/backend/nginx/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1

# أو استخدام certbot مباشرة:
0 3 * * * certbot renew --quiet --webroot --webroot-path=/opt/qmenus/qmenus-backend/backend/nginx/certbot/www --config-dir /opt/qmenus/qmenus-backend/backend/nginx/certbot/conf --work-dir /opt/qmenus/qmenus-backend/backend/nginx/certbot/work --logs-dir /opt/qmenus/qmenus-backend/backend/nginx/certbot/logs && sudo systemctl reload nginx
```

---

## 20. أوامر مفيدة للصيانة

### إعادة تشغيل الخدمات:

```bash
# إعادة تشغيل جميع الخدمات
pm2 restart pm2.config.js

# إعادة تشغيل خدمة محددة
pm2 restart api-service

# إعادة بناء وتشغيل
npm run build:all && pm2 restart pm2.config.js
```

### عرض السجلات:

```bash
# جميع السجلات
pm2 logs

# سجلات خدمة محددة
pm2 logs api-service --lines 100

# سجلات Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### تحديث المشروع:

```bash
cd /opt/qmenus/qmenus-backend/backend
git pull origin main
npm install
cd shared && npm install && cd ..
cd api-service && npm install && cd ..
cd socket-service && npm install && cd ..
cd jobs-service && npm install && cd ..
cd shared && npx prisma@5.22.0 generate --schema ./prisma/schema.prisma && cd ..
npm run build:all
cd shared && npx prisma@5.22.0 migrate deploy --schema ./prisma/schema.prisma && cd ..
pm2 restart pm2.config.js
```

### أو استخدام script التحديث:

```bash
cd /opt/qmenus/qmenus-backend/backend
./scripts/deploy.sh
```

---

## 21. Troubleshooting

### الخدمات لا تعمل:

```bash
# التحقق من حالة PM2
pm2 status

# عرض الأخطاء
pm2 logs --err

# إعادة تشغيل PM2
pm2 kill
pm2 resurrect
```

### مشاكل قاعدة البيانات:

```bash
# التحقق من حالة PostgreSQL
sudo systemctl status postgresql

# اختبار الاتصال
psql -U qmenus_user -d qmenus -h localhost

# عرض سجلات PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### مشاكل Nginx:

```bash
# اختبار الإعدادات
sudo nginx -t

# عرض الأخطاء
sudo tail -f /var/log/nginx/error.log

# إعادة تشغيل Nginx
sudo systemctl restart nginx
```

### مشاكل Ports:

```bash
# التحقق من البورتات المستخدمة
sudo netstat -tulpn | grep LISTEN

# إيقاف عملية تستخدم بورت
sudo kill -9 $(sudo lsof -t -i:5000)
```

---

## 22. الأمان (Security Best Practices)

```bash
# تحديث النظام بانتظام
sudo apt-get update && sudo apt-get upgrade -y

# إعداد fail2ban (حماية من الهجمات)
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# إعداد automatic security updates
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# تغيير بورت SSH (اختياري)
sudo nano /etc/ssh/sshd_config
# غير: Port 22 إلى Port 2222
sudo systemctl restart sshd

# تعطيل تسجيل الدخول بكلمة مرور root (استخدام SSH keys فقط)
sudo nano /etc/ssh/sshd_config
# غير: PermitRootLogin yes إلى PermitRootLogin prohibit-password
```

---

## ✅ التحقق النهائي

```bash
# 1. التحقق من الخدمات
pm2 status
# يجب أن تكون جميع الخدمات online

# 2. التحقق من البورتات
ss -tulpn | grep -E ':(5000|5001|5002|80|443)'

# 3. اختبار API محلياً
curl http://localhost:5000/health
curl http://localhost:5001/health

# 4. اختبار من الخارج (استبدل بـ IP أو domain الخاص بك)
curl http://your-server-ip/health
curl https://api.qmenussy.com/health

# 5. التحقق من SSL
curl -I https://api.qmenussy.com
# يجب أن يظهر: HTTP/2 200

# 6. التحقق من Nginx
sudo nginx -t
sudo systemctl status nginx

# 7. التحقق من PM2 startup
pm2 startup
# يجب أن يكون مضبوط
```

---

## 📝 ملاحظات مهمة

1. **DNS**: تأكد من أن DNS records مضبوطة قبل الحصول على SSL:

   - `A` record لـ `api.qmenussy.com` -> IP السيرفر
   - `A` record لـ `socket.qmenussy.com` -> IP السيرفر

2. **كلمات المرور**: استخدم كلمات مرور قوية لجميع الخدمات

3. **Backups**: قم بعمل backup منتظم لقاعدة البيانات:

   ```bash
   pg_dump -U qmenus_user qmenus > backup_$(date +%Y%m%d).sql
   ```

4. **Monitoring**: راقب استخدام الموارد:

   ```bash
   pm2 monit
   htop
   df -h
   ```

5. **Logs Rotation**: تأكد من تدوير السجلات لتجنب ملء القرص

---

## 🎉 تم الإعداد بنجاح!

المشروع الآن جاهز ويعمل على السيرفر. يمكنك الوصول إليه عبر:

- API: `https://api.qmenussy.com`
- Socket: `https://socket.qmenussy.com`
