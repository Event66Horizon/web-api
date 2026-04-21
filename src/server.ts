import app from "./app";
import { env } from "./config/env";
import { initDatabase } from "./db/database";
import { bootstrapAdminUser, seedStarterIngredients } from "./db/seed";

const start = async (): Promise<void> => {
  await initDatabase();
  await bootstrapAdminUser();
  seedStarterIngredients();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`NutriPlanner API running at http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start API server:", error);
  process.exit(1);
});

