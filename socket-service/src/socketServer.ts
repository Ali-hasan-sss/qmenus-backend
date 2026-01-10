import http from "http";
import express, { Request, Response } from "express";
import cors from "cors";
import { Server } from "socket.io";
import { env } from "../../shared/config/env";
import { setupSocketHandlers } from "./events/orderHandlers";

const app = express();
app.use(
  cors({
    origin:
      env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL || "http://localhost:3000"
        : true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "socket",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint for socket service
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "socket-service",
    status: "running",
    endpoints: {
      health: "/health",
      socket: "Socket.IO connection endpoint",
    },
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:
      env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL || "http://localhost:3000"
        : true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// HTTP API for emitting socket events (must be before server starts)
app.post("/api/emit-order-update", async (req: Request, res: Response) => {
  try {
    const {
      order,
      updatedBy,
      timestamp,
      restaurantId,
      qrCodeId,
      skipRestaurantRoom,
    } = req.body;

    console.log("📨 Received order update request:", {
      orderId: order?.id,
      updatedBy,
      restaurantId,
      skipRestaurantRoom,
    });

    // Emit to restaurant room (unless skipRestaurantRoom is true)
    // This allows sending updates to customer only without triggering cashier notifications
    if (restaurantId && !skipRestaurantRoom) {
      console.log(`🔔 Emitting to restaurant_${restaurantId}...`);
      io.to(`restaurant_${restaurantId}`).emit("order_update", {
        order,
        updatedBy,
        timestamp,
      });
      console.log(`✅ Emitted order_update to restaurant_${restaurantId}`);

      // Also emit order_status_update for UI updates
      io.to(`restaurant_${restaurantId}`).emit("order_status_update", {
        order,
        updatedBy,
      });
      console.log(
        `✅ Emitted order_status_update to restaurant_${restaurantId}`
      );
    } else if (skipRestaurantRoom) {
      console.log(
        `🔇 Skipping restaurant room emission to prevent cashier notifications`
      );
    }

    // Emit to table room when qrCodeId is provided (covers dine-in reliably)
    // This ensures customer receives the update even if restaurant room is skipped
    if (qrCodeId) {
      console.log(`🔔 Emitting to table_${qrCodeId}...`);
      const roomClients = await io.in(`table_${qrCodeId}`).allSockets();
      console.log(`📊 Clients in table_${qrCodeId}: ${roomClients.size}`);

      io.to(`table_${qrCodeId}`).emit("order_status_update", {
        order,
        updatedBy,
      });
      console.log(`✅ Emitted order_status_update to table_${qrCodeId}`);

      // Also emit order_update for consistency
      io.to(`table_${qrCodeId}`).emit("order_update", {
        order,
        updatedBy,
        timestamp,
      });
      console.log(`✅ Emitted order_update to table_${qrCodeId}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error emitting order update:", error);
    res.status(500).json({ success: false, error: "Failed to emit update" });
  }
});

// HTTP API for emitting KDS updates
app.post("/api/emit-kds-update", async (req: Request, res: Response) => {
  try {
    const { orderItem, restaurantId, timestamp, source, orderId } = req.body;

    console.log("📨 Received KDS update request:", {
      orderItemId: orderItem?.id,
      restaurantId,
      source: source || "kitchen",
    });

    // Emit to restaurant room for KDS updates
    if (restaurantId) {
      console.log(`🔔 Emitting kds_update to restaurant_${restaurantId}...`);
      io.to(`restaurant_${restaurantId}`).emit("kds_update", {
        orderItem,
        restaurantId,
        timestamp: timestamp || new Date().toISOString(),
        source: source || "kitchen", // "customer" for new items, "kitchen" for status changes
        orderId: orderId || orderItem?.order?.id,
      });
      console.log(`✅ Emitted kds_update to restaurant_${restaurantId}`);

      // Only emit order_update if source is customer (new items added)
      if (source === "customer") {
        // Get order from orderItem or fetch it if not included
        const orderData = orderItem?.order;
        if (orderData) {
          io.to(`restaurant_${restaurantId}`).emit("order_update", {
            order: orderData,
            updatedBy: "customer",
            timestamp: timestamp || new Date().toISOString(),
          });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error emitting KDS update:", error);
    res.status(500).json({
      success: false,
      error: "Failed to emit KDS update",
    });
  }
});

// HTTP API for emitting notifications
app.post("/api/emit-notification", async (req: Request, res: Response) => {
  try {
    const { notification, restaurantIds } = req.body;

    console.log("📨 Received notification emit request:", {
      notificationId: notification?.id,
      restaurantIds: restaurantIds?.length || 0,
    });

    if (!notification) {
      return res.status(400).json({
        success: false,
        error: "Notification data is required",
      });
    }

    // Emit to specific restaurants
    if (restaurantIds && Array.isArray(restaurantIds)) {
      for (const restaurantId of restaurantIds) {
        console.log(
          `🔔 Emitting notification to restaurant_${restaurantId}...`
        );
        io.to(`restaurant_${restaurantId}`).emit("notification", {
          notification,
          type: "NEW_NOTIFICATION",
        });
        console.log(`✅ Emitted notification to restaurant_${restaurantId}`);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error emitting notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to emit notification",
    });
  }
});

// Render uses PORT environment variable to determine which port to listen on
const port = Number(process.env.PORT || env.SOCKET_PORT || 5001);
server.listen(port, "0.0.0.0", () => {
  console.log(`[socket-service] running on port ${port}`);
  console.log(`[socket-service] environment: ${env.NODE_ENV}`);
  console.log(`[socket-service] listening on all network interfaces (0.0.0.0)`);

  // Setup socket handlers AFTER server starts
  setupSocketHandlers(io);
});
