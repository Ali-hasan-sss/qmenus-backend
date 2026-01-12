import Joi from "joi";

export const createPlanSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Plan name must be at least 2 characters long",
    "string.max": "Plan name cannot exceed 100 characters",
    "any.required": "Plan name is required",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic plan name must be at least 2 characters long",
    "string.max": "Arabic plan name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  type: Joi.string()
    .valid("BASIC", "PREMIUM", "ENTERPRISE")
    .required()
    .messages({
      "any.only": "Type must be one of: BASIC, PREMIUM, ENTERPRISE",
      "any.required": "Type is required",
    }),
  price: Joi.number().positive().precision(2).required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be positive",
    "any.required": "Price is required",
  }),
  currency: Joi.string().length(3).uppercase().optional().messages({
    "string.length": "Currency must be 3 characters long",
    "string.uppercase": "Currency must be uppercase",
  }),
  duration: Joi.number().integer().positive().required().messages({
    "number.base": "Duration must be a number",
    "number.integer": "Duration must be an integer",
    "number.positive": "Duration must be positive",
    "any.required": "Duration is required",
  }),
  maxTables: Joi.number().integer().min(1).required().messages({
    "number.base": "Max tables must be a number",
    "number.integer": "Max tables must be an integer",
    "number.min": "Max tables must be at least 1",
    "any.required": "Max tables is required",
  }),
  maxMenus: Joi.number().integer().min(1).required().messages({
    "number.base": "Max menus must be a number",
    "number.integer": "Max menus must be an integer",
    "number.min": "Max menus must be at least 1",
    "any.required": "Max menus is required",
  }),
  maxCategories: Joi.number().integer().min(1).required().messages({
    "number.base": "Max categories must be a number",
    "number.integer": "Max categories must be an integer",
    "number.min": "Max categories must be at least 1",
    "any.required": "Max categories is required",
  }),
  maxItems: Joi.number().integer().min(1).required().messages({
    "number.base": "Max items must be a number",
    "number.integer": "Max items must be an integer",
    "number.min": "Max items must be at least 1",
    "any.required": "Max items is required",
  }),
  canCustomizeTheme: Joi.boolean().optional().messages({
    "boolean.base": "Can customize theme must be a boolean",
  }),
  isFree: Joi.boolean().optional().messages({
    "boolean.base": "Is free must be a boolean",
  }),
  features: Joi.array().items(Joi.string()).optional().messages({
    "array.base": "Features must be an array of strings",
  }),
});

export const updatePlanSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Plan name must be at least 2 characters long",
    "string.max": "Plan name cannot exceed 100 characters",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic plan name must be at least 2 characters long",
    "string.max": "Arabic plan name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  type: Joi.string()
    .valid("BASIC", "PREMIUM", "ENTERPRISE")
    .optional()
    .messages({
      "any.only": "Type must be one of: BASIC, PREMIUM, ENTERPRISE",
    }),
  price: Joi.number().positive().precision(2).optional().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be positive",
  }),
  currency: Joi.string().length(3).uppercase().optional().messages({
    "string.length": "Currency must be 3 characters long",
    "string.uppercase": "Currency must be uppercase",
  }),
  duration: Joi.number().integer().positive().optional().messages({
    "number.base": "Duration must be a number",
    "number.integer": "Duration must be an integer",
    "number.positive": "Duration must be positive",
  }),
  maxTables: Joi.number().integer().min(1).optional().messages({
    "number.base": "Max tables must be a number",
    "number.integer": "Max tables must be an integer",
    "number.min": "Max tables must be at least 1",
  }),
  maxMenus: Joi.number().integer().min(1).optional().messages({
    "number.base": "Max menus must be a number",
    "number.integer": "Max menus must be an integer",
    "number.min": "Max menus must be at least 1",
  }),
  maxCategories: Joi.number().integer().min(1).optional().messages({
    "number.base": "Max categories must be a number",
    "number.integer": "Max categories must be an integer",
    "number.min": "Max categories must be at least 1",
  }),
  maxItems: Joi.number().integer().min(1).optional().messages({
    "number.base": "Max items must be a number",
    "number.integer": "Max items must be an integer",
    "number.min": "Max items must be at least 1",
  }),
  canCustomizeTheme: Joi.boolean().optional().messages({
    "boolean.base": "Can customize theme must be a boolean",
  }),
  isFree: Joi.boolean().optional().messages({
    "boolean.base": "Is free must be a boolean",
  }),
  features: Joi.array().items(Joi.string()).optional().messages({
    "array.base": "Features must be an array of strings",
  }),
  isActive: Joi.boolean().optional(),
});

export const createUserSchema = Joi.object({
  email: Joi.string().email().required().trim().lowercase().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
  firstName: Joi.string().min(2).max(50).required().messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name cannot exceed 50 characters",
    "any.required": "First name is required",
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name cannot exceed 50 characters",
    "any.required": "Last name is required",
  }),
  role: Joi.string().valid("OWNER", "CASHIER", "ADMIN").required().messages({
    "any.only": "Role must be one of: OWNER, CASHIER, ADMIN",
    "any.required": "Role is required",
  }),
  restaurantId: Joi.string().optional().messages({
    "string.base": "Restaurant ID must be a string",
  }),
  restaurant: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "Restaurant name must be at least 2 characters long",
      "string.max": "Restaurant name cannot exceed 100 characters",
      "any.required": "Restaurant name is required",
    }),
    nameAr: Joi.string().min(2).max(100).required().messages({
      "string.min": "Arabic restaurant name must be at least 2 characters long",
      "string.max": "Arabic restaurant name cannot exceed 100 characters",
      "any.required": "Arabic restaurant name is required",
    }),
  })
    .optional()
    .messages({
      "object.base": "Restaurant must be an object",
    }),
  planId: Joi.string().optional().messages({
    "string.base": "Plan ID must be a string",
  }),
});

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional().trim().lowercase().messages({
    "string.email": "Please provide a valid email address",
  }),
  firstName: Joi.string().min(2).max(50).optional().messages({
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name cannot exceed 50 characters",
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name cannot exceed 50 characters",
  }),
  role: Joi.string().valid("OWNER", "CASHIER", "ADMIN").optional().messages({
    "any.only": "Role must be one of: OWNER, CASHIER, ADMIN",
  }),
  isActive: Joi.boolean().optional(),
});
