import { CustomError } from "./customError";

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor(message: string = "Record not found.") {
    super(message, "NotFoundError");
  }
}
