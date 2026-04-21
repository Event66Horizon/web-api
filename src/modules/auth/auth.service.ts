import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { query, run } from "../../db/database";
import { AppError } from "../../shared/errors";
import type { JwtClaims } from "./auth.types";

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: "user" | "admin";
  password_hash: string;
};

type SessionRow = {
  id: string;
  token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  user_id: number;
  email: string;
  name: string;
  role: "user" | "admin";
};

type RegisterInput = {
  email: string;
  name: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const nowIso = (): string => new Date().toISOString();

const addDaysIso = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

const toPublicUser = (user: Pick<UserRow, "id" | "email" | "name" | "role">) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

const signAccessToken = (claims: JwtClaims): string => {
  return jwt.sign(claims, env.jwtAccessSecret, {
    expiresIn: `${env.accessTokenTtlMinutes}m`
  });
};

const parseRefreshToken = (token: string): { sessionId: string; secret: string } => {
  const separator = token.indexOf(".");
  if (separator < 1 || separator === token.length - 1) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token format is invalid.");
  }
  return {
    sessionId: token.slice(0, separator),
    secret: token.slice(separator + 1)
  };
};

const createRefreshSession = async (user: Pick<UserRow, "id" | "email" | "role">): Promise<string> => {
  const sessionId = randomUUID();
  const secret = randomBytes(48).toString("hex");
  const tokenHash = await bcrypt.hash(secret, 12);
  const createdAt = nowIso();
  const expiresAt = addDaysIso(env.refreshTokenTtlDays);

  run(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NULL);`,
    [sessionId, user.id, tokenHash, expiresAt, createdAt]
  );

  return `${sessionId}.${secret}`;
};

const issueTokens = async (user: Pick<UserRow, "id" | "email" | "name" | "role">) => {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role
  });
  const refreshToken = await createRefreshSession(user);

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer" as const,
    expiresInMinutes: env.accessTokenTtlMinutes,
    user: toPublicUser(user)
  };
};

export const registerUser = async (input: RegisterInput) => {
  const existingUser = query<{ id: number }>("SELECT id FROM users WHERE email = ? LIMIT 1;", [input.email])[0];
  if (existingUser) {
    throw new AppError(409, "EMAIL_ALREADY_REGISTERED", "Email address is already in use.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const createdAt = nowIso();

  run(
    `INSERT INTO users (email, name, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, 'user', ?, ?);`,
    [input.email, input.name, passwordHash, createdAt, createdAt]
  );

  const user = query<UserRow>(
    "SELECT id, email, name, role, password_hash FROM users WHERE email = ? LIMIT 1;",
    [input.email]
  )[0];
  if (!user) {
    throw new AppError(500, "USER_CREATION_FAILED", "User registration failed unexpectedly.");
  }

  return issueTokens(user);
};

export const loginUser = async (input: LoginInput) => {
  const user = query<UserRow>(
    "SELECT id, email, name, role, password_hash FROM users WHERE email = ? LIMIT 1;",
    [input.email]
  )[0];
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  return issueTokens(user);
};

export const refreshSession = async (refreshToken: string) => {
  const parsed = parseRefreshToken(refreshToken);
  const row = query<SessionRow>(
    `SELECT
      rt.id, rt.token_hash, rt.expires_at, rt.revoked_at,
      u.id AS user_id, u.email, u.name, u.role
     FROM refresh_tokens rt
     INNER JOIN users u ON u.id = rt.user_id
     WHERE rt.id = ?
     LIMIT 1;`,
    [parsed.sessionId]
  )[0];

  if (!row) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
  }
  if (row.revoked_at) {
    throw new AppError(401, "REFRESH_TOKEN_REVOKED", "Refresh token has been revoked.");
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Refresh token has expired.");
  }

  const match = await bcrypt.compare(parsed.secret, row.token_hash);
  if (!match) {
    throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid.");
  }

  run("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?;", [nowIso(), row.id]);

  const user = {
    id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role
  };

  return issueTokens(user);
};

export const logout = (refreshToken: string): void => {
  const parsed = parseRefreshToken(refreshToken);
  run("UPDATE refresh_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL;", [nowIso(), parsed.sessionId]);
};

export const getUserById = (userId: number) => {
  const user = query<UserRow>("SELECT id, email, name, role, password_hash FROM users WHERE id = ? LIMIT 1;", [userId])[0];
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User was not found.");
  }
  return toPublicUser(user);
};

