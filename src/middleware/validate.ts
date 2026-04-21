import type { RequestHandler } from "express-serve-static-core";
import { ZodError, type ZodTypeAny } from "zod";
import { AppError } from "../shared/errors";

type ValidationSchema = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export const validate = (schema: ValidationSchema): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.params) {
        const parsedParams = schema.params.parse(req.params) as Record<string, unknown>;
        (req as RequestWithValidated).validatedParams = parsedParams;
      }
      if (schema.query) {
        const parsedQuery = schema.query.parse(req.query) as Record<string, unknown>;
        (req as RequestWithValidated).validatedQuery = parsedQuery;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError(400, "VALIDATION_ERROR", "Request validation failed.", error.issues));
        return;
      }
      next(error);
    }
  };
};

type RequestWithValidated = {
  validatedParams?: Record<string, unknown>;
  validatedQuery?: Record<string, unknown>;
};
