import Joi from "joi";

// Validation schemas for menu theme operations
export const createMenuThemeSchema = Joi.object({
  name: Joi.string().min(1).required().messages({
    "string.empty": "Theme name is required",
    "string.min": "Theme name must be at least 1 character long",
  }),
  nameAr: Joi.string().allow(null, "").optional(),
  layoutType: Joi.string().valid("grid", "list", "card").optional(),
  showPrices: Joi.boolean().optional(),
  showImages: Joi.boolean().optional(),
  showDescriptions: Joi.boolean().optional(),
  primaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Primary color must be a valid hex color",
    }),
  secondaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Secondary color must be a valid hex color",
    }),
  backgroundColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Background color must be a valid hex color",
    }),
  textColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Text color must be a valid hex color",
    }),
  accentColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Accent color must be a valid hex color",
    }),

  // Color Opacity Settings
  primaryColorOpacity: Joi.number().min(0).max(1).optional(),
  secondaryColorOpacity: Joi.number().min(0).max(1).optional(),
  backgroundColorOpacity: Joi.number().min(0).max(1).optional(),
  textColorOpacity: Joi.number().min(0).max(1).optional(),
  accentColorOpacity: Joi.number().min(0).max(1).optional(),

  fontFamily: Joi.string().optional(),
  headingSize: Joi.string().optional(),
  bodySize: Joi.string().optional(),
  priceSize: Joi.string().optional(),
  cardPadding: Joi.string().optional(),
  cardMargin: Joi.string().optional(),
  borderRadius: Joi.string().optional(),
  categoryStyle: Joi.string().valid("tabs", "accordion", "sidebar").optional(),
  showCategoryImages: Joi.boolean().optional(),
  itemLayout: Joi.string().valid("vertical", "horizontal").optional(),
  imageAspect: Joi.string().valid("square", "rectangle", "circle").optional(),

  // Background Image
  backgroundImage: Joi.string().optional().allow(null, ""),
  backgroundOverlay: Joi.string().optional().allow(null, ""),
  backgroundPosition: Joi.string().optional().allow(null, ""),
  backgroundSize: Joi.string().optional().allow(null, ""),
  backgroundRepeat: Joi.string().optional().allow(null, ""),

  // Background Overlay Opacity
  backgroundOverlayOpacity: Joi.number().min(0).max(1).optional(),

  // Custom Background Image
  customBackgroundImage: Joi.string().optional().allow(null, ""),

  customCSS: Joi.string().allow(null, "").optional(),
});

export const updateMenuThemeSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().min(1).optional().messages({
    "string.empty": "Theme name cannot be empty",
    "string.min": "Theme name must be at least 1 character long",
  }),
  nameAr: Joi.string().allow(null, "").optional(),
  layoutType: Joi.string().valid("grid", "list", "card").optional(),
  showPrices: Joi.boolean().optional(),
  showImages: Joi.boolean().optional(),
  showDescriptions: Joi.boolean().optional(),
  primaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Primary color must be a valid hex color",
    }),
  secondaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Secondary color must be a valid hex color",
    }),
  backgroundColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Background color must be a valid hex color",
    }),
  textColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Text color must be a valid hex color",
    }),
  accentColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Accent color must be a valid hex color",
    }),

  // Color Opacity Settings
  primaryColorOpacity: Joi.number().min(0).max(1).optional(),
  secondaryColorOpacity: Joi.number().min(0).max(1).optional(),
  backgroundColorOpacity: Joi.number().min(0).max(1).optional(),
  textColorOpacity: Joi.number().min(0).max(1).optional(),
  accentColorOpacity: Joi.number().min(0).max(1).optional(),

  fontFamily: Joi.string().optional(),
  headingSize: Joi.string().optional(),
  bodySize: Joi.string().optional(),
  priceSize: Joi.string().optional(),
  cardPadding: Joi.string().optional(),
  cardMargin: Joi.string().optional(),
  borderRadius: Joi.string().optional(),
  categoryStyle: Joi.string().valid("tabs", "accordion", "sidebar").optional(),
  showCategoryImages: Joi.boolean().optional(),
  itemLayout: Joi.string().valid("vertical", "horizontal").optional(),
  imageAspect: Joi.string().valid("square", "rectangle", "circle").optional(),

  // Background Image
  backgroundImage: Joi.string().optional().allow(null, ""),
  backgroundOverlay: Joi.string().optional().allow(null, ""),
  backgroundPosition: Joi.string().optional().allow(null, ""),
  backgroundSize: Joi.string().optional().allow(null, ""),
  backgroundRepeat: Joi.string().optional().allow(null, ""),

  // Background Overlay Opacity
  backgroundOverlayOpacity: Joi.number().min(0).max(1).optional(),

  // Custom Background Image
  customBackgroundImage: Joi.string().optional().allow(null, ""),

  customCSS: Joi.string().allow(null, "").optional(),
});

export const createFromTemplateSchema = Joi.object({
  templateId: Joi.string()
    .valid("modern", "classic", "minimal")
    .required()
    .messages({
      "any.only": "Invalid template ID",
      "string.empty": "Template ID is required",
    }),
  name: Joi.string().min(1).required().messages({
    "string.empty": "Theme name is required",
    "string.min": "Theme name must be at least 1 character long",
  }),
  nameAr: Joi.string().allow(null, "").optional(),
});

export const themeIdSchema = Joi.object({
  themeId: Joi.string().required().messages({
    "string.empty": "Theme ID is required",
  }),
});

export const restaurantIdSchema = Joi.object({
  restaurantId: Joi.string().required().messages({
    "string.empty": "Restaurant ID is required",
  }),
});
