import express from "express";
import { prisma } from "../lib/prisma";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from "../validators/menuValidators";
import { validatePlanLimits } from "../middleware/planLimits";

console.log("🔍 reorderCategoriesSchema:", reorderCategoriesSchema.describe());

const router = express.Router();

// Get all categories for restaurant
router.get(
  "/",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    console.log("🔍 Categories GET / route hit");
    try {
      const restaurantId = req.user!.restaurantId!;

      const categories = await prisma.category.findMany({
        where: {
          menu: { restaurantId },
        },
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Create category
router.post(
  "/",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkCategoryLimits,
  validateRequest(createCategorySchema),
  async (req: AuthRequest, res): Promise<any> => {
    console.log("🔍 Categories POST / route hit");
    try {
      const { name, nameAr, description, descriptionAr, sortOrder, image } =
        req.body;
      const restaurantId = req.user!.restaurantId!;

      // Get or create the single menu for this restaurant
      let menu = await prisma.menu.findFirst({
        where: { restaurantId },
      });

      if (!menu) {
        menu = await prisma.menu.create({
          data: {
            name: "Main Menu",
            nameAr: "القائمة الرئيسية",
            restaurantId,
          },
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
          nameAr,
          description,
          descriptionAr,
          image,
          sortOrder: sortOrder || 0,
          menuId: menu.id,
          restaurantId,
        },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: { category },
      });
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Reorder categories - MUST be before /:id route
router.put(
  "/reorder",
  (req, res, next) => {
    console.log("🔍 Route middleware hit - PUT /reorder");
    next();
  },
  authenticate,
  requireRestaurant,
  validateRequest(reorderCategoriesSchema),
  async (req: AuthRequest, res): Promise<any> => {
    console.log("🎯 Categories PUT /reorder route handler hit");
    try {
      const restaurantId = req.user!.restaurantId!;
      const { categories } = req.body;

      // Update categories in a transaction
      await prisma.$transaction(
        categories.map((category: { id: string; sortOrder: number }) =>
          prisma.category.update({
            where: {
              id: category.id,
              menu: {
                restaurantId: restaurantId,
              },
            },
            data: {
              sortOrder: category.sortOrder,
            },
          })
        )
      );

      res.json({
        success: true,
        message: "Categories reordered successfully",
      });
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update category
router.put(
  "/:id",
  authenticate,
  requireRestaurant,
  validateRequest(updateCategorySchema),
  async (req: AuthRequest, res): Promise<any> => {
    console.log("🔍 Categories PUT /:id route hit");
    try {
      const { id } = req.params;
      const { name, nameAr, description, descriptionAr, sortOrder, image } =
        req.body;
      const restaurantId = req.user!.restaurantId!;

      const category = await prisma.category.findFirst({
        where: {
          id,
          menu: { restaurantId },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          name,
          nameAr,
          description,
          descriptionAr,
          image,
          sortOrder,
        },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Category updated successfully",
        data: { category: updatedCategory },
      });
    } catch (error) {
      console.error("Update category error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Toggle category active status
router.put(
  "/:id/toggle",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const category = await prisma.category.findFirst({
        where: {
          id,
          menu: { restaurantId },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: { isActive: !category.isActive },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: `Category ${
          updatedCategory.isActive ? "activated" : "deactivated"
        } successfully`,
        data: { category: updatedCategory },
      });
    } catch (error) {
      console.error("Toggle category status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete category
router.delete(
  "/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const category = await prisma.category.findFirst({
        where: {
          id,
          menu: { restaurantId },
        },
        include: {
          _count: {
            select: {
              items: true,
            },
          },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      // Delete category and all its items using transaction
      await prisma.$transaction(async (tx) => {
        // First, delete all items in this category
        await tx.menuItem.deleteMany({
          where: { categoryId: id },
        });

        // Then delete the category
        await tx.category.delete({
          where: { id },
        });
      });

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete category error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Reset all menu (delete all categories and items)
router.delete(
  "/reset/all",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      // Get the restaurant's menu
      const menu = await prisma.menu.findFirst({
        where: { restaurantId },
      });

      if (!menu) {
        return res.status(404).json({
          success: false,
          message: "Menu not found",
        });
      }

      // Delete all categories and items using transaction
      await prisma.$transaction(async (tx) => {
        // Get all category IDs for this menu
        const categoryIds = await tx.category.findMany({
          where: { menuId: menu.id },
          select: { id: true },
        });

        const categoryIdList = categoryIds.map((c) => c.id);

        // First, delete all menu items in these categories
        if (categoryIdList.length > 0) {
          await tx.menuItem.deleteMany({
            where: {
              categoryId: {
                in: categoryIdList,
              },
            },
          });
        }

        // Then delete all categories
        await tx.category.deleteMany({
          where: { menuId: menu.id },
        });
      });

      res.json({
        success: true,
        message: "All categories and items deleted successfully",
        data: {
          message:
            "Menu has been reset. You can now start adding new categories and items.",
        },
      });
    } catch (error) {
      console.error("Reset menu error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
