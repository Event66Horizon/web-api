"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../shared/errors");
const getBearerToken = (authorizationHeader) => {
    if (!authorizationHeader)
        return null;
    const [type, token] = authorizationHeader.split(" ");
    if (type !== "Bearer" || !token)
        return null;
    return token;
};
const requireAuth = (req, _res, next) => {
    const accessToken = getBearerToken(req.headers.authorization);
    if (!accessToken) {
        next(new errors_1.AppError(401, "AUTH_REQUIRED", "Missing Bearer access token."));
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(accessToken, env_1.env.jwtAccessSecret);
        req.user = {
            sub: Number(decoded.sub),
            email: decoded.email,
            role: decoded.role
        };
        next();
    }
    catch {
        next(new errors_1.AppError(401, "INVALID_TOKEN", "Access token is invalid or expired."));
    }
};
exports.requireAuth = requireAuth;
const requireRole = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            next(new errors_1.AppError(401, "AUTH_REQUIRED", "You must be authenticated."));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errors_1.AppError(403, "INSUFFICIENT_ROLE", "You do not have permission for this resource."));
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
