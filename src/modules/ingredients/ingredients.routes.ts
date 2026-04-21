import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ok } from "../../shared/http";
import type { AuthenticatedRequest } from "../auth/auth.types";
import {
  ingredientCreateSchema,
  ingredientIdParamsSchema,
  ingredientListQuerySchema,
  ingredientUpdateSchema
} from "./ingredients.schemas";
import {
  createIngredient,
  deleteIngredient,
  getIngredientById,
  listIngredients,
  updateIngredient
} from "./ingredients.service";

export const ingredientsRouter = Router();

ingredientsRouter.get("/", validate({ query: ingredientListQuerySchema }), (req, res, next) => {
  try {
    const parsedQuery = (req as { validatedQuery?: unknown }).validatedQuery as {
      name?: string;
      category?: string;
      allergen?: string;
      limit: number;
      offset: number;
    };
    const result = listIngredients(parsedQuery);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.get("/:id", validate({ params: ingredientIdParamsSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    const result = getIngredientById(parsedParams.id);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.post("/", requireAuth, validate({ body: ingredientCreateSchema }), (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const result = createIngredient(req.body, user.sub);
    res.status(201).json(ok(result));
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.patch(
  "/:id",
  requireAuth,
  validate({ params: ingredientIdParamsSchema, body: ingredientUpdateSchema }),
  (req, res, next) => {
    try {
      const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
      const result = updateIngredient(parsedParams.id, req.body);
      res.json(ok(result));
    } catch (error) {
      next(error);
    }
  }
);

ingredientsRouter.delete("/:id", requireAuth, requireRole("admin"), validate({ params: ingredientIdParamsSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    deleteIngredient(parsedParams.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
