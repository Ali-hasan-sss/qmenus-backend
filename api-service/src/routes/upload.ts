import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

const router = express.Router();

// In-memory storage so we can compress before writing to disk
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max before compression
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG or WebP images are allowed (no GIF or video)"));
    }
  },
});

// Upload directory: server-side folder (relative to cwd when running the app)
const getUploadRoot = () => {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
  return dir;
};

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * POST /api/upload
 * Accepts multipart file field "image".
 * Compresses image, saves to server under uploads/YYYY/MM/, returns relative path.
 * Response: { success, data: { path, filename } } — store "path" in DB; build full URL at display time.
 */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No image file provided. Use form field 'image'.",
      });
    }

    const root = getUploadRoot();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const dirPath = path.join(root, year, month);
    await ensureDir(dirPath);

    const baseName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const ext = "webp";
    const filename = `${baseName}.${ext}`;
    const absolutePath = path.join(dirPath, filename);

    let buffer: Buffer = req.file.buffer;
    const mime = (req.file.mimetype || "").toLowerCase();

    try {
      let pipeline = sharp(buffer);
      const meta = await pipeline.metadata();
      const w = meta.width ?? 1920;
      const h = meta.height ?? 1080;
      const maxSide = 1920;
      if (w > maxSide || h > maxSide) {
        pipeline = pipeline.resize(maxSide, maxSide, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      if (mime === "image/jpeg" || mime === "image/jpg") {
        buffer = await pipeline
          .jpeg({ quality: 85, progressive: true, mozjpeg: true })
          .toBuffer();
      } else if (mime === "image/png") {
        buffer = await pipeline
          .png({ quality: 85, compressionLevel: 9, adaptiveFiltering: true })
          .toBuffer();
      } else       if (mime === "image/webp") {
        buffer = await pipeline.webp({ quality: 85, effort: 6 }).toBuffer();
      } else {
        buffer = await pipeline.webp({ quality: 85, effort: 6 }).toBuffer();
      }
    } catch (sharpErr) {
      console.warn("Sharp compression failed, saving original:", sharpErr);
      const fallbackExt = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
      const fallbackFilename = `${baseName}.${fallbackExt}`;
      const fallbackAbsolute = path.join(dirPath, fallbackFilename);
      await fs.writeFile(fallbackAbsolute, req.file.buffer);
      const relativePath = path
        .join("/uploads", year, month, fallbackFilename)
        .split(path.sep)
        .join("/");
      return res.json({
        success: true,
        data: { path: relativePath, filename: fallbackFilename },
      });
    }

    await fs.writeFile(absolutePath, buffer);
    const relativePath = path
      .join("/uploads", year, month, filename)
      .split(path.sep)
      .join("/");

    res.json({
      success: true,
      data: { path: relativePath, filename },
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Max 15MB before compression.",
      });
    }
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to upload image",
    });
  }
});

export default router;
