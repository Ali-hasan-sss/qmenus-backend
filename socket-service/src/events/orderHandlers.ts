import { Server, Socket } from "socket.io";
import prisma from "../../../shared/config/db";

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

export const setupSocketHandlers = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`[socket-service] Client connected: ${socket.id}`);

    // Join restaurant room for order updates
    socket.on("join_restaurant", async (data: { restaurantId: string }) => {
      try {
        const { restaurantId } = data;

        // Verify restaurant exists
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId },
        });

        if (!restaurant) {
          socket.emit("error", { message: "Restaurant not found" });
          return;
        }

        socket.join(`restaurant_${restaurantId}`);
        console.log(
          `[socket-service] Socket ${socket.id} joined restaurant ${restaurantId}`
        );

        socket.emit("joined_restaurant", {
          restaurantId,
          message: "Successfully joined restaurant room",
        });
      } catch (error) {
        console.error("[socket-service] Join restaurant error:", error);
        socket.emit("error", { message: "Failed to join restaurant room" });
      }
    });

    // Join table room for customer order tracking
    socket.on("join_table", async (data: { qrCodeId: string }) => {
      try {
        const { qrCodeId } = data;
        console.log(`🔔 Received join_table request for qrCodeId: ${qrCodeId}`);

        // Verify QR code exists
        const qrCode = await prisma.qRCode.findUnique({
          where: { id: qrCodeId },
        });

        if (!qrCode) {
          console.error(`❌ QR code not found: ${qrCodeId}`);
          socket.emit("error", { message: "Invalid QR code" });
          return;
        }

        socket.join(`table_${qrCodeId}`);
        console.log(
          `✅ [socket-service] Socket ${socket.id} joined table_${qrCodeId} (Table ${qrCode.tableNumber})`
        );

        socket.emit("joined_table", {
          qrCodeId,
          tableNumber: qrCode.tableNumber,
          message: "Successfully joined table room",
        });
      } catch (error) {
        console.error("[socket-service] Join table error:", error);
        socket.emit("error", { message: "Failed to join table room" });
      }
    });

    // Join admin room for admin notifications
    socket.on("join_admin", async (data: { adminId: string }) => {
      try {
        const { adminId } = data;

        // Verify admin exists
        const admin = await prisma.user.findUnique({
          where: { id: adminId, role: "ADMIN" },
        });

        if (!admin) {
          socket.emit("error", { message: "Admin not found" });
          return;
        }

        socket.join(`admin_${adminId}`);
        console.log(
          `[socket-service] Socket ${socket.id} joined admin ${adminId}`
        );

        socket.emit("joined_admin", {
          adminId,
          message: "Successfully joined admin room",
        });
      } catch (error) {
        console.error("[socket-service] Join admin error:", error);
        socket.emit("error", { message: "Failed to join admin room" });
      }
    });

    // Handle new order creation
    socket.on("new_order", async (data: any) => {
      try {
        console.log("[socket-service] New order received:", data);

        const { restaurantId, orderId } = data;

        // Get order details
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            restaurant: true,
            items: {
              include: {
                menuItem: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        });

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        // Emit to restaurant room
        io.to(`restaurant_${restaurantId}`).emit("order_created", {
          order,
          message: "New order received",
        });

        console.log(
          `[socket-service] Order ${orderId} broadcasted to restaurant ${restaurantId}`
        );
      } catch (error) {
        console.error("[socket-service] New order error:", error);
        socket.emit("error", { message: "Failed to process new order" });
      }
    });

    // Handle customer order creation
    socket.on("create_order", async (data: any) => {
      try {
        const {
          restaurantId,
          orderType,
          tableNumber,
          items,
          customerName,
          customerPhone,
          customerAddress,
          notes,
        } = data;

        console.log("[socket-service] Create order received:", {
          restaurantId,
          orderType,
          tableNumber,
          items: items?.length,
        });

        // First, validate the restaurant exists
        const restaurant = await prisma.restaurant.findUnique({
          where: { id: restaurantId },
          include: {
            menus: { include: { categories: { include: { items: true } } } },
          },
        });

        if (!restaurant) {
          socket.emit("order_error", { message: "Restaurant not found" });
          return;
        }

        if (!restaurant.menus || restaurant.menus.length === 0) {
          socket.emit("order_error", { message: "Restaurant has no menu" });
          return;
        }

        const menu = restaurant.menus[0];

        // Find QR code for this table if it's a dine-in order
        let qrCodeId = null;
        if (orderType === "DINE_IN" && tableNumber) {
          const qrCode = await prisma.qRCode.findFirst({
            where: {
              restaurantId,
              tableNumber,
            },
          });
          if (qrCode) {
            qrCodeId = qrCode.id;
            console.log(
              `📋 Found QR Code: ${qrCodeId} for table ${tableNumber}`
            );
          }
        }

        // Validate and create order items
        const orderItems = items.map((item: any) => {
          // Find menu item in all categories
          let foundItem: any = null;
          for (const category of menu.categories) {
            foundItem = category.items.find(
              (mi: any) => mi.id === item.menuItemId
            );
            if (foundItem) break;
          }

          if (!foundItem) {
            throw new Error(`Menu item ${item.menuItemId} not found`);
          }

          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: parseFloat(foundItem.price) || 0,
            notes: item.notes,
          };
        });

        // Calculate total price
        const totalPrice = orderItems.reduce((sum: number, item: any) => {
          return sum + item.price * item.quantity;
        }, 0);

        // Create the order in the database
        const orderData: any = {
          restaurant: {
            connect: { id: restaurantId },
          },
          orderType,
          tableNumber: tableNumber || null,
          status: "PENDING",
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerAddress: customerAddress || null,
          notes: notes || null,
          totalPrice,
          items: {
            create: orderItems,
          },
        };

        // Connect QR Code if found
        if (qrCodeId) {
          orderData.qrCode = { connect: { id: qrCodeId } };
        }

        const order = await prisma.order.create({
          data: orderData,
          include: {
            restaurant: true,
            items: {
              include: {
                menuItem: {
                  include: {
                    category: true,
                  },
                },
              },
            },
            qrCode: true,
          },
        });

        console.log(`📋 Order created with qrCodeId: ${qrCodeId}`);

        console.log(`[socket-service] Order created: ${order.id}`);

        // Emit success to the customer
        socket.emit("order_created", {
          order,
          message: "Order created successfully",
        });

        // Broadcast to restaurant room
        io.to(`restaurant_${restaurantId}`).emit("new_order", {
          order,
          message: "New order received",
        });

        // Also emit to admin if exists
        io.to("admin_all").emit("new_order", {
          order,
          message: "New order received",
        });
      } catch (error: any) {
        console.error("[socket-service] Create order error:", error);
        socket.emit("order_error", {
          message: error.message || "Failed to create order",
        });
      }
    });

    // Handle order status updates
    socket.on("update_order_status", async (data: any) => {
      try {
        const { orderId, status, updatedBy } = data;

        // Update order in database
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status },
          include: {
            restaurant: true,
            items: {
              include: {
                menuItem: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        });

        // Emit to restaurant room
        io.to(`restaurant_${updatedOrder.restaurantId}`).emit("order_updated", {
          order: updatedOrder,
          updatedBy,
          message: `Order status updated to ${status}`,
        });

        // Emit to table room if it's a dine-in order
        if (updatedOrder.orderType === "DINE_IN" && updatedOrder.tableNumber) {
          // Find QR code for this table
          const qrCode = await prisma.qRCode.findFirst({
            where: {
              restaurantId: updatedOrder.restaurantId,
              tableNumber: updatedOrder.tableNumber,
            },
          });

          if (qrCode) {
            io.to(`table_${qrCode.id}`).emit("order_status_update", {
              order: updatedOrder,
              updatedBy,
            });
          }
        }

        // Emit to all sockets connected to this restaurant (for real-time updates)
        io.to(`restaurant_${updatedOrder.restaurantId}`).emit("order_update", {
          order: updatedOrder,
          updatedBy,
          timestamp: new Date().toISOString(),
        });

        // Also emit order_status_update for consistency
        io.to(`restaurant_${updatedOrder.restaurantId}`).emit(
          "order_status_update",
          {
            order: updatedOrder,
            updatedBy,
            message: `Order updated to ${status}`,
          }
        );

        console.log(
          `[socket-service] Order ${orderId} status updated to ${status}`
        );
      } catch (error) {
        console.error("[socket-service] Update order status error:", error);
        socket.emit("error", { message: "Failed to update order status" });
      }
    });

    // Handle waiter request
    socket.on(
      "request_waiter",
      async (data: {
        restaurantId: string;
        tableNumber?: string;
        orderType: "DINE_IN" | "DELIVERY";
      }) => {
        try {
          const { restaurantId, tableNumber, orderType } = data;

          const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
          });

          if (!restaurant) {
            socket.emit("error", { message: "Restaurant not found" });
            return;
          }

          const notification = await prisma.notification.create({
            data: {
              restaurantId,
              type: "WAITER_REQUEST",
              title:
                orderType === "DINE_IN"
                  ? `طلب نادل من الطاولة ${tableNumber}`
                  : "طلب نادل من طلب التوصيل",
              body:
                orderType === "DINE_IN"
                  ? `الزبون في الطاولة ${tableNumber} يطلب النادل`
                  : "زبون التوصيل يطلب النادل",
              isRead: false,
            },
          });

          io.to(`restaurant_${restaurantId}`).emit("waiter_request", {
            notification,
            tableNumber,
            orderType,
            message:
              orderType === "DINE_IN"
                ? `Waiter requested from table ${tableNumber}`
                : "Waiter requested from delivery order",
          });

          socket.emit("waiter_request_sent", {
            message: "Waiter request sent successfully",
          });

          console.log(
            `[socket-service] Waiter request from ${orderType} ${
              tableNumber || "delivery"
            } to restaurant ${restaurantId}`
          );
        } catch (error) {
          console.error("[socket-service] Waiter request error:", error);
          socket.emit("error", { message: "Failed to send waiter request" });
        }
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[socket-service] Client disconnected: ${socket.id}`);
    });
  });
};
