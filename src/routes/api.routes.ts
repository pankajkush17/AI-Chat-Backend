import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ApiRoutes {
  public router: Router;

  constructor() {
    this.router = Router();
  }

  /**
   * Initializes routes dynamically from all `routes.ts` files in parent directories.
   */
  public async initializeRoutes() {
    const basePath = dirname(__dirname); // Get the parent folder
    const files = this.getFilesRecursively(basePath);

    for (const file of files) {
      if (file.endsWith("routes.ts")) {
        try {
          const module = await import(file);
          if (module.default) {
            const routesInstance = new module.default(); // instantiate the class
            this.router.use(routesInstance.router); // use the `.router` property
          }
        } catch (error) {
          console.error(`Failed to load routes from ${file}:`, error);
        }
      }
    }
  }

  /**
   * Recursively gets all files from the directory and subdirectories, excluding files in 'common' and 'routes' folders.
   */
  private getFilesRecursively(dir: string): string[] {
    let results: string[] = [];
    const list = readdirSync(dir, { withFileTypes: true });

    for (const file of list) {
      const fullPath = join(dir, file.name);

      // Skip the 'common' and 'routes' directories
      if (
        file.isDirectory() &&
        (file.name === "common" || file.name === "routes")
      ) {
        continue;
      }

      if (file.isDirectory()) {
        // Recursively get files from subdirectories, but not 'common' or 'routes' folders
        results = results.concat(this.getFilesRecursively(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }
}

const apiRoutesInstance = new ApiRoutes();
export default apiRoutesInstance.router;
export const initializeApiRoutes = () => apiRoutesInstance.initializeRoutes();
