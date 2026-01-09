import express, { Response } from "express";
import prisma from "../../../shared/config/db";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import Joi from "joi";

const router = express.Router();

// Validation schemas
const createKitchenSectionSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  nameAr: Joi.string().max(100).optional().allow(null, ""),
  sortOrder: Joi.number().integer().min(0).optional(),
});

const updateKitchenSectionSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  nameAr: Joi.string().max(100).optional().allow(null, ""),
  sortOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

// Get all kitchen sections for restaurant
router.get(
  "/sections",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      const sections = await prisma.kitchenSection.findMany({
        where: {
          restaurantId,
        },
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          _count: {
            select: {
              menuItems: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { sections },
      });
    } catch (error) {
      console.error("Get kitchen sections error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Create kitchen section
router.post(
  "/sections",
  authenticate,
  requireRestaurant,
  validateRequest(createKitchenSectionSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const { name, nameAr, sortOrder } = req.body;

      // Check if plan has KDS feature
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          subscriptions: {
            where: { status: "ACTIVE" },
            include: {
              plan: true,
            },
          },
        },
      });

      if (!restaurant || !restaurant.subscriptions.length) {
        return res.status(403).json({
          success: false,
          message: "No active subscription found",
        });
      }

      const plan = restaurant.subscriptions[0].plan;
      const hasKDS =
        plan.features.includes("KITCHEN_DISPLAY_SYSTEM") ||
        plan.features.includes("kitchen_display_system");

      if (!hasKDS) {
        return res.status(403).json({
          success: false,
          message:
            "Kitchen Display System is not available in your current plan",
        });
      }

      const section = await prisma.kitchenSection.create({
        data: {
          name,
          nameAr: nameAr || null,
          sortOrder: sortOrder || 0,
          restaurantId,
        },
      });

      res.status(201).json({
        success: true,
        message: "Kitchen section created successfully",
        data: { section },
      });
    } catch (error) {
      console.error("Create kitchen section error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update kitchen section
router.put(
  "/sections/:id",
  authenticate,
  requireRestaurant,
  validateRequest(updateKitchenSectionSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;
      const { name, nameAr, sortOrder, isActive } = req.body;

      const section = await prisma.kitchenSection.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Kitchen section not found",
        });
      }

      const updatedSection = await prisma.kitchenSection.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(nameAr !== undefined && { nameAr: nameAr || null }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        message: "Kitchen section updated successfully",
        data: { section: updatedSection },
      });
    } catch (error) {
      console.error("Update kitchen section error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete kitchen section
router.delete(
  "/sections/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const section = await prisma.kitchenSection.findFirst({
        where: {
          id,
          restaurantId,
        },
        include: {
          _count: {
            select: {
              menuItems: true,
            },
          },
        },
      });

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Kitchen section not found",
        });
      }

      if (section._count.menuItems > 0) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot delete kitchen section with associated menu items. Please reassign items first.",
        });
      }

      await prisma.kitchenSection.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Kitchen section deleted successfully",
      });
    } catch (error) {
      console.error("Delete kitchen section error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get KDS items (order items grouped by kitchen section)
router.get(
  "/kds/items",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      // Check if restaurant has active subscription with KDS feature
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          subscriptions: {
            where: { status: "ACTIVE" },
            include: {
              plan: true,
            },
          },
        },
      });

      if (!restaurant || !restaurant.subscriptions.length) {
        return res.status(403).json({
          success: false,
          message: "لا توجد اشتراك نشط. يرجى الاشتراك في خطة لدعم لوحة المطبخ",
          messageEn:
            "No active subscription found. Please subscribe to a plan that supports Kitchen Display System.",
        });
      }

      const plan = restaurant.subscriptions[0].plan;
      const hasKDS =
        plan.features.includes("KITCHEN_DISPLAY_SYSTEM") ||
        plan.features.includes("kitchen_display_system");

      if (!hasKDS) {
        return res.status(403).json({
          success: false,
          message:
            "لوحة المطبخ غير متاحة في خطتك الحالية. يرجى ترقية اشتراكك للوصول إلى هذه الميزة.",
          messageEn:
            "Kitchen Display System is not available in your current plan. Please upgrade your subscription to access this feature.",
        });
      }

      // Get active orders with status PENDING or PREPARING only
      // Exclude READY, COMPLETED, and CANCELLED orders as they are finished
      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: {
            in: ["PENDING", "PREPARING"],
          },
        },
        include: {
          items: {
            where: {
              menuItem: {
                isNot: null,
              },
            },
            include: {
              menuItem: {
                include: {
                  kitchenSection: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Group items by kitchen section
      const sectionsMap = new Map<
        string,
        {
          section: any;
          items: Array<{
            orderItem: any;
            order: any;
          }>;
        }
      >();

      // Default "General" section for items without a kitchen section
      const GENERAL_SECTION_ID = "GENERAL";
      const generalSection = {
        id: GENERAL_SECTION_ID,
        name: "General",
        nameAr: "عام",
        sortOrder: 9999, // Put general section at the end
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      orders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          // Debug: Log item status
          if (item.kitchenItemStatus && item.kitchenItemStatus !== "PENDING") {
            console.log(
              `⚠️ Order item ${item.id} has status: ${item.kitchenItemStatus}, expected PENDING for new items`
            );
          }

          // Determine section: use kitchen section if available, otherwise use general
          let sectionId = GENERAL_SECTION_ID;
          let section = generalSection;

          if (item.menuItem?.kitchenSection) {
            sectionId = item.menuItem.kitchenSection.id;
            section = item.menuItem.kitchenSection;
          }

          // Initialize section in map if not exists
          if (!sectionsMap.has(sectionId)) {
            sectionsMap.set(sectionId, {
              section: section,
              items: [],
            });
          }

          // Add item to its section (items are already grouped by section)
          sectionsMap.get(sectionId)!.items.push({
            orderItem: item,
            order: {
              id: order.id,
              tableNumber: order.tableNumber,
              orderType: order.orderType,
              createdAt: order.createdAt,
            },
          });
        });
      });

      // Get all kitchen sections from database (even if they have no items)
      const allKitchenSections = await prisma.kitchenSection.findMany({
        where: {
          restaurantId,
          isActive: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      });

      // Add all kitchen sections to the map (even if they have no items)
      allKitchenSections.forEach((section: any) => {
        if (!sectionsMap.has(section.id)) {
          sectionsMap.set(section.id, {
            section: section,
            items: [],
          });
        }
      });

      // Always include the General section (even if it has no items)
      if (!sectionsMap.has(GENERAL_SECTION_ID)) {
        sectionsMap.set(GENERAL_SECTION_ID, {
          section: generalSection,
          items: [],
        });
      }

      // Convert to array and sort by section sortOrder (general section will be last)
      const sections = Array.from(sectionsMap.values()).sort(
        (a, b) => a.section.sortOrder - b.section.sortOrder
      );

      res.json({
        success: true,
        data: { sections },
      });
    } catch (error) {
      console.error("Get KDS items error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update order item kitchen status
router.put(
  "/kds/items/:itemId/status",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { itemId } = req.params;
      const { status } = req.body;
      const restaurantId = req.user!.restaurantId!;

      // Check if restaurant has active subscription with KDS feature
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        include: {
          subscriptions: {
            where: { status: "ACTIVE" },
            include: {
              plan: true,
            },
          },
        },
      });

      if (!restaurant || !restaurant.subscriptions.length) {
        return res.status(403).json({
          success: false,
          message: "لا توجد اشتراك نشط. يرجى الاشتراك في خطة لدعم لوحة المطبخ",
          messageEn:
            "No active subscription found. Please subscribe to a plan that supports Kitchen Display System.",
        });
      }

      const plan = restaurant.subscriptions[0].plan;
      const hasKDS =
        plan.features.includes("KITCHEN_DISPLAY_SYSTEM") ||
        plan.features.includes("kitchen_display_system");

      if (!hasKDS) {
        return res.status(403).json({
          success: false,
          message:
            "لوحة المطبخ غير متاحة في خطتك الحالية. يرجى ترقية اشتراكك للوصول إلى هذه الميزة.",
          messageEn:
            "Kitchen Display System is not available in your current plan. Please upgrade your subscription to access this feature.",
        });
      }

      if (!["PENDING", "PREPARING", "COMPLETED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "حالة غير صالحة. يجب أن تكون PENDING أو PREPARING أو COMPLETED",
          messageEn: "Invalid status. Must be PENDING, PREPARING, or COMPLETED",
        });
      }

      const orderItem = await prisma.orderItem.findFirst({
        where: {
          id: itemId,
          order: {
            restaurantId,
          },
        },
        include: {
          order: true,
        },
      });

      if (!orderItem) {
        return res.status(404).json({
          success: false,
          message: "Order item not found",
        });
      }

      const updatedItem = await prisma.orderItem.update({
        where: { id: itemId },
        data: {
          kitchenItemStatus: status as any, // TODO: Use enum after regenerating Prisma Client
        },
        include: {
          menuItem: {
            include: {
              kitchenSection: true,
            },
          },
          order: {
            select: {
              id: true,
              tableNumber: true,
              orderType: true,
              createdAt: true,
              status: true,
            },
          },
        },
      });

      // Check if all items in the order are completed
      // If so, automatically update order status to READY
      if (status === "COMPLETED") {
        const orderId = orderItem.order.id;
        const allOrderItems = await prisma.orderItem.findMany({
          where: {
            orderId: orderId,
            menuItem: {
              isNot: null, // Only count menu items, not custom items
            },
          },
        });

        // Check if all menu items are completed
        const allCompleted = allOrderItems.every(
          (item: { kitchenItemStatus: string }) =>
            item.kitchenItemStatus === "COMPLETED"
        );

        if (allCompleted && allOrderItems.length > 0) {
          // Update order status to READY
          await prisma.order.update({
            where: { id: orderId },
            data: {
              status: "READY",
            },
          });

          console.log(
            `✅ All items completed for order ${orderId}, status updated to READY`
          );

          // Notify socket-service about order status update
          try {
            const axios = require("axios");
            const env = require("../../../shared/config/env");
            const socketServiceUrl =
              env.SOCKET_SERVICE_URL ||
              `http://localhost:${env.SOCKET_PORT || "5001"}`;

            const updatedOrder = await prisma.order.findUnique({
              where: { id: orderId },
              include: {
                items: {
                  include: {
                    menuItem: {
                      select: {
                        id: true,
                        name: true,
                        nameAr: true,
                        price: true,
                        discount: true,
                        extras: true,
                        category: {
                          select: {
                            id: true,
                            name: true,
                            nameAr: true,
                          },
                        },
                      },
                    },
                  },
                },
                qrCode: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                  },
                },
              },
            });

            if (updatedOrder) {
              // Send order_update to customer (table room) but NOT to cashier (restaurant room)
              // This allows customer to see order status change to READY without triggering cashier notifications
              console.log(
                `📤 Order ${orderId} became READY, sending update to customer only (not cashier)`
              );

              // Get qrCodeId to send update to customer's table room
              const qrCodeId = updatedOrder.qrCodeId;

              // Send order_update to customer via table room (if qrCodeId exists)
              // This will update the order status at customer's device
              if (qrCodeId) {
                await axios.post(`${socketServiceUrl}/api/emit-order-update`, {
                  order: updatedOrder,
                  updatedBy: "kitchen", // Indicate this is from kitchen
                  timestamp: new Date().toISOString(),
                  restaurantId: restaurantId,
                  qrCodeId: qrCodeId,
                  // Don't send to restaurant room to prevent cashier notifications
                  skipRestaurantRoom: true,
                });
                console.log(
                  `✅ Order ${orderId} status update sent to customer (table_${qrCodeId})`
                );
              } else {
                console.log(
                  `⚠️ Order ${orderId} has no qrCodeId, cannot send update to customer`
                );
              }

              // Emit KDS update to refresh kitchen display
              // This will remove items from display when order becomes READY
              // Source is "kitchen" - no visual/audio effects
              await axios.post(`${socketServiceUrl}/api/emit-kds-update`, {
                orderItem: null, // Signal to refresh all items
                restaurantId,
                timestamp: new Date().toISOString(),
                source: "kitchen", // No visual/audio effects for kitchen updates
                orderId: orderId, // Include order ID to help with refresh
              });
            }
          } catch (socketError: any) {
            console.error(
              "Socket notification error (order status):",
              socketError?.message
            );
          }
        }
      }

      // Notify socket-service for real-time updates
      // Source is "kitchen" because this is a status change by the kitchen, not new items
      try {
        const axios = require("axios");
        const env = require("../../../shared/config/env");
        const socketServiceUrl =
          env.SOCKET_SERVICE_URL ||
          `http://localhost:${env.SOCKET_PORT || "5001"}`;
        await axios.post(`${socketServiceUrl}/api/emit-kds-update`, {
          orderItem: updatedItem,
          restaurantId,
          timestamp: new Date().toISOString(),
          source: "kitchen", // Indicate this is a kitchen status change
          orderId: orderItem.order.id,
        });
      } catch (socketError: any) {
        console.error("Socket notification error:", socketError?.message);
      }

      res.json({
        success: true,
        message: "Order item status updated successfully",
        data: { orderItem: updatedItem },
      });
    } catch (error) {
      console.error("Update order item kitchen status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
