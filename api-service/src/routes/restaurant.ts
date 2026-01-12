import express, { Response } from "express";
import prisma from "../../../shared/config/db";
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
        kitchenWhatsApp,
        currency,
      } = req.body;

      // Build update data object - only include fields that are provided
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (nameAr !== undefined) updateData.nameAr = nameAr;
      if (description !== undefined) updateData.description = description;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
      if (address !== undefined) updateData.address = address;
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (website !== undefined) updateData.website = website;
      if (kitchenWhatsApp !== undefined)
        updateData.kitchenWhatsApp = kitchenWhatsApp;

      // Always update currency if provided
      if (currency !== undefined && currency !== null && currency !== "") {
        updateData.currency = currency;
      }

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: req.user!.restaurantId },
        data: updateData,
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
          orderStats: orderStats.reduce(
            (
              acc: Record<string, number>,
              stat: { status: string; _count: { id: number } }
            ) => {
              acc[stat.status] = stat._count.id;
              return acc;
            },
            {} as Record<string, number>
          ),
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
          currency: true,
        } as any,
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
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        address,
        phone,
        logo,
        currency,
      } = req.body;

      const updateData: any = {
        name: name || null,
        nameAr: nameAr || null,
        description: description || null,
        descriptionAr: descriptionAr || null,
        address: address || null,
        phone: phone || null,
        logo: logo || null,
      };

      // Always update currency if provided, otherwise keep existing value
      if (currency !== undefined && currency !== null && currency !== "") {
        updateData.currency = currency;
      }

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: req.user!.restaurantId },
        data: updateData,
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          descriptionAr: true,
          address: true,
          phone: true,
          logo: true,
          currency: true,
        } as any,
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

// Get restaurant settings (taxes)
router.get(
  "/settings",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId;

      let settings = await prisma.restaurantSettings.findUnique({
        where: { restaurantId },
      });

      // Create default settings if they don't exist
      if (!settings) {
        settings = await prisma.restaurantSettings.create({
          data: {
            restaurantId: restaurantId!,
            taxes: [],
          },
        });
      }

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      console.error("Get restaurant settings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update restaurant settings (taxes)
router.put(
  "/settings",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { taxes } = req.body;
      const restaurantId = req.user!.restaurantId;

      // Validate taxes array
      if (taxes && !Array.isArray(taxes)) {
        return res.status(400).json({
          success: false,
          message: "Taxes must be an array",
        });
      }

      // Validate maximum 3 taxes
      if (taxes && taxes.length > 3) {
        return res.status(400).json({
          success: false,
          message: "Maximum 3 taxes allowed",
        });
      }

      // Validate each tax
      if (taxes) {
        for (const tax of taxes) {
          if (!tax.name || tax.percentage === undefined) {
            return res.status(400).json({
              success: false,
              message: "Each tax must have a name and percentage",
            });
          }
          if (tax.percentage < 0 || tax.percentage > 100) {
            return res.status(400).json({
              success: false,
              message: "Tax percentage must be between 0 and 100",
            });
          }
        }
      }

      // Upsert settings
      const settings = await prisma.restaurantSettings.upsert({
        where: { restaurantId: restaurantId! },
        update: {
          taxes: taxes || [],
        },
        create: {
          restaurantId: restaurantId!,
          taxes: taxes || [],
        },
      });

      res.json({
        success: true,
        data: settings,
        message: "Settings updated successfully",
      });
    } catch (error) {
      console.error("Update restaurant settings error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get currency exchanges
router.get(
  "/currency-exchanges",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId;
      // For restaurant management, return all currencies (active and inactive)
      // Frontend will filter active ones when needed
      const currencyExchanges = await prisma.currencyExchange.findMany({
        where: {
          restaurantId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      res.json({
        success: true,
        data: currencyExchanges,
      });
    } catch (error) {
      console.error("Get currency exchanges error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Create or update currency exchange
router.post(
  "/currency-exchanges",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { currency, exchangeRate } = req.body;
      const restaurantId = req.user!.restaurantId;

      // Validate required fields
      if (!currency || !exchangeRate) {
        return res.status(400).json({
          success: false,
          message: "Currency and exchange rate are required",
        });
      }

      // Validate exchange rate is positive
      if (parseFloat(exchangeRate) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Exchange rate must be greater than 0",
        });
      }

      // Get restaurant base currency
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { currency: true },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      // Cannot add base currency as exchange
      if (currency.toUpperCase() === restaurant.currency.toUpperCase()) {
        return res.status(400).json({
          success: false,
          message: "Cannot add base currency as exchange currency",
        });
      }

      // Upsert currency exchange
      const currencyExchange = await prisma.currencyExchange.upsert({
        where: {
          restaurantId_currency: {
            restaurantId,
            currency: currency.toUpperCase(),
          },
        },
        update: {
          exchangeRate: parseFloat(exchangeRate),
          isActive: true,
        },
        create: {
          restaurantId,
          currency: currency.toUpperCase(),
          exchangeRate: parseFloat(exchangeRate),
        },
      });

      res.json({
        success: true,
        data: currencyExchange,
        message: "Currency exchange saved successfully",
      });
    } catch (error) {
      console.error("Create currency exchange error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update currency exchange
router.put(
  "/currency-exchanges/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { exchangeRate, isActive } = req.body;
      const restaurantId = req.user!.restaurantId;

      // Check if currency exchange exists and belongs to restaurant
      const existing = await prisma.currencyExchange.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Currency exchange not found",
        });
      }

      // Validate exchange rate if provided
      if (exchangeRate !== undefined) {
        if (parseFloat(exchangeRate) <= 0) {
          return res.status(400).json({
            success: false,
            message: "Exchange rate must be greater than 0",
          });
        }
      }

      const updateData: any = {};
      if (exchangeRate !== undefined) {
        updateData.exchangeRate = parseFloat(exchangeRate);
      }
      if (isActive !== undefined) {
        updateData.isActive = isActive;
      }

      const currencyExchange = await prisma.currencyExchange.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        data: currencyExchange,
        message: "Currency exchange updated successfully",
      });
    } catch (error) {
      console.error("Update currency exchange error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete currency exchange
router.delete(
  "/currency-exchanges/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId;

      // Check if currency exchange exists and belongs to restaurant
      const existing = await prisma.currencyExchange.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Currency exchange not found",
        });
      }

      await prisma.currencyExchange.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Currency exchange deleted successfully",
      });
    } catch (error) {
      console.error("Delete currency exchange error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
