import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log("🔍 Validating request:", req.url, req.body);
    console.log("🔍 Schema keys:", Object.keys(schema.describe().keys || {}));
    const { error } = schema.validate(req.body);

    if (error) {
      console.log("❌ Validation error:", error.details);
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errorMessage,
      });
    }

    return next();
  };
};
