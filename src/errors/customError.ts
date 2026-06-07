export abstract class CustomError extends Error {
  abstract statusCode: number;

  constructor(message: string, name: string) {
    super(message);
    this.name = name;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  json() {
    return {
      status: "error",
      statusCode: this.statusCode,
      errors: [{ message: this.message }],
    };
  }
}
