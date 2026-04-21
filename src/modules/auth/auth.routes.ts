import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { ok } from "../../shared/http";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas";
import { getUserById, loginUser, logout, refreshSession, registerUser } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";

export const authRouter = Router();

authRouter.post("/register", validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(ok(result));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", validate({ body: refreshSchema }), async (req, res, next) => {
  try {
    const result = await refreshSession(req.body.refreshToken);
    res.json(ok(result));
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", validate({ body: refreshSchema }), (req, res, next) => {
  try {
    logout(req.body.refreshToken);
    res.json(ok({ message: "Logged out successfully." }));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (req, res, next) => {
  try {
    const currentUser = (req as AuthenticatedRequest).user;
    if (!currentUser) {
      res.status(401).json({
        success: false,
        error: { code: "AUTH_REQUIRED", message: "You must be authenticated." }
      });
      return;
    }
    res.json(ok(getUserById(currentUser.sub)));
  } catch (error) {
    next(error);
  }
});

