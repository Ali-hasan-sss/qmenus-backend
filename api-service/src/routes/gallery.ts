import express from "express";
import prisma from "../../../shared/config/db";
import { authenticate, AuthRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import Joi from "joi";

const router = express.Router();

// Validation schemas
const createGallerySchema = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "English name is required",
  }),
  nameAr: Joi.string().required().messages({
    "any.required": "Arabic name is required",
  }),
  description: Joi.string().allow("").optional(),
  imageUrl: Joi.string().uri().required().messages({
    "any.required": "Image URL is required",
    "string.uri": "Must be a valid URL",
  }),
  category: Joi.string().optional().default("general"),
  tags: Joi.string().allow("").optional(),
});

const updateGallerySchema = Joi.object({
  name: Joi.string().optional(),
  nameAr: Joi.string().optional(),
  description: Joi.string().allow("").optional(),
  imageUrl: Joi.string().uri().optional(),
  category: Joi.string().optional(),
  tags: Joi.string().allow("").optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Get all gallery images (for users)
 * GET /api/gallery
 */
router.get("/", authenticate, async (req: AuthRequest, res): Promise<any> => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;

    const whereClause: any = {
      isActive: true,
    };

    // Search by name (English or Arabic)
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { nameAr: { contains: search as string, mode: "insensitive" } },
        { tags: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Filter by category
    if (category && category !== "all") {
      whereClause.category = category;
    }

    const [images, total] = await Promise.all([
      prisma.gallery.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.gallery.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: {
        images,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get gallery images error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * Get gallery categories
 * GET /api/gallery/categories
 */
router.get(
  "/categories",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const categories = await prisma.gallery.groupBy({
        by: ["category"],
        where: { isActive: true },
        _count: {
          id: true,
        },
      });

      res.json({
        success: true,
        data: {
          categories: categories.map(
            (cat: { category: string; _count: { id: number } }) => ({
              name: cat.category,
              count: cat._count.id,
            })
          ),
        },
      });
    } catch (error) {
      console.error("Get gallery categories error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Admin: Get all gallery images (including inactive)
 * GET /api/gallery/admin
 */
router.get(
  "/admin",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { search, category, page = 1, limit = 50 } = req.query;

      const whereClause: any = {};

      if (search) {
        whereClause.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { nameAr: { contains: search as string, mode: "insensitive" } },
          { tags: { contains: search as string, mode: "insensitive" } },
        ];
      }

      if (category && category !== "all") {
        whereClause.category = category;
      }

      const [images, total] = await Promise.all([
        prisma.gallery.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.gallery.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        data: {
          images,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Admin get gallery images error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Admin: Create gallery image
 * POST /api/gallery/admin
 */
router.post(
  "/admin",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { error, value } = createGallerySchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const image = await prisma.gallery.create({
        data: {
          name: value.name,
          nameAr: value.nameAr,
          description: value.description,
          imageUrl: value.imageUrl,
          category: value.category || "general",
          tags: value.tags,
          uploadedBy: req.user!.id,
        },
      });

      res.status(201).json({
        success: true,
        message: "Gallery image created successfully",
        data: { image },
      });
    } catch (error) {
      console.error("Create gallery image error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Admin: Update gallery image
 * PUT /api/gallery/admin/:id
 */
router.put(
  "/admin/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;
      const { error, value } = updateGallerySchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const image = await prisma.gallery.update({
        where: { id },
        data: value,
      });

      res.json({
        success: true,
        message: "Gallery image updated successfully",
        data: { image },
      });
    } catch (error) {
      console.error("Update gallery image error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Admin: Delete gallery image
 * DELETE /api/gallery/admin/:id
 */
router.delete(
  "/admin/:id",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      await prisma.gallery.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Gallery image deleted successfully",
      });
    } catch (error) {
      console.error("Delete gallery image error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Admin: Toggle gallery image status
 * PUT /api/gallery/admin/:id/toggle
 */
router.put(
  "/admin/:id/toggle",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      const image = await prisma.gallery.findUnique({
        where: { id },
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Gallery image not found",
        });
      }

      const updatedImage = await prisma.gallery.update({
        where: { id },
        data: { isActive: !image.isActive },
      });

      res.json({
        success: true,
        message: `Gallery image ${
          updatedImage.isActive ? "activated" : "deactivated"
        } successfully`,
        data: { image: updatedImage },
      });
    } catch (error) {
      console.error("Toggle gallery image error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Increment usage count when image is used
 * POST /api/gallery/:id/use
 */
router.post(
  "/:id/use",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const { id } = req.params;

      await prisma.gallery.update({
        where: { id },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });

      res.json({
        success: true,
        message: "Usage count incremented",
      });
    } catch (error) {
      console.error("Increment usage count error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * Admin: Get gallery statistics
 * GET /api/gallery/admin/stats
 */
router.get(
  "/admin/stats",
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const [total, active, byCategory] = await Promise.all([
        prisma.gallery.count(),
        prisma.gallery.count({ where: { isActive: true } }),
        prisma.gallery.groupBy({
          by: ["category"],
          _count: { id: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          total,
          active,
          inactive: total - active,
          byCategory: byCategory.map(
            (cat: { category: string; _count: { id: number } }) => ({
              category: cat.category,
              count: cat._count.id,
            })
          ),
        },
      });
    } catch (error) {
      console.error("Get gallery stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default router;
