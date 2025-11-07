import express, { Response } from "express";
import QRCode from "qrcode";
import prisma from "../../shared/config/db";
import {
  authenticate,
  AuthRequest,
  requireRestaurant,
} from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { createQRCodeSchema } from "../validators/restaurantValidators";
import { validatePlanLimits } from "../middleware/planLimits";

const router = express.Router();

// Create or fetch a static restaurant-level QR code (no table number in URL)
router.post(
  "/restaurant-code",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;

      // Static restaurant QR uses a sentinel tableNumber value to avoid schema changes
      const RESTAURANT_SENTINEL = "ROOT";

      // Check if restaurant-level QR already exists
      let qrCode = await prisma.qRCode.findFirst({
        where: {
          restaurantId,
          tableNumber: RESTAURANT_SENTINEL,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      // Use "DELIVERY" as special tableNumber for restaurant QR (delivery orders)
      const qrCodeUrl = `${frontendUrl}/menu/${restaurantId}?tableNumber=DELIVERY`;

      if (!qrCode) {
        qrCode = await prisma.qRCode.create({
          data: {
            tableNumber: RESTAURANT_SENTINEL,
            qrCode: qrCodeUrl,
            restaurantId,
          },
        });
      } else {
        // Update existing QR code URL in case restaurantId changed
        qrCode = await prisma.qRCode.update({
          where: { id: qrCode.id },
          data: {
            qrCode: qrCodeUrl,
          },
        });
      }

      const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      return res.status(201).json({
        success: true,
        message: "Restaurant QR code is ready",
        data: {
          qrCode: {
            id: qrCode.id,
            tableNumber: null,
            qrCodeUrl,
            qrCodeImage,
            isActive: qrCode.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Create restaurant QR code error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get static restaurant-level QR code
router.get(
  "/restaurant-code",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const RESTAURANT_SENTINEL = "ROOT";

      const qrCode = await prisma.qRCode.findFirst({
        where: {
          restaurantId,
          tableNumber: RESTAURANT_SENTINEL,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      // Use "DELIVERY" as special tableNumber for restaurant QR (delivery orders)
      const qrCodeUrl = `${frontendUrl}/menu/${restaurantId}?tableNumber=DELIVERY`;

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "Restaurant QR code not found. Create it first.",
        });
      }

      // Update QR code URL in case restaurantId changed
      let finalQRCode = qrCode;
      if (qrCode.qrCode !== qrCodeUrl) {
        finalQRCode = await prisma.qRCode.update({
          where: { id: qrCode.id },
          data: {
            qrCode: qrCodeUrl,
          },
        });
      }

      const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      return res.json({
        success: true,
        data: {
          qrCode: {
            id: finalQRCode.id,
            tableNumber: null,
            qrCodeUrl,
            qrCodeImage,
            isActive: finalQRCode.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Get restaurant QR code error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Generate QR code for a table
router.post(
  "/generate",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkTableLimits,
  validateRequest(createQRCodeSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { tableNumber } = req.body;
      const restaurantId = req.user!.restaurantId!;

      // Check if QR code already exists for this table
      const existingQRCode = await prisma.qRCode.findFirst({
        where: {
          restaurantId,
          tableNumber,
        },
      });

      if (existingQRCode) {
        return res.status(400).json({
          success: false,
          message: "QR code already exists for this table number",
        });
      }

      // Generate unique QR code URL
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const qrCodeUrl = `${frontendUrl}/menu/${restaurantId}?tableNumber=${tableNumber}`;

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Save QR code to database
      const qrCode = await prisma.qRCode.create({
        data: {
          tableNumber,
          qrCode: qrCodeUrl,
          restaurantId,
        },
      });

      res.status(201).json({
        success: true,
        message: "QR code generated successfully",
        data: {
          qrCode: {
            id: qrCode.id,
            tableNumber: qrCode.tableNumber,
            qrCodeUrl: qrCode.qrCode,
            qrCodeImage,
            isActive: qrCode.isActive,
          },
        },
      });
    } catch (error) {
      console.error("Generate QR code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get all QR codes for restaurant (excluding ROOT restaurant code)
router.get(
  "/",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const restaurantId = req.user!.restaurantId!;
      const { status = "all" } = req.query;

      const whereClause: any = {
        restaurantId,
        tableNumber: {
          not: "ROOT", // استبعاد رمز QR للمطعم
        },
      };
      if (status !== "all") {
        whereClause.isActive = status === "active";
      }

      const qrCodes = await prisma.qRCode.findMany({
        where: whereClause,
        orderBy: {
          tableNumber: "asc", // ترتيب حسب رقم الطاولة
        },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      // Generate QR code images for each QR code
      const qrCodesWithImages = await Promise.all(
        qrCodes.map(async (qrCode) => {
          const qrCodeImage = await QRCode.toDataURL(qrCode.qrCode, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });

          return {
            ...qrCode,
            qrCodeImage,
          };
        })
      );

      res.json({
        success: true,
        data: {
          qrCodes: qrCodesWithImages,
        },
      });
    } catch (error) {
      console.error("Get QR codes error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Get specific QR code
router.get(
  "/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const qrCode = await prisma.qRCode.findFirst({
        where: {
          id,
          restaurantId,
        },
        include: {
          _count: {
            select: {
              orders: true,
            },
          },
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found",
        });
      }

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(qrCode.qrCode, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      res.json({
        success: true,
        data: {
          qrCode: {
            ...qrCode,
            qrCodeImage,
          },
        },
      });
    } catch (error) {
      console.error("Get QR code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Toggle QR code active status
router.put(
  "/:id/toggle",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const qrCode = await prisma.qRCode.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found",
        });
      }

      const updatedQRCode = await prisma.qRCode.update({
        where: { id },
        data: {
          isActive: !qrCode.isActive,
        },
      });

      res.json({
        success: true,
        message: `QR code ${
          updatedQRCode.isActive ? "activated" : "deactivated"
        } successfully`,
        data: { qrCode: updatedQRCode },
      });
    } catch (error) {
      console.error("Toggle QR code status error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Bulk delete QR codes
router.delete(
  "/bulk-delete",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { qrCodeIds } = req.body;
      const restaurantId = req.user!.restaurantId!;

      if (!Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "QR code IDs array is required",
        });
      }

      // Verify all QR codes belong to this restaurant
      const qrCodes = await prisma.qRCode.findMany({
        where: {
          id: { in: qrCodeIds },
          restaurantId,
        },
        select: { id: true, tableNumber: true },
      });

      if (qrCodes.length !== qrCodeIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some QR codes not found or don't belong to this restaurant",
        });
      }

      // Delete QR codes
      await prisma.qRCode.deleteMany({
        where: {
          id: { in: qrCodeIds },
          restaurantId,
        },
      });

      res.json({
        success: true,
        message: `${qrCodes.length} QR codes deleted successfully`,
        data: {
          deletedQRCodes: qrCodes.map((qr) => ({
            id: qr.id,
            tableNumber: qr.tableNumber,
          })),
        },
      });
    } catch (error) {
      console.error("Bulk delete QR codes error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete QR code
router.delete(
  "/:id",
  authenticate,
  requireRestaurant,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const restaurantId = req.user!.restaurantId!;

      const qrCode = await prisma.qRCode.findFirst({
        where: {
          id,
          restaurantId,
        },
      });

      if (!qrCode) {
        return res.status(404).json({
          success: false,
          message: "QR code not found",
        });
      }

      await prisma.qRCode.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "QR code deleted successfully",
      });
    } catch (error) {
      console.error("Delete QR code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Bulk generate QR codes (sequential from 1 to count)
router.post(
  "/bulk-generate-sequential",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkBulkTableLimits,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { count } = req.body;
      const restaurantId = req.user!.restaurantId!;

      if (!count || count <= 0 || count > 100) {
        return res.status(400).json({
          success: false,
          message: "Count must be a number between 1 and 100",
        });
      }

      // Generate table numbers from 1 to count
      const tableNumbers = Array.from({ length: count }, (_, i) =>
        (i + 1).toString()
      );

      // Check for existing QR codes
      const existingQRCodes = await prisma.qRCode.findMany({
        where: {
          restaurantId,
          tableNumber: {
            in: tableNumbers,
          },
        },
        select: { tableNumber: true },
      });

      const existingTableNumbers = existingQRCodes.map((qr) => qr.tableNumber);
      const newTableNumbers = tableNumbers.filter(
        (table: string) => !existingTableNumbers.includes(table)
      );

      // Create QR codes for new tables only
      const createdQRCodes = [];
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

      for (const tableNumber of newTableNumbers) {
        const qrCodeUrl = `${frontendUrl}/menu/${restaurantId}?tableNumber=${tableNumber}`;

        const qrCode = await prisma.qRCode.create({
          data: {
            tableNumber,
            qrCode: qrCodeUrl,
            restaurantId,
          },
        });

        createdQRCodes.push(qrCode);
      }

      res.status(201).json({
        success: true,
        message: `Generated ${createdQRCodes.length} new QR codes (${existingTableNumbers.length} already existed)`,
        data: {
          createdQRCodes,
          totalRequested: count,
          newlyCreated: createdQRCodes.length,
          alreadyExisted: existingTableNumbers.length,
        },
      });
    } catch (error) {
      console.error("Bulk generate sequential QR codes error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Bulk generate QR codes (original method)
router.post(
  "/bulk-generate",
  authenticate,
  requireRestaurant,
  validatePlanLimits.checkBulkTableLimits,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { tableNumbers } = req.body;
      const restaurantId = req.user!.restaurantId!;

      if (!Array.isArray(tableNumbers) || tableNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Table numbers array is required",
        });
      }

      // Check for existing QR codes
      const existingQRCodes = await prisma.qRCode.findMany({
        where: {
          restaurantId,
          tableNumber: {
            in: tableNumbers,
          },
        },
        select: { tableNumber: true },
      });

      const existingTableNumbers = existingQRCodes.map((qr) => qr.tableNumber);
      const newTableNumbers = tableNumbers.filter(
        (table: string) => !existingTableNumbers.includes(table)
      );

      if (newTableNumbers.length === 0) {
        return res.status(400).json({
          success: false,
          message: "All table numbers already have QR codes",
        });
      }

      // Generate QR codes for new tables
      const qrCodes = await Promise.all(
        newTableNumbers.map(async (tableNumber: string) => {
          const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:3000";
          const qrCodeUrl = `${frontendUrl}/menu/${restaurantId}?tableNumber=${tableNumber}`;

          return prisma.qRCode.create({
            data: {
              tableNumber,
              qrCode: qrCodeUrl,
              restaurantId,
            },
          });
        })
      );

      res.status(201).json({
        success: true,
        message: `${qrCodes.length} QR codes generated successfully`,
        data: {
          qrCodes,
          skipped: existingTableNumbers.length,
        },
      });
    } catch (error) {
      console.error("Bulk generate QR codes error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
