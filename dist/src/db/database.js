"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = exports.run = exports.query = exports.resetDatabaseForTests = exports.closeDatabase = exports.initDatabase = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const sql_js_1 = __importDefault(require("sql.js"));
const env_1 = require("../config/env");
const errors_1 = require("../shared/errors");
const migrations_1 = require("./migrations");
let db = null;
let isInitialized = false;
const resolveDbPath = () => node_path_1.default.resolve(process.cwd(), env_1.env.dbFile);
const shouldPersist = () => env_1.env.dbFile !== ":memory:";
const persistDatabase = () => {
    if (!shouldPersist() || !db)
        return;
    const dbPath = resolveDbPath();
    const dbDir = node_path_1.default.dirname(dbPath);
    if (!node_fs_1.default.existsSync(dbDir)) {
        node_fs_1.default.mkdirSync(dbDir, { recursive: true });
    }
    const data = db.export();
    node_fs_1.default.writeFileSync(dbPath, Buffer.from(data));
};
const runMigrations = () => {
    for (const statement of migrations_1.migrationStatements) {
        db.run(statement);
    }
};
const initDatabase = async () => {
    if (isInitialized && db)
        return;
    const SQL = await (0, sql_js_1.default)({});
    if (shouldPersist() && node_fs_1.default.existsSync(resolveDbPath())) {
        const fileBuffer = node_fs_1.default.readFileSync(resolveDbPath());
        db = new SQL.Database(new Uint8Array(fileBuffer));
    }
    else {
        db = new SQL.Database();
    }
    db.run("PRAGMA foreign_keys = ON;");
    runMigrations();
    persistDatabase();
    isInitialized = true;
};
exports.initDatabase = initDatabase;
const closeDatabase = () => {
    if (!db)
        return;
    persistDatabase();
    db.close();
    db = null;
    isInitialized = false;
};
exports.closeDatabase = closeDatabase;
const resetDatabaseForTests = async () => {
    (0, exports.closeDatabase)();
    await (0, exports.initDatabase)();
};
exports.resetDatabaseForTests = resetDatabaseForTests;
const getDb = () => {
    if (!db) {
        throw new errors_1.AppError(500, "DATABASE_NOT_INITIALIZED", "Database has not been initialized.");
    }
    return db;
};
const query = (sql, params = []) => {
    const statement = getDb().prepare(sql);
    statement.bind(params);
    const rows = [];
    while (statement.step()) {
        rows.push(statement.getAsObject());
    }
    statement.free();
    return rows;
};
exports.query = query;
const run = (sql, params = []) => {
    getDb().run(sql, params);
    const modified = getDb().getRowsModified();
    persistDatabase();
    return modified;
};
exports.run = run;
const transaction = (callback) => {
    const database = getDb();
    database.run("BEGIN;");
    try {
        const result = callback();
        database.run("COMMIT;");
        persistDatabase();
        return result;
    }
    catch (error) {
        database.run("ROLLBACK;");
        throw error;
    }
};
exports.transaction = transaction;
