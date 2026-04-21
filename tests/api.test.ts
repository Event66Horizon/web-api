import request from "supertest";

describe("NutriPlanner API integration", () => {
  let app: any;
  let closeDatabase: () => void;
  let accessToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    process.env.DB_FILE = ":memory:";
    process.env.JWT_ACCESS_SECRET = "test_access_secret";
    process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
    process.env.ADMIN_BOOTSTRAP_EMAIL = "admin@test.local";
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "AdminTest123";

    const databaseModule = await import("../src/db/database");
    const seedModule = await import("../src/db/seed");
    const appModule = await import("../src/app");

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
    const response = await request(app).post("/api/v1/auth/register").send({
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
    const listIngredientsResponse = await request(app)
      .get("/api/v1/ingredients")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(listIngredientsResponse.status).toBe(200);
    const ingredientList = listIngredientsResponse.body.data.items as Array<{ id: number }>;
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

    const createRecipeResponse = await request(app)
      .post("/api/v1/recipes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(recipePayload);

    expect(createRecipeResponse.status).toBe(201);
    expect(createRecipeResponse.body.data.title).toBe("Chicken Rice Bowl");
    const recipeId = createRecipeResponse.body.data.id as number;

    const nutritionResponse = await request(app).get(`/api/v1/analytics/recipes/${recipeId}/nutrition`);
    expect(nutritionResponse.status).toBe(200);
    expect(nutritionResponse.body.data.perServing.calories).toBeGreaterThan(0);
    expect(nutritionResponse.body.data.qualityScores.proteinDensity).toBeGreaterThan(0);

    const recommendationResponse = await request(app)
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
    const response = await request(app).post("/api/v1/auth/refresh").send({
      refreshToken
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTypeOf("string");
    expect(response.body.data.refreshToken).toBeTypeOf("string");
  });
});
