import Joi from "joi";

export const updateRestaurantSchema = Joi.object({
  name: Joi.string().min(2).max(100).allow("").optional().messages({
    "string.min": "Restaurant name must be at least 2 characters long",
    "string.max": "Restaurant name cannot exceed 100 characters",
  }),
  nameAr: Joi.string().min(2).max(100).allow("").optional().messages({
    "string.min": "Arabic restaurant name must be at least 2 characters long",
    "string.max": "Arabic restaurant name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  address: Joi.string().max(200).allow("").optional().messages({
    "string.max": "Address cannot exceed 200 characters",
  }),

  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .allow("")
    .optional()
    .messages({
      "string.pattern.base": "Please provide a valid phone number",
    }),
  logo: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Logo must be a valid URL",
  }),
  email: Joi.string().email().optional().messages({
    "string.email": "Please provide a valid email address",
  }),
  website: Joi.string().uri().optional().messages({
    "string.uri": "Please provide a valid website URL",
  }),
  kitchenWhatsApp: Joi.string().allow("").optional().messages({
    "string.base": "Kitchen WhatsApp must be a valid string",
  }),
});

export const createQRCodeSchema = Joi.object({
  tableNumber: Joi.string().min(1).max(10).required().messages({
    "string.min": "Table number must be at least 1 character long",
    "string.max": "Table number cannot exceed 10 characters",
    "any.required": "Table number is required",
  }),
});

export const updateThemeSchema = Joi.object({
  backgroundImage: Joi.string().uri().optional().messages({
    "string.uri": "Please provide a valid image URL",
  }),
  brightness: Joi.number().min(0).max(2).optional().messages({
    "number.min": "Brightness must be between 0 and 2",
    "number.max": "Brightness must be between 0 and 2",
  }),
  opacity: Joi.number().min(0).max(1).optional().messages({
    "number.min": "Opacity must be between 0 and 1",
    "number.max": "Opacity must be between 0 and 1",
  }),
  primaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Primary color must be a valid hex color code",
    }),
  secondaryColor: Joi.string()
    .pattern(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Secondary color must be a valid hex color code",
    }),
  language: Joi.string().valid("AR", "EN").optional(),
  theme: Joi.string().valid("LIGHT", "DARK").optional(),
});
