import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

interface PlanLimits {
  maxTables: number;
  maxMenus: number;
  maxCategories: number;
  maxItems: number;
  canCustomizeTheme: boolean;
}

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    restaurantId?: string;
  };
}

// Helper function to get active subscription and plan limits
async function getPlanLimits(restaurantId: string): Promise<PlanLimits | null> {
  try {
    // Get the most recent active subscription (latest created)
    const subscription = await prisma.subscription.findFirst({
      where: {
        restaurantId: restaurantId,
        status: "ACTIVE",
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: "desc", // Get the most recently created subscription
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      maxTables: subscription.plan.maxTables,
      maxMenus: subscription.plan.maxMenus,
      maxCategories: subscription.plan.maxCategories,
      maxItems: subscription.plan.maxItems,
      canCustomizeTheme: subscription.plan.canCustomizeTheme,
    };
  } catch (error) {
    console.error("Error fetching plan limits:", error);
    return null;
  }
}

// Middleware to check table limits
export const checkTableLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    // Count current tables
    const currentTables = await prisma.qRCode.count({
      where: {
        restaurantId: restaurantId,
      },
    });

    if (currentTables > planLimits.maxTables) {
      return res.status(403).json({
        message: `You have reached the maximum number of tables (${planLimits.maxTables}) for your current plan. Please upgrade your plan to add more tables.`,
        limit: planLimits.maxTables,
        current: currentTables,
      });
    }

    next();
  } catch (error) {
    console.error("Table limits check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check bulk table limits (for multiple table creation)
export const checkBulkTableLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    // Count current tables
    const currentTables = await prisma.qRCode.count({
      where: {
        restaurantId: restaurantId,
      },
    });

    // Get the number of tables to be created
    let tablesToCreate = 0;

    if (req.body.count) {
      // For bulk-generate-sequential
      tablesToCreate = parseInt(req.body.count);
    } else if (req.body.tableNumbers && Array.isArray(req.body.tableNumbers)) {
      // For bulk-generate
      tablesToCreate = req.body.tableNumbers.length;
    }

    // Check if creating these tables would exceed the limit
    const totalAfterCreation = currentTables + tablesToCreate - 1;

    if (totalAfterCreation > planLimits.maxTables) {
      const availableSlots = Math.max(0, planLimits.maxTables - currentTables);
      return res.status(403).json({
        message: `Cannot create ${tablesToCreate} tables. You can only create ${availableSlots} more tables (${planLimits.maxTables} total limit). Please upgrade your plan to add more tables.`,
        limit: planLimits.maxTables,
        current: currentTables,
        requested: tablesToCreate,
        available: availableSlots,
      });
    }

    next();
  } catch (error) {
    console.error("Bulk table limits check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check menu limits
export const checkMenuLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    // Count current menus
    const currentMenus = await prisma.menu.count({
      where: {
        restaurantId: restaurantId,
      },
    });

    if (currentMenus >= planLimits.maxMenus) {
      return res.status(403).json({
        message: `You have reached the maximum number of menus (${planLimits.maxMenus}) for your current plan. Please upgrade your plan to add more menus.`,
        limit: planLimits.maxMenus,
        current: currentMenus,
      });
    }

    next();
  } catch (error) {
    console.error("Menu limits check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check category limits
export const checkCategoryLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;

    if (!restaurantId) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    // Count current categories
    const currentCategories = await prisma.category.count({
      where: {
        menu: {
          restaurantId: restaurantId,
        },
      },
    });

    if (currentCategories >= planLimits.maxCategories) {
      return res.status(403).json({
        message: `You have reached the maximum number of categories (${planLimits.maxCategories}) for your current plan. Please upgrade your plan to add more categories.`,
        limit: planLimits.maxCategories,
        current: currentCategories,
      });
    }

    next();
  } catch (error) {
    console.error("Category limits check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check item limits (total quota system)
export const checkItemLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(401).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    const { categoryId } = req.body;

    // Verify category belongs to restaurant
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        menu: {
          restaurantId: restaurantId,
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    // Calculate total quota: maxCategories × maxItems
    const totalQuota = planLimits.maxCategories * planLimits.maxItems;

    // Count total items across all categories for this restaurant
    const totalItems = await prisma.menuItem.count({
      where: {
        restaurantId: restaurantId,
      },
    });

    if (totalItems >= totalQuota) {
      return res.status(403).json({
        message: `You have reached the maximum total items limit (${totalQuota}) for your plan. Please upgrade your plan to add more items.`,
        totalQuota: totalQuota,
        currentTotal: totalItems,
        planCategories: planLimits.maxCategories,
        planItemsPerCategory: planLimits.maxItems,
      });
    }

    next();
  } catch (error) {
    console.error("Item limits check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check theme customization permission
export const checkThemePermission = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(401).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    if (!planLimits.canCustomizeTheme) {
      return res.status(403).json({
        message:
          "Theme customization is not available in your current plan. Please upgrade to a plan that supports theme customization.",
        feature: "theme_customization",
      });
    }

    next();
  } catch (error) {
    console.error("Theme permission check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check if restaurant has active subscription
export const checkActiveSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(401).json({ message: "Restaurant not found" });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        restaurantId: restaurantId,
        status: "ACTIVE",
      },
    });

    if (!subscription) {
      return res.status(403).json({
        message:
          "No active subscription found. Please subscribe to a plan to access this feature.",
        requiresSubscription: true,
      });
    }

    next();
  } catch (error) {
    console.error("Active subscription check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to check bulk import limits (Excel import)
export const checkBulkImportLimits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const restaurantId = req.user!.restaurantId!;
    if (!restaurantId) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const planLimits = await getPlanLimits(restaurantId);
    if (!planLimits) {
      return res.status(403).json({
        message: "No active subscription found",
      });
    }

    // Store plan limits in request for later use
    (req as any).planLimits = planLimits;

    next();
  } catch (error) {
    console.error("Bulk import limits check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Combined middleware for plan limits validation
export const validatePlanLimits = {
  checkTableLimits,
  checkBulkTableLimits,
  checkMenuLimits,
  checkCategoryLimits,
  checkItemLimits,
  checkThemePermission,
  checkActiveSubscription,
  checkBulkImportLimits,
};
