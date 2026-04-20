"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedStarterIngredients = exports.bootstrapAdminUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../config/env");
const database_1 = require("./database");
const nowIso = () => new Date().toISOString();
const starterIngredients = [
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
const bootstrapAdminUser = async () => {
    const email = env_1.env.adminBootstrapEmail.trim().toLowerCase();
    const existing = (0, database_1.query)("SELECT id FROM users WHERE email = ? LIMIT 1;", [email])[0];
    if (existing)
        return;
    const passwordHash = await bcryptjs_1.default.hash(env_1.env.adminBootstrapPassword, 12);
    const now = nowIso();
    (0, database_1.run)(`INSERT INTO users (email, name, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', ?, ?);`, [email, "System Admin", passwordHash, now, now]);
};
exports.bootstrapAdminUser = bootstrapAdminUser;
const seedStarterIngredients = () => {
    const admin = (0, database_1.query)("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1;")[0];
    if (!admin)
        return;
    for (const item of starterIngredients) {
        const exists = (0, database_1.query)("SELECT id FROM ingredients WHERE name = ? LIMIT 1;", [item.name])[0];
        if (exists)
            continue;
        const now = nowIso();
        (0, database_1.run)(`INSERT INTO ingredients
      (name, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, cost_per_100g, allergens, source, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
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
        ]);
    }
};
exports.seedStarterIngredients = seedStarterIngredients;
const seed = async () => {
    await (0, exports.bootstrapAdminUser)();
    (0, exports.seedStarterIngredients)();
    // eslint-disable-next-line no-console
    console.log("Seed completed.");
};
if (require.main === module) {
    (0, database_1.initDatabase)()
        .then(async () => {
        await seed();
    })
        .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        process.exit(1);
    });
}
