"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const errors_1 = require("../shared/errors");
const validate = (schema) => {
    return (req, _res, next) => {
        try {
            if (schema.body) {
                req.body = schema.body.parse(req.body);
            }
            if (schema.params) {
                const parsedParams = schema.params.parse(req.params);
                req.validatedParams = parsedParams;
            }
            if (schema.query) {
                const parsedQuery = schema.query.parse(req.query);
                req.validatedQuery = parsedQuery;
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                next(new errors_1.AppError(400, "VALIDATION_ERROR", "Request validation failed.", error.issues));
                return;
            }
            next(error);
        }
    };
};
exports.validate = validate;
