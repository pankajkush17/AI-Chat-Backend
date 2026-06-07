import cors from "cors";
import express, { Application } from "express";
import morgan from "morgan";
import { env } from "./config/env.config.js";
import Router from "./routes/index.js";

class App {
  public app: Application;
  private readonly router: Router;

  constructor() {
    this.app = express();
    this.router = new Router(this.app);
    this.initializeMiddlewares();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors({ origin: env.CORS_ORIGIN }));
    this.app.use(express.json({ limit: "1mb" }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(
      morgan("dev", {
        skip: (req) => req.path === "/" || req.path === "/favicon.ico",
      }),
    );
  }

  public async initialize(): Promise<void> {
    await this.router.initializeRoutes();
  }
}

const appInstance = new App();
export default appInstance;
