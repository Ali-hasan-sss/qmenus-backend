# إعادة توليد Prisma Client في api-service

## الخطوات:

1. **أوقف الخادم** (Ctrl+C في terminal الذي يعمل فيه)

2. **أعد توليد Prisma Client:**

   ```bash
   cd backend/api-service
   npm run postinstall
   ```

   أو مباشرة:

   ```bash
   cd backend/api-service
   npx prisma@5.22.0 generate --schema ../shared/prisma/schema.prisma
   ```

3. **أعد تشغيل الخادم:**
   ```bash
   npm run dev
   ```

## ملاحظات:

- **Schema واحد في `shared`**: جميع الخدمات تستخدم `backend/shared/prisma/schema.prisma`
- **Prisma Client في كل خدمة**: كل خدمة تولد Prisma Client في `node_modules` الخاص بها من نفس Schema
- **عند إضافة Model جديد**: يجب إعادة توليد Prisma Client في جميع الخدمات التي تستخدمه
