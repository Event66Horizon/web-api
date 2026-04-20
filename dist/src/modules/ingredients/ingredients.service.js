"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteIngredient = exports.updateIngredient = exports.getIngredientById = exports.listIngredients = exports.createIngredient = void 0;
const database_1 = require("../../db/database");
const errors_1 = require("../../shared/errors");
const nowIso = () => new Date().toISOString();
const safeParseAllergens = (raw) => {
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
};
const mapIngredient = (row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    kcalPer100g: row.kcal_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    costPer100g: row.cost_per_100g,
    allergens: safeParseAllergens(row.allergens),
    source: row.source,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});
const getIngredientByIdInternal = (ingredientId) => {
    return (0, database_1.query)("SELECT * FROM ingredients WHERE id = ? LIMIT 1;", [ingredientId])[0];
};
const createIngredient = (input, createdBy) => {
    const existing = (0, database_1.query)("SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1;", [input.name])[0];
    if (existing) {
        throw new errors_1.AppError(409, "INGREDIENT_EXISTS", "Ingredient already exists.");
    }
    const now = nowIso();
    (0, database_1.run)(`INSERT INTO ingredients
     (name, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, cost_per_100g, allergens, source, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
        input.name,
        input.category,
        input.kcalPer100g,
        input.proteinPer100g,
        input.carbsPer100g,
        input.fatPer100g,
        input.costPer100g,
        JSON.stringify(input.allergens),
        input.source,
        createdBy,
        now,
        now
    ]);
    const created = (0, database_1.query)("SELECT * FROM ingredients WHERE id = last_insert_rowid() LIMIT 1;")[0];
    if (!created) {
        throw new errors_1.AppError(500, "INGREDIENT_CREATE_FAILED", "Failed to create ingredient.");
    }
    return mapIngredient(created);
};
exports.createIngredient = createIngredient;
const listIngredients = (filters) => {
    const where = [];
    const params = [];
    if (filters.name) {
        where.push("LOWER(name) LIKE ?");
        params.push(`%${filters.name.toLowerCase()}%`);
    }
    if (filters.category) {
        where.push("LOWER(category) = ?");
        params.push(filters.category.toLowerCase());
    }
    if (filters.allergen) {
        where.push("LOWER(allergens) LIKE ?");
        params.push(`%${filters.allergen.toLowerCase()}%`);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const rows = (0, database_1.query)(`SELECT * FROM ingredients ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?;`, [...params, filters.limit, filters.offset]);
    const count = (0, database_1.query)(`SELECT COUNT(*) AS total FROM ingredients ${whereSql};`, params)[0]?.total ?? 0;
    return {
        items: rows.map(mapIngredient),
        pagination: {
            total: count,
            limit: filters.limit,
            offset: filters.offset
        }
    };
};
exports.listIngredients = listIngredients;
const getIngredientById = (ingredientId) => {
    const row = getIngredientByIdInternal(ingredientId);
    if (!row) {
        throw new errors_1.AppError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
    }
    return mapIngredient(row);
};
exports.getIngredientById = getIngredientById;
const updateIngredient = (ingredientId, input) => {
    const existing = getIngredientByIdInternal(ingredientId);
    if (!existing) {
        throw new errors_1.AppError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
    }
    const now = nowIso();
    (0, database_1.run)(`UPDATE ingredients SET
      name = ?,
      category = ?,
      kcal_per_100g = ?,
      protein_per_100g = ?,
      carbs_per_100g = ?,
      fat_per_100g = ?,
      cost_per_100g = ?,
      allergens = ?,
      source = ?,
      updated_at = ?
     WHERE id = ?;`, [
        input.name ?? existing.name,
        input.category ?? existing.category,
        input.kcalPer100g ?? existing.kcal_per_100g,
        input.proteinPer100g ?? existing.protein_per_100g,
        input.carbsPer100g ?? existing.carbs_per_100g,
        input.fatPer100g ?? existing.fat_per_100g,
        input.costPer100g ?? existing.cost_per_100g,
        JSON.stringify(input.allergens ?? safeParseAllergens(existing.allergens)),
        input.source ?? existing.source,
        now,
        ingredientId
    ]);
    return (0, exports.getIngredientById)(ingredientId);
};
exports.updateIngredient = updateIngredient;
const deleteIngredient = (ingredientId) => {
    const changed = (0, database_1.run)("DELETE FROM ingredients WHERE id = ?;", [ingredientId]);
    if (!changed) {
        throw new errors_1.AppError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
    }
};
exports.deleteIngredient = deleteIngredient;
