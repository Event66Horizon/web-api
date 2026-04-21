import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ok } from "../../shared/http";
import {
  analyticsRecipeParamsSchema,
  leaderboardQuerySchema,
  recommendationSchema
} from "./analytics.schemas";
import {
  getLeaderboard,
  getRecommendations,
  getRecipeCostAnalysis,
  getRecipeNutritionAnalysis
} from "./analytics.service";

export const analyticsRouter = Router();

analyticsRouter.get("/recipes/:id/nutrition", validate({ params: analyticsRecipeParamsSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    const result = getRecipeNutritionAnalysis(parsedParams.id);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/recipes/:id/cost", validate({ params: analyticsRecipeParamsSchema }), (req, res, next) => {
  try {
    const parsedParams = (req as { validatedParams?: unknown }).validatedParams as { id: number };
    const result = getRecipeCostAnalysis(parsedParams.id);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

analyticsRouter.get("/leaderboard", validate({ query: leaderboardQuerySchema }), (req, res, next) => {
  try {
    const { metric, limit } = (req as { validatedQuery?: unknown }).validatedQuery as {
      metric: "proteinDensity" | "costEfficiency";
      limit: number;
    };
    const result = getLeaderboard(metric, limit);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

analyticsRouter.post("/recommendations", requireAuth, validate({ body: recommendationSchema }), (req, res, next) => {
  try {
    const result = getRecommendations(req.body);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});
