import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthenticatedRequest, JwtClaims } from "../modules/auth/auth.types";
import { AppError } from "../shared/errors";

const getBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) return null;
  const [type, token] = authorizationHeader.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
};

export const requireAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const accessToken = getBearerToken(req.headers.authorization);
  if (!accessToken) {
    next(new AppError(401, "AUTH_REQUIRED", "Missing Bearer access token."));
    return;
  }

  try {
    const decoded = jwt.verify(accessToken, env.jwtAccessSecret) as unknown as JwtClaims;
    req.user = {
      sub: Number(decoded.sub),
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Access token is invalid or expired."));
  }
};

export const requireRole = (...roles: Array<"user" | "admin">) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "AUTH_REQUIRED", "You must be authenticated."));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "INSUFFICIENT_ROLE", "You do not have permission for this resource."));
      return;
    }
    next();
  };
};
