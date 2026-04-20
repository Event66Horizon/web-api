"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.email().transform((value) => value.toLowerCase().trim()),
    name: zod_1.z.string().trim().min(2).max(80),
    password: zod_1.z.string().min(8).max(128).regex(strongPasswordRegex, {
        error: "Password must contain at least one letter and one number."
    })
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.email().transform((value) => value.toLowerCase().trim()),
    password: zod_1.z.string().min(1)
});
exports.refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(10)
});
