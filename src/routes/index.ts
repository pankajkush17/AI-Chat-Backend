import { Application } from "express";
import apiRoutes, { initializeApiRoutes } from "./api.routes.js";
import healthCheckRoutes from "./healthCheck.routes.js";
import notFoundRoutes from "./notFound.routes.js";

class Router {
  constructor(private readonly app: Application) {}

  public async initializeRoutes(): Promise<void> {
    await initializeApiRoutes();
    this.app.use("/api", apiRoutes);
    this.app.use(healthCheckRoutes);
    this.app.use(notFoundRoutes);
  }
}

export default Router;
