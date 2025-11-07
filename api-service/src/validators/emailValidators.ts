import Joi from "joi";

export const verifyEmailSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  verificationCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "Verification code must be exactly 6 digits",
      "string.pattern.base": "Verification code must contain only numbers",
      "any.required": "Verification code is required",
    }),
});

export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  resetCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "string.length": "Reset code must be exactly 6 digits",
      "string.pattern.base": "Reset code must contain only numbers",
      "any.required": "Reset code is required",
    }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "New password is required",
  }),
});
