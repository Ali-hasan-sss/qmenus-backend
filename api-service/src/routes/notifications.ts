import { Router } from "express";
import prisma from "../../../shared/config/db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// Get all notifications for a restaurant
router.get("/", authenticate, async (req: AuthRequest, res): Promise<any> => {
  try {
    // Admins don't have restaurants, so skip notifications for them
    if (req.user?.role === "ADMIN") {
      return res.json({
        success: true,
        data: { notifications: [] },
      });
    }

    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to last 50 notifications
    });

    res.json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// Get unread count
router.get(
  "/unread-count",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      // Admins don't have restaurants, so return 0
      if (req.user?.role === "ADMIN") {
        return res.json({
          success: true,
          data: { count: 0 },
        });
      }

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const count = await prisma.notification.count({
        where: {
          restaurantId,
          isRead: false,
        },
      });

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unread count",
      });
    }
  }
);

// Mark notification as read
router.put(
  "/:id/read",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      // Admins don't have notifications
      if (req.user?.role === "ADMIN") {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
      const { id } = req.params;

      const notification = await prisma.notification.updateMany({
        where: {
          id,
          restaurantId, // Ensure user can only update their own notifications
        },
        data: {
          isRead: true,
        },
      });

      if (notification.count === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      res.json({
        success: true,
        data: { notification },
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
      });
    }
  }
);

// Mark all notifications as read
router.put(
  "/mark-all-read",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      // Admins don't have notifications
      if (req.user?.role === "ADMIN") {
        return res.json({
          success: true,
          message: "All notifications marked as read",
        });
      }

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await prisma.notification.updateMany({
        where: {
          restaurantId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({
        success: true,
        message: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark all notifications as read",
      });
    }
  }
);

// Delete a notification
router.delete(
  "/:id",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      // Admins don't have notifications
      if (req.user?.role === "ADMIN") {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
      const { id } = req.params;

      const notification = await prisma.notification.deleteMany({
        where: {
          id,
          restaurantId, // Ensure user can only delete their own notifications
        },
      });

      if (notification.count === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        });
      }

      res.json({
        success: true,
        message: "Notification deleted",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete notification",
      });
    }
  }
);

export default router;
