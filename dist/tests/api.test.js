"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
describe("NutriPlanner API integration", () => {
    let app;
    let closeDatabase;
    let accessToken = "";
    let refreshToken = "";
    beforeAll(async () => {
        process.env.DB_FILE = ":memory:";
        process.env.JWT_ACCESS_SECRET = "test_access_secret";
        process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
        process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@test.local";
        process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminTest123";
        const databaseModule = await Promise.resolve().then(() => __importStar(require("../src/db/database")));
        const seedModule = await Promise.resolve().then(() => __importStar(require("../src/db/seed")));
        const appModule = await Promise.resolve().then(() => __importStar(require("../src/app")));
        await databaseModule.initDatabase();
        await seedModule.bootstrapAdminUser();
        seedModule.seedStarterIngredients();
        closeDatabase = databaseModule.closeDatabase;
        app = appModule.default;
    });
    afterAll(() => {
        closeDatabase();
    });
    it("registers user and returns tokens", async () => {
        const response = await (0, supertest_1.default)(app).post("/api/v1/auth/register").send({
            email: "student@example.com",
            name: "Student Demo",
            password: "StrongPass123"
        });
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.accessToken).toBeTypeOf("string");
        expect(response.body.data.refreshToken).toBeTypeOf("string");
        accessToken = response.body.data.accessToken;
        refreshToken = response.body.data.refreshToken;
    });
    it("creates a recipe and returns analytics", async () => {
        const listIngredientsResponse = await (0, supertest_1.default)(app)
            .get("/api/v1/ingredients")
            .set("Authorization", `Bearer ${accessToken}`);
        expect(listIngredientsResponse.status).toBe(200);
        const ingredientList = listIngredientsResponse.body.data.items;
        expect(ingredientList.length).toBeGreaterThanOrEqual(2);
        const recipePayload = {
            title: "Chicken Rice Bowl",
            description: "High-protein balanced meal for post-workout recovery.",
            difficulty: "easy",
            servings: 2,
            prepMinutes: 25,
            instructions: "Cook rice. Grill chicken. Steam broccoli. Assemble and season.",
            ingredients: [
                { ingredientId: ingredientList[0].id, grams: 220 },
                { ingredientId: ingredientList[1].id, grams: 180 }
            ]
        };
        const createRecipeResponse = await (0, supertest_1.default)(app)
            .post("/api/v1/recipes")
            .set("Authorization", `Bearer ${accessToken}`)
            .send(recipePayload);
        expect(createRecipeResponse.status).toBe(201);
        expect(createRecipeResponse.body.data.title).toBe("Chicken Rice Bowl");
        const recipeId = createRecipeResponse.body.data.id;
        const nutritionResponse = await (0, supertest_1.default)(app).get(`/api/v1/analytics/recipes/${recipeId}/nutrition`);
        expect(nutritionResponse.status).toBe(200);
        expect(nutritionResponse.body.data.perServing.calories).toBeGreaterThan(0);
        expect(nutritionResponse.body.data.qualityScores.proteinDensity).toBeGreaterThan(0);
        const recommendationResponse = await (0, supertest_1.default)(app)
            .post("/api/v1/analytics/recommendations")
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
            targetCaloriesPerServing: 450,
            minProteinPerServing: 20,
            maxCostPerServing: 5,
            excludeAllergens: []
        });
        expect(recommendationResponse.status).toBe(200);
        expect(Array.isArray(recommendationResponse.body.data.items)).toBe(true);
    });
    it("refreshes session token", async () => {
        const response = await (0, supertest_1.default)(app).post("/api/v1/auth/refresh").send({
            refreshToken
        });
        expect(response.status).toBe(200);
        expect(response.body.data.accessToken).toBeTypeOf("string");
        expect(response.body.data.refreshToken).toBeTypeOf("string");
    });
});
