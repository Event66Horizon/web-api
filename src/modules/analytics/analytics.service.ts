import { query } from "../../db/database";
import { AppError } from "../../shared/errors";

type RecipeBasicRow = {
  id: number;
  title: string;
  servings: number;
};

type RecipeIngredientMetricsRow = {
  recipe_id: number;
  title: string;
  servings: number;
  ingredient_id: number;
  ingredient_name: string;
  grams: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  cost_per_100g: number;
  allergens: string;
};

type RecommendationInput = {
  targetCaloriesPerServing?: number;
  minProteinPerServing?: number;
  maxCostPerServing?: number;
  excludeAllergens: string[];
};

const parseAllergens = (raw: string): string[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const fetchRecipeMetricRows = (recipeId: number): RecipeIngredientMetricsRow[] => {
  return query<RecipeIngredientMetricsRow>(
    `SELECT
      r.id AS recipe_id,
      r.title,
      r.servings,
      i.id AS ingredient_id,
      i.name AS ingredient_name,
      ri.grams,
      i.kcal_per_100g,
      i.protein_per_100g,
      i.carbs_per_100g,
      i.fat_per_100g,
      i.cost_per_100g,
      i.allergens
     FROM recipes r
     INNER JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     INNER JOIN ingredients i ON i.id = ri.ingredient_id
     WHERE r.id = ?;`,
    [recipeId]
  );
};

const computeNutrition = (rows: RecipeIngredientMetricsRow[]) => {
  const first = rows[0];
  if (!first) {
    throw new AppError(404, "RECIPE_NOT_FOUND", "Recipe was not found.");
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalCost = 0;

  const allergensSet = new Set<string>();

  for (const row of rows) {
    const factor = row.grams / 100;
    totalCalories += factor * row.kcal_per_100g;
    totalProtein += factor * row.protein_per_100g;
    totalCarbs += factor * row.carbs_per_100g;
    totalFat += factor * row.fat_per_100g;
    totalCost += factor * row.cost_per_100g;
    parseAllergens(row.allergens).forEach((allergen) => allergensSet.add(allergen.toLowerCase()));
  }

  const servings = first.servings;
  const caloriesPerServing = totalCalories / servings;
  const proteinPerServing = totalProtein / servings;
  const carbsPerServing = totalCarbs / servings;
  const fatPerServing = totalFat / servings;
  const costPerServing = totalCost / servings;

  const macroCalories = {
    protein: totalProtein * 4,
    carbs: totalCarbs * 4,
    fat: totalFat * 9
  };
  const totalMacroCalories = macroCalories.protein + macroCalories.carbs + macroCalories.fat;
  const macroRatios = totalMacroCalories
    ? {
        protein: macroCalories.protein / totalMacroCalories,
        carbs: macroCalories.carbs / totalMacroCalories,
        fat: macroCalories.fat / totalMacroCalories
      }
    : { protein: 0, carbs: 0, fat: 0 };

  const target = { protein: 0.3, carbs: 0.4, fat: 0.3 };
  const ratioDistance =
    Math.abs(macroRatios.protein - target.protein) +
    Math.abs(macroRatios.carbs - target.carbs) +
    Math.abs(macroRatios.fat - target.fat);
  const balanceScore = Math.max(0, Math.min(100, 100 - ratioDistance * 100));
  const proteinDensity = caloriesPerServing > 0 ? (proteinPerServing / caloriesPerServing) * 100 : 0;

  return {
    recipeId: first.recipe_id,
    title: first.title,
    servings,
    totals: {
      calories: Number(totalCalories.toFixed(2)),
      protein: Number(totalProtein.toFixed(2)),
      carbs: Number(totalCarbs.toFixed(2)),
      fat: Number(totalFat.toFixed(2)),
      cost: Number(totalCost.toFixed(2))
    },
    perServing: {
      calories: Number(caloriesPerServing.toFixed(2)),
      protein: Number(proteinPerServing.toFixed(2)),
      carbs: Number(carbsPerServing.toFixed(2)),
      fat: Number(fatPerServing.toFixed(2)),
      cost: Number(costPerServing.toFixed(2))
    },
    macroRatios: {
      protein: Number((macroRatios.protein * 100).toFixed(2)),
      carbs: Number((macroRatios.carbs * 100).toFixed(2)),
      fat: Number((macroRatios.fat * 100).toFixed(2))
    },
    qualityScores: {
      macroBalance: Number(balanceScore.toFixed(2)),
      proteinDensity: Number(proteinDensity.toFixed(2))
    },
    allergens: Array.from(allergensSet).sort()
  };
};

export const getRecipeNutritionAnalysis = (recipeId: number) => {
  const rows = fetchRecipeMetricRows(recipeId);
  return computeNutrition(rows);
};

export const getRecipeCostAnalysis = (recipeId: number) => {
  const analysis = getRecipeNutritionAnalysis(recipeId);
  return {
    recipeId: analysis.recipeId,
    title: analysis.title,
    servings: analysis.servings,
    totalCost: analysis.totals.cost,
    costPerServing: analysis.perServing.cost,
    costTier:
      analysis.perServing.cost <= 1.5 ? "budget" : analysis.perServing.cost <= 3 ? "moderate" : "premium",
    notes:
      analysis.perServing.cost <= 1.5
        ? "Cost-efficient recipe."
        : analysis.perServing.cost <= 3
          ? "Balanced between cost and quality."
          : "Higher-cost recipe with likely premium ingredients."
  };
};

export const getLeaderboard = (metric: "proteinDensity" | "costEfficiency", limit: number) => {
  const rows = query<RecipeBasicRow>("SELECT id, title, servings FROM recipes;");
  const scored = rows
    .map((recipe) => {
      try {
        const analysis = getRecipeNutritionAnalysis(recipe.id);
        const score =
          metric === "proteinDensity"
            ? analysis.qualityScores.proteinDensity
            : analysis.perServing.cost > 0
              ? Number((analysis.perServing.protein / analysis.perServing.cost).toFixed(4))
              : 0;
        return {
          recipeId: recipe.id,
          title: recipe.title,
          score,
          perServing: analysis.perServing
        };
      } catch {
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
};

export const getRecommendations = (input: RecommendationInput) => {
  const recipes = query<RecipeBasicRow>("SELECT id, title, servings FROM recipes;");
  const excluded = new Set(input.excludeAllergens.map((x) => x.toLowerCase()));

  const analyses = recipes
    .map((recipe) => {
      try {
        return getRecipeNutritionAnalysis(recipe.id);
      } catch {
        return null;
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const scored = analyses
    .filter((analysis) => {
      if (input.minProteinPerServing !== undefined && analysis.perServing.protein < input.minProteinPerServing) {
        return false;
      }
      if (input.maxCostPerServing !== undefined && analysis.perServing.cost > input.maxCostPerServing) {
        return false;
      }
      if (excluded.size > 0 && analysis.allergens.some((item) => excluded.has(item))) {
        return false;
      }
      return true;
    })
    .map((analysis) => {
      const caloriePenalty =
        input.targetCaloriesPerServing === undefined
          ? 0
          : Math.abs(analysis.perServing.calories - input.targetCaloriesPerServing) / input.targetCaloriesPerServing;

      const score =
        analysis.qualityScores.macroBalance * 0.35 +
        analysis.qualityScores.proteinDensity * 1.6 -
        analysis.perServing.cost * 8 -
        caloriePenalty * 35;

      return {
        recipeId: analysis.recipeId,
        title: analysis.title,
        score: Number(score.toFixed(2)),
        highlights: {
          caloriesPerServing: analysis.perServing.calories,
          proteinPerServing: analysis.perServing.protein,
          costPerServing: analysis.perServing.cost,
          allergens: analysis.allergens
        }
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    totalCandidates: scored.length,
    items: scored
  };
};

