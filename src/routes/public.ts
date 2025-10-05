import express, { Response } from "express";
import { prisma } from "../lib/prisma";

const router = express.Router();

// Get all subscription plans (public)
router.get("/plans", async (req, res): Promise<any> => {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    res.json({
      success: true,
      data: {
        plans,
      },
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get restaurant menu for customers (no authentication required)
router.get("/menu/:restaurantId", async (req, res): Promise<any> => {
  try {
    const { restaurantId } = req.params;
    const tableNumber = req.query.tableNumber as string;

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        isActive: true,
      },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          include: {
            plan: true,
          },
        },
        theme: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (!restaurant.subscriptions?.length) {
      return res.status(403).json({
        success: false,
        message: "Restaurant subscription not active",
      });
    }

    // If tableNumber is provided, verify QR code exists
    if (tableNumber) {
      const qrCode = await prisma.qRCode.findFirst({
        where: {
          restaurantId,
          tableNumber,
          isActive: true,
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "Invalid table number or QR code",
        });
      }
    }

    // Get active menus with categories and items
    const menus = await prisma.menu.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      include: {
        categories: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get menu theme
    const menuTheme = await prisma.menuTheme.findUnique({
      where: {
        restaurantId,
      },
    });

    // If no theme exists, return default theme
    const defaultTheme = {
      id: "cmgahgiu5000f11967hiornqb",
      layoutType: "grid",
      showPrices: true,
      showImages: true,
      showDescriptions: true,
      primaryColor: "#f58114",
      secondaryColor: "#2797dd",
      backgroundColor: "#ffe59e",
      textColor: "#000000",
      accentColor: "#e2ee44",

      // Color Opacity Settings
      primaryColorOpacity: 0.5,
      secondaryColorOpacity: 1,
      backgroundColorOpacity: 0.7,
      textColorOpacity: 1,
      accentColorOpacity: 1,

      fontFamily: "Inter",
      headingSize: "text-2xl",
      bodySize: "text-base",
      priceSize: "text-lg",
      cardPadding: "p-4",
      cardMargin: "m-2",
      borderRadius: "rounded-lg",
      categoryStyle: "tabs",
      showCategoryImages: false,
      itemLayout: "vertical",
      imageAspect: "square",
      backgroundImage:
        "https://res.cloudinary.com/dnojeu5cs/image/upload/v1759501200/mymenus-images/uvimvqchjpshc45ighmx.jpg",
      backgroundOverlay: null,
      backgroundPosition: "center",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",

      // Background Overlay Opacity
      backgroundOverlayOpacity: 0.1,
      customBackgroundImage:
        "https://res.cloudinary.com/dnojeu5cs/image/upload/v1759501200/mymenus-images/uvimvqchjpshc45ighmx.jpg",

      customCSS: null,
    };

    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          nameAr: restaurant.nameAr,
          description: restaurant.description,
          descriptionAr: restaurant.descriptionAr,
          logo: restaurant.logo,
          theme: restaurant.theme,
        },
        tableNumber: tableNumber || null,
        menus,
        menuTheme: defaultTheme,
      },
    });
  } catch (error) {
    console.error("Get menu error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get restaurant menu categories only (without items) - for better performance
router.get("/menu/:restaurantId/categories", async (req, res): Promise<any> => {
  try {
    const { restaurantId } = req.params;

    // Verify restaurant exists and is active
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        isActive: true,
      },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
          include: {
            plan: true,
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

    if (!restaurant.subscriptions?.length) {
      return res.status(403).json({
        success: false,
        message: "Restaurant subscription not active",
      });
    }

    // Get active categories only (without items for better performance)
    const categories = await prisma.category.findMany({
      where: {
        menu: { restaurantId },
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        image: true,
        sortOrder: true,
        isActive: true,
        _count: {
          select: {
            items: {
              where: { isAvailable: true },
            },
          },
        },
      },
    });

    // Get menu theme
    const menuTheme = await prisma.menuTheme.findUnique({
      where: {
        restaurantId,
      },
    });

    // If no theme exists, return default theme
    const defaultTheme = {
      id: "cmgahgiu5000f11967hiornqb",
      layoutType: "grid",
      showPrices: true,
      showImages: true,
      showDescriptions: true,
      primaryColor: "#f58114",
      secondaryColor: "#2797dd",
      backgroundColor: "#ffe59e",
      textColor: "#000000",
      accentColor: "#e2ee44",

      // Color Opacity Settings
      primaryColorOpacity: 0.5,
      secondaryColorOpacity: 1,
      backgroundColorOpacity: 0.7,
      textColorOpacity: 1,
      accentColorOpacity: 1,

      fontFamily: "Inter",
      headingSize: "text-2xl",
      bodySize: "text-base",
      priceSize: "text-lg",
      cardPadding: "p-4",
      cardMargin: "m-2",
      borderRadius: "rounded-lg",
      categoryStyle: "tabs",
      showCategoryImages: false,
      itemLayout: "vertical",
      imageAspect: "square",
      backgroundImage:
        "https://res.cloudinary.com/dnojeu5cs/image/upload/v1759501200/mymenus-images/uvimvqchjpshc45ighmx.jpg",
      backgroundOverlay: null,
      backgroundPosition: "center",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",

      // Background Overlay Opacity
      backgroundOverlayOpacity: 0.1,
      customBackgroundImage:
        "https://res.cloudinary.com/dnojeu5cs/image/upload/v1759501200/mymenus-images/uvimvqchjpshc45ighmx.jpg",

      customCSS: null,
    };

    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          nameAr: restaurant.nameAr,
          description: restaurant.description,
          descriptionAr: restaurant.descriptionAr,
          logo: restaurant.logo,
        },
        categories,
        menuTheme: defaultTheme,
      },
    });
  } catch (error) {
    console.error("Get menu categories error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get restaurant menu for customers with table number (legacy route)
router.get(
  "/menu/:restaurantId/:tableNumber",
  async (req, res): Promise<any> => {
    try {
      const { restaurantId, tableNumber } = req.params;

      // Verify restaurant exists and is active
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          isActive: true,
        },
        include: {
          subscriptions: {
            where: {
              status: "ACTIVE",
            },
            include: {
              plan: true,
            },
          },
          theme: true,
        },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found or inactive",
        });
      }

      if (!restaurant.subscriptions?.length) {
        return res.status(403).json({
          success: false,
          message: "Restaurant subscription is not active",
        });
      }

      // Verify QR code exists and is active
      const qrCode = await prisma.qRCode.findFirst({
        where: {
          restaurantId,
          tableNumber,
          isActive: true,
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "Invalid table number or QR code",
        });
      }

      // Get active menus with categories and items
      const menus = await prisma.menu.findMany({
        where: {
          restaurantId,
          isActive: true,
        },
        include: {
          categories: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                where: { isAvailable: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      res.json({
        success: true,
        data: {
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            nameAr: restaurant.nameAr,
            description: restaurant.description,
            descriptionAr: restaurant.descriptionAr,
            logo: restaurant.logo,
            theme: restaurant.theme,
          },
          tableNumber,
          menus,
        },
      });
    } catch (error) {
      console.error("Get public menu error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get restaurant info for QR code validation
router.get("/restaurant/:restaurantId", async (req, res): Promise<any> => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        isActive: true,
      },
      include: {
        subscriptions: {
          where: {
            status: "ACTIVE",
          },
        },
        theme: true,
      },
    });

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found or inactive",
      });
    }

    if (!restaurant.subscriptions) {
      return res.status(403).json({
        success: false,
        message: "Restaurant subscription is not active",
      });
    }

    res.json({
      success: true,
      data: {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          nameAr: restaurant.nameAr,
          description: restaurant.description,
          descriptionAr: restaurant.descriptionAr,
          logo: restaurant.logo,
          theme: restaurant.theme,
        },
      },
    });
  } catch (error) {
    console.error("Get restaurant info error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get items for a specific category (public access)
router.get(
  "/menu/:restaurantId/categories/:categoryId/items",
  async (req, res): Promise<any> => {
    try {
      const { restaurantId, categoryId } = req.params;

      // Verify restaurant exists and is active
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          isActive: true,
        },
        include: {
          subscriptions: {
            where: {
              status: "ACTIVE",
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

      if (!restaurant.subscriptions?.length) {
        return res.status(403).json({
          success: false,
          message: "Restaurant subscription not active",
        });
      }

      // Verify category exists and belongs to this restaurant
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          menu: { restaurantId },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          nameAr: true,
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Get items for this category
      const items = await prisma.menuItem.findMany({
        where: {
          categoryId,
          isAvailable: true,
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          descriptionAr: true,
          price: true,
          currency: true,
          image: true,
          extras: true,
          sortOrder: true,
          isAvailable: true,
          discount: true,
        },
      });

      res.json({
        success: true,
        data: {
          category,
          items,
        },
      });
    } catch (error) {
      console.error("Get category items error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Health check for public API
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Public API is healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
