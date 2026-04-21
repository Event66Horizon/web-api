import { query, run, transaction } from "../../db/database";
import { AppError } from "../../shared/errors";

type RecipeRow = {
  id: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  servings: number;
  prep_minutes: number;
  instructions: string;
  created_by: number;
  created_at: string;
  updated_at: string;
};

type RecipeIngredientJoinRow = {
  ingredient_id: number;
  ingredient_name: string;
  category: string;
  grams: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  cost_per_100g: number;
  allergens: string;
};

type RecipeInput = {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  servings: number;
  prepMinutes: number;
  instructions: string;
  ingredients: Array<{ ingredientId: number; grams: number }>;
};

type RecipeUpdateInput = Partial<RecipeInput>;

const nowIso = (): string => new Date().toISOString();

const parseAllergens = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeIngredients = (items: Array<{ ingredientId: number; grams: number }>) => {
  const map = new Map<number, number>();
  for (const item of items) {
    map.set(item.ingredientId, (map.get(item.ingredientId) ?? 0) + item.grams);
  }
  return Array.from(map.entries()).map(([ingredientId, grams]) => ({ ingredientId, grams }));
};

const assertIngredientsExist = (ingredients: Array<{ ingredientId: number; grams: number }>): void => {
  if (ingredients.length === 0) {
    throw new AppError(400, "RECIPE_INGREDIENTS_REQUIRED", "At least one ingredient is required.");
  }

  const placeholders = ingredients.map(() => "?").join(",");
  const ids = ingredients.map((item) => item.ingredientId);
  const result = query<{ count: number }>(
    `SELECT COUNT(*) AS count FROM ingredients WHERE id IN (${placeholders});`,
    ids
  )[0];

  if ((result?.count ?? 0) !== ingredients.length) {
    throw new AppError(400, "INVALID_INGREDIENT_REFERENCE", "One or more ingredient IDs do not exist.");
  }
};

const getRecipeByIdInternal = (recipeId: number): RecipeRow | undefined => {
  return query<RecipeRow>("SELECT * FROM recipes WHERE id = ? LIMIT 1;", [recipeId])[0];
};

const getRecipeIngredientRows = (recipeId: number): RecipeIngredientJoinRow[] => {
  return query<RecipeIngredientJoinRow>(
    `SELECT
      ri.ingredient_id,
      i.name AS ingredient_name,
      i.category,
      ri.grams,
      i.kcal_per_100g,
      i.protein_per_100g,
      i.carbs_per_100g,
      i.fat_per_100g,
      i.cost_per_100g,
      i.allergens
     FROM recipe_ingredients ri
     INNER JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE ri.recipe_id = ?
     ORDER BY i.name ASC;`,
    [recipeId]
  );
};

const mapRecipe = (recipe: RecipeRow, ingredientRows: RecipeIngredientJoinRow[]) => ({
  id: recipe.id,
  title: recipe.title,
  description: recipe.description,
  difficulty: recipe.difficulty,
  servings: recipe.servings,
  prepMinutes: recipe.prep_minutes,
  instructions: recipe.instructions,
  createdBy: recipe.created_by,
  createdAt: recipe.created_at,
  updatedAt: recipe.updated_at,
  ingredients: ingredientRows.map((row) => ({
    ingredientId: row.ingredient_id,
    name: row.ingredient_name,
    category: row.category,
    grams: row.grams,
    allergens: parseAllergens(row.allergens),
    nutritionContribution: {
      kcal: Number(((row.grams / 100) * row.kcal_per_100g).toFixed(2)),
      protein: Number(((row.grams / 100) * row.protein_per_100g).toFixed(2)),
      carbs: Number(((row.grams / 100) * row.carbs_per_100g).toFixed(2)),
      fat: Number(((row.grams / 100) * row.fat_per_100g).toFixed(2)),
      cost: Number(((row.grams / 100) * row.cost_per_100g).toFixed(2))
    }
  }))
});

export const createRecipe = (input: RecipeInput, userId: number) => {
  const normalizedIngredients = normalizeIngredients(input.ingredients);
  assertIngredientsExist(normalizedIngredients);
  const createdAt = nowIso();

  const recipeId = transaction(() => {
    run(
      `INSERT INTO recipes (title, description, difficulty, servings, prep_minutes, instructions, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        input.title,
        input.description,
        input.difficulty,
        input.servings,
        input.prepMinutes,
        input.instructions,
        userId,
        createdAt,
        createdAt
      ]
    );
    const idRow = query<{ id: number }>("SELECT id FROM recipes ORDER BY id DESC LIMIT 1;")[0];
    if (!idRow) {
      throw new AppError(500, "RECIPE_CREATION_FAILED", "Could not create recipe.");
    }

    for (const ingredient of normalizedIngredients) {
      run(
        `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, grams)
         VALUES (?, ?, ?);`,
        [idRow.id, ingredient.ingredientId, ingredient.grams]
      );
    }

    return idRow.id;
  });

  return getRecipeById(recipeId);
};

export const getRecipeById = (recipeId: number) => {
  const recipe = getRecipeByIdInternal(recipeId);
  if (!recipe) {
    throw new AppError(404, "RECIPE_NOT_FOUND", "Recipe was not found.");
  }
  return mapRecipe(recipe, getRecipeIngredientRows(recipeId));
};

export const listRecipes = (filters: {
  search?: string;
  difficulty?: "easy" | "medium" | "hard";
  createdBy?: number;
  limit: number;
  offset: number;
}) => {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filters.search) {
    where.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ?)");
    params.push(`%${filters.search.toLowerCase()}%`);
    params.push(`%${filters.search.toLowerCase()}%`);
  }
  if (filters.difficulty) {
    where.push("difficulty = ?");
    params.push(filters.difficulty);
  }
  if (filters.createdBy) {
    where.push("created_by = ?");
    params.push(filters.createdBy);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = query<RecipeRow>(
    `SELECT * FROM recipes ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?;`,
    [...params, filters.limit, filters.offset]
  );
  const total = query<{ total: number }>(`SELECT COUNT(*) AS total FROM recipes ${whereSql};`, params)[0]?.total ?? 0;

  return {
    items: rows.map((row) => {
      const ingredients = getRecipeIngredientRows(row.id);
      return mapRecipe(row, ingredients);
    }),
    pagination: {
      total,
      limit: filters.limit,
      offset: filters.offset
    }
  };
};

export const updateRecipe = (recipeId: number, input: RecipeUpdateInput) => {
  const existing = getRecipeByIdInternal(recipeId);
  if (!existing) {
    throw new AppError(404, "RECIPE_NOT_FOUND", "Recipe was not found.");
  }

  const mergedIngredients = input.ingredients
    ? normalizeIngredients(input.ingredients)
    : getRecipeIngredientRows(recipeId).map((row) => ({ ingredientId: row.ingredient_id, grams: row.grams }));
  assertIngredientsExist(mergedIngredients);
  const updatedAt = nowIso();

  transaction(() => {
    run(
      `UPDATE recipes SET
        title = ?,
        description = ?,
        difficulty = ?,
        servings = ?,
        prep_minutes = ?,
        instructions = ?,
        updated_at = ?
       WHERE id = ?;`,
      [
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.difficulty ?? existing.difficulty,
        input.servings ?? existing.servings,
        input.prepMinutes ?? existing.prep_minutes,
        input.instructions ?? existing.instructions,
        updatedAt,
        recipeId
      ]
    );

    if (input.ingredients) {
      run("DELETE FROM recipe_ingredients WHERE recipe_id = ?;", [recipeId]);
      for (const item of mergedIngredients) {
        run("INSERT INTO recipe_ingredients (recipe_id, ingredient_id, grams) VALUES (?, ?, ?);", [
          recipeId,
          item.ingredientId,
          item.grams
        ]);
      }
    }
  });

  return getRecipeById(recipeId);
};

export const deleteRecipe = (recipeId: number): void => {
  const changed = run("DELETE FROM recipes WHERE id = ?;", [recipeId]);
  if (!changed) {
    throw new AppError(404, "RECIPE_NOT_FOUND", "Recipe was not found.");
  }
};

