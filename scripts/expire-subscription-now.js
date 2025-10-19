// Usage:
// node backend/scripts/expire-subscription-now.js <RESTAURANT_ID>

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const restaurantId = process.argv[2];
  if (!restaurantId) {
    console.error(
      "Please provide a RESTAURANT_ID: node backend/scripts/expire-subscription-now.js <RESTAURANT_ID>"
    );
    process.exit(1);
  }

  try {
    console.log(
      "⏳ Expiring ACTIVE subscription immediately for:",
      restaurantId
    );

    const sub = await prisma.subscription.findFirst({
      where: { restaurantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (!sub) {
      console.error(
        "❌ No ACTIVE subscription found for restaurant:",
        restaurantId
      );
      process.exit(1);
    }

    const now = new Date();
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { endDate: new Date(now.getTime() - 1000) },
    });

    console.log(
      "✅ Subscription endDate set to past. Run the server to let checkExpiredSubscriptions mark it as EXPIRED and send notifications."
    );
  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
