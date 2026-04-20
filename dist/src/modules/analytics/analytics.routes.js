"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const http_1 = require("../../shared/http");
const analytics_schemas_1 = require("./analytics.schemas");
const analytics_service_1 = require("./analytics.service");
exports.analyticsRouter = (0, express_1.Router)();
exports.analyticsRouter.get("/recipes/:id/nutrition", (0, validate_1.validate)({ params: analytics_schemas_1.analyticsRecipeParamsSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        const result = (0, analytics_service_1.getRecipeNutritionAnalysis)(parsedParams.id);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.analyticsRouter.get("/recipes/:id/cost", (0, validate_1.validate)({ params: analytics_schemas_1.analyticsRecipeParamsSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        const result = (0, analytics_service_1.getRecipeCostAnalysis)(parsedParams.id);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.analyticsRouter.get("/leaderboard", (0, validate_1.validate)({ query: analytics_schemas_1.leaderboardQuerySchema }), (req, res, next) => {
    try {
        const { metric, limit } = req.validatedQuery;
        const result = (0, analytics_service_1.getLeaderboard)(metric, limit);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.analyticsRouter.post("/recommendations", auth_1.requireAuth, (0, validate_1.validate)({ body: analytics_schemas_1.recommendationSchema }), (req, res, next) => {
    try {
        const result = (0, analytics_service_1.getRecommendations)(req.body);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
