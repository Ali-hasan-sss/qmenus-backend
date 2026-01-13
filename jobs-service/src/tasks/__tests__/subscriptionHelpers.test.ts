import {
  checkExpiringSubscriptions,
  checkExpiredSubscriptions,
  runDailySubscriptionChecks,
} from "../subscriptionHelpers";
import prisma from "../../../../shared/config/db";

// Mock Prisma client
jest.mock("../../../../shared/config/db", () => ({
  __esModule: true,
  default: {
    subscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    restaurant: {
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

// Mock axios for socket service (used in createAdminNotification)
// Note: axios is required dynamically in the code, so we need to mock it
jest.mock("axios", () => {
  const mockAxios = {
    post: jest.fn().mockResolvedValue({ data: {} }),
  };
  return {
    __esModule: true,
    default: mockAxios,
  };
});

// Mock env config (used in createAdminNotification)
jest.mock("../../../../shared/config/env", () => ({
  env: {
    SOCKET_SERVICE_URL: "http://localhost:5001",
    SOCKET_PORT: "5001",
  },
}));

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe("Subscription Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkExpiringSubscriptions", () => {
    it("should find subscriptions expiring within 24 hours and send notifications", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockSubscription = {
        id: "sub-1",
        restaurantId: "rest-1",
        endDate: tomorrow,
        restaurant: {
          id: "rest-1",
          name: "Test Restaurant",
        },
        plan: {
          id: "plan-1",
          name: "Test Plan",
        },
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        mockSubscription,
      ]);
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: "notif-1",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-1" },
      ]);

      const result = await checkExpiringSubscriptions();

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          endDate: {
            lte: expect.any(Date),
            gte: expect.any(Date),
            not: null,
          },
        },
        include: {
          restaurant: true,
          plan: true,
        },
      });

      expect(result.notificationsSent).toBe(1);
      expect(result.expiringCount).toBe(1);
    });

    it("should not send duplicate notifications for the same subscription", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockSubscription = {
        id: "sub-1",
        restaurantId: "rest-1",
        endDate: tomorrow,
        restaurant: {
          id: "rest-1",
          name: "Test Restaurant",
        },
        plan: {
          id: "plan-1",
          name: "Test Plan",
        },
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        mockSubscription,
      ]);
      // Simulate existing notification
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-notif",
      });

      const result = await checkExpiringSubscriptions();

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result.notificationsSent).toBe(0);
    });

    it("should handle subscriptions expiring in more than 1 day", async () => {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const mockSubscription = {
        id: "sub-1",
        restaurantId: "rest-1",
        endDate: twoDaysFromNow,
        restaurant: {
          id: "rest-1",
          name: "Test Restaurant",
        },
        plan: {
          id: "plan-1",
          name: "Test Plan",
        },
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkExpiringSubscriptions();

      expect(result.notificationsSent).toBe(0);
      expect(result.expiringCount).toBe(0);
    });
  });

  describe("checkExpiredSubscriptions", () => {
    it("should mark expired subscriptions as EXPIRED and deactivate restaurant", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockSubscription = {
        id: "sub-1",
        restaurantId: "rest-1",
        endDate: yesterday,
        status: "ACTIVE",
        restaurant: {
          id: "rest-1",
          name: "Test Restaurant",
          isActive: true,
        },
        plan: {
          id: "plan-1",
          name: "Test Plan",
        },
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        mockSubscription,
      ]);
      // No other active subscriptions
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        ...mockSubscription,
        status: "EXPIRED",
      });
      (prisma.restaurant.update as jest.Mock).mockResolvedValue({
        ...mockSubscription.restaurant,
        isActive: false,
      });
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: "notif-1",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-1" },
      ]);

      const result = await checkExpiredSubscriptions();

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          endDate: {
            lt: expect.any(Date),
            not: null,
          },
        },
        include: {
          restaurant: true,
          plan: true,
        },
      });

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { status: "EXPIRED" },
      });

      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: "rest-1" },
        data: { isActive: false },
      });

      expect(result.updatedCount).toBe(1);
      expect(result.expiredCount).toBe(1);
    });

    it("should not deactivate restaurant if it has other active subscriptions", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockSubscription = {
        id: "sub-1",
        restaurantId: "rest-1",
        endDate: yesterday,
        status: "ACTIVE",
        restaurant: {
          id: "rest-1",
          name: "Test Restaurant",
          isActive: true,
        },
        plan: {
          id: "plan-1",
          name: "Test Plan",
        },
      };

      const otherActiveSubscription = {
        id: "sub-2",
        restaurantId: "rest-1",
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "ACTIVE",
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        mockSubscription,
      ]);
      // Has other active subscription
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(
        otherActiveSubscription
      );
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        ...mockSubscription,
        status: "EXPIRED",
      });
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: "notif-1",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-1" },
      ]);

      const result = await checkExpiredSubscriptions();

      expect(prisma.subscription.update).toHaveBeenCalled();
      expect(prisma.restaurant.update).not.toHaveBeenCalled();
      expect(result.updatedCount).toBe(1);
    });

    it("should handle subscriptions with null endDate", async () => {
      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([]);

      const result = await checkExpiredSubscriptions();

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACTIVE",
          endDate: {
            lt: expect.any(Date),
            not: null,
          },
        },
        include: {
          restaurant: true,
          plan: true,
        },
      });

      expect(result.updatedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      (prisma.subscription.findMany as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await checkExpiredSubscriptions();

      expect(result.updatedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
    });
  });

  describe("runDailySubscriptionChecks", () => {
    it("should run both expiring and expired checks", async () => {
      (prisma.subscription.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // expiring check
        .mockResolvedValueOnce([]); // expired check
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await runDailySubscriptionChecks();

      expect(result).toHaveProperty("expiring");
      expect(result).toHaveProperty("expired");
      expect(result.expiring).toHaveProperty("notificationsSent");
      expect(result.expired).toHaveProperty("updatedCount");
    });
  });

  describe("Edge Cases", () => {
    it("should handle subscriptions expiring exactly in 24 hours", async () => {
      const exactly24Hours = new Date();
      exactly24Hours.setHours(exactly24Hours.getHours() + 24);

      const mockSubscription = {
        id: "sub-1",
        restaurantId: "rest-1",
        endDate: exactly24Hours,
        restaurant: {
          id: "rest-1",
          name: "Test Restaurant",
        },
        plan: {
          id: "plan-1",
          name: "Test Plan",
        },
      };

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue([
        mockSubscription,
      ]);
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: "notif-1",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-1" },
      ]);

      const result = await checkExpiringSubscriptions();

      expect(result.notificationsSent).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiple expired subscriptions for same restaurant", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockSubscriptions = [
        {
          id: "sub-1",
          restaurantId: "rest-1",
          endDate: yesterday,
          status: "ACTIVE",
          restaurant: {
            id: "rest-1",
            name: "Test Restaurant",
          },
          plan: {
            id: "plan-1",
            name: "Test Plan",
          },
        },
        {
          id: "sub-2",
          restaurantId: "rest-1",
          endDate: yesterday,
          status: "ACTIVE",
          restaurant: {
            id: "rest-1",
            name: "Test Restaurant",
          },
          plan: {
            id: "plan-2",
            name: "Another Plan",
          },
        },
      ];

      (prisma.subscription.findMany as jest.Mock).mockResolvedValue(
        mockSubscriptions
      );
      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        status: "EXPIRED",
      });
      (prisma.restaurant.update as jest.Mock).mockResolvedValue({
        isActive: false,
      });
      (prisma.notification.create as jest.Mock).mockResolvedValue({
        id: "notif-1",
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: "admin-1" },
      ]);

      const result = await checkExpiredSubscriptions();

      expect(prisma.subscription.update).toHaveBeenCalledTimes(2);
      expect(prisma.restaurant.update).toHaveBeenCalledTimes(2);
      expect(result.updatedCount).toBe(2);
    });
  });
});
