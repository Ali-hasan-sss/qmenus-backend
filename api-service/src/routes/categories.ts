import express from "express";
import prisma from "../../../shared/config/db";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { deleteUploadIfUnused, deleteUploadsIfUnused } from "../utils/uploadCleanup";
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
          _count: { select: { items: true } },
        },
      });

      if (category.image && category.image !== (image ?? null)) {
        await deleteUploadIfUnused(prisma, category.image);
      }

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
          _count: { select: { items: true } },
          items: { select: { image: true } },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const imagesToClean = [
        category.image,
        ...(category.items || []).map((i: { image: string | null }) => i.image),
      ].filter(Boolean);

      await prisma.$transaction(async (tx: any) => {
        await tx.menuItem.deleteMany({ where: { categoryId: id } });
        await tx.category.delete({ where: { id } });
      });

      await deleteUploadsIfUnused(prisma, imagesToClean);

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

      const categoriesWithItems = await prisma.category.findMany({
        where: { menuId: menu.id },
        select: { id: true, image: true, items: { select: { image: true } } },
      });
      const imagesToClean: (string | null)[] = [];
      for (const c of categoriesWithItems) {
        if (c.image) imagesToClean.push(c.image);
        for (const item of c.items || []) {
          if (item.image) imagesToClean.push(item.image);
        }
      }

      await prisma.$transaction(async (tx: any) => {
        const categoryIds = await tx.category.findMany({
          where: { menuId: menu.id },
          select: { id: true },
        });
        const categoryIdList = categoryIds.map((c: { id: string }) => c.id);
        if (categoryIdList.length > 0) {
          await tx.menuItem.deleteMany({
            where: { categoryId: { in: categoryIdList } },
          });
        }
        await tx.category.deleteMany({
          where: { menuId: menu.id },
        });
      });

      await deleteUploadsIfUnused(prisma, imagesToClean);

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
