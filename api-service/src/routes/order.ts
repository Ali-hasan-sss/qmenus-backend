import express, { Response } from "express";
import prisma from "../../../shared/config/db";
import { Prisma } from "@prisma/client";
import { env } from "../../../shared/config/env";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/orderValidators";
// Socket.io will be handled by socket-service
// import { io } from "../index";
import {
  generateKitchenWhatsAppMessage,
  generateWhatsAppURL,
} from "../helpers/whatsappHelper";

// Helper function to extract extras names for notes
const getExtrasNamesForNotes = (
  extras: any,
  menuItemExtras: any,
  isRTL: boolean = false
): string[] => {
  if (!extras || typeof extras !== "object" || !menuItemExtras) return [];

  const extrasNames: string[] = [];
  Object.values(extras).forEach((extraGroup: any) => {
    if (Array.isArray(extraGroup)) {
      extraGroup.forEach((extraId: string) => {
        // Find the extra name from the menuItem.extras
        Object.values(menuItemExtras).forEach((group: any) => {
          if (group.options) {
            const option = group.options.find((opt: any) => opt.id === extraId);
            if (option) {
              const extraName = isRTL
                ? option.nameAr || option.name
                : option.name;
              extrasNames.push(extraName);
            }
          }
        });
      });
    }
  });
  return extrasNames;
};

// Helper function to calculate taxes
const calculateTaxes = async (
  restaurantId: string,
  subtotal: number
): Promise<{ taxes: any[]; totalTaxAmount: number }> => {
  try {
    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings || !settings.taxes) {
      return { taxes: [], totalTaxAmount: 0 };
    }

    const taxesConfig = settings.taxes as any;
    if (!Array.isArray(taxesConfig) || taxesConfig.length === 0) {
      return { taxes: [], totalTaxAmount: 0 };
    }

    const calculatedTaxes: any[] = [];
    let totalTaxAmount = 0;

    for (const tax of taxesConfig) {
      if (tax && tax.name && tax.percentage !== undefined) {
        const taxAmount = (subtotal * tax.percentage) / 100;
        calculatedTaxes.push({
          name: tax.name,
          nameAr: tax.nameAr || tax.name,
          percentage: tax.percentage,
          amount: Number(taxAmount.toFixed(2)),
        });
        totalTaxAmount += taxAmount;
      }
    }

    return {
      taxes: calculatedTaxes,
      totalTaxAmount: Number(totalTaxAmount.toFixed(2)),
    };
  } catch (error) {
    console.error("Error calculating taxes:", error);
    return { taxes: [], totalTaxAmount: 0 };
  }
};

const router = express.Router();

// Create new order (public endpoint for customers)
router.post(
  "/create",
  validateRequest(createOrderSchema),
  async (req, res): Promise<any> => {
    try {
      const {
        restaurantId,
        orderType = "DINE_IN",
        tableNumber,
        items,
        customerName,
        customerPhone,
        customerAddress,
        notes,
      } = req.body;

      // Get customer IP
      const customerIP =
        req.ip ||
        req.connection.remoteAddress ||
        (req.connection as any).socket?.remoteAddress ||
        req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        req.headers["x-real-ip"]?.toString() ||
        "unknown";

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
          message: "Restaurant not found or inactive",
        });
      }

      if (!restaurant.subscriptions) {
        return res.status(403).json({
          success: false,
          message: "Restaurant subscription is not active",
        });
      }

      // Verify QR code exists and is active (only for dine-in orders)
      let qrCode = null;
      if (orderType === "DINE_IN") {
        // Normalize tableNumber to string to ensure consistent matching
        const normalizedTableNumber = String(tableNumber).trim();

        // Special table number for quick orders - skip QR code validation
        const QUICK_ORDER_TABLE_NUMBER = "QUICK";

        if (normalizedTableNumber === QUICK_ORDER_TABLE_NUMBER) {
          console.log(
            `⚡ [Order API] Quick order detected - skipping QR code validation for table: ${normalizedTableNumber}`
          );
          // Skip QR code validation for quick orders
          qrCode = null;
        } else {
          console.log(
            `🔍 [Order API] Looking for QR code - Restaurant: ${restaurantId}, Table: ${normalizedTableNumber} (type: ${typeof tableNumber})`
          );

          qrCode = await prisma.qRCode.findFirst({
            where: {
              restaurantId,
              tableNumber: normalizedTableNumber,
              isActive: true,
            },
            select: {
              id: true,
              tableNumber: true,
              isOccupied: true,
            },
          });

          if (!qrCode) {
            console.log(
              `❌ [Order API] QR code not found for Restaurant: ${restaurantId}, Table: ${normalizedTableNumber}`
            );
            return res.status(404).json({
              success: false,
              message: "Invalid table number or QR code",
            });
          }

          console.log(
            `🔍 [Order API] Found QR Code - Table: ${qrCode.tableNumber}, QR ID: ${qrCode.id}, Prisma isOccupied: ${qrCode.isOccupied}`
          );

          // Check if table is occupied (session is active)
          // Use raw query to ensure we get the correct value from database
          const occupiedResult = await prisma.$queryRaw<
            Array<{ isOccupied: boolean }>
          >`
            SELECT "isOccupied" FROM qr_codes WHERE id = ${qrCode.id}
          `;
          const isOccupied = occupiedResult[0]?.isOccupied ?? false;

          console.log(
            `🔍 [Order API] Table ${normalizedTableNumber} (QR ID: ${qrCode.id}) - Raw query isOccupied: ${isOccupied}, Raw result:`,
            occupiedResult
          );

          if (!isOccupied) {
            return res.status(403).json({
              success: false,
              message:
                "Table is not occupied. Please ask the cashier to start a session for this table.",
            });
          }
        }
      }

      // Validate menu items and calculate total
      let totalPrice = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = await prisma.menuItem.findFirst({
          where: {
            id: item.menuItemId,
            isAvailable: true,
            category: {
              menu: {
                restaurantId,
                isActive: true,
              },
            },
          },
          select: {
            id: true,
            name: true,
            nameAr: true,
            price: true,
            discount: true,
            extras: true,
          },
        });

        if (!menuItem) {
          return res.status(400).json({
            success: false,
            message: `Menu item with ID ${item.menuItemId} not found or unavailable`,
          });
        }

        // Calculate base price with discount
        let itemPrice = Number(menuItem.price);
        if (menuItem.discount && menuItem.discount > 0) {
          itemPrice = itemPrice * (1 - menuItem.discount / 100);
        }

        // Calculate extras price
        let extrasPrice = 0;
        if (item.extras && typeof item.extras === "object") {
          Object.values(item.extras).forEach((extraGroup: any) => {
            if (Array.isArray(extraGroup)) {
              extraGroup.forEach((extraId: string) => {
                // Find the extra option in menuItem.extras
                if (menuItem.extras) {
                  Object.values(menuItem.extras).forEach((group: any) => {
                    if (group.options) {
                      const option = group.options.find(
                        (opt: any) => opt.id === extraId
                      );
                      if (option && option.price) {
                        extrasPrice += option.price;
                      }
                    }
                  });
                }
              });
            }
          });
        }

        // Total price including extras
        const itemTotal = (itemPrice + extrasPrice) * item.quantity;
        totalPrice += itemTotal;

        // Add extras details to notes
        let finalNotes = item.notes || "";
        if (item.extras && Object.keys(item.extras).length > 0) {
          const extrasNames = getExtrasNamesForNotes(
            item.extras,
            menuItem.extras
          );
          if (extrasNames.length > 0) {
            const extrasText = `Extras: ${extrasNames.join(", ")}`;
            finalNotes = finalNotes
              ? `${finalNotes}; ${extrasText}`
              : extrasText;
          }
        }

        orderItems.push({
          menuItemId: menuItem.id,
          quantity: item.quantity,
          price: itemPrice + extrasPrice, // Store the final price per item
          notes: finalNotes,
          extras: item.extras,
          kitchenItemStatus: "PENDING" as any, // New items start as PENDING (waiting) - TODO: Use enum after regenerating Prisma Client
        });
      }

      // Get currency from restaurant
      const restaurantCurrency = restaurant.currency || "USD";

      // Calculate taxes
      const subtotal = totalPrice;
      const { taxes: calculatedTaxes, totalTaxAmount } = await calculateTaxes(
        restaurantId,
        subtotal
      );
      const finalTotal = subtotal + totalTaxAmount;

      // Create order with items
      const order = await prisma.order.create({
        data: {
          restaurantId,
          orderType,
          qrCodeId: qrCode?.id,
          tableNumber: orderType === "DINE_IN" ? tableNumber : null,
          subtotal,
          taxes: calculatedTaxes.length > 0 ? calculatedTaxes : undefined,
          totalPrice: finalTotal,
          currency: restaurantCurrency, // Use restaurant currency
          customerName,
          customerPhone,
          customerAddress,
          customerIP,
          notes,
          items: {
            create: orderItems,
          },
        },
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
        },
      });

      // Create notification for new order
      const notificationTitle =
        orderType === "DINE_IN"
          ? `New Order - Table ${tableNumber}`
          : `New Delivery Order`;
      const notificationBody =
        orderType === "DINE_IN"
          ? `New dine-in order received for table ${tableNumber}. ${items.length} items ordered.`
          : `New delivery order from ${customerName}. ${items.length} items ordered.`;

      const notification = await prisma.notification.create({
        data: {
          restaurantId,
          title: notificationTitle,
          body: notificationBody,
          type: "NEW_ORDER",
          orderId: order.id,
        },
      });

      // Notify socket-service via HTTP for real-time broadcast
      try {
        const axios = require("axios");
        const baseUrl =
          env.SOCKET_SERVICE_URL ||
          `http://localhost:${env.SOCKET_PORT || "5001"}`;
        await axios.post(`${baseUrl}/api/emit-order-update`, {
          order,
          updatedBy: "customer",
          timestamp: new Date().toISOString(),
          restaurantId,
          qrCodeId: order.qrCodeId,
        });

        // Also emit KDS update with source "customer" to trigger visual/audio effects
        console.log(
          `📤 Sending KDS update with source: customer for new order ${order.id}`
        );
        await axios.post(`${baseUrl}/api/emit-kds-update`, {
          orderItem: {
            id: "new-order",
            order: order,
          },
          restaurantId: restaurantId,
          timestamp: new Date().toISOString(),
          source: "customer", // Indicate this is from customer creating new order
          orderId: order.id,
        });
        console.log(`✅ KDS update sent with source: customer for new order`);
      } catch (socketError: any) {
        console.error(
          "⚠️ Socket notification error (create):",
          socketError?.message || socketError
        );
      }

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        data: { order },
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Check for incomplete order (public endpoint for customers)
router.get("/incomplete/:restaurantId", async (req, res): Promise<any> => {
  try {
    const { restaurantId } = req.params;
    const { tableNumber } = req.query;

    // For delivery orders (no table number), allow multiple orders
    // Return 404 immediately so customers can place new orders
    if (!tableNumber) {
      return res.status(404).json({
        success: false,
        message: "No incomplete order found",
      });
    }

    // For dine-in orders, check for incomplete order on specific table
    const whereClause: any = {
      restaurantId,
      tableNumber: tableNumber,
      status: {
        not: "COMPLETED",
      },
    };

    const order = await prisma.order.findFirst({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
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
              },
            },
          },
        },
        qrCode: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No incomplete order found",
      });
    }

    res.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Check incomplete order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Track order status (public endpoint for customers)
router.get("/track/:orderId", async (req, res): Promise<any> => {
  try {
    const { orderId } = req.params;

    // Find order (remove IP verification for better customer experience)
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
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
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied",
      });
    }

    // Calculate subtotal and taxes if not present (for old orders)
    let orderSubtotal: number | Prisma.Decimal = order.subtotal
      ? Number(order.subtotal)
      : 0;
    let orderTaxes = order.taxes;
    let orderTotalPrice: number | Prisma.Decimal = order.totalPrice
      ? Number(order.totalPrice)
      : 0;

    if (!order.subtotal || !order.taxes) {
      // Calculate subtotal from items
      const itemsSubtotal = order.items.reduce((sum: number, item: any) => {
        return sum + Number(item.price) * item.quantity;
      }, 0);

      orderSubtotal = itemsSubtotal;

      // Calculate taxes
      const { taxes: calculatedTaxes, totalTaxAmount } = await calculateTaxes(
        order.restaurantId,
        itemsSubtotal
      );

      orderTaxes = calculatedTaxes.length > 0 ? calculatedTaxes : null;
      orderTotalPrice = itemsSubtotal + totalTaxAmount;

      // Update order in database if subtotal or taxes are missing
      if (!order.subtotal || !order.taxes) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            subtotal: new Prisma.Decimal(orderSubtotal),
            taxes: orderTaxes || undefined,
            totalPrice: new Prisma.Decimal(orderTotalPrice),
          },
        });
      }
    } else {
      // Convert Decimal to number for response
      orderSubtotal = Number(orderSubtotal);
      orderTotalPrice = Number(orderTotalPrice);
    }

    res.json({
      success: true,
      data: {
        order: {
          id: order.id,
          orderType: order.orderType,
          tableNumber: order.tableNumber,
          qrCodeId: order.qrCodeId, // Add qrCodeId for socket room joining
          status: order.status,
          subtotal: orderSubtotal,
          taxes: orderTaxes,
          totalPrice: orderTotalPrice,
          currency:
            (order.restaurant as any)?.currency || order.currency || "USD",
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          restaurant: {
            ...order.restaurant,
            currency: (order.restaurant as any)?.currency || "USD",
          },
          items: order.items,
        },
      },
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get orders for restaurant (authenticated)
router.get(
  "/",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const {
        page = 1,
        limit = 20,
        status,
        tableNumber,
        startDate,
        endDate,
      } = req.query;

      const whereClause: any = { restaurantId };

      if (status) {
        whereClause.status = status;
      }

      if (tableNumber) {
        whereClause.tableNumber = tableNumber;
      }

      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
          whereClause.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          whereClause.createdAt.lte = new Date(endDate as string);
        }
      }

      const orders = await prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
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
        },
      });

      const total = await prisma.order.count({
        where: whereClause,
      });

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get orders error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get specific order
router.get(
  "/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const order = await prisma.order.findFirst({
        where: {
          id,
          restaurantId,
        },
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
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      res.json({
        success: true,
        data: { order },
      });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Add items to existing order
router.put("/:id/add-items", async (req, res): Promise<any> => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    // Find the order
    const order = await prisma.order.findFirst({
      where: { id },
      include: {
        restaurant: true,
        qrCode: {
          select: {
            id: true,
            tableNumber: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    console.log("🔍 Order details after fetching:", {
      id: order.id,
      orderType: order.orderType,
      tableNumber: order.tableNumber,
      qrCodeId: order.qrCodeId,
      hasQrCodeRelation: !!order.qrCode,
      qrCodeData: order.qrCode,
    });

    // Check if order can be modified (not cancelled)
    if (order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify cancelled orders",
      });
    }

    // Security: Only allow adding items if order ID is provided in the request
    // The order ID should only be known to the customer who created the order
    // This is handled on the frontend by only showing the menu when orderId is in the URL

    // If order is COMPLETED or READY, change status to PREPARING when adding new items
    const shouldChangeStatusToPreparing =
      order.status === "COMPLETED" || order.status === "READY";
    if (shouldChangeStatusToPreparing) {
      console.log(
        `🔄 Order ${id} is ${order.status}, will change to PREPARING when adding items`
      );
    }

    // Validate and calculate new items
    let currentSubtotal = Number(order.subtotal || order.totalPrice);
    const orderItems = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findFirst({
        where: {
          id: item.menuItemId,
          isAvailable: true,
          category: {
            menu: {
              restaurantId: order.restaurantId,
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          nameAr: true,
          price: true,
          discount: true,
          extras: true,
        },
      });

      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item with ID ${item.menuItemId} not found or unavailable`,
        });
      }

      // Calculate base price with discount
      let itemPrice = Number(menuItem.price);
      if (menuItem.discount && menuItem.discount > 0) {
        itemPrice = itemPrice * (1 - menuItem.discount / 100);
      }

      // Calculate extras price
      let extrasPrice = 0;
      if (item.extras && typeof item.extras === "object") {
        Object.values(item.extras).forEach((extraGroup: any) => {
          if (Array.isArray(extraGroup)) {
            extraGroup.forEach((extraId: string) => {
              // Find the extra option in menuItem.extras
              if (menuItem.extras) {
                Object.values(menuItem.extras).forEach((group: any) => {
                  if (group.options) {
                    const option = group.options.find(
                      (opt: any) => opt.id === extraId
                    );
                    if (option && option.price) {
                      extrasPrice += option.price;
                    }
                  }
                });
              }
            });
          }
        });
      }

      // Total price including extras
      const itemTotal = (itemPrice + extrasPrice) * item.quantity;
      currentSubtotal += itemTotal;

      // Add extras details to notes
      let finalNotes = item.notes || "";
      if (item.extras && Object.keys(item.extras).length > 0) {
        const extrasNames = getExtrasNamesForNotes(
          item.extras,
          menuItem.extras
        );
        if (extrasNames.length > 0) {
          const extrasText = `Extras: ${extrasNames.join(", ")}`;
          finalNotes = finalNotes ? `${finalNotes}; ${extrasText}` : extrasText;
        }
      }

      orderItems.push({
        orderId: order.id,
        menuItemId: menuItem.id,
        quantity: item.quantity,
        price: itemPrice + extrasPrice, // Store the final price per item
        notes: finalNotes,
        extras: item.extras,
        kitchenItemStatus: "PENDING" as any, // New items start as PENDING (waiting) - TODO: Use enum after regenerating Prisma Client
      });
    }

    // Add new items to the order
    await prisma.orderItem.createMany({
      data: orderItems,
    });

    // Recalculate taxes with new subtotal
    const { taxes: calculatedTaxes, totalTaxAmount } = await calculateTaxes(
      order.restaurantId,
      currentSubtotal
    );
    const finalTotal = currentSubtotal + totalTaxAmount;

    // Update order with new subtotal, taxes, and total
    // If order was COMPLETED, change status to PREPARING
    const updateData: any = {
      subtotal: currentSubtotal,
      taxes: calculatedTaxes.length > 0 ? calculatedTaxes : undefined,
      totalPrice: finalTotal,
    };

    if (shouldChangeStatusToPreparing) {
      updateData.status = "PREPARING";
      console.log(
        `🔄 Order ${id} status will change from ${order.status} to PREPARING (new items added)`
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
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
              },
            },
          },
        },
        qrCode: true,
      },
    });

    // Log status change if it occurred
    if (shouldChangeStatusToPreparing) {
      console.log(
        `✅ Order ${id} status successfully changed to: ${updatedOrder.status}`
      );
    }

    // Emit socket event for real-time updates via HTTP request to socket service
    try {
      const axios = require("axios");
      const socketServiceUrl =
        env.SOCKET_SERVICE_URL ||
        `http://localhost:${env.SOCKET_PORT || "5001"}`;

      console.log(
        `🔔 Sending order update to socket service at ${socketServiceUrl}`
      );

      // Get qrCodeId from the original order (before update)
      const qrCodeId = order.qrCode?.id || order.qrCodeId || null;

      console.log(`🔍 Original order qrCode:`, order.qrCode);
      console.log(`🔍 Original order qrCodeId:`, order.qrCodeId);
      console.log(`📤 Using qrCodeId: ${qrCodeId}`);

      await axios.post(`${socketServiceUrl}/api/emit-order-update`, {
        order: updatedOrder,
        updatedBy: "customer",
        timestamp: new Date().toISOString(),
        restaurantId: order.restaurantId,
        tableNumber: order.tableNumber,
        qrCodeId: qrCodeId,
      });

      // Also emit KDS update with source "customer" to trigger visual/audio effects
      // Include order information so frontend can show effects
      console.log(
        `📤 Sending KDS update with source: customer for order ${updatedOrder.id}`
      );
      await axios.post(`${socketServiceUrl}/api/emit-kds-update`, {
        orderItem: {
          id: "new-items",
          order: updatedOrder,
        },
        restaurantId: order.restaurantId,
        timestamp: new Date().toISOString(),
        source: "customer", // Indicate this is from customer adding items
        orderId: updatedOrder.id,
      });
      console.log(`✅ KDS update sent with source: customer`);

      console.log("✅ Socket event emitted for order update");
    } catch (socketError: any) {
      console.error(
        "⚠️ Socket notification error:",
        socketError?.message || socketError
      );
      // Continue anyway - don't fail the request if socket is unavailable
    }

    res.json({
      success: true,
      message: "Items added to order successfully",
      data: { order: updatedOrder },
    });
  } catch (error) {
    console.error("Add items to order error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Add custom item to existing order (for restaurant use - fees, extras, etc.)
router.post(
  "/:id/add-item",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { name, quantity, price, notes } = req.body;
      const restaurantId = req.user!.restaurantId!;

      // Validate input
      if (!name || !quantity || price === undefined || price === null) {
        return res.status(400).json({
          success: false,
          message: "Name, quantity, and price are required",
        });
      }

      // Find the order
      const order = await prisma.order.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Check if order can be modified
      if (order.status === "COMPLETED" || order.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message: "Cannot modify completed or cancelled orders",
        });
      }

      // Calculate new total
      const itemTotal = Number(price) * Number(quantity);
      const currentSubtotal =
        Number(order.subtotal || order.totalPrice) + itemTotal;

      // Add custom item directly to order (WITHOUT creating a menu item)
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          quantity: Number(quantity),
          price: Number(price),
          notes: notes || null,
          isCustomItem: true,
          customItemName: name,
          customItemNameAr: name, // Use same name for both languages
          menuItemId: null, // No menu item for custom items
          kitchenItemStatus: "PENDING" as any, // Custom items also start as PENDING - TODO: Use enum after regenerating Prisma Client
        },
      });

      // Recalculate taxes with new subtotal
      const { taxes: calculatedTaxes, totalTaxAmount } = await calculateTaxes(
        restaurantId,
        currentSubtotal
      );
      const finalTotal = currentSubtotal + totalTaxAmount;

      // Update order with new subtotal, taxes, and total
      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          subtotal: currentSubtotal,
          taxes: calculatedTaxes.length > 0 ? calculatedTaxes : undefined,
          totalPrice: finalTotal,
        },
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

      res.json({
        success: true,
        message: "Item added to order successfully",
        data: { order: updatedOrder },
      });
    } catch (error) {
      console.error("Add item to order error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update order status
router.put(
  "/:id/status",
  authenticate,
  requireRestaurant,
  validateRequest(updateOrderStatusSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const restaurantId = req.user!.restaurantId!;

      const order = await prisma.order.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          cashierId: req.user!.id,
        },
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

      // Notify socket-service via HTTP for real-time broadcast
      // Don't send order_update for COMPLETED or CANCELLED orders to avoid notifications at cashier
      // Only send updates for status changes that are not final states
      try {
        const axios = require("axios");
        const baseUrl =
          env.SOCKET_SERVICE_URL ||
          `http://localhost:${env.SOCKET_PORT || "5001"}`;

        // Only send order_update if status is not COMPLETED or CANCELLED
        // This prevents notifications at cashier when order is completed
        if (status !== "CANCELLED" && status !== "COMPLETED") {
          await axios.post(`${baseUrl}/api/emit-order-update`, {
            order: updatedOrder,
            updatedBy: "restaurant",
            timestamp: new Date().toISOString(),
            restaurantId: restaurantId,
            qrCodeId: updatedOrder.qrCodeId,
          });
        }

        // If order is cancelled or completed, notify KDS to remove items from display
        if (status === "CANCELLED" || status === "COMPLETED") {
          await axios.post(`${baseUrl}/api/emit-kds-update`, {
            orderItem: null, // Signal to refresh all items
            restaurantId,
            timestamp: new Date().toISOString(),
            source: "kitchen", // No visual/audio effects for kitchen updates
            orderId: id, // Include order ID to help with refresh
          });
          console.log(
            `✅ Order ${id} ${status}, KDS update sent to remove items from display`
          );
          console.log(
            `🔇 Order ${id} ${status}, skipping order_update to prevent cashier notifications`
          );
        }
      } catch (socketError: any) {
        console.error(
          "⚠️ Socket notification error (status):",
          socketError?.message || socketError
        );
      }

      res.json({
        success: true,
        message: "Order status updated successfully",
        data: { order: updatedOrder },
      });
    } catch (error) {
      console.error("Update order status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get order statistics
router.get(
  "/stats/overview",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const { period = "30" } = req.query; // days

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(period));

      // Order count by status
      const orderStats = await prisma.order.groupBy({
        by: ["status"],
        where: {
          restaurantId,
          createdAt: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      // Total revenue
      const revenue = await prisma.order.aggregate({
        where: {
          restaurantId,
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
        _sum: {
          totalPrice: true,
        },
      });

      // Average order value
      const avgOrderValue = await prisma.order.aggregate({
        where: {
          restaurantId,
          status: "COMPLETED",
          createdAt: {
            gte: startDate,
          },
        },
        _avg: {
          totalPrice: true,
        },
      });

      // Orders by hour (for today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const ordersByHour = await prisma.order.groupBy({
        by: ["createdAt"],
        where: {
          restaurantId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        _count: {
          id: true,
        },
      });

      res.json({
        success: true,
        data: {
          orderStats: orderStats.reduce(
            (acc: Record<string, number>, stat: any) => {
              acc[stat.status] = stat._count.id;
              return acc;
            },
            {}
          ),
          revenue: revenue._sum.totalPrice || 0,
          averageOrderValue: avgOrderValue._avg.totalPrice || 0,
          totalOrders: orderStats.reduce(
            (sum: number, stat: any) => sum + stat._count.id,
            0
          ),
          ordersByHour,
        },
      });
    } catch (error) {
      console.error("Get order stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get orders for a specific table (public endpoint for customers)
router.get(
  "/table/:restaurantId/:tableNumber",
  async (req, res): Promise<any> => {
    try {
      const { restaurantId, tableNumber } = req.params;

      // Verify QR code exists
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
          message: "Invalid table number",
        });
      }

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          tableNumber,
          status: {
            not: "CANCELLED",
          },
        },
        orderBy: { createdAt: "desc" },
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
        },
      });

      res.json({
        success: true,
        data: { orders },
      });
    } catch (error) {
      console.error("Get table orders error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Generate WhatsApp URL for sending order to kitchen
router.get(
  "/:id/whatsapp-url",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { lang } = req.query;
      const restaurantId = req.user!.restaurantId!;

      // Get order with items
      const order = await prisma.order.findFirst({
        where: {
          id,
          restaurantId,
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  nameAr: true,
                  extras: true,
                },
              },
            },
          },
          restaurant: {
            select: {
              kitchenWhatsApp: true,
            },
          },
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      // Generate WhatsApp message
      const isRTL = lang === "ar";

      // Debug: Log order items
      console.log(
        "Order items for WhatsApp:",
        JSON.stringify(order.items, null, 2)
      );

      // Check if kitchen WhatsApp is configured
      if (!order.restaurant.kitchenWhatsApp) {
        return res.status(400).json({
          success: false,
          message: isRTL
            ? "لم يتم تكوين رقم واتساب المطبخ. يرجى إضافته في إعدادات المطعم."
            : "Kitchen WhatsApp is not configured. Please add it in restaurant settings.",
        });
      }
      const message = generateKitchenWhatsAppMessage(order, isRTL);
      console.log("Generated WhatsApp message:", message);
      const whatsappURL = generateWhatsAppURL(
        order.restaurant.kitchenWhatsApp,
        message
      );

      res.json({
        success: true,
        data: {
          whatsappURL,
          message,
        },
      });
    } catch (error) {
      console.error("Generate WhatsApp URL error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
