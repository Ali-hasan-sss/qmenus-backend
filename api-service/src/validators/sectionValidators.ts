import Joi from "joi";

const sectionAttributeSchema = Joi.object({
  key: Joi.string().min(1).max(100).required().messages({
    "string.min": "Attribute key must be at least 1 character long",
    "string.max": "Attribute key cannot exceed 100 characters",
    "any.required": "Attribute key is required",
  }),
  keyAr: Joi.string().min(1).max(100).required().messages({
    "string.min": "Arabic attribute key must be at least 1 character long",
    "string.max": "Arabic attribute key cannot exceed 100 characters",
    "any.required": "Arabic attribute key is required",
  }),
  value: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Attribute value cannot exceed 500 characters",
  }),
  valueAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic attribute value cannot exceed 500 characters",
  }),
  icon: Joi.string().max(100).allow("").optional().messages({
    "string.max": "Icon name cannot exceed 100 characters",
  }),
});

export const createSectionSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    "string.min": "Title must be at least 1 character long",
    "string.max": "Title cannot exceed 200 characters",
    "any.required": "Title is required",
  }),
  titleAr: Joi.string().min(1).max(200).required().messages({
    "string.min": "Arabic title must be at least 1 character long",
    "string.max": "Arabic title cannot exceed 200 characters",
    "any.required": "Arabic title is required",
  }),
  description: Joi.string().max(2000).allow("").optional().messages({
    "string.max": "Description cannot exceed 2000 characters",
  }),
  descriptionAr: Joi.string().max(2000).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 2000 characters",
  }),
  images: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().pattern(/^\/[a-zA-Z0-9/._-]+$/).min(1)
      )
    )
    .optional()
    .messages({
      "array.base": "Images must be an array",
      "alternatives.match": "Each image must be a valid URL or server path (e.g. /uploads/...)",
    }),
  attributes: Joi.array().items(sectionAttributeSchema).optional().messages({
    "array.base": "Attributes must be an array",
  }),
  type: Joi.string()
    .valid("GENERAL", "CONTACT", "ANNOUNCEMENTS")
    .default("GENERAL")
    .messages({
      "any.only": "Type must be one of: GENERAL, CONTACT, ANNOUNCEMENTS",
    }),
});

export const updateSectionSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional().messages({
    "string.min": "Title must be at least 1 character long",
    "string.max": "Title cannot exceed 200 characters",
  }),
  titleAr: Joi.string().min(1).max(200).optional().messages({
    "string.min": "Arabic title must be at least 1 character long",
    "string.max": "Arabic title cannot exceed 200 characters",
  }),
  description: Joi.string().max(2000).allow("").optional().messages({
    "string.max": "Description cannot exceed 2000 characters",
  }),
  descriptionAr: Joi.string().max(2000).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 2000 characters",
  }),
  images: Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.string().uri(),
        Joi.string().pattern(/^\/[a-zA-Z0-9/._-]+$/).min(1)
      )
    )
    .optional()
    .messages({
      "array.base": "Images must be an array",
      "alternatives.match": "Each image must be a valid URL or server path (e.g. /uploads/...)",
    }),
  attributes: Joi.array().items(sectionAttributeSchema).optional().messages({
    "array.base": "Attributes must be an array",
  }),
  type: Joi.string()
    .valid("GENERAL", "CONTACT", "ANNOUNCEMENTS")
    .optional()
    .messages({
      "any.only": "Type must be one of: GENERAL, CONTACT, ANNOUNCEMENTS",
    }),
});

