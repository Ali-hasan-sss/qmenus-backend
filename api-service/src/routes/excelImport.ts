import express, { Request, Response } from "express";
import multer, { FileFilterCallback } from "multer";
import * as XLSX from "xlsx";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validatePlanLimits } from "../middleware/planLimits";
import Joi from "joi";
import prisma from "../../../shared/config/db";

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
    }
  },
});

// Excel column structure validation schema
const excelRowSchema = Joi.object({
  category_name: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      "any.required": "اسم الفئة مطلوب",
    }),
  category_name_ar: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.number())
    .optional(),
  category_description: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.number())
    .optional(),
  category_description_ar: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.number())
    .optional(),
  item_name: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .required()
    .messages({
      "any.required": "اسم العنصر مطلوب",
    }),
  item_name_ar: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.number())
    .optional(),
  item_description: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.number())
    .optional(),
  item_description_ar: Joi.alternatives()
    .try(Joi.string().allow(""), Joi.number())
    .optional(),
  item_price: Joi.number().min(0).required().messages({
    "any.required": "سعر العنصر مطلوب",
    "number.min": "السعر يجب أن يكون أكبر من أو يساوي 0",
  }),
  item_currency: Joi.string().allow("").optional(),
  item_discount: Joi.alternatives()
    .try(Joi.number().min(0).max(100), Joi.string().allow(""))
    .optional(),
  extras: Joi.string().allow("").optional(),
  extras_prices: Joi.string().allow("").optional(),
}).unknown(true); // Allow unknown columns

/**
 * Download empty Excel template
 * GET /api/excel-import/template
 */
router.get(
  "/template",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Get language from query parameter (sent from frontend)
      const lang = req.query.lang as string;
      const isArabic = lang === "ar";

      // Define headers based on language
      const headers = isArabic
        ? [
            "اسم الفئة", // category_name
            "اسم الفئة بالعربية", // category_name_ar
            "وصف الفئة", // category_description
            "وصف الفئة بالعربية", // category_description_ar
            "اسم العنصر", // item_name
            "اسم العنصر بالعربية", // item_name_ar
            "وصف العنصر", // item_description
            "وصف العنصر بالعربية", // item_description_ar
            "السعر", // item_price
            "العملة (SYP / USD)", // item_currency
            "الخصم (%)", // item_discount
            "الإضافات (مفصولة بـ /)", // extras
            "أسعار الإضافات (مفصولة بـ /)", // extras_prices
          ]
        : [
            "Category Name", // category_name
            "Category Name (Arabic)", // category_name_ar
            "Category Description", // category_description
            "Category Description (Arabic)", // category_description_ar
            "Item Name", // item_name
            "Item Name (Arabic)", // item_name_ar
            "Item Description", // item_description
            "Item Description (Arabic)", // item_description_ar
            "Price", // item_price
            "Currency (SYP / USD)", // item_currency
            "Discount (%)", // item_discount
            "Extras (separated by /)", // extras
            "Extras Prices (separated by /)", // extras_prices
          ];

      // Internal keys for processing
      const headerKeys = [
        "category_name",
        "category_name_ar",
        "category_description",
        "category_description_ar",
        "item_name",
        "item_name_ar",
        "item_description",
        "item_description_ar",
        "item_price",
        "item_currency",
        "item_discount",
        "extras",
        "extras_prices",
      ];

      // Create worksheet with headers
      const worksheet = XLSX.utils.aoa_to_sheet([headers]);

      // Add some sample data for reference (same structure for both languages)
      const sampleData = [
        [
          "Appetizers",
          "المقبلات",
          "Delicious starters for your meal",
          "مقبلات شهية لبداية الوجبة",
          "Hummus with Tahini",
          "حمص بالطحينة",
          "Creamy hummus with tahini and olive oil",
          "حمص كريمي مع الطحينة وزيت الزيتون",
          15000,
          "SYP",
          0,
          "Extra Bread / Extra Tahini",
          "3000 / 2000",
        ],
        [
          "Appetizers",
          "المقبلات",
          "Delicious starters for your meal",
          "مقبلات شهية لبداية الوجبة",
          "Moutabal",
          "متبل",
          "Authentic Lebanese moutabal",
          "متبل لبناني أصلي",
          15000,
          "SYP",
          10,
          "Extra Bread",
          "3000",
        ],
      ];

      // Add sample data
      XLSX.utils.sheet_add_aoa(worksheet, sampleData, { origin: -1 });

      // Set column widths
      const columnWidths = [
        { wch: 20 }, // category_name
        { wch: 20 }, // category_name_ar
        { wch: 30 }, // category_description
        { wch: 30 }, // category_description_ar
        { wch: 25 }, // item_name
        { wch: 25 }, // item_name_ar
        { wch: 40 }, // item_description
        { wch: 40 }, // item_description_ar
        { wch: 12 }, // item_price
        { wch: 10 }, // item_currency
        { wch: 12 }, // item_discount
        { wch: 30 }, // extras
        { wch: 20 }, // extras_prices
      ];
      worksheet["!cols"] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, "Menu Template");

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // Set response headers
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=menu_template.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(excelBuffer);
    } catch (error) {
      console.error("Error generating Excel template:", error);
      return res.status(500).json({
        error: "خطأ في إنشاء ملف Excel",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
      });
    }
  }
);

/**
 * Import menu from Excel file
 * POST /api/excel-import/import
 */
router.post(
  "/import",
  authenticate,
  validatePlanLimits.checkBulkImportLimits,
  upload.single("excelFile"),
  async (req: AuthRequest, res): Promise<any> => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف" });
      }

      const userId = (req as any).user.id;

      // Get user's restaurant
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { restaurants: true },
      });

      if (!user || !user.restaurants || user.restaurants.length === 0) {
        return res.status(404).json({ error: "لم يتم العثور على المطعم" });
      }

      const restaurantId = user.restaurants[0].id;

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        return res.status(400).json({
          error: "ملف Excel فارغ أو يحتوي على عنوان واحد فقط",
        });
      }

      // Get headers (first row)
      const rawHeaders = jsonData[0] as string[];

      // Map translated headers to internal keys
      const headerMapping: { [key: string]: string } = {
        // English headers
        "Category Name": "category_name",
        "Category Name (Arabic)": "category_name_ar",
        "Category Description": "category_description",
        "Category Description (Arabic)": "category_description_ar",
        "Item Name": "item_name",
        "Item Name (Arabic)": "item_name_ar",
        "Item Description": "item_description",
        "Item Description (Arabic)": "item_description_ar",
        Price: "item_price",
        Currency: "item_currency",
        "Currency (SYP / USD)": "item_currency",
        "Discount (%)": "item_discount",
        "Extras (separated by /)": "extras",
        "Extras Prices (separated by /)": "extras_prices",
        // Arabic headers
        "اسم الفئة": "category_name",
        "اسم الفئة بالعربية": "category_name_ar",
        "وصف الفئة": "category_description",
        "وصف الفئة بالعربية": "category_description_ar",
        "اسم العنصر": "item_name",
        "اسم العنصر بالعربية": "item_name_ar",
        "وصف العنصر": "item_description",
        "وصف العنصر بالعربية": "item_description_ar",
        السعر: "item_price",
        العملة: "item_currency",
        "العملة (SYP / USD)": "item_currency",
        "الخصم (%)": "item_discount",
        "الإضافات (مفصولة بـ /)": "extras",
        "أسعار الإضافات (مفصولة بـ /)": "extras_prices",
      };

      // Map raw headers to internal keys
      const headers = rawHeaders.map(
        (header) => headerMapping[header] || header
      );

      // Validate that all required keys are present
      const requiredKeys = ["category_name", "item_name", "item_price"];

      const missingKeys = requiredKeys.filter((key) => !headers.includes(key));

      if (missingKeys.length > 0) {
        return res.status(400).json({
          error: "عناوين مفقودة في ملف Excel",
          missingHeaders: missingKeys,
          expectedHeaders: [
            "category_name",
            "category_name_ar",
            "category_description",
            "category_description_ar",
            "item_name",
            "item_name_ar",
            "item_description",
            "item_description_ar",
            "item_price",
            "item_discount",
            "extras",
            "extras_prices",
          ],
        });
      }

      // Process data rows
      const dataRows = jsonData.slice(1) as any[][];
      const categories = new Map();
      const items = new Map();

      console.log("Total data rows:", dataRows.length);

      // Group data by categories and items
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        if (!row || row.length === 0) {
          console.log(`Skipping empty row ${i + 2}`);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          const value = row[index];
          // Convert to string if it's a number or keep as is
          rowData[header] =
            value !== undefined && value !== null ? String(value) : "";
        });

        console.log(`Processing row ${i + 2}:`, rowData);

        // Validate row data
        const { error } = excelRowSchema.validate(rowData);
        if (error) {
          console.error(`Validation error for row ${i + 2}:`, error.details);
          continue; // Skip invalid rows
        }

        const categoryKey = `${rowData.category_name}_${
          rowData.category_name_ar || ""
        }`;
        const itemKey = `${categoryKey}_${rowData.item_name}_${
          rowData.item_name_ar || ""
        }`;

        // Store category data
        if (!categories.has(categoryKey)) {
          categories.set(categoryKey, {
            name: rowData.category_name,
            nameAr: rowData.category_name_ar || null,
            description: rowData.category_description || null,
            descriptionAr: rowData.category_description_ar || null,
            menuId: null, // Will be set later
          });
        }

        // Store item data
        if (!items.has(itemKey)) {
          // Parse extras (separated by /)
          let extrasData = null;
          if (rowData.extras && rowData.extras_prices) {
            const extrasList = rowData.extras
              .split("/")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0);
            const pricesList = rowData.extras_prices
              .split("/")
              .map((s: string) => parseFloat(s.trim()) || 0);

            if (extrasList.length > 0) {
              extrasData = {
                extras: {
                  name: "Extras",
                  nameAr: "الإضافات",
                  options: extrasList.map((extra: string, index: number) => ({
                    id: `extra_${index}`,
                    name: extra,
                    nameAr: extra,
                    price: pricesList[index] || 0,
                  })),
                },
              };
            }
          }

          items.set(itemKey, {
            categoryKey,
            name: rowData.item_name,
            nameAr: rowData.item_name_ar || null,
            description: rowData.item_description || null,
            descriptionAr: rowData.item_description_ar || null,
            price: parseFloat(rowData.item_price),
            currency: rowData.item_currency || "USD",
            discount: rowData.item_discount
              ? parseInt(rowData.item_discount)
              : 0,
            extras: extrasData,
          });
        }
      }

      console.log("Total categories collected:", categories.size);
      console.log("Total items collected:", items.size);
      console.log("Categories:", Array.from(categories.keys()));
      console.log("Items:", Array.from(items.keys()));

      // Get plan limits from middleware
      const planLimits = (req as any).planLimits;

      // Count existing categories and items
      const existingCategories = await prisma.category.count({
        where: {
          menu: {
            restaurantId: restaurantId,
          },
        },
      });

      // Check if importing would exceed category limit
      const totalCategoriesAfterImport = existingCategories + categories.size;
      if (totalCategoriesAfterImport > planLimits.maxCategories) {
        return res.status(403).json({
          success: false,
          message: `Cannot import. You would exceed your plan's category limit. Current: ${existingCategories}, Importing: ${categories.size}, Limit: ${planLimits.maxCategories}`,
          limit: planLimits.maxCategories,
          current: existingCategories,
          toImport: categories.size,
          exceeded: totalCategoriesAfterImport - planLimits.maxCategories,
        });
      }

      // Calculate total quota for items: maxCategories × maxItems
      const totalItemsQuota = planLimits.maxCategories * planLimits.maxItems;

      // Count existing total items
      const existingTotalItems = await prisma.menuItem.count({
        where: {
          restaurantId: restaurantId,
        },
      });

      // Check if importing would exceed total items quota
      const totalItemsAfterImport = existingTotalItems + items.size;
      if (totalItemsAfterImport > totalItemsQuota) {
        const availableSlots = Math.max(
          0,
          totalItemsQuota - existingTotalItems
        );
        return res.status(403).json({
          success: false,
          message: `Cannot import. You would exceed your plan's total items quota. Current: ${existingTotalItems}, Importing: ${items.size}, Total Quota: ${totalItemsQuota} (${planLimits.maxCategories} categories × ${planLimits.maxItems} items). Available slots: ${availableSlots}`,
          totalQuota: totalItemsQuota,
          currentTotal: existingTotalItems,
          toImport: items.size,
          availableSlots: availableSlots,
          exceeded: totalItemsAfterImport - totalItemsQuota,
          planCategories: planLimits.maxCategories,
          planItemsPerCategory: planLimits.maxItems,
        });
      }

      // Get or create menu for the restaurant
      let menu = await prisma.menu.findFirst({
        where: { restaurantId },
      });

      if (!menu) {
        menu = await prisma.menu.create({
          data: {
            name: "Main Menu",
            restaurantId,
          },
        });
      }

      // Create categories and items in database
      let createdCategories = 0;
      let createdItems = 0;

      // Start transaction
      await prisma.$transaction(async (tx: any) => {
        // Create categories
        for (const [categoryKey, categoryData] of categories) {
          const category = await tx.category.create({
            data: {
              name: categoryData.name,
              nameAr: categoryData.nameAr,
              description: categoryData.description,
              descriptionAr: categoryData.descriptionAr,
              menuId: menu.id,
              restaurantId: restaurantId,
            },
          });

          categories.set(categoryKey, { ...categoryData, id: category.id });
          createdCategories++;
        }

        // Create items
        for (const [itemKey, itemData] of items) {
          const category = categories.get(itemData.categoryKey);
          if (!category) continue;

          const item = await tx.menuItem.create({
            data: {
              name: itemData.name,
              nameAr: itemData.nameAr,
              description: itemData.description,
              descriptionAr: itemData.descriptionAr,
              price: itemData.price,
              currency: itemData.currency,
              discount: itemData.discount,
              extras: itemData.extras,
              categoryId: category.id,
              restaurantId: restaurantId,
            },
          });

          createdItems++;
        }
      });

      res.json({
        success: true,
        message: "تم استيراد القائمة بنجاح",
        summary: {
          categoriesCreated: createdCategories,
          itemsCreated: createdItems,
        },
      });
    } catch (error) {
      console.error("Error importing Excel file:", error);
      res.status(500).json({
        error: "خطأ في استيراد ملف Excel",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
      });
    }
  }
);

/**
 * Get import history
 * GET /api/excel-import/history
 */
router.get(
  "/history",
  authenticate,
  async (req: AuthRequest, res): Promise<any> => {
    try {
      const userId = (req as any).user.id;

      // Get user's restaurant
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { restaurants: true },
      });

      if (!user || !user.restaurants || user.restaurants.length === 0) {
        return res.status(404).json({ error: "لم يتم العثور على المطعم" });
      }

      const restaurantId = user.restaurants[0].id;

      // Get categories and items count
      const categoriesCount = await prisma.category.count({
        where: {
          menu: { restaurantId },
        },
      });

      const itemsCount = await prisma.menuItem.count({
        where: {
          category: {
            menu: { restaurantId },
          },
        },
      });

      res.json({
        summary: {
          categoriesCount,
          itemsCount,
        },
      });
    } catch (error) {
      console.error("Error getting import history:", error);
      return res.status(500).json({
        error: "خطأ في الحصول على تاريخ الاستيراد",
        details: error instanceof Error ? error.message : "خطأ غير معروف",
      });
    }
  }
);

export default router;
