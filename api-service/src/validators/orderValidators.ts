import Joi from "joi";

export const createOrderSchema = Joi.object({
  restaurantId: Joi.string().required().messages({
    "any.required": "Restaurant ID is required",
  }),
  orderType: Joi.string()
    .valid("DINE_IN", "DELIVERY")
    .default("DINE_IN")
    .messages({
      "any.only": "Order type must be either DINE_IN or DELIVERY",
    }),
  tableNumber: Joi.string()
    .min(1)
    .max(10)
    .when("orderType", {
      is: "DINE_IN",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.min": "Table number must be at least 1 character long",
      "string.max": "Table number cannot exceed 10 characters",
      "any.required": "Table number is required for dine-in orders",
    }),
  items: Joi.array()
    .items(
      Joi.object({
        menuItemId: Joi.string().required().messages({
          "any.required": "Menu item ID is required",
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          "number.base": "Quantity must be a number",
          "number.integer": "Quantity must be an integer",
          "number.min": "Quantity must be at least 1",
          "any.required": "Quantity is required",
        }),
        notes: Joi.string().max(200).allow("").optional().messages({
          "string.max": "Item notes cannot exceed 200 characters",
        }),
        extras: Joi.object().optional(),
        // When menu item price is 0 (e.g. weight-based), send tax-inclusive price for this order line only
        price: Joi.number().min(0).precision(2).optional().messages({
          "number.base": "Price must be a number",
          "number.min": "Price cannot be negative",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one item is required",
      "any.required": "Items are required",
    }),
  customerName: Joi.string()
    .min(2)
    .max(50)
    .when("orderType", {
      is: "DELIVERY",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.min": "Customer name must be at least 2 characters long",
      "string.max": "Customer name cannot exceed 50 characters",
      "any.required": "Customer name is required for delivery orders",
    }),
  customerPhone: Joi.string()
    .min(10)
    .max(15)
    .when("orderType", {
      is: "DELIVERY",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.min": "Phone number must be at least 10 characters long",
      "string.max": "Phone number cannot exceed 15 characters",
      "any.required": "Phone number is required for delivery orders",
    }),
  customerAddress: Joi.string()
    .min(10)
    .max(200)
    .when("orderType", {
      is: "DELIVERY",
      then: Joi.required(),
      otherwise: Joi.optional(),
    })
    .messages({
      "string.min": "Address must be at least 10 characters long",
      "string.max": "Address cannot exceed 200 characters",
      "any.required": "Address is required for delivery orders",
    }),
  notes: Joi.string().max(500).allow("").optional().messages({
    "string.max": "Order notes cannot exceed 500 characters",
  }),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "PENDING",
      "PREPARING",
      "READY",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED"
    )
    .required()
    .messages({
      "any.only":
        "Status must be one of: PENDING, PREPARING, READY, DELIVERED, COMPLETED, CANCELLED",
      "any.required": "Status is required",
    }),
});

export const updateOrderItemPriceSchema = Joi.object({
  price: Joi.number().min(0).precision(2).required().messages({
    "number.base": "Price must be a number",
    "number.min": "Price cannot be negative",
    "any.required": "Price is required",
  }),
});

export const getOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
  status: Joi.string()
    .valid(
      "PENDING",
      "PREPARING",
      "READY",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED"
    )
    .optional()
    .messages({
      "any.only":
        "Status must be one of: PENDING, PREPARING, READY, DELIVERED, COMPLETED, CANCELLED",
    }),
  tableNumber: Joi.string().min(1).max(10).optional().messages({
    "string.min": "Table number must be at least 1 character long",
    "string.max": "Table number cannot exceed 10 characters",
  }),
  startDate: Joi.date().optional().messages({
    "date.base": "Start date must be a valid date",
  }),
  endDate: Joi.date().min(Joi.ref("startDate")).optional().messages({
    "date.base": "End date must be a valid date",
    "date.min": "End date must be after start date",
  }),
});
