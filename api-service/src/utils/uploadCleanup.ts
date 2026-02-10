import path from "path";
import fs from "fs/promises";
type Prisma = typeof import("../../../shared/config/db").default;

const UPLOAD_PREFIX = "/uploads/";

function getUploadRoot(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

/**
 * Returns true if path is a server upload path (starts with /uploads/).
 */
export function isUploadPath(relativePath: string | null | undefined): boolean {
  if (!relativePath || typeof relativePath !== "string") return false;
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return normalized.startsWith(UPLOAD_PREFIX);
}

/**
 * Check if this path is still referenced anywhere in the database.
 * Used to avoid deleting a file that is still in use.
 */
export async function isUploadPathUsed(
  prisma: Prisma,
  relativePath: string
): Promise<boolean> {
  const normalized = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  const [menuItem, category, restaurant, menuTheme, gallery, restaurantTheme] =
    await Promise.all([
      prisma.menuItem.findFirst({ where: { image: normalized }, select: { id: true } }),
      prisma.category.findFirst({ where: { image: normalized }, select: { id: true } }),
      prisma.restaurant.findFirst({ where: { logo: normalized }, select: { id: true } }),
      prisma.menuTheme.findFirst({
        where: {
          OR: [
            { backgroundImage: normalized },
            { customBackgroundImage: normalized },
          ],
        },
        select: { id: true },
      }),
      prisma.gallery.findFirst({ where: { imageUrl: normalized }, select: { id: true } }),
      prisma.restaurantTheme.findFirst({
        where: { logo: normalized },
        select: { id: true },
      }),
    ]);

  if (menuItem || category || restaurant || menuTheme || gallery || restaurantTheme)
    return true;

  const sections = await prisma.section.findMany({ select: { images: true } });
  for (const s of sections) {
    const imgs = s.images as string[] | null;
    if (Array.isArray(imgs) && imgs.includes(normalized)) return true;
  }

  return false;
}

/**
 * Delete file from uploads folder if it is no longer referenced in the database.
 * Call this after removing or changing an image reference (e.g. after delete item, or update item image).
 * Does nothing if path is not an upload path or is still in use.
 */
export async function deleteUploadIfUnused(
  prisma: Prisma,
  relativePath: string | null | undefined
): Promise<void> {
  if (!isUploadPath(relativePath)) return;

  const normalized = (relativePath as string).startsWith("/")
    ? (relativePath as string)
    : `/${relativePath}`;

  const stillUsed = await isUploadPathUsed(prisma, normalized);
  if (stillUsed) return;

  const root = getUploadRoot();
  const relativeWithoutPrefix = normalized.slice(UPLOAD_PREFIX.length).replace(/^\//, "");
  const filePath = path.join(root, relativeWithoutPrefix);

  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err?.code !== "ENOENT") console.error("[uploadCleanup] Failed to delete file:", filePath, err);
  }
}

/**
 * Schedule cleanup for multiple paths (e.g. after deleting a category and its items).
 * Each path is checked and deleted only if unused.
 */
export async function deleteUploadsIfUnused(
  prisma: Prisma,
  paths: (string | null | undefined)[]
): Promise<void> {
  const unique = [...new Set(paths.filter(isUploadPath))];
  await Promise.all(unique.map((p) => deleteUploadIfUnused(prisma, p)));
}
