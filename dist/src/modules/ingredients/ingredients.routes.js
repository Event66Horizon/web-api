"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingredientsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const http_1 = require("../../shared/http");
const ingredients_schemas_1 = require("./ingredients.schemas");
const ingredients_service_1 = require("./ingredients.service");
exports.ingredientsRouter = (0, express_1.Router)();
exports.ingredientsRouter.get("/", (0, validate_1.validate)({ query: ingredients_schemas_1.ingredientListQuerySchema }), (req, res, next) => {
    try {
        const parsedQuery = req.validatedQuery;
        const result = (0, ingredients_service_1.listIngredients)(parsedQuery);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.ingredientsRouter.get("/:id", (0, validate_1.validate)({ params: ingredients_schemas_1.ingredientIdParamsSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        const result = (0, ingredients_service_1.getIngredientById)(parsedParams.id);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.ingredientsRouter.post("/", auth_1.requireAuth, (0, validate_1.validate)({ body: ingredients_schemas_1.ingredientCreateSchema }), (req, res, next) => {
    try {
        const user = req.user;
        const result = (0, ingredients_service_1.createIngredient)(req.body, user.sub);
        res.status(201).json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.ingredientsRouter.patch("/:id", auth_1.requireAuth, (0, validate_1.validate)({ params: ingredients_schemas_1.ingredientIdParamsSchema, body: ingredients_schemas_1.ingredientUpdateSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        const result = (0, ingredients_service_1.updateIngredient)(parsedParams.id, req.body);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.ingredientsRouter.delete("/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), (0, validate_1.validate)({ params: ingredients_schemas_1.ingredientIdParamsSchema }), (req, res, next) => {
    try {
        const parsedParams = req.validatedParams;
        (0, ingredients_service_1.deleteIngredient)(parsedParams.id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
