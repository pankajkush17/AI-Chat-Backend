import { Request, Response, NextFunction } from "express";
import { ZodObject, ZodArray, ZodTypeAny, ZodRawShape } from "zod";
import { SomethingWentWrongError } from "../errors";
import ValidationError from "../errors/validationError";
import { BulkValidationResult } from "./base.types";

class BaseValidator {
  private readonly schemas: Partial<Record<string, ZodObject<ZodRawShape>>> =
    {};

  constructor(schemas: Partial<Record<string, ZodObject<ZodRawShape>>>) {
    this.schemas = schemas;
  }

  public middleware(
    operation: string,
    source: "body" | "query" | "params" = "body",
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const schema = this.schemas[operation];
        if (!schema) {
          const errors = new SomethingWentWrongError(
            `Validation schema not defined for operation "${operation}"`,
          );
          res.status(errors.statusCode).json(errors.json());
          return;
        }

        const data = req[source];
        const zodSchema: ZodTypeAny = schema;
        const result = await zodSchema.safeParseAsync(data);

        if (!result.success) {
          const errors = new ValidationError(result.error);
          res.status(errors.statusCode).json(errors.json());
          return;
        }

        req.validatedData = result.data;
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  public validate<T = unknown>(operation: string, data: unknown): T {
    const schema = this.schemas[operation];
    if (!schema) {
      throw new Error(
        `Validation schema not defined for operation "${operation}"`,
      );
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error);
    }

    return result.data as T;
  }

  public async validateBulk<T extends object>(
    items: T[],
    schema: ZodArray<ZodTypeAny>,
  ): Promise<BulkValidationResult<T>[]> {
    const validation = await schema.safeParseAsync(items);
    if (validation.success) {
      return items.map((item) => ({ item, errors: {} }));
    }
    const groupedErrors: Record<number, Record<string, string[]>> = {};
    for (const issue of validation.error.issues) {
      const [index, field] = issue.path;
      if (typeof index !== "number") continue;

      const fieldKey = String(field ?? "");
      groupedErrors[index] ??= {};
      groupedErrors[index][fieldKey] ??= [];
      groupedErrors[index][fieldKey].push(issue.message);
    }
    return items.map((item, idx) => ({
      item,
      errors: groupedErrors[idx] ?? {},
    }));
  }
}

export { BaseValidator };
