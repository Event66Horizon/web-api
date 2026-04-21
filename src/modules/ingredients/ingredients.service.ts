import { query, run } from "../../db/database";
import { AppError } from "../../shared/errors";

type IngredientRow = {
  id: number;
  name: string;
  category: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  cost_per_100g: number;
  allergens: string;
  source: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

type IngredientInput = {
  name: string;
  category: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  costPer100g: number;
  allergens: string[];
  source: string;
};

type IngredientUpdateInput = Partial<IngredientInput>;

const nowIso = (): string => new Date().toISOString();

const safeParseAllergens = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const mapIngredient = (row: IngredientRow) => ({
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

const getIngredientByIdInternal = (ingredientId: number): IngredientRow | undefined => {
  return query<IngredientRow>("SELECT * FROM ingredients WHERE id = ? LIMIT 1;", [ingredientId])[0];
};

export const createIngredient = (input: IngredientInput, createdBy: number) => {
  const existing = query<{ id: number }>("SELECT id FROM ingredients WHERE LOWER(name) = LOWER(?) LIMIT 1;", [input.name])[0];
  if (existing) {
    throw new AppError(409, "INGREDIENT_EXISTS", "Ingredient already exists.");
  }

  const now = nowIso();
  run(
    `INSERT INTO ingredients
     (name, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, cost_per_100g, allergens, source, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
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
    ]
  );

  const created = query<IngredientRow>("SELECT * FROM ingredients ORDER BY id DESC LIMIT 1;")[0];
  if (!created) {
    throw new AppError(500, "INGREDIENT_CREATE_FAILED", "Failed to create ingredient.");
  }
  return mapIngredient(created);
};

export const listIngredients = (filters: {
  name?: string;
  category?: string;
  allergen?: string;
  limit: number;
  offset: number;
}) => {
  const where: string[] = [];
  const params: Array<string | number> = [];

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
  const rows = query<IngredientRow>(
    `SELECT * FROM ingredients ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?;`,
    [...params, filters.limit, filters.offset]
  );

  const count = query<{ total: number }>(`SELECT COUNT(*) AS total FROM ingredients ${whereSql};`, params)[0]?.total ?? 0;

  return {
    items: rows.map(mapIngredient),
    pagination: {
      total: count,
      limit: filters.limit,
      offset: filters.offset
    }
  };
};

export const getIngredientById = (ingredientId: number) => {
  const row = getIngredientByIdInternal(ingredientId);
  if (!row) {
    throw new AppError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
  }
  return mapIngredient(row);
};

export const updateIngredient = (ingredientId: number, input: IngredientUpdateInput) => {
  const existing = getIngredientByIdInternal(ingredientId);
  if (!existing) {
    throw new AppError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
  }

  const now = nowIso();
  run(
    `UPDATE ingredients SET
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
     WHERE id = ?;`,
    [
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
    ]
  );

  return getIngredientById(ingredientId);
};

export const deleteIngredient = (ingredientId: number): void => {
  const changed = run("DELETE FROM ingredients WHERE id = ?;", [ingredientId]);
  if (!changed) {
    throw new AppError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
  }
};
