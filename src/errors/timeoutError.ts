import { CustomError } from "./customError.js";

export class TimeoutError extends CustomError {
  statusCode = 504;

  constructor(
    message: string = "AI service took too long to respond. Please try again.",
  ) {
    super(message, "TimeoutError");
  }
}
