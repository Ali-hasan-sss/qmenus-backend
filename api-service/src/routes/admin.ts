import express, { Response } from "express";
import prisma from "../../../shared/config/db";
import { env } from "../../../shared/config/env";
import * as bcrypt from "bcryptjs";
import { authenticate, AuthRequest, authorize } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createNotification,
  createAdminNotification,
  createActivity,
  createNotificationByRole,
} from "../helpers/subscriptionHelpers";
import {
  createPlanSchema,
  updatePlanSchema,
  createUserSchema,
  updateUserSchema,
} from "../validators/adminValidators";

const router = express.Router();

// Helper function to generate invoice number
const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `INV-${year}${month}${day}-${random}`;
};

// Helper function to create invoice
const createInvoice = async (
  restaurantId: string,
  subscriptionId: string,
  planId: string,
  invoiceType: string,
  amount: number,
  description: string,
  status: string = "PENDING"
) => {
  try {
    // Get restaurant and plan details
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { owner: true },
    });

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!restaurant || !plan) {
      throw new Error("Restaurant or plan not found");
    }

    // Calculate due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: generateInvoiceNumber(),
        type: invoiceType as any,
        status: status as any,
        amount: amount,
        currency: "SYP",
        description: description,
        customerName: `${restaurant.owner.firstName} ${restaurant.owner.lastName}`,
        customerEmail: restaurant.owner.email,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        restaurantId: restaurantId,
        subscriptionId: subscriptionId,
        planId: planId,
        planName: plan.name,
        planDuration: plan.duration,
        dueDate: dueDate,
        totalAmount: amount,
        paidDate: status === "PAID" ? new Date() : null,
      },
    });

    return invoice;
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
};

// Admin-only routes
router.use(authenticate);
router.use(authorize("ADMIN"));

// Plan Management

// Create subscription plan
export const createPlan = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      type,
      billingPeriod,
      price,
      currency,
      duration,
      maxTables,
      maxMenus,
      features,
    } = req.body;

    const { maxCategories, maxItems, canCustomizeTheme, isFree } = req.body;

    const plan = await prisma.plan.create({
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        type,
        billingPeriod: billingPeriod || "MONTHLY",
        price,
        currency: currency || "USD",
        duration,
        maxTables,
        maxMenus,
        maxCategories: maxCategories || 1,
        maxItems: maxItems || 5,
        canCustomizeTheme: canCustomizeTheme || false,
        isFree: isFree || false,
        features: features || [],
        creatorId: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      message: "Plan created successfully",
      data: { plan },
    });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.post("/plans", validateRequest(createPlanSchema), createPlan);

// Get all plans
export const getPlans = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, status = "all" } = req.query;

    const whereClause: any = {};
    if (status !== "all") {
      whereClause.isActive = status === "active";
    }

    const plans = await prisma.plan.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    const total = await prisma.plan.count({
      where: whereClause,
    });

    res.json({
      success: true,
      data: {
        plans,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

router.get("/plans", getPlans);

// Update plan
router.put(
  "/plans/:id",
  validateRequest(updatePlanSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const plan = await prisma.plan.findUnique({
        where: { id },
      });

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      const updatedPlan = await prisma.plan.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: "Plan updated successfully",
        data: { plan: updatedPlan },
      });
    } catch (error) {
      console.error("Update plan error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Toggle plan active status
router.put("/plans/:id/toggle", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: { isActive: !plan.isActive },
    });

    res.json({
      success: true,
      message: `Plan ${
        updatedPlan.isActive ? "activated" : "deactivated"
      } successfully`,
      data: { plan: updatedPlan },
    });
  } catch (error) {
    console.error("Toggle plan status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Restaurant Management

// Get all restaurants
router.get("/restaurants", async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, status = "all" } = req.query;

    const whereClause: any = {};
    if (status !== "all") {
      whereClause.isActive = status === "active";
    }

    const restaurants = await prisma.restaurant.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            qrCodes: true,
            menus: true,
            orders: true,
          },
        },
      },
    });

    const total = await prisma.restaurant.count({
      where: whereClause,
    });

    res.json({
      success: true,
      data: {
        restaurants,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get restaurants error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get restaurant details
router.get("/restaurants/:id", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
        qrCodes: {
          orderBy: { createdAt: "desc" },
        },
        menus: {
          include: {
            _count: {
              select: {
                categories: true,
              },
            },
          },
        },
        _count: {
          select: {
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
});

// Toggle restaurant active status
router.put(
  "/restaurants/:id/toggle",
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      const restaurant = await prisma.restaurant.findUnique({
        where: { id },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      const updatedRestaurant = await prisma.restaurant.update({
        where: { id },
        data: { isActive: !restaurant.isActive },
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

// User Management

// Old create user route removed - using the new one below

// Get all users
router.get("/users", async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 10, role, status = "all" } = req.query;

    const whereClause: any = {};
    if (role) {
      whereClause.role = role;
    }
    if (status !== "all") {
      whereClause.isActive = status === "active";
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            subscriptions: {
              include: {
                plan: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    type: true,
                    price: true,
                    duration: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    const total = await prisma.user.count({
      where: whereClause,
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Search users with advanced filters
router.get("/users/search", async (req: AuthRequest, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      role = "",
      status = "",
    } = req.query;

    const whereClause: any = {};

    // Search in email, firstName, lastName, and restaurant names
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        {
          restaurants: {
            some: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (role && role !== "ALL") {
      whereClause.role = role;
    }

    if (status && status !== "ALL") {
      whereClause.isActive = status === "ACTIVE";
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            subscriptions: {
              include: {
                plan: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    type: true,
                    price: true,
                    duration: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
        },
      },
    });

    const total = await prisma.user.count({
      where: whereClause,
    });

    res.json({
      success: true,
      data: {
        users,
        total,
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
        hasPrevPage: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update user
router.put(
  "/users/:id",
  validateRequest(updateUserSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        include: {
          restaurants: true,
        },
      });

      res.json({
        success: true,
        message: "User updated successfully",
        data: { user: updatedUser },
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Toggle user active status
router.put("/users/:id/toggle", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    res.json({
      success: true,
      message: `User ${
        updatedUser.isActive ? "activated" : "deactivated"
      } successfully`,
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Toggle user status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get recent activities
router.get("/activities", async (req: AuthRequest, res) => {
  try {
    // Get activities from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const activities = await prisma.activity.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Limit to 10 most recent activities
    });

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error("Get activities error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Platform Statistics
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const [
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      activeUsers,
      totalOrders,
      orderRevenue,
      subscriptionRevenue,
      totalPlans,
      activeSubscriptions,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.restaurant.count({ where: { isActive: true } }),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.aggregate({
        where: { status: "COMPLETED" },
        _sum: { totalPrice: true },
      }),
      prisma.invoice.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.plan.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
    ]);

    // Calculate total revenue from subscriptions only (admin revenue)
    const totalRevenue = Number(subscriptionRevenue._sum.totalAmount || 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalRestaurants,
        activeSubscriptions,
        totalRevenue,
        recentOrders: totalOrders,
        restaurants: {
          total: totalRestaurants,
          active: activeRestaurants,
          inactive: totalRestaurants - activeRestaurants,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: totalUsers - activeUsers,
        },
        orders: {
          total: totalOrders,
          revenue: Number(orderRevenue._sum.totalPrice || 0),
        },
        subscriptions: {
          revenue: Number(subscriptionRevenue._sum.totalAmount || 0),
        },
        plans: {
          total: totalPlans,
        },
      },
    });
  } catch (error) {
    console.error("Get platform stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update user status
router.put("/users/:id/status", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Delete user
router.delete("/users/:id", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Prevent admin from deleting themselves
    if (id === adminId) {
      return res.status(403).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Get user with restaurants to check if they own any
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        restaurants: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If user owns restaurants, we need to handle them first
    if (user.restaurants && user.restaurants.length > 0) {
      console.log(
        `🗑️ Found ${user.restaurants.length} restaurants owned by user ${id}`
      );

      // Get all restaurant IDs owned by this user
      const restaurantIds = user.restaurants.map((r: { id: string }) => r.id);

      // Delete all subscriptions for these restaurants first
      const deletedSubscriptions = await prisma.subscription.deleteMany({
        where: {
          restaurantId: { in: restaurantIds },
        },
      });
      console.log(`🗑️ Deleted ${deletedSubscriptions.count} subscriptions`);

      // Delete all orders for these restaurants
      const deletedOrders = await prisma.order.deleteMany({
        where: {
          restaurantId: { in: restaurantIds },
        },
      });
      console.log(`🗑️ Deleted ${deletedOrders.count} orders`);

      // Delete all QR codes for these restaurants
      const deletedQRCodes = await prisma.qRCode.deleteMany({
        where: {
          restaurantId: { in: restaurantIds },
        },
      });
      console.log(`🗑️ Deleted ${deletedQRCodes.count} QR codes`);

      // Delete all menus for these restaurants
      const deletedMenus = await prisma.menu.deleteMany({
        where: {
          restaurantId: { in: restaurantIds },
        },
      });
      console.log(`🗑️ Deleted ${deletedMenus.count} menus`);

      // Delete all invoices for these restaurants
      const deletedInvoices = await prisma.invoice.deleteMany({
        where: {
          restaurantId: { in: restaurantIds },
        },
      });
      console.log(`🗑️ Deleted ${deletedInvoices.count} invoices`);

      // Delete all notifications for these restaurants
      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          restaurantId: { in: restaurantIds },
        },
      });
      console.log(`🗑️ Deleted ${deletedNotifications.count} notifications`);

      // Now delete the restaurants
      await prisma.restaurant.deleteMany({
        where: { ownerId: id },
      });

      console.log(
        `✅ Deleted ${user.restaurants.length} restaurants owned by user ${id}`
      );
    }

    // Now delete the user
    await prisma.user.delete({
      where: { id },
    });

    console.log(`✅ User ${id} deleted successfully`);

    res.json({
      success: true,
      message: "User and associated restaurants deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete user error:", error);

    // Check if it's a foreign key constraint error
    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete user due to database constraints. Please contact support.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Update plan
router.put("/plans/:id", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      type,
      billingPeriod,
      price,
      duration,
      maxTables,
      maxMenus,
      maxCategories,
      maxItems,
      canCustomizeTheme,
      isFree,
      features,
    } = req.body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        nameAr,
        description,
        descriptionAr,
        type,
        billingPeriod,
        price,
        duration,
        maxTables,
        maxMenus,
        maxCategories,
        maxItems,
        canCustomizeTheme,
        isFree,
        features: features || [],
      },
    });

    res.json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Delete plan
router.delete("/plans/:id", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    // Check if plan exists
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // Check if plan has active subscriptions
    if (plan._count.subscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete plan. This plan has ${plan._count.subscriptions} active subscription(s). Please cancel or delete all subscriptions first.`,
      });
    }

    await prisma.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Plan deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete plan error:", error);
    
    // Handle foreign key constraint error
    if (error.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete plan. This plan is associated with one or more subscriptions. Please cancel or delete all subscriptions first.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get all subscriptions
router.get("/subscriptions", async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 25, status, search } = req.query;

    const andConditions: any[] = [];
    if (status && status !== "ALL") {
      andConditions.push({ status });
    }
    const searchTerm =
      typeof search === "string" ? search.trim() : "";
    if (searchTerm) {
      andConditions.push({
        OR: [
          {
            restaurant: {
              owner: {
                email: { contains: searchTerm, mode: "insensitive" },
              },
            },
          },
          {
            restaurant: {
              owner: {
                firstName: { contains: searchTerm, mode: "insensitive" },
              },
            },
          },
          {
            restaurant: {
              owner: {
                lastName: { contains: searchTerm, mode: "insensitive" },
              },
            },
          },
          {
            restaurant: {
              name: { contains: searchTerm, mode: "insensitive" },
            },
          },
        ],
      });
    }
    const whereClause =
      andConditions.length > 0 ? { AND: andConditions } : {};

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        restaurant: {
          include: {
            owner: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            type: true,
            price: true,
            duration: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.subscription.count({
      where: whereClause,
    });

    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Create subscription
router.post("/subscriptions", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { restaurantId, planId, duration } = req.body;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    // If the new plan is not free, cancel all active free plan subscriptions
    if (!plan.isFree) {
      // Get free plan
      const freePlan = await prisma.plan.findFirst({
        where: { isFree: true },
      });

      if (freePlan) {
        // Cancel all active free plan subscriptions for this restaurant
        await prisma.subscription.updateMany({
          where: {
            restaurantId,
            planId: freePlan.id,
            status: "ACTIVE",
          },
          data: {
            status: "CANCELLED",
          },
        });
        console.log(
          `✅ Cancelled free plan subscriptions for restaurant ${restaurantId}`
        );
      }
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (duration || plan.duration));

    const subscription = await prisma.subscription.create({
      data: {
        restaurantId,
        planId,
        status: "ACTIVE",
        startDate,
        endDate,
      },
      include: {
        plan: true,
        restaurant: true,
      },
    });

    // Activate restaurant if it was deactivated
    if (!subscription.restaurant.isActive) {
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { isActive: true },
      });
      console.log(
        `✅ Restaurant ${subscription.restaurant.name} (${restaurantId}) reactivated due to new subscription`
      );
    }

    // Create invoice for the subscription (marked as PAID since admin created it)
    try {
      await createInvoice(
        restaurantId,
        subscription.id,
        planId,
        "SUBSCRIPTION",
        Number(plan.price),
        `اشتراك في الخطة ${subscription.plan.name} لمدة ${plan.duration} يوم`,
        "PAID"
      );
    } catch (error) {
      console.error("Error creating invoice:", error);
    }

    // Send notification to restaurant owner
    await createNotification(
      restaurantId,
      "تم إنشاء اشتراكك الجديد",
      `تم إنشاء اشتراكك في الخطة ${
        subscription.plan.name
      } بنجاح. ينتهي الاشتراك في ${endDate.toLocaleDateString()}. يمكنك رؤية الفاتورة في صفحة الفواتير.`,
      "SUBSCRIPTION_CREATED"
    );

    // Send notification to admin
    await createAdminNotification(
      "اشتراك جديد تم إنشاؤه",
      `تم إنشاء اشتراك جديد للمطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name}`,
      "SUBSCRIPTION",
      restaurantId
    );

    // Create activity for admin dashboard
    await createActivity(
      "subscription_created",
      `تم إنشاء اشتراك جديد للمطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name}`,
      {
        restaurantName: subscription.restaurant.name,
        planName: subscription.plan.name,
        subscriptionId: subscription.id,
        restaurantId: restaurantId,
      }
    );

    res.json({
      success: true,
      data: { subscription },
    });
  } catch (error) {
    console.error("Create subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Cancel subscription
router.put(
  "/subscriptions/:id/cancel",
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: { restaurant: true, plan: true },
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      // Send notification to restaurant owner
      await createNotification(
        subscription.restaurantId,
        "تم إلغاء اشتراكك",
        `تم إلغاء اشتراكك في الخطة ${subscription.plan.name}. يمكنك الاشتراك مرة أخرى في أي وقت.`,
        "GENERAL"
      );

      // Send notification to admin
      await createAdminNotification(
        "اشتراك تم إلغاؤه",
        `تم إلغاء اشتراك المطعم ${subscription.restaurant.name} في الخطة ${subscription.plan.name}`,
        "CANCELLATION",
        subscription.restaurantId
      );

      res.json({
        success: true,
        data: { subscription: updatedSubscription },
      });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Renew subscription
router.put(
  "/subscriptions/:id/renew",
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: { plan: true, restaurant: true },
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Calculate new end date by adding plan duration to current end date
      const currentEndDate = subscription.endDate
        ? new Date(subscription.endDate)
        : new Date();
      const newEndDate = new Date(currentEndDate);
      newEndDate.setDate(newEndDate.getDate() + subscription.plan.duration);

      const updatedSubscription = await prisma.subscription.update({
        where: { id },
        data: {
          status: "ACTIVE",
          endDate: newEndDate,
        },
        include: { plan: true, restaurant: true },
      });

      // Activate restaurant if it was deactivated
      if (!updatedSubscription.restaurant.isActive) {
        await prisma.restaurant.update({
          where: { id: updatedSubscription.restaurantId },
          data: { isActive: true },
        });
        console.log(
          `✅ Restaurant ${updatedSubscription.restaurant.name} (${updatedSubscription.restaurantId}) reactivated due to subscription renewal`
        );
      }

      // Create invoice for the renewal (marked as PAID since admin renewed it)
      try {
        await createInvoice(
          subscription.restaurantId,
          subscription.id,
          subscription.planId,
          "RENEWAL",
          Number(subscription.plan.price),
          `تجديد اشتراك في الخطة ${subscription.plan.name} لمدة ${subscription.plan.duration} يوم`,
          "PAID"
        );
      } catch (error) {
        console.error("Error creating invoice:", error);
      }

      // Send notification to restaurant owner
      await createNotification(
        subscription.restaurantId,
        "تم تجديد اشتراكك",
        `تم تجديد اشتراكك في الخطة ${subscription.plan.name} بنجاح. تم إضافة ${
          subscription.plan.duration
        } يوم إضافي. ينتهي الاشتراك الجديد في ${newEndDate.toLocaleDateString()}. يمكنك رؤية الفاتورة في صفحة الفواتير.`,
        "SUBSCRIPTION_RENEWED"
      );

      res.json({
        success: true,
        data: { subscription: updatedSubscription },
      });
    } catch (error) {
      console.error("Renew subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Upgrade subscription
router.put(
  "/subscriptions/:id/upgrade",
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { planId } = req.body;

      const subscription = await prisma.subscription.findUnique({
        where: { id },
        include: { plan: true, restaurant: true },
      });

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      const newPlan = await prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!newPlan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      // Cancel ALL active subscriptions for this restaurant
      await prisma.subscription.updateMany({
        where: {
          restaurantId: subscription.restaurantId,
          status: "ACTIVE",
        },
        data: {
          status: "CANCELLED",
        },
      });

      // Create new subscription with the new plan starting from today
      const startDate = new Date();
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + newPlan.duration);

      const newSubscription = await prisma.subscription.create({
        data: {
          restaurantId: subscription.restaurantId,
          planId: planId,
          status: "ACTIVE",
          startDate: startDate,
          endDate: newEndDate,
        },
        include: { plan: true, restaurant: true },
      });

      // Activate restaurant if it was deactivated
      if (!newSubscription.restaurant.isActive) {
        await prisma.restaurant.update({
          where: { id: newSubscription.restaurantId },
          data: { isActive: true },
      });
        console.log(
          `✅ Restaurant ${newSubscription.restaurant.name} (${newSubscription.restaurantId}) reactivated due to subscription upgrade`
        );
      }

      // Create invoice for the upgrade (marked as PAID since admin upgraded it)
      try {
        await createInvoice(
          subscription.restaurantId,
          newSubscription.id,
          planId,
          "UPGRADE",
          Number(newPlan.price),
          `ترقية من الخطة ${subscription.plan.name} إلى ${newPlan.name} لمدة ${newPlan.duration} يوم`,
          "PAID"
        );
      } catch (error) {
        console.error("Error creating invoice:", error);
      }

      // Send notification to restaurant owner
      await createNotification(
        subscription.restaurantId,
        "تم ترقية اشتراكك",
        `تم ترقية اشتراكك من ${subscription.plan.name} إلى ${
          newPlan.name
        }. تم إلغاء الاشتراك السابق وإنشاء اشتراك جديد يبدأ من اليوم وينتهي في ${newEndDate.toLocaleDateString()}. يمكنك رؤية الفاتورة في صفحة الفواتير.`,
        "SUBSCRIPTION_UPGRADED"
      );

      res.json({
        success: true,
        data: { subscription: newSubscription },
      });
    } catch (error) {
      console.error("Upgrade subscription error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// NOTE: Subscription checks are now handled automatically by jobs-service
// These endpoints have been removed as they are no longer needed

// Get all invoices (Admin only)
router.get("/invoices", async (req: AuthRequest, res): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      restaurantId,
      search,
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (restaurantId) where.restaurantId = restaurantId;

    // Search functionality
    if (search) {
      const searchTerm = search as string;
      where.OR = [
        { customerName: { contains: searchTerm, mode: "insensitive" } },
        { customerEmail: { contains: searchTerm, mode: "insensitive" } },
        { restaurantName: { contains: searchTerm, mode: "insensitive" } },
        {
          restaurant: {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              {
                owner: {
                  OR: [
                    {
                      firstName: { contains: searchTerm, mode: "insensitive" },
                    },
                    { lastName: { contains: searchTerm, mode: "insensitive" } },
                    { email: { contains: searchTerm, mode: "insensitive" } },
                  ],
                },
              },
            ],
          },
        },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              type: true,
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
    console.error("Get invoices error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get invoice by ID
router.get("/invoices/:id", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
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
});

// Update invoice status
router.put(
  "/invoices/:id/status",
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["PENDING", "PAID", "CANCELLED", "REFUNDED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      const updateData: any = { status };
      if (status === "PAID") {
        updateData.paidDate = new Date();
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        data: { invoice },
      });
    } catch (error) {
      console.error("Update invoice status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get revenue statistics
router.get("/revenue/stats", async (req: AuthRequest, res): Promise<any> => {
  try {
    const { period = "month" } = req.query;

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case "day":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    const [totalRevenue, paidInvoices, pendingInvoices, revenueByType] =
      await Promise.all([
        // Total revenue
        prisma.invoice.aggregate({
          where: {
            status: "PAID",
            paidDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            totalAmount: true,
          },
        }),

        // Paid invoices count
        prisma.invoice.count({
          where: {
            status: "PAID",
            paidDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),

        // Pending invoices count
        prisma.invoice.count({
          where: {
            status: "PENDING",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),

        // Revenue by type
        prisma.invoice.groupBy({
          by: ["type"],
          where: {
            status: "PAID",
            paidDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: {
            totalAmount: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        paidInvoices,
        pendingInvoices,
        revenueByType,
        period,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Get revenue stats error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Send notifications to restaurants
router.post(
  "/notifications/send",
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { title, body, type, sendTo, restaurantIds } = req.body;

      let targetRestaurants: string[] = [];

      if (sendTo === "ALL") {
        const restaurants = await prisma.restaurant.findMany({
          where: { isActive: true },
          select: { id: true },
        });
        targetRestaurants = restaurants.map((r: { id: string }) => r.id);
      } else if (sendTo === "SELECTED") {
        targetRestaurants = restaurantIds;
      }

      // Create notifications for all target restaurants
      const notifications = await Promise.all(
        targetRestaurants.map((restaurantId) =>
          prisma.notification.create({
            data: {
              restaurantId,
              title,
              body,
              type: type || "GENERAL",
            },
          })
        )
      );

      // Send real-time notifications via socket-service
      try {
        const axios = require("axios");
        const socketServiceUrl =
          env.SOCKET_SERVICE_URL ||
          `http://localhost:${env.SOCKET_PORT || "5001"}`;

        // Send each notification to its restaurant via socket
        for (const notification of notifications) {
          await axios.post(`${socketServiceUrl}/api/emit-notification`, {
            notification,
            restaurantIds: [notification.restaurantId],
          });
        }

        console.log(
          `✅ Sent ${notifications.length} real-time notifications via socket`
        );
      } catch (socketError: any) {
        console.error(
          "⚠️ Socket notification error:",
          socketError?.message || socketError
        );
        // Continue anyway - notifications are saved in DB
      }

      res.json({
        success: true,
        message: `Notification sent to ${targetRestaurants.length} restaurants`,
        data: { count: notifications.length },
      });
    } catch (error) {
      console.error("Send notification error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update admin profile
router.put("/profile", async (req: AuthRequest, res): Promise<any> => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { firstName, lastName, email } = req.body;

    const user = await prisma.user.update({
      where: { id: adminId },
      data: {
        firstName,
        lastName,
        email,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Change admin password
router.put("/password", async (req: AuthRequest, res): Promise<any> => {
  try {
    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { currentPassword, newPassword } = req.body;
    const bcrypt = require("bcryptjs");

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Admin notifications routes
router.get("/notifications", authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 25 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Get notifications for this admin user only
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
      where: {
        userId: userId, // Only notifications for this admin
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({
        where: {
          userId: userId,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
});

// Get unread count for admin
router.get(
  "/notifications/unread-count",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;

      const count = await prisma.notification.count({
        where: {
          userId: userId,
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

// Mark notification as read for admin
router.put(
  "/notifications/:id/read",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await prisma.notification.update({
        where: {
          id,
          userId: userId, // Ensure admin can only update their own notifications
        },
        data: { isRead: true },
      });

      res.json({
        success: true,
        message: "Notification marked as read",
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

router.delete(
  "/notifications/:id",
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      await prisma.notification.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Notification deleted successfully",
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

// Create user
router.post(
  "/users",
  validateRequest(createUserSchema),
  async (req: AuthRequest, res) => {
    try {
      console.log("🚀 Starting user creation process...");

      const {
        firstName,
        lastName,
        email: rawEmail,
        password,
        role,
        restaurant,
        planId,
      } = req.body;

      // Normalize email: convert to lowercase and trim whitespace
      const email = rawEmail ? rawEmail.trim().toLowerCase() : "";

      console.log("👤 Creating user with data:", {
        firstName,
        lastName,
        email,
        role,
        restaurant,
        planId,
      });

      // Validate required fields
      if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role,
          isActive: true,
        },
      });

      // If role is OWNER, create restaurant and subscription
      console.log("🔍 Checking conditions:", {
        role,
        isOwner: role === "OWNER",
        restaurant,
        hasRestaurant: !!restaurant,
        planId,
        hasPlanId: !!planId,
        allConditions: role === "OWNER" && restaurant && planId,
      });

      if (role === "OWNER" && restaurant && planId) {
        console.log("🏪 Creating restaurant for OWNER user:", {
          restaurant,
          planId,
        });

        // Validate restaurant data
        if (!restaurant.name || !restaurant.nameAr) {
          return res.status(400).json({
            success: false,
            message: "Restaurant name is required for restaurant owners",
          });
        }

        // Get plan details
        const plan = await prisma.plan.findUnique({
          where: { id: planId },
        });

        if (!plan) {
          return res.status(400).json({
            success: false,
            message: "Invalid plan selected",
          });
        }

        console.log("📋 Plan found:", plan);

        // Create restaurant and link it to the user
        const createdRestaurant = await prisma.restaurant.create({
          data: {
            name: restaurant.name,
            nameAr: restaurant.nameAr,
            address: "",
            phone: "",
            description: "",
            descriptionAr: "",
            ownerId: user.id,
          },
        });

        console.log("✅ Restaurant created:", createdRestaurant);

        // Update user to include the restaurant relationship
        await prisma.user.update({
          where: { id: user.id },
          data: {
            restaurants: {
              connect: { id: createdRestaurant.id },
            },
          },
        });

        console.log("✅ Restaurant linked to user:", user.id);

        // If the plan is not free, cancel any existing free plan subscriptions
        if (!plan.isFree) {
          // Get free plan
          const freePlan = await prisma.plan.findFirst({
            where: { isFree: true },
          });

          if (freePlan) {
            // Cancel all active free plan subscriptions for this restaurant
            await prisma.subscription.updateMany({
              where: {
                restaurantId: createdRestaurant.id,
                planId: freePlan.id,
                status: "ACTIVE",
              },
              data: {
                status: "CANCELLED",
              },
            });
            console.log(
              `✅ Cancelled free plan subscriptions for restaurant ${createdRestaurant.id}`
            );
          }
        }

        // Create subscription
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.duration);

        const subscription = await prisma.subscription.create({
          data: {
            restaurantId: createdRestaurant.id,
            planId: plan.id,
            startDate,
            endDate,
            status: "ACTIVE",
          },
        });

        console.log("✅ Subscription created:", subscription);

        // Create invoice
        await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-${Date.now()}`,
            type: "SUBSCRIPTION",
            status: "PAID",
            amount: plan.price,
            currency: "SYP",
            description: `Subscription for ${plan.name}`,
            customerName: `${firstName} ${lastName}`,
            customerEmail: email,
            customerPhone: "",
            restaurantName: restaurant.name,
            restaurantAddress: "",
            subscriptionId: subscription.id,
            planId: plan.id,
            planName: plan.name,
            planDuration: plan.duration,
            issueDate: startDate,
            dueDate: endDate,
            paidDate: startDate,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount: plan.price,
            restaurantId: createdRestaurant.id,
          },
        });

        // Send notifications
        await createNotification(
          createdRestaurant.id,
          `مرحباً بك في منصة قوائمي! تم إنشاء حسابك بنجاح.`,
          `مرحباً بك في منصة قوائمي! تم إنشاء حسابك بنجاح.`,
          "WELCOME"
        );
        await createNotification(
          createdRestaurant.id,
          `تم تفعيل الخطة المجانية لمطعمك. استمتع بخدماتنا!`,
          `تم تفعيل الخطة المجانية لمطعمك. استمتع بخدماتنا! يمكنك رؤية الفاتورة في صفحة الفواتير.`,
          "SUBSCRIPTION"
        );

        // Notify admin
        await createAdminNotification(
          `تم تسجيل مطعم جديد: ${restaurant.name} من قبل ${firstName} ${lastName}`,
          `تم تسجيل مطعم جديد: ${restaurant.name} من قبل ${firstName} ${lastName}`,
          "RESTAURANT_REGISTRATION",
          ""
        );

        // Fetch the updated user with restaurant and subscription data
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            restaurants: {
              include: {
                subscriptions: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
        });

        console.log(
          "✅ Final user data with restaurant and subscription:",
          updatedUser
        );

        return res.json({
          success: true,
          message: "User created successfully with restaurant and subscription",
          data: {
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              createdAt: user.createdAt,
            },
            restaurant: {
              id: createdRestaurant.id,
              name: createdRestaurant.name,
              nameAr: createdRestaurant.nameAr,
            },
            subscription: {
              id: subscription.id,
              planName: plan.name,
              planNameAr: plan.nameAr,
              status: subscription.status,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
            },
            plan: {
              id: plan.id,
              name: plan.name,
              nameAr: plan.nameAr,
              type: plan.type,
              price: plan.price,
              duration: plan.duration,
            },
          },
        });
      } else {
        console.log("❌ Not creating restaurant. Conditions not met:", {
          role,
          restaurant,
          planId,
          reason: !restaurant
            ? "No restaurant data"
            : !planId
            ? "No plan ID"
            : "Role not OWNER",
        });

        return res.json({
          success: true,
          message: "User created successfully",
          data: {
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              createdAt: user.createdAt,
            },
          },
        });
      }
    } catch (error) {
      console.error("Error creating user:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
