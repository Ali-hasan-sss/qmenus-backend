import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { env } from "../../shared/config/env";
import { setupSocketHandlers } from "./events/orderHandlers";

const app = express();
app.use(cors({ origin: env.NODE_ENV === "production" ? (process.env.FRONTEND_URL || "http://localhost:3000") : true, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "socket",
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.NODE_ENV === "production" ? (process.env.FRONTEND_URL || "http://localhost:3000") : true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// HTTP API for emitting socket events (must be before server starts)
app.post("/api/emit-order-update", async (req, res) => {
  try {
    const { order, updatedBy, timestamp, restaurantId, qrCodeId } = req.body;

    console.log("📨 Received order update request:", {
      orderId: order?.id,
      updatedBy,
      restaurantId,
    });

    // Emit to restaurant room
    if (restaurantId) {
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
    }

    // Emit to table room when qrCodeId is provided (covers dine-in reliably)
    if (qrCodeId) {
      console.log(`🔔 Emitting to table_${qrCodeId}...`);
      const roomClients = await io.in(`table_${qrCodeId}`).allSockets();
      console.log(`📊 Clients in table_${qrCodeId}: ${roomClients.size}`);

      io.to(`table_${qrCodeId}`).emit("order_status_update", {
        order,
        updatedBy,
      });
      console.log(`✅ Emitted order_status_update to table_${qrCodeId}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error emitting order update:", error);
    res.status(500).json({ success: false, error: "Failed to emit update" });
  }
});

const port = Number(env.SOCKET_PORT || env.PORT || 5001);
server.listen(port, "0.0.0.0", () => {
  console.log(`[socket-service] running on port ${port}`);
  console.log(`[socket-service] environment: ${env.NODE_ENV}`);
  console.log(`[socket-service] listening on all network interfaces (0.0.0.0)`);

  // Setup socket handlers AFTER server starts
  setupSocketHandlers(io);
});
