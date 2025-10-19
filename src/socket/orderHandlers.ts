import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma";

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
    console.log(`Client connected: ${socket.id}`);

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
        console.log(`Socket ${socket.id} joined restaurant ${restaurantId}`);

        socket.emit("joined_restaurant", {
          restaurantId,
          message: "Successfully joined restaurant room",
        });
      } catch (error) {
        console.error("Join restaurant error:", error);
        socket.emit("error", { message: "Failed to join restaurant room" });
      }
    });

    // Join table room for customer order tracking
    socket.on("join_table", async (data: { qrCodeId: string }) => {
      try {
        const { qrCodeId } = data;

        // Verify QR code exists
        const qrCode = await prisma.qRCode.findUnique({
          where: { id: qrCodeId },
        });

        if (!qrCode) {
          socket.emit("error", { message: "Invalid QR code" });
          return;
        }

        socket.join(`table_${qrCodeId}`);
        console.log(`Socket ${socket.id} joined table ${qrCodeId}`);

        socket.emit("joined_table", {
          qrCodeId,
          tableNumber: qrCode.tableNumber,
          message: "Successfully joined table room",
        });
      } catch (error) {
        console.error("Join table error:", error);
        socket.emit("error", { message: "Failed to join table room" });
      }
    });

    // Join admin room for admin notifications
    socket.on("join_admin", async (data: { adminId: string }) => {
      try {
        const { adminId } = data;

        // Verify admin exists
        const admin = await prisma.user.findFirst({
          where: {
            id: adminId,
            role: "ADMIN",
          },
        });

        if (!admin) {
          socket.emit("error", { message: "Admin not found" });
          return;
        }

        socket.join(`admin_${adminId}`);
        console.log(`Socket ${socket.id} joined admin ${adminId}`);

        socket.emit("joined_admin", {
          adminId,
          message: "Successfully joined admin room",
        });
      } catch (error) {
        console.error("Join admin error:", error);
        socket.emit("error", { message: "Failed to join admin room" });
      }
    });

    // Leave admin room
    socket.on("leave_admin", async (data: { adminId: string }) => {
      try {
        const { adminId } = data;
        socket.leave(`admin_${adminId}`);
        console.log(`Socket ${socket.id} left admin ${adminId}`);
      } catch (error) {
        console.error("Leave admin error:", error);
      }
    });

    // Handle order status updates from restaurant
    socket.on(
      "update_order_status",
      async (data: {
        orderId: string;
        status: string;
        restaurantId: string;
      }) => {
        try {
          const { orderId, status, restaurantId } = data;

          // Verify order exists and belongs to restaurant
          const order = await prisma.order.findFirst({
            where: {
              id: orderId,
              restaurantId,
            },
            include: {
              items: {
                include: {
                  menuItem: true,
                },
              },
              qrCode: true,
            },
          });

          if (!order) {
            socket.emit("error", { message: "Order not found" });
            return;
          }

          // Update order status
          const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { status: status as any },
            include: {
              items: {
                include: {
                  menuItem: true,
                },
              },
              qrCode: true,
            },
          });

          // Emit to restaurant room
          io.to(`restaurant_${restaurantId}`).emit("order_updated", {
            order: updatedOrder,
            message: `Order status updated to ${status}`,
            updatedBy: "restaurant", // Flag to indicate restaurant updated this
          });

          // Emit to specific table if QR code exists (for dine-in orders)
          if (updatedOrder.qrCodeId) {
            io.to(`table_${updatedOrder.qrCodeId}`).emit(
              "order_status_update",
              {
                order: updatedOrder,
                message: `Your order status is now ${status}`,
              }
            );
          }

          // For delivery orders, emit to all customers in the restaurant room
          // This allows delivery customers to receive updates
          io.to(`restaurant_${restaurantId}`).emit("order_status_update", {
            order: updatedOrder,
            message: `Your order status is now ${status}`,
            updatedBy: "restaurant", // Flag to indicate restaurant updated this
          });

          socket.emit("order_update_success", {
            orderId,
            status,
            message: "Order status updated successfully",
          });
        } catch (error) {
          console.error("Update order status error:", error);
          socket.emit("error", { message: "Failed to update order status" });
        }
      }
    );

    // Handle new order creation
    socket.on(
      "create_order",
      async (data: {
        restaurantId: string;
        orderType: "DINE_IN" | "DELIVERY";
        tableNumber?: string;
        items: any[];
        customerName?: string;
        customerPhone?: string;
        customerAddress?: string;
        notes?: string;
      }) => {
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

          // Get customer IP from socket
          const customerIP =
            socket.handshake.address ||
            socket.handshake.headers["x-forwarded-for"]
              ?.toString()
              .split(",")[0] ||
            socket.handshake.headers["x-real-ip"]?.toString() ||
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

          if (!restaurant || !restaurant.subscriptions?.length) {
            socket.emit("error", {
              message: "Restaurant not found or subscription inactive",
            });
            return;
          }

          // Verify QR code exists (only for dine-in orders)
          let qrCode = null;
          if (orderType === "DINE_IN") {
            if (!tableNumber) {
              socket.emit("error", {
                message: "Table number is required for dine-in orders",
              });
              return;
            }

            qrCode = await prisma.qRCode.findFirst({
              where: {
                restaurantId,
                tableNumber,
                isActive: true,
              },
            });

            if (!qrCode) {
              socket.emit("error", { message: "Invalid table number" });
              return;
            }
          }

          // Validate and calculate order total
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
                currency: true,
                discount: true,
                extras: true,
              },
            });

            if (!menuItem) {
              socket.emit("error", {
                message: `Menu item with ID ${item.menuItemId} not found or unavailable`,
              });
              return;
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
            });
          }

          // Get currency from first menu item
          const firstMenuItem = await prisma.menuItem.findFirst({
            where: {
              id: items[0].menuItemId,
            },
            select: {
              currency: true,
            },
          });

          // Create order
          const order = await prisma.order.create({
            data: {
              restaurantId,
              orderType,
              qrCodeId: qrCode?.id || null,
              tableNumber: orderType === "DINE_IN" ? tableNumber : null,
              totalPrice,
              currency: firstMenuItem?.currency || "USD",
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
                  menuItem: true,
                },
              },
              qrCode: true,
            },
          });

          // Emit to restaurant room
          const orderMessage =
            orderType === "DINE_IN"
              ? `New dine-in order received for table ${tableNumber}`
              : `New delivery order received for ${customerName}`;

          io.to(`restaurant_${restaurantId}`).emit("new_order", {
            order,
            message: orderMessage,
          });

          socket.emit("order_created", {
            order,
            message: "Order created successfully",
          });
        } catch (error) {
          console.error("Create order error:", error);
          socket.emit("error", { message: "Failed to create order" });
        }
      }
    );

    // Get unread notifications count for restaurant
    socket.on(
      "get_restaurant_unread_count",
      async (data: { restaurantId: string }) => {
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

          // Get unread count
          const unreadCount = await prisma.notification.count({
            where: {
              restaurantId: restaurantId,
              isRead: false,
            },
          });

          socket.emit("restaurant_unread_count", { unreadCount });
        } catch (error) {
          console.error("Get restaurant unread count error:", error);
          socket.emit("error", { message: "Failed to get unread count" });
        }
      }
    );

    // Get unread notifications count for admin
    socket.on("get_admin_unread_count", async (data: { adminId: string }) => {
      try {
        const { adminId } = data;

        // Verify admin exists
        const admin = await prisma.user.findFirst({
          where: {
            id: adminId,
            role: "ADMIN",
          },
        });

        if (!admin) {
          socket.emit("error", { message: "Admin not found" });
          return;
        }

        // Get unread count
        const unreadCount = await prisma.notification.count({
          where: {
            userId: adminId,
            isRead: false,
          },
        });

        socket.emit("admin_unread_count", { unreadCount });
      } catch (error) {
        console.error("Get admin unread count error:", error);
        socket.emit("error", { message: "Failed to get unread count" });
      }
    });

    // Handle waiter request from customer
    socket.on(
      "request_waiter",
      async (data: {
        restaurantId: string;
        tableNumber?: string;
        orderType: "DINE_IN" | "DELIVERY";
      }) => {
        try {
          const { restaurantId, tableNumber, orderType } = data;

          // Verify restaurant exists
          const restaurant = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
          });

          if (!restaurant) {
            socket.emit("error", { message: "Restaurant not found" });
            return;
          }

          // Create notification for restaurant
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

          // Emit waiter request to restaurant room
          io.to(`restaurant_${restaurantId}`).emit("waiter_request", {
            notification,
            tableNumber,
            orderType,
            message:
              orderType === "DINE_IN"
                ? `Waiter requested from table ${tableNumber}`
                : "Waiter requested from delivery order",
          });

          // Confirm to customer
          socket.emit("waiter_request_sent", {
            message: "Waiter request sent successfully",
          });

          console.log(
            `Waiter request from ${orderType} ${
              tableNumber || "delivery"
            } to restaurant ${restaurantId}`
          );
        } catch (error) {
          console.error("Waiter request error:", error);
          socket.emit("error", { message: "Failed to send waiter request" });
        }
      }
    );

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error from ${socket.id}:`, error);
    });
  });

  // Broadcast order updates to all connected clients
  const broadcastOrderUpdate = (restaurantId: string, order: any) => {
    io.to(`restaurant_${restaurantId}`).emit("order_updated", {
      order,
      message: "Order updated",
    });
  };

  // Broadcast new order to restaurant
  const broadcastNewOrder = (restaurantId: string, order: any) => {
    io.to(`restaurant_${restaurantId}`).emit("new_order", {
      order,
      message: "New order received",
    });
  };

  // Broadcast unread count update to restaurant
  const broadcastRestaurantUnreadCount = async (restaurantId: string) => {
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          restaurantId: restaurantId,
          isRead: false,
        },
      });

      io.to(`restaurant_${restaurantId}`).emit("restaurant_unread_count", {
        unreadCount,
      });
    } catch (error) {
      console.error("Error broadcasting restaurant unread count:", error);
    }
  };

  // Broadcast unread count update to admin
  const broadcastAdminUnreadCount = async (adminId: string) => {
    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: adminId,
          isRead: false,
        },
      });

      io.to(`admin_${adminId}`).emit("admin_unread_count", { unreadCount });
    } catch (error) {
      console.error("Error broadcasting admin unread count:", error);
    }
  };

  return {
    broadcastOrderUpdate,
    broadcastNewOrder,
    broadcastRestaurantUnreadCount,
    broadcastAdminUnreadCount,
  };
};
