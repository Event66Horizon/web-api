import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiRouter } from "./routes";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((x) => x.trim()),
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use("/docs", express.static("docs"));
app.use("/insights", express.static("public"));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      name: "NutriPlanner API",
      version: "1.0.0",
      health: "/health",
      docs: "/docs/API_Documentation.pdf",
      insightsDashboard: "/insights/"
    }
  });
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString()
    }
  });
});

app.use("/api/v1", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
