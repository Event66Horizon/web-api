"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationSchema = exports.leaderboardQuerySchema = exports.analyticsRecipeParamsSchema = void 0;
const zod_1 = require("zod");
exports.analyticsRecipeParamsSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive()
});
exports.leaderboardQuerySchema = zod_1.z.object({
    metric: zod_1.z.enum(["proteinDensity", "costEfficiency"]).default("proteinDensity"),
    limit: zod_1.z.coerce.number().int().positive().max(50).default(10)
});
exports.recommendationSchema = zod_1.z.object({
    targetCaloriesPerServing: zod_1.z.number().positive().max(2000).optional(),
    minProteinPerServing: zod_1.z.number().nonnegative().max(300).optional(),
    maxCostPerServing: zod_1.z.number().nonnegative().max(100).optional(),
    excludeAllergens: zod_1.z.array(zod_1.z.string().trim().min(1).max(40)).max(20).default([])
});
