import { Request, Response, NextFunction, Router } from "express";
import { CustomError, SomethingWentWrongError } from "../errors/index.js";

class ApiRouteNotFoundError extends CustomError {
  statusCode = 404;
  constructor(message: string) {
    super(message, "ApiRouteNotFoundError");
  }
}

class ErrorHandler {
  public router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.use((req: Request, res: Response, next: NextFunction) => {
      next(new ApiRouteNotFoundError(`Route ${req?.originalUrl} not found`));
    });
    this.router.use(
      (err: unknown, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof ApiRouteNotFoundError) {
          res.status(err.statusCode).json(err.json());
        } else if (err instanceof Error) {
          const genericError = new SomethingWentWrongError();
          res.status(genericError.statusCode).json(genericError.json());
        } else {
          next(err);
        }
      },
    );
  }
}

export default new ErrorHandler().router;
