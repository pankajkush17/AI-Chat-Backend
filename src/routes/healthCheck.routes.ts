import { Router, Response, Request } from "express";

class HealthCheckRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }
  private initializeRoutes() {
    this.router.get("/health-check", (_: Request, res: Response) => {
      res.status(200).send({ message: "APIs are working fine" });
    });
  }
}

export default new HealthCheckRoutes().router;
