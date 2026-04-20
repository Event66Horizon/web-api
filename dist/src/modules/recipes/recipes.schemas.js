"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeListQuerySchema = exports.recipeIdParamsSchema = exports.recipeUpdateSchema = exports.recipeCreateSchema = void 0;
const zod_1 = require("zod");
const difficultyEnum = zod_1.z.enum(["easy", "medium", "hard"]);
const recipeIngredientSchema = zod_1.z.object({
    ingredientId: zod_1.z.number().int().positive(),
    grams: zod_1.z.number().positive().max(5000)
});
exports.recipeCreateSchema = zod_1.z.object({
    title: zod_1.z.string().trim().min(3).max(120),
    description: zod_1.z.string().trim().min(5).max(600),
    difficulty: difficultyEnum,
    servings: zod_1.z.number().int().positive().max(50),
    prepMinutes: zod_1.z.number().int().min(0).max(1440),
    instructions: zod_1.z.string().trim().min(10).max(4000),
    ingredients: zod_1.z.array(recipeIngredientSchema).min(1).max(30)
});
exports.recipeUpdateSchema = exports.recipeCreateSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, "At least one field is required.");
exports.recipeIdParamsSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive()
});
exports.recipeListQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().optional(),
    difficulty: difficultyEnum.optional(),
    createdBy: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0)
});
