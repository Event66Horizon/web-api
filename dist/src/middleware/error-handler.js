"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const zod_1 = require("zod");
const env_1 = require("../config/env");
const errors_1 = require("../shared/errors");
const notFoundHandler = (_req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: "NOT_FOUND",
            message: "The requested route does not exist."
        }
    });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _req, res, _next) => {
    if (error instanceof errors_1.AppError) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message,
                details: error.details
            }
        });
        return;
    }
    if (error instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Request validation failed.",
                details: error.issues
            }
        });
        return;
    }
    const fallbackMessage = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: fallbackMessage,
            details: env_1.isProduction ? undefined : error
        }
    });
};
exports.errorHandler = errorHandler;
