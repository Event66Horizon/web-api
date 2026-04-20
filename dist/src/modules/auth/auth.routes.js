"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const http_1 = require("../../shared/http");
const auth_schemas_1 = require("./auth.schemas");
const auth_service_1 = require("./auth.service");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", (0, validate_1.validate)({ body: auth_schemas_1.registerSchema }), async (req, res, next) => {
    try {
        const result = await (0, auth_service_1.registerUser)(req.body);
        res.status(201).json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.post("/login", (0, validate_1.validate)({ body: auth_schemas_1.loginSchema }), async (req, res, next) => {
    try {
        const result = await (0, auth_service_1.loginUser)(req.body);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.post("/refresh", (0, validate_1.validate)({ body: auth_schemas_1.refreshSchema }), async (req, res, next) => {
    try {
        const result = await (0, auth_service_1.refreshSession)(req.body.refreshToken);
        res.json((0, http_1.ok)(result));
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.post("/logout", (0, validate_1.validate)({ body: auth_schemas_1.refreshSchema }), (req, res, next) => {
    try {
        (0, auth_service_1.logout)(req.body.refreshToken);
        res.json((0, http_1.ok)({ message: "Logged out successfully." }));
    }
    catch (error) {
        next(error);
    }
});
exports.authRouter.get("/me", auth_1.requireAuth, (req, res, next) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            res.status(401).json({
                success: false,
                error: { code: "AUTH_REQUIRED", message: "You must be authenticated." }
            });
            return;
        }
        res.json((0, http_1.ok)((0, auth_service_1.getUserById)(currentUser.sub)));
    }
    catch (error) {
        next(error);
    }
});
