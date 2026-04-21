import { z } from "zod";

const difficultyEnum = z.enum(["easy", "medium", "hard"]);

const recipeIngredientSchema = z.object({
  ingredientId: z.number().int().positive(),
  grams: z.number().positive().max(5000)
});

export const recipeCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(5).max(600),
  difficulty: difficultyEnum,
  servings: z.number().int().positive().max(50),
  prepMinutes: z.number().int().min(0).max(1440),
  instructions: z.string().trim().min(10).max(4000),
  ingredients: z.array(recipeIngredientSchema).min(1).max(30)
});

export const recipeUpdateSchema = recipeCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export const recipeIdParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const recipeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  difficulty: difficultyEnum.optional(),
  createdBy: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

