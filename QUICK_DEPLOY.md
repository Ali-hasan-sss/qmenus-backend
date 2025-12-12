# ⚡ دليل سريع للنشر على VPS

## الطريقة السريعة (Quick Deploy)

### 1. على السيرفر - إعداد أولي (مرة واحدة فقط)

```bash
# تثبيت Node.js و PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
pm2 startup  # اتبع التعليمات

# تثبيت PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
```

### 2. رفع المشروع

```bash
cd /var/www
git clone https://github.com/your-username/mymenus.git
cd mymenus/backend
```

### 3. إعداد ملف .env

```bash
cp env.example .env
nano .env  # عدّل القيم المطلوبة
```

### 4. النشر

```bash
# جعل السكريبتات قابلة للتنفيذ
chmod +x scripts/*.sh

# تشغيل سكريبت النشر
./scripts/deploy.sh
```

أو يدوياً:

```bash
npm install --production
npm run db:generate
npm run db:deploy
npm run build:all
npm run start:prod
pm2 save
```

---

## التحديثات المستقبلية

```bash
cd /var/www/mymenus/backend
./scripts/update.sh
```

أو يدوياً:

```bash
git pull
npm install --production
npm run db:deploy
npm run build:all
pm2 restart ecosystem.config.js
```

---

## أوامر PM2 الأساسية

```bash
pm2 status          # عرض الحالة
pm2 logs            # عرض السجلات
pm2 restart all     # إعادة تشغيل الكل
pm2 stop all        # إيقاف الكل
pm2 delete all      # حذف الكل
```

---

## استكشاف الأخطاء

```bash
# فحص السجلات
pm2 logs

# فحص حالة الخدمات
pm2 status

# فحص المنافذ
sudo netstat -tlnp | grep -E '5000|5001|5002'
```

---

للمزيد من التفاصيل، راجع ملف `DEPLOYMENT.md`
