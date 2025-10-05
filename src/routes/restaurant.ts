import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { updateRestaurantSchema } from "../validators/restaurantValidators";
import { validatePlanLimits } from "../middleware/planLimits";

const router = express.Router();

// Get restaurant details
router.get(
  "/",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user!.restaurantId },
        include: {
          subscriptions: {
            include: {
              plan: true,
            },
          },
          theme: true,
          _count: {
            select: {
              qrCodes: true,
              menus: true,
              orders: true,
            },
          },
        },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      res.json({
        success: true,
        data: { restaurant },
      });
    } catch (error) {
      console.error("Get restaurant error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update restaurant details
router.put(
  "/",
  authenticate,
  requireRestaurant,
  validateRequest(updateRestaurantSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        address,
        phone,
        email,
        website,
      } = req.body;

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: req.user!.restaurantId },
        data: {
          name,
          nameAr,
          description,
          descriptionAr,
          address,
          phone,
          email,
          website,
        },
      });

      res.json({
        success: true,
        message: "Restaurant updated successfully",
        data: { restaurant: updatedRestaurant },
      });
    } catch (error) {
      console.error("Update restaurant error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get restaurant statistics
router.get(
  "/stats",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      // Get order statistics
      const orderStats = await prisma.order.groupBy({
        by: ["status"],
        where: {
          restaurantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        _count: {
          id: true,
        },
      });

      // Get total revenue for last 30 days
      const revenue = await prisma.order.aggregate({
        where: {
          restaurantId,
          status: "COMPLETED",
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          totalPrice: true,
        },
      });

      // Get total orders count
      const totalOrders = await prisma.order.count({
        where: { restaurantId },
      });

      // Get active QR codes count
      const activeQRCodes = await prisma.qRCode.count({
        where: {
          restaurantId,
          isActive: true,
        },
      });

      // Get active menu items count
      const activeMenuItems = await prisma.menuItem.count({
        where: {
          category: {
            menu: {
              restaurantId,
            },
          },
          isAvailable: true,
        },
      });

      res.json({
        success: true,
        data: {
          orderStats: orderStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.id;
            return acc;
          }, {} as Record<string, number>),
          revenue: revenue._sum.totalPrice || 0,
          totalOrders,
          activeQRCodes,
          activeMenuItems,
        },
      });
    } catch (error) {
      console.error("Get restaurant stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Toggle restaurant active status
router.put(
  "/toggle-status",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user!.restaurantId },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: req.user!.restaurantId },
        data: {
          isActive: !restaurant.isActive,
        },
      });

      res.json({
        success: true,
        message: `Restaurant ${
          updatedRestaurant.isActive ? "activated" : "deactivated"
        } successfully`,
        data: { restaurant: updatedRestaurant },
      });
    } catch (error) {
      console.error("Toggle restaurant status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get restaurant invoices
router.get(
  "/invoices",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { page = 1, limit = 10, status, type } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        restaurantId: req.user!.restaurantId,
      };
      if (status) where.status = status;
      if (type) where.type = type;

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: "desc" },
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            subscription: {
              select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          invoices,
          total,
          totalPages: Math.ceil(total / Number(limit)),
          currentPage: Number(page),
        },
      });
    } catch (error) {
      console.error("Get restaurant invoices error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get invoice by ID
router.get(
  "/invoices/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          restaurantId: req.user!.restaurantId,
        },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
              duration: true,
            },
          },
          subscription: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      res.json({
        success: true,
        data: { invoice },
      });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get restaurant profile for settings
router.get(
  "/profile",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: req.user!.restaurantId },
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          descriptionAr: true,
          address: true,
          phone: true,
          logo: true,
        },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      res.json({
        success: true,
        data: restaurant,
      });
    } catch (error) {
      console.error("Get restaurant profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update restaurant profile
router.put(
  "/profile",
  authenticate,
  requireRestaurant,
  validateRequest(updateRestaurantSchema),
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { name, nameAr, description, descriptionAr, address, phone, logo } =
        req.body;

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: req.user!.restaurantId },
        data: {
          name: name || null,
          nameAr: nameAr || null,
          description: description || null,
          descriptionAr: descriptionAr || null,
          address: address || null,
          phone: phone || null,
          logo: logo || null,
        },
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          descriptionAr: true,
          address: true,
          phone: true,
          logo: true,
        },
      });

      res.json({
        success: true,
        data: updatedRestaurant,
      });
    } catch (error) {
      console.error("Update restaurant profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
