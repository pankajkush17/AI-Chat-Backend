import { CustomError } from "./customError";

export class UnprocessableEntityError extends CustomError {
  statusCode = 422;

  constructor(
    message: string = "Something went wrong. Please check back again",
  ) {
    super(message, "UnprocessableEntityError");
  }
}
