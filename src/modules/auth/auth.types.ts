import type { Request } from "express";

export type JwtClaims = {
  sub: number;
  email: string;
  role: "user" | "admin";
};

export type AuthenticatedRequest = Request & {
  user?: JwtClaims;
};

