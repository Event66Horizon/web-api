"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const error_handler_1 = require("./middleware/error-handler");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.corsOrigin === "*" ? true : env_1.env.corsOrigin.split(",").map((x) => x.trim()),
    credentials: true
}));
app.use((0, express_rate_limit_1.default)({
    windowMs: env_1.env.rateLimitWindowMs,
    limit: env_1.env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false
}));
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, morgan_1.default)(env_1.env.nodeEnv === "production" ? "combined" : "dev"));
app.use("/docs", express_1.default.static("docs"));
app.use("/insights", express_1.default.static("public"));
app.get("/", (_req, res) => {
    res.json({
        success: true,
        data: {
            name: "NutriPlanner API",
            version: "1.0.0",
            health: "/health",
            docs: "/docs/API_Documentation.pdf",
            insightsDashboard: "/insights/"
        }
    });
});
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString()
        }
    });
});
app.use("/api/v1", routes_1.apiRouter);
app.use(error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
exports.default = app;
