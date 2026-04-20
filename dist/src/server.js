"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./db/database");
const seed_1 = require("./db/seed");
const start = async () => {
    await (0, database_1.initDatabase)();
    await (0, seed_1.bootstrapAdminUser)();
    (0, seed_1.seedStarterIngredients)();
    app_1.default.listen(env_1.env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`NutriPlanner API running at http://localhost:${env_1.env.port}`);
    });
};
start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start API server:", error);
    process.exit(1);
});
