import express, { Response } from "express";
import prisma from "../../../shared/config/db";
import { DEFAULT_THEME } from "../constants/defaultTheme";
import {
  sendContactUsEmail,
  sendContactUsEmailEN,
} from "../helpers/emailHelpers";

const router = express.Router();

// List public restaurants (active + active subscription), optional search by name
router.get("/restaurants", async (req, res): Promise<any> => {
  try {
    const q = (req.query.q as string)?.trim()?.toLowerCase();
    const where: any = {
      isActive: true,
      subscriptions: {
        some: {
          status: "ACTIVE",
        },
      },
    };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
      ];
    }
    const restaurants = await prisma.restaurant.findMany({
      where,
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        logo: true,
        currency: true,
        address: true,
        phone: true,
      },
      orderBy: { name: "asc" },
      take: 50,
    });
    res.json({
      success: true,
      data: { restaurants },
    });
  } catch (error) {
    console.error("List restaurants error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Search menu items globally; return restaurants that have matching items
router.get("/search/items", async (req, res): Promise<any> => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length === 0) {
      return res.json({
        success: true,
        data: { restaurants: [], query: q },
      });
    }
    const searchTerm = q.toLowerCase();
    const items = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        category: {
          isActive: true,
          menu: {
            isActive: true,
            restaurant: {
              isActive: true,
              subscriptions: {
                some: { status: "ACTIVE" },
              },
            },
          },
        },
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { nameAr: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
          { descriptionAr: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        price: true,
        image: true,
        restaurantId: true,
        restaurants: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            logo: true,
            currency: true,
            address: true,
            phone: true,
          },
        },
      },
      take: 200,
    });
    const byRestaurant = new Map<
      string,
      {
        restaurant: { id: string; name: string; nameAr: string | null; logo: string | null; currency: string; address: string | null; phone: string | null };
        matchCount: number;
        sampleItems: Array<{ id: string; name: string; nameAr: string | null; price: any; image: string | null }>;
      }
    >();
    for (const item of items) {
      const rid = item.restaurantId;
      const rest = item.restaurants;
      if (!byRestaurant.has(rid)) {
        byRestaurant.set(rid, {
          restaurant: {
            id: rest.id,
            name: rest.name,
            nameAr: rest.nameAr,
            logo: rest.logo,
            currency: rest.currency,
            address: rest.address,
            phone: rest.phone,
          },
          matchCount: 0,
          sampleItems: [],
        });
      }
      const entry = byRestaurant.get(rid)!;
      entry.matchCount += 1;
      if (entry.sampleItems.length < 5) {
        entry.sampleItems.push({
          id: item.id,
          name: item.name,
          nameAr: item.nameAr,
          price: item.price,
          image: item.image,
        });
      }
    }
    const restaurants = Array.from(byRestaurant.values()).map((e) => ({
      ...e.restaurant,
      matchCount: e.matchCount,
      sampleItems: e.sampleItems,
    }));
    res.json({
      success: true,
      data: { restaurants, query: q },
    });
  } catch (error) {
    console.error("Search items error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

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
        menuTheme: menuTheme || DEFAULT_THEME,
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
          currency: (restaurant as any).currency || "USD",
        },
        categories,
        menuTheme: menuTheme || DEFAULT_THEME,
        currency: (restaurant as any).currency || "USD",
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

// Search menu items (public - no authentication required)
// IMPORTANT: This must come BEFORE /menu/:restaurantId/:tableNumber to avoid conflicts
router.get("/menu/:restaurantId/search", async (req, res): Promise<any> => {
  try {
    const { restaurantId } = req.params;
    const { q } = req.query; // Search query

    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const searchTerm = q.trim().toLowerCase();

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

    // Search in menu items
    const menuItems = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
        category: {
          isActive: true,
          menu: {
            isActive: true,
          },
        },
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            nameAr: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
          {
            descriptionAr: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            menu: {
              select: {
                id: true,
                name: true,
                nameAr: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      take: 50, // Limit results to 50 items
    });

    res.json({
      success: true,
      data: {
        items: menuItems,
        count: menuItems.length,
        searchTerm: q,
        currency: (restaurant as any).currency || "USD",
      },
    });
  } catch (error) {
    console.error("Menu search error:", error);
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

    // Check if restaurant has active subscription (array might be empty)
    if (!restaurant.subscriptions || restaurant.subscriptions.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Restaurant subscription has expired. Please contact the restaurant.",
        messageAr: "انتهى اشتراك المطعم. يرجى الاتصال بالمطعم.",
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
        select: {
          id: true,
          name: true,
          nameAr: true,
          description: true,
          descriptionAr: true,
          logo: true,
          currency: true,
          subscriptions: {
            where: {
              status: "ACTIVE",
            },
            select: {
              id: true,
            },
          },
        } as any,
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
          image: true,
          extras: true,
          sortOrder: true,
          isAvailable: true,
          discount: true,
        },
      });

      // Get currency from restaurant (ensure it's included)
      const currency = (restaurant as any).currency || "USD";

      res.json({
        success: true,
        data: {
          category,
          items,
          currency,
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

// Get currency exchanges for a restaurant (public)
router.get(
  "/restaurant/:restaurantId/currency-exchanges",
  async (req, res): Promise<any> => {
    try {
      const { restaurantId } = req.params;

      // Verify restaurant exists and is active
      const restaurant = await prisma.restaurant.findFirst({
        where: {
          id: restaurantId,
          isActive: true,
        },
      });

      if (!restaurant) {
        return res.status(404).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      // Get active currency exchanges
      const currencyExchanges = await prisma.currencyExchange.findMany({
        where: {
          restaurantId,
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          currency: true,
          exchangeRate: true,
          isActive: true,
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

// Send contact us form message
router.post("/contact", async (req, res): Promise<any> => {
  try {
    const { name, phone, message, lang } = req.body;

    // Validate required fields
    if (!name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message:
          lang === "ar"
            ? "الرجاء ملء جميع الحقول المطلوبة"
            : "Please fill all required fields",
      });
    }

    // Validate phone: 10 digits starting with 09
    const phoneTrimmed = String(phone).trim();
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(phoneTrimmed)) {
      return res.status(400).json({
        success: false,
        message:
          lang === "ar"
            ? "رقم الهاتف غير صحيح. يجب أن يكون 10 أرقام تبدأ بـ 09"
            : "Invalid phone. Must be 10 digits starting with 09",
      });
    }

    // Get contact email from database or use env variable
    let contactEmail: string | undefined;
    try {
      const contactSection = await prisma.section.findFirst({
        where: { type: "CONTACT" },
      });

      if (contactSection && contactSection.attributes) {
        // attributes is a JSON field, parse it if it's a string
        let attributes: any[] = [];
        if (typeof contactSection.attributes === "string") {
          try {
            attributes = JSON.parse(contactSection.attributes);
          } catch (e) {
            console.error("Error parsing attributes JSON:", e);
          }
        } else if (Array.isArray(contactSection.attributes)) {
          attributes = contactSection.attributes;
        }

        // Try to find email attribute
        const emailAttribute = attributes.find(
          (attr: any) =>
            attr.key?.toLowerCase().includes("email") ||
            attr.keyAr?.toLowerCase().includes("بريد") ||
            attr.key?.toLowerCase().includes("mail")
        );
        if (emailAttribute) {
          contactEmail =
            lang === "ar" ? emailAttribute.valueAr : emailAttribute.value;
          // Clean email (remove non-email characters if needed)
          contactEmail = contactEmail?.replace(/[^\w@.-]/g, "");
        }
      }
    } catch (error) {
      console.error("Error fetching contact section:", error);
      // Continue with env variable fallback
    }

    // Send email (use Arabic or English based on lang)
    const emailSent =
      lang === "ar"
        ? await sendContactUsEmail(name, phoneTrimmed, message, contactEmail)
        : await sendContactUsEmailEN(name, phoneTrimmed, message, contactEmail);

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message:
          lang === "ar"
            ? "حدث خطأ أثناء إرسال الرسالة. يرجى المحاولة لاحقاً"
            : "An error occurred while sending the message. Please try again later",
      });
    }

    res.json({
      success: true,
      message:
        lang === "ar"
          ? "تم إرسال رسالتك بنجاح. سنتواصل معك قريباً"
          : "Your message has been sent successfully. We will contact you soon",
    });
  } catch (error) {
    console.error("Send contact message error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
