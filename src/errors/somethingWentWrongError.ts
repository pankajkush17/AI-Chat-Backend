import { CustomError } from "./customError";

export class SomethingWentWrongError extends CustomError {
  statusCode = 422;

  constructor(
    message: string = "Something went wrong. Please check back again",
  ) {
    super(message, "SomethingWentWrongError");
  }
}
