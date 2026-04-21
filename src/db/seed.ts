import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { initDatabase, query, run } from "./database";

type IngredientSeed = {
  name: string;
  category: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  cost: number;
  allergens: string[];
  source: string;
};

const nowIso = (): string => new Date().toISOString();

const starterIngredients: IngredientSeed[] = [
  {
    name: "Chicken Breast",
    category: "protein",
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    cost: 1.3,
    allergens: [],
    source: "USDA FoodData Central"
  },
  {
    name: "Brown Rice",
    category: "carbohydrate",
    kcal: 123,
    protein: 2.7,
    carbs: 25.6,
    fat: 1.0,
    cost: 0.35,
    allergens: [],
    source: "USDA FoodData Central"
  },
  {
    name: "Broccoli",
    category: "vegetable",
    kcal: 34,
    protein: 2.8,
    carbs: 6.6,
    fat: 0.4,
    cost: 0.55,
    allergens: [],
    source: "USDA FoodData Central"
  },
  {
    name: "Olive Oil",
    category: "fat",
    kcal: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    cost: 0.8,
    allergens: [],
    source: "USDA FoodData Central"
  },
  {
    name: "Greek Yogurt",
    category: "dairy",
    kcal: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    cost: 0.75,
    allergens: ["milk"],
    source: "USDA FoodData Central"
  },
  {
    name: "Peanut Butter",
    category: "spread",
    kcal: 588,
    protein: 25,
    carbs: 20,
    fat: 50,
    cost: 0.9,
    allergens: ["peanut"],
    source: "USDA FoodData Central"
  }
];

export const bootstrapAdminUser = async (): Promise<void> => {
  const email = env.adminBootstrapEmail.trim().toLowerCase();
  const existing = query<{ id: number }>("SELECT id FROM users WHERE email = ? LIMIT 1;", [email])[0];
  if (existing) return;

  const passwordHash = await bcrypt.hash(env.adminBootstrapPassword, 12);
  const now = nowIso();
  run(
    `INSERT INTO users (email, name, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', ?, ?);`,
    [email, "System Admin", passwordHash, now, now]
  );
};

export const seedStarterIngredients = (): void => {
  const admin = query<{ id: number }>("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1;")[0];
  if (!admin) return;

  for (const item of starterIngredients) {
    const exists = query<{ id: number }>("SELECT id FROM ingredients WHERE name = ? LIMIT 1;", [item.name])[0];
    if (exists) continue;

    const now = nowIso();
    run(
      `INSERT INTO ingredients
      (name, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, cost_per_100g, allergens, source, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.name,
        item.category,
        item.kcal,
        item.protein,
        item.carbs,
        item.fat,
        item.cost,
        JSON.stringify(item.allergens),
        item.source,
        admin.id,
        now,
        now
      ]
    );
  }
};

const seed = async (): Promise<void> => {
  await bootstrapAdminUser();
  seedStarterIngredients();
  // eslint-disable-next-line no-console
  console.log("Seed completed.");
};

if (require.main === module) {
  initDatabase()
    .then(async () => {
      await seed();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    });
}
