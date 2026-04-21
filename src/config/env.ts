const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: toNumber(process.env.PORT, 3000),
  dbFile: process.env.DB_FILE ?? "data/nutriplanner.sqlite",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "dev_access_secret_change_me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev_refresh_secret_change_me",
  accessTokenTtlMinutes: toNumber(process.env.ACCESS_TOKEN_TTL_MINUTES, 15),
  refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 100),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  adminBootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@nutriplanner.local",
  adminBootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "ChangeMe123!"
};

export const isProduction = env.nodeEnv === "production";

