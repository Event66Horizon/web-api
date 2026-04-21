import { Router } from "express";
import { analyticsRouter } from "./modules/analytics/analytics.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { ingredientsRouter } from "./modules/ingredients/ingredients.routes";
import { recipesRouter } from "./modules/recipes/recipes.routes";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      service: "NutriPlanner API",
      modules: ["auth", "ingredients", "recipes", "analytics"]
    }
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/ingredients", ingredientsRouter);
apiRouter.use("/recipes", recipesRouter);
apiRouter.use("/analytics", analyticsRouter);

