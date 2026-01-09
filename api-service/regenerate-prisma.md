# إعادة توليد Prisma Client

بعد إيقاف الخادم، قم بتشغيل:

```bash
cd backend/api-service
npm run postinstall
```

أو:

```bash
cd backend/api-service
npx prisma@5.22.0 generate --schema ../shared/prisma/schema.prisma
```

ثم أعد تشغيل الخادم:

```bash
npm run dev
```
