import Joi from "joi";

export const registerSchema = Joi.object({
  // Step 1: Personal Information
  email: Joi.string().email().required().messages({
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

  // Step 2: Restaurant Information
  role: Joi.string().valid("OWNER", "CASHIER", "ADMIN").optional(),
  restaurantName: Joi.string()
    .min(2)
    .max(100)
    .when("role", {
      is: "OWNER",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.min": "Restaurant name must be at least 2 characters long",
      "string.max": "Restaurant name cannot exceed 100 characters",
      "any.required": "Restaurant name is required for restaurant owners",
    }),
  restaurantNameAr: Joi.string()
    .min(2)
    .max(100)
    .when("role", {
      is: "OWNER",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.min": "Arabic restaurant name must be at least 2 characters long",
      "string.max": "Arabic restaurant name cannot exceed 100 characters",
      "any.required":
        "Arabic restaurant name is required for restaurant owners",
    }),
  restaurantDescription: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Restaurant description cannot exceed 500 characters",
  }),
  restaurantDescriptionAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic restaurant description cannot exceed 500 characters",
  }),

  // Step 3: Logo (optional)
  logo: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Logo must be a valid URL",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const updateProfileSchema = Joi.object({
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
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters long",
    "any.required": "New password is required",
  }),
});
