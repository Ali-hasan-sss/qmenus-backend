// Usage:
// node backend/scripts/test-subscription-reminder.js <RESTAURANT_ID>

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const restaurantId = process.argv[2];
  if (!restaurantId) {
    console.error(
      "Please provide a RESTAURANT_ID: node backend/scripts/test-subscription-reminder.js <RESTAURANT_ID>"
    );
    process.exit(1);
  }

  try {
    console.log(
      "🔧 Preparing test: set active subscription endDate to ~24h from now..."
    );

    const sub = await prisma.subscription.findFirst({
      where: { restaurantId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    if (!sub) {
      console.error(
        "❌ No ACTIVE subscription found for restaurant:",
        restaurantId
      );
      process.exit(1);
    }

    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { endDate },
    });

    console.log("✅ endDate updated to:", endDate.toISOString());
    console.log(
      "➡️ Now run the server and trigger the daily check or wait for cron."
    );
    console.log(
      "Alternatively, temporarily call runDailySubscriptionChecks() at startup or reduce the cron interval."
    );
  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
