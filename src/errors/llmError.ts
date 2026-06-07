import { CustomError } from "./customError.js";

export class LLMError extends CustomError {
  statusCode = 502;

  constructor(
    message: string = "AI service encountered an error. Please try again.",
  ) {
    super(message, "LLMError");
  }
}
