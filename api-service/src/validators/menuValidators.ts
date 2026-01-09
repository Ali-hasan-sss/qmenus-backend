import Joi from "joi";

export const createMenuSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Menu name must be at least 2 characters long",
    "string.max": "Menu name cannot exceed 100 characters",
    "any.required": "Menu name is required",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic menu name must be at least 2 characters long",
    "string.max": "Arabic menu name cannot exceed 100 characters",
  }),
});

export const updateMenuSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Menu name must be at least 2 characters long",
    "string.max": "Menu name cannot exceed 100 characters",
    "any.required": "Menu name is required",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic menu name must be at least 2 characters long",
    "string.max": "Arabic menu name cannot exceed 100 characters",
  }),
});

export const createCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Category name must be at least 2 characters long",
    "string.max": "Category name cannot exceed 100 characters",
    "any.required": "Category name is required",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic category name must be at least 2 characters long",
    "string.max": "Arabic category name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  image: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Image must be a valid URL",
  }),
  sortOrder: Joi.number().integer().min(0).optional().messages({
    "number.base": "Sort order must be a number",
    "number.integer": "Sort order must be an integer",
    "number.min": "Sort order must be 0 or greater",
  }),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Category name must be at least 2 characters long",
    "string.max": "Category name cannot exceed 100 characters",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic category name must be at least 2 characters long",
    "string.max": "Arabic category name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  image: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Image must be a valid URL",
  }),
  sortOrder: Joi.number().integer().min(0).optional().messages({
    "number.base": "Sort order must be a number",
    "number.integer": "Sort order must be an integer",
    "number.min": "Sort order must be 0 or greater",
  }),
});

export const createMenuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Item name must be at least 2 characters long",
    "string.max": "Item name cannot exceed 100 characters",
    "any.required": "Item name is required",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic item name must be at least 2 characters long",
    "string.max": "Arabic item name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  price: Joi.number().positive().precision(2).required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be positive",
    "any.required": "Price is required",
  }),
  image: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Image must be a valid URL",
  }),
  sortOrder: Joi.number().integer().min(0).optional().messages({
    "number.base": "Sort order must be a number",
    "number.integer": "Sort order must be an integer",
    "number.min": "Sort order must be 0 or greater",
  }),
  discount: Joi.number().integer().min(0).max(100).optional().messages({
    "number.base": "Discount must be a number",
    "number.integer": "Discount must be an integer",
    "number.min": "Discount must be 0 or greater",
    "number.max": "Discount cannot exceed 100",
  }),
  extras: Joi.string().optional().messages({
    "string.base": "Extras must be a valid JSON string",
  }),
  categoryId: Joi.string().required().messages({
    "any.required": "Category ID is required",
  }),
  kitchenSectionId: Joi.string().allow(null, "").optional().messages({
    "string.base": "Kitchen section ID must be a string",
  }),
});

export const updateMenuItemSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Item name must be at least 2 characters long",
    "string.max": "Item name cannot exceed 100 characters",
    "any.required": "Item name is required",
  }),
  nameAr: Joi.string().min(2).max(100).optional().messages({
    "string.min": "Arabic item name must be at least 2 characters long",
    "string.max": "Arabic item name cannot exceed 100 characters",
  }),
  description: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Description cannot exceed 500 characters",
  }),
  descriptionAr: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Arabic description cannot exceed 500 characters",
  }),
  price: Joi.number().positive().precision(2).required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be positive",
    "any.required": "Price is required",
  }),
  image: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Image must be a valid URL",
  }),
  sortOrder: Joi.number().integer().min(0).optional().messages({
    "number.base": "Sort order must be a number",
    "number.integer": "Sort order must be an integer",
    "number.min": "Sort order must be 0 or greater",
  }),
  discount: Joi.number().integer().min(0).max(100).optional().messages({
    "number.base": "Discount must be a number",
    "number.integer": "Discount must be an integer",
    "number.min": "Discount must be 0 or greater",
    "number.max": "Discount cannot exceed 100",
  }),
  extras: Joi.string().optional().messages({
    "string.base": "Extras must be a valid JSON string",
  }),
  categoryId: Joi.string().required().messages({
    "any.required": "Category ID is required",
  }),
  kitchenSectionId: Joi.string().allow(null, "").optional().messages({
    "string.base": "Kitchen section ID must be a string",
  }),
});

export const reorderCategoriesSchema = Joi.object({
  categories: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required().messages({
          "any.required": "Category ID is required",
        }),
        sortOrder: Joi.number().integer().min(1).required().messages({
          "number.base": "Sort order must be a number",
          "number.integer": "Sort order must be an integer",
          "number.min": "Sort order must be 1 or greater",
          "any.required": "Sort order is required",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one category is required",
      "any.required": "Categories array is required",
    }),
}).unknown(false);

export const reorderItemsSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required().messages({
          "any.required": "Item ID is required",
        }),
        sortOrder: Joi.number().integer().min(1).required().messages({
          "number.base": "Sort order must be a number",
          "number.integer": "Sort order must be an integer",
          "number.min": "Sort order must be 1 or greater",
          "any.required": "Sort order is required",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one item is required",
      "any.required": "Items array is required",
    }),
}).unknown(false);
