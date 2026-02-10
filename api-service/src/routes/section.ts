import express from "express";
import prisma from "../../../shared/config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validateRequest } from "../middleware/validateRequest";
import { deleteUploadsIfUnused, isUploadPath } from "../utils/uploadCleanup";
import {
  createSectionSchema,
  updateSectionSchema,
} from "../validators/sectionValidators";
import { requireAdmin } from "../middleware/adminAuth";

const router = express.Router();

// Get all sections
router.get("/", async (req, res): Promise<any> => {
  try {
    const { type } = req.query;

    const whereClause: any = {};
    if (type) {
      whereClause.type = type;
    }

    const sections = await prisma.section.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { sections },
    });
  } catch (error) {
    console.error("Get sections error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get section by ID
router.get("/:id", async (req, res): Promise<any> => {
  try {
    const { id } = req.params;

    const section = await prisma.section.findUnique({
      where: { id },
    });

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Section not found",
      });
    }

    res.json({
      success: true,
      data: { section },
    });
  } catch (error) {
    console.error("Get section error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Get sections by type
router.get("/type/:type", async (req, res): Promise<any> => {
  try {
    const { type } = req.params;

    if (!["GENERAL", "CONTACT", "ANNOUNCEMENTS"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid section type",
      });
    }

    const sections = await prisma.section.findMany({
      where: { type: type as any },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: { sections },
    });
  } catch (error) {
    console.error("Get sections by type error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Create section (Admin only)
router.post(
  "/",
  authenticate,
  requireAdmin,
  validateRequest(createSectionSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const {
        title,
        titleAr,
        description,
        descriptionAr,
        images,
        attributes,
        type,
      } = req.body;

      const section = await prisma.section.create({
        data: {
          title,
          titleAr,
          description: description || null,
          descriptionAr: descriptionAr || null,
          images: images ? images : null,
          attributes: attributes ? attributes : null,
          type: type || "GENERAL",
        },
      });

      res.status(201).json({
        success: true,
        message: "Section created successfully",
        data: { section },
      });
    } catch (error) {
      console.error("Create section error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Update section (Admin only)
router.put(
  "/:id",
  authenticate,
  requireAdmin,
  validateRequest(updateSectionSchema),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const {
        title,
        titleAr,
        description,
        descriptionAr,
        images,
        attributes,
        type,
      } = req.body;

      // Check if section exists
      const existingSection = await prisma.section.findUnique({
        where: { id },
      });

      if (!existingSection) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      // Build update data
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (titleAr !== undefined) updateData.titleAr = titleAr;
      if (description !== undefined)
        updateData.description = description || null;
      if (descriptionAr !== undefined)
        updateData.descriptionAr = descriptionAr || null;
      if (images !== undefined) updateData.images = images || null;
      if (attributes !== undefined) updateData.attributes = attributes || null;
      if (type !== undefined) updateData.type = type;

      const section = await prisma.section.update({
        where: { id },
        data: updateData,
      });

      if (images !== undefined && existingSection.images) {
        const oldArr = Array.isArray(existingSection.images)
          ? (existingSection.images as string[])
          : [];
        const newArr = Array.isArray(images) ? images : [];
        const removed = oldArr.filter((p: string) => !newArr.includes(p)).filter(isUploadPath);
        await deleteUploadsIfUnused(prisma, removed);
      }

      res.json({
        success: true,
        message: "Section updated successfully",
        data: { section },
      });
    } catch (error) {
      console.error("Update section error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

// Delete section (Admin only)
router.delete(
  "/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      // Check if section exists
      const existingSection = await prisma.section.findUnique({
        where: { id },
      });

      if (!existingSection) {
        return res.status(404).json({
          success: false,
          message: "Section not found",
        });
      }

      const imagesToClean = Array.isArray(existingSection.images)
        ? (existingSection.images as string[])
        : [];

      await prisma.section.delete({
        where: { id },
      });

      await deleteUploadsIfUnused(prisma, imagesToClean);

      res.json({
        success: true,
        message: "Section deleted successfully",
      });
    } catch (error) {
      console.error("Delete section error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
