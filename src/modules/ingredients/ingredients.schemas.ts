import { z } from "zod";

const numericField = z.number().nonnegative();

export const ingredientIdParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const ingredientCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  kcalPer100g: numericField,
  proteinPer100g: numericField,
  carbsPer100g: numericField,
  fatPer100g: numericField,
  costPer100g: numericField,
  allergens: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  source: z.string().trim().min(2).max(120).default("manual")
});

export const ingredientUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().min(2).max(60),
  kcalPer100g: numericField,
  proteinPer100g: numericField,
  carbsPer100g: numericField,
  fatPer100g: numericField,
  costPer100g: numericField,
  allergens: z.array(z.string().trim().min(1).max(40)).max(20),
  source: z.string().trim().min(2).max(120)
}).partial().refine((value) => {
  return Object.keys(value).length > 0;
}, "At least one field is required for update.");

export const ingredientListQuerySchema = z.object({
  name: z.string().trim().optional(),
  category: z.string().trim().optional(),
  allergen: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

