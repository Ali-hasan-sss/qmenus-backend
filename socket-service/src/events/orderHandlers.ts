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

        // Join both specific admin room and admin_all room
        socket.join(`admin_${adminId}`);
        socket.join("admin_all");
        console.log(
          `[socket-service] Socket ${socket.id} joined admin ${adminId} and admin_all`
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
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    description: true,
                    descriptionAr: true,
                    price: true,
                    image: true,
                    sortOrder: true,
                    isAvailable: true,
                    discount: true,
                    extras: true,
                    categoryId: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        nameAr: true,
                      },
                    },
                    createdAt: true,
                    updatedAt: true,
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
            menus: {
              include: {
                categories: {
                  include: {
                    items: {
                      select: {
                        id: true,
                        name: true,
                        nameAr: true,
                        description: true,
                        descriptionAr: true,
                        price: true,
                        image: true,
                        sortOrder: true,
                        isAvailable: true,
                        discount: true,
                        extras: true,
                        categoryId: true,
                        createdAt: true,
                        updatedAt: true,
                      },
                    },
                  },
                },
              },
            },
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
          console.log(
            `🔍 [Socket] Looking for QR code - Restaurant: ${restaurantId}, Table: ${tableNumber}`
          );

          // Normalize tableNumber to string to ensure consistent matching
          const normalizedTableNumber = String(tableNumber).trim();

          const qrCode = await prisma.qRCode.findFirst({
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
              `❌ [Socket] QR code not found for Restaurant: ${restaurantId}, Table: ${normalizedTableNumber} (type: ${typeof tableNumber})`
            );
            socket.emit("order_error", {
              message: "Invalid table number or QR code",
            });
            return;
          }

          console.log(
            `🔍 [Socket] Found QR Code - Table: ${qrCode.tableNumber}, QR ID: ${qrCode.id}, Prisma isOccupied: ${qrCode.isOccupied}`
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
            `🔍 [Socket] Table ${normalizedTableNumber} (QR ID: ${qrCode.id}) - Raw query isOccupied: ${isOccupied}, Raw result:`,
            occupiedResult
          );

          if (!isOccupied) {
            socket.emit("order_error", {
              message:
                "Table is not occupied. Please ask the cashier to start a session for this table.",
            });
            return;
          }

          qrCodeId = qrCode.id;
          console.log(
            `📋 Found QR Code: ${qrCodeId} for table ${tableNumber} (occupied: ${isOccupied})`
          );
        }

        // Get restaurant settings for tax calculation
        const settings = await prisma.restaurantSettings.findUnique({
          where: { restaurantId },
        });
        
        // Calculate total tax percentage
        let totalTaxPercentage = 0;
        if (settings && settings.taxes) {
          const taxesConfig = settings.taxes as any;
          if (Array.isArray(taxesConfig) && taxesConfig.length > 0) {
            totalTaxPercentage = taxesConfig.reduce((sum: number, tax: any) => {
              if (tax && tax.percentage !== undefined) {
                return sum + Number(tax.percentage);
              }
              return sum;
            }, 0);
          }
        }

        // Validate and create order items with discount and tax calculation
        let totalPriceInclusive = 0;
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

          // ============================================
          // TAX-INCLUSIVE PRICING: EXTRACT TAXES FIRST, THEN APPLY DISCOUNT
          // ============================================
          const originalPriceInclusive = Number(foundItem.price) || 0;
          
          // Get discount from menuItem (at order creation time)
          let discountValue = 0;
          try {
            if (foundItem.discount !== null && foundItem.discount !== undefined) {
              let discountNum: number;
              
              if (typeof foundItem.discount === 'object' && foundItem.discount !== null) {
                if ('toNumber' in foundItem.discount && typeof (foundItem.discount as any).toNumber === 'function') {
                  discountNum = (foundItem.discount as any).toNumber();
                } else if ('toString' in foundItem.discount && typeof (foundItem.discount as any).toString === 'function') {
                  discountNum = parseFloat((foundItem.discount as any).toString());
                } else {
                  discountNum = Number(foundItem.discount);
                }
              } else if (typeof foundItem.discount === 'number') {
                discountNum = foundItem.discount;
              } else if (typeof foundItem.discount === 'string') {
                discountNum = parseFloat(foundItem.discount);
              } else {
                discountNum = Number(foundItem.discount);
              }
              
              if (!isNaN(discountNum) && isFinite(discountNum) && discountNum >= 0 && discountNum <= 100) {
                discountValue = discountNum;
              }
            }
          } catch (error) {
            console.error(`[Socket] Error converting discount for item ${foundItem.name}:`, error);
          }
          
          // Extract price without tax from tax-inclusive price
          let priceWithoutTax = totalTaxPercentage > 0
            ? originalPriceInclusive / (1 + totalTaxPercentage / 100)
            : originalPriceInclusive;
          
          // Apply discount to price WITHOUT tax
          if (discountValue > 0 && discountValue <= 100) {
            priceWithoutTax = priceWithoutTax * (1 - discountValue / 100);
          }
          
          // Calculate final tax-inclusive price after discount
          const finalPriceInclusive = totalTaxPercentage > 0
            ? priceWithoutTax * (1 + totalTaxPercentage / 100)
            : priceWithoutTax;
          
          // Calculate extras price (assumed tax-inclusive)
          let extrasPrice = 0;
          if (item.extras && typeof item.extras === "object") {
            Object.values(item.extras).forEach((extraGroup: any) => {
              if (Array.isArray(extraGroup)) {
                extraGroup.forEach((extraId: string) => {
                  if (foundItem.extras) {
                    Object.values(foundItem.extras).forEach((group: any) => {
                      if (group.options) {
                        const option = group.options.find((opt: any) => opt.id === extraId);
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
          
          // Calculate item total (tax-inclusive, after discount + extras)
          const itemTotalInclusive = (finalPriceInclusive + extrasPrice) * item.quantity;
          totalPriceInclusive += itemTotalInclusive;
          
          // Add extras details to notes
          let finalNotes = item.notes || "";
          if (item.extras && Object.keys(item.extras).length > 0) {
            const extrasNames = getExtrasNamesForNotes(item.extras, foundItem.extras);
            if (extrasNames.length > 0) {
              const extrasText = `Extras: ${extrasNames.join(", ")}`;
              finalNotes = finalNotes ? `${finalNotes}; ${extrasText}` : extrasText;
            }
          }
          
          console.log(`[Socket] Item: ${foundItem.name}, Original: ${originalPriceInclusive}, Discount: ${discountValue}%, Final: ${finalPriceInclusive}, Extras: ${extrasPrice}, Total: ${itemTotalInclusive}`);
          
          return {
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: finalPriceInclusive + extrasPrice, // Tax-inclusive price per item (AFTER discount + extras) - FROZEN at order creation
            discount: discountValue > 0 && discountValue <= 100 ? discountValue : null, // Discount % at order creation (0-100) - FROZEN, stored with order item
            notes: finalNotes,
            extras: item.extras,
            kitchenItemStatus: "PENDING" as any, // New items start as PENDING (waiting) - TODO: Use enum after regenerating Prisma Client
          };
        });

        // Total price = sum of all tax-inclusive prices (after discount)
        const totalPrice = totalPriceInclusive;

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
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    description: true,
                    descriptionAr: true,
                    price: true,
                    image: true,
                    sortOrder: true,
                    isAvailable: true,
                    discount: true,
                    extras: true,
                    categoryId: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        nameAr: true,
                      },
                    },
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
            qrCode: true,
          },
        });

        console.log(`📋 Order created with qrCodeId: ${qrCodeId}`);

        console.log(`[socket-service] Order created: ${order.id}`);

        // Check if this is a quick order (created by cashier)
        const isQuickOrder = order.tableNumber === "QUICK";

        // Emit success to the customer (always emit for UI updates)
        socket.emit("order_created", {
          order,
          message: "Order created successfully",
        });

        // Broadcast to restaurant room (always emit for UI updates, but notifications are skipped for quick orders)
        io.to(`restaurant_${restaurantId}`).emit("new_order", {
          order,
          message: isQuickOrder ? "Quick order received" : "New order received",
        });

        // Also emit to admin if exists (always emit for UI updates)
        io.to("admin_all").emit("new_order", {
          order,
          message: isQuickOrder ? "Quick order received" : "New order received",
        });

        // Emit KDS update to trigger visual/audio effects
        console.log(
          `📤 [Socket] Sending KDS update with source: ${
            isQuickOrder ? "restaurant" : "customer"
          } for new order ${order.id}`
        );
        io.to(`restaurant_${restaurantId}`).emit("kds_update", {
          orderItem: {
            id: "new-order",
            order: order,
          },
          restaurantId: restaurantId,
          timestamp: new Date().toISOString(),
          source: isQuickOrder ? "restaurant" : "customer", // Indicate source of order
          orderId: order.id,
        });
        console.log(
          `✅ [Socket] KDS update sent with source: ${
            isQuickOrder ? "restaurant" : "customer"
          } for new order`
        );
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
                  select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    description: true,
                    descriptionAr: true,
                    price: true,
                    image: true,
                    sortOrder: true,
                    isAvailable: true,
                    discount: true,
                    extras: true,
                    categoryId: true,
                    category: {
                      select: {
                        id: true,
                        name: true,
                        nameAr: true,
                      },
                    },
                    createdAt: true,
                    updatedAt: true,
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

          // For dine-in orders, check if table session is active
          if (orderType === "DINE_IN" && tableNumber) {
            const normalizedTableNumber = String(tableNumber).trim();

            console.log(
              `🔍 [Waiter Request] Checking table session - Restaurant: ${restaurantId}, Table: ${normalizedTableNumber}`
            );

            const qrCode = await prisma.qRCode.findFirst({
              where: {
                restaurantId,
                tableNumber: normalizedTableNumber,
                isActive: true,
              },
              select: {
                id: true,
                tableNumber: true,
              },
            });

            if (!qrCode) {
              console.log(
                `❌ [Waiter Request] QR code not found for Restaurant: ${restaurantId}, Table: ${normalizedTableNumber}`
              );
              socket.emit("waiter_request_error", {
                message: "Invalid table number or QR code",
              });
              return;
            }

            // Check if table is occupied (session is active)
            // Use raw query to ensure we get the correct value from database
            const occupiedResult = await prisma.$queryRaw<
              Array<{ isOccupied: boolean }>
            >`
              SELECT "isOccupied" FROM qr_codes WHERE id = ${qrCode.id}
            `;
            const isOccupied = occupiedResult[0]?.isOccupied ?? false;

            console.log(
              `🔍 [Waiter Request] Table ${normalizedTableNumber} (QR ID: ${qrCode.id}) - isOccupied: ${isOccupied}`
            );

            if (!isOccupied) {
              socket.emit("waiter_request_error", {
                message:
                  "Table is not occupied. Please ask the cashier to start a session for this table.",
              });
              return;
            }
          }

          // Create temporary notification object (not saved to database)
          const notification = {
            id: `waiter-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
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
            createdAt: new Date(),
            updatedAt: new Date(),
          };

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
            `✅ [socket-service] Waiter request from ${orderType} ${
              tableNumber || "delivery"
            } to restaurant ${restaurantId}`
          );
        } catch (error) {
          console.error("[socket-service] Waiter request error:", error);
          socket.emit("waiter_request_error", {
            message: "Failed to send waiter request",
          });
        }
      }
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`[socket-service] Client disconnected: ${socket.id}`);
    });
  });
};
