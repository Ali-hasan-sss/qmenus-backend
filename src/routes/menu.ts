import express, { Response } from "express";
import { prisma } from "../lib/prisma";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
  updateMenuSchema,
  reorderItemsSchema,
} from "../validators/menuValidators";
import { validatePlanLimits } from "../middleware/planLimits";

const router = express.Router();

// Get restaurant menu (single menu with categories and items)
router.get(
  "/",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      // Get or create the single menu for this restaurant
      let menu = await prisma.menu.findFirst({
        where: { restaurantId },
        include: {
          categories: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              items: {
                where: { isAvailable: true },
                orderBy: { sortOrder: "asc" },
              },
              _count: {
                select: {
                  items: true,
                },
              },
            },
          },
        },
      });

      // If no menu exists, create one
      if (!menu) {
        menu = await prisma.menu.create({
          data: {
            name: "Main Menu",
            nameAr: "القائمة الرئيسية",
            restaurantId,
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
                _count: {
                  select: {
                    items: true,
                  },
                },
              },
            },
          },
        });
      }

      res.json({
        success: true,
        data: { menu },
      });
    } catch (error) {
      console.error("Get menu error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update menu name
router.put(
  "/name",
  authenticate,
  requireRestaurant,
  validateRequest(updateMenuSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { name, nameAr } = req.body;
      const restaurantId = req.user!.restaurantId!;

      // Get or create the single menu for this restaurant
      let menu = await prisma.menu.findFirst({
        where: { restaurantId },
      });

      if (!menu) {
        menu = await prisma.menu.create({
          data: {
            name: name || "Main Menu",
            nameAr: nameAr || "القائمة الرئيسية",
            restaurantId,
          },
        });
      } else {
        menu = await prisma.menu.update({
          where: { id: menu.id },
          data: { name, nameAr },
        });
      }

      res.json({
        success: true,
        message: "Menu updated successfully",
        data: { menu },
      });
    } catch (error) {
      console.error("Update menu error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Create menu item
router.post(
  "/items",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkItemLimits,
  validateRequest(createMenuItemSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        currency,
        image,
        sortOrder,
        extras,
        categoryId,
        discount,
      } = req.body;
      const restaurantId = req.user!.restaurantId!;

      // Verify category belongs to restaurant
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          menu: { restaurantId },
        },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      const menuItem = await prisma.menuItem.create({
        data: {
          name,
          nameAr,
          description,
          descriptionAr,
          price,
          currency: currency || "USD",
          image,
          sortOrder: sortOrder || 0,
          extras: extras ? JSON.parse(extras) : null,
          categoryId,
          restaurantId,
          discount: discount || 0,
        },
      });

      res.status(201).json({
        success: true,
        message: "Menu item created successfully",
        data: { menuItem },
      });
    } catch (error) {
      console.error("Create menu item error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get items for a specific category
router.get(
  "/categories/:categoryId/items",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { categoryId } = req.params;
      const restaurantId = req.user!.restaurantId!;

      // Verify category exists and belongs to this restaurant
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          menu: { restaurantId },
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
          category: {
            menu: { restaurantId },
          },
        },
        orderBy: { sortOrder: "asc" },
        include: {
          category: {
            select: {
              name: true,
              nameAr: true,
            },
          },
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
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get all menu items for restaurant
router.get(
  "/items",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const { categoryId } = req.query;

      const whereClause: any = {
        category: {
          menu: { restaurantId },
        },
      };

      if (categoryId) {
        whereClause.categoryId = categoryId;
      }

      const items = await prisma.menuItem.findMany({
        where: whereClause,
        orderBy: { sortOrder: "asc" },
        include: {
          category: {
            select: {
              name: true,
              nameAr: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { items },
      });
    } catch (error) {
      console.error("Get menu items error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Reorder items
router.put(
  "/items/reorder",
  authenticate,
  requireRestaurant,
  validateRequest(reorderItemsSchema),
  async (req: AuthRequest, res) => {
    try {
      const { items } = req.body;
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        return res.status(401).json({
          success: false,
          message: "Restaurant not found",
        });
      }

      // Use transaction to update all items
      await prisma.$transaction(
        items.map((item: { id: string; sortOrder: number }) =>
          prisma.menuItem.update({
            where: {
              id: item.id,
              category: {
                menu: {
                  restaurantId: restaurantId,
                },
              },
            },
            data: {
              sortOrder: item.sortOrder,
            },
          })
        )
      );

      return res.json({
        success: true,
        message: "Items reordered successfully",
      });
    } catch (error) {
      console.error("Reorder items error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update menu item
router.put(
  "/items/:id",
  authenticate,
  requireRestaurant,
  validateRequest(updateMenuItemSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const {
        name,
        nameAr,
        description,
        descriptionAr,
        price,
        currency,
        image,
        sortOrder,
        extras,
        categoryId,
        discount,
      } = req.body;
      const restaurantId = req.user!.restaurantId!;

      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id,
          category: {
            menu: { restaurantId },
          },
        },
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      const updatedMenuItem = await prisma.menuItem.update({
        where: { id },
        data: {
          name,
          nameAr,
          description,
          descriptionAr,
          price,
          currency,
          image,
          sortOrder,
          extras: extras ? JSON.parse(extras) : null,
          categoryId,
          discount: discount || 0,
        },
      });

      res.json({
        success: true,
        message: "Menu item updated successfully",
        data: { menuItem: updatedMenuItem },
      });
    } catch (error) {
      console.error("Update menu item error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Toggle menu item availability
router.put(
  "/items/:id/toggle",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id,
          category: {
            menu: { restaurantId },
          },
        },
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      const updatedMenuItem = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: !menuItem.isAvailable },
      });

      res.json({
        success: true,
        message: `Menu item ${
          updatedMenuItem.isAvailable ? "made available" : "made unavailable"
        }`,
        data: { menuItem: updatedMenuItem },
      });
    } catch (error) {
      console.error("Toggle menu item availability error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete menu item
router.delete(
  "/items/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id,
          category: {
            menu: { restaurantId },
          },
        },
      });

      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: "Menu item not found",
        });
      }

      await prisma.menuItem.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Menu item deleted successfully",
      });
    } catch (error) {
      console.error("Delete menu item error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
