import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import type { Database } from "sql.js";
import { env } from "../config/env";
import { AppError } from "../shared/errors";
import { migrationStatements } from "./migrations";

type DbValue = string | number | null | Uint8Array;

let db: Database | null = null;
let isInitialized = false;
let inTransaction = false;

const resolveDbPath = (): string => path.resolve(process.cwd(), env.dbFile);

const shouldPersist = (): boolean => env.dbFile !== ":memory:";

const persistDatabase = (): void => {
  if (!shouldPersist() || !db) return;
  const dbPath = resolveDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
};

const runMigrations = (): void => {
  for (const statement of migrationStatements) {
    db!.run(statement);
  }
};

export const initDatabase = async (): Promise<void> => {
  if (isInitialized && db) return;

  const SQL = await initSqlJs({});
  if (shouldPersist() && fs.existsSync(resolveDbPath())) {
    const fileBuffer = fs.readFileSync(resolveDbPath());
    db = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON;");
  runMigrations();
  persistDatabase();
  isInitialized = true;
};

export const closeDatabase = (): void => {
  if (!db) return;
  persistDatabase();
  db.close();
  db = null;
  isInitialized = false;
};

export const resetDatabaseForTests = async (): Promise<void> => {
  closeDatabase();
  await initDatabase();
};

const getDb = (): Database => {
  if (!db) {
    throw new AppError(500, "DATABASE_NOT_INITIALIZED", "Database has not been initialized.");
  }
  return db;
};

export const query = <T>(sql: string, params: DbValue[] = []): T[] => {
  const statement = getDb().prepare(sql);
  statement.bind(params);
  const rows: T[] = [];

  while (statement.step()) {
    rows.push(statement.getAsObject() as T);
  }

  statement.free();
  return rows;
};

export const run = (sql: string, params: DbValue[] = []): number => {
  getDb().run(sql, params);
  const modified = getDb().getRowsModified();
  if (!inTransaction) {
    persistDatabase();
  }
  return modified;
};

export const transaction = <T>(callback: () => T): T => {
  const database = getDb();
  database.run("BEGIN;");
  inTransaction = true;
  try {
    const result = callback();
    database.run("COMMIT;");
    inTransaction = false;
    persistDatabase();
    return result;
  } catch (error) {
    inTransaction = false;
    try {
      database.run("ROLLBACK;");
    } catch (rollbackError) {
      const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      if (!rollbackMessage.includes("no transaction is active")) {
        throw rollbackError;
      }
    }
    throw error;
  }
};
