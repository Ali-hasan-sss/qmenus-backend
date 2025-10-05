import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createMenuThemeSchema,
  updateMenuThemeSchema,
  createFromTemplateSchema,
  themeIdSchema,
  restaurantIdSchema,
} from "../validators/menuThemeValidators";
import { validatePlanLimits } from "../middleware/planLimits";

const router = express.Router();

// Get menu theme for restaurant (single theme)
router.get(
  "/",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      let theme = await prisma.menuTheme.findUnique({
        where: {
          restaurantId,
        },
      });

      // If no theme exists, create default theme
      if (!theme) {
        theme = await prisma.menuTheme.create({
          data: {
            restaurantId,
          },
        });
      }

      res.json({
        success: true,
        data: { theme },
      });
    } catch (error) {
      console.error("Get menu theme error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update menu theme (single theme per restaurant)
router.put(
  "/",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkThemePermission,
  validateRequest(updateMenuThemeSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const updateData = req.body;

      // Find existing theme or create new one
      let theme = await prisma.menuTheme.findUnique({
        where: { restaurantId },
      });

      if (!theme) {
        // Create new theme
        theme = await prisma.menuTheme.create({
          data: {
            ...updateData,
            restaurantId,
          },
        });
      } else {
        // Update existing theme
        theme = await prisma.menuTheme.update({
          where: { restaurantId },
          data: updateData,
        });
      }

      res.json({
        success: true,
        message: "Menu theme updated successfully",
        data: { theme },
      });
    } catch (error) {
      console.error("Update menu theme error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get menu theme for public access
router.get("/public/:restaurantId", async (req, res): Promise<any> => {
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

    // Get theme for restaurant
    const theme = await prisma.menuTheme.findUnique({
      where: {
        restaurantId,
      },
    });

    // If no theme exists, return default theme
    const defaultTheme = {
      id: "default",
      layoutType: "grid",
      showPrices: true,
      showImages: true,
      showDescriptions: true,
      primaryColor: "#3B82F6",
      secondaryColor: "#1E40AF",
      backgroundColor: "#FFFFFF",
      textColor: "#1F2937",
      accentColor: "#F59E0B",
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
      customCSS: null,
    };

    res.json({
      success: true,
      data: {
        theme: theme || defaultTheme,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          nameAr: restaurant.nameAr,
        },
      },
    });
  } catch (error) {
    console.error("Get public menu theme error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Apply template to theme
router.post(
  "/apply-template",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkThemePermission,
  validateRequest(createFromTemplateSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const { templateId } = req.body;

      // Define templates
      const templates = {
        modern: {
          layoutType: "grid",
          showPrices: true,
          showImages: true,
          showDescriptions: true,
          primaryColor: "#3B82F6",
          secondaryColor: "#1E40AF",
          backgroundColor: "#FFFFFF",
          textColor: "#1F2937",
          accentColor: "#F59E0B",
          fontFamily: "Inter",
          headingSize: "text-2xl",
          bodySize: "text-base",
          priceSize: "text-lg",
          cardPadding: "p-6",
          cardMargin: "m-4",
          borderRadius: "rounded-xl",
          categoryStyle: "tabs",
          showCategoryImages: false,
          itemLayout: "vertical",
          imageAspect: "square",
        },
        classic: {
          layoutType: "list",
          showPrices: true,
          showImages: false,
          showDescriptions: true,
          primaryColor: "#8B5CF6",
          secondaryColor: "#7C3AED",
          backgroundColor: "#F9FAFB",
          textColor: "#374151",
          accentColor: "#EC4899",
          fontFamily: "Georgia",
          headingSize: "text-3xl",
          bodySize: "text-lg",
          priceSize: "text-xl",
          cardPadding: "p-4",
          cardMargin: "m-2",
          borderRadius: "rounded-lg",
          categoryStyle: "accordion",
          showCategoryImages: false,
          itemLayout: "horizontal",
          imageAspect: "rectangle",
        },
        minimal: {
          layoutType: "card",
          showPrices: true,
          showImages: true,
          showDescriptions: false,
          primaryColor: "#059669",
          secondaryColor: "#047857",
          backgroundColor: "#FFFFFF",
          textColor: "#111827",
          accentColor: "#DC2626",
          fontFamily: "Helvetica",
          headingSize: "text-xl",
          bodySize: "text-sm",
          priceSize: "text-lg",
          cardPadding: "p-3",
          cardMargin: "m-1",
          borderRadius: "rounded-md",
          categoryStyle: "sidebar",
          showCategoryImages: true,
          itemLayout: "vertical",
          imageAspect: "circle",
        },
      };

      const template = templates[templateId as keyof typeof templates];
      if (!template) {
        return res.status(400).json({
          success: false,
          message: "Invalid template ID",
        });
      }

      // Find existing theme or create new one
      let theme = await prisma.menuTheme.findUnique({
        where: { restaurantId },
      });

      if (!theme) {
        // Create new theme
        theme = await prisma.menuTheme.create({
          data: {
            ...template,
            restaurantId,
          },
        });
      } else {
        // Update existing theme
        theme = await prisma.menuTheme.update({
          where: { restaurantId },
          data: template,
        });
      }

      res.json({
        success: true,
        message: "Template applied successfully",
        data: { theme },
      });
    } catch (error) {
      console.error("Apply template error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get theme templates (predefined themes)
router.get("/templates/available", async (req, res): Promise<any> => {
  try {
    const templates = [
      {
        id: "modern",
        name: "Modern",
        nameAr: "عصري",
        description: "Clean and modern design with grid layout",
        descriptionAr: "تصميم نظيف وعصري مع تخطيط الشبكة",
        preview: {
          layoutType: "grid",
          primaryColor: "#3B82F6",
          secondaryColor: "#1E40AF",
          backgroundColor: "#FFFFFF",
          fontFamily: "Inter",
        },
      },
      {
        id: "classic",
        name: "Classic",
        nameAr: "كلاسيكي",
        description: "Traditional list layout with elegant typography",
        descriptionAr: "تخطيط القائمة التقليدية مع طباعة أنيقة",
        preview: {
          layoutType: "list",
          primaryColor: "#8B5CF6",
          secondaryColor: "#7C3AED",
          backgroundColor: "#F9FAFB",
          fontFamily: "Georgia",
        },
      },
      {
        id: "minimal",
        name: "Minimal",
        nameAr: "بسيط",
        description: "Minimalist card-based design",
        descriptionAr: "تصميم بسيط يعتمد على البطاقات",
        preview: {
          layoutType: "card",
          primaryColor: "#059669",
          secondaryColor: "#047857",
          backgroundColor: "#FFFFFF",
          fontFamily: "Helvetica",
        },
      },
    ];

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error("Get theme templates error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
