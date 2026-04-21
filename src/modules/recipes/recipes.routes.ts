import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ok } from "../../shared/http";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { recipeCreateSchema, recipeIdParamsSchema, recipeListQuerySchema, recipeUpdateSchema } from "./recipes.schemas";
import { createRecipe, deleteRecipe, getRecipeById, listRecipes, updateRecipe } from "./recipes.service";

export const recipesRouter = Router();

recipesRouter.get("/", validate({ query: recipeListQuerySchema }), (req, res, next) => {
  try {
    const parsedQuery = (req as { validatedQuery?: unknown }).validatedQuery as {
      search?: string;
      difficulty?: "easy" | "medium" | "hard";
      createdBy?: number;
      limit: number;
      offset: number;
    };
    const result = listRecipes(parsedQuery);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

recipesRouter.get("/:id", validate({ params: recipeIdParamsSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    res.json(ok(getRecipeById(parsedParams.id)));
  } catch (error) {
    next(error);
  }
});

recipesRouter.post("/", requireAuth, validate({ body: recipeCreateSchema }), (req, res, next) => {
  try {
    const user = (req as AuthenticatedRequest).user!;
    const result = createRecipe(req.body, user.sub);
    res.status(201).json(ok(result));
  } catch (error) {
    next(error);
  }
});

recipesRouter.patch("/:id", requireAuth, validate({ params: recipeIdParamsSchema, body: recipeUpdateSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    const result = updateRecipe(parsedParams.id, req.body);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

recipesRouter.delete("/:id", requireAuth, validate({ params: recipeIdParamsSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    deleteRecipe(parsedParams.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
