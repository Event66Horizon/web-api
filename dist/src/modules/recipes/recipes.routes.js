"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipesRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const http_1 = require("../../shared/http");
const recipes_schemas_1 = require("./recipes.schemas");
const recipes_service_1 = require("./recipes.service");
exports.recipesRouter = (0, express_1.Router)();
exports.recipesRouter.get("/", (0, validate_1.validate)({ query: recipes_schemas_1.recipeListQuerySchema }), (req, res, next) => {
    try {
        const parsedQuery = req.validatedQuery;
        const result = (0, recipes_service_1.listRecipes)(parsedQuery);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.recipesRouter.get("/:id", (0, validate_1.validate)({ params: recipes_schemas_1.recipeIdParamsSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        res.json((0, http_1.ok)((0, recipes_service_1.getRecipeById)(parsedParams.id)));
    }
    catch (error) {
        next(error);
    }
});
exports.recipesRouter.post("/", auth_1.requireAuth, (0, validate_1.validate)({ body: recipes_schemas_1.recipeCreateSchema }), (req, res, next) => {
    try {
        const user = req.user;
        const result = (0, recipes_service_1.createRecipe)(req.body, user.sub);
        res.status(201).json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.recipesRouter.patch("/:id", auth_1.requireAuth, (0, validate_1.validate)({ params: recipes_schemas_1.recipeIdParamsSchema, body: recipes_schemas_1.recipeUpdateSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        const result = (0, recipes_service_1.updateRecipe)(parsedParams.id, req.body);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.recipesRouter.delete("/:id", auth_1.requireAuth, (0, validate_1.validate)({ params: recipes_schemas_1.recipeIdParamsSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        (0, recipes_service_1.deleteRecipe)(parsedParams.id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
