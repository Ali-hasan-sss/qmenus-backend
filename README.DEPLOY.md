# دليل النشر السريع - QMenus Backend

## الخطوات السريعة

### 1. إعداد المتغيرات البيئية

```bash
cd backend
cp .env.example .env
# قم بتعديل .env وإضافة القيم الصحيحة
```

### 2. إعداد SSL (Let's Encrypt)

```bash
# على السيرفر Linux
sudo apt-get update
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.qmenussy.com

# نسخ الشهادات
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/api.qmenussy.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/api.qmenussy.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem
```

### 3. النشر

```bash
# بناء وتشغيل
docker-compose build
docker-compose up -d

# عرض السجلات
docker-compose logs -f
```

### 4. التحقق

```bash
# التحقق من الحالة
docker-compose ps

# اختبار API
curl https://api.qmenussy.com/api/public/health
```

## الملفات المهمة

- `docker-compose.yml` - إعداد Docker Compose
- `.env` - المتغيرات البيئية (لا يتم رفعه)
- `nginx/nginx.conf` - إعداد Nginx
- `nginx/ssl/` - شهادات SSL

## البنية

```
api.qmenussy.com (Port 80, 443)
    ↓
Nginx (Reverse Proxy)
    ↓
Backend Container
    ├── API Service (Port 5000)
    ├── Socket Service (Port 5001)
    └── Jobs Service (Port 5002)
    ↓
PostgreSQL (Port 5432)
Redis (Port 6379)
```

## الأمان

- ✅ HTTPS مع SSL
- ✅ Rate Limiting
- ✅ Security Headers
- ✅ Network Isolation
- ✅ Non-root User
