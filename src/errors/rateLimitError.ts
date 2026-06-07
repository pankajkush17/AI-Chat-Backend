import { CustomError } from "./customError.js";

export class RateLimitError extends CustomError {
  statusCode = 429;

  constructor(
    message: string = "AI service is busy. Please wait a moment and try again.",
  ) {
    super(message, "RateLimitError");
  }
}
