"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.logout = exports.refreshSession = exports.loginUser = exports.registerUser = void 0;
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const database_1 = require("../../db/database");
const errors_1 = require("../../shared/errors");
const nowIso = () => new Date().toISOString();
const addDaysIso = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
};
const toPublicUser = (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
});
const signAccessToken = (claims) => {
    return jsonwebtoken_1.default.sign(claims, env_1.env.jwtAccessSecret, {
        expiresIn: `${env_1.env.accessTokenTtlMinutes}m`
    });
};
const parseRefreshToken = (token) => {
    const separator = token.indexOf(".");
    if (separator < 1 || separator === token.length - 1) {
        throw new errors_1.AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token format is invalid.");
    }
    return {
        sessionId: token.slice(0, separator),
        secret: token.slice(separator + 1)
    };
};
const createRefreshSession = async (user) => {
    const sessionId = (0, node_crypto_1.randomUUID)();
    const secret = (0, node_crypto_1.randomBytes)(48).toString("hex");
    const tokenHash = await bcryptjs_1.default.hash(secret, 12);
    const createdAt = nowIso();
    const expiresAt = addDaysIso(env_1.env.refreshTokenTtlDays);
    (0, database_1.run)(`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NULL);`, [sessionId, user.id, tokenHash, expiresAt, createdAt]);
    return `${sessionId}.${secret}`;
};
const issueTokens = async (user) => {
    const accessToken = signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role
    });
    const refreshToken = await createRefreshSession(user);
    return {
        accessToken,
        refreshToken,
        tokenType: "Bearer",
        expiresInMinutes: env_1.env.accessTokenTtlMinutes,
        user: toPublicUser(user)
    };
};
const registerUser = async (input) => {
    const existingUser = (0, database_1.query)("SELECT id FROM users WHERE email = ? LIMIT 1;", [input.email])[0];
    if (existingUser) {
        throw new errors_1.AppError(409, "EMAIL_ALREADY_REGISTERED", "Email address is already in use.");
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    const createdAt = nowIso();
    (0, database_1.run)(`INSERT INTO users (email, name, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'user', ?, ?);`, [input.email, input.name, passwordHash, createdAt, createdAt]);
    const user = (0, database_1.query)("SELECT id, email, name, role, password_hash FROM users WHERE email = ? LIMIT 1;", [input.email])[0];
    if (!user) {
        throw new errors_1.AppError(500, "USER_CREATION_FAILED", "User registration failed unexpectedly.");
    }
    return issueTokens(user);
};
exports.registerUser = registerUser;
const loginUser = async (input) => {
    const user = (0, database_1.query)("SELECT id, email, name, role, password_hash FROM users WHERE email = ? LIMIT 1;", [input.email])[0];
    if (!user) {
        throw new errors_1.AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    const passwordMatch = await bcryptjs_1.default.compare(input.password, user.password_hash);
    if (!passwordMatch) {
        throw new errors_1.AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    return issueTokens(user);
};
exports.loginUser = loginUser;
const refreshSession = async (refreshToken) => {
    const parsed = parseRefreshToken(refreshToken);
    const row = (0, database_1.query)(`SELECT
      rt.id, rt.token_hash, rt.expires_at, rt.revoked_at,
      u.id AS user_id, u.email, u.name, u.role
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.id = ?
     LIMIT 1;`, [parsed.sessionId])[0];
    if (!row) {
        throw new errors_1.AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
    }
    if (row.revoked_at) {
        throw new errors_1.AppError(401, "REFRESH_TOKEN_REVOKED", "Refresh token has been revoked.");
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
        throw new errors_1.AppError(401, "REFRESH_TOKEN_EXPIRED", "Refresh token has expired.");
    }
    const match = await bcryptjs_1.default.compare(parsed.secret, row.token_hash);
    if (!match) {
        throw new errors_1.AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
    }
    (0, database_1.run)("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?;", [nowIso(), row.id]);
    const user = {
        id: row.user_id,
        email: row.email,
        name: row.name,
        role: row.role
    };
    return issueTokens(user);
};
exports.refreshSession = refreshSession;
const logout = (refreshToken) => {
    const parsed = parseRefreshToken(refreshToken);
    (0, database_1.run)("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL;", [nowIso(), parsed.sessionId]);
};
exports.logout = logout;
const getUserById = (userId) => {
    const user = (0, database_1.query)("SELECT id, email, name, role, password_hash FROM users WHERE id = ? LIMIT 1;", [userId])[0];
    if (!user) {
        throw new errors_1.AppError(404, "USER_NOT_FOUND", "User was not found.");
    }
    return toPublicUser(user);
};
exports.getUserById = getUserById;
