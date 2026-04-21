import { z } from "zod";

export const analyticsRecipeParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const leaderboardQuerySchema = z.object({
  metric: z.enum(["proteinDensity", "costEfficiency"]).default("proteinDensity"),
  limit: z.coerce.number().int().positive().max(50).default(10)
});

export const recommendationSchema = z.object({
  targetCaloriesPerServing: z.number().positive().max(2000).optional(),
  minProteinPerServing: z.number().nonnegative().max(300).optional(),
  maxCostPerServing: z.number().nonnegative().max(100).optional(),
  excludeAllergens: z.array(z.string().trim().min(1).max(40)).max(20).default([])
});

