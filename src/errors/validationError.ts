import { ZodError } from "zod";
import { CustomError } from "./customError";

class ValidationError extends CustomError {
  statusCode = 422;
  public errors: { field: string; message: string }[];

  constructor(zodError: ZodError) {
    super("Validation failed", "ValidationError");
    this.name = "ValidationError";
    this.errors = zodError.issues.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
  }

  json() {
    return {
      status: "error",
      statusCode: this.statusCode,
      errors: this.errors,
    };
  }
}

export default ValidationError;
