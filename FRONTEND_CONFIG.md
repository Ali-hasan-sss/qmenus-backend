# إعداد Frontend للاتصال بـ Backend

## بعد توليد شهادات SSL، استخدم الروابط التالية:

### الروابط

```
API URL:     https://api.qmenussy.com
Socket URL:  https://socket.qmenussy.com
```

### إعدادات Environment Variables للـ Frontend

في ملف `frontend/.env.local` أو `frontend/.env.production`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.qmenussy.com

# Socket.IO Configuration
NEXT_PUBLIC_SOCKET_URL=https://socket.qmenussy.com

# أو إذا كنت تستخدم proxy في Next.js:
NEXT_PUBLIC_PROXY_API=false
```

### ملاحظات

1. **API**: يستخدم `https://api.qmenussy.com/api/*` لجميع طلبات API
2. **Socket**: يستخدم `https://socket.qmenussy.com` للاتصال بـ Socket.IO
3. **HTTPS**: جميع الروابط تستخدم HTTPS بعد توليد الشهادات
4. **CORS**: تأكد من أن `FRONTEND_URL` في `.env` يشير إلى domain الـ Frontend

### التحقق من الاتصال

```bash
# اختبار API
curl https://api.qmenussy.com/health
curl https://api.qmenussy.com/api/public/health

# اختبار Socket (من المتصفح)
# افتح: https://socket.qmenussy.com
```

### تحديث Frontend Code

في `frontend/src/contexts/SocketContext.tsx` و `CustomerSocketContext.tsx`:

- الكود موجود بالفعل ويستخدم `process.env.NEXT_PUBLIC_SOCKET_URL`
- فقط تأكد من تعيين environment variable

في `frontend/src/lib/api.ts`:

- الكود موجود بالفعل ويستخدم `process.env.NEXT_PUBLIC_API_URL`
- فقط تأكد من تعيين environment variable
