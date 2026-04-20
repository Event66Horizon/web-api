"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingredientListQuerySchema = exports.ingredientUpdateSchema = exports.ingredientCreateSchema = exports.ingredientIdParamsSchema = void 0;
const zod_1 = require("zod");
const numericField = zod_1.z.number().nonnegative();
exports.ingredientIdParamsSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive()
});
exports.ingredientCreateSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    category: zod_1.z.string().trim().min(2).max(60),
    kcalPer100g: numericField,
    proteinPer100g: numericField,
    carbsPer100g: numericField,
    fatPer100g: numericField,
    costPer100g: numericField,
    allergens: zod_1.z.array(zod_1.z.string().trim().min(1).max(40)).max(20).default([]),
    source: zod_1.z.string().trim().min(2).max(120).default("manual")
});
exports.ingredientUpdateSchema = exports.ingredientCreateSchema.partial().refine((value) => {
    return Object.keys(value).length > 0;
}, "At least one field is required for update.");
exports.ingredientListQuerySchema = zod_1.z.object({
    name: zod_1.z.string().trim().optional(),
    category: zod_1.z.string().trim().optional(),
    allergen: zod_1.z.string().trim().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(20),
    offset: zod_1.z.coerce.number().int().min(0).default(0)
});
