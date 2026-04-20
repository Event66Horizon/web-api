"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const analytics_routes_1 = require("./modules/analytics/analytics.routes");
const auth_routes_1 = require("./modules/auth/auth.routes");
const ingredients_routes_1 = require("./modules/ingredients/ingredients.routes");
const recipes_routes_1 = require("./modules/recipes/recipes.routes");
exports.apiRouter = (0, express_1.Router)();
exports.apiRouter.get("/", (_req, res) => {
    res.json({
        success: true,
        data: {
            service: "NutriPlanner API",
            modules: ["auth", "ingredients", "recipes", "analytics"]
        }
    });
});
exports.apiRouter.use("/auth", auth_routes_1.authRouter);
exports.apiRouter.use("/ingredients", ingredients_routes_1.ingredientsRouter);
exports.apiRouter.use("/recipes", recipes_routes_1.recipesRouter);
exports.apiRouter.use("/analytics", analytics_routes_1.analyticsRouter);
