import { RequestHandler, Router } from "express";
import { BaseController } from "./base.controller";

export abstract class BaseApiRoutes {
  public router: Router;
  protected basePath: string;

  constructor(basePath: string) {
    this.router = Router({ mergeParams: true });
    this.basePath = basePath;
    this.initializeRoutes();
  }

  /**
   * Abstract method to initialize routes in derived classes.
   * Derived classes must implement this method.
   */
  protected abstract initializeRoutes(): void;

  /**
   * Automatically adds RESTful routes for common actions (index, show, create, update, destroy)
   * if the corresponding methods exist in the derived class.
   * Each route can have middleware for authentication, authorization, or validation.
   *
   * @param controller - The controller class that contains the route methods
   * @param middlewares - Optional middleware array to be added to each route
   */
  protected addRestRoutes<T extends BaseController>(
    controller: T,
    middlewares: Record<string, RequestHandler[]> = {},
  ): void {
    const methods = this.getAllMethods(controller as Record<string, unknown>);

    // Index Route
    if (methods.includes("index")) {
      const indexMiddlewares = middlewares["index"] || [];
      this.router.post(`${this.basePath}/all`, [
        ...indexMiddlewares,
        controller.index.bind(controller),
      ]);
    }

    // Show All Route
    if (methods.includes("showAll")) {
      const showAllMiddlewares = middlewares["showAll"] || [];
      this.router.get(`${this.basePath}`, [
        ...showAllMiddlewares,
        controller.showAll.bind(controller),
      ]);
    }

    // Show Route
    if (methods.includes("show")) {
      const showMiddlewares = middlewares["show"] || [];
      this.router.get(`${this.basePath}/:id`, [
        ...showMiddlewares,
        controller.show.bind(controller),
      ]);
    }

    // Create Route
    if (methods.includes("create")) {
      const createMiddlewares = middlewares["create"] || [];
      this.router.post(`${this.basePath}`, [
        ...createMiddlewares,
        controller.create.bind(controller),
      ]);
    }

    // Update Route
    if (methods.includes("update")) {
      const updateMiddlewares = middlewares["update"] || [];
      this.router.put(`${this.basePath}/:id`, [
        ...updateMiddlewares,
        controller.update.bind(controller),
      ]);
    }

    // Destroy Route
    if (methods.includes("destroy")) {
      const destroyMiddlewares = middlewares["destroy"] || [];
      this.router.delete(`${this.basePath}/:id`, [
        ...destroyMiddlewares,
        controller.destroy.bind(controller),
      ]);
    }
  }

  /**
   * Recursively fetch all method names from the prototype chain (excluding Object methods).
   */
  private getAllMethods(obj: Record<string, unknown>): string[] {
    let methods: string[] = [];
    let prototype = Object.getPrototypeOf(obj);

    while (prototype && prototype !== Object.prototype) {
      methods = methods.concat(
        Object.getOwnPropertyNames(prototype).filter(
          (method) =>
            method !== "constructor" && typeof obj[method] === "function",
        ),
      );
      prototype = Object.getPrototypeOf(prototype);
    }

    return [...new Set(methods)];
  }
}
